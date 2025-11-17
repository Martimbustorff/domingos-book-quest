import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useAdminStats = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalQuizzes: 0,
    totalBooks: 0,
    activeToday: 0,
    avgQuizScore: 0,
    booksWithQuizzes: 0,
    bookUtilizationPercentage: 0,
    activeUsersRate: 0,
    avgQuizzesPerUser: 0,
    loading: true,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [
          users,
          quizzes,
          books,
          activeToday,
          avgScore,
          bookUtil,
        ] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('quiz_history').select('id', { count: 'exact', head: true }),
          supabase.from('books').select('id', { count: 'exact', head: true }),
          supabase.rpc('count_active_users_today'),
          supabase.rpc('get_average_quiz_score'),
          supabase.rpc('get_book_utilization').single(),
        ]);

        const totalUsers = users.count || 0;
        const totalQuizzes = quizzes.count || 0;
        const totalBooks = books.count || 0;
        const activeTodayCount = typeof activeToday.data === 'number' ? activeToday.data : 0;
        const avgQuizScore = typeof avgScore.data === 'number' ? avgScore.data : 0;
        const booksWithQuizzes = bookUtil.data?.books_with_quizzes || 0;
        const bookUtilizationPercentage = bookUtil.data?.percentage || 0;
        const activeUsersRate = totalUsers > 0 ? Math.round((activeTodayCount / totalUsers) * 100) : 0;
        const avgQuizzesPerUser = totalUsers > 0 ? Math.round(totalQuizzes / totalUsers) : 0;

        setStats({
          totalUsers,
          totalQuizzes,
          totalBooks,
          activeToday: activeTodayCount,
          avgQuizScore,
          booksWithQuizzes,
          bookUtilizationPercentage,
          activeUsersRate,
          avgQuizzesPerUser,
          loading: false,
        });
      } catch (error) {
        console.error('Error fetching admin stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchStats();
  }, []);

  return stats;
};
