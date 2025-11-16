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

/**
 * Clean book description by removing promotional references to other books
 */
function cleanBookDescription(description: string, bookTitle: string): string {
  // Remove sentences mentioning "From the creator(s) of..."
  let cleaned = description.replace(/From the creators? of[^.!?]*[.!?]/gi, '');
  
  // Remove review quotes that might mention other books
  cleaned = cleaned.replace(/"[^"]*Giraffes[^"]*"/gi, '');
  
  // Remove sentences with "also by" or "other books"
  cleaned = cleaned.replace(/Also by[^.!?]*[.!?]/gi, '');
  cleaned = cleaned.replace(/Other books[^.!?]*[.!?]/gi, '');
  
  // Remove sentences mentioning awards/reviews for other books
  cleaned = cleaned.replace(/(?:Daily Telegraph|Guardian|Times|bestselling)[^.!?]*(?:Giraffes|dance)[^.!?]*[.!?]/gi, '');
  
  // Trim extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
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

    // Priority 1: Check for user-submitted content FIRST
    console.log(`[1/5] Checking user-submitted content...`);
    const { data: userContent } = await supabase
      .from("book_content")
      .select("description, subjects")
      .eq("book_id", bookId)
      .eq("approved", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (userContent?.description) {
      bookDescription = userContent.description;
      bookSubjects = userContent.subjects || [];
      contentSource = "user_curated";
      console.log(`✓ User-Curated Content: Found description (${bookDescription.length} chars)`);
      console.log(`  Subjects: ${bookSubjects.slice(0, 5).join(', ')}`);
      console.log(`⚡ Using curated content - skipping external APIs`);
    }

    // Priority 2: Try Google Books API (only if no user content)
    if (!bookDescription) {
      try {
        const searchQuery = `${book.title}${book.author ? ` ${book.author}` : ''}`;
        console.log(`[2/5] Searching Google Books for: ${searchQuery}`);
        
        const gbResponse = await fetchWithTimeout(
          `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=5`,
          10000
        );
        
        if (gbResponse.ok) {
          const gbData = await gbResponse.json();
          console.log(`Google Books returned ${gbData.items?.length || 0} results`);
          
          let bestMatch = null;
          let bestMatchScore = -1;
          
          // Score each result to find the best match
          for (const item of gbData.items || []) {
            const volumeInfo = item.volumeInfo;
            
            if (!volumeInfo.description) continue;
            
            // Calculate title similarity (case-insensitive, normalize spaces)
            const normalizedBookTitle = book.title.toLowerCase().trim();
            const normalizedGbTitle = volumeInfo.title?.toLowerCase().trim() || "";
            
            // Check if titles match closely
            const titleMatch = 
              normalizedGbTitle.includes(normalizedBookTitle) || 
              normalizedBookTitle.includes(normalizedGbTitle) ||
              normalizedGbTitle.replace(/[^a-z0-9]/g, '') === normalizedBookTitle.replace(/[^a-z0-9]/g, '');
            
            // Calculate author similarity if we have author info
            let authorMatch = false;
            if (book.author && volumeInfo.authors) {
              const normalizedBookAuthor = book.author.toLowerCase().trim();
              const gbAuthors = volumeInfo.authors.map((a: string) => a.toLowerCase().trim());
              authorMatch = gbAuthors.some((a: string) => 
                a.includes(normalizedBookAuthor) || 
                normalizedBookAuthor.includes(a) ||
                a.replace(/[^a-z]/g, '') === normalizedBookAuthor.replace(/[^a-z]/g, '')
              );
            }
            
            // Has description
            const hasDescription = !!volumeInfo.description;
            
            console.log(`  Checking: "${volumeInfo.title}" by ${volumeInfo.authors?.join(', ') || 'unknown'}`);
            console.log(`    Title match: ${titleMatch}, Author match: ${authorMatch}, Has description: ${hasDescription}`);
            
            // Calculate match score
            let score = 0;
            if (titleMatch) score += 50;
            if (authorMatch) score += 20;
            if (hasDescription) score += 10;
            if (titleMatch && authorMatch) score += 20; // Bonus for both matching
            
            console.log(`    Match score: ${score}`);
            
            if (score > bestMatchScore) {
              bestMatchScore = score;
              bestMatch = volumeInfo;
              console.log(`  ✓ New best match (score: ${score})`);
            } else if (score > 0) {
              console.log(`  ✗ Not better than current best (${bestMatchScore})`);
            }
          }
          
          if (bestMatch && bestMatchScore >= 50) {
            bookDescription = bestMatch.description;
            bookSubjects = bestMatch.categories || [];
            contentSource = "google_books";
            console.log(`✓ Google Books: Found description (${bookDescription.length} chars)`);
            console.log(`Subjects found: ${bookSubjects.length}\n`);
          } else {
            console.log(`✗ Google Books: No confident match found (best score: ${bestMatchScore})`);
          }
        }
      } catch (error) {
        console.error("Google Books API failed:", error);
      }
    }

    // Priority 3: Fallback to Open Library
    if (!bookDescription && book.open_library_id) {
      try {
        console.log(`[2/5] Fetching from Open Library: ${book.open_library_id}`);
        
        // Try /works/ endpoint first
        let olResponse = await fetchWithTimeout(
          `https://openlibrary.org${book.open_library_id}.json`,
          10000
        );
        
        // If /works/ fails, try /books/ endpoint
        if (!olResponse.ok && book.open_library_id.includes('/works/')) {
          const bookEndpoint = book.open_library_id.replace('/works/', '/books/');
          console.log(`  Trying alternative endpoint: ${bookEndpoint}`);
          olResponse = await fetchWithTimeout(
            `https://openlibrary.org${bookEndpoint}.json`,
            10000
          );
        }
        
        if (olResponse.ok) {
          const olData = await olResponse.json();
          
          // Extract description (handle string or object format)
          if (typeof olData.description === 'string') {
            bookDescription = olData.description;
          } else if (olData.description?.value) {
            bookDescription = olData.description.value;
          }
          
          // Get first sentence as additional context
          if (olData.first_sentence?.value && bookDescription) {
            bookDescription = `${olData.first_sentence.value}\n\n${bookDescription}`;
          }
          
          // Get subjects/themes
          bookSubjects = olData.subjects || [];
          
          if (bookDescription) {
            contentSource = "open_library";
            console.log(`✓ Open Library: Found description (${bookDescription.length} chars)`);
            console.log(`  Subjects: ${bookSubjects.slice(0, 5).join(', ')}`);
          } else {
            console.log(`✗ Open Library: No description found`);
          }
        } else {
          console.log(`✗ Open Library: Request failed with status ${olResponse.status}`);
        }
      } catch (error) {
        console.error("Open Library API failed:", error);
      }
    }

    // Priority 4: Skip duplicate user content check (already done as Priority 1)

    // Priority 5: Try Wikipedia
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
        
        const aiSearchResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        });
        
        if (aiSearchResponse.ok) {
          const aiSearchData = await aiSearchResponse.json();
          const summary = aiSearchData.choices?.[0]?.message?.content;
          
          if (summary && !summary.includes("NO_INFO_FOUND")) {
            bookDescription = summary;
            contentSource = "ai_web_search";
            console.log(`✓ AI Web Search: Generated description (${bookDescription.length} chars)`);
          }
        }
      } catch (error) {
        console.error("AI web search failed:", error);
      }
    }

    console.log(`=== Content Fetching Complete ===`);
    console.log(`Source used: ${contentSource}`);
    console.log(`Description length: ${bookDescription ? bookDescription.length : 0} chars`);
    console.log(`Subjects found: ${bookSubjects.length}\n`);

    // Validate that description actually matches the book
    if (bookDescription) {
      const descLower = bookDescription.toLowerCase();
      const titleWords = book.title.toLowerCase().split(' ').filter((w: string) => w.length > 3);
      
      // Check if at least 40% of significant title words appear in description
      const matchCount = titleWords.filter((word: string) => descLower.includes(word)).length;
      const matchRatio = titleWords.length > 0 ? matchCount / titleWords.length : 0;
      
      console.log(`Content validation: ${matchCount}/${titleWords.length} title words found (${(matchRatio * 100).toFixed(0)}%)`);
      
      if (matchRatio < 0.4) {
        console.warn(`⚠️ WARNING: Description may not match book!`);
        console.warn(`  Expected title words: ${titleWords.join(', ')}`);
        console.warn(`  Description preview: ${bookDescription.substring(0, 200)}...`);
        console.warn(`  Treating as insufficient data`);
        
        // Treat this as insufficient data
        bookDescription = "";
        contentSource = "none";
      } else {
        console.log(`✓ Content validation passed`);
      }
    }

    // Clean promotional content from description
    if (bookDescription) {
      console.log(`Original description length: ${bookDescription.length} chars`);
      bookDescription = cleanBookDescription(bookDescription, book.title);
      console.log(`Cleaned description length: ${bookDescription.length} chars`);
    }

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
      easy: "Ages 5-6: Prioritize concrete WHO/WHAT questions: character names/types (What animal?), colors (What color?), simple actions (What did they do?), and obvious story events. Include visual descriptions for picture books. Keep questions 8-12 words, use simple vocabulary.",
      medium: "Ages 7-8: Mix concrete facts (characters, colors, visual details, actions) with simple WHY questions about clear motivations. Ask 'What happened when...?' and 'Why did [character] feel...?' Test both visual memory AND story sequence. Use 12-18 words per question.",
      hard: "Ages 9-10: Ask deeper questions about story themes, character development, the story's message, and how events connect. Include inference questions about the narrative. Use 18-20 words per question.",
    };

    const systemPrompt = `You are an expert reading comprehension test creator for children's books. Your ONLY job is to test if a child understood the STORY they read - the narrative, characters, plot, settings, emotions, and themes.

EDUCATIONAL GOAL: Create questions that verify the child read and understood the story's content, NOT the physical book features.

ABSOLUTELY FORBIDDEN - NEVER ask about:
❌ Physical book features (pop-ups, flaps, stickers, lift-the-flap, touch-and-feel, interactive elements)
❌ Things you can touch, lift, pull, feel, or physically interact with in the book
❌ Book format (hardcover, paperback, number of pages)
❌ Awards, reviews, or ratings
❌ Other books by the same author
❌ Meta-questions about the book itself
❌ Generic vocabulary not specific to this story
❌ Abstract concepts like "phenomenon", "demonstration", "perception" (use concrete story language instead)

PRIORITIZE THESE QUESTION TYPES (especially for picture books):

✅ VISUAL/COLOR questions (for books with visual elements):
   - "What color(s) is [character]?"
   - "What pattern does [character] have on their body?"
   - "What does [character] look like?"
   - "What did [character] wear?"
   - "What colors did [character] see/use?"

✅ CONCRETE CHARACTER questions:
   - "What animal/creature is [character]?"
   - "What is the main character's name?"
   - "Who did [specific action] in the story?"

✅ SPECIFIC STORY ACTION questions:
   - "What did [character] do when [specific event]?"
   - "What did [character] say/shout in the story?"
   - "What happened to [character] at the end?"

✅ STORY EVENT questions:
   - "What celebration happens in the story?"
   - "What special day do the characters celebrate?"
   - "What did [character] roll in/jump in/hide in?"

✅ WHERE questions (about story settings):
   - "Where did the story take place?"
   - "Where did [character] go when [event]?"

✅ WHEN questions (about story sequence):
   - "What happened FIRST in the story?"
   - "What did [character] do AFTER [event]?"
   - "What happened at the END of the story?"

✅ WHY questions (about clear motivations):
   - "Why did [character] feel [emotion]?"
   - "Why did [character] want to [action]?"

✅ HOW questions (about emotions):
   - "How did [character] feel when [event]?"
   - "How did the other characters react?"

EXAMPLES OF EXCELLENT CONCRETE QUESTIONS:
✓ "What animal is Elmer?" (character type)
✓ "What colors are on Elmer's body?" (visual description)
✓ "What did Elmer roll in to change his color?" (specific action)
✓ "What did Elmer shout in the rain?" (concrete dialogue)
✓ "What day do elephants celebrate every year?" (story event)
✓ "Why did Elmer want to look grey?" (clear motivation)
✓ "Who was afraid to jump into the water?" (character emotion)
✓ "What did the penguin do to be brave?" (plot action)
✓ "Where did the animals have their contest?" (setting)
✓ "What happened after the character jumped in?" (sequence)
✓ "How did the character feel at the end?" (emotion)
✓ "What did the character learn about being brave?" (theme)

EXAMPLES OF BAD QUESTIONS TO AVOID:
❌ ABSTRACT/META questions:
✗ "What phenomenon did [character] want to explain?" (too abstract)
✗ "How did [character's] demonstration compare to...?" (too meta)
✗ "What helps perception change?" (too philosophical)
✗ "What was more original?" (too subjective)
✗ "What type of phenomenon...?" (use concrete story language)

❌ PHYSICAL BOOK questions:
✗ "What can you lift on this page?" (physical interaction)
✗ "What texture does the fur feel like?" (physical sensation)
✗ "How many pages are in the book?" (book format)
✗ "What award did this book win?" (meta information)
✗ "What does 'brave' mean?" (generic vocabulary, not story-specific)

INSTEAD OF ABSTRACT, ASK CONCRETE:
✗ "What phenomenon did Elmer demonstrate?" → ✓ "What did Elmer do in the rain?"
✗ "How did perception change?" → ✓ "How did the water feel to Elmer's trunk?"
✗ "What was more original?" → ✓ "What funny thing did Elmer do?"

BOOK CONTENT FOR "${book.title}" (YOUR ONLY SOURCE):
${bookDescription}

${bookSubjects.length > 0 ? `STORY THEMES: ${bookSubjects.slice(0, 10).join(', ')}` : ''}

CRITICAL INSTRUCTIONS:
1. Use ONLY the story content above for "${book.title}"
2. If the description mentions other books ("From the creators of..."), IGNORE that completely
3. If you cannot extract actual story details (characters, plot, events), return an error
4. NEVER invent characters, events, or details not in the story
5. Every question must be answerable by a child who read and understood this story

${difficultyInstructions[difficulty] || difficultyInstructions.medium}

TECHNICAL REQUIREMENTS:
- Generate EXACTLY ${numQuestions} questions
- Question text: maximum 20 words, child-friendly language
- Each question must have exactly 4 options:
  * 3 specific answers based on story content
  * 1 "None of the above" option
- Each option: maximum 10 words
- Make "None of the above" correct in only 1-2 questions maximum
- Mix question types: characters, plot events, sequence, emotions, themes, settings
- Keep tone positive and supportive

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
    // Note: Removed overly aggressive "wrong book" validation since we now prioritize
    // user-curated content first, which prevents wrong book contamination at the source.
    // The validation was incorrectly flagging valid questions like "What animal is Elmer?"

    // Validate questions are story-based, not about physical book features
    const physicalBookPatterns = [
      /\b(pop-?up|lift|flap|pull|tab|wheel|slider|sticker|touch|feel|texture)\b/i,
      /what (can you|do you) (lift|pull|touch|feel|see|find) (in|on) the book/i,
      /what kind of (surprise|feature|element) (is|are) in the book/i,
      /how many (pages|flaps|pop-?ups)/i,
      /what (is|are) (in|on|under) the (flap|tab|page)/i,
      /interactive/i,
    ];

    const physicalBookQuestions = questions.filter((q: any) => {
      const questionText = q.text.toLowerCase();
      const allText = questionText + ' ' + q.options.join(' ').toLowerCase();
      return physicalBookPatterns.some(pattern => pattern.test(allText));
    });

    if (physicalBookQuestions.length > 0) {
      console.error(`Found ${physicalBookQuestions.length} questions about physical book features (NOT story content):`);
      physicalBookQuestions.forEach((q: any) => console.error(`  - ${q.text}`));
      
      throw new Error(`Quiz included forbidden questions about physical book features instead of story content. All questions must be about the narrative, characters, plot, and themes. Please regenerate.`);
    }

    // Shuffle answer options for each question (Fisher-Yates algorithm)
    // BUT keep "None of the above" always at the end
    for (const q of questions) {
      // Check if the last option is "None of the above"
      const hasNoneOption = q.options[3] === "None of the above";
      
      if (hasNoneOption) {
        // Only shuffle the first 3 options, keep "None of the above" at index 3
        const firstThreeOptions = q.options.slice(0, 3);
        const indices = [0, 1, 2];
        
        // Fisher-Yates shuffle for first 3 indices only
        for (let i = 2; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        
        // Reorder first 3 options based on shuffled indices
        const shuffledFirstThree = indices.map((i: number) => firstThreeOptions[i]);
        
        // Update options: shuffled first 3 + "None of the above" at the end
        q.options = [...shuffledFirstThree, "None of the above"];
        
        // Update correct_index only if it's one of the first 3 options
        if (q.correct_index < 3) {
          q.correct_index = indices.indexOf(q.correct_index);
        } else {
          // If correct answer is "None of the above", it stays at index 3
          q.correct_index = 3;
        }
      } else {
        // If no "None of the above", shuffle all 4 options (existing logic)
        const indices = q.options.map((_: string, i: number) => i);
        
        for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        
        const shuffledOptions = indices.map((i: number) => q.options[i]);
        const newCorrectIndex = indices.indexOf(q.correct_index);
        
        q.options = shuffledOptions;
        q.correct_index = newCorrectIndex;
      }
    }

    // Validate questions against book content
    console.log("Generated questions based on book content:");
    console.log(`Content source used: ${contentSource}`);
    for (const q of questions) {
      console.log(`Q: ${q.text} | Correct: ${q.options[q.correct_index]}`);
    }
    console.log(`Successfully generated ${questions.length} questions\n`);

    // Save quiz template to database
    console.log(`Saving quiz template with source: ${contentSource}`);
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