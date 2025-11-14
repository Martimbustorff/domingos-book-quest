import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, X, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface InvitationManagerProps {
  relationshipType: string;
  onClose: () => void;
  onInvitationCreated: () => void;
}

interface Invitation {
  id: string;
  invitation_code: string;
  status: string;
  created_at: string;
  profiles: {
    display_name: string;
  } | null;
}

const InvitationManager = ({ relationshipType, onClose, onInvitationCreated }: InvitationManagerProps) => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("guardian_relationships")
        .select(`
          id,
          invitation_code,
          status,
          created_at,
          profiles!guardian_relationships_student_id_fkey(display_name)
        `)
        .eq("guardian_id", user.id)
        .order("created_at", { ascending: false });

      setInvitations((data as any) || []);
    } catch (error: any) {
      console.error("Error fetching invitations:", error);
    }
  };

  const generateInvitationCode = () => {
    return `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  };

  const createInvitation = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const code = generateInvitationCode();
      
      const { error } = await supabase
        .from("guardian_relationships")
        .insert({
          guardian_id: user.id,
          student_id: user.id, // Temporary - will be updated when student accepts
          relationship_type: relationshipType,
          status: "pending",
          invitation_code: code,
        });

      if (error) throw error;

      toast({
        title: "Invitation Created",
        description: "Share the invitation code with your student",
      });

      await fetchInvitations();
      onInvitationCreated();
    } catch (error: any) {
      console.error("Error creating invitation:", error);
      toast({
        title: "Error",
        description: "Failed to create invitation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (code: string) => {
    const inviteUrl = `${window.location.origin}/accept-invitation/${code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
    
    toast({
      title: "Copied!",
      description: "Invitation link copied to clipboard",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Invitation Manager</CardTitle>
            <CardDescription>
              Create and manage invitations for {relationshipType === "parent" ? "children" : "students"}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={createInvitation}
          disabled={loading}
          className="w-full"
          variant="gradient"
        >
          {loading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Generate New Invitation Code"
          )}
        </Button>

        {invitations.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Active Invitations</h4>
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex-1">
                  <div className="font-mono text-sm font-semibold">
                    {invitation.invitation_code}
                  </div>
                  {invitation.profiles?.display_name && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Connected to: {invitation.profiles.display_name}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      invitation.status === "approved"
                        ? "default"
                        : invitation.status === "pending"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {invitation.status}
                  </Badge>
                  {invitation.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(invitation.invitation_code)}
                    >
                      {copied === invitation.invitation_code ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InvitationManager;
