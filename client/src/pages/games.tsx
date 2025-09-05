import { useEffect, useState } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { NavigationFooter } from "@/components/NavigationFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { CreditCard, Package, Circle, RotateCcw } from "lucide-react";
import { VirtualPackOpening } from "@/components/VirtualPackOpening";
import { apiRequest } from "@/lib/queryClient";
import type { VirtualPack, User } from "@shared/schema";

export default function Play() {
  const { toast } = useToast();
  const { user, isAuthenticated, loading } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const [openingPack, setOpeningPack] = useState<VirtualPack | null>(null);

  const { data: virtualPacks } = useQuery({
    queryKey: ["/api/virtual-packs"],
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

    const userCredits = parseFloat(user?.user_metadata?.credits || '0');
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


  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
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
  }, [isAuthenticated, loading, toast]);


  if (loading) {
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
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto">Discover our catalogue of games and stand a chance to win top-tier cards</p>
          </section>

          {/* Game Categories */}
          <div className="space-y-8">
            {/* Minigames Section */}
            <section>
              <h2 className="font-gaming text-3xl text-center mb-6">
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Minigames</span>
              </h2>
              <div className="flex overflow-x-auto scrollbar-hide gap-4 pb-4 snap-x snap-mandatory max-w-4xl mx-auto">
                <Card className="gaming-card hover:scale-105 transition-transform cursor-pointer flex-shrink-0 w-80" data-testid="card-plinko">
                  <CardHeader className="text-center">
                    <div className="w-full h-32 mb-4 rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20 relative flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                        <Circle className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <CardTitle className="font-gaming text-xl">Plinko Drop</CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      Drop, Bounce, Win!
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
                
                <Card className="gaming-card hover:scale-105 transition-transform cursor-pointer flex-shrink-0 w-80" data-testid="card-wheel">
                  <CardHeader className="text-center">
                    <div className="w-full h-32 mb-4 rounded-lg bg-gradient-to-br from-yellow-600/20 to-red-600/20 relative flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-yellow-500 to-red-500 flex items-center justify-center">
                        <RotateCcw className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <CardTitle className="font-gaming text-xl">Wheel Spin</CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      Spin and Win!
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center space-y-2">
                      <div className="bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg p-3 border border-primary/30">
                        <div className="text-2xl font-bold text-primary">20 Credits</div>
                        <div className="text-sm text-muted-foreground">
                          Per spin
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <Badge className="bg-purple-600 text-white">
                          Win Mystery Packs
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
                
                {/* Minesweeper Game */}
                <Card className="gaming-card hover:scale-105 transition-transform cursor-pointer flex-shrink-0 w-80" data-testid="card-minesweeper">
                  <CardHeader className="text-center">
                    <div className="w-full h-32 mb-4 rounded-lg bg-gradient-to-br from-green-600/20 to-emerald-600/20 relative flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                        <Package className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <CardTitle className="font-gaming text-xl">Minesweeper</CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      Find the Greens, Avoid the Bombs!
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center space-y-2">
                      <div className="bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg p-3 border border-primary/30">
                        <div className="text-2xl font-bold text-primary">
                          20 Credits
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Per game
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <Badge className="bg-purple-600 text-white">
                          Win Mystery Packs
                        </Badge>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => window.location.href = '/play/minesweeper'}
                      className="w-full bg-gradient-to-r from-primary to-accent"
                      data-testid="button-play-minesweeper"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Play Minesweeper
                    </Button>
                  </CardContent>
                </Card>
              </div>
              
              {/* Scroll Hint */}
              <div className="text-center mt-4 text-sm text-muted-foreground">
                <span className="hidden md:inline">← Scroll to see more games →</span>
                <span className="md:hidden">← Swipe to see more games →</span>
              </div>
            </section>
            
            {/* Special Packs Section */}
            <section>
              <h2 className="font-gaming text-3xl text-center mb-6">
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Special Packs</span>
              </h2>
              <div className="flex overflow-x-auto scrollbar-hide gap-4 pb-4 snap-x snap-mandatory max-w-4xl mx-auto">
                <Card className="gaming-card hover:scale-105 transition-transform cursor-pointer opacity-50 flex-shrink-0 w-80" data-testid="card-slabs">
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
                
                <Card className="gaming-card hover:scale-105 transition-transform cursor-pointer opacity-50 flex-shrink-0 w-80" data-testid="card-vintages">
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
              
              {/* Scroll Hint for Special Packs */}
              <div className="text-center mt-4 text-sm text-muted-foreground">
                <span className="hidden md:inline">← Scroll to see more packs →</span>
                <span className="md:hidden">← Swipe to see more packs →</span>
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
                <div className="flex overflow-x-auto scrollbar-hide gap-4 pb-4 snap-x snap-mandatory max-w-6xl mx-auto">
                  {virtualPacks.filter((pack: any) => pack.isActive).map((pack: any) => (
                    <Card key={pack.id} className="gaming-card hover:scale-105 transition-transform cursor-pointer flex-shrink-0 w-80" data-testid={`card-themed-pack-${pack.id}`}>
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
                        
                        <Button
                          onClick={() => handlePurchase(pack)}
                          disabled={!user || parseFloat(user?.user_metadata?.credits || '0') < parseFloat(pack.price)}
                          className="w-full bg-gradient-to-r from-primary to-accent"
                          data-testid={`button-open-themed-pack-${pack.id}`}
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Open Pack
                        </Button>
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
              
              {/* Scroll Hint for Themed Packs */}
              <div className="text-center mt-4 text-sm text-muted-foreground">
                <span className="hidden md:inline">← Scroll to see more packs →</span>
                <span className="md:hidden">← Swipe to see more packs →</span>
              </div>
            </section>
          </div>



        </div>
      </main>
      <NavigationFooter />
    </div>
  );
}
