import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingState = ({ 
  message = "Loading...",
  fullScreen = false
}: LoadingStateProps) => {
  const content = (
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {content}
      </div>
    );
  }

  return (
    <Card className="p-8">
      {content}
    </Card>
  );
};
