import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BatchResult {
  book_id: string;
  title: string;
  difficulties_generated: string[];
  errors: string[];
}

/**
 * ✅ PHASE 3: Batch pre-generate quizzes for all enriched books
 * 
 * This function finds books that have content but are missing quizzes,
 * then generates quizzes for all difficulty levels.
 * 
 * Usage:
 *   POST /batch-generate-quizzes
 *   Body: { limit: 10 } // Optional, defaults to 10 books per batch
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { limit = 10 } = await req.json().catch(() => ({ limit: 10 }));

    console.log(`[BATCH] Starting batch quiz generation (limit: ${limit})`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find books with content but missing quizzes
    console.log(`[BATCH] Finding books needing quizzes...`);
    
    // Get all books with content
    const { data: booksWithContent, error: contentError } = await supabase
      .from("book_content")
      .select("book_id, books(id, title, author)")
      .eq("approved", true)
      .limit(limit * 2); // Get more than needed to filter

    if (contentError) {
      throw new Error(`Failed to fetch book content: ${contentError.message}`);
    }

    if (!booksWithContent || booksWithContent.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No books with content found",
          books_processed: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For each book, check if it has quizzes for all difficulty levels
    const booksNeedingQuizzes: any[] = [];
    
    for (const item of booksWithContent) {
      const book = item.books as any;
      if (!book || typeof book !== 'object' || !book.id) continue;

      // Check existing quiz coverage
      const { data: existingQuizzes } = await supabase
        .from("quiz_templates")
        .select("age_band, difficulty")
        .eq("book_id", book.id);

      const existingDifficulties = new Set(existingQuizzes?.map(q => q.difficulty) || []);
      const missingDifficulties = ['easy', 'medium', 'hard'].filter(d => !existingDifficulties.has(d));

      if (missingDifficulties.length > 0) {
        booksNeedingQuizzes.push({
          ...book,
          missing: missingDifficulties
        });
      }

      if (booksNeedingQuizzes.length >= limit) break;
    }

    console.log(`[BATCH] Found ${booksNeedingQuizzes.length} books needing quizzes`);

    if (booksNeedingQuizzes.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "All books already have quizzes",
          books_processed: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate quizzes for each book
    const results: BatchResult[] = [];
    let totalGenerated = 0;

    for (const book of booksNeedingQuizzes) {
      console.log(`[BATCH] Processing: "${book.title}" (${book.missing.length} difficulties missing)`);
      
      const result: BatchResult = {
        book_id: book.id,
        title: book.title,
        difficulties_generated: [],
        errors: []
      };

      for (const difficulty of book.missing) {
        try {
          console.log(`[BATCH]   Generating ${difficulty} quiz...`);
          
          const quizResponse = await supabase.functions.invoke('generate-quiz', {
            body: { 
              bookId: book.id, 
              numQuestions: 10, 
              difficulty: difficulty 
            }
          });
          
          if (quizResponse.error) {
            result.errors.push(`${difficulty}: ${quizResponse.error.message}`);
            console.error(`[BATCH]   ✗ Failed:`, quizResponse.error);
          } else {
            result.difficulties_generated.push(difficulty);
            totalGenerated++;
            console.log(`[BATCH]   ✓ Success`);
          }
          
          // Rate limit protection: 2 second delay between generations
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          result.errors.push(`${difficulty}: ${errorMsg}`);
          console.error(`[BATCH]   ✗ Error:`, errorMsg);
        }
      }

      results.push(result);
      console.log(`[BATCH] Completed: ${book.title} (${result.difficulties_generated.length}/${book.missing.length} succeeded)`);
    }

    const successCount = results.filter(r => r.difficulties_generated.length > 0).length;
    const failureCount = results.filter(r => r.errors.length > 0).length;

    console.log(`[BATCH] Batch complete: ${successCount} books with new quizzes, ${failureCount} with errors`);
    console.log(`[BATCH] Total quizzes generated: ${totalGenerated}`);

    return new Response(
      JSON.stringify({
        success: true,
        books_processed: booksNeedingQuizzes.length,
        quizzes_generated: totalGenerated,
        books_with_new_quizzes: successCount,
        books_with_errors: failureCount,
        results: results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[BATCH] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        error: message,
        details: "Failed to batch generate quizzes"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
