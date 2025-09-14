import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { NavigationFooter } from "@/components/NavigationFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Circle, RotateCcw } from "lucide-react";

export default function Play() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();


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



  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-20 pb-20">
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
            
          </div>



        </div>
      </main>
      <NavigationFooter />
    </div>
  );
}
