import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import { BookOpen } from "lucide-react";

interface VisitorAnalyticsTabProps {
  stats: {
    totalVisitorEvents: number;
    visitorQuizStarts: number;
    visitorQuizCompletions: number;
    visitorCompletionRate: number;
    authenticatedEvents: number;
    visitorToUserRatio: number;
  };
  dailyVisitorActivity: Array<{
    date: string;
    visitor_events: number;
    authenticated_events: number;
  }>;
  visitorPopularBooks: Array<{
    book_id: string;
    title: string;
    author: string;
    cover_url: string;
    visitor_quiz_starts: number;
    visitor_quiz_completions: number;
  }>;
}

export const VisitorAnalyticsTab = ({
  stats,
  dailyVisitorActivity,
  visitorPopularBooks
}: VisitorAnalyticsTabProps) => {
  const totalEvents = stats.totalVisitorEvents + stats.authenticatedEvents;
  const visitorPercentage = totalEvents > 0 
    ? Math.round((stats.totalVisitorEvents / totalEvents) * 100) 
    : 0;

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Visitor Analytics</CardTitle>
        <CardDescription>
          Track anonymous visitor behavior before registration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visitor Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Visitors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVisitorEvents}</div>
              <p className="text-xs text-muted-foreground">Events tracked</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quiz Starts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.visitorQuizStarts}</div>
              <p className="text-xs text-muted-foreground">Anonymous users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Completions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.visitorQuizCompletions}</div>
              <p className="text-xs text-muted-foreground">{stats.visitorCompletionRate}% rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Visitor:User Ratio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.visitorToUserRatio}:1</div>
              <p className="text-xs text-muted-foreground">Conversion potential</p>
            </CardContent>
          </Card>
        </div>

        {/* Daily Visitor Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Visitor vs Authenticated Activity</CardTitle>
            <CardDescription>30-day trend comparison</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyVisitorActivity.length > 0 ? (
              <ChartContainer
                config={{
                  visitor_events: {
                    label: "Visitors",
                    color: "hsl(var(--chart-1))",
                  },
                  authenticated_events: {
                    label: "Registered Users",
                    color: "hsl(var(--chart-2))",
                  },
                }}
                className="h-[300px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyVisitorActivity}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="visitor_events"
                      stroke="hsl(var(--chart-1))"
                      name="Visitors"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="authenticated_events"
                      stroke="hsl(var(--chart-2))"
                      name="Registered"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No activity data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Popular Books for Visitors */}
        <Card>
          <CardHeader>
            <CardTitle>Most Popular Books for Visitors</CardTitle>
            <CardDescription>Books that attract anonymous users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cover</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Starts</TableHead>
                    <TableHead>Completions</TableHead>
                    <TableHead>Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visitorPopularBooks.length > 0 ? (
                    visitorPopularBooks.map((book) => (
                      <TableRow key={book.book_id}>
                        <TableCell>
                          {book.cover_url ? (
                            <img
                              src={book.cover_url}
                              alt={book.title}
                              className="w-10 h-14 object-cover rounded shadow-sm"
                            />
                          ) : (
                            <div className="w-10 h-14 bg-muted rounded flex items-center justify-center">
                              <BookOpen className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{book.title}</TableCell>
                        <TableCell className="text-muted-foreground">{book.author || 'Unknown'}</TableCell>
                        <TableCell>{Number(book.visitor_quiz_starts)}</TableCell>
                        <TableCell>{Number(book.visitor_quiz_completions)}</TableCell>
                        <TableCell>
                          {Number(book.visitor_quiz_starts) > 0
                            ? Math.round((Number(book.visitor_quiz_completions) / Number(book.visitor_quiz_starts)) * 100)
                            : 0}%
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No visitor activity yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Insights */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-background">
              <div>
                <p className="text-sm font-medium">Visitor Engagement</p>
                <p className="text-xs text-muted-foreground">
                  {stats.visitorQuizStarts} visitors started quizzes without registering
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{visitorPercentage}%</p>
                <p className="text-xs text-muted-foreground">of total activity</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium">Conversion Opportunity</p>
                <p className="text-xs text-muted-foreground">
                  Visitors who could become registered users
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-orange-500">{stats.visitorQuizStarts}</p>
                <p className="text-xs text-muted-foreground">potential signups</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};
