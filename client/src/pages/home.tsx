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
        <section className="relative min-h-screen flex items-center overflow-hidden">
            {/* Hero Background Image */}
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: "url('/assets/hero/futuristic-cards-hero.png')",
                backgroundAttachment: 'fixed'
              }}
            >
              {/* Lighter overlay to show more background */}
              <div className="absolute inset-0 bg-black/30"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-black/40"></div>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/30"></div>
            </div>
            
            <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 w-full">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center min-h-[80vh]">
                {/* Content */}
                <div className="text-center lg:text-left space-y-8 lg:space-y-10">
                  {/* Main Title */}
                  <div className="space-y-4">
                    <h1 className="font-gaming font-black text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[10rem] text-white drop-shadow-2xl leading-[0.9] tracking-tight">
                      Drops
                    </h1>
                    <div className="w-24 h-1 bg-gradient-to-r from-accent to-primary mx-auto lg:mx-0 rounded-full"></div>
                  </div>
                  
                  {/* Subtitle */}
                  <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight drop-shadow-xl max-w-4xl">
                    Experience TCG collecting in a new way
                  </h2>
                  
                  {/* Description */}
                  <p className="text-xl sm:text-2xl md:text-3xl text-gray-100 leading-relaxed max-w-3xl font-light">
                    Play TCG themed minigames, open premium packs and collect rare cards
                  </p>
                  
                  {/* Free Credits Offer */}
                  <div className="bg-gradient-to-r from-yellow-400/20 to-orange-500/20 border-2 border-yellow-400/40 rounded-2xl p-6 backdrop-blur-md shadow-2xl">
                    <div className="flex items-center justify-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                        <Star className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-400">30 FREE CREDITS</div>
                        <div className="text-lg text-yellow-300">Sign up now to claim</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* CTA Buttons */}
                  <div className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start pt-4">
                    <Link href="/register">
                      <Button
                        size="lg"
                        className="bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 text-white border-0 rounded-2xl px-12 py-6 text-xl font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 backdrop-blur-sm w-full sm:w-auto transform hover:scale-105 hover:-translate-y-1"
                      >
                        Create Account
                      </Button>
                    </Link>
                    <Link href="/login">
                      <Button
                        size="lg"
                        variant="outline"
                        className="bg-transparent border-2 border-white/40 hover:border-white/60 text-white hover:bg-white/10 rounded-2xl px-12 py-6 text-xl font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 backdrop-blur-sm w-full sm:w-auto transform hover:scale-105 hover:-translate-y-1"
                      >
                        Login
                      </Button>
                    </Link>
                  </div>
                </div>
                
                {/* Right side visual element */}
                <div className="hidden lg:flex items-center justify-center">
                  <div className="relative">
                    {/* Floating card elements */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-3xl scale-150"></div>
                    <div className="relative bg-gradient-to-br from-primary/10 to-accent/10 backdrop-blur-md border border-primary/30 rounded-3xl p-12 shadow-2xl">
                      <div className="text-center space-y-6">
                        <div className="w-24 h-24 bg-gradient-to-br from-accent/30 to-primary/30 rounded-2xl flex items-center justify-center mx-auto backdrop-blur-sm border border-accent/40">
                          <Package className="w-12 h-12 text-accent" />
                        </div>
                        <h3 className="text-3xl font-bold text-white drop-shadow-lg">
                          Premium Experience
                        </h3>
                        <p className="text-gray-200 text-lg leading-relaxed drop-shadow-md">
                          Join thousands of collectors in the ultimate digital TCG adventure
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

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
      
      <main className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          {/* Enhanced Credits Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 sm:mb-16 space-y-6 sm:space-y-0">
            <div className="space-y-3">
              <h1 className="font-gaming font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl">
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Hey {userData?.username || userData?.firstName || "Player"}! 👋
                </span>
              </h1>
              <p className="text-muted-foreground text-lg sm:text-xl md:text-2xl font-light">Time to win some cards</p>
            </div>
            <Card className="gaming-card border-2 border-yellow-200/20 bg-gradient-to-br from-yellow-50/10 to-yellow-100/5">
              <CardContent className="p-6 sm:p-8 flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Coins className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-yellow-500" data-testid="text-user-credits">
                    {userData?.credits || "0"}
                  </div>
                  <div className="text-sm sm:text-base text-muted-foreground font-medium">Credits</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Games Collection - FIRST PRIORITY */}
          <section className="mb-16 sm:mb-20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 sm:mb-16 space-y-6 sm:space-y-0">
              <div className="flex items-center space-x-4 sm:space-x-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-xl">
                  <Gamepad2 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <div className="space-y-2">
                  <h2 className="font-gaming font-bold text-3xl sm:text-4xl md:text-5xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Quick Play
                  </h2>
                  <p className="text-muted-foreground text-lg sm:text-xl md:text-2xl font-light">Choose your adventure and win amazing cards</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 dark:from-orange-900 dark:to-red-900 dark:text-orange-200 px-6 py-3 text-base sm:text-lg font-bold shadow-lg">
                🔥 All Games Available
              </Badge>
            </div>

            {/* Enhanced grid layout for all 3 games */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 mb-12 sm:mb-16">
              {games.map((game, index) => (
                <Card key={index} className="gaming-card hover:glow-effect transition-all duration-300 transform hover:scale-[1.05] hover:-translate-y-3 group border-2 hover:border-primary/50 relative overflow-hidden shadow-2xl">
                  {/* Popular badge for featured games */}
                  {game.popular && (
                    <div className="absolute top-6 right-6 z-10">
                      <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 shadow-xl px-4 py-2 text-sm font-bold">
                        <Star className="w-4 h-4 mr-2" />
                        Popular
                      </Badge>
                    </div>
                  )}
                  
                  {/* Animated background gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-5 group-hover:opacity-15 transition-opacity duration-300`}></div>
                  
                  <CardContent className="p-8 sm:p-10 relative">
                    <div className="text-center mb-8">
                      <div className={`w-20 h-20 sm:w-28 sm:h-28 mx-auto rounded-3xl bg-gradient-to-br ${game.color} flex items-center justify-center shadow-2xl group-hover:shadow-3xl transition-all duration-300 mb-6 group-hover:scale-110`}>
                        {game.icon}
                      </div>
                      <h3 className="font-gaming font-bold text-2xl sm:text-3xl mb-4 group-hover:text-primary transition-colors">
                        {game.name}
                      </h3>
                      <p className="text-muted-foreground text-base sm:text-lg leading-relaxed mb-6 font-light">
                        {game.description}
                      </p>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-center">
                        <Badge 
                          variant="outline" 
                          className={`text-base sm:text-xl px-6 py-3 font-bold border-2 bg-gradient-to-r ${game.color} text-white border-transparent group-hover:shadow-xl transition-all rounded-xl`}
                        >
                          <Coins className="w-5 h-5 mr-3" />
                          {game.cost} Credits
                        </Badge>
                      </div>
                      
                      <Link href={game.route} className="block">
                        <Button 
                          size="lg"
                          className={`w-full bg-gradient-to-r ${game.color} hover:glow-effect transition-all duration-300 text-lg sm:text-xl py-4 sm:py-5 font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 rounded-xl`}
                          data-testid={`button-play-${game.name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <Play className="w-5 h-5 sm:w-6 sm:h-6 mr-3" />
                          {game.name === "Black Bolt" ? "Open Packs" : "Play Now"}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Enhanced call-to-action */}
            <div className="bg-gradient-to-r from-primary/15 via-accent/10 to-legendary/15 rounded-3xl p-8 sm:p-12 text-center border-2 border-primary/30 shadow-2xl">
              <div className="mb-8">
                <TrendingUp className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-primary mb-6" />
                <h3 className="font-gaming font-bold text-2xl sm:text-3xl md:text-4xl mb-4">Ready for More Action?</h3>
                <p className="text-muted-foreground text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed font-light">
                  Explore additional game modes and special events in our games lobby
                </p>
              </div>
              <Link href="/play">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-lg sm:text-xl px-10 sm:px-12 py-4 sm:py-5 border-2 border-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-105 font-bold rounded-xl shadow-xl"
                  data-testid="button-view-all-games"
                >
                  <Gamepad2 className="w-5 h-5 sm:w-6 sm:h-6 mr-3" />
                  Explore Games Lobby
                </Button>
              </Link>
            </div>
          </section>

          {/* Enhanced Get More Credits - SECOND PRIORITY */}
          <section className="mb-16 sm:mb-20">
            <div className="flex items-center space-x-4 sm:space-x-6 mb-8 sm:mb-12">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-xl">
                <Coins className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="font-gaming font-bold text-3xl sm:text-4xl md:text-5xl bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">Get More Credits</h2>
                <p className="text-muted-foreground text-lg sm:text-xl font-light">Purchase credits to keep playing and winning</p>
              </div>
            </div>
            
            <Card className="gaming-card border-2 border-green-200/30 dark:border-green-700/30 bg-gradient-to-br from-green-50/5 to-emerald-50/5 shadow-2xl">
              <CardContent className="p-8 sm:p-12">
                <CreditPurchase />
              </CardContent>
            </Card>
          </section>

        </div>
      </main>
      
      {/* Navigation Footer */}
      <NavigationFooter />
    </div>
  );
}