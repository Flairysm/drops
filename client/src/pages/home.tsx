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
                className="absolute w-1 h-1 bg-primary/30 rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}
              ></div>
            ))}
          </div>
        </div>
        
        <main className="pt-20 relative z-10">
          {/* Hero Image Section */}
          <section className="py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl p-8 backdrop-blur-sm border border-primary/30 shadow-2xl">
                <div className="aspect-video bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl flex items-center justify-center">
                  {/* Placeholder for hero image */}
                  <div className="text-center">
                    <Package className="w-32 h-32 text-primary/50 mx-auto mb-4" />
                    <p className="text-muted-foreground text-lg">Hero Image Placeholder</p>
                    <p className="text-sm text-muted-foreground/70">Add your hero image here</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Title Section */}
          <section className="py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              {/* Premium Badge */}
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-primary/20 to-accent/20 backdrop-blur-sm border border-primary/30 rounded-full px-6 py-3 mb-8 shadow-lg">
                <Star className="w-5 h-5 text-primary animate-spin" style={{ animationDuration: '3s' }} />
                <span className="text-sm font-semibold text-primary tracking-wide">PREMIUM TCG EXPERIENCE</span>
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
              </div>
              
              {/* Main Title */}
              <h1 className="font-gaming font-black text-5xl md:text-7xl lg:text-8xl mb-6">
                <span className="bg-gradient-to-r from-primary via-accent via-legendary to-primary bg-clip-text text-transparent animate-gradient-x">
                  DROPS
                </span>
              </h1>
              
              {/* Subtitle */}
              <p className="text-2xl md:text-3xl text-muted-foreground/80 font-light tracking-wide mb-8">
                Where Legends Are Born
              </p>
              
              {/* Description */}
              <p className="text-xl text-muted-foreground/90 max-w-3xl mx-auto leading-relaxed">
                Experience the ultimate thrill of premium TCG pack opening with transparent odds, 
                unlimited vault storage, and exciting minigames.
              </p>
            </div>
          </section>

          {/* Explore Minigames Section */}
          <section className="py-20 bg-gradient-to-b from-background to-secondary/10">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="font-gaming font-bold text-4xl md:text-5xl mb-6">
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Explore Minigames
                  </span>
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                  Play exciting games to earn packs and discover amazing cards
                </p>
                
                {/* Play Now Button */}
                <Link href="/login">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-primary via-accent to-legendary hover:from-primary/90 hover:via-accent/90 hover:to-legendary/90 transform hover:scale-105 transition-all duration-300 shadow-2xl border-2 border-primary/30 px-12 py-6 text-xl font-bold"
                    data-testid="button-play-now"
                  >
                    <Play className="mr-4 h-6 w-6" />
                    Play Now
                  </Button>
                </Link>
              </div>
              
              {/* Minigames Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Plinko Game */}
                <Card className="gaming-card p-6 text-center group hover:scale-105 transition-all duration-300">
                  <CardContent className="p-0">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                      <Zap className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="font-semibold text-2xl mb-3">Plinko</h3>
                    <p className="text-muted-foreground mb-4">
                      Drop balls and watch them bounce to win different tier packs
                    </p>
                    <div className="text-sm text-primary font-medium">Earn: Poké Ball to Master Ball Packs</div>
                  </CardContent>
                </Card>
                
                {/* Wheel Game */}
                <Card className="gaming-card p-6 text-center group hover:scale-105 transition-all duration-300">
                  <CardContent className="p-0">
                    <div className="w-20 h-20 bg-gradient-to-br from-accent/20 to-legendary/20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                      <RotateCcw className="w-10 h-10 text-accent" />
                    </div>
                    <h3 className="font-semibold text-2xl mb-3">Wheel Spin</h3>
                    <p className="text-muted-foreground mb-4">
                      Spin the wheel and land on different rewards and packs
                    </p>
                    <div className="text-sm text-accent font-medium">Earn: Credits & Special Packs</div>
                  </CardContent>
                </Card>
                
                {/* Minesweeper Game */}
                <Card className="gaming-card p-6 text-center group hover:scale-105 transition-all duration-300">
                  <CardContent className="p-0">
                    <div className="w-20 h-20 bg-gradient-to-br from-legendary/20 to-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                      <Gamepad2 className="w-10 h-10 text-legendary" />
                    </div>
                    <h3 className="font-semibold text-2xl mb-3">Minesweeper</h3>
                    <p className="text-muted-foreground mb-4">
                      Test your skills and avoid mines to win amazing rewards
                    </p>
                    <div className="text-sm text-legendary font-medium">Earn: High-Tier Packs</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
          
          {/* Why Choose Drops Section */}
          <section className="py-20">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="font-gaming font-bold text-4xl md:text-5xl mb-6">
                  <span className="bg-gradient-to-r from-accent to-legendary bg-clip-text text-transparent">
                    Why Choose Drops?
                  </span>
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Experience the most advanced digital TCG platform with cutting-edge features
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Feature 1 */}
                <Card className="gaming-card p-8 text-center group hover:scale-105 transition-all duration-300">
                  <CardContent className="p-0">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                      <Package className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="font-semibold text-2xl mb-4">Transparent Odds</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Every pack opening shows real-time odds. No hidden mechanics, just pure transparency and fairness.
                    </p>
                  </CardContent>
                </Card>
                
                {/* Feature 2 */}
                <Card className="gaming-card p-8 text-center group hover:scale-105 transition-all duration-300">
                  <CardContent className="p-0">
                    <div className="w-20 h-20 bg-gradient-to-br from-accent/20 to-legendary/20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                      <Coins className="w-10 h-10 text-accent" />
                    </div>
                    <h3 className="font-semibold text-2xl mb-4">Unlimited Vault</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Store unlimited cards in your personal vault. Never lose a single card again with our secure storage.
                    </p>
                  </CardContent>
                </Card>
                
                {/* Feature 3 */}
                <Card className="gaming-card p-8 text-center group hover:scale-105 transition-all duration-300">
                  <CardContent className="p-0">
                    <div className="w-20 h-20 bg-gradient-to-br from-legendary/20 to-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                      <TrendingUp className="w-10 h-10 text-legendary" />
                    </div>
                    <h3 className="font-semibold text-2xl mb-4">Fair Economy</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Balanced credit system with fair pricing. Earn credits through gameplay and smart decisions.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        
        {/* Footer */}
        <footer className="bg-gradient-to-b from-secondary/20 to-background border-t border-border py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
              {/* Brand Section */}
              <div className="lg:col-span-1">
                <h3 className="font-gaming font-bold text-2xl mb-4">
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    DROPS
                  </span>
                </h3>
                <p className="text-muted-foreground mb-6">
                  The ultimate digital TCG experience with transparent odds and exciting minigames.
                </p>
                {/* Social Media Links */}
                <div className="flex space-x-4">
                  <a href="#" className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center hover:bg-primary/20 transition-colors">
                    <span className="text-primary font-bold">T</span>
                  </a>
                  <a href="#" className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center hover:bg-primary/20 transition-colors">
                    <span className="text-primary font-bold">D</span>
                  </a>
                  <a href="#" className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center hover:bg-primary/20 transition-colors">
                    <span className="text-primary font-bold">I</span>
                  </a>
                  <a href="#" className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center hover:bg-primary/20 transition-colors">
                    <span className="text-primary font-bold">Y</span>
                  </a>
                </div>
              </div>
              
              {/* Quick Links */}
              <div>
                <h4 className="font-semibold text-lg mb-4">Quick Links</h4>
                <ul className="space-y-3">
                  <li><Link href="/login" className="text-muted-foreground hover:text-primary transition-colors">Sign In</Link></li>
                  <li><Link href="/register" className="text-muted-foreground hover:text-primary transition-colors">Create Account</Link></li>
                  <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">How to Play</a></li>
                  <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Game Rules</a></li>
                </ul>
              </div>
              
              {/* Games */}
              <div>
                <h4 className="font-semibold text-lg mb-4">Games</h4>
                <ul className="space-y-3">
                  <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Plinko</a></li>
                  <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Wheel Spin</a></li>
                  <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Minesweeper</a></li>
                  <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Pack Opening</a></li>
                </ul>
              </div>
              
              {/* Support */}
              <div>
                <h4 className="font-semibold text-lg mb-4">Support</h4>
                <ul className="space-y-3">
                  <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Help Center</a></li>
                  <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Contact Us</a></li>
                  <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Bug Reports</a></li>
                  <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Feature Requests</a></li>
                </ul>
              </div>
            </div>
            
            {/* Bottom Section */}
            <div className="border-t border-border pt-8">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                <div className="text-muted-foreground text-sm">
                  © 2024 Drops. All rights reserved.
                </div>
                <div className="flex space-x-6 text-sm">
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Terms of Service</a>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Cookie Policy</a>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Refund Policy</a>
                </div>
              </div>
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

          {/* Recent Pulls Carousel - TOP PRIORITY */}
          <section className="mb-8">
            <RecentPullsCarousel limit={10} />
          </section>

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
