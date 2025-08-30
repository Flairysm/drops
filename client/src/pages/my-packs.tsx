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

  // Pixel art Pokemon ball component
  const PixelPokeBall = ({ packType, size = 'large' }: { packType: string; size?: 'small' | 'large' }) => {
    const display = getPackTypeDisplay(packType);
    const isSmall = size === 'small';
    const ballSize = isSmall ? 'w-16 h-16' : 'w-24 h-24';
    
    return (
      <div className={`${ballSize} mx-auto relative`}>
        <div className={`w-full h-full rounded-full bg-gradient-to-b ${display.color} ${display.borderColor} border-4 shadow-lg relative overflow-hidden`}>
          {/* Top half highlight */}
          <div className="absolute top-1 left-1 right-1 h-1/3 bg-white/30 rounded-full blur-sm" />
          
          {/* Center band */}
          <div className="absolute top-1/2 left-0 right-0 h-2 bg-black transform -translate-y-1/2" />
          
          {/* Center button */}
          <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-white border-2 border-black rounded-full transform -translate-x-1/2 -translate-y-1/2">
            <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-gray-300 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          
          {/* Pixel effect overlay */}
          <div className="absolute inset-0 opacity-20" style={{
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 1px,
              rgba(0,0,0,0.1) 1px,
              rgba(0,0,0,0.1) 2px
            ), repeating-linear-gradient(
              90deg,
              transparent,
              transparent 1px,
              rgba(0,0,0,0.1) 1px,
              rgba(0,0,0,0.1) 2px
            )`
          }} />
        </div>
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
                <PixelPokeBall packType="pokeball" size="large" />
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
            /* Pack Tiers Grid */
            <div className="space-y-8">
              {packTiers.map((tier) => {
                const packs = groupedPacks[tier] || [];
                if (packs.length === 0) return null;
                
                const packDisplay = getPackTypeDisplay(tier);
                
                return (
                  <div key={tier} className={`gaming-card p-6 rounded-xl ${packDisplay.bgColor} ${packDisplay.borderColor} border-2`}>
                    <div className="flex items-center gap-4 mb-6">
                      <PixelPokeBall packType={tier} size="small" />
                      <div className="flex-1">
                        <h2 className={`text-2xl font-gaming font-bold ${packDisplay.textColor}`}>
                          {packDisplay.name}s
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {packDisplay.tier} • {packs.length} pack{packs.length !== 1 ? 's' : ''} available
                        </p>
                      </div>
                      <Badge className={`${packDisplay.textColor} text-lg px-3 py-1`} variant="outline">
                        {packs.length}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {packs.map((pack: any) => {
                        const isOpening = openingPack === pack.id;
                        
                        return (
                          <Card key={pack.id} className="gaming-card hover:scale-105 transition-all duration-300 bg-white/80 backdrop-blur-sm">
                            <CardContent className="p-4 text-center">
                              <PixelPokeBall packType={tier} size="small" />
                              
                              <div className="mt-3 space-y-2">
                                <p className="text-xs text-muted-foreground">
                                  Earned: {new Date(pack.earnedAt).toLocaleDateString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  From: {pack.earnedFrom}
                                </p>
                              </div>
                              
                              <Button 
                                onClick={() => handleOpenPack(pack.id)}
                                disabled={isOpening}
                                className={`w-full mt-3 bg-gradient-to-r ${packDisplay.color} text-white hover:opacity-90 transition-opacity`}
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
                                    Open
                                  </div>
                                )}
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pack Statistics and Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pack Statistics */}
            <div className="gaming-card p-6 rounded-xl">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Pack Statistics
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {packTiers.map((tier) => {
                  const packs = groupedPacks[tier] || [];
                  const packDisplay = getPackTypeDisplay(tier);
                  
                  return (
                    <div key={tier} className={`p-3 rounded-lg ${packDisplay.bgColor} ${packDisplay.borderColor} border`}>
                      <div className="flex items-center gap-2 mb-2">
                        <PixelPokeBall packType={tier} size="small" />
                        <div className="ml-2">
                          <p className={`font-semibold text-sm ${packDisplay.textColor}`}>
                            {packDisplay.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {packDisplay.tier}
                          </p>
                        </div>
                      </div>
                      <p className={`text-2xl font-bold ${packDisplay.textColor}`}>
                        {packs.length}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Pack Information */}
            <div className="gaming-card p-6 rounded-xl">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Package2 className="h-5 w-5 text-primary" />
                How It Works
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Play Plinko to Earn</p>
                    <p className="text-muted-foreground">Different landing zones give different tier packs</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Package2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">One Card Per Pack</p>
                    <p className="text-muted-foreground">Each pack contains one card with weighted probabilities</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Gift className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Auto-Vault Storage</p>
                    <p className="text-muted-foreground">Opened cards automatically go to your vault</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
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