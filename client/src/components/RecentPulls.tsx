import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Package } from "lucide-react";
import { motion } from "framer-motion";
import type { GlobalFeedWithDetails } from "@shared/schema";

interface RecentPullsProps {
  limit?: number;
}

export function RecentPulls({ limit = 10 }: RecentPullsProps) {
  const { data: feedData, isLoading, error } = useQuery<GlobalFeedWithDetails[]>({
    queryKey: ["/api/feed", { limit, minTier: 'A' }],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/feed?limit=${limit}&minTier=A`);
      if (!response.ok) {
        throw new Error("Failed to fetch recent pulls");
      }
      return response.json();
    },
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
      <div className="w-full">
        {/* Section Title */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <h2 className="text-2xl font-bold text-white">Recent Pulls</h2>
          </div>
        </div>
        
        <div className="w-48 h-48 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700 flex flex-col items-center justify-center text-gray-400">
          <Package className="w-8 h-8 mb-3 text-gray-500" />
          <span className="text-sm font-medium text-white">No recent pulls yet</span>
          <span className="text-xs text-gray-400">Be the first to pull a rare card!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Section Title */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <h2 className="text-2xl font-bold text-white">Recent Pulls</h2>
        </div>
        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
          View all
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Recent Pulls List */}
      <div className="space-y-3">
        {feedData.map((pull, index) => (
          <motion.div
            key={pull.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="w-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  {/* Card Image */}
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-24 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center border border-gray-600 shadow-lg">
                      {pull.card.imageUrl ? (
                        <img 
                          src={pull.card.imageUrl} 
                          alt={pull.card.name}
                          className="w-full h-full object-cover rounded-lg"
                          loading="lazy"
                          onError={(e) => {
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
                    
                    {/* Tier Badge */}
                    <div className="absolute -top-1 -right-1">
                      <Badge className={`${getTierColor(pull.tier)} font-bold text-xs px-2 py-0.5 border`}>
                        {pull.tier}
                      </Badge>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white mb-1 truncate">
                      {pull.card.name}
                    </h3>
                    <p className="text-gray-400 text-sm mb-1">
                      {pull.tier} Tier Card
                    </p>
                    <p className="text-gray-300 text-sm">
                      pulled by {pull.user?.username || 'Unknown'}
                    </p>
                  </div>

                  {/* Time */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-xs text-gray-400">
                      {getTimeAgo(pull.createdAt || new Date())}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
