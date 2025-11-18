import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Book } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BookListSkeleton } from "@/components/shared";
import { PopularBook } from "@/types";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";

const Popular = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: popularBooks, isLoading } = useQuery({
    queryKey: ["popular-books"],
    queryFn: async () => {
      // The popular_books_dynamic view already filters for age-appropriate books
      // This query fetches books that are verified as children's books (age_max <= 12)
      const { data, error } = await supabase
        .from("popular_books_dynamic")
        .select("*")
        .order("ranking", { ascending: true });

      if (error) throw error;
      
      // Fallback: if no quiz data yet, show recently added books
      if (!data || data.length === 0) {
        const { data: fallback } = await supabase
          .from("books")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20);
        
        return fallback?.map((book, idx) => ({
          ...book,
          book_id: book.id,
          ranking: idx + 1,
          quiz_count: 0,
          unique_users: 0,
          avg_score: null
        }));
      }
      
      return data;
    },
  });

  const searchedBooks = useMemo(() => {
    if (!popularBooks || !searchQuery) return popularBooks;
    
    const query = searchQuery.toLowerCase();
    return popularBooks.filter((book: PopularBook) => 
      book.title?.toLowerCase().includes(query) ||
      book.author?.toLowerCase().includes(query)
    );
  }, [popularBooks, searchQuery]);

  return (
    <div className="min-h-screen p-4 sm:p-6 pb-24">
      <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="rounded-full hover:bg-accent/20 min-w-[44px] min-h-[44px] flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
          <h1 className="text-3xl sm:text-4xl font-bold gradient-text leading-tight">⭐ Popular books</h1>
        </div>

        <div className="space-y-4">
          <p className="text-muted-foreground text-lg sm:text-xl font-medium px-2">
            Books that kids love reading!
          </p>

          {/* Search Bar */}
          <div className="px-2">
            <Input
              type="search"
              placeholder="Search books by title or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Book Count */}
          {!isLoading && searchedBooks && (
            <p className="text-sm text-muted-foreground px-2">
              Showing <span className="font-semibold text-foreground">{searchedBooks.length}</span> 
              {searchQuery ? ' matching' : ''} children's book{searchedBooks.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Books List */}
        {isLoading && <BookListSkeleton count={20} />}

        {searchedBooks && searchedBooks.length > 0 && (
          <div className="space-y-4 sm:space-y-6">
            {searchedBooks.map((book: PopularBook, index: number) => {
              return (
                <Card
                  key={book.book_id}
                  className="p-5 sm:p-6 cursor-pointer card-lift quiz-button animate-fade-in-up min-h-[100px]"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => navigate(`/book/${book.book_id}`)}
                >
                  <div className="flex gap-3 sm:gap-6 items-start">
                    <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-primary to-secondary text-primary-foreground flex items-center justify-center font-bold text-base sm:text-lg shadow-[0_4px_12px_rgba(99,102,241,0.3)]">
                      {book.ranking}
                    </div>
                    {book.cover_url ? (
                      <img
                        src={book.cover_url}
                        alt={book.title}
                        className="w-16 h-20 sm:w-20 sm:h-24 object-cover rounded-[12px] shadow-lg flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-20 sm:w-20 sm:h-24 bg-secondary/30 rounded-[12px] flex items-center justify-center flex-shrink-0">
                        <Book className="h-8 w-8 sm:h-10 sm:w-10 text-secondary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg sm:text-xl mb-1 leading-tight">{book.title}</h3>
                      {book.author && (
                        <p className="text-muted-foreground font-medium text-sm sm:text-base">by {book.author}</p>
                      )}
                      {book.quiz_count > 0 && (
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2 font-medium">
                          🎯 {book.quiz_count} quiz{book.quiz_count !== 1 ? 'zes' : ''} • 
                          👥 {book.unique_users} reader{book.unique_users !== 1 ? 's' : ''}{book.avg_score && ` • ⭐ ${book.avg_score}% avg`}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {!isLoading && (!searchedBooks || searchedBooks.length === 0) && (
          <Card className="p-12 text-center">
            <p className="text-xl text-muted-foreground font-medium">
              No popular books available yet. Check back soon! 📚
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Popular;