import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookEnrichmentResult {
  book_id: string;
  success: boolean;
  cover_url?: string;
  description?: string;
  sources_used: string[];
  errors?: string[];
}

async function enrichBookData(
  supabase: any,
  bookId: string,
  bookTitle: string,
  bookAuthor: string | null,
  openLibraryId: string | null
): Promise<BookEnrichmentResult> {
  const result: BookEnrichmentResult = {
    book_id: bookId,
    success: false,
    sources_used: [],
    errors: [],
  };

  console.log(`[ENRICH] Starting enrichment for book: ${bookTitle} by ${bookAuthor}`);

  // Phase 1: Enrich Cover
  let coverUrl = null;

  // Try Open Library Works API first if we have open_library_id
  if (openLibraryId && !coverUrl) {
    try {
      console.log(`[ENRICH] Trying Open Library Works API for cover: ${openLibraryId}`);
      const workUrl = `https://openlibrary.org${openLibraryId}.json`;
      const workResponse = await fetch(workUrl);
      
      if (workResponse.ok) {
        const workData = await workResponse.json();
        if (workData.covers && workData.covers.length > 0) {
          coverUrl = `https://covers.openlibrary.org/b/id/${workData.covers[0]}-L.jpg`;
          result.sources_used.push("open_library_works");
          console.log(`[ENRICH] ✓ Cover found via Open Library Works API`);
        }
      }
    } catch (error) {
      console.error(`[ENRICH] Open Library Works API error:`, error);
      result.errors?.push("open_library_works: " + (error as Error).message);
    }
  }

  // Try Google Books API for cover
  if (!coverUrl) {
    try {
      console.log(`[ENRICH] Trying Google Books API for cover`);
      const query = encodeURIComponent(`${bookTitle}${bookAuthor ? ` ${bookAuthor}` : ""}`);
      const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;
      const googleResponse = await fetch(googleBooksUrl);
      
      if (googleResponse.ok) {
        const googleData = await googleResponse.json();
        if (googleData.items && googleData.items[0]?.volumeInfo?.imageLinks) {
          const thumbnail = googleData.items[0].volumeInfo.imageLinks.thumbnail || 
                           googleData.items[0].volumeInfo.imageLinks.smallThumbnail;
          if (thumbnail) {
            coverUrl = thumbnail.replace("http://", "https://");
            result.sources_used.push("google_books");
            console.log(`[ENRICH] ✓ Cover found via Google Books API`);
          }
        }
      }
    } catch (error) {
      console.error(`[ENRICH] Google Books API error:`, error);
      result.errors?.push("google_books_cover: " + (error as Error).message);
    }
  }

  // Update cover if found
  if (coverUrl) {
    try {
      await supabase
        .from("books")
        .update({ cover_url: coverUrl })
        .eq("id", bookId);
      result.cover_url = coverUrl;
      console.log(`[ENRICH] ✓ Cover updated in database`);
    } catch (error) {
      console.error(`[ENRICH] Failed to update cover:`, error);
      result.errors?.push("update_cover: " + (error as Error).message);
    }
  } else {
    console.log(`[ENRICH] ✗ No cover found from any source`);
  }

  // Phase 2: Enrich Description
  let description = null;

  // Try Google Books API for description
  if (!description) {
    try {
      console.log(`[ENRICH] Trying Google Books API for description`);
      const query = encodeURIComponent(`${bookTitle}${bookAuthor ? ` ${bookAuthor}` : ""}`);
      const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;
      const googleResponse = await fetch(googleBooksUrl);
      
      if (googleResponse.ok) {
        const googleData = await googleResponse.json();
        if (googleData.items && googleData.items[0]?.volumeInfo?.description) {
          description = googleData.items[0].volumeInfo.description;
          if (!result.sources_used.includes("google_books")) {
            result.sources_used.push("google_books");
          }
          console.log(`[ENRICH] ✓ Description found via Google Books API (${description.length} chars)`);
        }
      }
    } catch (error) {
      console.error(`[ENRICH] Google Books API error for description:`, error);
      result.errors?.push("google_books_description: " + (error as Error).message);
    }
  }

  // Try Open Library Works API for description
  if (!description && openLibraryId) {
    try {
      console.log(`[ENRICH] Trying Open Library Works API for description`);
      const workUrl = `https://openlibrary.org${openLibraryId}.json`;
      const workResponse = await fetch(workUrl);
      
      if (workResponse.ok) {
        const workData = await workResponse.json();
        if (workData.description) {
          description = typeof workData.description === 'string' 
            ? workData.description 
            : workData.description.value;
          if (!result.sources_used.includes("open_library_works")) {
            result.sources_used.push("open_library_works");
          }
          console.log(`[ENRICH] ✓ Description found via Open Library Works API (${description.length} chars)`);
        }
      }
    } catch (error) {
      console.error(`[ENRICH] Open Library Works API error for description:`, error);
      result.errors?.push("open_library_description: " + (error as Error).message);
    }
  }

  // Use Lovable AI with Gemini Flash for web search and summary
  if (!description) {
    try {
      console.log(`[ENRICH] Trying Lovable AI web search for description`);
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY not configured");
      }

      const searchPrompt = `Find a detailed plot summary and description of the children's book "${bookTitle}"${bookAuthor ? ` by ${bookAuthor}` : ""}. Include key themes, characters, and age appropriateness. Be comprehensive but concise (200-300 words).`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "You are a children's book research assistant. Provide accurate, educational summaries of children's books based on available information."
            },
            {
              role: "user",
              content: searchPrompt
            }
          ],
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        description = aiData.choices?.[0]?.message?.content;
        if (description) {
          result.sources_used.push("lovable_ai_gemini_flash");
          console.log(`[ENRICH] ✓ Description generated via Lovable AI Gemini Flash (${description.length} chars)`);
        }
      } else {
        const errorText = await aiResponse.text();
        console.error(`[ENRICH] Lovable AI error:`, errorText);
        result.errors?.push("lovable_ai: " + errorText);
      }
    } catch (error) {
      console.error(`[ENRICH] Lovable AI error:`, error);
      result.errors?.push("lovable_ai: " + (error as Error).message);
    }
  }

  // Last resort: Use Lovable AI Deep Research with Gemini Pro
  if (!description) {
    try {
      console.log(`[ENRICH] Trying Lovable AI Deep Research (Gemini Pro) as last resort`);
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY not configured");
      }

      const deepResearchPrompt = `Conduct comprehensive research on the children's book "${bookTitle}"${bookAuthor ? ` by ${bookAuthor}` : ""}. 

Research and provide:
1. Plot summary and main themes
2. Key characters and their roles
3. Age appropriateness and reading level
4. Educational value and lessons
5. Critical reception and popularity

Synthesize all available information into a comprehensive but concise description (300-400 words).`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            {
              role: "system",
              content: "You are an expert children's literature researcher. Conduct thorough research and provide comprehensive, accurate information about children's books. Synthesize information from multiple perspectives."
            },
            {
              role: "user",
              content: deepResearchPrompt
            }
          ],
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        description = aiData.choices?.[0]?.message?.content;
        if (description) {
          result.sources_used.push("lovable_ai_gemini_pro_deep_research");
          console.log(`[ENRICH] ✓ Description generated via Lovable AI Deep Research (${description.length} chars)`);
        }
      } else {
        const errorText = await aiResponse.text();
        console.error(`[ENRICH] Lovable AI Deep Research error:`, errorText);
        result.errors?.push("lovable_ai_deep_research: " + errorText);
      }
    } catch (error) {
      console.error(`[ENRICH] Lovable AI Deep Research error:`, error);
      result.errors?.push("lovable_ai_deep_research: " + (error as Error).message);
    }
  }

  // Store description in book_content if found
  if (description) {
    try {
      // Check if book_content already exists
      const { data: existingContent } = await supabase
        .from("book_content")
        .select("id")
        .eq("book_id", bookId)
        .maybeSingle();

      if (existingContent) {
        // Update existing content
        await supabase
          .from("book_content")
          .update({
            description,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingContent.id);
        console.log(`[ENRICH] ✓ Description updated in book_content`);
      } else {
        // Create new content - use a system user ID (first admin or fallback)
        const { data: adminUser } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin")
          .limit(1)
          .maybeSingle();

        const submittedBy = adminUser?.user_id || "00000000-0000-0000-0000-000000000000";

        await supabase
          .from("book_content")
          .insert({
            book_id: bookId,
            description,
            submitted_by: submittedBy,
            approved: true,
            approved_by: submittedBy,
            approved_at: new Date().toISOString(),
          });
        console.log(`[ENRICH] ✓ Description inserted into book_content`);
      }
      result.description = description;
    } catch (error) {
      console.error(`[ENRICH] Failed to store description:`, error);
      result.errors?.push("store_description: " + (error as Error).message);
    }
  } else {
    console.log(`[ENRICH] ✗ No description found from any source`);
  }

  result.success = !!(coverUrl || description);
  console.log(`[ENRICH] Enrichment complete. Success: ${result.success}, Sources: ${result.sources_used.join(", ")}`);
  
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { book_id, book_ids } = await req.json();

    let booksToEnrich: any[] = [];

    if (book_id) {
      // Single book enrichment
      const { data: book } = await supabase
        .from("books")
        .select("*")
        .eq("id", book_id)
        .single();

      if (book) {
        booksToEnrich = [book];
      }
    } else if (book_ids && Array.isArray(book_ids)) {
      // Multiple books enrichment
      const { data: books } = await supabase
        .from("books")
        .select("*")
        .in("id", book_ids);

      if (books) {
        booksToEnrich = books;
      }
    } else {
      // Enrich all books missing data
      const { data: books } = await supabase
        .from("books")
        .select("id, title, author, cover_url, open_library_id")
        .or("cover_url.is.null,book_content.is.null")
        .limit(50); // Process in batches

      if (books) {
        booksToEnrich = books;
      }
    }

    console.log(`[ENRICH] Starting enrichment for ${booksToEnrich.length} books`);

    const results: BookEnrichmentResult[] = [];

    for (const book of booksToEnrich) {
      const result = await enrichBookData(
        supabase,
        book.id,
        book.title,
        book.author,
        book.open_library_id
      );
      results.push(result);

      // Small delay between books to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`[ENRICH] Batch complete: ${successCount} success, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        enriched_count: successCount,
        failed_count: failureCount,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[ENRICH] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
