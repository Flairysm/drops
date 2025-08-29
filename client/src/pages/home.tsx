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
import { Play, Package, Coins, TrendingUp, Zap, RotateCcw, Gamepad2 } from "lucide-react";
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
      description: "Drop balls, win packs! Physics-based excitement",
      cost: "20",
      icon: <Play className="w-8 h-8 text-white" />,
      color: "from-blue-500 to-purple-600",
      route: "/games",
      popular: true,
    },
    {
      name: "Wheel Spin", 
      description: "Spin for multipliers and bonus rewards",
      cost: "10",
      icon: <RotateCcw className="w-8 h-8 text-white" />,
      color: "from-orange-500 to-red-600",
      route: "/games",
      popular: true,
    },
    {
      name: "Virtual Pack",
      description: "Open premium card packs instantly",
      cost: "15",
      icon: <Package className="w-8 h-8 text-white" />,
      color: "from-green-500 to-emerald-600",
      route: "/my-packs",
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Credits Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-gaming font-bold text-3xl mb-2">
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Hey {userData?.firstName || "Player"}! 👋
                </span>
              </h1>
              <p className="text-muted-foreground">Time to win some cards</p>
            </div>
            <Card className="gaming-card">
              <CardContent className="p-4 flex items-center space-x-3">
                <Coins className="w-6 h-6 text-yellow-500" />
                <div className="text-right">
                  <div className="text-2xl font-bold text-yellow-500" data-testid="text-user-credits">
                    {userData?.credits || "0"}
                  </div>
                  <div className="text-xs text-muted-foreground">Credits</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Popular Games - FIRST PRIORITY */}
          <section className="mb-12">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h2 className="font-gaming font-bold text-3xl">Popular Games</h2>
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                Most played
              </Badge>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {games.filter(game => game.popular).map((game, index) => (
                <Card key={index} className="gaming-card hover:glow-effect transition-all transform hover:scale-[1.02] group border-2">
                  <CardContent className="p-8">
                    <div className="flex items-center space-x-6">
                      <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${game.color} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all`}>
                        {game.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-gaming font-bold text-2xl mb-2">{game.name}</h3>
                        <p className="text-muted-foreground mb-4 text-lg">{game.description}</p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-lg px-3 py-1">
                            {game.cost} Credits
                          </Badge>
                          <Link href={game.route}>
                            <Button 
                              size="lg"
                              className={`bg-gradient-to-r ${game.color} hover:glow-effect transition-all text-lg px-8`}
                              data-testid={`button-play-${game.name.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              <Gamepad2 className="w-5 h-5 mr-2" />
                              Play Now
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <Link href="/games">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-lg px-8 py-3 border-2 hover:bg-primary hover:text-primary-foreground"
                  data-testid="button-view-all-games"
                >
                  View All Games
                </Button>
              </Link>
            </div>
          </section>

          {/* Get More Credits - SECOND PRIORITY */}
          <section className="mb-12">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                <Coins className="w-5 h-5 text-white" />
              </div>
              <h2 className="font-gaming font-bold text-3xl">Get More Credits</h2>
            </div>
            
            <Card className="gaming-card border-2 border-green-200 dark:border-green-700">
              <CardContent className="p-8">
                <CreditPurchase />
              </CardContent>
            </Card>
          </section>

          {/* Layout: Additional Games & Feed */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* More Games */}
            <section>
              <Card className="gaming-card">
                <CardHeader>
                  <CardTitle className="font-gaming">More Games</CardTitle>
                </CardHeader>
                <CardContent>
                  {games.filter(game => !game.popular).map((game, index) => (
                    <div key={index} className="flex items-center space-x-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${game.color} flex items-center justify-center`}>
                        <Package className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-gaming font-bold">{game.name}</h4>
                        <p className="text-sm text-muted-foreground">{game.description}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="mb-2">
                          {game.cost} Credits
                        </Badge>
                        <Link href={game.route}>
                          <Button size="sm" variant="outline">
                            Play
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            {/* Global Feed */}
            <section>
              <Card className="gaming-card">
                <CardHeader>
                  <CardTitle className="font-gaming">Live Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <GlobalFeed limit={8} />
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
