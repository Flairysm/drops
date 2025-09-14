import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { NavigationFooter } from "@/components/NavigationFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Circle, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

export default function Play() {
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


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }



  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navigation />

      {/* Futuristic Card Hero Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Main background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('data:image/svg+xml;base64,${btoa(`
              <svg width="1920" height="1080" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="bg" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="#1e1b4b" stop-opacity="1"/>
                    <stop offset="100%" stop-color="#312e81" stop-opacity="1"/>
                  </radialGradient>
                  <linearGradient id="card1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.8"/>
                    <stop offset="100%" stop-color="#1d4ed8" stop-opacity="0.6"/>
                  </linearGradient>
                  <linearGradient id="card2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#ec4899" stop-opacity="0.9"/>
                    <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.8"/>
                  </linearGradient>
                  <linearGradient id="card3" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.7"/>
                    <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.9"/>
                  </linearGradient>
                </defs>
                <rect width="1920" height="1080" fill="url(#bg)"/>
                
                {/* Floating Cards */}
                <g opacity="0.6">
                  <rect x="200" y="150" width="120" height="180" rx="12" fill="url(#card1)" transform="rotate(-15 260 240)"/>
                  <rect x="1600" y="200" width="120" height="180" rx="12" fill="url(#card2)" transform="rotate(20 1660 290)"/>
                  <rect x="100" y="600" width="120" height="180" rx="12" fill="url(#card3)" transform="rotate(-25 160 690)"/>
                  <rect x="1700" y="650" width="120" height="180" rx="12" fill="url(#card1)" transform="rotate(30 1760 740)"/>
                  <rect x="400" y="400" width="100" height="150" rx="10" fill="url(#card2)" transform="rotate(45 450 475)"/>
                  <rect x="1400" y="500" width="100" height="150" rx="10" fill="url(#card3)" transform="rotate(-35 1450 575)"/>
                </g>
                
                {/* Grid Pattern */}
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#22D3EE" stroke-width="0.5" opacity="0.1"/>
                  </pattern>
                </defs>
                <rect width="1920" height="1080" fill="url(#grid)"/>
                
                {/* Floating Particles */}
                <g opacity="0.4">
                  <circle cx="300" cy="200" r="2" fill="#22D3EE"/>
                  <circle cx="800" cy="300" r="1.5" fill="#7C3AED"/>
                  <circle cx="1200" cy="150" r="2.5" fill="#22D3EE"/>
                  <circle cx="1600" cy="400" r="1" fill="#7C3AED"/>
                  <circle cx="200" cy="800" r="2" fill="#22D3EE"/>
                  <circle cx="600" cy="700" r="1.5" fill="#7C3AED"/>
                  <circle cx="1000" cy="900" r="2" fill="#22D3EE"/>
                  <circle cx="1400" cy="750" r="1" fill="#7C3AED"/>
                </g>
              </svg>
            `)}')`
          }}
        />
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/40"></div>
        {/* Additional floating particles */}
        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-cyan-400/60 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      </div>

      <main className="pt-24 pb-24 relative z-10">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
          {/* Header */}
          <motion.section 
            className="py-12 text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-[#7C3AED] via-[#A855F7] to-[#22D3EE] bg-clip-text text-transparent">
                ARCADE
              </span>
            </h1>
            <p className="text-lg text-[#E5E7EB] max-w-3xl mx-auto">
              Discover our catalogue of games and stand a chance to win top-tier cards
            </p>
          </motion.section>

          {/* Game Categories */}
          <div className="space-y-8">
            {/* Minigames Section */}
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="text-3xl font-bold text-center mb-8">
                <span className="bg-gradient-to-r from-[#7C3AED] via-[#A855F7] to-[#22D3EE] bg-clip-text text-transparent">
                  Minigames
                </span>
              </h2>
              <div className="flex overflow-x-auto scrollbar-hide gap-6 pb-4 snap-x snap-mandatory max-w-4xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Card className="gaming-card hover:scale-105 transition-transform cursor-pointer flex-shrink-0 w-80 bg-[#151521]/40 backdrop-blur-[15px] border border-[#26263A]/50 shadow-[0_0_30px_rgba(0,0,0,0.3)]" data-testid="card-plinko">
                  <CardHeader className="text-center p-6">
                    <div className="w-full h-32 mb-4 rounded-lg bg-gradient-to-br from-[#3b82f6]/20 to-[#7C3AED]/20 relative flex items-center justify-center border border-[#3b82f6]/30">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#3b82f6] to-[#7C3AED] flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                        <Circle className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <CardTitle className="text-xl font-bold text-[#E5E7EB]">Plinko Drop</CardTitle>
                    <p className="text-sm text-[#9CA3AF] mt-2">
                      Drop, Bounce, Win!
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <div className="text-center space-y-2">
                      <div className="bg-gradient-to-r from-[#7C3AED]/20 to-[#22D3EE]/20 rounded-lg p-3 border border-[#7C3AED]/30">
                        <div className="text-2xl font-bold text-[#22D3EE]">
                          20 Credits
                        </div>
                        <div className="text-sm text-[#9CA3AF]">
                          Per play
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <Badge className="bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] text-white border-0">
                          Win Mystery Packs
                        </Badge>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => window.location.href = '/play/plinko'}
                      className="w-full bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] hover:from-[#6D28D9] hover:to-[#0891B2] shadow-[0_0_15px_rgba(124,58,237,0.4)]"
                      data-testid="button-play-plinko"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Play Plinko
                    </Button>
                  </CardContent>
                </Card>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Card className="gaming-card hover:scale-105 transition-transform cursor-pointer flex-shrink-0 w-80 bg-[#151521]/40 backdrop-blur-[15px] border border-[#26263A]/50 shadow-[0_0_30px_rgba(0,0,0,0.3)]" data-testid="card-wheel">
                  <CardHeader className="text-center p-6">
                    <div className="w-full h-32 mb-4 rounded-lg bg-gradient-to-br from-[#f59e0b]/20 to-[#ef4444]/20 relative flex items-center justify-center border border-[#f59e0b]/30">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#f59e0b] to-[#ef4444] flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                        <RotateCcw className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <CardTitle className="text-xl font-bold text-[#E5E7EB]">Wheel Spin</CardTitle>
                    <p className="text-sm text-[#9CA3AF] mt-2">
                      Spin and Win!
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <div className="text-center space-y-2">
                      <div className="bg-gradient-to-r from-[#7C3AED]/20 to-[#22D3EE]/20 rounded-lg p-3 border border-[#7C3AED]/30">
                        <div className="text-2xl font-bold text-[#22D3EE]">20 Credits</div>
                        <div className="text-sm text-[#9CA3AF]">
                          Per spin
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <Badge className="bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] text-white border-0">
                          Win Mystery Packs
                        </Badge>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => window.location.href = '/play/wheel'}
                      className="w-full bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] hover:from-[#6D28D9] hover:to-[#0891B2] shadow-[0_0_15px_rgba(124,58,237,0.4)]"
                      data-testid="button-play-wheel"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Play Wheel
                    </Button>
                  </CardContent>
                </Card>
                </motion.div>
                
                {/* Minesweeper Game */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Card className="gaming-card hover:scale-105 transition-transform cursor-pointer flex-shrink-0 w-80 bg-[#151521]/40 backdrop-blur-[15px] border border-[#26263A]/50 shadow-[0_0_30px_rgba(0,0,0,0.3)]" data-testid="card-minesweeper">
                  <CardHeader className="text-center p-6">
                    <div className="w-full h-32 mb-4 rounded-lg bg-gradient-to-br from-[#10b981]/20 to-[#059669]/20 relative flex items-center justify-center border border-[#10b981]/30">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#10b981] to-[#059669] flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                        <Package className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <CardTitle className="text-xl font-bold text-[#E5E7EB]">Minesweeper</CardTitle>
                    <p className="text-sm text-[#9CA3AF] mt-2">
                      Find the Greens, Avoid the Bombs!
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <div className="text-center space-y-2">
                      <div className="bg-gradient-to-r from-[#7C3AED]/20 to-[#22D3EE]/20 rounded-lg p-3 border border-[#7C3AED]/30">
                        <div className="text-2xl font-bold text-[#22D3EE]">
                          20 Credits
                        </div>
                        <div className="text-sm text-[#9CA3AF]">
                          Per game
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <Badge className="bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] text-white border-0">
                          Win Mystery Packs
                        </Badge>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => window.location.href = '/play/minesweeper'}
                      className="w-full bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] hover:from-[#6D28D9] hover:to-[#0891B2] shadow-[0_0_15px_rgba(124,58,237,0.4)]"
                      data-testid="button-play-minesweeper"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Play Minesweeper
                    </Button>
                  </CardContent>
                </Card>
                </motion.div>
              </div>
              
              {/* Scroll Hint */}
              <div className="text-center mt-6 text-sm text-[#9CA3AF]">
                <span className="hidden md:inline">← Scroll to see more games →</span>
                <span className="md:hidden">← Swipe to see more games →</span>
              </div>
            </motion.section>
            
            {/* Special Packs Section */}
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <h2 className="text-3xl font-bold text-center mb-8">
                <span className="bg-gradient-to-r from-[#7C3AED] via-[#A855F7] to-[#22D3EE] bg-clip-text text-transparent">
                  Special Packs
                </span>
              </h2>
              <div className="flex overflow-x-auto scrollbar-hide gap-6 pb-4 snap-x snap-mandatory max-w-4xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.7 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Card className="gaming-card hover:scale-105 transition-transform cursor-pointer opacity-50 flex-shrink-0 w-80 bg-[#151521]/40 backdrop-blur-[15px] border border-[#26263A]/50 shadow-[0_0_30px_rgba(0,0,0,0.3)]" data-testid="card-slabs">
                    <CardHeader className="text-center p-6">
                      <CardTitle className="text-xl font-bold text-[#E5E7EB]">Slabs Collection</CardTitle>
                      <Badge className="bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] text-white border-0">Coming Soon</Badge>
                    </CardHeader>
                    <CardContent className="text-center p-6">
                      <p className="text-[#9CA3AF] mb-4">Premium graded cards in protective cases.</p>
                      <button className="bg-[#374151] text-[#9CA3AF] px-4 py-2 rounded-md w-full" disabled data-testid="button-slabs-disabled">
                        Coming Soon
                      </button>
                    </CardContent>
                  </Card>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Card className="gaming-card hover:scale-105 transition-transform cursor-pointer opacity-50 flex-shrink-0 w-80 bg-[#151521]/40 backdrop-blur-[15px] border border-[#26263A]/50 shadow-[0_0_30px_rgba(0,0,0,0.3)]" data-testid="card-vintages">
                    <CardHeader className="text-center p-6">
                      <CardTitle className="text-xl font-bold text-[#E5E7EB]">Vintage Collection</CardTitle>
                      <Badge className="bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] text-white border-0">Coming Soon</Badge>
                    </CardHeader>
                    <CardContent className="text-center p-6">
                      <p className="text-[#9CA3AF] mb-4">Rare vintage cards from classic sets.</p>
                      <button className="bg-[#374151] text-[#9CA3AF] px-4 py-2 rounded-md w-full" disabled data-testid="button-vintages-disabled">
                        Coming Soon
                      </button>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
              
              {/* Scroll Hint for Special Packs */}
              <div className="text-center mt-6 text-sm text-[#9CA3AF]">
                <span className="hidden md:inline">← Scroll to see more packs →</span>
                <span className="md:hidden">← Swipe to see more packs →</span>
              </div>
            </motion.section>
            
          </div>



        </div>
      </main>
      <NavigationFooter />
    </div>
  );
}
