import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen } from "lucide-react";

const AgeGate = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Set age verification automatically
    localStorage.setItem("age_verified", "true");
    
    // Auto-redirect to home after 3 seconds
    const timer = setTimeout(() => {
      navigate("/");
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-primary via-primary/80 to-secondary animate-in fade-in">
      <div className="text-center space-y-8 animate-in fade-in-up">
        {/* App Icon */}
        <div className="flex justify-center">
          <div className="bg-white/20 backdrop-blur-sm p-8 rounded-full animate-pulse">
            <BookOpen className="h-20 w-20 text-white" />
          </div>
        </div>
        
        {/* App Name */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white">
          Domingos Book Quest
        </h1>
        
        {/* Purpose Statement */}
        <p className="text-xl sm:text-2xl text-white/90 max-w-2xl mx-auto font-medium">
          A safe, educational quiz platform for young readers
        </p>

        {/* Loading Indicator */}
        <div className="flex justify-center gap-2 pt-8">
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};

export default AgeGate;
