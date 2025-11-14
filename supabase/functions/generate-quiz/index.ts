import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to add timeout to fetch requests
async function fetchWithTimeout(url: string, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookId, numQuestions, difficulty } = await req.json();

    console.log("Generating quiz:", { bookId, numQuestions, difficulty });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get book details
    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("*")
      .eq("id", bookId)
      .single();

    if (bookError || !book) {
      throw new Error("Book not found");
    }

    // Fetch book content from multiple sources
    console.log(`=== Content Fetching Started ===`);
    console.log(`Book: "${book.title}" by ${book.author || 'unknown'}`);
    console.log(`Book ID: ${bookId}`);
    console.log(`Open Library ID: ${book.open_library_id || 'none'}`);
    
    let bookDescription = "";
    let bookSubjects: string[] = [];
    let contentSource = "none";

    // Priority 1: Try Google Books API
    try {
      const searchQuery = `${book.title}${book.author ? ` ${book.author}` : ''}`;
      console.log(`[1/5] Searching Google Books for: ${searchQuery}`);
      
      const gbResponse = await fetchWithTimeout(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=3`,
        10000
      );
      
      if (gbResponse.ok) {
        const gbData = await gbResponse.json();
        
        // Find the best match with longest description
        for (const item of gbData.items || []) {
          const volumeInfo = item.volumeInfo;
          if (volumeInfo.description && volumeInfo.description.length > bookDescription.length) {
            bookDescription = volumeInfo.description;
            bookSubjects = volumeInfo.categories || [];
            contentSource = "google_books";
          }
        }
        
        if (bookDescription) {
          console.log(`✓ Google Books: Found description (${bookDescription.length} chars)`);
        }
      }
    } catch (error) {
      console.error("Google Books API failed:", error);
    }

    // Priority 2: Fallback to Open Library
    if (!bookDescription && book.open_library_id) {
      try {
        console.log(`[2/5] Fetching content from Open Library: ${book.open_library_id}`);
        
        const olResponse = await fetchWithTimeout(
          `https://openlibrary.org${book.open_library_id}.json`,
          10000
        );
        
        if (olResponse.ok) {
          const olData = await olResponse.json();
          
          // Extract description (can be string or object)
          if (typeof olData.description === 'string') {
            bookDescription = olData.description;
          } else if (olData.description?.value) {
            bookDescription = olData.description.value;
          }
          
          // Get first sentence as additional context
          if (olData.first_sentence?.value) {
            bookDescription = `${olData.first_sentence.value}\n\n${bookDescription}`;
          }
          
          // Get subjects/themes
          bookSubjects = olData.subjects || [];
          
          if (bookDescription) {
            contentSource = "open_library";
            console.log(`✓ Open Library: Found description (${bookDescription.length} chars)`);
            console.log(`Subjects: ${bookSubjects.slice(0, 5).join(', ')}`);
          }
        }
      } catch (error) {
        console.error("Failed to fetch from Open Library:", error);
      }
    }

    // Priority 3: Check for user-submitted content
    if (!bookDescription) {
      console.log(`[3/5] Checking user-submitted content...`);
      const { data: userContent } = await supabase
        .from("book_content")
        .select("description, subjects")
        .eq("book_id", bookId)
        .eq("approved", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (userContent) {
        bookDescription = userContent.description;
        bookSubjects = userContent.subjects || [];
        contentSource = "user_submitted";
        console.log(`✓ User Content: Found description (${bookDescription.length} chars)`);
      }
    }

    // Priority 4: Try Wikipedia
    if (!bookDescription) {
      try {
        const wikiQuery = `${book.title} ${book.author || ''} children's book`;
        console.log(`[4/5] Searching Wikipedia for: ${wikiQuery}`);
        
        const wikiResponse = await fetchWithTimeout(
          `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=true&explaintext=true&titles=${encodeURIComponent(wikiQuery)}&origin=*`,
          10000
        );
        
        if (wikiResponse.ok) {
          const wikiData = await wikiResponse.json();
          const pages = wikiData.query?.pages;
          const firstPage = pages ? Object.values(pages)[0] as any : null;
          
          if (firstPage?.extract && firstPage.pageid !== -1) {
            bookDescription = firstPage.extract;
            contentSource = "wikipedia";
            console.log(`✓ Wikipedia: Found description (${bookDescription.length} chars)`);
          }
        }
      } catch (error) {
        console.error("Wikipedia API failed:", error);
      }
    }

    // Priority 5: Use Lovable AI web search as LAST RESORT
    if (!bookDescription) {
      try {
        console.log(`[5/5] Using AI web search as last resort...`);
        
        const searchPrompt = `Search for a detailed plot summary of the children's book "${book.title}" by ${book.author || "unknown author"}. 

Return a factual 200-300 word plot summary that includes:
- Main characters and their names
- Key plot events in sequence
- Important details like objects, locations, and what happens
- How the story resolves

CRITICAL: If you cannot find reliable information about this specific book, respond with exactly: NO_INFO_FOUND`;

        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        const aiSearchResponse = await fetchWithTimeout(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          15000
        );
        
        const aiSearchData = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are a research assistant. Search the web for accurate book information." },
              { role: "user", content: searchPrompt }
            ],
          }),
        }).then(r => r.json());
        
        const summary = aiSearchData.choices?.[0]?.message?.content;
        
        if (summary && !summary.includes("NO_INFO_FOUND")) {
          bookDescription = summary;
          contentSource = "ai_web_search";
          console.log(`✓ AI Web Search: Generated description (${bookDescription.length} chars)`);
        }
      } catch (error) {
        console.error("AI web search failed:", error);
      }
    }

    console.log(`=== Content Fetching Complete ===`);
    console.log(`Source used: ${contentSource}`);
    console.log(`Description length: ${bookDescription ? bookDescription.length : 0} chars`);
    console.log(`Subjects found: ${bookSubjects.length}`);

    if (!bookDescription) {
      console.warn(`No description found for book: ${book.title} after trying all sources.`);
      return new Response(
        JSON.stringify({
          error: "insufficient_data",
          message: "This book doesn't have detailed content available. Quiz accuracy cannot be guaranteed.",
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Map difficulty to age band
    const ageBandMap: Record<string, string> = {
      easy: "5-6",
      medium: "7-8",
      hard: "9-10",
    };
    const ageBand = ageBandMap[difficulty] || "7-8";

    // Check if quiz template already exists
    const { data: existingQuiz } = await supabase
      .from("quiz_templates")
      .select("*")
      .eq("book_id", bookId)
      .eq("age_band", ageBand)
      .eq("num_questions", numQuestions)
      .maybeSingle();

    if (existingQuiz) {
      console.log("Using existing quiz template");
      return new Response(
        JSON.stringify({
          questions: existingQuiz.questions_json,
          source: existingQuiz.source,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate new quiz using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const difficultyInstructions: Record<string, string> = {
      easy: "Use very simple vocabulary suitable for ages 5-6. Focus on basic characters, colors, and obvious events. Keep questions under 15 words.",
      medium: "Use clear vocabulary for ages 7-8. Include 'why' questions and slightly more detail about plot and characters.",
      hard: "Use more advanced vocabulary for ages 9-10. Include deeper understanding questions about motivations, themes, and sequence of events.",
    };

    const systemPrompt = `You are a friendly reading helper for children. Generate exactly ${numQuestions} multiple-choice quiz questions about the book "${book.title}" by ${book.author || "Unknown Author"}.

${difficultyInstructions[difficulty] || difficultyInstructions.medium}

BOOK CONTENT (USE THIS AS YOUR ONLY SOURCE):
${bookDescription}

${bookSubjects.length > 0 ? `THEMES: ${bookSubjects.slice(0, 10).join(', ')}` : ''}

CRITICAL: Base ALL questions ONLY on the book content provided above. DO NOT use general knowledge or make assumptions. If the book content doesn't mention specific details (like what was stolen or what characters did), DO NOT create questions about those details.

CRITICAL REQUIREMENTS:
- Generate EXACTLY ${numQuestions} questions
- Base questions ONLY on provided book content - NEVER guess or hallucinate details
- Each question must be fun and encouraging
- Question text: maximum 20 words, simple language
- Provide exactly 4 options per question:
  * 3 specific answers based on book content
  * 1 "None of the above" option (should be correct only when all 3 other answers are intentionally wrong)
- Each option: maximum 10 words
- Mark the correct answer clearly
- Make questions varied: mix character questions, plot questions, and detail questions
- Keep tone positive and supportive
- For most questions, one of the first 3 options should be correct
- Use "None of the above" as the correct answer sparingly (maybe 1-2 questions out of ${numQuestions})

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "text": "Question text here?",
      "options": ["Option 1", "Option 2", "Option 3", "None of the above"],
      "correct_index": 0
    }
  ]
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Generate ${numQuestions} quiz questions for "${book.title}".`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content from AI");
    }

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response");
    }

    const quizData = JSON.parse(jsonMatch[0]);
    const questions = quizData.questions;

    // Validate questions
    if (!Array.isArray(questions) || questions.length !== numQuestions) {
      throw new Error(`Expected ${numQuestions} questions, got ${questions?.length || 0}`);
    }

    // Validate each question
    for (const q of questions) {
      if (!q.text || !Array.isArray(q.options)) {
        throw new Error("Invalid question format");
      }
      
      // Ensure 4 options with "None of the above"
      if (q.options.length !== 4) {
        console.warn(`Question has ${q.options.length} options, expected 4. Fixing...`);
        if (q.options.length === 3) {
          q.options.push("None of the above");
        } else {
          throw new Error(`Invalid number of options: ${q.options.length}`);
        }
      }
      
      // Ensure last option is "None of the above"
      if (q.options[3] !== "None of the above") {
        console.warn(`Question missing "None of the above" option, adding it`);
        q.options[3] = "None of the above";
      }
      
      if (typeof q.correct_index !== "number" || q.correct_index < 0 || q.correct_index > 3) {
        throw new Error("Invalid correct_index");
      }
    }

    // Validate questions against book content
    console.log("Generated questions based on book content:");
    for (const q of questions) {
      console.log(`Q: ${q.text} | Correct: ${q.options[q.correct_index]}`);
    }

    // Save quiz template to database
    const { error: insertError } = await supabase.from("quiz_templates").insert({
      book_id: bookId,
      age_band: ageBand,
      difficulty,
      num_questions: numQuestions,
      questions_json: questions,
      source: "ai_generated_with_content",
      content_source: contentSource,
    });

    if (insertError) {
      console.error("Failed to save quiz template:", insertError);
    }

    console.log(`Successfully generated ${questions.length} questions`);

    return new Response(
      JSON.stringify({
        questions,
        source: "ai_generated",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Generate quiz error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        error: message,
        details: "Failed to generate quiz. Please try again.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});