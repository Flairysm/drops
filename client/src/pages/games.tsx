import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { CreditCard, Package, Circle, RotateCcw, ChevronDown, ChevronUp, Eye, Sparkles } from "lucide-react";
import { VirtualPackOpening } from "@/components/VirtualPackOpening";
import { apiRequest } from "@/lib/queryClient";
import type { VirtualPack, User } from "@shared/schema";

export default function Play() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth() as { user: User | null; isLoading: boolean; isAuthenticated: boolean };
  const queryClient = useQueryClient();
  const [openingPack, setOpeningPack] = useState<VirtualPack | null>(null);
  const [expandedPacks, setExpandedPacks] = useState<Set<string>>(new Set());
  const [packCardPools, setPackCardPools] = useState<Record<string, any[]>>({});

  const { data: virtualPacks } = useQuery({
    queryKey: ["/api/virtual-packs"],
    enabled: isAuthenticated,
  });

  const { data: allCards } = useQuery({
    queryKey: ["/api/cards"],
    enabled: isAuthenticated,
  });

  const handlePurchase = (pack: VirtualPack) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to purchase packs",
        variant: "destructive",
      });
      return;
    }

    const userCredits = parseFloat(user.credits || '0');
    const packPrice = parseFloat(pack.price);
    if (userCredits < packPrice) {
      toast({
        title: "Insufficient Credits",
        description: `You need ${packPrice} credits but only have ${userCredits.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    // Show the opening interface instead of redirecting to store
    setOpeningPack(pack);
  };

  const togglePackExpansion = async (packId: string) => {
    const newExpanded = new Set(expandedPacks);
    
    if (expandedPacks.has(packId)) {
      newExpanded.delete(packId);
    } else {
      newExpanded.add(packId);
      
      // Load card pool if not already loaded
      if (!packCardPools[packId]) {
        try {
          const packCards = await apiRequest("GET", `/api/virtual-packs/${packId}/cards`);
          const cardDetails = await Promise.all(
            packCards.map(async (pc: any) => {
              const card = allCards?.find((c: any) => c.packType === 'virtual' && c.name === pc.name);
              return card ? { ...card, weight: pc.weight } : null;
            })
          );
          
          setPackCardPools(prev => ({
            ...prev,
            [packId]: cardDetails.filter(Boolean)
          }));
        } catch (error) {
          console.error("Failed to load pack cards:", error);
          toast({
            title: "Error",
            description: "Failed to load card pool",
            variant: "destructive",
          });
        }
      }
    }
    
    setExpandedPacks(newExpanded);
  };

  const getTierColor = (tier: string) => {
    const colors = {
      'D': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      'C': 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200',
      'B': 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200',
      'A': 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200',
      'S': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200',
      'SS': 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-200',
      'SSS': 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200'
    };
    return colors[tier as keyof typeof colors] || colors['D'];
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show opening interface if a pack is selected
  if (openingPack) {
    return (
      <VirtualPackOpening 
        packId={openingPack.id}
        packName={openingPack.name}
        onClose={() => setOpeningPack(null)}
      />
    );
  }

  const tierData = [
    { tier: "C", name: "Common", color: "common", odds: "65.0%" },
    { tier: "UC", name: "Uncommon", color: "uncommon", odds: "25.0%" },
    { tier: "R", name: "Rare", color: "rare", odds: "8.0%" },
    { tier: "SR", name: "Super Rare", color: "superrare", odds: "1.8%" },
    { tier: "SSS", name: "Legendary", color: "legendary", odds: "0.2%" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <section className="py-8 text-center">
            <h1 className="font-gaming font-bold text-4xl md:text-5xl mb-4">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">ARCADE</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
              Discover our catalog of games and themed packs. Choose your adventure and test your luck!
            </p>
          </section>

          {/* Game Categories */}
          <div className="space-y-8">
            {/* Minigames Section */}
            <section>
              <h2 className="font-gaming text-3xl text-center mb-6">
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Minigames</span>
              </h2>
              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                <Card className="gaming-card hover:scale-105 transition-transform cursor-pointer" data-testid="card-plinko">
                  <CardHeader className="text-center">
                    <div className="w-full h-32 mb-4 rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20 relative flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                        <Circle className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <CardTitle className="font-gaming text-xl">Plinko Drop</CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      Drop balls and watch them bounce through pegs
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center space-y-2">
                      <div className="bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg p-3 border border-primary/30">
                        <div className="text-2xl font-bold text-primary">
                          20 Credits
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Per play
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <Badge className="bg-purple-600 text-white">
                          Win Mystery Packs
                        </Badge>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => window.location.href = '/play/plinko'}
                      className="w-full bg-gradient-to-r from-primary to-accent"
                      data-testid="button-play-plinko"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Play Plinko
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="gaming-card hover:scale-105 transition-transform cursor-pointer" data-testid="card-wheel">
                  <CardHeader className="text-center">
                    <div className="w-full h-32 mb-4 rounded-lg bg-gradient-to-br from-yellow-600/20 to-red-600/20 relative flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-yellow-500 to-red-500 flex items-center justify-center">
                        <RotateCcw className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <CardTitle className="font-gaming text-xl">Wheel Spin</CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      Spin the wheel of fortune for bonus rewards
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center space-y-2">
                      <div className="bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg p-3 border border-primary/30">
                        <div className="text-2xl font-bold text-primary">
                          2.5 Credits
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Per spin
                        </div>
                      </div>
                      <div className="flex justify-center space-x-2">
                        <Badge className="bg-legendary text-primary-foreground">
                          Win Mystery Packs
                        </Badge>
                        <Badge className="bg-superrare text-primary-foreground">
                          2x Multiplier
                        </Badge>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => window.location.href = '/play/wheel'}
                      className="w-full bg-gradient-to-r from-primary to-accent"
                      data-testid="button-play-wheel"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Play Wheel
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </section>
            
            {/* Special Packs Section */}
            <section>
              <h2 className="font-gaming text-3xl text-center mb-6">
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Special Packs</span>
              </h2>
              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                <Card className="gaming-card hover:scale-105 transition-transform cursor-pointer opacity-50" data-testid="card-slabs">
                  <CardHeader className="text-center">
                    <CardTitle className="font-gaming text-xl">Slabs Collection</CardTitle>
                    <Badge variant="outline">Coming Soon</Badge>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-muted-foreground mb-4">Premium graded cards in protective cases.</p>
                    <button className="bg-muted text-muted-foreground px-4 py-2 rounded-md w-full" disabled data-testid="button-slabs-disabled">
                      Coming Soon
                    </button>
                  </CardContent>
                </Card>
                
                <Card className="gaming-card hover:scale-105 transition-transform cursor-pointer opacity-50" data-testid="card-vintages">
                  <CardHeader className="text-center">
                    <CardTitle className="font-gaming text-xl">Vintage Collection</CardTitle>
                    <Badge variant="outline">Coming Soon</Badge>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-muted-foreground mb-4">Rare vintage cards from classic sets.</p>
                    <button className="bg-muted text-muted-foreground px-4 py-2 rounded-md w-full" disabled data-testid="button-vintages-disabled">
                      Coming Soon
                    </button>
                  </CardContent>
                </Card>
              </div>
            </section>
            
            {/* Themed Packs Section */}
            <section>
              <h2 className="font-gaming text-3xl text-center mb-6">
                <span className="bg-gradient-to-r from-legendary to-primary bg-clip-text text-transparent">Themed Packs</span>
              </h2>
              <div className="text-center mb-8">
                <h3 className="font-gaming mb-2 text-[26px]">
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">CLASSIC PACKS</span>
                </h3>
                <p className="text-muted-foreground max-w-2xl mx-auto">Experience Rip and Ship in a whole new way with virtual packs</p>
              </div>
              
              {virtualPacks && Array.isArray(virtualPacks) && virtualPacks.length > 0 ? (
                <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
                  {virtualPacks.filter((pack: any) => pack.isActive).map((pack: any) => (
                    <Card key={pack.id} className="gaming-card" data-testid={`card-themed-pack-${pack.id}`}>
                      <CardHeader className="text-center">
                        {pack.imageUrl && (
                          <div className="w-full h-32 mb-4 rounded-lg overflow-hidden">
                            <img 
                              src={pack.imageUrl} 
                              alt={pack.name}
                              className="w-full h-full object-cover"
                              data-testid={`img-themed-pack-${pack.id}`}
                            />
                          </div>
                        )}
                        <CardTitle className="font-gaming text-xl" data-testid={`text-themed-pack-name-${pack.id}`}>
                          {pack.name}
                        </CardTitle>
                        {pack.description && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {pack.description}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-center space-y-2">
                          <div className="bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg p-3 border border-primary/30">
                            <div className="text-2xl font-bold text-primary">
                              {pack.price} Credits
                            </div>
                            <div className="text-sm text-muted-foreground">
                              8 Cards per pack
                            </div>
                          </div>
                          <div className="flex justify-center space-x-2">
                            <Badge className="bg-accent text-primary-foreground">7 Commons + 1 Chance Card</Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <Button
                            onClick={() => handlePurchase(pack)}
                            disabled={!user || parseFloat(user.credits || '0') < parseFloat(pack.price)}
                            className="w-full bg-gradient-to-r from-primary to-accent"
                            data-testid={`button-open-themed-pack-${pack.id}`}
                          >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Open Pack
                          </Button>

                          <Collapsible open={expandedPacks.has(pack.id)} onOpenChange={() => togglePackExpansion(pack.id)}>
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full"
                                data-testid={`button-view-cards-${pack.id}`}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Card Pool
                                {expandedPacks.has(pack.id) ? 
                                  <ChevronUp className="w-4 h-4 ml-2" /> : 
                                  <ChevronDown className="w-4 h-4 ml-2" />
                                }
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-2 mt-3">
                              {packCardPools[pack.id] ? (
                                <div className="space-y-3">
                                  <div className="text-center">
                                    <div className="flex items-center justify-center space-x-2 mb-2">
                                      <Sparkles className="w-4 h-4 text-primary" />
                                      <span className="text-sm font-medium text-primary">Available Cards</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {packCardPools[pack.id].length} cards in this pack
                                    </p>
                                  </div>
                                  
                                  <div className="max-h-48 overflow-y-auto space-y-2 bg-muted/30 rounded-lg p-3">
                                    {packCardPools[pack.id]
                                      .sort((a, b) => {
                                        const tierOrder = { 'SSS': 6, 'SS': 5, 'S': 4, 'A': 3, 'B': 2, 'C': 1, 'D': 0 };
                                        return (tierOrder[b.tier as keyof typeof tierOrder] || 0) - (tierOrder[a.tier as keyof typeof tierOrder] || 0);
                                      })
                                      .map((card: any, index: number) => (
                                      <div key={index} className="flex items-center justify-between p-2 bg-background/50 rounded border">
                                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                                          <div className="w-8 h-8 bg-gradient-to-br from-muted to-muted/60 rounded flex items-center justify-center flex-shrink-0">
                                            {card.imageUrl ? (
                                              <img
                                                src={card.imageUrl}
                                                alt={card.name}
                                                className="w-full h-full object-cover rounded"
                                              />
                                            ) : (
                                              <Package className="w-3 h-3 text-muted-foreground" />
                                            )}
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <div className="font-medium text-sm truncate">{card.name}</div>
                                            <div className="text-xs text-muted-foreground">{card.marketValue} credits</div>
                                          </div>
                                        </div>
                                        <Badge 
                                          className={`text-xs ${getTierColor(card.tier)} border-0 flex-shrink-0`}
                                          data-testid={`badge-tier-${card.tier}`}
                                        >
                                          {card.tier}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-4">
                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                                  <p className="text-sm text-muted-foreground mt-2">Loading cards...</p>
                                </div>
                              )}
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 max-w-md mx-auto">
                  <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Themed Packs Available</h3>
                  <p className="text-muted-foreground">
                    Check back later for exclusive themed pack collections!
                  </p>
                </div>
              )}
            </section>
          </div>



        </div>
      </main>
    </div>
  );
}
