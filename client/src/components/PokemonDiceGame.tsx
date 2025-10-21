import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Coins, ArrowLeft, RotateCcw, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface GameResult {
  success: boolean;
  result: {
    cardId: string;
    packType: string;
    packTier: string;
  };
}

  // Pokemon types with their colors and emoji icons
  const POKEMON_TYPES = [
    { 
      id: "psychic", 
      name: "Psychic", 
      color: "from-purple-500 to-pink-500", 
      bgColor: "bg-purple-500/20", 
      borderColor: "border-purple-500/50", 
      icon: "Dice"
    },
    { 
      id: "fire", 
      name: "Fire", 
      color: "from-red-500 to-orange-500", 
      bgColor: "bg-red-500/20", 
      borderColor: "border-red-500/50", 
      icon: "Fire"
    },
    { 
      id: "grass", 
      name: "Grass", 
      color: "from-green-500 to-emerald-500", 
      bgColor: "bg-green-500/20", 
      borderColor: "border-green-500/50", 
      icon: "🌿"
    },
    { 
      id: "water", 
      name: "Water", 
      color: "from-blue-500 to-cyan-500", 
      bgColor: "bg-blue-500/20", 
      borderColor: "border-blue-500/50", 
      icon: "Water"
    },
    { 
      id: "electric", 
      name: "Electric", 
      color: "from-yellow-500 to-amber-500", 
      bgColor: "bg-yellow-500/20", 
      borderColor: "border-yellow-500/50", 
      icon: "⚡"
    },
    { 
      id: "dark", 
      name: "Dark", 
      color: "from-gray-800 to-gray-900", 
      bgColor: "bg-gray-800/20", 
      borderColor: "border-gray-800/50", 
      icon: "🌑"
    }
  ];


// Pack image component
const PackImage = ({ packType, size = 'medium' }: { packType: string, size?: 'small' | 'medium' | 'large' }) => {
  const getPackImage = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pokeball':
        return '/assets/pokeball.png';
      case 'greatball':
        return '/assets/greatball.png';
      case 'ultraball':
        return '/assets/ultraball.png';
      case 'masterball':
        return '/assets/masterball.png';
      default:
        return '/assets/pokeball.png';
    }
  };

  const sizeClasses = size === 'large' ? 'w-24 h-24' : size === 'medium' ? 'w-20 h-24' : 'w-16 h-16';

  return (
    <img
      src={getPackImage(packType)}
      alt={`${packType} Pack`}
      className={`${sizeClasses} object-contain rounded-lg shadow-lg`}
      onError={(e) => {
        e.currentTarget.src = '/assets/pokeball.png';
      }}
    />
  );
};

export function PokemonDiceGame() {
  const [dice, setDice] = useState<string[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [showPackDialog, setShowPackDialog] = useState(false);
  const [rollCount, setRollCount] = useState(0);
  const [rollingTypes, setRollingTypes] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user credits
  const { data: userCredits, isLoading: isCreditsLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/auth/user");
      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }
      return response.json();
    },
  });

  // Deduct credits mutation
  const deductCreditsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/credits/deduct", {
        amount: 250,
        reason: "Pokemon Dice game"
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to deduct credits");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Credits deducted successfully, now roll dice
      rollDiceMutation.mutate();
    },
    onError: (error: any) => {
      console.error('Credit deduction error:', error);
      toast({
        title: "Insufficient Credits",
        description: error.message || "You don't have enough credits to play",
        variant: "destructive",
      });
    },
  });

  // Roll dice mutation
  const rollDiceMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/dice/roll", {
        amount: 250
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to roll dice");
      }
      
      return await response.json();
    },
    onSuccess: (result) => {
      // Start rolling animation
      setIsRolling(true);
      setRollCount(prev => prev + 1);
      setLastResult(null);
      setShowPackDialog(false);
      
      // Initialize rolling types for each dice
      const initialRollingTypes = Array.from({ length: 5 }, () => 
        POKEMON_TYPES[Math.floor(Math.random() * POKEMON_TYPES.length)].id
      );
      setRollingTypes(initialRollingTypes);
      setDice(['?', '?', '?', '?', '?']);

      // Create rolling animation with random types
      let rollInterval: NodeJS.Timeout;
      let rollCount = 0;
      const maxRolls = 15; // Number of cycles before stopping
      
      rollInterval = setInterval(() => {
        rollCount++;
        
        // Update rolling types - each dice gets a completely random type
        setRollingTypes(prev => prev.map(() => {
          return POKEMON_TYPES[Math.floor(Math.random() * POKEMON_TYPES.length)].id;
        }));
        
        // Stop rolling after maxRolls
        if (rollCount >= maxRolls) {
          clearInterval(rollInterval);
          setIsRolling(false);
          
          // Use the actual dice result from the server
          const finalDice = result.dice || Array.from({ length: 5 }, () => 
            POKEMON_TYPES[Math.floor(Math.random() * POKEMON_TYPES.length)].id
          );
          setDice(finalDice);
          
          // Pause for 2 seconds to let user see the final result
          setIsPaused(true);
          setTimeout(() => {
            setIsPaused(false);
            // Determine reward based on matches
            const reward = determineReward(finalDice);
            
            const gameResult: GameResult = {
              success: true,
              result: {
                cardId: `dice-${Date.now()}`,
                packType: reward.tier,
                packTier: reward.tier
              }
            };
            
            setLastResult(gameResult);
            setShowPackDialog(true);
            
            // Invalidate user data to refresh credits
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            
            toast({
              title: "Dice Rolled!",
              description: `You got ${reward.matches} matches and won a ${reward.tier} pack!`,
            });
          }, 2000); // 2 second pause
        }
      }, 200); // Update every 200ms for smooth rolling
    },
    onError: (error: any) => {
      console.error('Dice roll error:', error);
      toast({
        title: "Roll Failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
      setIsRolling(false);
    },
  });

  // Play game mutation (for pack assignment)
  const playGameMutation = useMutation({
    mutationFn: async () => {
      if (!lastResult) return;
      
      const response = await apiRequest("POST", "/api/dice/play", {
        result: lastResult.result.packTier
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to assign pack");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pack Assigned!",
        description: "Your pack has been added to your collection!",
      });
      setShowPackDialog(false);
    },
    onError: (error: any) => {
      console.error('Pack assignment error:', error);
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign pack",
        variant: "destructive",
      });
    },
  });

  // Determine reward based on dice matches
  const determineReward = (diceResults: string[]) => {
    const counts: { [key: string]: number } = {};
    diceResults.forEach(type => {
      counts[type] = (counts[type] || 0) + 1;
    });
    
    const maxMatches = Math.max(...Object.values(counts));
    
    if (maxMatches >= 5) {
      return { tier: 'masterball', matches: maxMatches };
    } else if (maxMatches >= 4) {
      return { tier: 'ultraball', matches: maxMatches };
    } else if (maxMatches >= 3) {
      return { tier: 'greatball', matches: maxMatches };
    } else if (maxMatches >= 2) {
      return { tier: 'pokeball', matches: maxMatches };
    } else {
      return { tier: 'pokeball', matches: 1 }; // Minimum reward
    }
  };

  const handleRoll = () => {
    if (isRolling) return;

    // Check if user has enough credits
    const creditBalance = userCredits && typeof userCredits === 'object' && 'credits' in userCredits
      ? Number((userCredits as any).credits)
      : 0;
    
    if (creditBalance < 250) {
      toast({
        title: "Insufficient Credits",
        description: `You need 250 credits to play. You have ${Math.floor(creditBalance)} credits.`,
        variant: "destructive",
      });
      return;
    }

    // Deduct credits first, then roll dice
    deductCreditsMutation.mutate();
  };

  const handlePackDialogOk = () => {
    if (lastResult) {
      playGameMutation.mutate();
    } else {
      setShowPackDialog(false);
    }
  };

  // Get type info for display
  const getTypeInfo = (typeId: string) => {
    return POKEMON_TYPES.find(type => type.id === typeId) || POKEMON_TYPES[0];
  };

  return (
    <>
      {/* Header */}
      <section className="py-4 sm:py-8 text-center">
        <h1 className="font-gaming font-bold text-3xl sm:text-4xl md:text-5xl mb-3 sm:mb-4">
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-500 bg-clip-text text-transparent">
            DICE ROLL
          </span>
        </h1>
        <p className="text-white text-base sm:text-lg max-w-2xl mx-auto px-2">
          Roll 5 dice and match Pokemon types to win packs! More matches = better rewards!
        </p>
      </section>

      {/* Game Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
        <Card className="gaming-card bg-gray-900/95 border-gray-600 shadow-lg">
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold text-white">
              250
            </div>
            <div className="text-xs sm:text-sm text-gray-200 font-medium">Credits</div>
          </CardContent>
        </Card>

        <Card className="gaming-card bg-gray-900/95 border-gray-600 shadow-lg">
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold text-white">
              5
            </div>
            <div className="text-xs sm:text-sm text-gray-200 font-medium">Dice</div>
          </CardContent>
        </Card>

        <Card className="gaming-card bg-gray-900/95 border-gray-600 shadow-lg">
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold text-white">
              {Math.floor(Number(userCredits?.credits) || 0)}
            </div>
            <div className="text-xs sm:text-sm text-gray-200 font-medium">Your Credits</div>
          </CardContent>
        </Card>
      </div>

      {/* Game Board */}
      <Card className="gaming-card mb-6 sm:mb-8 bg-gradient-to-br from-gray-900 to-gray-800 border-gray-600 shadow-2xl">
        <CardHeader className="text-center px-4 sm:px-6">
          <CardTitle className="font-gaming text-xl sm:text-2xl text-white mb-4">
            Dice Board
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="flex justify-center">
            <div className="grid grid-cols-5 gap-4 max-w-md mx-auto">
              {Array.from({ length: 5 }, (_, index) => {
                const diceValue = dice[index];
                const isQuestionMark = diceValue === '?';
                const type = !isQuestionMark && diceValue ? getTypeInfo(diceValue) : null;
                const rollingType = isRolling && rollingTypes[index] ? getTypeInfo(rollingTypes[index]) : null;
                
                return (
                  <div key={index} className="w-16 h-16">
                    <motion.div
                      className="w-16 h-16 border-2 rounded-lg flex items-center justify-center text-2xl font-bold shadow-lg"
                      animate={isRolling ? { 
                        scale: [1, 1.1, 0.9, 1.1, 1],
                        rotate: [0, 5, -5, 5, 0]
                      } : {
                        scale: 1,
                        rotate: 0
                      }}
                      transition={{ 
                        duration: 0.2,
                        repeat: isRolling ? Infinity : 0,
                        repeatType: "loop"
                      }}
                      style={{
                        background: isRolling && rollingType 
                          ? `linear-gradient(135deg, ${rollingType.color})` 
                          : type 
                            ? `linear-gradient(135deg, ${type.color})` 
                            : 'linear-gradient(135deg, #6B7280, #4B5563)',
                        borderColor: isRolling && rollingType 
                          ? rollingType.borderColor 
                          : type 
                            ? type.borderColor 
                            : '#6B7280',
                        boxShadow: isRolling 
                          ? '0 0 20px rgba(0,0,0,0.4), 0 0 40px rgba(255,255,255,0.1)' 
                          : '0 4px 8px rgba(0,0,0,0.2)'
                      }}
                    >
              {isRolling ? (
                <motion.div
                  key={rollingTypes[index]} // Force re-render when type changes
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.1 }}
                  className="flex items-center justify-center w-full h-full relative"
                >
                  {rollingType ? (
                    <>
                      {/* Large bokeh sphere background */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${rollingType.color} opacity-10`}></div>
                      </div>
                      <span className="text-white text-2xl relative z-10">{rollingType.icon}</span>
                      {/* Colored bokeh particles */}
                      <div className="absolute inset-0 animate-pulse">
                        <div className={`absolute top-1 left-1 w-2 h-2 bg-gradient-to-br ${rollingType.color} rounded-full opacity-60`}></div>
                        <div className={`absolute bottom-1 right-1 w-1.5 h-1.5 bg-gradient-to-br ${rollingType.color} rounded-full opacity-40`}></div>
                        <div className={`absolute top-2 right-2 w-1 h-1 bg-gradient-to-br ${rollingType.color} rounded-full opacity-50`}></div>
                        <div className={`absolute bottom-2 left-2 w-1.5 h-1.5 bg-gradient-to-br ${rollingType.color} rounded-full opacity-30`}></div>
                        <div className={`absolute top-3 left-3 w-1 h-1 bg-gradient-to-br ${rollingType.color} rounded-full opacity-45`}></div>
                      </div>
                    </>
                  ) : (
                    <span className="text-white text-2xl">?</span>
                  )}
                </motion.div>
              ) : (
                <div className="flex items-center justify-center w-full h-full relative">
                  {type ? (
                    <>
                      {/* Large bokeh sphere background */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${type.color} opacity-10`}></div>
                      </div>
                      <span className="text-white text-2xl relative z-10">{type.icon}</span>
                      {/* Colored bokeh particles */}
                      <div className="absolute inset-0 animate-pulse">
                        <div className={`absolute top-1 left-1 w-2 h-2 bg-gradient-to-br ${type.color} rounded-full opacity-60`}></div>
                        <div className={`absolute bottom-1 right-1 w-1.5 h-1.5 bg-gradient-to-br ${type.color} rounded-full opacity-40`}></div>
                        <div className={`absolute top-2 right-2 w-1 h-1 bg-gradient-to-br ${type.color} rounded-full opacity-50`}></div>
                        <div className={`absolute bottom-2 left-2 w-1.5 h-1.5 bg-gradient-to-br ${type.color} rounded-full opacity-30`}></div>
                        <div className={`absolute top-3 left-3 w-1 h-1 bg-gradient-to-br ${type.color} rounded-full opacity-45`}></div>
                      </div>
                    </>
                  ) : (
                    <span className="text-white text-2xl">?</span>
                  )}
                </div>
              )}
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game Controls */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center justify-center mb-6 sm:mb-8">
        <Button
          onClick={handleRoll}
          disabled={isRolling || isPaused || deductCreditsMutation.isPending || rollDiceMutation.isPending}
          className="w-full sm:w-auto px-8 py-3 text-lg font-gaming bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRolling ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Rolling...
            </div>
          ) : isPaused ? (
            <div className="flex items-center gap-2">
              <div className="animate-pulse rounded-full h-5 w-5 bg-white/50"></div>
              Rolling...
            </div>
          ) : (deductCreditsMutation.isPending || rollDiceMutation.isPending) ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Processing...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Dice1 className="w-5 h-5" />
              Roll Dice
            </div>
          )}
        </Button>
        
        <Button
          variant="outline"
          onClick={() => window.location.href = "/play"}
          className="w-full sm:w-auto px-6 py-3 text-lg font-gaming border-2 border-gray-400 text-gray-300 hover:bg-gray-800 hover:border-gray-300 hover:text-white transition-all duration-300 active:scale-95 touch-manipulation"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Games
        </Button>
      </div>

      {/* Rewards Info */}
      <Card className="gaming-card mb-6 sm:mb-8 bg-gradient-to-br from-gray-900 to-gray-800 border-gray-600 shadow-2xl">
        <CardHeader className="text-center px-4 pb-3">
          <CardTitle className="font-gaming text-xl text-white mb-1">
            Rewards
          </CardTitle>
          <p className="text-gray-300 text-sm">
            Match Pokemon types to win packs!
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {/* Pokeball - 2 Matches */}
            <div className="flex flex-col items-center p-3 rounded-lg bg-black/50 border border-red-500/30 hover:border-red-400/60 transition-all duration-300 hover:shadow-lg">
              <div className="w-12 h-12 mb-2">
                <PackImage packType="pokeball" size="small" />
              </div>
              <div className="text-center">
                <div className="font-bold text-sm text-white">2 Matches</div>
                <div className="text-xs text-red-300 font-medium">Pokeball</div>
              </div>
            </div>

            {/* Greatball - 3 Matches */}
            <div className="flex flex-col items-center p-3 rounded-lg bg-black/50 border border-blue-500/30 hover:border-blue-400/60 transition-all duration-300 hover:shadow-lg">
              <div className="w-12 h-12 mb-2">
                <PackImage packType="greatball" size="small" />
              </div>
              <div className="text-center">
                <div className="font-bold text-sm text-white">3 Matches</div>
                <div className="text-xs text-blue-300 font-medium">Greatball</div>
              </div>
            </div>

            {/* Ultraball - 4 Matches */}
            <div className="flex flex-col items-center p-3 rounded-lg bg-black/50 border border-yellow-500/30 hover:border-yellow-400/60 transition-all duration-300 hover:shadow-lg">
              <div className="w-12 h-12 mb-2">
                <PackImage packType="ultraball" size="small" />
              </div>
              <div className="text-center">
                <div className="font-bold text-sm text-white">4 Matches</div>
                <div className="text-xs text-yellow-300 font-medium">Ultraball</div>
              </div>
            </div>

            {/* Masterball - 5 Matches */}
            <div className="flex flex-col items-center p-3 rounded-lg bg-black/50 border border-purple-500/30 hover:border-purple-400/60 transition-all duration-300 hover:shadow-lg">
              <div className="w-12 h-12 mb-2">
                <PackImage packType="masterball" size="small" />
              </div>
              <div className="text-center">
                <div className="font-bold text-sm text-white">5 Matches</div>
                <div className="text-xs text-purple-300 font-medium">Masterball</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pack Assignment Dialog */}
      <AnimatePresence>
        {showPackDialog && lastResult && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="text-center space-y-6 p-8 bg-gradient-to-br from-gray-900/95 to-gray-800/95 rounded-lg border border-gray-600 max-w-md shadow-2xl"
            >
              <div className="space-y-4">
                <h2 className="text-3xl font-bold text-white">Congratulations!</h2>
                <div className="w-20 h-24 mx-auto bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl border-2 border-gray-600 flex items-center justify-center shadow-lg">
                  <PackImage packType={lastResult.result.packTier} size="medium" />
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-semibold text-white">
                    You won a {lastResult.result.packTier.charAt(0).toUpperCase() + lastResult.result.packTier.slice(1)} Pack!
                  </p>
                  <p className="text-sm text-gray-400">
                    The pack has been added to your inventory. You can open it from "My Packs" section.
                  </p>
                </div>
              </div>
              
              <Button
                onClick={handlePackDialogOk}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold text-lg py-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 touch-manipulation"
              >
                OK
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
