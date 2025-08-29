import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package2, Sparkles, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserPack {
  id: string;
  packId: string;
  tier: string;
  earnedFrom: string;
  earnedAt: string;
}

interface OpenPackResult {
  success: boolean;
  card: {
    id: string;
    cardId: string;
    pullValue: string;
  };
}

export default function MyPacks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openingPack, setOpeningPack] = useState<string | null>(null);

  // Fetch user's packs
  const { data: userPacks, isLoading } = useQuery({
    queryKey: ["/api/packs"],
  });

  const openPackMutation = useMutation({
    mutationFn: async (packId: string) => {
      return await apiRequest(`/api/packs/open/${packId}`, "POST");
    },
    onSuccess: (result) => {
      toast({
        title: "Pack Opened!",
        description: "Your card has been added to your vault!",
        variant: "default",
      });
      // Invalidate packs and vault queries
      queryClient.invalidateQueries({ queryKey: ["/api/packs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vault"] });
      setOpeningPack(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error Opening Pack",
        description: error.message || "Failed to open pack",
        variant: "destructive",
      });
      setOpeningPack(null);
    },
  });

  const handleOpenPack = (packId: string) => {
    setOpeningPack(packId);
    openPackMutation.mutate(packId);
  };

  const getPackTypeDisplay = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'c':
      case 'common':
        return { name: "Pokeball Pack", color: "bg-red-500", icon: "🟡" };
      case 'uc':
      case 'uncommon':
        return { name: "Greatball Pack", color: "bg-blue-500", icon: "🔵" };
      case 'r':
      case 'rare':
        return { name: "Ultraball Pack", color: "bg-yellow-500", icon: "🟡" };
      case 'sr':
      case 'superrare':
      case 'sss':
      case 'legendary':
        return { name: "Masterball Pack", color: "bg-purple-500", icon: "🟣" };
      default:
        return { name: "Mystery Pack", color: "bg-gray-500", icon: "❓" };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 pb-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Package2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
              <p>Loading your packs...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const noPacks = !userPacks || (userPacks as any[]).length === 0;

  return (
    <div className="min-h-screen pt-20 pb-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Gift className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-gaming font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              My Packs
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Open your earned packs to discover amazing cards! Each pack contains one card based on the pack's tier odds.
          </p>
        </div>

        {noPacks ? (
          /* No Packs State */
          <div className="text-center py-16">
            <div className="gaming-card max-w-md mx-auto p-8 rounded-xl">
              <Package2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Packs Yet</h3>
              <p className="text-muted-foreground mb-6">
                Play Plinko to earn packs! Different landing zones give different tier packs.
              </p>
              <Button asChild className="gaming-gradient">
                <a href="/games" data-testid="button-play-plinko">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Play Plinko
                </a>
              </Button>
            </div>
          </div>
        ) : (
          /* Packs Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {(userPacks as any[]).map((pack: any) => {
              const packDisplay = getPackTypeDisplay(pack.tier);
              const isOpening = openingPack === pack.id;
              
              return (
                <Card key={pack.id} className="gaming-card hover:scale-105 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold">
                        {packDisplay.name}
                      </CardTitle>
                      <div className="text-2xl">{packDisplay.icon}</div>
                    </div>
                    <Badge variant="outline" className="w-fit">
                      {pack.tier.toUpperCase()} Tier
                    </Badge>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      <p>Earned from: <span className="capitalize font-medium">{pack.earnedFrom}</span></p>
                      <p>Earned: {new Date(pack.earnedAt).toLocaleDateString()}</p>
                    </div>
                    
                    <Button 
                      onClick={() => handleOpenPack(pack.id)}
                      disabled={isOpening}
                      className="w-full gaming-gradient"
                      data-testid={`button-open-pack-${pack.id}`}
                    >
                      {isOpening ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Opening...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Package2 className="h-4 w-4" />
                          Open Pack
                        </div>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Info Section */}
        <div className="gaming-card p-6 rounded-xl">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Pack Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Pack Types</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🟡</span>
                  <span className="font-medium">Pokeball:</span>
                  <span className="text-muted-foreground">Common tier rewards</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔵</span>
                  <span className="font-medium">Greatball:</span>
                  <span className="text-muted-foreground">Uncommon tier rewards</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🟡</span>
                  <span className="font-medium">Ultraball:</span>
                  <span className="text-muted-foreground">Rare tier rewards</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🟣</span>
                  <span className="font-medium">Masterball:</span>
                  <span className="text-muted-foreground">Super Rare / Legendary rewards</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">How It Works</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>• Play Plinko to earn packs based on where your ball lands</p>
                <p>• Each pack contains one card with weighted probabilities</p>
                <p>• Higher tier packs have better odds for rare cards</p>
                <p>• Opened cards automatically go to your vault</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}