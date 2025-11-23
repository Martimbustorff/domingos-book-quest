import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting: 30 requests per minute per IP
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
    return true; // Allow on error to avoid blocking legitimate users
  }

  return (data?.length || 0) < 30;
}

async function logRequest(supabase: any, ipAddress: string, endpoint: string) {
  await supabase.from('request_logs').insert({
    ip_address: ipAddress,
    endpoint: endpoint
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get client IP address
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                      req.headers.get('x-real-ip') || 
                      'unknown';

    // Check rate limit
    const isAllowed = await checkRateLimit(supabase, ipAddress, 'search-books');
    if (!isAllowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log request
    await logRequest(supabase, ipAddress, 'search-books');

    const { query } = await req.json();

    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ books: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Searching for books with query:", query);

    // First, search local database
    const { data: localBooks, error: localError } = await supabase
      .from("books")
      .select("*")
      .ilike("title", `%${query}%`)
      .limit(10);

    if (localError) {
      console.error("Local search error:", localError);
    }

    // Also search Open Library API
    let openLibraryBooks: any[] = [];
    try {
      const openLibraryUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(
        query
      )}&limit=10`;
      const openLibraryResponse = await fetch(openLibraryUrl);
      const openLibraryData = await openLibraryResponse.json();

      openLibraryBooks = (openLibraryData.docs || []).map((doc: any) => ({
        open_library_id: doc.key,
        title: doc.title,
        author: doc.author_name?.[0] || "Unknown Author",
        cover_url: doc.cover_i
          ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
          : null,
        first_publish_year: doc.first_publish_year,
      }));

      console.log(`Found ${openLibraryBooks.length} books from Open Library`);
    } catch (error) {
      console.error("Open Library API error:", error);
    }

    // Merge results, prioritizing local books
    const bookMap = new Map();

    // Add local books first
    (localBooks || []).forEach((book) => {
      bookMap.set(book.id, book);
    });

    // Add Open Library books that aren't already in local database
    for (const book of openLibraryBooks) {
      // Check if book already exists
      const { data: existing } = await supabase
        .from("books")
        .select("id")
        .eq("title", book.title)
        .maybeSingle();

      if (!existing) {
        // Insert new book from Open Library
        // NOTE: age_min and age_max are intentionally left as NULL
        // Books without age verification will not appear in Popular Books
        // until an admin manually verifies and sets appropriate age ranges
        const { data: newBook, error } = await supabase
          .from("books")
          .insert({
            open_library_id: book.open_library_id,
            title: book.title,
            author: book.author,
            cover_url: book.cover_url,
            // age_min: null, age_max: null (implicit - no defaults in schema)
          })
          .select()
          .single();

        if (!error && newBook) {
          bookMap.set(newBook.id, newBook);
        }
      } else {
        // Use existing book
        const { data: existingBook } = await supabase
          .from("books")
          .select("*")
          .eq("id", existing.id)
          .single();

        if (existingBook) {
          bookMap.set(existingBook.id, existingBook);
        }
      }
    }

    const books = Array.from(bookMap.values()).slice(0, 10);

    // Background enrichment: Trigger enrichment for new books without blocking response
    const newBooksNeedingEnrichment = books.filter(
      (book) => !book.cover_url || !book.age_min || !book.age_max
    );

    if (newBooksNeedingEnrichment.length > 0) {
      console.log(`[SEARCH] Triggering background enrichment for ${newBooksNeedingEnrichment.length} books`);
      
      // Fire-and-forget: enrich books in background without awaiting
      fetch(`${supabaseUrl}/functions/v1/enrich-book-data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          book_ids: newBooksNeedingEnrichment.map((b) => b.id),
        }),
      }).catch((err) => {
        console.error("[SEARCH] Background enrichment trigger failed:", err);
      });
    }

    return new Response(JSON.stringify({ books }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Search books error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message, books: [] }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});