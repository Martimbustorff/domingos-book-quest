import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Star, RotateCcw, BookOpen, TrendingUp } from "lucide-react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { updateUserStats } from "@/lib/achievements";
import { toast } from "@/hooks/use-toast";

const Result = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const score = parseInt(searchParams.get("score") || "0");
  const total = parseInt(searchParams.get("total") || "10");
  const bookId = searchParams.get("bookId");

  const percentage = Math.round((score / total) * 100);
  const [points, setPoints] = useState(0);
  const [saving, setSaving] = useState(true);

  useEffect(() => {
    const saveResults = async () => {
      // Trigger confetti for good scores
      if (percentage >= 70) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }

      // Award points based on performance
      const earnedPoints = score * 10;
      setPoints(earnedPoints);

      // Save to database if user is authenticated
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user && bookId) {
          await updateUserStats(
            user.id,
            bookId,
            score,
            total,
            "medium", // You can pass difficulty from URL params if needed
            earnedPoints
          );
        } else {
          // Fallback to localStorage for non-authenticated users
          const currentPoints = parseInt(localStorage.getItem("totalPoints") || "0");
          localStorage.setItem("totalPoints", (currentPoints + earnedPoints).toString());
        }
      } catch (error: any) {
        console.error("Error saving results:", error);
        toast({
          title: "Couldn't save your progress",
          description: "But don't worry, your points are still counted!",
          variant: "destructive",
        });
        // Fallback to localStorage
        const currentPoints = parseInt(localStorage.getItem("totalPoints") || "0");
        localStorage.setItem("totalPoints", (currentPoints + earnedPoints).toString());
      } finally {
        setSaving(false);
      }
    };

    saveResults();
  }, []);

  // Determine stars and message
  const getStarsAndMessage = () => {
    if (percentage >= 90) {
      return { stars: 3, message: "Amazing! You're a reading superstar! 🌟" };
    } else if (percentage >= 70) {
      return { stars: 2, message: "Great job! You really know this book! 📚" };
    } else if (percentage >= 50) {
      return { stars: 1, message: "Good effort! Keep practicing! 💪" };
    } else {
      return { stars: 0, message: "Nice try! Want to read it again? 📖" };
    }
  };

  const { stars, message } = getStarsAndMessage();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <Card className="p-6 sm:p-10 md:p-12 space-y-6 sm:space-y-8 text-center">
          {/* Stars */}
          <div className="flex justify-center gap-2 sm:gap-3">
            {[1, 2, 3].map((i) => (
              <Star
                key={i}
                className={`h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 ${
                  i <= stars
                    ? "fill-primary text-primary animate-pop-in"
                    : "text-muted"
                }`}
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>

          {/* Score */}
          <div className="space-y-3 sm:space-y-4">
            <p className="text-5xl sm:text-6xl md:text-7xl font-bold gradient-text">
              {score} / {total}
            </p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight px-2">{message}</p>
          </div>

          {/* Points */}
          <Card className="p-5 sm:p-6 bg-gradient-to-r from-accent/20 to-primary/20">
            <p className="text-lg sm:text-xl">
              <span className="text-2xl sm:text-3xl">🪙</span> You earned{" "}
              <span className="font-bold gradient-text-accent text-xl sm:text-2xl">+{points} points</span>
            </p>
          </Card>

          {/* Encouragement */}
          <div className="space-y-2 text-muted-foreground text-base sm:text-lg font-medium px-2">
            {percentage >= 70 ? (
              <p>You really understood this story! Keep it up! 🎉</p>
            ) : (
              <p>
                Reading is a journey. Every quiz makes you better! 🚀
              </p>
            )}
          </div>
        </Card>

        {/* Actions */}
        <div className="space-y-3 sm:space-y-4">
          <Button
            size="lg"
            variant="outline"
            className="w-full h-14 sm:h-16 text-lg sm:text-xl rounded-[24px] quiz-button font-semibold min-h-[56px]"
            onClick={() => navigate(`/book/${bookId}`)}
          >
            <RotateCcw className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
            🔁 Try again
          </Button>

          <Button
            size="lg"
            className="w-full h-14 sm:h-16 text-lg sm:text-xl rounded-[24px] shadow-[0_8px_32px_rgba(99,102,241,0.3)] quiz-button font-semibold min-h-[56px]"
            onClick={() => navigate("/search")}
          >
            <BookOpen className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
            📚 Choose another book
          </Button>

          <Button
            size="lg"
            variant="gradient"
            className="w-full h-14 sm:h-16 text-lg sm:text-xl rounded-[24px] quiz-button font-semibold min-h-[56px]"
            onClick={() => navigate("/dashboard")}
          >
            <TrendingUp className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
            📊 View Dashboard
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="w-full h-14 sm:h-16 text-lg sm:text-xl rounded-[24px] quiz-button font-semibold min-h-[56px]"
            onClick={() => navigate("/")}
          >
            🏠 Go home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Result;