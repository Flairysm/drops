import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { NavigationFooter } from "@/components/NavigationFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

// Game data structure
const gameData = {
  popular: [
    {
      id: "plinko",
      name: "Plinko Drop",
      description: "Drop, Bounce, Win!",
      cost: 20,
      image: "/assets/classic-image.png",
      route: "/play/plinko",
      badge: "Most Popular",
      badgeColor: "from-[#f59e0b] to-[#ef4444]"
    }
  ],
  minigames: [
    {
      id: "minesweeper",
      name: "Minesweeper",
      description: "Find the Greens, Avoid the Bombs!",
      cost: 20,
      image: "/assets/minesweeper-image.png",
      route: "/play/minesweeper"
    },
    {
      id: "plinko",
      name: "Plinko Drop",
      description: "Drop, Bounce, Win!",
      cost: 20,
      image: "/assets/classic-image.png",
      route: "/play/plinko"
    },
    {
      id: "wheel",
      name: "Wheel Spin",
      description: "Spin and Win!",
      cost: 20,
      gradient: "from-[#f59e0b] to-[#ef4444]",
      emoji: "🎯",
      route: "/play/wheel"
    }
  ],
  specialPacks: [
    {
      id: "coming-soon-1",
      name: "Coming Soon",
      description: "New pack types coming soon!",
      cost: 0,
      gradient: "from-[#A855F7] to-[#7C3AED]",
      emoji: "✨",
      route: "#",
      comingSoon: true
    }
  ],
  classicPacks: [
    {
      id: "slabs",
      name: "Slabs Collection",
      description: "Premium graded cards in protective cases",
      cost: 0,
      gradient: "from-[#7c3aed] to-[#22d3ee]",
      emoji: "👑",
      route: "/play/slabs",
      comingSoon: true
    },
    {
      id: "vintage",
      name: "Vintage Collection",
      description: "Rare vintage cards from classic sets",
      cost: 0,
      gradient: "from-[#f59e0b] to-[#ef4444]",
      emoji: "⚡",
      route: "/play/vintage",
      comingSoon: true
    }
  ]
};

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

  // Game Card Component
  const GameCard = ({ game, isLarge = false, delay = 0 }: { game: any, isLarge?: boolean, delay?: number }) => {
    const cardSize = isLarge ? "w-72 h-64" : "w-56 h-48";
    
    return (
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`${cardSize} flex-shrink-0`}
      >
        <Card 
          className={`rounded-2xl bg-[#151521] border border-[#26263A] backdrop-blur-[10px] hover:scale-[1.02] transition-all duration-200 cursor-pointer shadow-[0_0_20px_rgba(124,58,237,0.1)] hover:shadow-[0_0_24px_rgba(124,58,237,0.15)] overflow-hidden ${game.comingSoon ? 'opacity-50' : ''}`}
          onClick={() => game.comingSoon ? null : window.location.href = game.route}
        >
          <CardContent className="p-0 h-full relative">
            {/* Game Image or Gradient Background */}
            {game.image ? (
              <img 
                src={game.image} 
                alt={game.name} 
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${game.gradient} rounded-2xl flex items-center justify-center shadow-[0_0_12px_rgba(124,58,237,0.4)]`}>
                <span className="text-white text-3xl">{game.emoji}</span>
              </div>
            )}
            
            {/* Overlay with game info */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 rounded-b-2xl">
              <div className="text-white">
                <h3 className="font-bold text-base mb-1">{game.name}</h3>
                <p className="text-xs text-gray-300 mb-2">{game.description}</p>
                
                {/* Badge */}
                {game.badge && (
                  <Badge className={`bg-gradient-to-r ${game.badgeColor} text-white border-0 mb-1 text-xs`}>
                    {game.badge}
                  </Badge>
                )}
                
                {/* Cost and Status */}
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-[#22D3EE] font-bold">
                      {game.cost > 0 ? `${game.cost} Credits` : 'Coming Soon'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {game.comingSoon ? 'Stay tuned' : 'Per play'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };



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

      <main className="pt-16 pb-16 relative z-10">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
          {/* Header */}
          <motion.section 
            className="py-6 text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-[#7C3AED] via-[#A855F7] to-[#22D3EE] bg-clip-text text-transparent">
                ARCADE
              </span>
            </h1>
            <p className="text-base text-[#E5E7EB] max-w-3xl mx-auto">
              Discover our catalogue of games and stand a chance to win top-tier cards
            </p>
          </motion.section>

          {/* Game Categories */}
          <div className="space-y-8">
            {/* Popular Section */}
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="flex items-center mb-6">
                {/* Neon Strip */}
                <div className="w-1 h-8 bg-gradient-to-b from-[#f59e0b] via-[#f97316] to-[#ef4444] rounded-full mr-4 shadow-[0_0_8px_rgba(245,158,11,0.3)]"></div>
                
                {/* Popular Title */}
                <h2 className="text-2xl sm:text-3xl font-semibold text-[#E5E7EB] tracking-[-0.03em] leading-[1.15]">Popular</h2>
              </div>
              <div className="flex overflow-x-auto scrollbar-hide gap-4 pb-4 snap-x snap-mandatory max-w-4xl mx-auto">
                {gameData.popular.map((game, index) => (
                  <GameCard key={game.id} game={game} isLarge={true} delay={0.3 + index * 0.1} />
                ))}
              </div>
              <div className="text-center mt-3 text-sm text-[#9CA3AF]">
                <span className="hidden md:inline">← Scroll to see more →</span>
                <span className="md:hidden">← Swipe to see more →</span>
              </div>
            </motion.section>

            {/* Minigames Section */}
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="flex items-center mb-6">
                {/* Neon Strip */}
                <div className="w-1 h-8 bg-gradient-to-b from-[#f59e0b] via-[#f97316] to-[#ef4444] rounded-full mr-4 shadow-[0_0_8px_rgba(245,158,11,0.3)]"></div>
                
                {/* Minigames Title */}
                <h2 className="text-2xl sm:text-3xl font-semibold text-[#E5E7EB] tracking-[-0.03em] leading-[1.15]">Minigames</h2>
              </div>
              <div className="flex overflow-x-auto scrollbar-hide gap-4 pb-4 snap-x snap-mandatory max-w-4xl mx-auto">
                {gameData.minigames.map((game, index) => (
                  <GameCard key={game.id} game={game} delay={0.5 + index * 0.1} />
                ))}
              </div>
              <div className="text-center mt-3 text-sm text-[#9CA3AF]">
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
              <div className="flex items-center mb-6">
                {/* Neon Strip */}
                <div className="w-1 h-8 bg-gradient-to-b from-[#f59e0b] via-[#f97316] to-[#ef4444] rounded-full mr-4 shadow-[0_0_8px_rgba(245,158,11,0.3)]"></div>
                
                {/* Special Packs Title */}
                <h2 className="text-2xl sm:text-3xl font-semibold text-[#E5E7EB] tracking-[-0.03em] leading-[1.15]">Special Packs</h2>
              </div>
              <div className="flex overflow-x-auto scrollbar-hide gap-4 pb-4 snap-x snap-mandatory max-w-4xl mx-auto">
                {gameData.specialPacks.map((game, index) => (
                  <GameCard key={game.id} game={game} delay={0.7 + index * 0.1} />
                ))}
              </div>
              <div className="text-center mt-3 text-sm text-[#9CA3AF]">
                <span className="hidden md:inline">← Scroll to see more packs →</span>
                <span className="md:hidden">← Swipe to see more packs →</span>
              </div>
            </motion.section>

            {/* Classic Packs Section */}
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <div className="flex items-center mb-6">
                {/* Neon Strip */}
                <div className="w-1 h-8 bg-gradient-to-b from-[#f59e0b] via-[#f97316] to-[#ef4444] rounded-full mr-4 shadow-[0_0_8px_rgba(245,158,11,0.3)]"></div>
                
                {/* Classic Packs Title */}
                <h2 className="text-2xl sm:text-3xl font-semibold text-[#E5E7EB] tracking-[-0.03em] leading-[1.15]">Classic Packs</h2>
              </div>
              <div className="flex overflow-x-auto scrollbar-hide gap-4 pb-4 snap-x snap-mandatory max-w-4xl mx-auto">
                {gameData.classicPacks.map((game, index) => (
                  <GameCard key={game.id} game={game} delay={0.9 + index * 0.1} />
                ))}
              </div>
              <div className="text-center mt-3 text-sm text-[#9CA3AF]">
                <span className="hidden md:inline">← Scroll to see more →</span>
                <span className="md:hidden">← Swipe to see more →</span>
              </div>
            </motion.section>
          </div>
        </div>
      </main>
      <NavigationFooter />
    </div>
  );
}
