import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Navigation } from "@/components/Navigation";
import { PackOpeningAnimation } from "@/components/PackOpeningAnimation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package2, Sparkles, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Import pack images
import masterballPack from '@assets/ChatGPT Image Aug 30, 2025, 11_21_42 PM_1756567318737.png';
import ultraballPack from '@assets/ChatGPT Image Aug 30, 2025, 11_21_45 PM_1756567324980.png';
import greatballPack from '@assets/ChatGPT Image Aug 30, 2025, 11_22_18 PM_1756567342025.png';
import pokeballPack from '@assets/ChatGPT Image Aug 30, 2025, 11_22_50 PM_1756567373572.png';

interface UserPack {
  id: string;
  packId: string;
  tier: string;
  earnedFrom: string;
  earnedAt: string;
}

interface PackCard {
  id: string;
  name: string;
  tier: string;
  imageUrl?: string;
  marketValue: string;
  isHit: boolean;
  position: number;
}

interface OpenPackResult {
  success: boolean;
  userCard: {
    id: string;
    cardId: string;
    pullValue: string;
  };
  packCards: PackCard[];
  hitCardPosition: number;
}

export default function MyPacks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openingPack, setOpeningPack] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [packOpenData, setPackOpenData] = useState<OpenPackResult | null>(null);

  // Fetch user's packs
  const { data: userPacks, isLoading } = useQuery({
    queryKey: ["/api/packs"],
  });

  const openPackMutation = useMutation({
    mutationFn: async (packId: string) => {
      const response = await apiRequest("POST", `/api/packs/open/${packId}`);
      return await response.json();
    },
    onSuccess: (result) => {
      setPackOpenData(result);
      setShowAnimation(true);
      setOpeningPack(null);
      // Immediately invalidate cache so pack disappears from UI
      queryClient.invalidateQueries({ queryKey: ["/api/packs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vault"] });
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

  const handleAnimationComplete = () => {
    setShowAnimation(false);
    setPackOpenData(null);
    toast({
      title: "Pack Opened!",
      description: "Your card has been added to your vault!",
      variant: "default",
    });
  };

  const getPackTypeDisplay = (packType: string) => {
    // Now tier field directly stores the pack type (pokeball, greatball, ultraball, masterball)
    console.log(`Pack display: packType="${packType}"`);
    
    switch ((packType || '').toLowerCase()) {
      case 'pokeball':
        return { 
          name: "Pokeball Pack", 
          color: "from-red-600 to-white", 
          borderColor: "border-red-500",
          textColor: "text-red-600",
          bgColor: "bg-red-50",
          tier: "Common"
        };
      case 'greatball':
        return { 
          name: "Great Ball Pack", 
          color: "from-blue-600 to-red-500", 
          borderColor: "border-blue-500",
          textColor: "text-blue-600",
          bgColor: "bg-blue-50",
          tier: "Uncommon"
        };
      case 'ultraball':
        return { 
          name: "Ultra Ball Pack", 
          color: "from-yellow-400 to-black", 
          borderColor: "border-yellow-500",
          textColor: "text-yellow-600",
          bgColor: "bg-yellow-50",
          tier: "Rare"
        };
      case 'masterball':
        return { 
          name: "Master Ball Pack", 
          color: "from-purple-600 to-pink-400", 
          borderColor: "border-purple-500",
          textColor: "text-purple-600",
          bgColor: "bg-purple-50",
          tier: "Legendary"
        };
      default:
        return { 
          name: "Mystery Pack", 
          color: "from-gray-600 to-gray-400", 
          borderColor: "border-gray-500",
          textColor: "text-gray-600",
          bgColor: "bg-gray-50",
          tier: "Unknown"
        };
    }
  };

  // Group packs by tier and count them
  const groupedPacks = (userPacks as any[] || []).reduce((acc: any, pack: any) => {
    const tier = pack.tier || 'unknown';
    if (!acc[tier]) {
      acc[tier] = [];
    }
    acc[tier].push(pack);
    return acc;
  }, {});

  const packTiers = ['pokeball', 'greatball', 'ultraball', 'masterball'];

  // Pokemon pack images component
  const PackImage = ({ packType, size = 'large' }: { packType: string; size?: 'small' | 'large' }) => {
    const getPackImage = (type: string) => {
      switch (type.toLowerCase()) {
        case 'masterball':
          return masterballPack;
        case 'ultraball':
          return ultraballPack;
        case 'greatball':
          return greatballPack;
        case 'pokeball':
          return pokeballPack;
        default:
          return pokeballPack;
      }
    };
    
    const imageSize = size === 'small' ? 'w-16 h-20' : 'w-48 h-60';
    
    return (
      <div className={`${imageSize} mx-auto`}>
        <img 
          src={getPackImage(packType)} 
          alt={`${packType} pack`}
          className="w-full h-full object-contain pixel-crisp"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>
    );
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
    <>
      <Navigation />
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
              Open your earned packs to discover amazing cards! Higher tier packs have better odds for rare cards.
            </p>
            {!noPacks && (
              <div className="flex justify-center gap-6 mt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{(userPacks as any[] || []).length}</p>
                  <p className="text-sm text-muted-foreground">Total Packs</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-accent">{packTiers.length}</p>
                  <p className="text-sm text-muted-foreground">Pack Types</p>
                </div>
              </div>
            )}
          </div>

          {noPacks ? (
            /* No Packs State */
            <div className="text-center py-16">
              <div className="gaming-card max-w-md mx-auto p-8 rounded-xl">
                <PackImage packType="pokeball" size="large" />
                <h3 className="text-xl font-semibold mb-2 mt-6">No Packs Yet</h3>
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
            /* 4 Pack Types Inline */
            <div className="flex justify-center items-start gap-16 flex-wrap py-8">
              {packTiers.map((tier) => {
                const packs = groupedPacks[tier] || [];
                const packDisplay = getPackTypeDisplay(tier);
                
                return (
                  <div key={tier} className="text-center">
                    <h3 className={`text-xl font-gaming font-bold mb-4 ${packDisplay.textColor}`}>
                      {packDisplay.name}
                    </h3>
                    <div className="mb-6">
                      <PackImage packType={tier} size="large" />
                    </div>
                    
                    {packs.length > 0 && (
                      <div className="space-y-3">
                        <Badge className={`${packDisplay.textColor} text-sm px-3 py-1`} variant="outline">
                          {packs.length} available
                        </Badge>
                        
                        <div className="space-y-2">
                          {packs.slice(0, 3).map((pack: any) => {
                            const isOpening = openingPack === pack.id;
                            
                            return (
                              <Button 
                                key={pack.id}
                                onClick={() => handleOpenPack(pack.id)}
                                disabled={isOpening}
                                className={`w-full bg-gradient-to-r ${packDisplay.color} text-white hover:opacity-90 transition-opacity`}
                                data-testid={`button-open-pack-${pack.id}`}
                                size="sm"
                              >
                                {isOpening ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Opening...
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <Package2 className="h-3 w-3" />
                                    Open Pack
                                  </div>
                                )}
                              </Button>
                            );
                          })}
                          
                          {packs.length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              +{packs.length - 3} more packs
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {packs.length === 0 && (
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground">No packs available</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
      
      {/* Pack Opening Animation */}
      {showAnimation && packOpenData && (
        <PackOpeningAnimation
          packCards={packOpenData.packCards}
          hitCardPosition={packOpenData.hitCardPosition}
          onComplete={handleAnimationComplete}
          packType={packOpenData.packCards?.[packOpenData.hitCardPosition]?.tier ? getPackTypeDisplay(packOpenData.packCards[packOpenData.hitCardPosition].tier).name : 'Unknown Pack'}
        />
      )}
    </>
  );
}