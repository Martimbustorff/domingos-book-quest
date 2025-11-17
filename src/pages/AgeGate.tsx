import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, Shield } from "lucide-react";

const AgeGate = () => {
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = (isParent: boolean) => {
    // Store age verification in localStorage
    localStorage.setItem("age_verified", "true");
    localStorage.setItem("is_parent", isParent.toString());
    setConfirmed(true);
    
    // Navigate to home after brief delay
    setTimeout(() => {
      navigate("/");
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-accent/5 to-secondary/5">
      <Card className="max-w-2xl w-full p-8 sm:p-12 space-y-8 animate-in fade-in">
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-br from-primary to-secondary p-6 rounded-full animate-pulse">
              <BookOpen className="h-16 w-16 text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-bold gradient-text">
            Welcome to Domingos Book Quest
          </h1>
          <p className="text-lg text-muted-foreground">
            A safe, educational quiz platform for young readers
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-start gap-4 p-4 bg-accent/10 rounded-lg border border-accent/20">
            <Shield className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Age-Appropriate Content</h3>
              <p className="text-sm text-muted-foreground">
                This platform is designed for children aged 5-13. All content is carefully curated 
                to be safe and educational. We comply with COPPA (Children's Online Privacy Protection Act).
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-bold text-center text-foreground">Who will be using this platform?</h2>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <Button
                size="lg"
                className="h-auto py-6 flex-col gap-3"
                onClick={() => handleConfirm(false)}
                disabled={confirmed}
              >
                <Users className="h-8 w-8" />
                <div className="space-y-1">
                  <div className="font-bold">I'm a Child</div>
                  <div className="text-xs opacity-80">Ages 5-13</div>
                </div>
              </Button>

              <Button
                size="lg"
                variant="secondary"
                className="h-auto py-6 flex-col gap-3"
                onClick={() => handleConfirm(true)}
                disabled={confirmed}
              >
                <Shield className="h-8 w-8" />
                <div className="space-y-1">
                  <div className="font-bold">I'm a Parent/Guardian</div>
                  <div className="text-xs opacity-80">Supervising a child</div>
                </div>
              </Button>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>
              By continuing, you acknowledge that you have read and agree to our{" "}
              <button
                onClick={() => navigate("/privacy")}
                className="text-primary hover:underline font-semibold"
              >
                Privacy Policy
              </button>
            </p>
            <p className="text-xs">
              Parents: You can review, modify, or delete your child's data at any time in Settings
            </p>
          </div>
        </div>

        {confirmed && (
          <div className="text-center text-sm text-success-foreground bg-success/10 p-3 rounded-lg border border-success/20 animate-in fade-in">
            ✓ Verified! Redirecting to Domingos Book Quest...
          </div>
        )}
      </Card>
    </div>
  );
};

export default AgeGate;
