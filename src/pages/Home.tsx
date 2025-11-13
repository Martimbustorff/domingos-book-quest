import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { BookOpen, Star } from "lucide-react";
import mascotBulldog from "@/assets/mascot-bulldog.png";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Mascot */}
        <div className="flex justify-center animate-bounce-gentle">
          <img 
            src={mascotBulldog} 
            alt="Domingos the Reading Bulldog" 
            className="w-32 h-32 md:w-40 md:h-40"
          />
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Domingos Book Quiz
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            Fun questions for little readers! 📚
          </p>
        </div>

        {/* Main Actions */}
        <div className="space-y-4 pt-6">
          <Button
            size="lg"
            className="w-full h-16 text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all quiz-button"
            onClick={() => navigate("/search")}
          >
            <BookOpen className="mr-2 h-6 w-6" />
            🔍 Find my book
          </Button>

          <Button
            size="lg"
            variant="secondary"
            className="w-full h-16 text-xl font-bold rounded-2xl shadow-md hover:shadow-lg transition-all quiz-button"
            onClick={() => navigate("/popular")}
          >
            <Star className="mr-2 h-6 w-6" />
            ⭐ Popular books
          </Button>
        </div>

        {/* Footer */}
        <div className="pt-12 text-sm text-muted-foreground">
          <p>Free • No login required • Safe for kids</p>
        </div>
      </div>
    </div>
  );
};

export default Home;