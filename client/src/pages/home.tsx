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
                  Drops
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
                &copy; 2025 Drops. Built for collectors, by collectors.
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
      description: "Drop, Bounce, Win!",
      cost: "20",
      icon: <Play className="w-8 h-8 text-white" />,
      color: "from-blue-500 to-purple-600",
      route: "/play/plinko",
      popular: true,
    },
    {
      name: "Wheel Spin", 
      description: "Spin and Win!",
      cost: "20",
      icon: <RotateCcw className="w-8 h-8 text-white" />,
      color: "from-orange-500 to-red-600",
      route: "/play/wheel",
      popular: true,
    },
    {
      name: "Classic Packs",
      description: "Rip some classic packs",
      cost: "16",
      icon: <Package className="w-8 h-8 text-white" />,
      color: "from-green-500 to-emerald-600",
      route: "/play/themed-packs",
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

          {/* Games Collection - FIRST PRIORITY */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Gamepad2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-gaming font-bold text-3xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Quick Play
                  </h2>
                  <p className="text-muted-foreground">Choose your adventure and win amazing cards</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 dark:from-orange-900 dark:to-red-900 dark:text-orange-200 px-4 py-2 text-sm font-medium">
                🔥 All Games Available
              </Badge>
            </div>

            {/* Enhanced grid layout for all 3 games */}
            <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-6 mb-8">
              {games.map((game, index) => (
                <Card key={index} className="gaming-card hover:glow-effect transition-all duration-300 transform hover:scale-[1.05] hover:-translate-y-2 group border-2 hover:border-primary/50 relative overflow-hidden">
                  {/* Popular badge for featured games */}
                  {game.popular && (
                    <div className="absolute top-4 right-4 z-10">
                      <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 shadow-lg">
                        <Star className="w-3 h-3 mr-1" />
                        Popular
                      </Badge>
                    </div>
                  )}
                  
                  {/* Animated background gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}></div>
                  
                  <CardContent className="p-6 relative">
                    <div className="text-center mb-6">
                      <div className={`w-16 h-16 sm:w-24 sm:h-24 mx-auto rounded-2xl sm:rounded-3xl bg-gradient-to-br ${game.color} flex items-center justify-center shadow-lg group-hover:shadow-2xl transition-all duration-300 mb-4 group-hover:scale-110`}>
                        {game.icon}
                      </div>
                      <h3 className="font-gaming font-bold text-lg sm:text-2xl mb-2 group-hover:text-primary transition-colors">
                        {game.name}
                      </h3>
                      <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-4">
                        {game.description}
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-center">
                        <Badge 
                          variant="outline" 
                          className={`text-sm sm:text-lg px-2 sm:px-4 py-1 sm:py-2 font-bold border-2 bg-gradient-to-r ${game.color} text-white border-transparent group-hover:shadow-lg transition-all`}
                        >
                          <Coins className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          {game.cost} Credits
                        </Badge>
                      </div>
                      
                      <Link href={game.route} className="block">
                        <Button 
                          size="default"
                          className={`w-full bg-gradient-to-r ${game.color} hover:glow-effect transition-all duration-300 text-sm sm:text-lg py-2 sm:py-3 font-bold shadow-lg hover:shadow-xl transform hover:scale-105`}
                          data-testid={`button-play-${game.name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                          {game.name === "Black Bolt" ? "Open Packs" : "Play Now"}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Enhanced call-to-action */}
            <div className="bg-gradient-to-r from-primary/10 via-accent/5 to-legendary/10 rounded-2xl p-8 text-center border border-primary/20">
              <div className="mb-4">
                <TrendingUp className="w-12 h-12 mx-auto text-primary mb-3" />
                <h3 className="font-gaming font-bold text-2xl mb-2">Ready for More Action?</h3>
                <p className="text-muted-foreground text-lg">
                  Explore additional game modes and special events in our games lobby
                </p>
              </div>
              <Link href="/play">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-lg px-10 py-4 border-2 border-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-105 font-bold"
                  data-testid="button-view-all-games"
                >
                  <Gamepad2 className="w-5 h-5 mr-2" />
                  Explore Games Lobby
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
              &copy; 2025 Drops. Built for collectors, by collectors.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
