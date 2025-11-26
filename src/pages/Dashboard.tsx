import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Trophy, Star, Book, Flame, TrendingUp, Award, ArrowLeft } from "lucide-react";
import { LoadingState } from "@/components/shared";
import { UserStats } from "@/types";
import { useQuery } from "@tanstack/react-query";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  earned_at?: string;
}

interface QuizHistoryItem {
  id: string;
  score: number;
  total_questions: number;
  difficulty: string;
  points_earned: number;
  completed_at: string;
  books: {
    title: string;
    cover_url: string | null;
  };
}

const Dashboard = () => {
  const navigate = useNavigate();

  // Fetch user stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["user-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return null;
      }

      const { data: statsData, error } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (!statsData) {
        const { data: newStats, error: createError } = await supabase
          .from("user_stats")
          .insert({ user_id: user.id })
          .select()
          .single();

        if (createError) throw createError;
        return newStats;
      }

      return statsData;
    },
  });

  // Fetch achievements
  const { data: achievements = [] } = useQuery({
    queryKey: ["achievements"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: allAchievements, error: achievementsError } = await supabase
        .from("achievements")
        .select("*")
        .order("criteria_value", { ascending: true });

      if (achievementsError) throw achievementsError;

      const { data: userAchievements, error: userAchievementsError } = await supabase
        .from("user_achievements")
        .select("achievement_id, earned_at")
        .eq("user_id", user.id);

      if (userAchievementsError) throw userAchievementsError;

      const earnedMap = new Map(
        userAchievements?.map(ua => [ua.achievement_id, ua.earned_at]) || []
      );

      return allAchievements?.map(a => ({
        ...a,
        earned_at: earnedMap.get(a.id)
      })) || [];
    },
  });

  // Fetch quiz history
  const { data: quizHistory = [] } = useQuery({
    queryKey: ["quiz-history"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("quiz_history")
        .select(`
          id,
          score,
          total_questions,
          difficulty,
          points_earned,
          completed_at,
          books (
            title,
            cover_url
          )
        `)
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
  });

  if (statsLoading) {
    return <LoadingState fullScreen message="Loading your dashboard..." />;
  }

  const earnedAchievements = achievements.filter(a => a.earned_at);
  const lockedAchievements = achievements.filter(a => !a.earned_at);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Your Dashboard</h1>
            <p className="text-muted-foreground mt-2">Track your reading journey and achievements</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/")} className="rounded-[24px]">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Home
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Points</CardTitle>
              <Trophy className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats?.total_points || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Lifetime earnings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quizzes Completed</CardTitle>
              <Star className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.quizzes_completed || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Total quizzes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Books Read</CardTitle>
              <Book className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.books_read || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Different books</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
              <Flame className="h-4 w-4 text-accent-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.current_streak || 0} 🔥</div>
              <p className="text-xs text-muted-foreground mt-1">
                Best: {stats?.longest_streak || 0} days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Achievements Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Achievements
                </CardTitle>
                <CardDescription>
                  {earnedAchievements.length} of {achievements.length} unlocked
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                <TrendingUp className="h-4 w-4 mr-2" />
                {earnedAchievements.length}/{achievements.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Earned Achievements */}
              {earnedAchievements.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-primary">Unlocked</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {earnedAchievements.map((achievement) => (
                      <div
                        key={achievement.id}
                        className="flex flex-col items-center p-4 rounded-[16px] bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20"
                      >
                        <div className="text-4xl mb-2">{achievement.icon}</div>
                        <p className="text-xs font-semibold text-center">{achievement.name}</p>
                        <p className="text-xs text-muted-foreground text-center mt-1">
                          {achievement.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Locked Achievements */}
              {lockedAchievements.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Locked</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {lockedAchievements.map((achievement) => (
                      <div
                        key={achievement.id}
                        className="flex flex-col items-center p-4 rounded-[16px] bg-muted/50 border border-border opacity-60"
                      >
                        <div className="text-4xl mb-2 grayscale">{achievement.icon}</div>
                        <p className="text-xs font-semibold text-center">{achievement.name}</p>
                        <p className="text-xs text-muted-foreground text-center mt-1">
                          {achievement.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Quiz History */}
        {quizHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Quizzes</CardTitle>
              <CardDescription>Your latest quiz results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {quizHistory.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="flex items-center justify-between p-4 rounded-[16px] glass-card"
                  >
                    <div className="flex items-center gap-3">
                      {quiz.books.cover_url ? (
                        <img
                          src={quiz.books.cover_url}
                          alt={quiz.books.title}
                          className="w-12 h-16 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-12 h-16 bg-secondary rounded-lg flex items-center justify-center">
                          <Book className="h-6 w-6" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold">{quiz.books.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {quiz.difficulty}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(quiz.completed_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-foreground">
                        {quiz.score}/{quiz.total_questions}
                      </p>
                      <p className="text-xs text-muted-foreground">+{quiz.points_earned} pts</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Call to Action */}
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6">
            <div>
              <h3 className="text-xl font-bold">Ready for your next quiz?</h3>
              <p className="text-muted-foreground">Keep your streak going and earn more points!</p>
            </div>
            <Button
              size="lg"
              onClick={() => navigate("/search")}
              className="rounded-[24px] quiz-button"
            >
              <Book className="mr-2 h-5 w-5" />
              Find a Book
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
