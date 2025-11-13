import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Star, RotateCcw, BookOpen } from "lucide-react";
import confetti from "canvas-confetti";

const Result = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const score = parseInt(searchParams.get("score") || "0");
  const total = parseInt(searchParams.get("total") || "10");
  const bookId = searchParams.get("bookId");

  const percentage = Math.round((score / total) * 100);
  const [points, setPoints] = useState(0);

  useEffect(() => {
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
    const currentPoints = parseInt(localStorage.getItem("totalPoints") || "0");
    localStorage.setItem("totalPoints", (currentPoints + earnedPoints).toString());
    setPoints(earnedPoints);
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
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <Card className="p-8 space-y-6 text-center">
          {/* Stars */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3].map((i) => (
              <Star
                key={i}
                className={`h-12 w-12 ${
                  i <= stars
                    ? "fill-primary text-primary animate-in zoom-in"
                    : "text-muted"
                }`}
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>

          {/* Score */}
          <div className="space-y-2">
            <p className="text-5xl font-bold text-primary">
              {score} / {total}
            </p>
            <p className="text-2xl font-bold">{message}</p>
          </div>

          {/* Points */}
          <Card className="p-4 bg-accent/20">
            <p className="text-lg">
              <span className="text-2xl">🪙</span> You earned{" "}
              <span className="font-bold text-accent">+{points} points</span>
            </p>
          </Card>

          {/* Encouragement */}
          <div className="space-y-2 text-muted-foreground">
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
        <div className="space-y-3">
          <Button
            size="lg"
            variant="outline"
            className="w-full h-14 text-lg rounded-2xl quiz-button"
            onClick={() => navigate(`/book/${bookId}`)}
          >
            <RotateCcw className="mr-2 h-5 w-5" />
            🔁 Try again
          </Button>

          <Button
            size="lg"
            className="w-full h-14 text-lg rounded-2xl shadow-lg quiz-button"
            onClick={() => navigate("/search")}
          >
            <BookOpen className="mr-2 h-5 w-5" />
            📚 Choose another book
          </Button>

          <Button
            size="lg"
            variant="secondary"
            className="w-full h-14 text-lg rounded-2xl quiz-button"
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