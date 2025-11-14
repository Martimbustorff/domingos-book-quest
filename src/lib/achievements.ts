import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface UserStats {
  total_points: number;
  quizzes_completed: number;
  books_read: number;
  current_streak: number;
  longest_streak: number;
  last_quiz_date: string | null;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria_type: string;
  criteria_value: number;
  points_reward: number;
}

export const checkAndAwardAchievements = async (
  userId: string,
  stats: UserStats,
  isPerfectScore: boolean = false
) => {
  try {
    // Fetch all achievements
    const { data: achievements, error: achievementsError } = await supabase
      .from("achievements")
      .select("*");

    if (achievementsError) throw achievementsError;

    // Fetch user's already earned achievements
    const { data: userAchievements, error: userAchievementsError } = await supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", userId);

    if (userAchievementsError) throw userAchievementsError;

    const earnedIds = new Set(userAchievements?.map(ua => ua.achievement_id) || []);

    // Check each achievement
    const newAchievements: Achievement[] = [];

    for (const achievement of achievements || []) {
      // Skip if already earned
      if (earnedIds.has(achievement.id)) continue;

      let earned = false;

      switch (achievement.criteria_type) {
        case "quizzes_completed":
          earned = stats.quizzes_completed >= achievement.criteria_value;
          break;
        case "books_read":
          earned = stats.books_read >= achievement.criteria_value;
          break;
        case "total_points":
          earned = stats.total_points >= achievement.criteria_value;
          break;
        case "current_streak":
          earned = stats.current_streak >= achievement.criteria_value;
          break;
        case "perfect_score":
          earned = isPerfectScore;
          break;
      }

      if (earned) {
        newAchievements.push(achievement);
      }
    }

    // Award new achievements
    if (newAchievements.length > 0) {
      const { error: insertError } = await supabase
        .from("user_achievements")
        .insert(
          newAchievements.map(a => ({
            user_id: userId,
            achievement_id: a.id
          }))
        );

      if (insertError) throw insertError;

      // Update total points with achievement rewards
      const bonusPoints = newAchievements.reduce((sum, a) => sum + a.points_reward, 0);
      
      if (bonusPoints > 0) {
        const { error: updateError } = await supabase
          .from("user_stats")
          .update({
            total_points: stats.total_points + bonusPoints
          })
          .eq("user_id", userId);

        if (updateError) throw updateError;
      }

      // Show toast notifications for each new achievement
      for (const achievement of newAchievements) {
        toast({
          title: `🎉 Achievement Unlocked!`,
          description: `${achievement.icon} ${achievement.name} - ${achievement.description} (+${achievement.points_reward} points)`,
        });
      }

      return newAchievements;
    }

    return [];
  } catch (error: any) {
    console.error("Error checking achievements:", error);
    return [];
  }
};

export const updateUserStats = async (
  userId: string,
  bookId: string,
  score: number,
  totalQuestions: number,
  difficulty: string,
  pointsEarned: number
) => {
  try {
    // Get or create user stats
    let { data: stats, error: statsError } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (statsError) throw statsError;

    if (!stats) {
      const { data: newStats, error: createError } = await supabase
        .from("user_stats")
        .insert({ user_id: userId })
        .select()
        .single();

      if (createError) throw createError;
      stats = newStats;
    }

    // Calculate streak
    const today = new Date().toISOString().split('T')[0];
    const lastQuizDate = stats.last_quiz_date;
    let newStreak = stats.current_streak;

    if (lastQuizDate) {
      const lastDate = new Date(lastQuizDate);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Same day, keep streak
        newStreak = stats.current_streak;
      } else if (diffDays === 1) {
        // Consecutive day, increment streak
        newStreak = stats.current_streak + 1;
      } else {
        // Streak broken, reset to 1
        newStreak = 1;
      }
    } else {
      // First quiz ever
      newStreak = 1;
    }

    // Check if this is a new book
    const { data: previousQuizzes } = await supabase
      .from("quiz_history")
      .select("book_id")
      .eq("user_id", userId)
      .eq("book_id", bookId)
      .limit(1);

    const isNewBook = !previousQuizzes || previousQuizzes.length === 0;

    // Update stats
    const { data: updatedStats, error: updateError } = await supabase
      .from("user_stats")
      .update({
        total_points: stats.total_points + pointsEarned,
        quizzes_completed: stats.quizzes_completed + 1,
        books_read: isNewBook ? stats.books_read + 1 : stats.books_read,
        current_streak: newStreak,
        longest_streak: Math.max(stats.longest_streak, newStreak),
        last_quiz_date: today
      })
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Insert quiz history
    const { error: historyError } = await supabase
      .from("quiz_history")
      .insert({
        user_id: userId,
        book_id: bookId,
        score,
        total_questions: totalQuestions,
        difficulty,
        points_earned: pointsEarned
      });

    if (historyError) throw historyError;

    // Check for new achievements
    const isPerfectScore = score === totalQuestions;
    await checkAndAwardAchievements(userId, updatedStats, isPerfectScore);

    return updatedStats;
  } catch (error: any) {
    console.error("Error updating user stats:", error);
    throw error;
  }
};
