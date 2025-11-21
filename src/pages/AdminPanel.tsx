import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminStats } from "@/hooks/useAdminStats";
import { useQuizActivity } from "@/hooks/useQuizActivity";
import { toast } from "sonner";
import {
  ArrowLeft,
  Users,
  BookOpen,
  TrendingUp,
  Shield,
  UserPlus,
  UserMinus,
  Download,
  BarChart3,
  PieChart as PieChartIcon,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Target,
  Library,
  Activity,
  Zap,
  Trophy,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { VisitorAnalyticsTab } from "@/components/admin/VisitorAnalyticsTab";

const AdminPanel = () => {
  const navigate = useNavigate();
  const stats = useAdminStats();
  const { data: quizActivity } = useQuizActivity(30);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [roleDistribution, setRoleDistribution] = useState<any[]>([]);
  const [popularBooks, setPopularBooks] = useState<any[]>([]);
  const [quizTemplates, setQuizTemplates] = useState<any[]>([]);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [weeklyActiveUsers, setWeeklyActiveUsers] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [allBooksForAdmin, setAllBooksForAdmin] = useState<any[]>([]);
  const [bookSearch, setBookSearch] = useState("");
  const [dailyVisitorActivity, setDailyVisitorActivity] = useState<any[]>([]);
  const [visitorPopularBooks, setVisitorPopularBooks] = useState<any[]>([]);

  useEffect(() => {
    checkAdminAccess();
    fetchAdmins();
    fetchAllUsers();
    fetchRoleDistribution();
    fetchPopularBooks();
    fetchQuizTemplates();
    fetchWeeklyActiveUsers();
    fetchLeaderboard();
    fetchAllBooks();
    fetchDailyVisitorActivity();
    fetchVisitorPopularBooks();
  }, []);

  const fetchWeeklyActiveUsers = async () => {
    const { data, error } = await supabase.rpc('get_weekly_active_users');
    if (!error && data) {
      setWeeklyActiveUsers(data.map((d: any) => ({
        date: new Date(d.activity_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        users: Number(d.active_users),
      })));
    }
  };

  const fetchLeaderboard = async () => {
    const { data, error } = await supabase.rpc('get_user_leaderboard', { limit_count: 10 });
    if (!error && data) {
      setLeaderboard(data);
    }
  };

  const fetchAllBooks = async () => {
    const { data: booksData, error: booksError } = await supabase
      .from('books')
      .select('*')
      .order('title');
    
    if (booksError) {
      toast.error("Failed to fetch books");
      return;
    }

    const { data: quizCounts, error: quizError } = await supabase
      .from('quiz_templates')
      .select('book_id');
    
    if (!quizError && booksData && quizCounts) {
      const countMap = quizCounts.reduce((acc: any, quiz: any) => {
        acc[quiz.book_id] = (acc[quiz.book_id] || 0) + 1;
        return acc;
      }, {});

      const booksWithCounts = booksData.map(book => ({
        ...book,
        quiz_count: countMap[book.id] || 0
      }));

      setAllBooksForAdmin(booksWithCounts);
    }
  };

  const filteredBooksForAdmin = useMemo(() => {
    if (!bookSearch) return allBooksForAdmin;
    
    const query = bookSearch.toLowerCase();
    return allBooksForAdmin.filter(book => 
      book.title?.toLowerCase().includes(query) ||
      book.author?.toLowerCase().includes(query)
    );
  }, [allBooksForAdmin, bookSearch]);

  const deleteBook = async (bookId: string) => {
    if (!confirm("Are you sure you want to delete this book? This will also delete all associated quiz templates, events, and related data.")) return;
    
    try {
      const { error } = await supabase.rpc('delete_book_and_related', { 
        book_id_param: bookId 
      });
      
      if (error) throw error;
      
      toast.success("Book and all related data deleted successfully");
      fetchAllBooks();
      fetchPopularBooks();
    } catch (error: any) {
      toast.error("Failed to delete book: " + error.message);
    }
  };

  const bulkDeleteNonChildrenBooks = async () => {
    const nonChildrenBooks = allBooksForAdmin.filter(b => 
      b.age_max === null || b.age_max > 12
    );
    
    if (nonChildrenBooks.length === 0) {
      toast.info("No non-children books found to delete");
      return;
    }
    
    if (!confirm(`This will delete ${nonChildrenBooks.length} non-children books and all their related data. Are you sure?`)) {
      return;
    }
    
    let deleted = 0;
    let failed = 0;
    
    for (const book of nonChildrenBooks) {
      try {
        const { error } = await supabase.rpc('delete_book_and_related', { 
          book_id_param: book.id 
        });
        
        if (error) throw error;
        deleted++;
      } catch (error) {
        console.error(`Failed to delete book ${book.title}:`, error);
        failed++;
      }
    }
    
    toast.success(`Deleted ${deleted} books. ${failed > 0 ? `Failed: ${failed}` : ''}`);
    fetchAllBooks();
    fetchPopularBooks();
  };

  const fetchDailyVisitorActivity = async () => {
    const { data, error } = await supabase.rpc('get_daily_visitor_activity', { days_back: 30 });
    if (!error && data) {
      setDailyVisitorActivity(data.map((d: any) => ({
        date: new Date(d.activity_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        visitor_events: Number(d.visitor_events),
        authenticated_events: Number(d.authenticated_events),
      })).reverse());
    }
  };

  const fetchVisitorPopularBooks = async () => {
    const { data, error } = await supabase.rpc('get_visitor_popular_books', { limit_count: 10 });
    if (!error && data) {
      setVisitorPopularBooks(data);
    }
  };

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }

    setCurrentUser(user);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const hasAdmin = roles?.some((r) => r.role === "admin");
    if (!hasAdmin) {
      toast.error("Access denied: Admin privileges required");
      navigate("/");
      return;
    }

    setIsAdmin(true);
  };

  const fetchAdmins = async () => {
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminRoles) {
      const userIds = adminRoles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", userIds);

      setAdmins(profiles || []);
    }
  };

  const fetchAllUsers = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*, user_roles(role)")
      .order("created_at", { ascending: false });

    setAllUsers(profiles || []);
  };

  const fetchRoleDistribution = async () => {
    const { data: roles } = await supabase.from("user_roles").select("role");

    const distribution = roles?.reduce((acc: any, { role }) => {
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    setRoleDistribution(
      Object.entries(distribution || {}).map(([name, value]) => ({
        name,
        value,
      }))
    );
  };

  const fetchPopularBooks = async () => {
    const { data: quizzes } = await supabase
      .from("quiz_history")
      .select("book_id, books(title)");

    const bookCounts = quizzes?.reduce((acc: any, quiz) => {
      const title = quiz.books?.title || "Unknown";
      acc[title] = (acc[title] || 0) + 1;
      return acc;
    }, {});

    const topBooks = Object.entries(bookCounts || {})
      .map(([title, count]) => ({ title, count }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10);

    setPopularBooks(topBooks);
  };

  const fetchQuizTemplates = async () => {
    const { data } = await supabase
      .from("quiz_templates")
      .select(`
        *,
        books (
          title,
          author
        )
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    setQuizTemplates(data || []);
  };

  const regenerateQuiz = async (bookId: string, difficulty: string) => {
    setRegenerating(bookId);
    try {
      // Delete existing quiz template
      await supabase
        .from("quiz_templates")
        .delete()
        .eq("book_id", bookId)
        .eq("difficulty", difficulty);

      toast.success("Quiz template deleted. Next quiz generation will create a new one.");
      
      // Refresh the list
      await fetchQuizTemplates();
    } catch (error: any) {
      toast.error("Failed to regenerate quiz: " + error.message);
    } finally {
      setRegenerating(null);
    }
  };

  const bulkRegenerateBySource = async (contentSource: string) => {
    try {
      const { error } = await supabase
        .from("quiz_templates")
        .delete()
        .eq("content_source", contentSource);

      if (error) throw error;

      toast.success(`Deleted all quiz templates using ${contentSource}. They will regenerate on next use.`);
      await fetchQuizTemplates();
    } catch (error: any) {
      toast.error("Failed to bulk regenerate: " + error.message);
    }
  };

  const handleGrantAdmin = async () => {
    if (!searchEmail) {
      toast.error("Please enter an email address");
      return;
    }

    const user = allUsers.find((u) => u.user_id === searchEmail || searchEmail.includes(u.user_id));
    if (!user) {
      toast.error("User not found");
      return;
    }

    setSelectedUser(user);
    setShowGrantDialog(true);
  };

  const confirmGrantAdmin = async () => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: selectedUser.user_id, role: "admin" });

      if (error) throw error;

      toast.success("Admin role granted successfully");
      fetchAdmins();
      fetchAllUsers();
      setSearchEmail("");
      setShowGrantDialog(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleRevokeAdmin = (admin: any) => {
    if (admin.user_id === currentUser?.id) {
      toast.error("You cannot revoke your own admin role");
      return;
    }

    setSelectedUser(admin);
    setShowRevokeDialog(true);
  };

  const confirmRevokeAdmin = async () => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", selectedUser.user_id)
        .eq("role", "admin");

      if (error) throw error;

      toast.success("Admin role revoked successfully");
      fetchAdmins();
      fetchAllUsers();
      setShowRevokeDialog(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const exportToCSV = async (reportType: string) => {
    let csvContent = "";
    let filename = "";

    try {
      if (reportType === "users") {
        const { data } = await supabase
          .from("profiles")
          .select("*, user_stats(*)");

        csvContent = "Email,Display Name,Quizzes Completed,Total Points,Current Streak\n";
        data?.forEach((user: any) => {
          csvContent += `${user.user_id},${user.display_name || "N/A"},${user.user_stats?.[0]?.quizzes_completed || 0},${user.user_stats?.[0]?.total_points || 0},${user.user_stats?.[0]?.current_streak || 0}\n`;
        });
        filename = "user_engagement_report.csv";
      } else if (reportType === "books") {
        csvContent = "Book Title,Times Taken,Average Score\n";
        popularBooks.forEach((book: any) => {
          csvContent += `${book.title},${book.count},N/A\n`;
        });
        filename = "book_performance_report.csv";
      }

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      toast.success("Report exported successfully");
    } catch (error) {
      toast.error("Failed to export report");
    }
  };

  if (!isAdmin) {
    return null;
  }

  const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted))"];

  const quizActivityConfig = {
    easy: { label: "Easy", color: "hsl(var(--chart-1))" },
    medium: { label: "Medium", color: "hsl(var(--chart-2))" },
    hard: { label: "Hard", color: "hsl(var(--chart-3))" },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Admin Control Panel
            </h1>
            <p className="text-muted-foreground">Platform administration and analytics</p>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Total Quizzes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{stats.totalQuizzes}</div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Total Books
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{stats.totalBooks}</div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Active Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{stats.activeToday}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.activeUsersRate}% of users</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Avg Quiz Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{stats.avgQuizScore}%</div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                <Library className="h-4 w-4 text-primary" />
                Book Utilization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{stats.booksWithQuizzes}/{stats.totalBooks}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.bookUtilizationPercentage}% with quizzes</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-orange-500" />
                Visitor Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{stats.visitorQuizStarts}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.visitorCompletionRate}% completion</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                User Engagement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{stats.avgQuizzesPerUser}</div>
              <p className="text-xs text-muted-foreground mt-1">Avg quizzes per user</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                Top User Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{leaderboard[0]?.total_points || 0}</div>
              <p className="text-xs text-muted-foreground mt-1 truncate">{leaderboard[0]?.display_name || 'N/A'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-6 gap-2">
            <TabsTrigger value="analytics" className="flex-col sm:flex-row gap-1">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="flex-col sm:flex-row gap-1">
              <BookOpen className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Quizzes</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex-col sm:flex-row gap-1">
              <Users className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Users</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex-col sm:flex-row gap-1">
              <Download className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="books" className="flex-col sm:flex-row gap-1">
              <Library className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Books</span>
            </TabsTrigger>
            <TabsTrigger value="visitors" className="flex-col sm:flex-row gap-1">
              <Activity className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Visitors</span>
            </TabsTrigger>
          </TabsList>

          {/* Quiz Management Tab */}
          <TabsContent value="quizzes" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Quiz Templates</CardTitle>
                <CardDescription>
                  Manage quiz templates and content sources. Regenerate quizzes to use updated content.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Bulk Actions */}
                <div className="flex flex-wrap gap-2 p-4 bg-muted/50 rounded-lg">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => bulkRegenerateBySource("google_books")}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate Google Books Quizzes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => bulkRegenerateBySource("open_library")}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate Open Library Quizzes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchQuizTemplates}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh List
                  </Button>
                </div>

                {/* Quiz Templates Table */}
                <div className="max-h-[600px] overflow-y-auto overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="min-w-[200px]">Book</TableHead>
                        <TableHead>Difficulty</TableHead>
                        <TableHead className="hidden sm:table-cell">Questions</TableHead>
                        <TableHead className="hidden md:table-cell">Content Source</TableHead>
                        <TableHead className="hidden lg:table-cell">Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quizTemplates.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No quiz templates found. Quizzes will be generated on demand.
                          </TableCell>
                        </TableRow>
                      ) : (
                        quizTemplates.map((template: any) => (
                          <TableRow key={template.id}>
                            <TableCell>
                              <div className="max-w-[200px]">
                                <div className="font-medium truncate">{template.books?.title}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {template.books?.author}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="capitalize text-xs sm:text-sm">{template.difficulty}</span>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">{template.num_questions}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="flex items-center gap-2">
                                {template.content_source === "user_curated" ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-yellow-500" />
                                )}
                                <span className="text-sm truncate max-w-[100px]">
                                  {template.content_source || template.source || "unknown"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                              {new Date(template.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={regenerating === template.book_id}
                                onClick={() => regenerateQuiz(template.book_id, template.difficulty)}
                              >
                                <RefreshCw
                                  className={`h-4 w-4 ${
                                    regenerating === template.book_id ? "animate-spin" : ""
                                  }`}
                                />
                                <span className="hidden sm:inline ml-2">Regenerate</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Legend */}
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    User-curated content (high quality)
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-yellow-500" />
                    External API content (may need regeneration)
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quiz Activity Chart */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Quiz Activity (Last 30 Days)</CardTitle>
                  <CardDescription>Quizzes completed by difficulty</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={quizActivityConfig} className="h-[200px] sm:h-[300px]">
                    <BarChart data={quizActivity}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="easy" fill="var(--color-easy)" />
                      <Bar dataKey="medium" fill="var(--color-medium)" />
                      <Bar dataKey="hard" fill="var(--color-hard)" />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Role Distribution */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>User Role Distribution</CardTitle>
                  <CardDescription>Breakdown of user roles</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-[200px] sm:h-[300px]">
                    <PieChart>
                      <Pie
                        data={roleDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label
                      >
                        {roleDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Weekly Active Users */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Weekly Active Users</CardTitle>
                  <CardDescription>Unique users active each day (last 7 days)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-[200px] sm:h-[300px]">
                    <LineChart data={weeklyActiveUsers}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* User Leaderboard */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>User Leaderboard</CardTitle>
                  <CardDescription>Top users by total points</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">Rank</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead className="text-right">Points</TableHead>
                          <TableHead className="text-right hidden sm:table-cell">Quizzes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaderboard.map((user, index) => (
                          <TableRow key={user.user_id}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{user.display_name || 'Anonymous'}</TableCell>
                            <TableCell className="text-right font-bold">{user.total_points}</TableCell>
                            <TableCell className="text-right hidden sm:table-cell">{user.quizzes_completed}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Popular Books */}
              <Card className="glass-card lg:col-span-2">
                <CardHeader>
                  <CardTitle>Most Popular Books</CardTitle>
                  <CardDescription>Top 10 books by quiz count</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-[200px] sm:h-[300px]">
                    <BarChart data={popularBooks} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                      <YAxis dataKey="title" type="category" width={150} stroke="hsl(var(--muted-foreground))" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-6">
            {/* Grant Admin */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Grant Admin Access
                </CardTitle>
                <CardDescription>Promote a user to administrator</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
                  <Input
                    placeholder="Enter user ID or email"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleGrantAdmin} className="w-full sm:w-auto">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Grant Admin
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Current Admins */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Current Administrators</CardTitle>
                <CardDescription>Manage admin privileges</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">User ID</TableHead>
                        <TableHead>Display Name</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {admins.map((admin) => (
                        <TableRow key={admin.id}>
                          <TableCell className="font-mono text-xs max-w-[200px] truncate">{admin.user_id}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{admin.display_name || "N/A"}</TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={admin.user_id === currentUser?.id}
                              onClick={() => handleRevokeAdmin(admin)}
                            >
                              <UserMinus className="mr-2 h-4 w-4" />
                              Revoke
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* All Users */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>Complete user directory</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Display Name</TableHead>
                        <TableHead className="min-w-[200px]">User ID</TableHead>
                        <TableHead>Roles</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="max-w-[150px] truncate">{user.display_name || "N/A"}</TableCell>
                          <TableCell className="font-mono text-xs max-w-[200px] truncate">{user.user_id}</TableCell>
                          <TableCell>
                            {user.user_roles?.map((r: any) => r.role).join(", ") || "No roles"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>User Engagement Report</CardTitle>
                  <CardDescription>Export user activity and statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => exportToCSV("users")} className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Export User Report (CSV)
                  </Button>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Book Performance Report</CardTitle>
                  <CardDescription>Export book quiz statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => exportToCSV("books")} className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Export Book Report (CSV)
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Books Management Tab */}
          <TabsContent value="books" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Book Management</CardTitle>
                <CardDescription>
                  Manage books in the library. Search, view, and remove books.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search Books */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder="Search books by title or author..."
                    value={bookSearch}
                    onChange={(e) => setBookSearch(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={fetchAllBooks} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={bulkDeleteNonChildrenBooks}
                    className="w-full sm:w-auto"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Bulk Delete Non-Children Books
                  </Button>
                </div>

                {/* Book Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4">
                  <Card className="glass-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Books</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{allBooksForAdmin.length}</div>
                    </CardContent>
                  </Card>
                  <Card className="glass-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">With Covers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {allBooksForAdmin.filter(b => b.cover_url).length}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {allBooksForAdmin.length > 0 
                          ? Math.round((allBooksForAdmin.filter(b => b.cover_url).length / allBooksForAdmin.length) * 100)
                          : 0}% coverage
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="glass-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">With Quizzes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {allBooksForAdmin.filter(b => b.quiz_count > 0).length}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {allBooksForAdmin.length > 0
                          ? Math.round((allBooksForAdmin.filter(b => b.quiz_count > 0).length / allBooksForAdmin.length) * 100)
                          : 0}% have quizzes
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Books Table */}
                <div className="max-h-[600px] overflow-y-auto overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Cover</TableHead>
                        <TableHead className="min-w-[200px]">Title</TableHead>
                        <TableHead className="min-w-[150px]">Author</TableHead>
                        <TableHead className="w-[120px]">Age Range</TableHead>
                        <TableHead className="w-[100px] text-center">Quizzes</TableHead>
                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBooksForAdmin.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            {bookSearch ? 'No books match your search' : 'No books found'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredBooksForAdmin.map((book) => (
                          <TableRow key={book.id}>
                            <TableCell>
                              {book.cover_url ? (
                                <img 
                                  src={book.cover_url} 
                                  alt={book.title} 
                                  className="w-12 h-16 object-cover rounded shadow-sm"
                                />
                              ) : (
                                <div className="w-12 h-16 bg-muted rounded flex items-center justify-center">
                                  <BookOpen className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{book.title}</TableCell>
                            <TableCell className="text-muted-foreground">{book.author || 'Unknown'}</TableCell>
                            <TableCell>
                              {book.age_min && book.age_max 
                                ? `${book.age_min}-${book.age_max}` 
                                : book.age_max 
                                ? `0-${book.age_max}`
                                : 'Not set'}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={book.quiz_count > 0 ? "font-semibold text-primary" : "text-muted-foreground"}>
                                {book.quiz_count || 0}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => deleteBook(book.id)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Visitor Analytics Tab */}
          <TabsContent value="visitors" className="space-y-6">
            <VisitorAnalyticsTab 
              stats={stats}
              dailyVisitorActivity={dailyVisitorActivity}
              visitorPopularBooks={visitorPopularBooks}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <AlertDialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Grant Admin Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to grant admin privileges to{" "}
              <span className="font-semibold">{selectedUser?.display_name || selectedUser?.user_id}</span>?
              This will give them full access to the admin control panel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmGrantAdmin}>Grant Admin</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Admin Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke admin privileges from{" "}
              <span className="font-semibold">{selectedUser?.display_name || selectedUser?.user_id}</span>?
              They will no longer have access to the admin control panel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRevokeAdmin} className="bg-destructive text-destructive-foreground">
              Revoke Admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPanel;
