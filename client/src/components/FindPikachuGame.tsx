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

// Pack Image component
const PackImage = ({ packType, size = 'large' }: { packType: string; size?: 'small' | 'large' }) => {
  const getPackImage = (type: string) => {
    // Use classic pack image for all pack types
    return classicPack;
  };

  const sizeClasses = size === 'large' ? 'w-24 h-24' : 'w-16 h-16';

  return (
    <img
      src={getPackImage(packType)}
      alt={`${packType} Pack`}
      className={`${sizeClasses} object-contain rounded-lg shadow-lg`}
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
      // Credits deducted successfully, game can start
      setGameStarted(true);
      toast({
        title: "Game Started!",
        description: `${FIND_PIKACHU_COST} credits deducted. Find the Pikachus!`,
      });
      // Invalidate user credits query
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
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
    if (!gameStarted) {
      toast({
        title: "Game Not Started",
        description: "Click 'Play' to start the game first!",
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
              <CardTitle className="font-gaming text-xl sm:text-2xl text-white mb-2">
                🎮 Game Board
              </CardTitle>
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-600">
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
                  <div className="mt-2 text-xs text-gray-400">
                    Progress: {gameState.pikachusFound}/4 Pikachus found
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="relative">
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
                      disabled={gameState.gameOver || card.isRevealed}
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
                
                {/* Overlay when game hasn't started */}
                {!gameStarted && (
                  <div className="absolute inset-0 bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-sm rounded-lg flex items-center justify-center z-10 border-2 border-dashed border-gray-500/50">
                    <div className="text-center text-white p-6">
                      <div className="text-xl sm:text-2xl font-bold mb-2 text-yellow-400">
                        Press Begin Hunt to Start Game
                      </div>
                      <div className="text-lg font-semibold text-green-400">
                        Find all pikachu!
                      </div>
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
                  gameStarted && !gameState.gameOver
                    ? "border-gray-500/50 bg-gray-700/30 text-gray-400 cursor-not-allowed opacity-60" 
                    : "border-blue-500/70 hover:border-blue-400 hover:bg-blue-500/15 text-blue-300 hover:text-blue-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                }`}
                disabled={playGameMutation.isPending || (gameStarted && !gameState.gameOver)}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">
                  {gameStarted && !gameState.gameOver ? "In Hunt" : "New Hunt"}
                </span>
                <span className="sm:hidden">
                  {gameStarted && !gameState.gameOver ? "In Hunt" : "New Hunt"}
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { pikachus: "0-1", tier: "pokeball", name: "Pokeball", color: "from-red-500 to-red-600", bgColor: "bg-red-500/10", borderColor: "border-red-500/30" },
                  { pikachus: "2", tier: "greatball", name: "Greatball", color: "from-blue-500 to-blue-600", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30" },
                  { pikachus: "3", tier: "ultraball", name: "Ultraball", color: "from-yellow-500 to-orange-500", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30" },
                  { pikachus: "4", tier: "masterball", name: "Masterball", color: "from-purple-500 to-purple-600", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30" },
                ].map((reward) => (
                  <div key={reward.pikachus} className={`text-center p-3 rounded-lg border-2 ${reward.bgColor} ${reward.borderColor} transition-all duration-300 hover:scale-105 hover:shadow-lg`}>
                    <div className="flex justify-center mb-3">
                      <div className="relative">
                        <PackImage packType={reward.tier} size="small" />
                        <div className={`absolute inset-0 bg-gradient-to-r ${reward.color} rounded-lg opacity-20 animate-pulse`}></div>
                      </div>
                    </div>
                    <div className="font-bold text-sm sm:text-base text-white mb-1">{reward.name}</div>
                    <div className="text-xs text-gray-300 font-medium">
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
    </div>
  );
}
