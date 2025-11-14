import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, BookOpen, Flame, Calendar, Award } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface ChildStats {
  display_name: string;
  total_points: number;
  quizzes_completed: number;
  books_read: number;
  current_streak: number;
  longest_streak: number;
  last_quiz_date: string | null;
}

interface QuizHistory {
  id: string;
  completed_at: string;
  score: number;
  total_questions: number;
  difficulty: string;
  points_earned: number;
  books: {
    title: string;
    author: string;
  };
}

interface Achievement {
  id: string;
  earned_at: string;
  achievements: {
    name: string;
    description: string;
    icon: string;
    category: string;
  };
}

const ChildProgress = () => {
  const { childId } = useParams();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ChildStats | null>(null);
  const [quizHistory, setQuizHistory] = useState<QuizHistory[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!childId) return;
    checkAccessAndFetch();
  }, [childId]);

  const checkAccessAndFetch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Check if user is guardian of this child
      const { data: relationship } = await supabase
        .from("guardian_relationships")
        .select("id")
        .eq("guardian_id", user.id)
        .eq("student_id", childId)
        .eq("status", "approved")
        .single();

      if (!relationship) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to view this student's progress.",
          variant: "destructive",
        });
        navigate("/parent-dashboard");
        return;
      }

      await fetchChildData();
    } catch (error: any) {
      console.error("Error checking access:", error);
      navigate("/parent-dashboard");
    }
  };

  const fetchChildData = async () => {
    try {
      // Fetch stats
      const { data: statsData } = await supabase
        .from("user_stats")
        .select(`
          total_points,
          quizzes_completed,
          books_read,
          current_streak,
          longest_streak,
          last_quiz_date,
          profiles!user_stats_user_id_fkey(display_name)
        `)
        .eq("user_id", childId)
        .single();

      if (statsData) {
        setStats({
          display_name: (statsData as any).profiles?.display_name || "Student",
          total_points: statsData.total_points,
          quizzes_completed: statsData.quizzes_completed,
          books_read: statsData.books_read,
          current_streak: statsData.current_streak,
          longest_streak: statsData.longest_streak,
          last_quiz_date: statsData.last_quiz_date,
        });
      }

      // Fetch quiz history
      const { data: historyData } = await supabase
        .from("quiz_history")
        .select(`
          id,
          completed_at,
          score,
          total_questions,
          difficulty,
          points_earned,
          books!quiz_history_book_id_fkey(title, author)
        `)
        .eq("user_id", childId)
        .order("completed_at", { ascending: false })
        .limit(10);

      setQuizHistory((historyData as any) || []);

      // Fetch achievements
      const { data: achievementData } = await supabase
        .from("user_achievements")
        .select(`
          id,
          earned_at,
          achievements!user_achievements_achievement_id_fkey(name, description, icon, category)
        `)
        .eq("user_id", childId)
        .order("earned_at", { ascending: false });

      setAchievements((achievementData as any) || []);
    } catch (error: any) {
      console.error("Error fetching child data:", error);
      toast({
        title: "Error",
        description: "Failed to load student progress",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-muted-foreground">Student not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/parent-dashboard")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">{stats.display_name}'s Progress</h1>
          <div className="w-20" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Total Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {stats.total_points.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Quizzes Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">
                {stats.quizzes_completed}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Flame className="h-4 w-4" />
                Current Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-secondary">
                {stats.current_streak} days
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Award className="h-4 w-4" />
                Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {achievements.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Quiz History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Quiz History</CardTitle>
            <CardDescription>Last 10 quizzes completed</CardDescription>
          </CardHeader>
          <CardContent>
            {quizHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No quizzes completed yet
              </div>
            ) : (
              <div className="space-y-3">
                {quizHistory.map((quiz) => {
                  const percentage = Math.round((quiz.score / quiz.total_questions) * 100);
                  return (
                    <div
                      key={quiz.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold">{quiz.books.title}</h4>
                        <p className="text-sm text-muted-foreground">by {quiz.books.author}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(quiz.completed_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <Badge variant={percentage >= 70 ? "default" : "secondary"}>
                          {quiz.score}/{quiz.total_questions} ({percentage}%)
                        </Badge>
                        <div className="text-sm text-primary font-semibold">
                          +{quiz.points_earned} pts
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle>Achievements Earned</CardTitle>
            <CardDescription>All unlocked achievements</CardDescription>
          </CardHeader>
          <CardContent>
            {achievements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No achievements earned yet
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="flex items-start gap-4 p-4 rounded-lg border bg-card"
                  >
                    <div className="text-4xl">{achievement.achievements.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{achievement.achievements.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {achievement.achievements.description}
                      </p>
                      <Badge variant="outline" className="mt-2">
                        {achievement.achievements.category}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Earned {formatDistanceToNow(new Date(achievement.earned_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChildProgress;
