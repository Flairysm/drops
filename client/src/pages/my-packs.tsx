import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Navigation } from "@/components/Navigation";
import { NavigationFooter } from "@/components/NavigationFooter";
import { PackOpeningAnimation } from "@/components/PackOpeningAnimation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package2, Sparkles, Gift, Eye } from "lucide-react";
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
  
  // Prize pool state
  const [showPrizePool, setShowPrizePool] = useState(true);
  const [mysteryPackData, setMysteryPackData] = useState<any>(null);
  const [isLoadingPrizePool, setIsLoadingPrizePool] = useState(false);
  const [openingPack, setOpeningPack] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [packOpenData, setPackOpenData] = useState<OpenPackResult | null>(null);

  // Fetch prize pool data
  const fetchPrizePoolData = async () => {
    setIsLoadingPrizePool(true);
    try {
      // Fetch mystery pack data (pokeball pack)
      const mysteryResponse = await apiRequest('GET', '/api/admin/mystery-packs/mystery-pokeball');
      if (mysteryResponse.ok) {
        setMysteryPackData(await mysteryResponse.json());
      }
    } catch (error) {
      console.error('Error fetching prize pool data:', error);
      toast({
        title: "Error",
        description: "Failed to load prize pool data",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPrizePool(false);
    }
  };

  // Auto-fetch prize pool data when component mounts
  useEffect(() => {
    fetchPrizePoolData();
  }, []);

  // Fetch user's packs
  const { data: userPacks, isLoading } = useQuery({
    queryKey: ["/api/packs"],
  });

  const openPackMutation = useMutation({
    mutationFn: async (packId: string) => {
      console.log('Starting pack opening for ID:', packId);
      const response = await apiRequest("POST", `/api/packs/open/${packId}`);
      const result = await response.json();
      console.log('✅ Pack opening successful:', result);
      return result;
    },
    onSuccess: (result, packId) => {
      console.log('Pack opening mutation success for ID:', packId);
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
  };


  const getPackTypeDisplay = (displayKey: string) => {
    console.log(`Pack display: displayKey="${displayKey}"`);
    
    switch ((displayKey || '').toLowerCase()) {
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
      case 'classic':
        return { 
          name: "Classic Pack", 
          color: "from-orange-600 to-yellow-400", 
          borderColor: "border-orange-500",
          textColor: "text-orange-600",
          bgColor: "bg-orange-50",
          tier: "Classic"
        };
      case 'special':
        return { 
          name: "Special Pack", 
          color: "from-green-600 to-emerald-400", 
          borderColor: "border-green-500",
          textColor: "text-green-600",
          bgColor: "bg-green-50",
          tier: "Special"
        };
      case 'raffle_physical':
        return { 
          name: "Raffle Prize", 
          color: "from-indigo-600 to-purple-400", 
          borderColor: "border-indigo-500",
          textColor: "text-indigo-600",
          bgColor: "bg-indigo-50",
          tier: "Prize"
        };
      default:
        return { 
          name: displayKey || "Mystery Pack", 
          color: "from-gray-600 to-gray-400", 
          borderColor: "border-gray-500",
          textColor: "text-gray-600",
          bgColor: "bg-gray-50",
          tier: "Special"
        };
    }
  };

  // Group packs by pack type and tier for proper display
  const groupedPacks = (userPacks as any[] || []).reduce((acc: any, pack: any) => {
    let displayKey = pack.tier || 'unknown';
    
    // Skip packs that reference non-existent packs (like Mega Evolution Booster Pack)
    if (displayKey.toLowerCase().includes('mega evolution') || 
        displayKey.toLowerCase().includes('booster pack')) {
      return acc;
    }
    
    // For classic packs, use 'classic' as the display key
    if (pack.packType === 'classic') {
      displayKey = 'classic';
    }
    // For special packs, use 'special' as the display key
    else if (pack.packType === 'special') {
      displayKey = 'special';
    }
    // For raffle physical prizes, use 'raffle_physical' as the display key
    else if (pack.packType === 'raffle_physical') {
      displayKey = 'raffle_physical';
    }
    // For mystery packs, use the tier (pokeball, greatball, ultraball, masterball)
    else if (pack.packType === 'mystery') {
      displayKey = pack.tier || 'pokeball';
    }
    
    if (!acc[displayKey]) {
      acc[displayKey] = [];
    }
    // Only include packs that are not currently being opened
    if (pack.id !== openingPack) {
      acc[displayKey].push(pack);
    }
    return acc;
  }, {});

  // Get all unique display keys from user's packs, with standard tiers first
  const standardTiers = ['pokeball', 'greatball', 'ultraball', 'masterball'];
  const userDisplayKeys = (userPacks as any[] || []).map(pack => {
    // Skip packs that reference non-existent packs (like Mega Evolution Booster Pack)
    if (pack.tier && (pack.tier.toLowerCase().includes('mega evolution') || 
                     pack.tier.toLowerCase().includes('booster pack'))) {
      return null;
    }
    
    if (pack.packType === 'classic') return 'classic';
    if (pack.packType === 'special') return 'special';
    if (pack.packType === 'raffle_physical') return 'raffle_physical';
    return pack.tier || 'unknown';
  }).filter(Boolean);
  const uniqueUserDisplayKeys = [...new Set(userDisplayKeys)];
  
  const packTiers = [...standardTiers, ...uniqueUserDisplayKeys.filter(key => 
    !standardTiers.includes(key) && 
    !key.toLowerCase().includes('mega evolution') &&
    !key.toLowerCase().includes('booster pack')
  )];

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
        case 'classic':
          return "/assets/classic-image.png"; // Use classic pack image for classic packs
        case 'special':
          return "/assets/classic-image.png"; // Use classic pack image for special packs
        case 'raffle_physical':
          return "/assets/classic-image.png"; // Use classic pack image for raffle prizes
        case 'luxury':
          return "/assets/masterball.png"; // Use masterball for luxury pack
        case 'pe etb':
          return "/assets/classic-image.png"; // Use classic pack image for PE ETB
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
    <div className="min-h-screen relative overflow-hidden pb-24">
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

      <div className="min-h-screen pt-20 pb-24 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <motion.div 
            className="text-center space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
                <span className="bg-gradient-to-r from-[#7C3AED] via-[#A855F7] to-[#22D3EE] bg-clip-text text-transparent">
                  My Packs
                </span>
              </h1>
            </div>
            <p className="text-sm sm:text-base lg:text-lg text-[#E5E7EB] max-w-2xl mx-auto">
              Open your earned packs to discover amazing cards! Higher tier packs have better odds for rare cards.
            </p>
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

        {/* Prize Pool Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-12"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <div className="w-1 h-8 bg-gradient-to-b from-[#f59e0b] via-[#f97316] to-[#ef4444] rounded-full mr-4 shadow-[0_0_8px_rgba(245,158,11,0.3)]"></div>
              <h2 className="text-2xl sm:text-3xl font-semibold text-[#E5E7EB] tracking-[-0.03em] leading-[1.15]">Mystery Pack Prize Pool</h2>
            </div>
            <Button
              onClick={() => setShowPrizePool(!showPrizePool)}
              className="bg-gradient-to-r from-[#22D3EE] to-[#0EA5E9] hover:from-[#0EA5E9] hover:to-[#0284C7] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Eye className="w-4 h-4 mr-2" />
              {showPrizePool ? 'Hide' : 'Show'} Prize Pool
            </Button>
          </div>

          {showPrizePool && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-10"
            >
              {/* Mystery Pack Prize Pool */}
              {mysteryPackData && (
                <Card className="gaming-card bg-gradient-to-br from-gray-900 to-gray-800 border-gray-600 shadow-2xl">
                  <CardContent className="p-8">
                    {isLoadingPrizePool ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#22D3EE]"></div>
                      </div>
                    ) : mysteryPackData?.cards?.length > 0 ? (
                      <div className="space-y-8">
                        {['SSS', 'SS', 'S', 'A', 'B', 'C'].map((tier) => {
                          const tierCards = mysteryPackData.cards.filter((card: any) => 
                            (card.cardTier || 'D') === tier
                          );
                          
                          if (tierCards.length === 0) return null;
                          
                          return (
                            <div key={tier} className="space-y-4">
                              <div className="flex items-center gap-3">
                                <Badge 
                                  className={`text-sm font-bold px-3 py-1 ${
                                    tier === 'SSS' ? 'bg-red-500' :
                                    tier === 'SS' ? 'bg-purple-500' :
                                    tier === 'S' ? 'bg-blue-500' :
                                    tier === 'A' ? 'bg-green-500' :
                                    tier === 'B' ? 'bg-yellow-500' :
                                    tier === 'C' ? 'bg-blue-500' :
                                    'bg-gray-500'
                                  } text-white`}
                                >
                                  {tier} Tier
                                </Badge>
                                <span className="text-gray-300 text-sm">
                                  {tierCards.length} card{tierCards.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4">
                                {tierCards.map((card: any, index: number) => (
                                  <motion.div
                                    key={`${card.id}-${index}`}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="relative group"
                                  >
                                    <img 
                                      src={card.cardImageUrl} 
                                      alt={card.cardName}
                                      className="w-full aspect-[3/4] rounded-lg object-cover border-2 border-gray-600 hover:border-[#22D3EE]/50 transition-colors duration-200"
                                    />
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-300">
                        No cards available in this pack.
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Mystery Pack Odds Section */}
        <motion.div 
          className="max-w-6xl mx-auto mt-8 mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="text-center mb-6">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1">
              <span className="bg-gradient-to-r from-[#7C3AED] via-[#A855F7] to-[#22D3EE] bg-clip-text text-transparent">
                Mystery Pack Odds
              </span>
            </h2>
            <p className="text-sm sm:text-base text-[#9CA3AF]">Hit card odds for each mystery pack type (7 D-tier cards + 1 hit card)</p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pokeball Pack Odds */}
            <motion.div 
              className="bg-[#151521]/40 backdrop-blur-[15px] border border-[#26263A]/50 rounded-xl p-4 shadow-[0_0_20px_rgba(0,0,0,0.3)]"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-center mb-3">
                <div className="w-14 h-14 mx-auto mb-2">
                  <img 
                    src="/assets/pokeball.png" 
                    alt="Pokeball"
                    className="w-full h-full object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
                <h3 className="font-bold text-base text-[#E5E7EB] mb-1">Pokeball</h3>
                <p className="text-xs text-[#9CA3AF]">Base Odds</p>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#10b981]">C:</span>
                  <span className="font-semibold text-[#E5E7EB]">84.8%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#3b82f6]">B:</span>
                  <span className="font-semibold text-[#E5E7EB]">6%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#8b5cf6]">A:</span>
                  <span className="font-semibold text-[#E5E7EB]">4.5%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#f59e0b]">S:</span>
                  <span className="font-semibold text-[#E5E7EB]">3.5%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#ec4899]">SS:</span>
                  <span className="font-semibold text-[#E5E7EB]">1%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#ef4444]">SSS:</span>
                  <span className="font-semibold text-[#E5E7EB]">0.2%</span>
                </div>
              </div>
            </motion.div>

            {/* Greatball Pack Odds */}
            <motion.div 
              className="bg-[#151521]/40 backdrop-blur-[15px] border border-[#26263A]/50 rounded-xl p-4 shadow-[0_0_20px_rgba(0,0,0,0.3)]"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-center mb-3">
                <div className="w-14 h-14 mx-auto mb-2">
                  <img 
                    src="/assets/greatball.png" 
                    alt="Greatball"
                    className="w-full h-full object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
                <h3 className="font-bold text-base text-[#E5E7EB] mb-1">Greatball</h3>
                <p className="text-xs text-[#9CA3AF]">Improved Odds</p>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#10b981]">C:</span>
                  <span className="font-semibold text-[#E5E7EB]">40%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#3b82f6]">B:</span>
                  <span className="font-semibold text-[#E5E7EB]">30%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#8b5cf6]">A:</span>
                  <span className="font-semibold text-[#E5E7EB]">15%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#f59e0b]">S:</span>
                  <span className="font-semibold text-[#E5E7EB]">10%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#ec4899]">SS:</span>
                  <span className="font-semibold text-[#E5E7EB]">4%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#ef4444]">SSS:</span>
                  <span className="font-semibold text-[#E5E7EB]">1%</span>
                </div>
              </div>
            </motion.div>

            {/* Ultraball Pack Odds */}
            <motion.div 
              className="bg-[#151521]/40 backdrop-blur-[15px] border border-[#26263A]/50 rounded-xl p-4 shadow-[0_0_20px_rgba(0,0,0,0.3)]"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-center mb-3">
                <div className="w-14 h-14 mx-auto mb-2">
                  <img 
                    src="/assets/ultraball.png" 
                    alt="Ultraball"
                    className="w-full h-full object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
                <h3 className="font-bold text-base text-[#E5E7EB] mb-1">Ultraball</h3>
                <p className="text-xs text-[#9CA3AF]">B+ Guaranteed</p>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#3b82f6]">B:</span>
                  <span className="font-semibold text-[#E5E7EB]">50%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#8b5cf6]">A:</span>
                  <span className="font-semibold text-[#E5E7EB]">25%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#f59e0b]">S:</span>
                  <span className="font-semibold text-[#E5E7EB]">15%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#ec4899]">SS:</span>
                  <span className="font-semibold text-[#E5E7EB]">7%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#ef4444]">SSS:</span>
                  <span className="font-semibold text-[#E5E7EB]">3%</span>
                </div>
              </div>
            </motion.div>

            {/* Masterball Pack Odds */}
            <motion.div 
              className="bg-[#151521]/40 backdrop-blur-[15px] border border-[#26263A]/50 rounded-xl p-4 shadow-[0_0_20px_rgba(0,0,0,0.3)]"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="text-center mb-3">
                <div className="w-14 h-14 mx-auto mb-2">
                  <img 
                    src="/assets/masterball.png" 
                    alt="Masterball"
                    className="w-full h-full object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
                <h3 className="font-bold text-base text-[#E5E7EB] mb-1">Masterball</h3>
                <p className="text-xs text-[#9CA3AF]">A+ Guaranteed</p>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#8b5cf6]">A:</span>
                  <span className="font-semibold text-[#E5E7EB]">50%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#f59e0b]">S:</span>
                  <span className="font-semibold text-[#E5E7EB]">30%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#ec4899]">SS:</span>
                  <span className="font-semibold text-[#E5E7EB]">15%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#ef4444]">SSS:</span>
                  <span className="font-semibold text-[#E5E7EB]">5%</span>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

      </div>
      
      {/* Pack Opening Animation */}
      {showAnimation && packOpenData && (
        <PackOpeningAnimation
          key="mystery-pack-animation"
          packCards={packOpenData.packCards}
          hitCardPosition={packOpenData.hitCardPosition}
          onComplete={handleAnimationComplete}
          packType={getPackTypeDisplay(packOpenData.packType).name}
        />
      )}
    </div>
    
    {/* Navigation Footer - Outside main container for proper viewport positioning */}
    <NavigationFooter />
  );
}