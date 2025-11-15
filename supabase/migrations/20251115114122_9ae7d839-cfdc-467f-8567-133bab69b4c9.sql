-- Create parent_dashboard_summary view for efficient parent dashboard queries
CREATE OR REPLACE VIEW public.parent_dashboard_summary AS
SELECT 
  gr.guardian_id,
  gr.student_id,
  p.display_name,
  COALESCE(us.total_points, 0) as total_points,
  COALESCE(us.quizzes_completed, 0) as quizzes_completed,
  COALESCE(us.books_read, 0) as books_read,
  COALESCE(us.current_streak, 0) as current_streak,
  COALESCE(us.longest_streak, 0) as longest_streak,
  us.last_quiz_date
FROM public.guardian_relationships gr
INNER JOIN public.profiles p ON gr.student_id = p.user_id
LEFT JOIN public.user_stats us ON gr.student_id = us.user_id
WHERE gr.status = 'approved';

-- Grant select permission to authenticated users
GRANT SELECT ON public.parent_dashboard_summary TO authenticated;

-- Add RLS policy
ALTER VIEW public.parent_dashboard_summary SET (security_invoker = true);

COMMENT ON VIEW public.parent_dashboard_summary IS 'Aggregated view of guardian relationships with student stats for parent dashboard';