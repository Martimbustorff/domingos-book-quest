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

  // Use Lovable AI with Gemini Pro for comprehensive enrichment (age, story, characters, quiz topics)
  // ALWAYS run AI enrichment to get age_min, age_max, key_characters, and quiz_topics
  let aiEnrichment: any = null;
  try {
    console.log(`[ENRICH] Using Lovable AI for comprehensive book analysis (always runs)`);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const enrichmentPrompt = `Analyze the book: "${bookTitle}"${bookAuthor ? ` by ${bookAuthor}` : ""}

Provide a JSON response with:
1. is_appropriate_for_children: Boolean - Is this appropriate for children ages 5-12? Consider:
   - Adult themes (violence, horror, sexuality, drug use)
   - Complex philosophical or existential content
   - Books marketed for teens/adults (age 14+)
   - Technical/academic manuals
   Examples of INAPPROPRIATE: Shakespeare, Stephen King, Kafka, adult literary fiction, technical manuals
   Examples of APPROPRIATE: Picture books, chapter books, middle grade novels

2. age_min and age_max: ONLY if appropriate for children, estimate the age range (choose from: 5-6, 7-8, 9-10, 11-12)

3. summary: A detailed 300-400 word plot summary including:
   - Main characters with names and personalities
   - Key plot events in sequence
   - Important objects, locations, settings
   - Themes and lessons
   - How the story resolves

4. key_characters: Array of main characters with brief descriptions (e.g., ["Harry Potter: an 11-year-old wizard", "Hermione Granger: intelligent and studious friend"])

5. quiz_topics: Array of 5-10 specific story details that would make good quiz questions - NOT generic (e.g., ["color of the giant peach", "number of aunts James lives with", "name of the magical item"])

Return ONLY valid JSON with this structure:
{
  "is_appropriate_for_children": boolean,
  "age_min": number | null,
  "age_max": number | null,
  "summary": "detailed summary",
  "key_characters": ["character 1: description", "character 2: description"],
  "quiz_topics": ["specific detail 1", "specific detail 2"]
}`;

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
            content: "You are a children's literature expert who analyzes books to create detailed summaries and age-appropriate assessments. Use web search to find accurate age recommendations from publishers and bookstores. Always return valid JSON."
          },
          {
            role: "user",
            content: enrichmentPrompt
          }
        ],
        tools: [{ google_search: {} }]  // Enable Google Search grounding for accurate age ranges
      }),
    });

    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      const aiContent = aiData.choices?.[0]?.message?.content?.trim();
      
      if (aiContent) {
        try {
          // Extract JSON from the response (may be wrapped in markdown)
          const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            aiEnrichment = JSON.parse(jsonMatch[0]);
            // Use AI summary if we don't have description yet, otherwise keep existing
            if (!description) {
              description = aiEnrichment.summary;
            }
            result.sources_used.push("lovable_ai_gemini_pro_enriched");
            console.log(`[ENRICH] ✓ Got AI enrichment: age ${aiEnrichment.age_min}-${aiEnrichment.age_max}, ${aiEnrichment.key_characters?.length || 0} characters, ${aiEnrichment.quiz_topics?.length || 0} topics`);
          } else {
            // Fallback: use content as description if we don't have one
            if (!description) {
              description = aiContent;
            }
            result.sources_used.push("lovable_ai_gemini_pro");
            console.log(`[ENRICH] ✓ Got AI description (no structured data)`);
          }
        } catch (parseError) {
          console.error(`[ENRICH] Failed to parse AI JSON:`, parseError);
          // Fallback: use content as description if we don't have one
          if (!description) {
            description = aiContent;
          }
          result.sources_used.push("lovable_ai_gemini_pro");
        }
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

  // Check if book is appropriate for children
  if (aiEnrichment?.is_appropriate_for_children === false) {
    try {
      // Mark as not for children and DO NOT update age ranges
      await supabase
        .from("books")
        .update({
          enrichment_status: "not_for_children",
          enriched_at: new Date().toISOString(),
        })
        .eq("id", bookId);
      console.log(`[ENRICH] ✗ Book marked as NOT for children - will be flagged for deletion`);
      result.errors?.push("not_appropriate_for_children");
      return result;
    } catch (error) {
      console.error(`[ENRICH] Failed to update enrichment status:`, error);
      result.errors?.push("update_enrichment_status: " + (error as Error).message);
    }
  }

  // Update book with AI-estimated age range and enrichment status (only for appropriate books)
  if (aiEnrichment?.age_min && aiEnrichment?.age_max) {
    try {
      await supabase
        .from("books")
        .update({
          age_min: aiEnrichment.age_min,
          age_max: aiEnrichment.age_max,
          enrichment_status: "complete",
          enriched_at: new Date().toISOString(),
        })
        .eq("id", bookId);
      console.log(`[ENRICH] ✓ Age range updated: ${aiEnrichment.age_min}-${aiEnrichment.age_max}`);
    } catch (error) {
      console.error(`[ENRICH] Failed to update age range:`, error);
      result.errors?.push("update_age_range: " + (error as Error).message);
    }
  } else {
    // Mark as complete even without age range if we tried to enrich
    try {
      await supabase
        .from("books")
        .update({
          enrichment_status: "complete",
          enriched_at: new Date().toISOString(),
        })
        .eq("id", bookId);
    } catch (error) {
      console.error(`[ENRICH] Failed to update enrichment status:`, error);
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

      const contentData: any = {
        description,
        updated_at: new Date().toISOString(),
      };

      // Add AI enrichment data if available
      if (aiEnrichment?.key_characters) {
        contentData.key_characters = aiEnrichment.key_characters;
      }
      if (aiEnrichment?.quiz_topics) {
        contentData.subjects = aiEnrichment.quiz_topics;
      }

      if (existingContent) {
        // Update existing content
        await supabase
          .from("book_content")
          .update(contentData)
          .eq("id", existingContent.id);
        console.log(`[ENRICH] ✓ Book content updated with AI enrichment`);
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
            ...contentData,
            submitted_by: submittedBy,
            approved: true,
            approved_by: submittedBy,
            approved_at: new Date().toISOString(),
          });
        console.log(`[ENRICH] ✓ Book content inserted with AI enrichment`);
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
  
  // ✅ PHASE 2: Pre-generate quizzes if enrichment succeeded
  if (result.success && description) {
    console.log(`[ENRICH] 📝 Pre-generating quizzes for all difficulty levels...`);
    const difficulties = ['easy', 'medium', 'hard'];
    
    for (const difficulty of difficulties) {
      try {
        console.log(`[ENRICH]   Generating ${difficulty} quiz...`);
        
        // Call generate-quiz function internally
        const quizResponse = await supabase.functions.invoke('generate-quiz', {
          body: { 
            bookId: bookId, 
            numQuestions: 10, 
            difficulty: difficulty 
          }
        });
        
        if (quizResponse.error) {
          console.error(`[ENRICH]   ✗ Failed to generate ${difficulty} quiz:`, quizResponse.error);
        } else {
          console.log(`[ENRICH]   ✓ ${difficulty} quiz generated successfully`);
        }
        
        // Small delay between difficulty levels
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`[ENRICH]   ✗ Error generating ${difficulty} quiz:`, error);
      }
    }
    
    console.log(`[ENRICH] Quiz pre-generation complete`);
  }
  
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
