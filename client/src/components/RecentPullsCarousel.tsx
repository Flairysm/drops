import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { GlobalFeedWithDetails } from "@shared/schema";

interface RecentPullsCarouselProps {
  limit?: number;
}

export function RecentPullsCarousel({ limit = 10 }: RecentPullsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAllModal, setShowAllModal] = useState(false);

  // Show all tiers temporarily for testing
  const { data: feedData, isLoading, error } = useQuery<GlobalFeedWithDetails[]>({
    queryKey: [`/api/feed?limit=${limit}`],
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  // Debug logging
  console.log('📰 RecentPullsCarousel - isLoading:', isLoading);
  console.log('📰 RecentPullsCarousel - error:', error);
  console.log('📰 RecentPullsCarousel - feedData:', feedData);

  // Separate query for all recent pulls in the modal
  const { data: allFeedData, isLoading: isLoadingAll } = useQuery<GlobalFeedWithDetails[]>({
    queryKey: [`/api/feed?limit=100`], // Get more data for the modal
    enabled: showAllModal, // Only fetch when modal is open
    refetchInterval: 15000,
  });

  const tierColors = {
    D: "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800",
    C: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-800",
    B: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-800",
    A: "text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-800",
    S: "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-800",
    SS: "text-pink-600 bg-pink-100 dark:text-pink-400 dark:bg-pink-800",
    SSS: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-800"
  };

  const tierNames = {
    D: "D Tier",
    C: "C Tier", 
    B: "B Tier",
    A: "A Tier",
    S: "S Tier",
    SS: "SS Tier",
    SSS: "SSS Tier"
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
    }, 3000); // Change every 3 seconds for faster auto-scroll

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
              <h3 className="font-gaming font-bold text-xl">Recent Pulls </h3>
              <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                Live
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllModal(true)}
                data-testid="button-see-all-pulls"
              >
                See All
              </Button>
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

          <div className="relative h-48 overflow-hidden">
            <div 
              className="flex transition-transform duration-1000 ease-in-out h-full gap-4"
              style={{ transform: `translateX(-${currentIndex * 216}px)` }}
            >
              {/* Duplicate cards for seamless looping */}
              {displayPulls.map((pull, index) => (
                <div key={pull.id} className="min-w-[200px] flex flex-col items-center space-y-2 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                  {/* Card Image - Prominently displayed */}
                  <div className="w-24 h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg flex items-center justify-center border border-gray-300 dark:border-gray-600 shadow-md">
                    {pull.card.imageUrl ? (
                      <img 
                        src={pull.card.imageUrl} 
                        alt={pull.card.name}
                        className="w-full h-full object-cover rounded-lg"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback to default image if the imageUrl fails to load
                          const target = e.target as HTMLImageElement;
                          target.src = "/card-images/random-common-card.png";
                        }}
                      />
                    ) : (
                      <img 
                        src="/card-images/random-common-card.png" 
                        alt={pull.card.name}
                        className="w-full h-full object-cover rounded-lg"
                        loading="lazy"
                      />
                    )}
                  </div>

                  {/* Card Details Below Image */}
                  <div className="text-center space-y-1 w-full">
                    <div className="font-semibold text-sm text-gray-900 dark:text-white" data-testid={`text-card-name-${index}`}>
                      {pull.card.name}
                    </div>
                    
                    <div className="flex items-center justify-center space-x-2">
                      <Badge 
                        variant="secondary" 
                        className={`${tierColors[pull.tier as keyof typeof tierColors] || tierColors.C} font-bold text-xs`}
                        data-testid={`badge-tier-${index}`}
                      >
                        {tierNames[pull.tier as keyof typeof tierNames] || pull.tier}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-center space-x-1 text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-medium" data-testid={`text-puller-${index}`}>
                        {pull.user?.username || 'Unknown'}
                      </span>
                      <span>pulled</span>
                    </div>

                    <div className="flex items-center justify-center space-x-2 text-xs text-gray-500 dark:text-gray-500">
                      <Badge variant="outline" className="text-xs px-2 py-0">
                        {pull.gameType.toUpperCase()}
                      </Badge>
                      <span>{getTimeAgo(pull.createdAt || new Date())}</span>
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
      {/* Modal for All Recent Pulls */}
      <Dialog open={showAllModal} onOpenChange={setShowAllModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>All Recent Pulls</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[60vh] pr-2">
            {isLoadingAll ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading all recent pulls...</p>
              </div>
            ) : !allFeedData || allFeedData.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No recent pulls found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allFeedData.map((pull) => (
                  <div
                    key={pull.id}
                    className="flex flex-col items-center space-y-3 p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    {/* Card Image */}
                    <div className="w-20 h-28 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-xl flex items-center justify-center flex-shrink-0 border-2 border-primary/20 shadow-lg">
                      {pull.card.imageUrl ? (
                        <img 
                          src={pull.card.imageUrl} 
                          alt={pull.card.name}
                          className="w-full h-full object-cover rounded-xl"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-primary" />
                        </div>
                      )}
                    </div>

                    {/* Pull Details Below Image */}
                    <div className="text-center space-y-2">
                      <div className="flex items-center justify-center space-x-2">
                        <span className="font-semibold text-sm">
                          {pull.user?.username || 'Unknown'}
                        </span>
                        <span className="text-muted-foreground text-xs">pulled</span>
                      </div>
                      
                      <div className="flex items-center justify-center space-x-2">
                        <Badge 
                          variant="secondary" 
                          className={`${tierColors[pull.tier as keyof typeof tierColors] || tierColors.C} font-bold text-xs`}
                        >
                          {tierNames[pull.tier as keyof typeof tierNames] || pull.tier}
                        </Badge>
                      </div>

                      <div className="font-medium text-sm">
                        {pull.card.name}
                      </div>

                      <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                        <span>{pull.gameType.toUpperCase()}</span>
                        <span>•</span>
                        <span>{getTimeAgo(pull.createdAt || new Date())}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}