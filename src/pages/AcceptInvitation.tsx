import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, X, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const AcceptInvitation = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    checkAuthAndFetchInvitation();
  }, [code]);

  const checkAuthAndFetchInvitation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Login Required",
          description: "Please log in to accept this invitation",
        });
        navigate(`/login?redirect=/accept-invitation/${code}`);
        return;
      }

      if (!code) {
        toast({
          title: "Invalid Invitation",
          description: "No invitation code provided",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      const { data, error } = await supabase
        .from("guardian_relationships")
        .select(`
          id,
          guardian_id,
          relationship_type,
          status,
          profiles!guardian_relationships_guardian_id_fkey(display_name)
        `)
        .eq("invitation_code", code)
        .single();

      if (error || !data) {
        toast({
          title: "Invalid Invitation",
          description: "This invitation code is not valid",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      if (data.status !== "pending") {
        toast({
          title: "Invitation Already Used",
          description: "This invitation has already been accepted or rejected",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      if (data.guardian_id === user.id) {
        toast({
          title: "Invalid Action",
          description: "You cannot accept your own invitation",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setInvitation(data);
    } catch (error: any) {
      console.error("Error fetching invitation:", error);
      toast({
        title: "Error",
        description: "Failed to load invitation",
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("guardian_relationships")
        .update({
          student_id: user.id,
          status: "approved",
          approved_at: new Date().toISOString(),
        })
        .eq("id", invitation.id);

      if (error) throw error;

      toast({
        title: "Invitation Accepted",
        description: `You're now connected with ${invitation.profiles?.display_name || "your guardian"}`,
      });

      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      toast({
        title: "Error",
        description: "Failed to accept invitation",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("guardian_relationships")
        .update({ status: "rejected" })
        .eq("id", invitation.id);

      if (error) throw error;

      toast({
        title: "Invitation Rejected",
        description: "You have declined this invitation",
      });

      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error rejecting invitation:", error);
      toast({
        title: "Error",
        description: "Failed to reject invitation",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10 w-fit">
            <UserPlus className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Connection Request</CardTitle>
          <CardDescription>
            {invitation.profiles?.display_name || "Someone"} wants to connect with you as your{" "}
            {invitation.relationship_type}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="text-sm text-muted-foreground">Relationship Type:</div>
            <div className="font-semibold capitalize">{invitation.relationship_type}</div>
          </div>

          <div className="text-sm text-muted-foreground">
            By accepting, {invitation.profiles?.display_name || "they"} will be able to:
          </div>
          <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
            <li>View your quiz history and scores</li>
            <li>See your achievements and progress</li>
            <li>Track your reading activity</li>
            <li>Generate progress reports</li>
          </ul>

          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1"
              variant="accent"
              onClick={handleAccept}
              disabled={processing}
            >
              <Check className="mr-2 h-4 w-4" />
              Accept
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              onClick={handleReject}
              disabled={processing}
            >
              <X className="mr-2 h-4 w-4" />
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvitation;
