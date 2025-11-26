import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Volume2 } from "lucide-react";
import confetti from "canvas-confetti";
import { quizEventSchema } from "@/lib/validation";
import { cn } from "@/lib/utils";

interface Question {
  text: string;
  options: string[]; // Now 4 options: 3 answers + "None of the above"
  correct_index: number;
}

const Quiz = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookId = searchParams.get("bookId");
  const numQuestions = parseInt(searchParams.get("questions") || "10");
  const difficulty = searchParams.get("difficulty") || "medium";

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
    });
  }, []);

  // Reset answer state when question changes to prevent visual bleed-through
  useEffect(() => {
    setSelectedAnswer(null);
    setShowFeedback(false);
  }, [currentQuestion]);

  // Fetch or generate quiz
  const { data: quizData, isLoading, error: quizError } = useQuery({
    queryKey: ["quiz", bookId, numQuestions, difficulty],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("generate-quiz", {
          body: { bookId, numQuestions, difficulty },
        });

        if (error) {
          // Check if it's an insufficient_data error (422 status)
          if (data?.error === "insufficient_data") {
            toast.error(data.message || "This book doesn't have enough content to generate a quiz.");
            navigate(`/book/${bookId}`);
            throw new Error("insufficient_data");
          }
          
          // Network or server error
          if (error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError")) {
            toast.error("Network error. Please check your connection and try again.");
            throw new Error("network_error");
          }
          
          toast.error("Failed to generate quiz. Please try again.");
          throw error;
        }

        // Track quiz start event (including anonymous users)
        const { data: { user } } = await supabase.auth.getUser();
        
        try {
          const eventData = quizEventSchema.parse({
            event_type: "quiz_started",
            book_id: bookId,
            age_band: difficulty,
            user_id: user?.id || null,
          });

          await supabase.from("events").insert(eventData);
        } catch (validationError) {
          console.error("Event validation failed:", validationError);
        }

        return data;
      } catch (error: any) {
        // Re-throw known errors
        if (error.message === "insufficient_data" || error.message === "network_error") {
          throw error;
        }
        
        // Handle unexpected errors
        console.error("Unexpected quiz generation error:", error);
        toast.error("An unexpected error occurred. Please try again.");
        throw error;
      }
    },
    retry: (failureCount, error: any) => {
      // Don't retry on insufficient_data or network errors
      if (error.message === "insufficient_data" || error.message === "network_error") {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    retryDelay: 1000,
  });

  const questions: Question[] = quizData?.questions || [];
  const currentQ = questions[currentQuestion];

  // Fetch book data for validation
  const { data: book } = useQuery({
    queryKey: ["book", bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("id", bookId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Improved content validation - check multiple questions for relevance
  useEffect(() => {
    if (questions.length > 0 && book && currentQuestion === 0) {
      const titleWords = book.title.toLowerCase().split(' ').filter((w: string) => w.length > 3);
      
      // Check first 3 questions instead of just the first one
      const firstThreeQuestions = questions.slice(0, 3)
        .map(q => q.text.toLowerCase())
        .join(' ');
      
      // Check if at least one significant title word appears in first 3 questions
      const titleInQuestions = titleWords.some((word: string) => 
        firstThreeQuestions.includes(word)
      );

      // Only warn if there's really no connection AND we have enough questions to check
      if (!titleInQuestions && titleWords.length > 0 && questions.length >= 3) {
        console.warn("Quiz content validation: Book title not found in first questions");
        // Don't show error toast - backend validation is more reliable
      }
    }
  }, [questions, book, currentQuestion]);

  const handleAnswerSelect = (index: number) => {
    if (showFeedback) return;
    setSelectedAnswer(index);
    setShowFeedback(true);

    const isCorrect = index === currentQ.correct_index;
    setAnswers([...answers, isCorrect]);
    if (isCorrect) {
      setScore(score + 1);
      // Trigger confetti for correct answer
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: [
          'hsl(var(--primary))',
          'hsl(var(--accent-foreground))',
          'hsl(var(--chart-1))',
          'hsl(var(--chart-2))'
        ]
      });
    }
  };

  const handleNext = async () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      // Record completion event, save quiz history, and track question responses
      try {
        // Always increment book popularity
        await supabase.rpc("increment_book_popularity", { p_book_id: bookId });

        // Track quiz completion event (including anonymous users)
        const eventData = quizEventSchema.parse({
          event_type: "quiz_completed",
          book_id: bookId,
          age_band: difficulty,
          score: score,
          user_id: userId || null,
        });

        await supabase.from("events").insert(eventData);

        // Save quiz history and question responses for authenticated users
        if (userId) {
          const pointsEarned = Math.round((score / questions.length) * 100);
          
          const { data: quizHistoryRecord, error: historyError } = await supabase
            .from("quiz_history")
            .insert({
              user_id: userId,
              book_id: bookId,
              score,
              total_questions: questions.length,
              difficulty,
              points_earned: pointsEarned,
            })
            .select()
            .single();

          if (historyError) {
            console.error("Failed to save quiz history:", historyError);
          } else if (quizHistoryRecord) {
            // Save individual question responses
            const questionResponses = questions.map((q, index) => ({
              quiz_history_id: quizHistoryRecord.id,
              question_index: index,
              question_text: q.text,
              selected_answer_index: answers[index] ? q.correct_index : (answers[index] === false ? -1 : -1),
              correct_answer_index: q.correct_index,
              is_correct: answers[index] || false,
              time_spent_ms: null,
            }));

            const { error: responsesError } = await supabase
              .from("quiz_question_responses")
              .insert(questionResponses);

            if (responsesError) {
              console.error("Failed to save question responses:", responsesError);
            }
          }
        }
      } catch (error) {
        console.error("Failed to record quiz completion:", error);
        // Don't show error to user for analytics failures
      }

      navigate(
        `/result?score=${score}&total=${questions.length}&bookId=${bookId}`
      );
    }
  };

  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    // Auto-advance after feedback
    if (showFeedback) {
      const timer = setTimeout(handleNext, 2000);
      return () => clearTimeout(timer);
    }
  }, [showFeedback]);

  if (isLoading || !currentQ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-lg">Preparing your quiz... 📚</p>
        </div>
      </div>
    );
  }

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen p-4 sm:p-6 pb-24">
      <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
        {/* Progress */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm font-medium">
            <span className="text-muted-foreground">Question {currentQuestion + 1} of {questions.length}</span>
            <span className="text-foreground font-semibold">Score: {score}</span>
          </div>
          <Progress value={progress} className="h-4" />
        </div>

        {/* Question */}
        <Card className="p-6 sm:p-8 space-y-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <h2 className="text-xl sm:text-2xl font-bold flex-1 leading-tight">
              {currentQ.text}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full flex-shrink-0 min-w-[44px] min-h-[44px]"
              onClick={() => speakText(currentQ.text)}
            >
              <Volume2 className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </div>
        </Card>

        {/* Options */}
        <div className="space-y-4 w-full" key={`question-${currentQuestion}`}>
          {currentQ.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrect = index === currentQ.correct_index;
            const showCorrect = showFeedback && isCorrect;
            const showWrong = showFeedback && isSelected && !isCorrect;

            return (
              <Button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                className={cn(
                  "w-full p-4 text-left font-medium text-base min-h-[56px] rounded-xl h-auto whitespace-normal justify-start",
                  !showFeedback && "border-2 border-border bg-white hover:bg-muted hover:border-primary",
                  showCorrect && "border-2 border-quiz-correct-border bg-quiz-correct",
                  showWrong && "border-2 border-quiz-wrong-border bg-quiz-wrong"
                )}
                disabled={showFeedback}
                variant="outline"
              >
                <span className="flex-1">{option}</span>
                {showCorrect && <span className="text-2xl ml-2">✓</span>}
                {showWrong && <span className="text-2xl ml-2 opacity-50">✗</span>}
              </Button>
            );
          })}
        </div>

        {/* Feedback */}
        {showFeedback && (
          <Card className="p-6 sm:p-8 text-center space-y-3 sm:space-y-4 animate-in fade-in">
            {selectedAnswer === currentQ.correct_index ? (
              <>
                <p className="text-3xl sm:text-4xl animate-pop-in">🎉</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">Awesome! You got it!</p>
              </>
            ) : (
              <>
                <p className="text-3xl sm:text-4xl animate-wiggle">💪</p>
                <p className="text-xl sm:text-2xl font-bold">Good try! Keep going!</p>
                <p className="text-muted-foreground text-base sm:text-lg font-medium mt-2">
                  The answer was: {currentQ.options[currentQ.correct_index]}
                </p>
              </>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default Quiz;