import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "@/components/Navigation";
import { NavigationFooter } from "@/components/NavigationFooter";
import { RecentPulls } from "@/components/RecentPulls";
import { ClassicPackPopup } from "@/components/ClassicPackPopup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Play, Package, Coins, TrendingUp, Zap, RotateCcw, Gamepad2, Star, Crown, Sparkles, Trophy, Gift, Eye, X } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import type { User } from "../../../shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

export default function Home() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { toast } = useToast();
  const [isBlackBoltPopupOpen, setIsBlackBoltPopupOpen] = useState(false);
  
  // Raffle state
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [selectedRaffle, setSelectedRaffle] = useState<Raffle | null>(null);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showRaffleDetails, setShowRaffleDetails] = useState(false);
  const [slotsToJoin, setSlotsToJoin] = useState(1);
  const [isJoining, setIsJoining] = useState(false);
  const [completedRaffles, setCompletedRaffles] = useState<Raffle[]>([]);
  const [showCompletedRaffles, setShowCompletedRaffles] = useState(false);

  // Raffle functions
  const fetchRaffles = async () => {
    try {
      const response = await apiRequest("GET", "/api/raffles");
      const data = await response.json();
      if (data.success) {
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
    const totalCost = parseFloat(selectedRaffle.pricePerSlot) * slotsToJoin;
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
        setSlotsToJoin(1);
        fetchRaffles();
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

  const { data: userData } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: isAuthenticated,
  }) as { data: User | undefined };

  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated,
  });

  // Fetch Black Bolt pack data
  const { data: blackBoltPack } = useQuery({
    queryKey: ["/api/available-packs"],
    enabled: isAuthenticated,
    select: (data: any) => {
      // Find the Black Bolt pack from classic packs
      return data?.classicPacks?.find((pack: any) => pack.name === "Black Bolt");
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect non-authenticated users to the root landing page
  if (!isAuthenticated) {
    // Redirect to root landing page instead of showing a landing page here
    window.location.href = '/';
    return null;
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
                
                <!-- Stars/particles -->
                <g opacity="0.8">
                  ${[...Array(200)].map((_, i) => `
                    <circle cx="${Math.random() * 1920}" cy="${Math.random() * 1080}" r="${Math.random() * 2 + 0.5}" fill="white" opacity="${Math.random() * 0.8 + 0.2}"/>
                  `).join('')}
                </g>
                
                <!-- Light trails -->
                <path d="M 100 200 Q 300 400 500 600 Q 700 800 400 1000" stroke="url(#card1)" stroke-width="8" fill="none" opacity="0.6">
                  <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" repeatCount="indefinite"/>
                </path>
                <path d="M 1500 100 Q 1700 300 1600 500 Q 1500 700 1400 900" stroke="url(#card2)" stroke-width="6" fill="none" opacity="0.4">
                  <animate attributeName="opacity" values="0.2;0.6;0.2" dur="4s" repeatCount="indefinite"/>
                </path>
                
                <!-- Digital cards -->
                <g transform="translate(1200, 300) rotate(15)">
                  <rect x="0" y="0" width="120" height="180" rx="12" fill="url(#card1)" opacity="0.7" filter="blur(1px)">
                    <animate attributeName="opacity" values="0.5;0.8;0.5" dur="2s" repeatCount="indefinite"/>
                  </rect>
                  <rect x="20" y="20" width="80" height="140" rx="8" fill="white" opacity="0.1"/>
                </g>
                
                <g transform="translate(1350, 280) rotate(20)">
                  <rect x="0" y="0" width="120" height="180" rx="12" fill="url(#card2)" opacity="0.8" filter="blur(1px)">
                    <animate attributeName="opacity" values="0.6;0.9;0.6" dur="2.5s" repeatCount="indefinite"/>
                  </rect>
                  <rect x="20" y="20" width="80" height="140" rx="8" fill="white" opacity="0.15"/>
                </g>
                
                <g transform="translate(1500, 260) rotate(25)">
                  <rect x="0" y="0" width="120" height="180" rx="12" fill="url(#card3)" opacity="0.9" filter="blur(1px)">
                    <animate attributeName="opacity" values="0.7;1;0.7" dur="3s" repeatCount="indefinite"/>
                  </rect>
                  <rect x="20" y="20" width="80" height="140" rx="8" fill="white" opacity="0.2"/>
                </g>
                
                <!-- Grid pattern -->
                <g opacity="0.1" stroke="#06b6d4" stroke-width="1">
                  ${[...Array(20)].map((_, i) => `
                    <line x1="${i * 100}" y1="0" x2="${i * 100}" y2="1080"/>
                    <line x1="0" y1="${i * 60}" x2="1920" y2="${i * 60}"/>
                  `).join('')}
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
                scale: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 3,
              }}
            />
          ))}
        </div>
      </div>
      
      <main className="pt-20 pb-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
         {/* Welcome Section */}
         <motion.section 
           className="mb-8"
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6 }}
         >
           <div className="flex flex-row items-center justify-between mb-6 gap-4 mt-8">
             <div className="flex-1">
               <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white mb-2 tracking-[-0.04em] leading-[1.15]">
                 Hey <span className="text-white">{userData?.username || "Player"}</span>!
               </h1>
               <p className="text-base sm:text-lg text-[#9CA3AF] font-normal leading-[1.6]">Your TCG adventure awaits</p>
             </div>
             
             {/* Available Credits Display - Yellow Box */}
             <div className="px-4 py-2 sm:px-8 sm:py-4 rounded-xl bg-gradient-to-r from-[#FACC15] to-[#FFD166] shadow-[0_0_20px_rgba(250,204,21,0.3)] flex-shrink-0">
               <div className="text-center">
                 <p className="text-xs text-[#0B0B12] mb-1 sm:mb-2 font-semibold uppercase tracking-wide hidden sm:block">Available Credits</p>
                 <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                   <div className="w-4 h-4 sm:w-6 sm:h-6 bg-[#0B0B12] rounded-full flex items-center justify-center">
                     <span className="text-[#FACC15] text-xs sm:text-sm font-bold">₵</span>
                   </div>
                   <div className="flex flex-col sm:flex-row items-center space-y-0 sm:space-y-0 sm:space-x-2">
                     <span className="text-xs sm:hidden text-[#0B0B12] font-semibold uppercase tracking-wide">Credits</span>
                     <span className="text-lg sm:text-2xl font-bold text-[#0B0B12] tabular-nums">
                       {(userData as any)?.credits || "0.00"}
                     </span>
                   </div>
                 </div>
               </div>
             </div>
           </div>
         </motion.section>

          {/* Featured Title Section */}
          <motion.section 
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex items-center mb-6">
              {/* Neon Strip */}
              <div className="w-1 h-8 bg-gradient-to-b from-[#7C3AED] via-[#A855F7] to-[#22D3EE] rounded-full mr-4 shadow-[0_0_8px_rgba(124,58,237,0.3)]"></div>
              
             {/* Featured Title */}
             <h2 className="text-2xl sm:text-3xl font-semibold text-[#E5E7EB] tracking-[-0.03em] leading-[1.15]">FEATURED</h2>
            </div>
          </motion.section>

          {/* Featured Banner */}
          <motion.section 
            className="mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="rounded-2xl bg-[#151521] border border-[#26263A] backdrop-blur-[10px] shadow-[0_0_20px_rgba(124,58,237,0.1)] overflow-hidden">
              <div className="relative w-full aspect-[1200/620] max-w-[1200px] mx-auto">
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{
                    backgroundImage: `url('/assets/black-bolt-banner.png')`
                  }}
                />
                {/* Overlay for text readability */}
                <div className="absolute inset-0 bg-[#0B0B12]/20"></div>
               
               {/* Content */}
               <CardContent className="relative z-10 p-4 sm:p-6 text-left h-full flex flex-col justify-center">
                 <motion.h1 
                   className="text-2xl sm:text-3xl font-semibold text-[#FACC15] mb-2 tracking-[-0.03em] leading-[1.15]"
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ duration: 0.8, delay: 0.2 }}
                 >
                   NEW DROP
                 </motion.h1>
                 <motion.p 
                   className="text-xs sm:text-sm text-[#9CA3AF] mb-3 leading-[1.6]"
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ duration: 0.8, delay: 0.4 }}
                 >
                   Black Bolt just dropped.<br />
                   Rip Now!
                 </motion.p>
                 <motion.div
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ duration: 0.8, delay: 0.6 }}
                 >
                   <Button 
                     size="sm"
                     onClick={() => setIsBlackBoltPopupOpen(true)}
                     className="bg-gradient-to-r from-[#00E6A8] to-[#00E6A8] hover:from-[#00E6A8] hover:to-[#00E6A8] text-black px-4 py-2 rounded-xl font-medium w-fit shadow-[0_0_12px_rgba(0,230,168,0.3)] hover:shadow-[0_0_16px_rgba(0,230,168,0.4)] transition-all duration-200 text-sm"
                   >
                     Open Now
                   </Button>
                 </motion.div>
               </CardContent>
             </div>
           </Card>
          </motion.section>

          {/* Raffle Events Section */}
          <motion.section 
            className="mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
              {/* Neon Strip */}
                <div className="w-1 h-8 bg-gradient-to-b from-[#8b5cf6] via-[#a855f7] to-[#c084fc] rounded-full mr-4 shadow-[0_0_8px_rgba(139,92,246,0.3)]"></div>
              
                {/* Raffle Events Title */}
                <h2 className="text-2xl sm:text-3xl font-semibold text-[#E5E7EB] tracking-[-0.03em] leading-[1.15]">Raffle Events</h2>
            </div>
            </div>
            
            {raffles.length === 0 ? (
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

          {/* Recent Pulls */}
          <motion.section 
            className="mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <RecentPulls limit={10} />
          </motion.section>

          {/* Quick Play Games Carousel */}
          <motion.section 
            className="mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <div className="flex items-center mb-6">
              {/* Neon Strip */}
              <div className="w-1 h-8 bg-gradient-to-b from-[#7C3AED] via-[#A855F7] to-[#22D3EE] rounded-full mr-4 shadow-[0_0_8px_rgba(124,58,237,0.3)]"></div>
              
             {/* Quick Play Title */}
             <h2 className="text-2xl sm:text-3xl font-semibold text-[#E5E7EB] tracking-[-0.03em] leading-[1.15]">Quick Play</h2>
            </div>
            
            {/* Game Carousel */}
            <div className="relative">
              <div className="flex space-x-4 sm:space-x-6 overflow-x-auto pb-4 scrollbar-hide touch-pan-x snap-x snap-mandatory">
                {/* Classic Pack */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-shrink-0 snap-start"
                >
                  <Link href="/play">
                    <Card className="rounded-2xl bg-[#151521] border border-[#26263A] backdrop-blur-[10px] hover:scale-[1.02] transition-all duration-200 cursor-pointer shadow-[0_0_20px_rgba(124,58,237,0.1)] hover:shadow-[0_0_24px_rgba(124,58,237,0.15)] w-64 h-56 overflow-hidden">
                      <CardContent className="p-0 h-full">
                        {/* Classic Pack Image */}
                        <div 
                          className="w-full h-full bg-cover bg-center rounded-2xl shadow-[0_0_12px_rgba(124,58,237,0.4)]"
                          style={{
                            backgroundImage: `url('/assets/classic-image.png')`
                          }}
                        />
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>

                {/* Find Pika Game */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-shrink-0 snap-start"
                >
                  <Link href="/play/findpika">
                    <Card className="rounded-2xl bg-[#151521] border border-[#26263A] backdrop-blur-[10px] hover:scale-[1.02] transition-all duration-200 cursor-pointer shadow-[0_0_20px_rgba(124,58,237,0.1)] hover:shadow-[0_0_24px_rgba(124,58,237,0.15)] w-64 h-56 overflow-hidden">
                      <CardContent className="p-0 h-full">
                        {/* Find Pika Game Image */}
                        <div 
                          className="w-full h-full bg-cover bg-center rounded-2xl shadow-[0_0_12px_rgba(34,197,94,0.4)]"
                          style={{
                            backgroundImage: `url('/assets/find-pika-image.png')`
                          }}
                        />
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>

                {/* Energy Match Game */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-shrink-0 snap-start"
                >
                  <Link href="/play/energy-match">
                    <Card className="rounded-2xl bg-[#151521] border border-[#26263A] backdrop-blur-[10px] hover:scale-[1.02] transition-all duration-200 cursor-pointer shadow-[0_0_20px_rgba(124,58,237,0.1)] hover:shadow-[0_0_24px_rgba(124,58,237,0.15)] w-64 h-56 overflow-hidden">
                      <CardContent className="p-0 h-full">
                        {/* Energy Match Game Image */}
                        <div 
                          className="w-full h-full bg-cover bg-center rounded-2xl shadow-[0_0_12px_rgba(236,72,153,0.4)]"
                          style={{
                            backgroundImage: `url('/assets/energy-match.png')`
                          }}
                        />
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.section>




        </div>
      </main>

      <NavigationFooter />

      {/* Black Bolt Pack Popup */}
      {blackBoltPack && (
        <ClassicPackPopup
          pack={blackBoltPack}
          isOpen={isBlackBoltPopupOpen}
          onClose={() => setIsBlackBoltPopupOpen(false)}
          onOpenPack={() => {}} // Not needed for this use case
        />
      )}

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
                (user ? parseFloat((user as any)?.credits || '0') < (parseFloat(selectedRaffle.pricePerSlot) * slotsToJoin) : false)
              }
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isJoining ? 'Joining...' : 
               (user && parseFloat((user as any)?.credits || '0') < (parseFloat(selectedRaffle?.pricePerSlot || '0') * slotsToJoin)) ? 'Insufficient Credits' : 
               'Join Raffle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Raffle Details Dialog */}
      <Dialog open={showRaffleDetails} onOpenChange={setShowRaffleDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700">
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
                    onClick={() => {
                      setShowRaffleDetails(false);
                    }}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white border border-red-500"
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