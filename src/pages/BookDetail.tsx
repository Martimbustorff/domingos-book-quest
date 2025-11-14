import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Book, Play } from "lucide-react";
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
  const { data: videoData } = useQuery({
    queryKey: ["video", bookId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-book-media", {
        body: { bookId },
      });

      if (error) throw error;
      return data;
    },
  });

  const handleStartQuiz = () => {
    navigate(
      `/quiz?bookId=${bookId}&questions=${selectedQuestions}&difficulty=${selectedDifficulty}`
    );
  };

  const handleWatchVideo = () => {
    navigate(`/video/${bookId}?youtube=${videoData.videoId}`);
  };

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
        <Card className="p-6 space-y-6">
          <div className="flex gap-6 items-start">
            {book.cover_url ? (
              <img
                src={book.cover_url}
                alt={book.title}
                className="w-24 h-32 object-cover rounded-lg shadow-md"
              />
            ) : (
              <div className="w-24 h-32 bg-secondary rounded-lg flex items-center justify-center">
                <Book className="h-12 w-12 text-secondary-foreground" />
              </div>
            )}
            <div className="flex-1 space-y-2">
              <h1 className="text-2xl font-bold">{book.title}</h1>
              {book.author && (
                <p className="text-lg text-muted-foreground">by {book.author}</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-lg font-medium">Nice choice! 🌟</p>
            <p className="text-muted-foreground">
              Have you already read this story?
            </p>
          </div>
        </Card>

        {/* Video Option */}
        {videoData?.hasVideo && (
          <Button
            size="lg"
            variant="secondary"
            className="w-full h-14 text-lg rounded-2xl quiz-button"
            onClick={handleWatchVideo}
          >
            <Play className="mr-2 h-5 w-5" />
            🎥 Watch a video first
          </Button>
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