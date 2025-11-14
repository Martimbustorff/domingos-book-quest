import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { BookOpen, Star, TrendingUp, Users } from "lucide-react";
import mascotBulldog from "@/assets/mascot-bulldog.png";
import AuthButton from "@/components/AuthButton";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

const Home = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
    
    if (user) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      const hasParentOrTeacher = roles?.some(r => r.role === "parent" || r.role === "teacher");
      if (hasParentOrTeacher) {
        setUserRole(roles?.find(r => r.role === "parent" || r.role === "teacher")?.role || null);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="absolute top-4 right-4">
        <AuthButton />
      </div>
      <div className="max-w-md w-full space-y-8 sm:space-y-12 text-center">
        {/* Mascot */}
        <div className="flex justify-center animate-float">
          <img 
            src={mascotBulldog} 
            alt="Domingos the Reading Bulldog" 
            className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 drop-shadow-2xl"
          />
        </div>

        {/* Title */}
        <div className="space-y-3 sm:space-y-4 px-2">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold gradient-text leading-tight">
            Domingos Book Quiz
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground font-medium">
            Fun questions for little readers! 📚
          </p>
        </div>

        {/* Main Actions */}
        <div className="space-y-4 sm:space-y-6 pt-6 sm:pt-8 px-2">
          {isAuthenticated && userRole && (userRole === "parent" || userRole === "teacher") && (
            <Button
              size="lg"
              variant="gradient"
              className="w-full h-14 sm:h-16 text-lg sm:text-xl font-bold rounded-[24px] quiz-button min-h-[56px]"
              onClick={() => navigate("/parent-dashboard")}
            >
              <Users className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
              👨‍👩‍👧‍👦 {userRole === "parent" ? "Parent" : "Teacher"} Dashboard
            </Button>
          )}
          
          <Button
            size="lg"
            className="w-full h-14 sm:h-16 text-lg sm:text-xl font-bold rounded-[24px] shadow-[0_8px_32px_rgba(99,102,241,0.3)] hover:shadow-[0_12px_48px_rgba(99,102,241,0.5)] transition-all quiz-button min-h-[56px]"
            onClick={() => navigate("/search")}
          >
            <BookOpen className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
            🔍 Find my book
          </Button>

          <Button
            size="lg"
            variant="gradient"
            className="w-full h-14 sm:h-16 text-lg sm:text-xl font-bold rounded-[24px] shadow-[0_8px_32px_rgba(168,85,247,0.3)] hover:shadow-[0_12px_48px_rgba(168,85,247,0.5)] transition-all quiz-button min-h-[56px]"
            onClick={() => navigate("/popular")}
          >
            <Star className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
            ⭐ Popular books
          </Button>
        </div>

        {/* Footer */}
        <div className="pt-8 sm:pt-12 text-xs sm:text-sm text-muted-foreground font-medium">
          <p>Free • Safe for kids • Track your progress</p>
        </div>
      </div>
    </div>
  );
};

export default Home;