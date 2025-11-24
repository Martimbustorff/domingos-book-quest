import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookOpen, ArrowLeft } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use current origin only for localhost, otherwise always use Netlify domain
      const redirectUrl = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')
        ? `${window.location.origin}/reset-password`
        : 'https://domingosbookquiz.netlify.app/reset-password';
      
      console.log('Current hostname:', window.location.hostname);
      console.log('Sending password reset to:', email);
      console.log('Redirect URL:', redirectUrl);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      setEmailSent(true);
      toast.success("Check your email for the password reset link!");
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error(error.message || "Failed to send reset email");
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
          <h1 className="text-3xl sm:text-4xl font-bold gradient-text">
            Reset Password
          </h1>
          <p className="text-muted-foreground">
            {emailSent
              ? "Check your email for a password reset link"
              : "Enter your email to receive a password reset link"}
          </p>
        </div>

        {!emailSent ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
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

            <Button
              type="submit"
              className="w-full h-12 text-lg font-bold"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-primary/10 rounded-lg text-center">
              <p className="text-sm">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Don't see the email? Check your spam folder.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                The link expires in 1 hour and can only be used once.
              </p>
            </div>
            <Button
              onClick={() => setEmailSent(false)}
              variant="outline"
              className="w-full h-12"
            >
              Try a different email
            </Button>
          </div>
        )}

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
};

export default ForgotPassword;
