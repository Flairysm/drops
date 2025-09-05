import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "@/components/Navigation";
import { NavigationFooter } from "@/components/NavigationFooter";
import { GlobalFeed } from "@/components/GlobalFeed";
import { CreditPurchase } from "@/components/CreditPurchase";
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
      <div className="min-h-screen bg-background relative overflow-hidden">
        <Navigation />
        
        {/* Luxury Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Animated gradient orbs */}
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-accent/20 to-legendary/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-primary/10 to-accent/10 rounded-full blur-3xl animate-pulse delay-500"></div>
          
          {/* Floating particles */}
          <div className="absolute inset-0">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-accent/30 rounded-full animate-luxury-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${3 + Math.random() * 4}s`
                }}
              ></div>
            ))}
          </div>
        </div>
        
        {/* Hero Section - Futuristic Digital Artwork */}
        <section className="relative min-h-[90vh] flex items-center overflow-hidden">
            {/* Hero Background Image */}
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: "url('/assets/hero/futuristic-cards-hero.png')",
                backgroundAttachment: 'fixed'
              }}
            >
              {/* Dark overlay for text readability */}
              <div className="absolute inset-0 bg-black/40"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/40"></div>
            </div>
            
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                {/* Content */}
                <div className="text-center lg:text-left">
                  {/* Main Title */}
                  <h1 className="font-gaming font-black text-5xl md:text-7xl lg:text-8xl mb-6 text-white drop-shadow-2xl">
                    Drops
                  </h1>
                  
                  {/* Subtitle */}
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-6 leading-tight drop-shadow-xl">
                    Experience TCG collecting in a new way
                  </h2>
                  
                  {/* Description */}
                  <p className="text-lg md:text-xl text-gray-200 mb-6 leading-relaxed max-w-2xl drop-shadow-lg">
                    Play TCG themed minigames, open premium packs and collect rare cards
                  </p>
                  
                  {/* Free Credits Offer */}
                  <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-accent/20 to-primary/20 border border-accent/30 rounded-full px-6 py-3 mb-8 backdrop-blur-sm">
                    <Star className="w-5 h-5 text-accent" />
                    <span className="text-lg font-semibold text-accent tracking-wide">Sign up now and get 30 credit free</span>
                  </div>
                  
                  {/* CTA Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                    <Link href="/register">
                      <Button
                        size="lg"
                        className="bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 text-white border-0 rounded-lg px-8 py-4 text-lg font-semibold shadow-2xl hover:shadow-3xl transition-all duration-300 backdrop-blur-sm w-full sm:w-auto"
                      >
                        Create Account
                      </Button>
                    </Link>
                    <Link href="/login">
                      <Button
                        size="lg"
                        variant="outline"
                        className="bg-transparent border-2 border-white/30 hover:border-white/50 text-white hover:bg-white/10 rounded-lg px-8 py-4 text-lg font-semibold shadow-2xl hover:shadow-3xl transition-all duration-300 backdrop-blur-sm w-full sm:w-auto"
                      >
                        Login
                      </Button>
                    </Link>
                  </div>
                </div>
                
              </div>
            </div>
          </section>

          
        
      {/* Simple Footer */}
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

  // Authenticated user home page
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
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div>
              <h1 className="font-gaming font-bold text-xl sm:text-3xl mb-2">
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Hey {userData?.username || userData?.firstName || "Player"}! 👋
                </span>
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">Time to win some cards</p>
            </div>
            <Card className="gaming-card">
              <CardContent className="p-2 sm:p-4 flex items-center space-x-2 sm:space-x-3">
                <Coins className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-500" />
                <div className="text-right">
                  <div className="text-lg sm:text-2xl font-bold text-yellow-500" data-testid="text-user-credits">
                    {userData?.credits || "0"}
                  </div>
                  <div className="text-xs text-muted-foreground">Credits</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Games Collection - FIRST PRIORITY */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                  <Gamepad2 className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-gaming font-bold text-xl sm:text-3xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Quick Play
                  </h2>
                  <p className="text-muted-foreground text-sm sm:text-base">Choose your adventure and win amazing cards</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 dark:from-orange-900 dark:to-red-900 dark:text-orange-200 px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm font-medium">
                🔥 All Games Available
              </Badge>
            </div>

            {/* Enhanced grid layout for all 3 games */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
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
                  
                  <CardContent className="p-4 sm:p-6 relative">
                    <div className="text-center mb-4 sm:mb-6">
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
                    
                    <div className="space-y-2 sm:space-y-4">
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
            <div className="bg-gradient-to-r from-primary/10 via-accent/5 to-legendary/10 rounded-xl sm:rounded-2xl p-4 sm:p-8 text-center border border-primary/20">
              <div className="mb-3 sm:mb-4">
                <TrendingUp className="w-8 h-8 sm:w-12 sm:h-12 mx-auto text-primary mb-2 sm:mb-3" />
                <h3 className="font-gaming font-bold text-lg sm:text-2xl mb-2">Ready for More Action?</h3>
                <p className="text-muted-foreground text-sm sm:text-lg">
                  Explore additional game modes and special events in our games lobby
                </p>
              </div>
              <Link href="/play">
                <Button 
                  size="default" 
                  variant="outline"
                  className="text-sm sm:text-lg px-6 sm:px-10 py-2 sm:py-4 border-2 border-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-105 font-bold"
                  data-testid="button-view-all-games"
                >
                  <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                  Explore Games Lobby
                </Button>
              </Link>
            </div>
          </section>

          {/* Get More Credits - SECOND PRIORITY */}
          <section className="mb-12">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                <Coins className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
              </div>
              <h2 className="font-gaming font-bold text-xl sm:text-3xl">Get More Credits</h2>
            </div>
            
            <Card className="gaming-card border-2 border-green-200 dark:border-green-700">
              <CardContent className="p-4 sm:p-8">
                <CreditPurchase />
              </CardContent>
            </Card>
          </section>

        </div>
      </main>
      
      {/* Navigation Footer */}
      <NavigationFooter />
      
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