import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Book } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Popular = () => {
  const navigate = useNavigate();

  const { data: popularBooks, isLoading } = useQuery({
    queryKey: ["popular-books"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("popular_books")
        .select(`
          *,
          books (*)
        `)
        .order("ranking", { ascending: true })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="rounded-full"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-3xl font-bold">⭐ Popular books</h1>
        </div>

        <p className="text-muted-foreground text-lg">
          Books that kids love reading!
        </p>

        {/* Books List */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-16 h-20 bg-muted rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {popularBooks && popularBooks.length > 0 && (
          <div className="space-y-4">
            {popularBooks.map((item: any) => {
              const book = item.books;
              return (
                <Card
                  key={item.id}
                  className="p-4 cursor-pointer hover:shadow-lg transition-all quiz-button"
                  onClick={() => navigate(`/book/${book.id}`)}
                >
                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      {item.ranking}
                    </div>
                    {book.cover_url ? (
                      <img
                        src={book.cover_url}
                        alt={book.title}
                        className="w-16 h-20 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-20 bg-secondary rounded flex items-center justify-center">
                        <Book className="h-8 w-8 text-secondary-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{book.title}</h3>
                      {book.author && (
                        <p className="text-muted-foreground">by {book.author}</p>
                      )}
                      {item.typical_grade && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.typical_grade}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {!isLoading && (!popularBooks || popularBooks.length === 0) && (
          <Card className="p-8 text-center">
            <p className="text-lg text-muted-foreground">
              No popular books available yet. Check back soon! 📚
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Popular;