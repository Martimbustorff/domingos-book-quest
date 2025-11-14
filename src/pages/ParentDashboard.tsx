import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus, ArrowLeft } from "lucide-react";
import ChildCard from "@/components/ChildCard";
import InvitationManager from "@/components/InvitationManager";
import { toast } from "@/hooks/use-toast";

interface ChildData {
  id: string;
  display_name: string;
  user_id: string;
  total_points: number;
  quizzes_completed: number;
  current_streak: number;
  last_quiz_date: string | null;
  relationship_type: string;
}

const ParentDashboard = () => {
  const navigate = useNavigate();
  const [children, setChildren] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [showInvitations, setShowInvitations] = useState(false);

  useEffect(() => {
    checkAccess();
    fetchChildren();
  }, []);

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const hasParentOrTeacher = roles?.some(r => r.role === "parent" || r.role === "teacher");
    if (!hasParentOrTeacher) {
      toast({
        title: "Access Denied",
        description: "You need to be a parent or teacher to access this page.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setUserRole(roles?.find(r => r.role === "parent" || r.role === "teacher")?.role || "");
  };

  const fetchChildren = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: relationships, error } = await supabase
        .from("guardian_relationships")
        .select(`
          id,
          student_id,
          relationship_type,
          status,
          profiles!guardian_relationships_student_id_fkey(display_name, user_id),
          user_stats!guardian_relationships_student_id_fkey(total_points, quizzes_completed, current_streak, last_quiz_date)
        `)
        .eq("guardian_id", user.id)
        .eq("status", "approved");

      if (error) throw error;

      const childrenData: ChildData[] = relationships?.map((rel: any) => ({
        id: rel.id,
        user_id: rel.student_id,
        display_name: rel.profiles?.display_name || "Student",
        total_points: rel.user_stats?.total_points || 0,
        quizzes_completed: rel.user_stats?.quizzes_completed || 0,
        current_streak: rel.user_stats?.current_streak || 0,
        last_quiz_date: rel.user_stats?.last_quiz_date || null,
        relationship_type: rel.relationship_type,
      })) || [];

      setChildren(childrenData);
    } catch (error: any) {
      console.error("Error fetching children:", error);
      toast({
        title: "Error",
        description: "Failed to load student data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalPoints = children.reduce((sum, child) => sum + child.total_points, 0);
  const totalQuizzes = children.reduce((sum, child) => sum + child.quizzes_completed, 0);
  const avgStreak = children.length > 0 
    ? Math.round(children.reduce((sum, child) => sum + child.current_streak, 0) / children.length)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {userRole === "parent" ? "Parent" : "Teacher"} Dashboard
          </h1>
          <Button
            variant="gradient"
            onClick={() => setShowInvitations(!showInvitations)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add {userRole === "parent" ? "Child" : "Student"}
          </Button>
        </div>

        {/* Invitation Manager */}
        {showInvitations && (
          <InvitationManager
            relationshipType={userRole}
            onClose={() => setShowInvitations(false)}
            onInvitationCreated={fetchChildren}
          />
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total {userRole === "parent" ? "Children" : "Students"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-8 w-8 text-primary" />
                <span className="text-4xl font-bold">{children.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Combined Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-secondary">
                {totalPoints.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Quizzes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-accent">
                {totalQuizzes}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Children List */}
        <Card>
          <CardHeader>
            <CardTitle>
              {userRole === "parent" ? "My Children" : "My Students"}
            </CardTitle>
            <CardDescription>
              {children.length === 0
                ? `No ${userRole === "parent" ? "children" : "students"} connected yet. Click "Add ${userRole === "parent" ? "Child" : "Student"}" to get started.`
                : `Track progress for all your ${userRole === "parent" ? "children" : "students"}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading...
              </div>
            ) : children.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground mb-4">
                  No {userRole === "parent" ? "children" : "students"} connected yet
                </p>
                <Button
                  variant="gradient"
                  onClick={() => setShowInvitations(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Your First {userRole === "parent" ? "Child" : "Student"}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {children.map((child) => (
                  <ChildCard
                    key={child.id}
                    childId={child.user_id}
                    displayName={child.display_name}
                    totalPoints={child.total_points}
                    quizzesCompleted={child.quizzes_completed}
                    currentStreak={child.current_streak}
                    lastQuizDate={child.last_quiz_date}
                    onClick={() => navigate(`/child/${child.user_id}`)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ParentDashboard;
