import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // Create profile and assign role
      if (data.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            user_id: data.user.id,
            display_name: displayName || email.split("@")[0],
          });

        if (profileError) {
          console.error("Profile creation error:", profileError);
        }

        // Assign role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: data.user.id,
            role: role,
          });

        if (roleError) {
          console.error("Role assignment error:", roleError);
        }

        // Initialize user stats for students
        if (role === "student") {
          const { error: statsError } = await supabase
            .from("user_stats")
            .insert({
              user_id: data.user.id,
            });

          if (statsError) {
            console.error("Stats initialization error:", statsError);
          }
        }
      }

      toast.success("Account created! Welcome to Domingos Book Quiz!");
      navigate(role === "student" ? "/" : "/parent-dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <BookOpen className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold gradient-text">Join Us!</h1>
          <p className="text-muted-foreground">Create an account to start your reading journey</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
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
            <Input
              id="password"
              type="password"
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
