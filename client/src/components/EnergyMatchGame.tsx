import React, { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { NavigationFooter } from "@/components/NavigationFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { RotateCcw, Zap, X, Flame, Droplets, Leaf, Zap as Electric } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Energy types
const ENERGY_TYPES = [
  { id: "fire", name: "Fire", icon: Flame, color: "from-red-500 to-orange-500", bgColor: "bg-red-500/10", borderColor: "border-red-500/30" },
  { id: "water", name: "Water", icon: Droplets, color: "from-blue-500 to-cyan-500", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30" },
  { id: "grass", name: "Grass", icon: Leaf, color: "from-green-500 to-emerald-500", bgColor: "bg-green-500/10", borderColor: "border-green-500/30" },
  { id: "electric", name: "Electric", icon: Electric, color: "from-yellow-500 to-amber-500", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30" },
];

// Game constants
const ENERGY_MATCH_COST = 200; // Credits per game
const CARDS_TO_PICK = 5;
const TOTAL_CARDS = 20; // 5 of each energy type

// Pack rewards based on matches
const PACK_REWARDS = [
  { matches: "0-1", tier: "pokeball", name: "Pokeball", color: "from-red-500 to-red-600", bgColor: "bg-red-500/10", borderColor: "border-red-500/30" },
  { matches: "2", tier: "greatball", name: "Greatball", color: "from-blue-500 to-blue-600", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30" },
  { matches: "3", tier: "ultraball", name: "Ultraball", color: "from-yellow-500 to-orange-500", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30" },
  { matches: "4", tier: "masterball", name: "Masterball", color: "from-purple-500 to-purple-600", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30" },
  { matches: "5", tier: "luxuryball", name: "Luxury Ball", color: "from-pink-500 to-rose-500", bgColor: "bg-pink-500/10", borderColor: "border-pink-500/30" },
];

interface GameState {
  selectedEnergy: string | null;
  gameStarted: boolean;
  gameOver: boolean;
  gameWon: boolean;
  cards: Array<{ id: number; energy: string; isRevealed: boolean }>;
  pickedCards: number[];
  matches: number;
}

export function EnergyMatchGame() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [gameState, setGameState] = useState<GameState>({
    selectedEnergy: null,
    gameStarted: false,
    gameOver: false,
    gameWon: false,
    cards: [],
    pickedCards: [],
    matches: 0,
  });

  // Animation states
  const [showShuffleAnimation, setShowShuffleAnimation] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [gamePhase, setGamePhase] = useState<'select' | 'pick1' | 'pick5'>('select');
  const [isProcessingCard, setIsProcessingCard] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showGameOverPopup, setShowGameOverPopup] = useState(false);

  // Get user data
  const { data: userData } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const canAfford = userData && typeof userData === 'object' && 'credits' in userData 
    ? Number((userData as any).credits) >= ENERGY_MATCH_COST 
    : false;
  const creditBalance = userData && typeof userData === 'object' && 'credits' in userData
    ? Number((userData as any).credits)
    : 0;

  // Start game mutation
  const startGameMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/credits/deduct", {
        amount: ENERGY_MATCH_COST,
        reason: "energy_match_game",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to deduct credits");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Credits deducted successfully, invalidate user data to refresh credits
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Game Started!",
        description: `${ENERGY_MATCH_COST} credits deducted. Good luck!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to start game",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  // Play game mutation
  const playGameMutation = useMutation({
    mutationFn: async (result: { matches: number; selectedEnergy: string }) => {
      return await apiRequest("POST", "/api/games/result", {
        gameType: "energy_match",
        result: result,
        cost: ENERGY_MATCH_COST,
      });
    },
    onSuccess: (data) => {
      const matches = gameState.matches;
      let rewardText = "";
      
      if (matches <= 1) rewardText = "Pokeball Pack";
      else if (matches === 2) rewardText = "Greatball Pack";
      else if (matches === 3) rewardText = "Ultraball Pack";
      else if (matches === 4) rewardText = "Masterball Pack";
      else if (matches === 5) rewardText = "Luxury Ball Pack";

      toast({
        title: "Game Complete!",
        description: `You matched ${matches} cards! You earned a ${rewardText}!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to submit result",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const initializeGame = useCallback(() => {
    // Create 20 cards (5 of each energy type)
    const cards = [];
    for (let i = 0; i < TOTAL_CARDS; i++) {
      const energyIndex = Math.floor(i / 5);
      cards.push({
        id: i,
        energy: ENERGY_TYPES[energyIndex].id,
        isRevealed: false,
      });
    }

    setGameState({
      selectedEnergy: null,
      gameStarted: false,
      gameOver: false,
      gameWon: false,
      cards: cards,
      pickedCards: [],
      matches: 0,
    });

    // Reset animation states
    setShowShuffleAnimation(false);
    setShowCards(false);
    setIsShuffling(false);
    setGamePhase('select');
    setIsProcessingCard(false);
    setShowGameOverPopup(false); // Reset processing state
  }, []);

  const selectEnergy = (energyId: string) => {
    setGameState(prev => ({
      ...prev,
      selectedEnergy: energyId,
    }));
  };

  const beginPlay = () => {
    // Deduct credits first
    startGameMutation.mutate();
    
    // Start the first shuffle animation for picking 1 card
    setShowShuffleAnimation(true);
    setIsShuffling(true);
    setGamePhase('pick1');
    setShowCards(false); // Hide any existing cards

    // After shuffle animation, show 4 cards for picking 1
    setTimeout(() => {
      // Create 4 cards (1 of each energy type) for the first pick
      const pick1Cards = ENERGY_TYPES.map((energy, index) => ({
        id: index,
        energy: energy.id,
        isRevealed: false,
      }));

      setGameState(prev => ({
        ...prev,
        cards: pick1Cards,
        gameStarted: true,
      }));

      setShowShuffleAnimation(false);
      setIsShuffling(false);
      setShowCards(true);
    }, 2000); // 2 second shuffle animation
  };


  const pickCard = (cardId: number) => {
    if (gameState.gameOver || isProcessingCard) return;
    
    // Additional safety check - if we're in pick1 phase and already have a picked card, don't allow more
    if (gamePhase === 'pick1' && gameState.pickedCards.length > 0) return;

    const pickedCard = gameState.cards.find(card => card.id === cardId);
    if (!pickedCard || pickedCard.isRevealed) return;

    // Prevent double-tap by setting processing state
    setIsProcessingCard(true);

    if (gamePhase === 'pick1') {
      // First phase: Pick 1 card, then shuffle for 5 cards
      setGameState(prev => ({
        ...prev,
        cards: prev.cards.map(card => 
          card.id === cardId ? { ...card, isRevealed: true } : card
        ),
        pickedCards: [cardId],
        selectedEnergy: pickedCard.energy, // Set selected energy here
      }));

      // Keep processing state true throughout the entire transition to prevent any clicks
      // Don't reset isProcessingCard here - it will be reset when the 20 cards are shown

      // 2 second pause after revealing the card
      setTimeout(() => {
        // Start second shuffle animation for 20 cards
        setTimeout(() => {
          setShowShuffleAnimation(true);
          setIsShuffling(true);
          setShowCards(false);
          setGamePhase('pick5');

          // After shuffle, show 20 cards
          setTimeout(() => {
            // Create 20 cards (5 of each energy type)
            const pick5Cards = [];
            for (let i = 0; i < TOTAL_CARDS; i++) {
              const energyIndex = Math.floor(i / 5);
              pick5Cards.push({
                id: i,
                energy: ENERGY_TYPES[energyIndex].id,
                isRevealed: false,
              });
            }

            // Shuffle the 20 cards
            const shuffledCards = pick5Cards.sort(() => Math.random() - 0.5);

            setGameState(prev => ({
              ...prev,
              cards: shuffledCards,
              pickedCards: [], // Reset picked cards for the 5-card phase
              matches: 0, // Reset matches
            }));

          setShowShuffleAnimation(false);
          setIsShuffling(false);
          setShowCards(true);
          setIsProcessingCard(false); // Reset processing state when 20 cards are shown
          }, 2000); // 2 second shuffle animation
        }, 1000); // 1 second delay before second shuffle
      }, 1250); // 1.25 second pause after revealing the card
    } else if (gamePhase === 'pick5') {
      // Second phase: Pick 5 cards
      if (gameState.pickedCards.length >= CARDS_TO_PICK) return;

      const newPickedCards = [...gameState.pickedCards, cardId];
      
      // Count matches
      const newMatches = pickedCard.energy === gameState.selectedEnergy 
        ? gameState.matches + 1 
        : gameState.matches;

      // Check if game is over (picked 5 cards)
      const isGameOver = newPickedCards.length >= CARDS_TO_PICK;

      setGameState(prev => ({
        ...prev,
        cards: prev.cards.map(card => 
          card.id === cardId ? { ...card, isRevealed: true } : card
        ),
        pickedCards: newPickedCards,
        matches: newMatches,
        gameOver: isGameOver,
      }));

      // 2 second pause after revealing the card
      setTimeout(() => {
        if (isGameOver) {
          // Show game over popup
          setShowGameOverPopup(true);
          
          // Submit game result
          playGameMutation.mutate({
            matches: newMatches,
            selectedEnergy: gameState.selectedEnergy!,
          });
        }
      }, 1250); // 1.25 second pause after revealing the card
    }

    // Reset processing state after a short delay to prevent double-tap
    setTimeout(() => {
      setIsProcessingCard(false);
    }, 500); // 500ms delay
  };

  const getRewardTier = (matches: number) => {
    if (matches <= 1) return PACK_REWARDS[0];
    if (matches === 2) return PACK_REWARDS[1];
    if (matches === 3) return PACK_REWARDS[2];
    if (matches === 4) return PACK_REWARDS[3];
    if (matches === 5) return PACK_REWARDS[4];
    return PACK_REWARDS[0];
  };

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navigation />

      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="absolute inset-0 bg-black/40"></div>
      </div>
      
      <main className="pt-20 sm:pt-20 pb-12 sm:pb-12 relative z-10 flex flex-col items-center justify-center min-h-screen">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 w-full">
          {/* Header */}
          <section className="py-4 sm:py-8 text-center">
            <h1 className="font-gaming font-bold text-3xl sm:text-4xl md:text-5xl mb-3 sm:mb-4">
              <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                ENERGY MATCH
              </span>
            </h1>
            <p className="text-white text-base sm:text-lg max-w-2xl mx-auto px-2">
              Choose your energy type and pick 5 cards to match! More matches = better packs!
            </p>
          </section>

          {/* Game Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
            <Card className="gaming-card bg-gray-900/95 border-gray-600 shadow-lg">
              <CardContent className="p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold text-white">
                  {gamePhase === 'pick1' ? `${gameState.pickedCards.length}/1` : `${gameState.matches}/5`}
                </div>
                <div className="text-xs sm:text-sm text-gray-200 font-medium">
                  {gamePhase === 'pick1' ? 'Cards Picked' : 'Matches Found'}
                </div>
              </CardContent>
            </Card>

            <Card className="gaming-card bg-gray-900/95 border-gray-600 shadow-lg">
              <CardContent className="p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold text-white">
                  {ENERGY_MATCH_COST}
                </div>
                <div className="text-xs sm:text-sm text-gray-200 font-medium">Credits</div>
              </CardContent>
            </Card>

            <Card className="gaming-card bg-gray-900/95 border-gray-600 shadow-lg">
              <CardContent className="p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold text-white">
                  {Math.floor(creditBalance)}
                </div>
                <div className="text-xs sm:text-sm text-gray-200 font-medium">Your Credits</div>
              </CardContent>
            </Card>
          </div>

          {/* Game Board */}
          <Card className="gaming-card mb-6 sm:mb-8 bg-gradient-to-br from-gray-900 to-gray-800 border-gray-600 shadow-2xl">
            <CardHeader className="text-center px-4 sm:px-6">
              <CardTitle className="font-gaming text-xl sm:text-2xl text-white mb-2">
                Game Board
              </CardTitle>
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-600">
                <div className="text-gray-300 px-4">
                  {gameState.gameOver ? (
                    <div className="text-center space-y-3">
                      <h3 className="text-xl font-bold text-yellow-400">
                        Game Complete
                      </h3>
                      <div className="space-y-2">
                        <p className="text-base">
                          You matched <span className="font-semibold text-cyan-400">{gameState.matches}</span> cards
                        </p>
                        <p className="text-base">
                          Earned: <span className="font-semibold text-green-400">{getRewardTier(gameState.matches).name} Pack</span>
                        </p>
                      </div>
                    </div>
                  ) : gamePhase === 'pick1' ? (
                    <div className="text-center space-y-3">
                      <h3 className="text-lg font-semibold text-cyan-400">
                        Choose Your Energy
                      </h3>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-200">
                          Select 1 energy type from the 4 cards below
                        </p>
                        <p className="text-xs text-gray-400">
                          This will be your target energy to find matches for
                        </p>
                      </div>
                    </div>
                  ) : gamePhase === 'pick5' ? (
                    <div className="text-center space-y-3">
                      <h3 className="text-lg font-semibold text-green-400">
                        Find Matching Cards
                      </h3>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-200">
                          Find 5 cards that match your <span className="font-semibold text-cyan-400">{ENERGY_TYPES.find(e => e.id === gameState.selectedEnergy)?.name}</span> energy
                        </p>
                        <p className="text-xs text-gray-400">
                          Matches found: <span className="font-semibold text-yellow-400">{gameState.matches}/5</span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-4">
                      <div className="flex items-center justify-center gap-3">
                        <h3 className="text-lg font-semibold text-yellow-400">
                          Energy Match
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowHowToPlay(!showHowToPlay)}
                          className="text-xs text-gray-400 hover:text-gray-300 px-2 py-1 h-auto border border-gray-600 hover:border-gray-500"
                        >
                          {showHowToPlay ? "Hide" : "How to Play"}
                        </Button>
                      </div>
                      
                      {showHowToPlay && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-sm space-y-2 bg-gray-700/40 rounded-lg p-4 border border-gray-600"
                        >
                          <div className="space-y-1">
                            <p>1. Click "Begin Play" to start</p>
                            <p>2. Pick 1 energy type from 4 cards</p>
                            <p>3. Find 5 matching cards from 20 cards</p>
                            <p>4. Win packs based on matches</p>
                          </div>
                        </motion.div>
                      )}
                      
                      <p className="text-sm text-gray-400">
                        Click "Begin Play" to start the game
                      </p>
                    </div>
                  )}
                </div>
                {!gameState.gameOver && gameState.gameStarted && (
                  <div className="mt-4 pt-3 border-t border-gray-600/50">
                    <div className="text-center">
                      <p className="text-xs text-gray-400">
                        {gamePhase === 'pick1' ? (
                          <span>Progress: {gameState.pickedCards.length}/1 energy selected</span>
                        ) : (
                          <span>Progress: {gameState.pickedCards.length}/5 cards picked, {gameState.matches} matches found</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="relative min-h-[400px] flex items-center justify-center">

          {/* Scene 1: Energy Selection Preview (4 cards) - Show when not started and not shuffling */}
          {!gameState.gameStarted && !showShuffleAnimation && (
            <div className="flex justify-center items-center w-full h-full">
              <div className="grid grid-cols-2 gap-4 sm:gap-6 max-w-lg mx-auto">
                  {ENERGY_TYPES.map((energy) => {
                    return (
                      <div
                        key={energy.id}
                        className="w-32 h-40 sm:w-36 sm:h-44 md:w-40 md:h-48 rounded-lg shadow-lg overflow-hidden p-0 m-0"
                      >
                        <img 
                          src={`/assets/${energy.id}.png`} 
                          alt={`${energy.name} Energy`} 
                          className="w-full h-full object-cover rounded-lg block"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
          )}

          {/* Shuffle Animation */}
          {showShuffleAnimation && (
            <div className="flex justify-center items-center">
              <div className="text-center">
                <div className="mb-6 relative">
                  {/* Card Shuffle Animation */}
                  <div className="relative w-32 h-40 sm:w-40 sm:h-48 mx-auto">
                    <AnimatePresence>
                      {Array.from({length: gamePhase === 'pick1' ? 4 : 8}, (_, i) => (
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
                            x: [
                              0, 
                              Math.sin(i * 0.5) * 20, 
                              Math.sin(i * 1) * 30, 
                              Math.sin(i * 1.5) * 15,
                              0
                            ],
                            y: [
                              0, 
                              Math.cos(i * 0.5) * 15, 
                              Math.cos(i * 1) * 25, 
                              Math.cos(i * 1.5) * 10,
                              0
                            ],
                            rotate: [
                              0, 
                              Math.sin(i * 0.3) * 10, 
                              Math.sin(i * 0.7) * 15, 
                              Math.sin(i * 1.2) * 8,
                              0
                            ],
                            scale: [
                              1, 
                              0.95 + Math.sin(i * 0.4) * 0.1, 
                              0.9 + Math.sin(i * 0.8) * 0.15, 
                              0.95 + Math.sin(i * 1.1) * 0.1,
                              1
                            ],
                            zIndex: [
                              i, 
                              i + Math.floor(Math.sin(i * 0.6) * 3), 
                              i + Math.floor(Math.sin(i * 1.2) * 5), 
                              i + Math.floor(Math.sin(i * 1.8) * 2),
                              i
                            ]
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: i * 0.1
                          }}
                        >
                          <img 
                            src="/assets/energy-card.png" 
                            alt="Energy Card" 
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
                    Shuffling Cards
                  </span>
                </motion.div>
                <motion.div 
                  className="text-cyan-400 text-base sm:text-lg font-semibold"
                  animate={{ opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                >
                  {gamePhase === 'pick1' 
                    ? 'Preparing 4 energy cards for selection' 
                    : 'Preparing 20 cards for final matching round'
                  }
                </motion.div>
              </div>
            </div>
          )}

          {/* Scene 2 & 3: Card Grid - Only show after game starts */}
          {gameState.gameStarted && showCards && (
            <div className="flex justify-center items-center">
              <motion.div 
                className={`grid gap-4 sm:gap-6 w-full max-w-lg ${
                  gamePhase === 'pick1' 
                    ? 'grid-cols-2' 
                    : 'grid-cols-4 sm:grid-cols-5'
                }`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <AnimatePresence>
                  {gameState.cards.map((card, index) => {
                    const energyType = ENERGY_TYPES.find(e => e.id === card.energy);
                    const IconComponent = energyType?.icon || Flame;
                    
                    return (
                      <motion.div
                        key={card.id}
                        initial={{ 
                          opacity: 0, 
                          y: 50, 
                          scale: 0.8,
                          rotate: Math.random() * 20 - 10
                        }}
                        animate={{ 
                          opacity: 1, 
                          y: 0, 
                          scale: 1,
                          rotate: 0
                        }}
                        exit={{ 
                          opacity: 0, 
                          scale: 0.8,
                          rotate: Math.random() * 20 - 10
                        }}
                        transition={{ 
                          duration: 0.6, 
                          delay: index * 0.05,
                          ease: "easeOut"
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="outline"
                          className={`${
                            gamePhase === 'pick1' 
                              ? 'w-32 h-40 sm:w-36 sm:h-44 md:w-40 md:h-48' 
                              : 'w-16 h-20 sm:w-20 sm:h-24 md:w-24 md:h-28'
                          } p-0 m-0 text-lg sm:text-2xl font-bold transition-all duration-300 touch-manipulation overflow-hidden ${
                            card.isRevealed
                              ? card.energy === gameState.selectedEnergy
                                ? "bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25 ring-2 ring-green-300/50"
                                : "bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25 ring-2 ring-red-300/50"
                              : "bg-gradient-to-br from-gray-800 to-gray-900 text-white hover:from-gray-700 hover:to-gray-800 shadow-lg"
                          }`}
                          onClick={() => pickCard(card.id)}
                          disabled={gameState.gameOver || card.isRevealed}
                        >
                          {card.isRevealed ? (
                            <motion.div
                              initial={{ rotateY: 180 }}
                              animate={{ rotateY: 0 }}
                              transition={{ duration: 0.6, ease: "easeInOut" }}
                              style={{ transformStyle: "preserve-3d" }}
                            >
                              <img 
                                src={`/assets/${card.energy}.png`} 
                                alt={`${card.energy} Energy`} 
                                className="w-full h-full object-cover rounded-lg block"
                              />
                            </motion.div>
                          ) : (
                            <motion.div
                              initial={{ rotateY: 0 }}
                              animate={{ rotateY: 0 }}
                              transition={{ duration: 0.6, ease: "easeInOut" }}
                              style={{ transformStyle: "preserve-3d" }}
                            >
                              <img 
                                src="/assets/energy-card.png" 
                                alt="Energy Card" 
                                className="w-full h-full object-cover rounded-lg block"
                              />
                            </motion.div>
                          )}
                        </Button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            </div>
          )}
              
              {/* Game Start Overlay - Only show when game hasn't started */}
              {!gameState.gameStarted && !showShuffleAnimation && (
                <div className="absolute inset-0 bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-sm rounded-lg flex items-center justify-center z-10 border-2 border-dashed border-yellow-400/50">
                  <div className="text-center text-white p-6">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="mb-4"
                    >
                     
                    </motion.div>
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
                      className="text-2xl sm:text-3xl font-bold mb-3 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent"
                    >
                      Energy Match Challenge
                    </motion.div>
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
                      className="text-lg sm:text-xl font-semibold mb-4 text-cyan-400"
                    >
                      Match Energy Cards to Win Packs!
                    </motion.div>
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
                      className="text-sm sm:text-base text-gray-300 mb-4"
                    >
                      Pick 1 energy, then find 5 matching cards
                    </motion.div>
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.8, ease: "easeOut" }}
                      className="text-base sm:text-lg text-gray-300 font-medium"
                    >
                      Click Begin Play to start game
                    </motion.div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          </Card>

          {/* Game Controls */}
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-3 sm:space-y-0 sm:space-x-4 mb-6 sm:mb-8">
            {!gameState.gameStarted && !showShuffleAnimation ? (
              <Button
                onClick={beginPlay}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 text-base sm:text-sm bg-green-600 hover:bg-green-700 text-white border-2 border-green-500 hover:border-green-400 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                disabled={!canAfford || startGameMutation.isPending}
                title={!canAfford ? `Need ${ENERGY_MATCH_COST} credits, you have ${creditBalance}` : ""}
              >
                {startGameMutation.isPending ? (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                    <span className="hidden sm:inline">Starting Match...</span>
                    <span className="sm:hidden">Starting</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Begin Play</span>
                    <span className="sm:hidden">Begin Play</span>
                  </>
                )}
                <Badge variant="secondary" className="ml-2 bg-yellow-500/20 text-yellow-400 border-yellow-400/30">
                  {ENERGY_MATCH_COST} Credits
                </Badge>
              </Button>
            ) : (
              <Button
                onClick={initializeGame}
                variant="outline"
                className={`w-full sm:w-auto px-6 sm:px-8 py-3 text-base sm:text-sm border-2 transition-all duration-300 ${
                  (gameState.gameStarted && !gameState.gameOver) || showShuffleAnimation
                    ? "border-gray-500/50 bg-gray-700/30 text-gray-400 cursor-not-allowed opacity-60" 
                    : "border-blue-500/70 hover:border-blue-400 hover:bg-blue-500/15 text-blue-300 hover:text-blue-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                }`}
                disabled={playGameMutation.isPending || (gameState.gameStarted && !gameState.gameOver) || showShuffleAnimation}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">
                  {showShuffleAnimation ? "Shuffling..." : gameState.gameStarted && !gameState.gameOver ? "In Match" : "New Match"}
                </span>
                <span className="sm:hidden">
                  {showShuffleAnimation ? "Shuffling..." : gameState.gameStarted && !gameState.gameOver ? "In Match" : "New Match"}
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
              Pack Rewards
            </CardTitle>
            <p className="text-gray-300 text-sm">
              Match more cards to earn better packs!
            </p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 sm:gap-6">
              {PACK_REWARDS.map((reward) => (
                <div key={reward.matches} className={`text-center p-4 sm:p-5 rounded-lg border-2 ${reward.bgColor} ${reward.borderColor} transition-all duration-300 hover:scale-105 hover:shadow-xl`}>
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24">
                      <img 
                        src={`/assets/${reward.tier}.png`}
                        alt={reward.name}
                        className="w-full h-full object-cover drop-shadow-lg"
                        onError={(e) => {
                          console.error('Pack reward image failed to load:', `/assets/${reward.tier}.png`, 'for', reward.name);
                        }}
                      />
                    </div>
                  </div>
                  <div className="font-bold text-base sm:text-lg text-white mb-2">{reward.name}</div>
                  <div className="text-sm text-gray-200 font-medium">
                    {reward.matches} Match{reward.matches !== "1" ? 'es' : ''}
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
                      src={`/assets/${getRewardTier(gameState.matches).tier}.png`}
                      alt={`${getRewardTier(gameState.matches).name} Pack`}
                      className="w-16 h-16 object-cover"
                      onError={(e) => {
                        console.error('Pack image failed to load:', `/assets/${getRewardTier(gameState.matches).tier}.png`);
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
                  You have won a <span className="font-bold text-green-400">{getRewardTier(gameState.matches).name}</span> pack!
                </p>
                
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                  <p className="text-sm text-gray-300">
                    Go to My Packs to open it
                  </p>
                  <p className="text-sm text-gray-300">
                    Click New Match for a new game
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
