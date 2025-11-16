import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting: 10 requests per minute per IP
async function checkRateLimit(supabase: any, ipAddress: string, endpoint: string): Promise<boolean> {
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
  
  const { data, error } = await supabase
    .from('request_logs')
    .select('id')
    .eq('ip_address', ipAddress)
    .eq('endpoint', endpoint)
    .gte('created_at', oneMinuteAgo);

  if (error) {
    console.error('Rate limit check error:', error);
    return true;
  }

  return (data?.length || 0) < 10;
}

async function logRequest(supabase: any, ipAddress: string, endpoint: string) {
  await supabase.from('request_logs').insert({
    ip_address: ipAddress,
    endpoint: endpoint
  });
}

async function processBookCovers(supabaseClient: any, books: any[]) {
  const results = [];
  
  for (const book of books) {
    try {
      console.log(`Fetching cover for: ${book.title} by ${book.author}`);
      
      // Search Open Library
      const searchUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(book.title)}&author=${encodeURIComponent(book.author || '')}`;
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();

      if (searchData.docs && searchData.docs.length > 0) {
        const firstResult = searchData.docs[0];
        
        if (firstResult.cover_i) {
          const coverUrl = `https://covers.openlibrary.org/b/id/${firstResult.cover_i}-L.jpg`;
          
          const { error: updateError } = await supabaseClient
            .from('books')
            .update({ cover_url: coverUrl })
            .eq('id', book.id);

          if (updateError) {
            console.error(`Error updating book ${book.id}:`, updateError);
            results.push({ book: book.title, success: false, error: updateError.message });
          } else {
            console.log(`✓ Updated cover for: ${book.title}`);
            results.push({ book: book.title, success: true, coverUrl });
          }
        } else {
          console.log(`No cover found for: ${book.title}`);
          results.push({ book: book.title, success: false, error: 'No cover available' });
        }
      } else {
        console.log(`No results found for: ${book.title}`);
        results.push({ book: book.title, success: false, error: 'Book not found in Open Library' });
      }
    } catch (error) {
      console.error(`Error processing ${book.title}:`, error);
      results.push({
        book: book.title,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ Cover fetch complete: ${successCount}/${results.length} books updated`);
  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                      req.headers.get('x-real-ip') || 
                      'unknown';

    const isAllowed = await checkRateLimit(supabaseClient, ipAddress, 'fetch-book-covers');
    if (!isAllowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    await logRequest(supabaseClient, ipAddress, 'fetch-book-covers');

    const { data: booksWithoutCovers, error: fetchError } = await supabaseClient
      .from('books')
      .select('id, title, author')
      .is('cover_url', null);

    if (fetchError) {
      console.error('Error fetching books:', fetchError);
      throw fetchError;
    }

    const bookCount = booksWithoutCovers?.length || 0;
    console.log(`📚 Starting background fetch for ${bookCount} books without covers`);

    // Process in background
    if (booksWithoutCovers && booksWithoutCovers.length > 0) {
      // @ts-ignore - EdgeRuntime is available in Deno Deploy
      EdgeRuntime.waitUntil(processBookCovers(supabaseClient, booksWithoutCovers));
    }

    // Return immediately
    return new Response(
      JSON.stringify({
        message: `Started fetching covers for ${bookCount} books. Check logs for progress.`,
        bookCount,
        status: 'processing'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 202 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
