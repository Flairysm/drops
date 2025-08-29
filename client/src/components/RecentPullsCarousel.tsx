import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { GlobalFeedWithDetails } from "@shared/schema";

interface RecentPullsCarouselProps {
  limit?: number;
}

export function RecentPullsCarousel({ limit = 10 }: RecentPullsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: feedData, isLoading } = useQuery<GlobalFeedWithDetails[]>({
    queryKey: ["/api/feed", { limit }],
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const tierColors = {
    C: "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800",
    UC: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-800",
    R: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-800",
    SR: "text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-800",
    SSS: "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-800"
  };

  const tierNames = {
    C: "Common",
    UC: "Uncommon", 
    R: "Rare",
    SR: "Super Rare",
    SSS: "Legendary"
  };

  const getTimeAgo = (date: string | Date) => {
    const now = new Date();
    const pullTime = new Date(date);
    const diffMs = now.getTime() - pullTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return "Just now";
  };

  // Auto-advance carousel
  useEffect(() => {
    if (!feedData || feedData.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.min(feedData.length, 8));
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, [feedData]);

  const nextSlide = () => {
    if (!feedData) return;
    setCurrentIndex((prev) => (prev + 1) % Math.min(feedData.length, 8));
  };

  const prevSlide = () => {
    if (!feedData) return;
    setCurrentIndex((prev) => (prev - 1 + Math.min(feedData.length, 8)) % Math.min(feedData.length, 8));
  };

  if (isLoading) {
    return (
      <div className="w-full h-32 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-muted-foreground">Loading recent pulls...</span>
      </div>
    );
  }

  if (!feedData || feedData.length === 0) {
    return (
      <div className="w-full h-32 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No recent pulls yet - be the first!</p>
        </div>
      </div>
    );
  }

  const displayPulls = feedData.slice(0, 8); // Show max 8 recent pulls
  const currentPull = displayPulls[currentIndex];

  return (
    <div className="relative w-full">
      <Card className="gaming-card overflow-hidden border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-gaming font-bold text-xl">Recent Pulls</h3>
              <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                Live
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={prevSlide}
                className="w-8 h-8 p-0"
                data-testid="button-carousel-prev"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={nextSlide}
                className="w-8 h-8 p-0"
                data-testid="button-carousel-next"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="relative h-24 overflow-hidden">
            <div 
              className="flex transition-transform duration-500 ease-in-out h-full"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {displayPulls.map((pull, index) => (
                <div key={pull.id} className="min-w-full flex items-center space-x-4">
                  {/* Card Image/Placeholder */}
                  <div className="w-16 h-20 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 border-2 border-primary/20">
                    {pull.card.imageUrl ? (
                      <img 
                        src={pull.card.imageUrl} 
                        alt={pull.card.name}
                        className="w-full h-full object-cover rounded-lg"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-primary" />
                      </div>
                    )}
                  </div>

                  {/* Pull Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-gaming font-bold text-lg truncate" data-testid={`text-puller-${index}`}>
                        {pull.user.username}
                      </span>
                      <span className="text-muted-foreground text-sm">pulled</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant="secondary" 
                        className={`${tierColors[pull.tier as keyof typeof tierColors] || tierColors.C} font-bold`}
                        data-testid={`badge-tier-${index}`}
                      >
                        {tierNames[pull.tier as keyof typeof tierNames] || pull.tier}
                      </Badge>
                      <span className="font-semibold truncate" data-testid={`text-card-name-${index}`}>
                        {pull.card.name}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {pull.gameType.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {getTimeAgo(pull.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination Dots */}
          <div className="flex justify-center space-x-1 mt-4">
            {displayPulls.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex 
                    ? 'bg-primary' 
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
                data-testid={`button-dot-${index}`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}