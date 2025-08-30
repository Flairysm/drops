import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Play, Info, Gift, RotateCcw, DollarSign } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export default function Landing() {
  const { theme, toggleTheme } = useTheme();

  const tierData = [
    { tier: "D", name: "D Tier", color: "d", odds: "75.0%" },
    { tier: "C", name: "C Tier", color: "c", odds: "15.0%" },
    { tier: "B", name: "B Tier", color: "b", odds: "8.0%" },
    { tier: "A", name: "A Tier", color: "a", odds: "1.8%" },
    { tier: "S", name: "S Tier", color: "s", odds: "0.15%" },
    { tier: "SS", name: "SS Tier", color: "ss", odds: "0.04%" },
    { tier: "SSS", name: "SSS Tier", color: "sss", odds: "0.01%" },
  ];

  const games = [
    {
      name: "Arcade Mode",
      description: "Play Plinko and Wheel games to earn packs! Win different tier packs based on your results.",
      cost: "1.0+ Credits",
      maxPayout: "SSS Tier",
      color: "from-primary to-accent",
      icon: <Play className="w-4 h-4" />,
    },
    {
      name: "Rip Packs Mode",
      description: "Open earned packs to discover amazing cards! Each pack contains 8 commons plus 1 hit card.",
      cost: "Free",
      maxPayout: "SSS Tier",
      color: "from-superrare to-legendary",
      icon: <Gift className="w-4 h-4" />,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 nav-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center glow-effect">
                <Zap className="text-primary-foreground text-xl" />
              </div>
              <span className="font-gaming font-bold text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Flair TCG Arcade
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                data-testid="button-theme-toggle"
              >
                {theme === "dark" ? "🌞" : "🌙"}
              </Button>
              
              <Button
                onClick={() => window.location.href = "/api/login"}
                className="bg-gradient-to-r from-primary to-accent hover:glow-effect"
                data-testid="button-login"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-20 pb-12">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-primary/20 to-accent/20"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <h1 className="font-gaming font-black text-4xl md:text-6xl lg:text-7xl mb-6">
                <span className="bg-gradient-to-r from-primary via-accent to-legendary bg-clip-text text-transparent">
                  FLAIR TCG ARCADE
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Experience the thrill of premium TCG pack opening with transparent odds, 
                unlimited vault storage, and exciting minigames.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={() => window.location.href = "/api/login"}
                  className="bg-gradient-to-r from-primary to-accent hover:glow-effect transform hover:scale-105 transition-all"
                  data-testid="button-start-playing"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start Playing
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  data-testid="button-view-odds"
                >
                  <Info className="mr-2 h-4 w-4" />
                  View Odds
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Minigames Section */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="font-gaming font-bold text-3xl md:text-4xl mb-4">Launch Minigames</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Choose your adventure! Each game offers unique ways to unlock premium cards.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {games.map((game, index) => (
                <Card key={index} className="gaming-card hover:glow-effect transition-all transform hover:scale-105 group">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="w-full h-48 rounded-lg mb-6 overflow-hidden bg-gradient-to-br from-blue-600/20 to-purple-600/20 relative flex items-center justify-center">
                        <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${game.color} flex items-center justify-center`}>
                          {game.icon}
                        </div>
                      </div>
                      <h3 className="font-gaming font-bold text-xl mb-3 text-primary">{game.name}</h3>
                      <p className="text-muted-foreground mb-6">
                        {game.description}
                      </p>
                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Cost per play:</span>
                          <span className="font-semibold text-accent">{game.cost}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Max payout:</span>
                          <span className="font-semibold text-legendary">{game.maxPayout}</span>
                        </div>
                      </div>
                      <Button
                        className={`w-full bg-gradient-to-r ${game.color} text-white hover:glow-effect transition-all`}
                        onClick={() => window.location.href = "/api/login"}
                        data-testid={`button-play-${game.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {game.icon}
                        <span className="ml-2">Play {game.name.split(' ')[0]}</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Odds Transparency */}
            <Card className="gaming-card mt-12">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <h3 className="font-gaming font-bold text-2xl mb-2">Transparent Odds</h3>
                  <p className="text-muted-foreground">All probabilities are publicly available and regularly audited</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {tierData.map((tier) => (
                    <div 
                      key={tier.tier}
                      className={`text-center p-4 rounded-lg bg-gradient-to-b from-${tier.color}/20 to-transparent border border-${tier.color}/50`}
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
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 bg-gradient-to-b from-background to-secondary/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="font-gaming font-bold text-3xl md:text-4xl mb-4">Premium Features</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Built for serious collectors with professional-grade tools and transparency.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="gaming-card">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-primary/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <DollarSign className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Credits Never Expire</h3>
                  <p className="text-muted-foreground">
                    Your credits are safe forever. No expiration dates, no pressure to spend.
                  </p>
                </CardContent>
              </Card>

              <Card className="gaming-card">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-accent/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Info className="w-8 h-8 text-accent" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">100% Transparent</h3>
                  <p className="text-muted-foreground">
                    All odds published publicly. No hidden mechanics or rigged outcomes.
                  </p>
                </CardContent>
              </Card>

              <Card className="gaming-card">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-legendary/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Gift className="w-8 h-8 text-legendary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Unlimited Vault</h3>
                  <p className="text-muted-foreground">
                    Store unlimited cards. Refund for 80% value or ship to your door.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-secondary/20 border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center glow-effect">
                <Zap className="text-primary-foreground text-xl" />
              </div>
              <span className="font-gaming font-bold text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Flair TCG Arcade
              </span>
            </div>
            <p className="text-muted-foreground mb-4">Premium TCG pack opening experience with transparent odds</p>
            <div className="flex justify-center space-x-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-primary transition-colors">Support</a>
              <a href="#" className="hover:text-primary transition-colors">Odds Transparency</a>
            </div>
            <div className="mt-6 text-xs text-muted-foreground">
              © 2024 Flair TCG Arcade. All rights reserved. • Play responsibly.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
