import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "@/components/Navigation";
import { GlobalFeed } from "@/components/GlobalFeed";
import { CreditPurchase } from "@/components/CreditPurchase";
import { RecentPullsCarousel } from "@/components/RecentPullsCarousel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Play, Package, Coins, TrendingUp, Zap, RotateCcw, Gamepad2, Star } from "lucide-react";
import { Link } from "wouter";
import type { User } from "@shared/schema";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  const { data: userData } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: isAuthenticated,
  }) as { data: User | undefined };

  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Landing page for non-authenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <main className="pt-20">
          {/* Hero Section */}
          <section className="py-20 bg-gradient-to-b from-background via-primary/5 to-accent/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <div className="inline-flex items-center space-x-2 bg-primary/10 rounded-full px-4 py-2 mb-6">
                <Star className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Premium TCG Experience</span>
              </div>
              
              <h1 className="font-gaming font-bold text-4xl md:text-6xl lg:text-7xl mb-6">
                <span className="bg-gradient-to-r from-primary via-accent to-legendary bg-clip-text text-transparent">
                  Flair TCG Arcade
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Experience the thrill of premium TCG pack opening with transparent odds, 
                unlimited vault storage, and exciting minigames.
              </p>
              
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Create an account to start earning cards and playing games!
              </p>
            </div>
          </section>
        
        {/* Recent Pulls for non-authenticated users */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <RecentPullsCarousel limit={10} />
          </div>
        </section>
        
        {/* Footer */}
        <footer className="bg-secondary/20 border-t border-border py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-muted-foreground">
                &copy; 2025 Flair TCG Arcade. Built for collectors, by collectors.
              </p>
            </div>
          </div>
        </footer>
      </main>
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
      cost: "20",
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

          {/* Recent Pulls Carousel - TOP PRIORITY */}
          <section className="mb-8">
            <RecentPullsCarousel limit={10} />
          </section>

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

        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-secondary/20 border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-muted-foreground">
              &copy; 2025 Flair TCG Arcade. Built for collectors, by collectors.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
