import { Card } from "@/components/ui/card";

interface BookListSkeletonProps {
  count?: number;
}

export const BookListSkeleton = ({ count = 5 }: BookListSkeletonProps) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-5 sm:p-6 animate-pulse">
          <div className="flex gap-4 sm:gap-6">
            <div className="w-14 h-16 sm:w-16 sm:h-20 bg-muted rounded-[12px]" />
            <div className="flex-1 space-y-2 sm:space-y-3">
              <div className="h-4 sm:h-5 bg-muted rounded-[12px] w-3/4" />
              <div className="h-3 sm:h-4 bg-muted rounded-[12px] w-1/2" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
