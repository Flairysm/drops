import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { NavigationFooter } from "@/components/NavigationFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ClassicPackPopup } from "@/components/ClassicPackPopup";
import { SpecialPackPopup } from "@/components/SpecialPackPopup";
import { Gift, Users, Trophy, Star, Coins, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";

// Game data structure
interface GameItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  image?: string;
  gradient?: string;
  route: string;
  comingSoon?: boolean;
  badge?: string;
  badgeColor?: string;
}

// Raffle interface
interface Raffle {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  totalSlots: number;
  pricePerSlot: string;
  filledSlots: number;
  maxWinners: number;
  status: string;
  isActive: boolean;
  autoDraw: boolean;
  drawnAt: string;
  createdAt: string;
  creator: {
    username: string;
  };
  prizes: Array<{
    id: number;
    position: number;
    name: string;
    type: string;
    value: string;
    imageUrl?: string;
  }>;
  winners?: Array<{
    id: number;
    userId: string;
    prizePosition: number;
    wonAt: string;
    prizeName: string;
    prizeImageUrl?: string;
    winnerUsername: string;
  }>;
}

const gameData = {
  minigames: [
    {
      id: "findpika",
      name: "Find Pikachu",
      description: "Find all the Pikachus!",
      cost: 300,
      image: "/assets/find-pika-image.png",
      route: "/play/findpika"
    },
    {
      id: "energy-match",
      name: "Energy Match",
      description: "Match energy cards to win packs!",
      cost: 200,
      image: "/assets/energy-match.png",
      route: "/play/energy-match"
    },
    {
      id: "dice",
      name: "Pokemon Dice",
      description: "Roll 5 dice and match Pokemon types!",
      cost: 250,
      image: "/assets/pokeball.png",
      route: "/play/dice"
    }
  ] as GameItem[],
  specialPacks: [] as GameItem[],
  classicPacks: [] as GameItem[]
};

export default function Play() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [selectedClassicPack, setSelectedClassicPack] = useState<any>(null);
  const [isClassicPackPopupOpen, setIsClassicPackPopupOpen] = useState(false);
  const [selectedSpecialPack, setSelectedSpecialPack] = useState<any>(null);
  const [isSpecialPackPopupOpen, setIsSpecialPackPopupOpen] = useState(false);
  
  // Raffle state
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [selectedRaffle, setSelectedRaffle] = useState<Raffle | null>(null);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showRaffleDetails, setShowRaffleDetails] = useState(false);
  const [slotsToJoin, setSlotsToJoin] = useState(1);
  const [isJoining, setIsJoining] = useState(false);
  const [completedRaffles, setCompletedRaffles] = useState<Raffle[]>([]);
  const [showCompletedRaffles, setShowCompletedRaffles] = useState(false);

  // Handle classic pack click
  const handleClassicPackClick = (game: any) => {
    // Find the original pack data from availablePacks
    const originalPack = availablePacks?.classicPacks?.find((pack: any) => pack.id === game.id);
    setSelectedClassicPack(originalPack);
    setIsClassicPackPopupOpen(true);
  };

  // Handle special pack click
  const handleSpecialPackClick = (game: any) => {
    // Find the original pack data from availablePacks
    const originalPack = availablePacks?.specialPacks?.find((pack: any) => pack.id === game.id);
    setSelectedSpecialPack(originalPack);
    setIsSpecialPackPopupOpen(true);
  };

  // Raffle functions
  const fetchRaffles = async () => {
    try {
      const response = await apiRequest("GET", "/api/raffles");
      console.log('fetchRaffles response:', response);
      const data = await response.json();
      console.log('fetchRaffles parsed data:', data);
      if (data.success) {
        console.log('Setting raffles:', data.raffles);
        setRaffles(data.raffles);
      }
    } catch (error) {
      console.error('Error fetching raffles:', error);
    }
  };

  const handleJoinRaffle = (raffle: Raffle) => {
    setSelectedRaffle(raffle);
    setSlotsToJoin(1);
    setShowJoinDialog(true);
  };

  const handleConfirmJoin = async () => {
    if (!selectedRaffle || slotsToJoin < 1) return;

    // Check user credits before attempting to join
    const totalCost = parseFloat(selectedRaffle.pricePerSlot || '0') * slotsToJoin;
    const userCredits = parseFloat((user as any)?.credits || '0');
    if (user && userCredits < totalCost) {
      toast({
        title: "Insufficient Credits",
        description: `You need ${totalCost} credits to join with ${slotsToJoin} slot(s). You have ${userCredits} credits.`,
        variant: "destructive"
      });
      return;
    }

    // Additional validation
    const availableSlots = selectedRaffle.totalSlots - (selectedRaffle.filledSlots || 0);
    if (slotsToJoin > availableSlots) {
      toast({
        title: "Invalid Selection",
        description: `Only ${availableSlots} slots are available. Please adjust your selection.`,
        variant: "destructive"
      });
      return;
    }

    if (slotsToJoin > 100) {
      toast({
        title: "Too Many Slots",
        description: "Maximum 100 slots per transaction. Please reduce your selection.",
        variant: "destructive"
      });
      return;
    }

    setIsJoining(true);
    try {
      const response = await apiRequest("POST", `/api/raffles/${selectedRaffle.id}/join`, {
        slots: slotsToJoin
      });

      const data = await response.json();
      if (data.success) {
        setShowJoinDialog(false);
        setSelectedRaffle(null);
        setSlotsToJoin(1); // Reset to default
        fetchRaffles(); // Refresh raffles to show updated slot counts
        toast({
          title: "Success!",
          description: `Successfully joined raffle with ${slotsToJoin} slot(s)!`,
        });
      } else {
        // Handle server error responses
        toast({
          title: "Error",
          description: data.message || "Failed to join raffle. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error joining raffle:', error);
      
      // Handle specific error cases
      if (error.message?.includes('Insufficient credits')) {
        toast({
          title: "Insufficient Credits",
          description: "You don't have enough credits to join this raffle.",
          variant: "destructive"
        });
      } else if (error.message?.includes('slots available')) {
        toast({
          title: "No Slots Available",
          description: error.message,
          variant: "destructive"
        });
      } else if (error.message?.includes('no longer active')) {
        toast({
          title: "Raffle Inactive",
          description: "This raffle is no longer active.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to join raffle. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsJoining(false);
    }
  };


  const fetchCompletedRaffles = async () => {
    try {
      const response = await apiRequest("GET", "/api/raffles/completed");
      const data = await response.json();
      if (data.success) {
        setCompletedRaffles(data.raffles);
        setShowCompletedRaffles(true);
      }
    } catch (error) {
      console.error('Error fetching completed raffles:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'filled': return 'bg-yellow-500';
      case 'completed': return 'bg-blue-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getProgressPercentage = (filled: number, total: number) => {
    return Math.round((filled / total) * 100);
  };

  // Fetch raffles when component mounts
  useEffect(() => {
    if (isAuthenticated) {
      fetchRaffles();
    }
  }, [isAuthenticated]);

  // Handle pack opening (no longer needed since animation is in popup)
  const handleOpenPack = (packId: string) => {
    // This function is no longer used since pack opening is handled in the popup
    console.log('Pack opening handled in popup:', packId);
  };

  // Fetch available packs
  const { data: availablePacks, isLoading: packsLoading } = useQuery({
    queryKey: ["/api/available-packs"],
    queryFn: async () => {
      const response = await fetch("/api/available-packs");
      if (!response.ok) {
        throw new Error("Failed to fetch available packs");
      }
      return response.json();
    },
    enabled: isAuthenticated,
  });


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
  const GameCard = ({ game, isLarge = false, delay = 0, onClassicPackClick, onSpecialPackClick }: { game: GameItem, isLarge?: boolean, delay?: number, onClassicPackClick?: (pack: any) => void, onSpecialPackClick?: (pack: any) => void }) => {
    const cardSize = isLarge ? "w-72 h-64" : "w-56 h-48";
    
    const handleClick = () => {
      if (game.comingSoon) return;
      
      // Check if this is a classic pack
      if (game.badge === "Classic" && onClassicPackClick) {
        onClassicPackClick(game);
      } else if (game.badge === "Special" && onSpecialPackClick) {
        onSpecialPackClick(game);
      } else {
        window.location.href = game.route;
      }
    };
    
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
          onClick={handleClick}
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
                <span className="text-white text-2xl font-bold">{game.name}</span>
              </div>
            )}
            
            {/* Overlay with game info */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 rounded-b-2xl">
              <div className="text-white">
                {/* Badge */}
                {game.badge && (
                  <Badge className={`bg-gradient-to-r ${game.badgeColor} text-white border-0 mb-1 text-xs`}>
                    {game.badge}
                  </Badge>
                )}
                
                {/* Cost */}
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-[#22D3EE] font-bold">
                      {game.cost > 0 ? `${game.cost} Credits` : 'Coming Soon'}
                    </span>
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
            
            {/* Raffle Events Section */}
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  {/* Neon Strip */}
                  <div className="w-1 h-8 bg-gradient-to-b from-[#8b5cf6] via-[#a855f7] to-[#c084fc] rounded-full mr-4 shadow-[0_0_8px_rgba(139,92,246,0.3)]"></div>
                  
                  {/* Raffle Events Title */}
                  <h2 className="text-2xl sm:text-3xl font-semibold text-[#E5E7EB] tracking-[-0.03em] leading-[1.15]">Raffle Events</h2>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchCompletedRaffles}
                    className="text-white border-gray-600 hover:bg-gray-800"
                  >
                    <Trophy className="w-4 h-4 mr-1" />
                    View Completed
                  </Button>
                </div>
              </div>
              
              {(() => {
                console.log('Current raffles state:', raffles);
                console.log('Raffles length:', raffles.length);
                return raffles.length === 0;
              })() ? (
                <Card className="gaming-card">
                  <CardContent className="p-12 text-center">
                    <Gift className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Active Raffles</h3>
                    <p className="text-gray-400">Check back later for new raffle opportunities!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
                  {raffles.map((raffle) => (
                    <div key={raffle.id} className="flex-shrink-0 w-64">
                      <Card className="gaming-card h-full">
                        <CardContent className="p-4 h-full flex flex-col">
                          {/* Prize Image */}
                          <div className="relative mb-3">
                            {raffle.imageUrl ? (
                              <img 
                                src={raffle.imageUrl} 
                                alt={raffle.title}
                                className="w-full h-48 object-cover rounded-lg border border-gray-600"
                              />
                            ) : (
                              <div className="w-full h-48 bg-gray-700 rounded-lg border border-gray-600 flex items-center justify-center">
                                <Gift className="w-12 h-12 text-gray-400" />
                              </div>
                            )}
                            
                            {/* Status Badge */}
                            <div className="absolute top-2 right-2">
                              <Badge className={`${getStatusColor(raffle.status)} text-white text-xs`}>
                                {raffle.status.toUpperCase()}
                              </Badge>
                            </div>
                          </div>

                          {/* Prize Info */}
                          <div className="flex-1 flex flex-col">
                            <h3 className="text-lg font-bold text-white mb-1 text-wrap-safe">{raffle.title}</h3>
                            
                            {/* Prize Display */}
                            {raffle.prizes && raffle.prizes.length > 0 && (
                              <div className="mb-3">
                                <div className="text-xs text-gray-400 mb-2">Prize{raffle.prizes.length > 1 ? 's' : ''}:</div>
                                <div className="space-y-2">
                                  {raffle.prizes.map((prize, index) => (
                                    <div key={prize.id || index} className="flex items-start space-x-2">
                                      {prize.imageUrl && (
                                        <img 
                                          src={prize.imageUrl} 
                                          alt={prize.name}
                                          className="w-8 h-10 object-cover rounded border border-gray-600 flex-shrink-0"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                          }}
                                        />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-1 mb-1">
                                          <span className="text-xs text-yellow-400 font-medium">
                                            {prize.position === 1 ? '1st' : prize.position === 2 ? '2nd' : prize.position === 3 ? '3rd' : `${prize.position}th`} Place:
                                          </span>
                                        </div>
                                        <span className="text-sm text-white font-semibold leading-tight break-words">
                                          {prize.name}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Progress Bar */}
                            <div className="mb-3">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs text-gray-400">Progress</span>
                                <span className="text-xs text-white font-medium">{raffle.filledSlots}/{raffle.totalSlots}</span>
                              </div>
                              <div className="w-full bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${getProgressPercentage(raffle.filledSlots, raffle.totalSlots)}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* Price and Action */}
                            <div className="mt-auto">
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-sm text-gray-400">{raffle.pricePerSlot} credits/slot</span>
                                <span className="text-sm text-yellow-400 font-medium">{raffle.maxWinners} winner{raffle.maxWinners > 1 ? 's' : ''}</span>
                              </div>
                              
                              <Button
                                onClick={() => {
                                  setSelectedRaffle(raffle);
                                  setShowRaffleDetails(true);
                                }}
                                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View Details
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              )}
            </motion.section>
            
            {/* Minigames Section */}
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="flex items-center mb-6">
                {/* Neon Strip */}
                <div className="w-1 h-8 bg-gradient-to-b from-[#f59e0b] via-[#f97316] to-[#ef4444] rounded-full mr-4 shadow-[0_0_8px_rgba(245,158,11,0.3)]"></div>
                
                {/* Minigames Title */}
                <h2 className="text-2xl sm:text-3xl font-semibold text-[#E5E7EB] tracking-[-0.03em] leading-[1.15]">Minigames</h2>
              </div>
              <div className="flex overflow-x-auto scrollbar-hide gap-4 pb-4 snap-x snap-mandatory max-w-4xl mx-auto">
                {gameData.minigames.map((game, index) => (
                  <GameCard key={game.id} game={game} delay={0.3 + index * 0.1} />
                ))}
              </div>
            </motion.section>
            
            {/* Special Packs Section - Only show if there are packs */}
            {availablePacks?.specialPacks?.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <div className="flex items-center mb-6">
                  {/* Neon Strip */}
                  <div className="w-1 h-8 bg-gradient-to-b from-[#f59e0b] via-[#f97316] to-[#ef4444] rounded-full mr-4 shadow-[0_0_8px_rgba(245,158,11,0.3)]"></div>
                  
                  {/* Special Packs Title */}
                  <h2 className="text-2xl sm:text-3xl font-semibold text-[#E5E7EB] tracking-[-0.03em] leading-[1.15]">Special Packs</h2>
                </div>
                <div className="flex overflow-x-auto scrollbar-hide gap-4 pb-4 snap-x snap-mandatory max-w-4xl mx-auto">
                  {availablePacks.specialPacks.map((pack: any, index: number) => (
                    <GameCard 
                      key={pack.id} 
                      game={{
                        id: pack.id,
                        name: pack.name,
                        description: pack.description || "Special pack with unique cards",
                        cost: parseFloat(pack.price),
                        image: pack.imageUrl,
                        route: `/purchase/special/${pack.id}`,
                        badge: "Special",
                        badgeColor: "bg-purple-500"
                      }} 
                      delay={0.5 + index * 0.1}
                      onSpecialPackClick={handleSpecialPackClick}
                    />
                  ))}
                </div>
              </motion.section>
            )}

            {/* Classic Packs Section - Only show if there are packs */}
            {availablePacks?.classicPacks?.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <div className="flex items-center mb-6">
                  {/* Neon Strip */}
                  <div className="w-1 h-8 bg-gradient-to-b from-[#f59e0b] via-[#f97316] to-[#ef4444] rounded-full mr-4 shadow-[0_0_8px_rgba(245,158,11,0.3)]"></div>
                  
                  {/* Classic Packs Title */}
                  <h2 className="text-2xl sm:text-3xl font-semibold text-[#E5E7EB] tracking-[-0.03em] leading-[1.15]">Classic Packs</h2>
                </div>
                <div className="flex overflow-x-auto scrollbar-hide gap-4 pb-4 snap-x snap-mandatory max-w-4xl mx-auto">
                  {availablePacks.classicPacks.map((pack: any, index: number) => (
                    <GameCard 
                      key={pack.id} 
                      game={{
                        id: pack.id,
                        name: pack.name,
                        description: pack.description || `${pack.packType} classic pack`,
                        cost: parseFloat(pack.price),
                        image: pack.imageUrl,
                        route: `/purchase/classic/${pack.id}`,
                        badge: "Classic",
                        badgeColor: "bg-orange-500"
                      }} 
                      delay={0.7 + index * 0.1}
                      onClassicPackClick={handleClassicPackClick}
                    />
                  ))}
                </div>
              </motion.section>
            )}

          </div>
        </div>
      </main>
      <NavigationFooter />

      {/* Classic Pack Popup */}
      <ClassicPackPopup
        pack={selectedClassicPack}
        isOpen={isClassicPackPopupOpen}
        onClose={() => {
          setIsClassicPackPopupOpen(false);
          setSelectedClassicPack(null);
        }}
        onOpenPack={handleOpenPack}
      />

      {/* Special Pack Popup */}
      <SpecialPackPopup
        pack={selectedSpecialPack}
        isOpen={isSpecialPackPopupOpen}
        onClose={() => {
          setIsSpecialPackPopupOpen(false);
          setSelectedSpecialPack(null);
        }}
        onOpenPack={handleOpenPack}
      />

      {/* Join Raffle Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Join Raffle</DialogTitle>
            <DialogDescription>
              How many slots would you like to purchase for "{selectedRaffle?.title}"?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="slots">Number of Slots</Label>
              <Input
                id="slots"
                type="number"
                min="1"
                max={selectedRaffle ? selectedRaffle.totalSlots - selectedRaffle.filledSlots : 1}
                value={slotsToJoin}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setSlotsToJoin(0);
                  } else {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue) && numValue >= 0) {
                      // Get available slots
                      const availableSlots = selectedRaffle ? 
                        selectedRaffle.totalSlots - (selectedRaffle.filledSlots || 0) : 0;
                      
                      // Auto-adjust if user enters more than available
                      if (numValue > availableSlots && availableSlots > 0) {
                        setSlotsToJoin(availableSlots);
                        toast({
                          title: "Auto-adjusted",
                          description: `Maximum ${availableSlots} slots available. Adjusted to ${availableSlots}.`,
                          variant: "default"
                        });
                      } else {
                        setSlotsToJoin(numValue);
                      }
                    }
                  }
                }}
              />
            </div>
            
            {selectedRaffle && (
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Your Credits:</span>
                  <span className="text-green-400 font-semibold">
                    {(user as any)?.credits || 0} credits
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Credits per slot:</span>
                  <span className="text-white">{selectedRaffle.pricePerSlot} credits</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Number of slots:</span>
                  <span className="text-white">{slotsToJoin}</span>
                </div>
                {selectedRaffle && (
                  <div className="text-xs text-gray-500 mb-2">
                    Available slots: {selectedRaffle.totalSlots - (selectedRaffle.filledSlots || 0)} / {selectedRaffle.totalSlots}
                    {slotsToJoin > (selectedRaffle.totalSlots - (selectedRaffle.filledSlots || 0)) && (
                      <span className="text-red-400 ml-2">⚠️ Exceeds available slots</span>
                    )}
                  </div>
                )}
                <hr className="border-gray-600 my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-white font-semibold">Total cost:</span>
                  <span className="text-yellow-400 font-bold">
                    {slotsToJoin > 0 ? parseFloat(selectedRaffle.pricePerSlot) * slotsToJoin : 0} credits
                  </span>
                </div>
                {slotsToJoin > 0 && (
                  <div className="mt-2 text-xs text-gray-400">
                    Remaining after purchase: {Math.max(0, ((user as any)?.credits || 0) - (parseFloat(selectedRaffle.pricePerSlot) * slotsToJoin))} credits
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJoinDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmJoin}
              disabled={
                isJoining || 
                !selectedRaffle || 
                slotsToJoin < 1 || 
                (user ? parseFloat((user as any)?.credits || '0') < (parseFloat(selectedRaffle.pricePerSlot || '0') * slotsToJoin) : false)
              }
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isJoining ? 'Joining...' : 
               (user ? parseFloat((user as any)?.credits || '0') < (parseFloat(selectedRaffle?.pricePerSlot || '0') * slotsToJoin) : false) ? 'Insufficient Credits' : 
               'Join Raffle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Raffle Details Dialog */}
      <Dialog open={showRaffleDetails} onOpenChange={setShowRaffleDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b border-gray-600">
            <DialogTitle className="text-2xl font-bold text-white">{selectedRaffle?.title}</DialogTitle>
            <DialogDescription className="text-gray-400">
              View raffle details, prizes, and join information
            </DialogDescription>
          </DialogHeader>
          
          {selectedRaffle && (
            <>
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 pt-6 space-y-6">
              {/* Raffle Image */}
              <div className="relative">
                {selectedRaffle.imageUrl ? (
                  <img 
                    src={selectedRaffle.imageUrl} 
                    alt={selectedRaffle.title}
                    className="w-64 h-64 object-cover rounded-lg border border-gray-600 mx-auto"
                  />
                ) : (
                  <div className="w-64 h-64 bg-gray-700 rounded-lg border border-gray-600 flex items-center justify-center mx-auto">
                    <Gift className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Raffle Stats */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Raffle Information</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-800 p-3 rounded-lg text-center">
                    <p className="text-gray-400 text-xs">Total Slots</p>
                    <p className="text-white font-semibold text-lg">{selectedRaffle.totalSlots}</p>
                  </div>
                  <div className="bg-gray-800 p-3 rounded-lg text-center">
                    <p className="text-gray-400 text-xs">Credits per Slot</p>
                    <p className="text-white font-semibold text-lg">{selectedRaffle.pricePerSlot}</p>
                  </div>
                  <div className="bg-gray-800 p-3 rounded-lg text-center">
                    <p className="text-gray-400 text-xs">Total Winners</p>
                    <p className="text-white font-semibold text-lg">{selectedRaffle.maxWinners}</p>
                  </div>
                </div>
              </div>

              {/* Progress Section */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Progress</h3>
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-gray-400">Raffle Progress</span>
                    <span className="text-sm text-white font-medium">
                      {selectedRaffle.filledSlots}/{selectedRaffle.totalSlots} slots filled ({getProgressPercentage(selectedRaffle.filledSlots, selectedRaffle.totalSlots)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${getProgressPercentage(selectedRaffle.filledSlots, selectedRaffle.totalSlots)}%` }}
                    ></div>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    {selectedRaffle.totalSlots - selectedRaffle.filledSlots} slots remaining
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedRaffle.description && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
                  <p className="text-gray-300 leading-relaxed">{selectedRaffle.description}</p>
                </div>
              )}

              {/* Prizes Section */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Prizes</h3>
                <div className="space-y-2">
                  {selectedRaffle.prizes && selectedRaffle.prizes.length > 0 ? (
                    selectedRaffle.prizes.map((prize, index) => {
                      // Find winner for this prize position
                      const winner = selectedRaffle.winners?.find(w => w.prizePosition === prize.position);
                      
                      return (
                        <div key={prize.id || index} className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                          <div className="flex items-start space-x-4">
                            {/* Prize Image - Pokemon Card Size */}
                            <div className="flex-shrink-0">
                              {prize.imageUrl ? (
                                <img 
                                  src={prize.imageUrl} 
                                  alt={prize.name}
                                  className="w-20 h-28 object-cover rounded-lg border-2 border-gray-600 shadow-lg"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                    if (nextElement) {
                                      nextElement.style.display = 'block';
                                    }
                                  }}
                                />
                              ) : null}
                              <div 
                                className="w-20 h-28 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg border-2 border-gray-600 flex items-center justify-center"
                                style={{ display: prize.imageUrl ? 'none' : 'block' }}
                              >
                                <Gift className="w-8 h-8 text-gray-500" />
                              </div>
                            </div>
                            
                            {/* Prize Details */}
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <div className="w-6 h-6 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-black font-bold text-xs">
                                  {prize.position === 1 ? '1st' : prize.position === 2 ? '2nd' : prize.position === 3 ? '3rd' : `${prize.position}th`}
                                </div>
                                <h4 className="text-white font-semibold text-lg">{prize.name}</h4>
                              </div>
                              
                              {/* Winner Information */}
                              {winner && (
                                <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                  <div className="flex items-center space-x-2">
                                    <Trophy className="w-4 h-4 text-green-400" />
                                    <span className="text-green-400 font-semibold text-sm">Winner:</span>
                                    <span className="text-white font-medium">{winner.winnerUsername}</span>
                                  </div>
                                  <p className="text-gray-400 text-xs mt-1">
                                    Won on {new Date(winner.wonAt).toLocaleString()}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="bg-gray-800 p-4 rounded-lg border border-gray-600 text-center">
                      <p className="text-gray-400">No prizes defined</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Consolation Prize Section */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Consolation Prize</h3>
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-white font-semibold text-lg">1 credit</h4>
                    </div>
                    <p className="text-gray-400 text-sm">
                      All participants who don't win main prizes receive 1 credit as a consolation reward
                    </p>
                  </div>
                </div>
              </div>

              {/* How to Join Section */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">How to Join</h3>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">1</div>
                      <p className="text-gray-300">Purchase slots with your credits</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">2</div>
                      <p className="text-gray-300">Each slot = one entry</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">3</div>
                      <p className="text-gray-300">Winners drawn when raffle fills</p>
                    </div>
                  </div>
                </div>
              </div>

              </div>

              {/* Fixed Bottom Section - Action Buttons */}
              <div className="border-t border-gray-600 bg-gray-900/50 backdrop-blur-sm p-6">
                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowRaffleDetails(false);
                    }}
                    className="flex-1"
                  >
                    Close
                  </Button>
                  {selectedRaffle?.status === 'active' && selectedRaffle.filledSlots < selectedRaffle.totalSlots ? (
                    <Button 
                      onClick={() => {
                        setShowRaffleDetails(false);
                        handleJoinRaffle(selectedRaffle);
                      }}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    >
                      <Gift className="w-4 h-4 mr-2" />
                      Join Raffle
                    </Button>
                  ) : (
                    <Button 
                      disabled 
                      className="flex-1 bg-gray-600 text-gray-400"
                    >
                      {selectedRaffle?.status === 'filled' ? 'Raffle Full' : 'Raffle Ended'}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Completed Raffles Dialog */}
      <Dialog open={showCompletedRaffles} onOpenChange={setShowCompletedRaffles}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Completed Raffles</DialogTitle>
            <DialogDescription>
              View all completed raffles and their winners for full transparency
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {completedRaffles.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-400">No completed raffles found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {completedRaffles.map((raffle) => (
                  <div key={raffle.id} className="border border-gray-600 rounded-lg p-4 bg-gray-800/50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{raffle.title}</h3>
                        <p className="text-gray-400 text-sm">{raffle.description}</p>
                      </div>
                      <Badge className="bg-blue-500 text-white">
                        COMPLETED
                      </Badge>
                    </div>
                    
                    {/* Simplified Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-3">
                      <div>
                        <p className="text-gray-400 text-sm">Prize</p>
                        <p className="text-white font-medium">
                          {raffle.prizes && raffle.prizes.length > 0 ? raffle.prizes[0].name : 'No Prize'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Total Slots</p>
                        <p className="text-white font-medium">{raffle.totalSlots}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Winners</p>
                        <p className="text-white font-medium">{raffle.maxWinners}</p>
                      </div>
                    </div>

                    <div className="text-sm text-gray-400 mb-3">
                      Drawn: {raffle.drawnAt ? new Date(raffle.drawnAt).toLocaleString() : 'N/A'}
                    </div>

                    {/* View Details Button for Completed Raffles */}
                    <div className="mt-4">
                      <Button
                        onClick={() => {
                          setSelectedRaffle(raffle);
                          setShowRaffleDetails(true);
                        }}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompletedRaffles(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
