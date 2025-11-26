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

const INITIAL_LOAD = 20;
const LOAD_MORE_AMOUNT = 20;

const Popular = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [displayCount, setDisplayCount] = useState(INITIAL_LOAD);

  const { data: allPopularBooks, isLoading } = useQuery({
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
          .limit(50);
        
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
    if (!allPopularBooks || !searchQuery) return allPopularBooks;
    
    const query = searchQuery.toLowerCase();
    return allPopularBooks.filter((book: PopularBook) => 
      book.title?.toLowerCase().includes(query) ||
      book.author?.toLowerCase().includes(query)
    );
  }, [allPopularBooks, searchQuery]);

  // Apply pagination only when not searching
  const popularBooks = useMemo(() => {
    if (searchQuery.trim()) return searchedBooks;
    return searchedBooks?.slice(0, displayCount);
  }, [searchedBooks, displayCount, searchQuery]);

  const hasMore = !searchQuery.trim() && displayCount < (searchedBooks?.length || 0);

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
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">⭐ Popular books</h1>
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
          {!isLoading && popularBooks && (
            <p className="text-sm text-muted-foreground px-2">
              Showing <span className="font-semibold text-foreground">{popularBooks.length}</span> 
              {searchQuery ? ' matching' : ''} children's book{popularBooks.length !== 1 ? 's' : ''}
              {hasMore && ` (${searchedBooks?.length || 0} total)`}
            </p>
          )}
        </div>

        {/* Books List */}
        {isLoading && <BookListSkeleton count={20} />}

        {popularBooks && popularBooks.length > 0 && (
          <div className="space-y-4 sm:space-y-6">
            {popularBooks.map((book: PopularBook) => {
              return (
                <Card
                  key={book.book_id}
                  className="p-5 cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all duration-200"
                  onClick={() => navigate(`/book/${book.book_id}`)}
                >
                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-sm">
                      {book.ranking}
                    </div>
                    {book.cover_url ? (
                      <img
                        src={book.cover_url}
                        alt={book.title}
                        className="w-16 h-20 sm:w-20 sm:h-24 object-cover rounded-lg shadow-sm flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-20 sm:w-20 sm:h-24 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                        <Book className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg">{book.title}</h3>
                      {book.author && (
                        <p className="text-muted-foreground text-sm">by {book.author}</p>
                      )}
                      {book.quiz_count > 0 && (
                        <p className="text-muted-foreground text-xs mt-2">
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

        {!isLoading && (!popularBooks || popularBooks.length === 0) && (
          <Card className="p-12 text-center">
            <p className="text-xl text-muted-foreground font-medium">
              {searchQuery 
                ? `No books found matching "${searchQuery}"`
                : "No popular books available yet. Check back soon! 📚"}
            </p>
          </Card>
        )}

        {/* Load More Button */}
        {hasMore && !isLoading && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setDisplayCount(prev => prev + LOAD_MORE_AMOUNT)}
              className="rounded-[24px]"
            >
              Load More Books
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Popular;