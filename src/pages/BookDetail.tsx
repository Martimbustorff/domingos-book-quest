import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Book, Play, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const BookDetail = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [selectedQuestions, setSelectedQuestions] = useState(10);
  const [selectedDifficulty, setSelectedDifficulty] = useState("");

  // Fetch book details
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

  // Check for YouTube video
  const { data: videoData, error: videoError } = useQuery({
    queryKey: ["video", bookId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-book-media", {
          body: { bookId },
        });

        if (error) {
          console.error("Media fetch error:", error);
          return { hasVideo: false, videoId: null };
        }
        return data;
      } catch (error) {
        console.error("Failed to fetch media:", error);
        return { hasVideo: false, videoId: null };
      }
    },
    retry: 1,
  });

  // Check content quality
  const { data: quizQuality } = useQuery({
    queryKey: ["quiz-quality", bookId, selectedDifficulty],
    queryFn: async () => {
      const { data } = await supabase
        .from("quiz_templates")
        .select("content_quality_score, content_source")
        .eq("book_id", bookId)
        .eq("difficulty", selectedDifficulty)
        .maybeSingle();
      return data;
    },
    enabled: !!bookId && !!selectedDifficulty,
  });

  const handleStartQuiz = () => {
    navigate(
      `/quiz?bookId=${bookId}&questions=${selectedQuestions}&difficulty=${selectedDifficulty}`
    );
  };

  // Video feature removed - route doesn't exist

  if (!book) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-full"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>

        {/* Book Display */}
        <Card className="p-6 flex flex-col items-center text-center rounded-lg">
          <h1 className="text-2xl font-bold">{book.title}</h1>
          {book.author && (
            <p className="text-lg text-muted-foreground mt-1">by {book.author}</p>
          )}
          
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt={book.title}
              className="w-48 h-64 object-cover rounded-lg shadow-md mt-4"
            />
          ) : (
            <div className="w-48 h-64 bg-muted rounded-lg flex items-center justify-center mt-4">
              <Book className="h-20 w-20 text-muted-foreground" />
            </div>
          )}
          
          <p className="text-lg font-medium mt-4">Nice choice! 🌟</p>
          <p className="text-muted-foreground">Have you already read this story?</p>
        </Card>


        {/* Content Quality Warning */}
        {quizQuality && quizQuality.content_quality_score && quizQuality.content_quality_score < 70 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Limited Content Available</AlertTitle>
            <AlertDescription>
              This quiz may have basic questions. Help improve it by adding book details!
              <Button 
                variant="link" 
                className="p-0 h-auto ml-1"
                onClick={() => navigate(`/contribute?book=${bookId}`)}
              >
                Contribute →
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Quiz Options */}
        <Card className="p-6 space-y-6">
          <h2 className="text-xl font-bold">Choose your quiz:</h2>

          {/* Question Count */}
          <div className="space-y-3">
            <p className="font-medium">How many questions?</p>
            <div className="grid grid-cols-3 gap-3">
              {[10, 15, 20].map((num) => (
                <Button
                  key={num}
                  variant={selectedQuestions === num ? "default" : "outline"}
                  className="h-16 text-lg font-bold rounded-xl quiz-button"
                  onClick={() => setSelectedQuestions(num)}
                >
                  {num === 10 && "🧸"} {num === 15 && "🚀"} {num === 20 && "🏆"}
                  <br />
                  {num}
                </Button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="space-y-3">
            <p className="font-medium">Pick your level:</p>
            <div className="space-y-2">
              {[
                { value: "easy", label: "Easy (Age 5-6)", emoji: "🌱" },
                { value: "medium", label: "Medium (7-8)", emoji: "🌟" },
                { value: "hard", label: "Challenging (9-10)", emoji: "🏆" },
              ].map((diff) => (
                <Button
                  key={diff.value}
                  variant={selectedDifficulty === diff.value ? "default" : "outline"}
                  className="w-full h-14 text-lg font-bold rounded-xl quiz-button justify-start"
                  onClick={() => setSelectedDifficulty(diff.value)}
                >
                  {diff.emoji} {diff.label}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Start Quiz Button */}
        <Button
          size="lg"
          className="w-full h-16 text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all quiz-button"
          onClick={handleStartQuiz}
        >
          📘 Start Quiz!
        </Button>
      </div>
    </div>
  );
};

export default BookDetail;