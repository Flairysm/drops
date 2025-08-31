import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ChevronDown } from "lucide-react";
import type { GlobalFeedWithDetails } from "@shared/schema";

interface GlobalFeedProps {
  limit?: number;
}

export function GlobalFeed({ limit = 50 }: GlobalFeedProps) {
  const [showCount, setShowCount] = useState(limit);
  const [showAllTiers, setShowAllTiers] = useState(false);

  const { data: feedData, isLoading, refetch } = useQuery<GlobalFeedWithDetails[]>({
    queryKey: [`/api/feed?limit=${showCount}${showAllTiers ? '' : '&minTier=A'}`],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const tierColors = {
    D: "d",
    C: "c",
    B: "b",
    A: "a", 
    S: "s",
    SS: "ss",
    SSS: "sss"
  };

  const getTimeAgo = (date: string | Date) => {
    const now = new Date();
    const pullTime = new Date(date);
    const diffMs = now.getTime() - pullTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return "Just now";
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading recent pulls...</p>
      </div>
    );
  }

  if (!feedData || feedData.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-muted/20 rounded-full mx-auto mb-4 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Recent Pulls</h3>
        <p className="text-muted-foreground">Be the first to pull a rare card!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
          <span className="font-semibold" data-testid="text-live-feed">
            Live Feed {!showAllTiers && "(A+ Tier Only)"}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={showAllTiers ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAllTiers(!showAllTiers)}
            data-testid="button-toggle-tiers"
          >
            {showAllTiers ? "A+ Only" : "See All"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            data-testid="button-refresh-feed"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Feed Items */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {feedData.slice(0, showCount).map((pull) => {
          const tierColor = tierColors[pull.tier as keyof typeof tierColors] || "d";
          
          return (
            <div
              key={pull.id}
              className="flex items-center space-x-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
              data-testid={`feed-item-${pull.id}`}
            >
              <div className={`tier-glow-${tierColor} w-12 h-12 rounded-lg bg-gradient-to-br from-${tierColor}/30 to-${tierColor}/10 flex items-center justify-center flex-shrink-0`}>
                {pull.card.imageUrl ? (
                  <img
                    src={pull.card.imageUrl}
                    alt={pull.card.name}
                    className="w-10 h-10 rounded object-cover"
                  />
                ) : (
                  <span className={`font-bold tier-${tierColor}`}>{pull.tier}</span>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-semibold truncate" data-testid={`text-username-${pull.id}`}>
                    {pull.user?.username || 'Unknown'}
                  </span>
                  <span className="text-muted-foreground text-sm">pulled</span>
                  <Badge className={`bg-${tierColor}/90 tier-${tierColor} text-white text-xs`}>
                    {pull.tier}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground truncate" data-testid={`text-card-name-${pull.id}`}>
                  {pull.card.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  from {pull.gameType} game
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground text-right flex-shrink-0" data-testid={`text-timestamp-${pull.id}`}>
                {getTimeAgo(pull.createdAt || new Date())}
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More */}
      {feedData.length > showCount && (
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCount(prev => prev + 20)}
            data-testid="button-load-more-feed"
          >
            Load More <ChevronDown className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {feedData.length === 0 && (
        <div className="text-center text-muted-foreground text-sm">
          No more pulls to show
        </div>
      )}
    </div>
  );
}
