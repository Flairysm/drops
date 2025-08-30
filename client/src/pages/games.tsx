import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";

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
              <span className="bg-gradient-to-r from-primary via-accent to-legendary bg-clip-text text-transparent">ARCADE</span>
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
                    <CardTitle className="font-gaming text-xl">Plinko Drop</CardTitle>
                    <Badge className="bg-legendary text-primary-foreground">Max: SSS Tier</Badge>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-muted-foreground mb-4">Drop balls and watch them bounce to win amazing cards!</p>
                    <button 
                      className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md w-full transition-colors" 
                      onClick={() => window.location.href = '/play/plinko'}
                      data-testid="button-play-plinko"
                    >
                      Play Plinko
                    </button>
                  </CardContent>
                </Card>
                
                <Card className="gaming-card hover:scale-105 transition-transform cursor-pointer" data-testid="card-wheel">
                  <CardHeader className="text-center">
                    <CardTitle className="font-gaming text-xl">Wheel Spin</CardTitle>
                    <div className="flex justify-center space-x-2">
                      <Badge variant="secondary">2.5 Credits</Badge>
                      <Badge className="bg-superrare text-primary-foreground">2x Multiplier</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-muted-foreground mb-4">Spin the wheel of fortune for bonus rewards!</p>
                    <button 
                      className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md w-full transition-colors" 
                      onClick={() => window.location.href = '/play/wheel'}
                      data-testid="button-play-wheel"
                    >
                      Play Wheel
                    </button>
                  </CardContent>
                </Card>
              </div>
            </section>
            
            {/* Special Packs Section */}
            <section>
              <h2 className="font-gaming text-3xl text-center mb-6">
                <span className="bg-gradient-to-r from-accent to-legendary bg-clip-text text-transparent">Special Packs</span>
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
            
            {/* Classic Packs Section */}
            <section>
              <h2 className="font-gaming text-3xl text-center mb-6">
                <span className="bg-gradient-to-r from-legendary to-primary bg-clip-text text-transparent">Classic Packs</span>
              </h2>
              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                <Card className="gaming-card hover:scale-105 transition-transform cursor-pointer" data-testid="card-mystery-packs">
                  <CardHeader className="text-center">
                    <CardTitle className="font-gaming text-xl">Mystery Packs</CardTitle>
                    <div className="flex justify-center space-x-2">
                      <Badge variant="secondary">4.99 Credits</Badge>
                      <Badge className="bg-accent text-primary-foreground">10 Cards</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-muted-foreground mb-4">Random packs with surprise card collections!</p>
                    <button 
                      className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md w-full transition-colors" 
                      onClick={() => window.location.href = '/play/mystery-packs'}
                      data-testid="button-play-mystery"
                    >
                      Open Mystery Pack
                    </button>
                  </CardContent>
                </Card>
                
                <Card className="gaming-card hover:scale-105 transition-transform cursor-pointer" data-testid="card-themed-packs">
                  <CardHeader className="text-center">
                    <CardTitle className="font-gaming text-xl">Themed Packs</CardTitle>
                    <div className="flex justify-center space-x-2">
                      <Badge className="bg-legendary text-primary-foreground">Curated</Badge>
                      <Badge variant="secondary">Variable Price</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-muted-foreground mb-4">Curated collections like Black Bolt and more!</p>
                    <button 
                      className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md w-full transition-colors" 
                      onClick={() => window.location.href = '/play/themed-packs'}
                      data-testid="button-play-themed"
                    >
                      Browse Themed Packs
                    </button>
                  </CardContent>
                </Card>
              </div>
            </section>
          </div>



        </div>
      </main>
    </div>
  );
}
