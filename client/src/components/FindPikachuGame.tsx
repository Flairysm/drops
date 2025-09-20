import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { NavigationFooter } from "@/components/NavigationFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { RotateCcw, X, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Import pack images
import classicPack from "/assets/classic-image.png";
import bushImage from "/assets/bush.png";
import pikaImage from "/assets/pika.png";
import rockImage from "/assets/rock.png";

interface CardState {
  id: number;
  isRevealed: boolean;
  isPikachu: boolean;
  isRock: boolean;
}

interface GameState {
  cards: CardState[];
  gameOver: boolean;
  gameWon: boolean;
  pikachusFound: number;
  currentRound: number;
}

interface PackAward {
  tier: string;
  message: string;
  show: boolean;
}

const FIND_PIKACHU_COST = 300; // 300 credits per game (RM 15)

// Get reward tier based on Pikachus found
const getRewardTier = (pikachusFound: number) => {
  if (pikachusFound === 0 || pikachusFound === 1) {
    return { tier: 'pokeball', name: 'Pokeball Pack' };
  } else if (pikachusFound === 2) {
    return { tier: 'greatball', name: 'Greatball Pack' };
  } else if (pikachusFound === 3) {
    return { tier: 'ultraball', name: 'Ultraball Pack' };
  } else if (pikachusFound === 4) {
    return { tier: 'masterball', name: 'Masterball Pack' };
  }
  return { tier: 'pokeball', name: 'Pokeball Pack' };
};

// Pack Image component
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
        return "/assets/masterball.png"; // Use masterball for luxury pack as requested
      default:
        return "/assets/pokeball.png";
    }
  };

  const sizeClasses = size === 'large' ? 'w-24 h-24' : 'w-16 h-16';

  return (
    <img
      src={getPackImage(packType)}
      alt={`${packType} Pack`}
      className={`${sizeClasses} object-contain rounded-lg shadow-lg`}
      onError={(e) => {
        console.error('Image failed to load:', getPackImage(packType));
        e.currentTarget.src = "/assets/pokeball.png"; // Fallback to pokeball
      }}
    />
  );
};

export function FindPikachuGame() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [gameState, setGameState] = useState<GameState>({
    cards: [],
    gameOver: false,
    gameWon: false,
    pikachusFound: 0,
    currentRound: 0,
  });

  const [packAward, setPackAward] = useState<PackAward>({
    tier: '',
    message: '',
    show: false,
  });

  const [gameStarted, setGameStarted] = useState(false);
  const [showShuffleAnimation, setShowShuffleAnimation] = useState(false);
  const [cardsReady, setCardsReady] = useState(false);
  const [showGameOverPopup, setShowGameOverPopup] = useState(false);

  // Fetch user credits
  const { data: userCredits, isLoading: isCreditsLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    staleTime: 30000,
    gcTime: 60000,
    enabled: isAuthenticated,
  });

  // Calculate credit balance and affordability
  const creditBalance = userCredits && typeof userCredits === 'object' && 'credits' in userCredits
    ? Number((userCredits as any).credits)
    : 0;
  const canAfford = !isCreditsLoading && isAuthenticated && creditBalance >= FIND_PIKACHU_COST;

  // Start game mutation (deducts credits)
  const startGameMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/credits/deduct", {
        amount: FIND_PIKACHU_COST,
        reason: "find_pikachu_game",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to deduct credits");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Credits deducted successfully, start shuffle animation
      setGameStarted(true);
      setShowShuffleAnimation(true);
      setCardsReady(false);
      
      toast({
        title: "Game Started!",
        description: `${FIND_PIKACHU_COST} credits deducted. Find the Pikachus!`,
      });
      // Invalidate user credits query
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // After shuffle animation, allow card interaction
      setTimeout(() => {
        setShowShuffleAnimation(false);
        setCardsReady(true);
      }, 2000); // 2 second shuffle animation
    },
    onError: (error: any) => {
      console.error('Start game error:', error);
      toast({
        title: "Failed to Start Game",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Play game mutation
  const playGameMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/games/find-pikachu", {
        pikachusFound: gameState.pikachusFound,
        won: gameState.gameWon,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to play game");
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      console.log('Find Pikachu API response:', data);
      
      // Update game state with the result
      setGameState(prev => ({
        ...prev,
        gameOver: true,
        gameWon: data.won,
        pikachusFound: data.pikachusFound,
        currentRound: data.currentRound,
      }));
      
      // Show pack award popup
      setPackAward({
        tier: data.packTier,
        message: data.message,
        show: true,
      });
      
      // Show success toast
      toast({
        title: data.won ? "Congratulations!" : "Pack Awarded!",
        description: data.message,
      });
      
      // Invalidate user credits query
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: any) => {
      console.error('Find Pikachu API error:', error);
      toast({
        title: "Game Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Close pack award popup and reset game
  const closePackAward = () => {
    setPackAward({ tier: '', message: '', show: false });
    setGameStarted(false);
    initializeGame();
  };

  // Initialize new game (just sets up the board, doesn't deduct credits)
  const initializeGame = useCallback(() => {
    const cards: CardState[] = [];
    const pikachuPositions = new Set<number>();
    
    // Randomly place 4 Pikachus
    while (pikachuPositions.size < 4) {
      const position = Math.floor(Math.random() * 9);
      pikachuPositions.add(position);
    }
    
    // Create 9 cards
    for (let i = 0; i < 9; i++) {
      cards.push({
        id: i,
        isRevealed: false,
        isPikachu: pikachuPositions.has(i),
        isRock: !pikachuPositions.has(i),
      });
    }
    
    setGameState({
      cards,
      gameOver: false,
      gameWon: false,
      pikachusFound: 0,
      currentRound: 0,
    });
    setGameStarted(false);
    setShowShuffleAnimation(false);
    setCardsReady(false);
    setShowGameOverPopup(false);
  }, []);

  // Start the game (deducts credits and allows tile selection)
  const startGame = useCallback(() => {
    if (!canAfford) {
      toast({
        title: "Insufficient Credits",
        description: `You need ${FIND_PIKACHU_COST} credits to play Find the Pikachu`,
        variant: "destructive",
      });
      return;
    }
    
    startGameMutation.mutate();
  }, [canAfford, startGameMutation]);

  // Handle card click
  const handleCardClick = (cardId: number) => {
    if (!gameStarted || !cardsReady) {
      toast({
        title: "Game Not Ready",
        description: "Please wait for the shuffle to complete!",
        variant: "destructive",
      });
      return;
    }

    if (gameState.gameOver || gameState.cards[cardId].isRevealed) {
      return;
    }

    const updatedCards = [...gameState.cards];
    const clickedCard = updatedCards[cardId];
    
    if (clickedCard.isRock) {
      // Game over - reveal all cards
      updatedCards.forEach(card => card.isRevealed = true);
      setGameState(prev => ({
        ...prev,
        cards: updatedCards,
        gameOver: true,
        gameWon: false,
      }));
      
      // Show game over popup
      setShowGameOverPopup(true);
      
      // End the game
      console.log('Game over - calling API with:', { pikachusFound: gameState.pikachusFound, won: false });
      playGameMutation.mutate();
    } else {
      // Pikachu found
      clickedCard.isRevealed = true;
      const newPikachusFound = gameState.pikachusFound + 1;
      
      setGameState(prev => ({
        ...prev,
        cards: updatedCards,
        pikachusFound: newPikachusFound,
        currentRound: newPikachusFound,
      }));
      
      // Show success toast
      toast({
        title: "⚡ Pikachu Found!",
        description: `Great! You found ${newPikachusFound}/4 Pikachus. Keep going!`,
      });
      
      // Check if all Pikachus found
      if (newPikachusFound === 4) {
        // Game won - reveal all cards
        updatedCards.forEach(card => card.isRevealed = true);
        setGameState(prev => ({
          ...prev,
          cards: updatedCards,
          gameOver: true,
          gameWon: true,
        }));
        
        // Show game over popup
        setShowGameOverPopup(true);
        
        // End the game
        console.log('Game won - calling API with:', { pikachusFound: newPikachusFound, won: true });
        playGameMutation.mutate();
      }
    }
  };

  // Get pack tier based on Pikachus found
  const getPackTier = (pikachus: number) => {
    if (pikachus === 0 || pikachus === 1) return "Pokeball";
    if (pikachus === 2) return "Greatball";
    if (pikachus === 3) return "Ultraball";
    if (pikachus === 4) return "Masterball";
    return "Pokeball";
  };

  // Debug logging
  console.log('Find Pikachu Game Debug:', {
    isAuthenticated,
    isCreditsLoading,
    creditBalance,
    FIND_PIKACHU_COST,
    canAfford,
    userCredits
  });

  // Initialize game on component mount
  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  return (
    <div className="min-h-screen bg-black">
      
      <Navigation />
      
      {/* Pack Award Popup */}
      {packAward.show && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in duration-300 p-4">
          <Card className="gaming-card w-full max-w-sm sm:max-w-md animate-in zoom-in-95 duration-300 bg-gray-900 border-gray-700">
            <CardHeader className="text-center px-4 sm:px-6">
              <CardTitle className="font-gaming text-xl sm:text-2xl text-white">
                🎉 Pack Awarded! 🎉
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-3 sm:space-y-4 px-4 sm:px-6 pb-6">
              {/* Pack Image */}
              <div className="flex justify-center">
                <div className="relative">
                  <PackImage packType={packAward.tier} size="large" />
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg opacity-20 animate-pulse"></div>
                </div>
              </div>
              
              <div className="text-base sm:text-lg font-semibold text-white">
                {packAward.tier.charAt(0).toUpperCase() + packAward.tier.slice(1)} Pack!
              </div>
              
              <div className="text-sm text-gray-300">
                {packAward.message}
              </div>
              
              <div className="text-xs text-gray-400">
                Check your "My Packs" section to open it!
              </div>
              
              <Button 
                onClick={closePackAward}
                className="w-full py-3"
              >
                Back
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
      
      <main className="pt-20 sm:pt-20 pb-12 sm:pb-12 relative z-10">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8">
          {/* Header */}
          <section className="py-4 sm:py-8 text-center">
            <h1 className="font-gaming font-bold text-3xl sm:text-4xl md:text-5xl mb-3 sm:mb-4">
              <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-teal-500 bg-clip-text text-transparent">
                FIND THE PIKACHU
              </span>
            </h1>
            <p className="text-white text-base sm:text-lg max-w-2xl mx-auto px-2">
              Find all 4 Pikachus hidden in the forest! Avoid the rocks or the hunt ends. More Pikachus = better packs!
            </p>
          </section>

          {/* Game Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
            <Card className="gaming-card bg-gray-900/95 border-gray-600 shadow-lg">
              <CardContent className="p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold text-white">
                  {gameState.pikachusFound}/4
                </div>
                <div className="text-xs sm:text-sm text-gray-200 font-medium">Pikachus Found</div>
              </CardContent>
            </Card>

            <Card className="gaming-card bg-gray-900/95 border-gray-600 shadow-lg">
              <CardContent className="p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold text-white">
                  {FIND_PIKACHU_COST}
                </div>
                <div className="text-xs sm:text-sm text-gray-200 font-medium">Credits</div>
              </CardContent>
            </Card>

            <Card className="gaming-card bg-gray-900/95 border-gray-600 shadow-lg">
              <CardContent className="p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold text-white">
                  {creditBalance.toFixed(2)}
                </div>
                <div className="text-xs sm:text-sm text-gray-200 font-medium">Your Credits</div>
              </CardContent>
            </Card>
          </div>

          {/* Game Board */}
          <Card className="gaming-card mb-6 sm:mb-8 bg-gradient-to-br from-gray-900 to-gray-800 border-gray-600 shadow-2xl">
            <CardHeader className="text-center px-4 sm:px-6">
              <CardTitle className="font-gaming text-xl sm:text-2xl text-white mb-4">
                🎮 Game Board
              </CardTitle>
              
              {/* Instruction Message */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600 mb-4">
                <p className="text-gray-300 text-sm sm:text-base px-2">
                  {gameState.gameOver 
                    ? gameState.gameWon 
                      ? `🌟 You won! You'll receive a ${getPackTier(gameState.pikachusFound)} pack! 🌟`
                      : `🌙 Hunt ended! You found ${gameState.pikachusFound} Pikachus and earned a ${getPackTier(gameState.pikachusFound)} pack!`
                    : !gameStarted 
                      ? "Click 'Begin Hunt' to start the game"
                      : "Click the bushes to reveal them. Find all Pikachus to win!"
                  }
                </p>
                {!gameState.gameOver && gameStarted && (
                  <div className="mt-3 space-y-2">
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <motion.div 
                        className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(gameState.pikachusFound / 4) * 100}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                    
                    {/* Progress Text */}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-300">
                        🎯 <span className="font-semibold text-yellow-400">{gameState.pikachusFound}</span>/4 Pikachus found
                      </span>
                      <span className="text-gray-400">
                        {4 - gameState.pikachusFound} remaining
                      </span>
                    </div>
                    
                    {/* Target Indicator */}
                    <div className="flex items-center justify-center space-x-2 text-xs text-gray-300">
                      <span>Find:</span>
                      <div className="flex items-center space-x-1">
                        <img src={pikaImage} alt="Pikachu" className="w-4 h-4" />
                        <span className="font-semibold text-yellow-400">Pikachu</span>
                      </div>
                      <span>• Avoid:</span>
                      <div className="flex items-center space-x-1">
                        <img src={rockImage} alt="Rock" className="w-4 h-4" />
                        <span className="font-semibold text-red-400">Rocks</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="relative">
                {/* Shuffle Animation */}
                {showShuffleAnimation && (
                  <div className="flex justify-center items-center min-h-[400px]">
                    <div className="text-center">
                      <div className="mb-6 relative">
                        {/* Card Shuffle Animation */}
                        <div className="relative w-32 h-40 sm:w-40 sm:h-48 mx-auto">
                          <AnimatePresence>
                            {Array.from({length: 6}, (_, i) => (
                              <motion.div
                                key={i}
                                className="absolute inset-0 rounded-lg shadow-lg overflow-hidden p-0 m-0"
                                initial={{ 
                                  x: 0, 
                                  y: 0, 
                                  rotate: 0,
                                  scale: 1,
                                  zIndex: i
                                }}
                                animate={{
                                  x: [0, Math.sin(i * 0.5) * 20, Math.sin(i * 1) * 30, Math.sin(i * 1.5) * 15, 0],
                                  y: [0, Math.cos(i * 0.5) * 15, Math.cos(i * 1) * 25, Math.cos(i * 1.5) * 10, 0],
                                  rotate: [0, Math.sin(i * 0.3) * 10, Math.sin(i * 0.7) * 15, Math.sin(i * 1.2) * 8, 0],
                                  scale: [1, 0.95 + Math.sin(i * 0.4) * 0.1, 0.9 + Math.sin(i * 0.8) * 0.15, 0.95 + Math.sin(i * 1.1) * 0.1, 1],
                                  zIndex: [i, i + Math.floor(Math.sin(i * 0.6) * 3), i + Math.floor(Math.sin(i * 1.2) * 5), i + Math.floor(Math.sin(i * 1.8) * 2), i]
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                  delay: i * 0.1
                                }}
                              >
                                <img 
                                  src={bushImage} 
                                  alt="Bush" 
                                  className="w-full h-full object-cover rounded-lg block"
                                />
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                        
                        {/* Shuffle Effect Overlay */}
                        <motion.div
                          className="absolute inset-0 pointer-events-none"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0, 0.3, 0, 0.3, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                            <motion.div
                              className="w-8 h-8 bg-white/20 rounded-full blur-sm"
                              animate={{
                                scale: [1, 2, 0.5, 1.8, 1],
                                y: [0, -20, 10, -15, 0]
                              }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            />
                          </div>
                        </motion.div>
                      </div>
                      
                      <motion.div
                        className="text-white text-2xl sm:text-3xl font-bold mb-3"
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
                          🔄 Shuffling Cards...
                        </span>
                      </motion.div>
                      <motion.div 
                        className="text-cyan-400 text-base sm:text-lg font-semibold"
                        animate={{ opacity: [0.8, 1, 0.8] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                      >
                        🎯 Preparing Pikachu hunt board
                      </motion.div>
                    </div>
                  </div>
                )}

                {/* Game Board */}
                {!showShuffleAnimation && (
                  <div className="space-y-4">
                    {/* Visual Legend */}
                    {gameStarted && !gameState.gameOver && (
                      <motion.div 
                        className="flex justify-center items-center space-x-6 p-3 bg-gray-800/50 rounded-lg border border-gray-600/30"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <div className="flex items-center space-x-2">
                          <img src={pikaImage} alt="Pikachu" className="w-6 h-6" />
                          <span className="text-sm font-semibold text-yellow-400">Find Pikachu</span>
                        </div>
                        <div className="w-px h-6 bg-gray-600"></div>
                        <div className="flex items-center space-x-2">
                          <img src={rockImage} alt="Rock" className="w-6 h-6" />
                          <span className="text-sm font-semibold text-red-400">Avoid Rock</span>
                        </div>
                        <div className="w-px h-6 bg-gray-600"></div>
                        <div className="flex items-center space-x-2">
                          <img src={bushImage} alt="Bush" className="w-6 h-6" />
                          <span className="text-sm font-semibold text-green-400">Click Bush</span>
                        </div>
                      </motion.div>
                    )}
                    
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto">
                  {gameState.cards.map((card) => (
                    <Button
                      key={card.id}
                      variant="outline"
                      className={`w-20 h-28 sm:w-24 sm:h-32 md:w-28 md:h-36 lg:w-32 lg:h-40 xl:w-36 xl:h-44 p-0 text-lg sm:text-2xl font-bold transition-all duration-300 touch-manipulation overflow-hidden transform hover:scale-105 active:scale-95 disabled:transform-none ${
                        card.isRevealed
                          ? card.isRock
                            ? "bg-gradient-to-br from-red-500 to-red-600 text-white border-red-400 shadow-lg shadow-red-500/25 ring-2 ring-red-300/50"
                            : "bg-gradient-to-br from-green-500 to-green-600 text-white border-green-400 shadow-lg shadow-green-500/25 ring-2 ring-green-300/50"
                          : "bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 active:from-gray-500 active:to-gray-600 border-gray-500 hover:border-gray-400 shadow-md hover:shadow-lg hover:ring-1 hover:ring-gray-400/30"
                      }`}
                      onClick={() => handleCardClick(card.id)}
                      disabled={gameState.gameOver || card.isRevealed || !cardsReady}
                    >
                      {card.isRevealed ? (
                        card.isRock ? (
                          <img 
                            src={rockImage} 
                            alt="Rock" 
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <img 
                            src={pikaImage} 
                            alt="Pikachu" 
                            className="w-full h-full object-cover rounded-lg"
                          />
                        )
                      ) : (
                        <img 
                          src={bushImage} 
                          alt="Bush" 
                          className="w-full h-full object-cover rounded-lg"
                        />
                      )}
                    </Button>
                  ))}
                    </div>
                  </div>
                )}
                
                {/* Overlay when game hasn't started */}
                {!gameStarted && (
                  <div className="absolute inset-0 bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-sm rounded-lg flex items-center justify-center z-10 border-2 border-dashed border-yellow-400/50">
                    <div className="text-center text-white p-6">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="mb-4"
                      >
                        <div className="text-4xl sm:text-5xl mb-2">⚡</div>
                      </motion.div>
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
                        className="text-2xl sm:text-3xl font-bold mb-3 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent"
                      >
                        Pikachu Hunt Challenge
                      </motion.div>
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
                        className="text-lg sm:text-xl font-semibold mb-4 text-cyan-400"
                      >
                        Find All the Pikachus to Win Packs!
                      </motion.div>
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
                        className="text-sm sm:text-base text-gray-300 mb-4"
                      >
                        Click on bushes to reveal Pikachus and avoid rocks
                      </motion.div>
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.8, ease: "easeOut" }}
                        className="text-base sm:text-lg text-gray-300 font-medium"
                      >
                        Click Begin Hunt to start game
                      </motion.div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Game Controls */}
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-3 sm:space-y-0 sm:space-x-4 mb-6 sm:mb-8">
            {!gameStarted ? (
                <Button
                  onClick={startGame}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 text-base sm:text-sm bg-green-600 hover:bg-green-700 text-white border-2 border-green-500 hover:border-green-400 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  disabled={startGameMutation.isPending || playGameMutation.isPending || !canAfford}
                >
                {startGameMutation.isPending ? (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                    <span className="hidden sm:inline">Starting Hunt...</span>
                    <span className="sm:hidden">Starting</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Begin Hunt</span>
                    <span className="sm:hidden">Begin Hunt</span>
                    <Badge variant="secondary" className="ml-2 bg-yellow-500/20 text-yellow-400 border-yellow-400/30">
                      {FIND_PIKACHU_COST} Credits
                    </Badge>
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={initializeGame}
                variant="outline"
                className={`w-full sm:w-auto px-6 sm:px-8 py-3 text-base sm:text-sm border-2 transition-all duration-300 ${
                  (gameStarted && !gameState.gameOver) || showShuffleAnimation
                    ? "border-gray-500/50 bg-gray-700/30 text-gray-400 cursor-not-allowed opacity-60" 
                    : "border-blue-500/70 hover:border-blue-400 hover:bg-blue-500/15 text-blue-300 hover:text-blue-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                }`}
                disabled={playGameMutation.isPending || (gameStarted && !gameState.gameOver) || showShuffleAnimation}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">
                  {showShuffleAnimation ? "Shuffling..." : gameStarted && !gameState.gameOver ? "In Hunt" : "New Hunt"}
                </span>
                <span className="sm:hidden">
                  {showShuffleAnimation ? "Shuffling..." : gameStarted && !gameState.gameOver ? "In Hunt" : "New Hunt"}
                </span>
              </Button>
            )}
            
            <Button
              onClick={() => window.location.href = '/play'}
              variant="ghost"
              className="w-full sm:w-auto px-6 sm:px-8 py-3 text-base sm:text-sm text-gray-400 hover:text-white hover:bg-gray-800/60 transition-all duration-300 border border-transparent hover:border-gray-600/30"
            >
              <X className="w-4 h-4 mr-2" />
              Back to Games
            </Button>
          </div>

          {/* Pack Rewards Info */}
          <Card className="gaming-card mb-6 sm:mb-8 bg-gradient-to-br from-gray-900 to-gray-800 border-gray-600 shadow-2xl">
            <CardHeader className="text-center px-4 sm:px-6 pb-4">
              <CardTitle className="font-gaming text-xl sm:text-2xl text-white mb-2">
                🎁 Pack Rewards
              </CardTitle>
              <p className="text-gray-300 text-sm">
                Find more Pikachus to earn better packs!
              </p>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                {[
                  { pikachus: "0-1", tier: "pokeball", name: "Pokeball", color: "from-red-500 to-red-600", bgColor: "bg-red-500/10", borderColor: "border-red-500/30", image: "/assets/pokeball.png" },
                  { pikachus: "2", tier: "greatball", name: "Greatball", color: "from-blue-500 to-blue-600", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30", image: "/assets/greatball.png" },
                  { pikachus: "3", tier: "ultraball", name: "Ultraball", color: "from-yellow-500 to-orange-500", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30", image: "/assets/ultraball.png" },
                  { pikachus: "4", tier: "masterball", name: "Masterball", color: "from-purple-500 to-purple-600", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30", image: "/assets/masterball.png" },
                ].map((reward) => (
                  <div key={reward.pikachus} className={`text-center p-4 sm:p-5 rounded-lg border-2 ${reward.bgColor} ${reward.borderColor} transition-all duration-300 hover:scale-105 hover:shadow-xl`}>
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24">
                        <img 
                          src={reward.image} 
                          alt={reward.name}
                          className="w-full h-full object-cover drop-shadow-lg"
                          onError={(e) => {
                            console.error('Pack reward image failed to load:', reward.image, 'for', reward.name);
                          }}
                        />
                      </div>
                    </div>
                    <div className="font-bold text-base sm:text-lg text-white mb-2">{reward.name}</div>
                    <div className="text-sm text-gray-200 font-medium">
                      {reward.pikachus} Pikachu{reward.pikachus !== "1" ? 's' : ''}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <NavigationFooter />

      {/* Game Over Popup */}
      {showGameOverPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-600 rounded-xl p-8 max-w-lg w-full shadow-2xl"
          >
            <div className="text-center space-y-6">
              {/* Header */}
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-white tracking-wide">
                  GAME OVER
                </h2>
                <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
              </div>
              
              {/* Pack Image */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl border-2 border-gray-600 flex items-center justify-center shadow-lg">
                    <img 
                      src={`/assets/${getRewardTier(gameState.pikachusFound).tier}.png`}
                      alt={`${getRewardTier(gameState.pikachusFound).name} Pack`}
                      className="w-16 h-16 object-cover"
                      onError={(e) => {
                        console.error('Pack image failed to load:', `/assets/${getRewardTier(gameState.pikachusFound).tier}.png`);
                        e.currentTarget.src = "/assets/pokeball.png";
                      }}
                    />
                  </div>
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-xl blur-sm -z-10"></div>
                </div>
              </div>
              
              {/* Content */}
              <div className="space-y-3">
                <p className="text-xl text-gray-200">
                  You have won a <span className="font-bold text-green-400">{getRewardTier(gameState.pikachusFound).name}</span> pack!
                </p>
                
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                  <p className="text-sm text-gray-300">
                    Go to My Packs to open it
                  </p>
                  <p className="text-sm text-gray-300">
                    Click New Hunt for a new game
                  </p>
                </div>
              </div>
              
              {/* Button */}
              <Button
                onClick={() => setShowGameOverPopup(false)}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                OK
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
