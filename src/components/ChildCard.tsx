import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Flame, BookOpen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ChildCardProps {
  childId: string;
  displayName: string;
  totalPoints: number;
  quizzesCompleted: number;
  currentStreak: number;
  lastQuizDate: string | null;
  onClick: () => void;
}

const ChildCard = ({
  displayName,
  totalPoints,
  quizzesCompleted,
  currentStreak,
  lastQuizDate,
  onClick,
}: ChildCardProps) => {
  return (
    <Card
      className="cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all duration-200"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-xl">{displayName}</CardTitle>
          {currentStreak > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Flame className="h-3 w-3" />
              {currentStreak} day{currentStreak !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Trophy className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {totalPoints.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Points</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-accent/10">
              <BookOpen className="h-4 w-4 text-accent" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {quizzesCompleted}
              </div>
              <div className="text-xs text-muted-foreground">Quizzes</div>
            </div>
          </div>
        </div>

        {lastQuizDate && (
          <div className="text-xs text-muted-foreground border-t pt-3">
            Last activity: {formatDistanceToNow(new Date(lastQuizDate), { addSuffix: true })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChildCard;
