import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Onboarding = () => {
  const navigate = useNavigate();

  const handleStartJourney = () => {
    localStorage.setItem('onboarding_complete', 'true');
    navigate('/signup');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleSkip = () => {
    localStorage.setItem('onboarding_complete', 'true');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative">
      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
      >
        Skip
      </button>

      <div className="w-full max-w-md flex flex-col items-center justify-center space-y-8">
        
        {/* Mascot Section with Orange Glow */}
        <div className="relative orange-glow animate-slide-up-fade">
          <img 
            src="/lovable-uploads/1df14f40-654b-44ac-85e9-d12419d1d644.png"
            alt="Domingos the Reading Bulldog"
            className="w-40 h-40 sm:w-48 sm:h-48 object-contain animate-gentle-float"
          />
        </div>

        {/* Text Section */}
        <div className="text-center space-y-4 max-w-sm">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Make every book an adventure.
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Fun, short quizzes that help kids understand more — and let parents feel confident about their learning.
          </p>
        </div>

        {/* CTA Section */}
        <div className="w-full space-y-4">
          <Button
            onClick={handleStartJourney}
            className="w-full h-14 rounded-full bg-primary text-primary-foreground font-bold shadow-lg hover:bg-primary/90 active:scale-95 transition-transform duration-150"
          >
            Start your journey
          </Button>
          
          <button
            onClick={handleLogin}
            className="w-full text-muted-foreground hover:text-foreground transition-colors text-sm underline-offset-4 hover:underline"
          >
            Log in →
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
