import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { GlobalFeed } from "@/components/GlobalFeed";
import { CreditPurchase } from "@/components/CreditPurchase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Play, Package, Coins, TrendingUp } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
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

  const { data: userData } = useQuery({
    queryKey: ["/api/auth/user"],
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

  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"],
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

  const games = [
    {
      name: "Plinko Drop",
      description: "Drop your credit down the board",
      cost: "1.0",
      icon: <Play className="w-5 h-5" />,
      color: "from-primary to-accent",
    },
    {
      name: "Wheel Spin", 
      description: "Spin the wheel of fortune",
      cost: "2.5",
      icon: <TrendingUp className="w-5 h-5" />,
      color: "from-uncommon to-rare",
    },
    {
      name: "Virtual Pack",
      description: "Open BNW booster packs",
      cost: "4.99",
      icon: <Package className="w-5 h-5" />,
      color: "from-superrare to-legendary",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Welcome Section */}
          <section className="py-8">
            <div className="text-center mb-8">
              <h1 className="font-gaming font-bold text-4xl md:text-5xl mb-4">
                <span className="bg-gradient-to-r from-primary via-accent to-legendary bg-clip-text text-transparent">
                  Welcome Back, {userData?.username || "Player"}!
                </span>
              </h1>
              <p className="text-muted-foreground text-lg">
                Ready to discover your next legendary card?
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="gaming-card">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-primary/20 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <Coins className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-primary" data-testid="text-user-credits">
                    {userData?.credits || "0.00"}
                  </div>
                  <div className="text-sm text-muted-foreground">Available Credits</div>
                </CardContent>
              </Card>

              <Card className="gaming-card">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-accent/20 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <Package className="w-6 h-6 text-accent" />
                  </div>
                  <div className="text-2xl font-bold text-accent" data-testid="text-total-cards">
                    {stats?.totalCards || "0"}
                  </div>
                  <div className="text-sm text-muted-foreground">Cards Available</div>
                </CardContent>
              </Card>

              <Card className="gaming-card">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-legendary/20 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-legendary" />
                  </div>
                  <div className="text-2xl font-bold text-legendary" data-testid="text-total-users">
                    {stats?.totalUsers || "0"}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Players</div>
                </CardContent>
              </Card>

              <Card className="gaming-card">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-superrare/20 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <Coins className="w-6 h-6 text-superrare" />
                  </div>
                  <div className="text-2xl font-bold text-superrare" data-testid="text-total-spent">
                    RM {userData?.totalSpent || "0.00"}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Spent</div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Quick Play Section */}
          <section className="py-8">
            <div className="text-center mb-8">
              <h2 className="font-gaming font-bold text-3xl mb-4">Quick Play</h2>
              <p className="text-muted-foreground">Jump into your favorite games instantly</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {games.map((game, index) => (
                <Card key={index} className="gaming-card hover:glow-effect transition-all transform hover:scale-105">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${game.color} mx-auto mb-4 flex items-center justify-center`}>
                        {game.icon}
                      </div>
                      <h3 className="font-gaming font-bold text-xl mb-2">{game.name}</h3>
                      <p className="text-muted-foreground mb-4">{game.description}</p>
                      <Badge variant="secondary" className="mb-4">
                        {game.cost} Credits
                      </Badge>
                      <Link href="/games">
                        <Button 
                          className={`w-full bg-gradient-to-r ${game.color} hover:glow-effect transition-all`}
                          data-testid={`button-quick-play-${game.name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          Play Now
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <Link href="/games">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-primary to-accent hover:glow-effect"
                  data-testid="button-view-all-games"
                >
                  View All Games
                </Button>
              </Link>
            </div>
          </section>

          {/* Layout: Global Feed & Credit Purchase */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Global Feed */}
            <section>
              <Card className="gaming-card">
                <CardHeader>
                  <CardTitle className="font-gaming">Global Feed</CardTitle>
                </CardHeader>
                <CardContent>
                  <GlobalFeed limit={10} />
                </CardContent>
              </Card>
            </section>

            {/* Credit Purchase */}
            <section>
              <Card className="gaming-card">
                <CardHeader>
                  <CardTitle className="font-gaming">Get More Credits</CardTitle>
                </CardHeader>
                <CardContent>
                  <CreditPurchase />
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
