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

// Age verification using AI
async function verifyKidsBook(title: string, author: string | null): Promise<{
  isKidsBook: boolean;
  ageMin: number | null;
  ageMax: number | null;
}> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  const prompt = `Is "${title}"${author ? ` by ${author}` : ''} a children's book appropriate for kids aged 12 or under?

Respond with ONLY a JSON object in this exact format:
{
  "isKidsBook": true/false,
  "ageMin": <number or null>,
  "ageMax": <number or null>
}

Rules:
- isKidsBook: true if the book is appropriate for children aged 12 or under
- ageMin/ageMax: Estimated age range in 1-year bands (e.g., 5-6, 7-8, 9-10, 11-12)
- If NOT a kids book, set isKidsBook to false and both ages to null`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a children's book expert. Respond only with valid JSON." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI verification failed:", response.status);
      return { isKidsBook: false, ageMin: null, ageMax: null };
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);
    
    return {
      isKidsBook: parsed.isKidsBook === true,
      ageMin: parsed.ageMin,
      ageMax: parsed.ageMax,
    };
  } catch (error) {
    console.error("Age verification error:", error);
    return { isKidsBook: false, ageMin: null, ageMax: null };
  }
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

    // PHASE 1: Search local database first using fuzzy matching
    const { data: localBooks, error: localError } = await supabase.rpc(
      "search_books_local",
      { p_query: query, p_limit: 10 }
    );

    if (localError) {
      console.error("Local search error:", localError);
    }

    const localResults = (localBooks || []).map((book: any) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      cover_url: book.cover_url,
      age_min: book.age_min,
      age_max: book.age_max,
      available: true,
    }));

    // If we have sufficient local results, return immediately (no API call)
    if (localResults.length >= 5) {
      console.log(`Found ${localResults.length} local results, skipping Open Library`);
      return new Response(
        JSON.stringify({ books: localResults }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PHASE 2: Supplement with Open Library if needed
    console.log(`Only ${localResults.length} local results, querying Open Library`);
    
    const openLibraryUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`;
    const openLibraryResponse = await fetch(openLibraryUrl);

    if (!openLibraryResponse.ok) {
      console.error("Open Library API error:", openLibraryResponse.status);
      return new Response(
        JSON.stringify({ books: localResults }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openLibraryData = await openLibraryResponse.json();
    const apiBooks = openLibraryData.docs || [];

    // Process API books
    const processedApiBooks = [];
    
    for (const book of apiBooks) {
      const title = book.title;
      const author = book.author_name?.[0] || null;

      if (!title) continue;

      // PHASE 3: Check for duplicates using fuzzy matching
      const { data: existingBookId, error: dupeError } = await supabase.rpc(
        "find_similar_book",
        { p_title: title, p_author: author }
      );

      if (dupeError) {
        console.error("Duplicate check error:", dupeError);
      }

      if (existingBookId) {
        // Book already exists, fetch it
        const { data: existingBook } = await supabase
          .from("books")
          .select("*")
          .eq("id", existingBookId)
          .single();

        if (existingBook) {
          processedApiBooks.push({
            id: existingBook.id,
            title: existingBook.title,
            author: existingBook.author,
            cover_url: existingBook.cover_url,
            age_min: existingBook.age_min,
            age_max: existingBook.age_max,
            available: true,
          });
        }
        continue;
      }

      // PHASE 4: New book - verify if it's a kids book using AI
      console.log(`Verifying new book: ${title}`);
      const verification = await verifyKidsBook(title, author);

      const coverUrl = book.cover_i
        ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`
        : null;

      if (verification.isKidsBook && verification.ageMax && verification.ageMax <= 12) {
        // Kids book - insert to database
        const { data: newBook, error: insertError } = await supabase
          .from("books")
          .insert({
            title: title,
            author: author,
            cover_url: coverUrl,
            open_library_id: book.key?.replace("/works/", ""),
            age_min: verification.ageMin,
            age_max: verification.ageMax,
            enrichment_status: "pending",
          })
          .select()
          .single();

        if (insertError) {
          console.error("Insert error:", insertError);
        } else if (newBook) {
          console.log(`✅ Added kids book: ${title} (ages ${verification.ageMin}-${verification.ageMax})`);
          processedApiBooks.push({
            id: newBook.id,
            title: newBook.title,
            author: newBook.author,
            cover_url: newBook.cover_url,
            age_min: newBook.age_min,
            age_max: newBook.age_max,
            available: true,
          });
        }
      } else {
        // NOT a kids book - return as unavailable but DON'T store
        console.log(`❌ Not a kids book: ${title}`);
        processedApiBooks.push({
          id: `temp-${book.key}`, // Temporary ID for display only
          title: title,
          author: author,
          cover_url: coverUrl,
          age_min: null,
          age_max: null,
          available: false,
        });
      }
    }

    // Merge local and API results, remove duplicates
    const allBooks = [...localResults];
    const existingIds = new Set(localResults.map((b: any) => b.id));

    for (const apiBook of processedApiBooks) {
      if (!existingIds.has(apiBook.id)) {
        allBooks.push(apiBook);
        existingIds.add(apiBook.id);
      }
    }

    return new Response(
      JSON.stringify({ books: allBooks.slice(0, 10) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

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
