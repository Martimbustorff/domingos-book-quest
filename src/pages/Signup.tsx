import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookOpen, Users, GraduationCap, User } from "lucide-react";

const Signup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"student" | "parent" | "teacher">("student");
  const [loading, setLoading] = useState(false);

  const handleRoleClick = (selectedRole: "student" | "parent" | "teacher") => {
    if (selectedRole === "parent" || selectedRole === "teacher") {
      toast.info("Parent & Teacher accounts are coming soon! For now, please sign up as a Student to start your reading journey.");
      return;
    }
    setRole(selectedRole);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            display_name: displayName,
          }
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("No user data returned from signup");
      }

      const userId = authData.user.id;

      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          user_id: userId,
          display_name: displayName,
        });

      if (profileError) throw profileError;

      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: role as "student" | "parent" | "teacher" | "admin",
        });

      if (roleError) throw roleError;

      if (role === "student") {
        const { error: statsError } = await supabase
          .from("user_stats")
          .insert({
            user_id: userId,
          });

        if (statsError) throw statsError;
      }

      toast.success("Account created successfully! Welcome to BookQuiz!");
      navigate("/");
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      console.error("Google signup error:", error);
      toast.error(error.message || "Failed to sign up with Google");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <BookOpen className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Join Us!</h1>
          <p className="text-muted-foreground">Create an account to start your reading journey</p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full h-12 text-base font-semibold"
          onClick={handleGoogleSignup}
          disabled={loading}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          {/* Role selection hidden - all users default to "student" role
          <div className="space-y-2">
            <Label htmlFor="role" className="text-sm font-medium">
              I am a...
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleRoleClick("student")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  role === "student"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <User className="h-6 w-6 mx-auto mb-2" />
                <div className="text-sm font-medium">Student</div>
              </button>
              <button
                type="button"
                onClick={() => handleRoleClick("parent")}
                className="p-4 rounded-lg border-2 transition-all border-border opacity-50 cursor-not-allowed relative"
              >
                <Users className="h-6 w-6 mx-auto mb-2" />
                <div className="text-sm font-medium">Parent</div>
                <div className="text-xs text-muted-foreground mt-1">Coming Soon</div>
              </button>
              <button
                type="button"
                onClick={() => handleRoleClick("teacher")}
                className="p-4 rounded-lg border-2 transition-all border-border opacity-50 cursor-not-allowed relative"
              >
                <GraduationCap className="h-6 w-6 mx-auto mb-2" />
                <div className="text-sm font-medium">Teacher</div>
                <div className="text-xs text-muted-foreground mt-1">Coming Soon</div>
              </button>
            </div>
          </div>
          */}

          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-sm font-medium">
              Name (optional)
            </Label>
            <Input
              id="displayName"
              type="text"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-12"
            />
            <p className="text-xs text-muted-foreground">At least 6 characters</p>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-lg font-bold"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Sign Up"}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Log in
          </Link>
        </div>

        <div className="text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Signup;
