import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search as SearchIcon, ArrowLeft, Book } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Search = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  // Search books from API
  const { data: searchResults, isLoading, error: searchError } = useQuery({
    queryKey: ["book-search", searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      
      try {
        // Call backend search endpoint
        const { data, error } = await supabase.functions.invoke("search-books", {
          body: { query: searchQuery },
        });

        if (error) {
          console.error("Search API error:", error);
          throw new Error("Failed to search books");
        }
        
        return data.books || [];
      } catch (error: any) {
        console.error("Search failed:", error);
        throw error;
      }
    },
    enabled: searchQuery.length >= 2,
    retry: 2,
    retryDelay: 1000,
  });

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
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Find your book</h1>
        </div>

        {/* Search Input */}
        <div className="relative">
          <SearchIcon className="absolute left-4 sm:left-6 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5 sm:h-6 sm:w-6" />
          <Input
            type="text"
            placeholder="Type your book's name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 sm:pl-16 h-14 sm:h-16 text-base sm:text-xl rounded-[24px] glass-card border-2 focus:border-primary/50 font-medium"
            autoFocus
          />
        </div>

        {/* Results */}
        {isLoading && (
          <div className="space-y-4 sm:space-y-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-5 sm:p-6 animate-pulse">
                <div className="flex gap-4 sm:gap-6">
                  <div className="w-16 h-20 sm:w-20 sm:h-24 bg-muted rounded-[12px]" />
                  <div className="flex-1 space-y-2 sm:space-y-3">
                    <div className="h-4 sm:h-5 bg-muted rounded-[12px] w-3/4" />
                    <div className="h-3 sm:h-4 bg-muted rounded-[12px] w-1/2" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {searchError && searchQuery.length >= 2 && (
          <Card className="p-6 text-center space-y-2">
            <p className="text-muted-foreground">Unable to search at the moment</p>
            <p className="text-sm text-muted-foreground">Please check your connection and try again</p>
          </Card>
        )}

        {searchResults && searchResults.length > 0 && (
          <div className="space-y-4 sm:space-y-6">
            {searchResults.map((book: any, index: number) => (
              <Card
                key={book.id}
                className="p-5 sm:p-6 cursor-pointer card-lift quiz-button animate-fade-in-up min-h-[100px]"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => navigate(`/book/${book.id}`)}
              >
                <div className="flex gap-4 sm:gap-6 items-start">
                  {book.cover_url ? (
                    <img
                      src={book.cover_url}
                      alt={book.title}
                      className="w-16 h-20 sm:w-20 sm:h-24 object-cover rounded-[12px] shadow-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-20 sm:w-20 sm:h-24 bg-muted rounded-[12px] flex items-center justify-center flex-shrink-0">
                      <Book className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg sm:text-xl mb-1 leading-tight">{book.title}</h3>
                    {book.author && (
                      <p className="text-muted-foreground font-medium text-sm sm:text-base">by {book.author}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {searchQuery && !isLoading && searchResults?.length === 0 && (
          <Card className="p-12 text-center space-y-4">
            <p className="text-xl font-medium">Can't find your book? 🤔</p>
            <p className="text-muted-foreground">Try different search terms or check the spelling</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Search;