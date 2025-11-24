import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookOpen, Loader2, ArrowLeft } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('Checking session for password reset...');
    
    // Check if we have a valid session for password reset
    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      console.log('Session valid:', !!session);
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        setError('Failed to verify reset link. Please try again.');
        setIsValidSession(false);
        return;
      }
      
      if (session) {
        setIsValidSession(true);
      } else {
        setError('This password reset link has expired or been used. Please request a new one.');
        setIsValidSession(false);
      }
    });
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast.success("Password updated successfully!");
      
      // Sign out and redirect to login
      await supabase.auth.signOut();
      navigate("/login");
    } catch (error: any) {
      console.error('Password update error:', error);
      toast.error(error.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md p-6 sm:p-8 text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Verifying reset link...</p>
        </Card>
      </div>
    );
  }

  // Show error if link is invalid
  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <BookOpen className="h-12 w-12 text-destructive" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-destructive">
              Link Expired
            </h1>
            <p className="text-muted-foreground">{error}</p>
          </div>
          
          <Button
            onClick={() => navigate("/forgot-password")}
            className="w-full h-12 text-lg font-bold"
          >
            Request New Reset Link
          </Button>
          
          <div className="text-center">
            <Link
              to="/login"
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <BookOpen className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold gradient-text">
            Set New Password
          </h1>
          <p className="text-muted-foreground">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              New Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12"
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm New Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="h-12"
              minLength={6}
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-lg font-bold"
            disabled={loading}
          >
            {loading ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ResetPassword;
