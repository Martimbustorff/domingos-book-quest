import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { BookOpen, Star, TrendingUp, Users, BookPlus } from "lucide-react";
import mascotBulldog from "@/assets/mascot-bulldog.png";
import AuthButton from "@/components/AuthButton";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
const Home = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  useEffect(() => {
    // Check age verification on mount
    const ageVerified = localStorage.getItem("age_verified");
    if (!ageVerified) {
      navigate("/age-gate");
      return;
    }
    checkAuth();
  }, [navigate]);
  const checkAuth = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
    if (user) {
      const {
        data: roles
      } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const hasParentOrTeacher = roles?.some(r => r.role === "parent" || r.role === "teacher");
      if (hasParentOrTeacher) {
        setUserRole(roles?.find(r => r.role === "parent" || r.role === "teacher")?.role || null);
      }
    }
  };
  return <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="absolute top-4 right-4">
        <AuthButton />
      </div>
      <div className="max-w-md w-full space-y-8 sm:space-y-12 text-center">
        {/* Mascot */}
        <div className="flex justify-center animate-float">
          <img alt="Domingos the Reading Bulldog" src="/lovable-uploads/1df14f40-654b-44ac-85e9-d12419d1d644.png" className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 drop-shadow-2xl object-contain" />
        </div>

        {/* Title */}
        <div className="space-y-3 sm:space-y-4 px-2">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
            Domingos Book Quiz
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground">
            Fun questions for little readers! 📚
          </p>
        </div>

        {/* Main Actions */}
        <div className="space-y-4 sm:space-y-6 pt-6 sm:pt-8 px-2">
          {isAuthenticated && userRole && (userRole === "parent" || userRole === "teacher") && <>
              <Button size="lg" variant="accent" className="w-full min-h-[56px]" onClick={() => navigate("/parent-dashboard")}>
                <Users className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
                👨‍👩‍👧‍👦 {userRole === "parent" ? "Parent" : "Teacher"} Dashboard
              </Button>
              
              <Button size="lg" variant="outline" className="w-full min-h-[56px]" onClick={() => navigate("/contribute")}>
                <BookPlus className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
                📝 Contribute Content
              </Button>
            </>}
          
          <Button size="lg" variant="default" className="w-full min-h-[56px]" onClick={() => navigate("/search")}>
            <BookOpen className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
            🔍 Find my book
          </Button>

          <Button size="lg" variant="accent" className="w-full min-h-[56px]" onClick={() => navigate("/popular")}>
            <Star className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
            ⭐ Popular books
          </Button>
        </div>

        {/* Footer */}
        <div className="pt-8 sm:pt-12 space-y-2">
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">
            Free • Safe for kids • Track your progress
          </p>
          <p className="text-xs text-muted-foreground">
            <button onClick={() => navigate("/privacy")} className="hover:text-foreground underline transition-colors">
              Privacy Policy
            </button>
            {" • "}
            <span>COPPA Compliant</span>
          </p>
        </div>
      </div>
    </div>;
};
export default Home;