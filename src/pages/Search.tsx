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
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["book-search", searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      
      // Call backend search endpoint
      const { data, error } = await supabase.functions.invoke("search-books", {
        body: { query: searchQuery },
      });

      if (error) throw error;
      return data.books || [];
    },
    enabled: searchQuery.length >= 2,
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
          <h1 className="text-3xl font-bold">Find your book</h1>
        </div>

        {/* Search Input */}
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <Input
            type="text"
            placeholder="Type your book's name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-14 text-lg rounded-2xl"
            autoFocus
          />
        </div>

        {/* Results */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
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

        {searchResults && searchResults.length > 0 && (
          <div className="space-y-4">
            {searchResults.map((book: any) => (
              <Card
                key={book.id}
                className="p-4 cursor-pointer hover:shadow-lg transition-all quiz-button"
                onClick={() => navigate(`/book/${book.id}`)}
              >
                <div className="flex gap-4 items-start">
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
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {searchQuery && !isLoading && searchResults?.length === 0 && (
          <Card className="p-8 text-center space-y-4">
            <p className="text-lg">Can't find your book? 🤔</p>
            <Button
              variant="outline"
              size="lg"
              className="rounded-xl"
              onClick={() => navigate("/add-book")}
            >
              Add it manually
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Search;