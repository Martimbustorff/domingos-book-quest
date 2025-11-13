import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all books without covers
    const { data: booksWithoutCovers, error: fetchError } = await supabaseClient
      .from('books')
      .select('id, title, author')
      .is('cover_url', null);

    if (fetchError) {
      console.error('Error fetching books:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${booksWithoutCovers?.length || 0} books without covers`);

    const results = [];

    // Fetch covers for each book
    for (const book of booksWithoutCovers || []) {
      try {
        console.log(`Fetching cover for: ${book.title} by ${book.author}`);
        
        // Search Open Library
        const searchUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(book.title)}&author=${encodeURIComponent(book.author || '')}`;
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();

        if (searchData.docs && searchData.docs.length > 0) {
          const firstResult = searchData.docs[0];
          
          if (firstResult.cover_i) {
            // Construct cover URL
            const coverUrl = `https://covers.openlibrary.org/b/id/${firstResult.cover_i}-L.jpg`;
            
            // Update book with cover URL
            const { error: updateError } = await supabaseClient
              .from('books')
              .update({ cover_url: coverUrl })
              .eq('id', book.id);

            if (updateError) {
              console.error(`Error updating book ${book.id}:`, updateError);
              results.push({
                book: book.title,
                success: false,
                error: updateError.message
              });
            } else {
              console.log(`✓ Updated cover for: ${book.title}`);
              results.push({
                book: book.title,
                success: true,
                coverUrl
              });
            }
          } else {
            console.log(`No cover found for: ${book.title}`);
            results.push({
              book: book.title,
              success: false,
              error: 'No cover available'
            });
          }
        } else {
          console.log(`No results found for: ${book.title}`);
          results.push({
            book: book.title,
            success: false,
            error: 'Book not found in Open Library'
          });
        }
      } catch (error) {
        console.error(`Error processing ${book.title}:`, error);
        results.push({
          book: book.title,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const successCount = results.filter(r => r.success).length;
    
    return new Response(
      JSON.stringify({
        message: `Processed ${results.length} books, ${successCount} covers updated`,
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
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
