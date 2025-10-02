import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Navigation } from "@/components/Navigation";
import { NavigationFooter } from "@/components/NavigationFooter";
import { PackOpeningAnimation } from "@/components/PackOpeningAnimation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package2, Sparkles, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

// Import pack images
import classicPack from '/assets/classic-image.png';

interface UserPack {
  id: string;
  packId: string;
  tier: string;
  earnedFrom: string;
  earnedAt: string;
}

interface PackCard {
  id: string;
  name: string;
  tier: string;
  imageUrl?: string;
  marketValue: string;
  isHit: boolean;
  position: number;
}

interface OpenPackResult {
  success: boolean;
  userCard: {
    id: string;
    cardId: string;
    pullValue: string;
  };
  packCards: PackCard[];
  hitCardPosition: number;
  packType: string;
}


export default function MyPacks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openingPack, setOpeningPack] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [packOpenData, setPackOpenData] = useState<OpenPackResult | null>(null);

  // Fetch user's packs
  const { data: userPacks, isLoading } = useQuery({
    queryKey: ["/api/packs"],
  });

  const openPackMutation = useMutation({
    mutationFn: async (packId: string) => {
      console.log('🚀 Starting pack opening for ID:', packId);
      const response = await apiRequest("POST", `/api/packs/open/${packId}`);
      const result = await response.json();
      console.log('✅ Pack opening successful:', result);
      return result;
    },
    onSuccess: (result, packId) => {
      console.log('🎉 Pack opening mutation success for ID:', packId);
      setPackOpenData(result);
      setShowAnimation(true);
      setOpeningPack(null);
      // Immediately invalidate cache so pack disappears from UI
      queryClient.invalidateQueries({ queryKey: ["/api/packs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vault"] });
    },
    onError: (error: any, packId) => {
      console.error('❌ Pack opening mutation error for ID:', packId, error);
      toast({
        title: "Error Opening Pack",
        description: error.message || "Failed to open pack",
        variant: "destructive",
      });
      setOpeningPack(null);
    },
  });

  const handleOpenPack = (packType: string) => {
    // Prevent double-clicks and multiple openings
    if (openingPack || openPackMutation.isPending) {
      console.log('Pack opening already in progress, ignoring click');
      return;
    }

    // Find the first available pack of this type
    const availablePacks = groupedPacks[packType] || [];
    if (availablePacks.length > 0) {
      const packToOpen = availablePacks[0];
      console.log('Opening pack:', packToOpen.id, 'of type:', packType);
      setOpeningPack(packToOpen.id);
      openPackMutation.mutate(packToOpen.id);
    }
  };

  const handleAnimationComplete = () => {
    setShowAnimation(false);
    setPackOpenData(null);
    toast({
      title: "Pack Opened!",
      description: "Your cards have been added to your vault!",
      variant: "default",
    });
  };


  const getPackTypeDisplay = (packType: string) => {
    // Now tier field directly stores the pack type (pokeball, greatball, ultraball, masterball)
    console.log(`Pack display: packType="${packType}"`);
    
    switch ((packType || '').toLowerCase()) {
      case 'pokeball':
        return { 
          name: "Pokeball Pack", 
          color: "from-red-600 to-white", 
          borderColor: "border-red-500",
          textColor: "text-red-600",
          bgColor: "bg-red-50",
          tier: "Common"
        };
      case 'greatball':
        return { 
          name: "Great Ball Pack", 
          color: "from-blue-600 to-red-500", 
          borderColor: "border-blue-500",
          textColor: "text-blue-600",
          bgColor: "bg-blue-50",
          tier: "Uncommon"
        };
      case 'ultraball':
        return { 
          name: "Ultra Ball Pack", 
          color: "from-yellow-400 to-black", 
          borderColor: "border-yellow-500",
          textColor: "text-yellow-600",
          bgColor: "bg-yellow-50",
          tier: "Rare"
        };
      case 'masterball':
        return { 
          name: "Master Ball Pack", 
          color: "from-purple-600 to-pink-400", 
          borderColor: "border-purple-500",
          textColor: "text-purple-600",
          bgColor: "bg-purple-50",
          tier: "Legendary"
        };
      default:
        return { 
          name: "Mystery Pack", 
          color: "from-gray-600 to-gray-400", 
          borderColor: "border-gray-500",
          textColor: "text-gray-600",
          bgColor: "bg-gray-50",
          tier: "Unknown"
        };
    }
  };

  // Group packs by tier and count them
  const groupedPacks = (userPacks as any[] || []).reduce((acc: any, pack: any) => {
    const tier = pack.tier || 'unknown';
    if (!acc[tier]) {
      acc[tier] = [];
    }
    // Only include packs that are not currently being opened
    if (pack.id !== openingPack) {
      acc[tier].push(pack);
    }
    return acc;
  }, {});

  const packTiers = ['pokeball', 'greatball', 'ultraball', 'masterball'];

  // Pokemon pack images component
  const PackImage = ({ packType, size = 'large' }: { packType: string; size?: 'small' | 'large' }) => {
    const getPackImage = (type: string) => {
      switch (type.toLowerCase()) {
        case 'pokeball':
          return "/assets/pokeball.png";
        case 'greatball':
          return "/assets/greatball.png";
        case 'ultraball':
          return "/assets/ultraball.png";
        case 'masterball':
          return "/assets/masterball.png";
        case 'luxury':
          return "/assets/masterball.png"; // Use masterball for luxury pack
        default:
          return "/assets/pokeball.png";
      }
    };
    
    const imageSize = size === 'small' ? 'w-16 h-20' : 'w-48 h-60';
    
    return (
      <div className={`${imageSize} mx-auto`}>
        <img 
          src={getPackImage(packType)} 
          alt={`${packType} pack`}
          className="w-full h-full object-contain pixel-crisp"
          style={{ imageRendering: 'pixelated' }}
          onError={(e) => {
            console.error('Pack image failed to load:', getPackImage(packType));
            e.currentTarget.src = "/assets/pokeball.png"; // Fallback to pokeball
          }}
        />
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Package2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
              <p>Loading your packs...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const noPacks = !userPacks || (userPacks as any[]).length === 0;

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

      <div className="min-h-screen pt-20 pb-20 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <motion.div 
            className="text-center space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <Gift className="h-6 w-6 sm:h-8 sm:w-8 text-[#22D3EE]" />
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
                <span className="bg-gradient-to-r from-[#7C3AED] via-[#A855F7] to-[#22D3EE] bg-clip-text text-transparent">
                  My Packs
                </span>
              </h1>
            </div>
            <p className="text-sm sm:text-base lg:text-lg text-[#E5E7EB] max-w-2xl mx-auto">
              Open your earned packs to discover amazing cards! Higher tier packs have better odds for rare cards.
            </p>
            {!noPacks && (
              <div className="flex justify-center mt-4">
                <div className="text-center bg-[#151521]/40 backdrop-blur-[15px] border border-[#26263A]/50 rounded-xl px-4 sm:px-6 py-3 sm:py-4">
                  <p className="text-xl sm:text-2xl font-bold text-[#22D3EE]">{(userPacks as any[] || []).length}</p>
                  <p className="text-xs sm:text-sm text-[#9CA3AF]">Total Packs</p>
                </div>
              </div>
            )}
          </motion.div>

          {noPacks ? (
            /* No Packs State */
            <motion.div 
              className="text-center py-16"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="bg-[#151521]/40 backdrop-blur-[15px] border border-[#26263A]/50 rounded-2xl max-w-md mx-auto p-8 shadow-[0_0_30px_rgba(0,0,0,0.3)]">
                <PackImage packType="pokeball" size="large" />
                <h3 className="text-xl font-bold text-[#E5E7EB] mb-2 mt-6">No Packs Yet</h3>
                <p className="text-[#9CA3AF] mb-6">Play Minigames to earn Mystery Packs</p>
                <Button asChild className="bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] hover:from-[#6D28D9] hover:to-[#0891B2] shadow-[0_0_15px_rgba(124,58,237,0.4)]">
                  <a href="/play" data-testid="button-play">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Play
                  </a>
                </Button>
              </div>
            </motion.div>
          ) : (
            /* Mobile-Optimized Pack Grid */
            <motion.div 
              className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 py-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {packTiers.map((tier, index) => {
                const packs = groupedPacks[tier] || [];
                const packDisplay = getPackTypeDisplay(tier);
                
                return (
                  <motion.div 
                    key={tier} 
                    className="text-center"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="bg-[#151521]/40 backdrop-blur-[15px] border border-[#26263A]/50 rounded-xl p-3 sm:p-4 lg:p-6 shadow-[0_0_20px_rgba(0,0,0,0.3)] h-full flex flex-col">
                      <h3 className="text-sm sm:text-base lg:text-xl font-bold mb-2 sm:mb-3 lg:mb-4 text-[#E5E7EB]">
                        {packDisplay.name}
                      </h3>
                      <div className="mb-3 sm:mb-4 lg:mb-6 flex-1 flex items-center justify-center">
                        <PackImage packType={tier} size="large" />
                      </div>
                      
                      {packs.length > 0 && (
                        <div className="space-y-2 sm:space-y-3">
                          <Badge className="bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] text-white border-0 text-xs sm:text-sm px-2 sm:px-3 py-1">
                            {packs.length} available
                          </Badge>
                          
                          <div className="space-y-2">
                            <Button 
                              onClick={() => handleOpenPack(tier)}
                              disabled={openingPack !== null}
                              className="w-full bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] hover:from-[#6D28D9] hover:to-[#0891B2] shadow-[0_0_15px_rgba(124,58,237,0.4)] text-white hover:opacity-90 transition-opacity text-xs sm:text-sm"
                              data-testid={`button-open-pack-${tier}`}
                              size="sm"
                            >
                              {openingPack ? (
                                <div className="flex items-center gap-1 sm:gap-2">
                                  <div className="w-2 h-2 sm:w-3 sm:h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  <span className="hidden sm:inline">Opening...</span>
                                  <span className="sm:hidden">...</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 sm:gap-2">
                                  <Package2 className="h-3 w-3" />
                                  <span className="hidden sm:inline">Open Pack</span>
                                  <span className="sm:hidden">Open</span>
                                </div>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {packs.length === 0 && (
                        <div className="mt-2 sm:mt-4">
                          <p className="text-xs sm:text-sm text-[#9CA3AF]">No packs</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

        </div>

        {/* Compact Pack Odds Section */}
        <motion.div 
          className="max-w-4xl mx-auto mt-8 mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="text-center mb-4">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1">
              <span className="bg-gradient-to-r from-[#7C3AED] via-[#A855F7] to-[#22D3EE] bg-clip-text text-transparent">
                Pack Odds
              </span>
            </h2>
            <p className="text-sm sm:text-base text-[#9CA3AF]">Probability of pulling each tier</p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {/* Pokeball Pack */}
            <motion.div 
              className="bg-[#151521]/40 backdrop-blur-[15px] border border-[#26263A]/50 rounded-xl p-3 sm:p-4 lg:p-6 shadow-[0_0_20px_rgba(0,0,0,0.3)]"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-center mb-3">
                <div className="flex justify-center mb-2">
                  <PackImage packType="pokeball" size="large" />
                </div>
                <h3 className="font-bold text-sm sm:text-base lg:text-lg text-[#E5E7EB]">Pokeball Pack</h3>
              </div>
              <div className="space-y-1 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">D Tier:</span>
                  <span className="font-semibold text-[#E5E7EB]">60%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#10b981]">C Tier:</span>
                  <span className="font-semibold text-[#E5E7EB]">20%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#3b82f6]">B Tier:</span>
                  <span className="font-semibold text-[#E5E7EB]">10%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8b5cf6]">A Tier:</span>
                  <span className="font-semibold text-[#E5E7EB]">5%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#f59e0b]">S Tier:</span>
                  <span className="font-semibold text-[#E5E7EB]">3%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#ec4899]">SS Tier:</span>
                  <span className="font-semibold text-[#E5E7EB]">1.5%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#ef4444]">SSS Tier:</span>
                  <span className="font-semibold text-[#E5E7EB]">0.5%</span>
                </div>
              </div>
            </motion.div>

            {/* Greatball Pack */}
            <motion.div 
              className="bg-[#151521]/40 backdrop-blur-[15px] border border-[#26263A]/50 rounded-xl p-3 sm:p-4 lg:p-6 shadow-[0_0_20px_rgba(0,0,0,0.3)]"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-center mb-3">
                <div className="flex justify-center mb-2">
                  <PackImage packType="greatball" size="large" />
                </div>
                <h3 className="font-bold text-sm sm:text-base lg:text-lg text-[#E5E7EB]">Great Ball Pack</h3>
              </div>
              <div className="space-y-1 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">D Tier:</span>
                  <span className="font-semibold text-[#E5E7EB]">12%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#10b981]">C Tier:</span>
                  <span className="font-semibold text-[#E5E7EB]">30%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#3b82f6]">B Tier:</span>
                  <span className="font-semibold text-[#E5E7EB]">25%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8b5cf6]">A Tier:</span>
                  <span className="font-semibold text-[#E5E7EB]">20%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#f59e0b]">S Tier:</span>
                  <span className="font-semibold text-[#E5E7EB]">8%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#ec4899]">SS Tier:</span>
                  <span className="font-semibold text-[#E5E7EB]">3%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#ef4444]">SSS Tier:</span>
                  <span className="font-semibold text-[#E5E7EB]">2%</span>
                </div>
              </div>
            </motion.div>

            {/* Ultraball Pack */}
            <motion.div 
              className="bg-[#151521]/40 backdrop-blur-[15px] border border-[#26263A]/50 rounded-xl p-3 sm:p-4 lg:p-6 shadow-[0_0_20px_rgba(0,0,0,0.3)]"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-center mb-3">
                <div className="flex justify-center mb-2">
                  <PackImage packType="ultraball" size="large" />
                </div>
                <h3 className="font-bold text-sm sm:text-base lg:text-lg text-[#E5E7EB]">Ultra Ball Pack</h3>
              </div>
              <div className="space-y-1 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">D Tier:</span>
                  <span className="font-semibold text-[#E5E7EB]">7%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#10b981]">C Tier:</span>
                  <span className="font-semibold text-[#E5E7EB]">20%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#3b82f6]">B Tier:</span>
                  <span className="font-semibold text-[#E5E7EB]">30%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8b5cf6]">A Tier:</span>
                  <span className="font-semibold text-[#E5E7EB]">25%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#f59e0b]">S Tier:</span>
                  <span className="font-semibold text-[#E5E7EB]">10%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#ec4899]">SS Tier:</span>
                  <span className="font-semibold text-[#E5E7EB]">5%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#ef4444]">SSS Tier:</span>
                  <span className="font-semibold text-[#E5E7EB]">3%</span>
                </div>
              </div>
            </motion.div>

            {/* Masterball Pack */}
            <motion.div 
              className="bg-[#151521]/40 backdrop-blur-[15px] border border-[#26263A]/50 rounded-xl p-3 sm:p-4 lg:p-6 shadow-[0_0_20px_rgba(0,0,0,0.3)]"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-center mb-3">
                <div className="flex justify-center mb-2">
                  <PackImage packType="masterball" size="large" />
                </div>
                <h3 className="font-bold text-sm sm:text-base lg:text-lg text-[#E5E7EB]">Master Ball Pack</h3>
              </div>
              <div className="space-y-1 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">D Tier:</span>
                  <span className="font-semibold text-[#E5E7EB]">5%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#10b981]">C Tier:</span>
                  <span className="font-semibold text-[#E5E7EB]">15%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#3b82f6]">B Tier:</span>
                  <span className="font-semibold text-[#E5E7EB]">25%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8b5cf6]">A Tier:</span>
                  <span className="font-semibold text-[#E5E7EB]">30%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#f59e0b]">S Tier:</span>
                  <span className="font-semibold text-[#E5E7EB]">12%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#ec4899]">SS Tier:</span>
                  <span className="font-semibold text-[#E5E7EB]">8%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#ef4444]">SSS Tier:</span>
                  <span className="font-semibold text-[#E5E7EB]">5%</span>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
      {/* Navigation Footer */}
      <NavigationFooter />
      
      {/* Pack Opening Animation */}
      {showAnimation && packOpenData && (
        <PackOpeningAnimation
          packCards={packOpenData.packCards}
          hitCardPosition={packOpenData.hitCardPosition}
          onComplete={handleAnimationComplete}
          packType={getPackTypeDisplay(packOpenData.packType).name}
        />
      )}
    </div>
  );
}