import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { PlinkoGame } from "@/components/PlinkoGame";
import { WheelGame } from "@/components/WheelGame";
import { PackOpening } from "@/components/PackOpening";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Games() {
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

  const { data: packs } = useQuery({
    queryKey: ["/api/packs"],
    enabled: isAuthenticated,
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
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
    },
  });

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
              <span className="bg-gradient-to-r from-primary via-accent to-legendary bg-clip-text text-transparent">
                GAME ARCADE
              </span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
              Choose your game and test your luck! Each game offers unique mechanics to discover amazing cards.
            </p>
          </section>

          {/* Games Tabs */}
          <Tabs defaultValue="plinko" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8">
              <TabsTrigger value="plinko" data-testid="tab-plinko">Plinko</TabsTrigger>
              <TabsTrigger value="wheel" data-testid="tab-wheel">Wheel</TabsTrigger>
              <TabsTrigger value="pack" data-testid="tab-pack">Pack</TabsTrigger>
            </TabsList>

            <TabsContent value="plinko">
              <Card className="gaming-card max-w-4xl mx-auto">
                <CardHeader className="text-center">
                  <CardTitle className="font-gaming text-2xl">Plinko Drop</CardTitle>
                  <div className="flex justify-center space-x-4 mt-4">
                    <Badge className="bg-legendary text-primary-foreground">Max: SSS Tier</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <PlinkoGame />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="wheel">
              <Card className="gaming-card max-w-4xl mx-auto">
                <CardHeader className="text-center">
                  <CardTitle className="font-gaming text-2xl">Wheel Spin</CardTitle>
                  <div className="flex justify-center space-x-4 mt-4">
                    <Badge variant="secondary">Cost: 2.5 Credits</Badge>
                    <Badge className="bg-superrare text-primary-foreground">Bonus: 2x Multiplier</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <WheelGame />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pack">
              <Card className="gaming-card max-w-4xl mx-auto">
                <CardHeader className="text-center">
                  <CardTitle className="font-gaming text-2xl">Virtual Pack Opening</CardTitle>
                  <div className="flex justify-center space-x-4 mt-4">
                    <Badge variant="secondary">Cost: 4.99 Credits</Badge>
                    <Badge className="bg-accent text-primary-foreground">10 Cards Total</Badge>
                    <Badge className="bg-primary text-primary-foreground">BNW Only</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <PackOpening packs={packs || []} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Odds Transparency */}
          <section className="py-8">
            <Card className="gaming-card">
              <CardHeader>
                <CardTitle className="font-gaming text-center text-2xl">Transparent Odds</CardTitle>
                <p className="text-center text-muted-foreground">
                  All probabilities are publicly available and regularly audited
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {tierData.map((tier) => (
                    <div 
                      key={tier.tier}
                      className={`text-center p-4 rounded-lg bg-gradient-to-b from-${tier.color}/20 to-transparent border border-${tier.color}/50`}
                      data-testid={`odds-${tier.color}`}
                    >
                      <div className={`tier-glow-${tier.color} w-12 h-12 rounded-full bg-${tier.color}/20 mx-auto mb-2 flex items-center justify-center`}>
                        <span className={`font-bold tier-${tier.color}`}>{tier.tier}</span>
                      </div>
                      <div className={`text-sm font-semibold tier-${tier.color}`}>{tier.name}</div>
                      <div className="text-xs text-muted-foreground">{tier.odds}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Game Rules */}
          <section className="py-8">
            <Card className="gaming-card">
              <CardHeader>
                <CardTitle className="font-gaming text-center text-2xl">Game Rules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <h3 className="font-semibold text-lg mb-2 text-primary">Fair Play</h3>
                    <p className="text-sm text-muted-foreground">
                      All games use verified random number generation. No manipulation or rigged outcomes.
                    </p>
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-lg mb-2 text-accent">Crash Recovery</h3>
                    <p className="text-sm text-muted-foreground">
                      If a game is interrupted, your result is safely stored and will be delivered automatically.
                    </p>
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-lg mb-2 text-legendary">Instant Delivery</h3>
                    <p className="text-sm text-muted-foreground">
                      Cards are added to your vault immediately. Check your collection anytime in the Vault section.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}
