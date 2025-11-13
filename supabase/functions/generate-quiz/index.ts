import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

CRITICAL REQUIREMENTS:
- Generate EXACTLY ${numQuestions} questions
- Each question must be fun and encouraging
- Question text: maximum 20 words, simple language
- Provide exactly 3 options per question
- Each option: maximum 10 words
- Mark the correct answer clearly
- Make questions varied: mix character questions, plot questions, and detail questions
- Keep tone positive and supportive

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "text": "Question text here?",
      "options": ["Option 1", "Option 2", "Option 3"],
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
      if (!q.text || !Array.isArray(q.options) || q.options.length !== 3) {
        throw new Error("Invalid question format");
      }
      if (typeof q.correct_index !== "number" || q.correct_index < 0 || q.correct_index > 2) {
        throw new Error("Invalid correct_index");
      }
    }

    // Save quiz template to database
    const { error: insertError } = await supabase.from("quiz_templates").insert({
      book_id: bookId,
      age_band: ageBand,
      difficulty,
      num_questions: numQuestions,
      questions_json: questions,
      source: "ai_generated",
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