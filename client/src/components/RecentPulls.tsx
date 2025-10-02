import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Package } from "lucide-react";
import { motion } from "framer-motion";
import type { GlobalFeedWithDetails } from "@shared/schema";

interface RecentPullsProps {
  limit?: number;
}

export function RecentPulls({ limit = 5 }: RecentPullsProps) {
  const { data: feedData, isLoading, error } = useQuery<GlobalFeedWithDetails[]>({
    queryKey: [`/api/feed?limit=${limit}&minTier=A`], // Only A+ tier cards
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const getTimeAgo = (date: Date | string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffSecs = Math.round(diffMs / 1000);
    const diffMins = Math.round(diffSecs / 60);
    const diffHours = Math.round(diffMins / 60);
    const diffDays = Math.round(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return "Just now";
  };

  const getTierColor = (tier: string) => {
    switch (tier?.toUpperCase()) {
      case 'A':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'S':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'SS':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'SSS':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-64 bg-white rounded-2xl border border-gray-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-gray-600">Loading recent pulls...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-64 bg-white rounded-2xl border border-gray-200 flex items-center justify-center text-red-500">
        Error loading pulls: {error.message}
      </div>
    );
  }

  if (!feedData || feedData.length === 0) {
    return (
      <div className="w-full h-64 bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center text-gray-500">
        <Package className="w-12 h-12 mb-4 text-gray-400" />
        <span className="text-lg font-medium">No recent pulls yet</span>
        <span className="text-sm">Be the first to pull a rare card!</span>
      </div>
    );
  }

  const latestPull = feedData[0]; // Get the most recent pull

  return (
    <div className="w-full">
      {/* Section Title */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Just pulled</h2>
        <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
          View all
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Main Pull Display */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-64 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            {/* Card Image Container */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                {/* Card Image */}
                <div className="w-48 h-72 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center border border-gray-300 shadow-lg">
                  {latestPull.card.imageUrl ? (
                    <img 
                      src={latestPull.card.imageUrl} 
                      alt={latestPull.card.name}
                      className="w-full h-full object-cover rounded-xl"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/card-images/random-common-card.png";
                      }}
                    />
                  ) : (
                    <img 
                      src="/card-images/random-common-card.png" 
                      alt={latestPull.card.name}
                      className="w-full h-full object-cover rounded-xl"
                      loading="lazy"
                    />
                  )}
                </div>
                
                {/* Tier Badge */}
                <div className="absolute -top-2 -right-2">
                  <Badge className={`${getTierColor(latestPull.tier)} font-bold text-sm px-3 py-1 border`}>
                    {latestPull.tier}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Card Details */}
            <div className="text-center mb-3">
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {latestPull.card.name}
              </h3>
              <p className="text-gray-600 text-sm">
                {latestPull.tier} Tier Card
              </p>
            </div>

            {/* Source and Time */}
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <Package className="w-4 h-4" />
                <span>{latestPull.gameType.replace('_', ' ')} Pack</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>{getTimeAgo(latestPull.createdAt || new Date())}</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

    </div>
  );
}
