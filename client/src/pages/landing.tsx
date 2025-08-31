import { Link } from "wouter";
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
                <Link href="/register">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-primary to-accent hover:glow-effect transform hover:scale-105 transition-all"
                    data-testid="button-register"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Create Account
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    data-testid="button-login"
                  >
                    Sign In
                  </Button>
                </Link>
              </div>
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
