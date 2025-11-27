import { PopularBook } from "@/types";
import { Book } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FeaturedCarouselProps {
  books: PopularBook[];
}

export const FeaturedCarousel = ({ books }: FeaturedCarouselProps) => {
  const navigate = useNavigate();
  const topThree = books.slice(0, 3);
  
  const getBadgeColor = (index: number) => {
    if (index === 0) return "bg-amber-500 text-white"; // Gold
    if (index === 1) return "bg-slate-400 text-white"; // Silver
    return "bg-amber-700 text-white"; // Bronze
  };

  return (
    <div className="flex items-stretch justify-center gap-2 px-2">
      {topThree.map((book, index) => {
        if (!book) return null;
        
        return (
          <div
            key={book.book_id}
            onClick={() => navigate(`/book/${book.book_id}`)}
            className="flex-1 cursor-pointer transition-all duration-300 active:scale-95 animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="bg-card border border-border rounded-2xl p-3 shadow-lg hover:shadow-xl transition-all duration-300 h-full flex flex-col">
              {/* Rank Badge */}
              <div className="flex justify-center mb-2">
                <span className={`${getBadgeColor(index)} text-xs font-bold px-2 py-1 rounded-full`}>
                  #{index + 1}
                </span>
              </div>
              
              {/* Book Cover */}
              <div className="flex justify-center mb-2 flex-1">
                {book.cover_url ? (
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    className="w-16 h-24 object-cover rounded-lg shadow-md"
                  />
                ) : (
                  <div className="w-16 h-24 bg-muted rounded-lg flex items-center justify-center shadow-md">
                    <Book className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              {/* Book Title */}
              <p className="text-center font-bold text-foreground line-clamp-2 text-[11px] leading-tight">
                {book.title}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
