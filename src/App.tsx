import { Component, ReactNode, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useOAuthProfile } from "@/hooks/useOAuthProfile";
import Home from "./pages/Home";
import Onboarding from "./pages/Onboarding";
import Search from "./pages/Search";
import Popular from "./pages/Popular";
import BookDetail from "./pages/BookDetail";
import Quiz from "./pages/Quiz";
import Result from "./pages/Result";
import Dashboard from "./pages/Dashboard";
import ParentDashboard from "./pages/ParentDashboard";
import ChildProgress from "./pages/ChildProgress";
import AcceptInvitation from "./pages/AcceptInvitation";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Settings from "./pages/Settings";
import AdminPanel from "./pages/AdminPanel";
import Contribute from "./pages/Contribute";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import AgeGate from "./pages/AgeGate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 2 times for 5xx errors
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false, // Don't retry mutations by default
    },
  },
});

// Error Boundary Component
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <Card className="max-w-md w-full p-8 space-y-6 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-destructive">Oops!</h1>
              <p className="text-lg text-muted-foreground">Something went wrong</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = "/";
              }}
              className="w-full"
            >
              Return to Home
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Onboarding Check Wrapper
const OnboardingCheck = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const onboardingComplete = localStorage.getItem('onboarding_complete');
    
    if (!onboardingComplete) {
      navigate('/onboarding');
    }
    
    setIsChecking(false);
  }, [navigate]);

  if (isChecking) {
    return null;
  }

  return <>{children}</>;
};

const AppContent = () => {
  useOAuthProfile();
  
  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes (no onboarding check) */}
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/age-gate" element={<AgeGate />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Protected routes (require onboarding) */}
          <Route path="/" element={<OnboardingCheck><Home /></OnboardingCheck>} />
          <Route path="/search" element={<OnboardingCheck><Search /></OnboardingCheck>} />
          <Route path="/popular" element={<OnboardingCheck><Popular /></OnboardingCheck>} />
          <Route path="/book/:bookId" element={<OnboardingCheck><BookDetail /></OnboardingCheck>} />
          <Route path="/quiz" element={<OnboardingCheck><Quiz /></OnboardingCheck>} />
          <Route path="/result" element={<OnboardingCheck><Result /></OnboardingCheck>} />
          <Route path="/dashboard" element={<OnboardingCheck><Dashboard /></OnboardingCheck>} />
          <Route path="/parent-dashboard" element={<OnboardingCheck><ParentDashboard /></OnboardingCheck>} />
          <Route path="/child/:childId" element={<OnboardingCheck><ChildProgress /></OnboardingCheck>} />
          <Route path="/accept-invitation/:code" element={<OnboardingCheck><AcceptInvitation /></OnboardingCheck>} />
          <Route path="/settings" element={<OnboardingCheck><Settings /></OnboardingCheck>} />
          <Route path="/admin" element={<OnboardingCheck><AdminPanel /></OnboardingCheck>} />
          <Route path="/contribute" element={<OnboardingCheck><Contribute /></OnboardingCheck>} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
