import React, { useState, useEffect, useCallback } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { NavigationFooter } from "@/components/NavigationFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { Bomb, Leaf, Package, RotateCcw, X } from "lucide-react";

// Import pack images
import masterballPack from "@assets/ChatGPT Image Aug 30, 2025, 11_21_42 PM_1756567318737.png";
import ultraballPack from "@assets/ChatGPT Image Aug 30, 2025, 11_21_45 PM_1756567324980.png";
import greatballPack from "@assets/ChatGPT Image Aug 30, 2025, 11_22_18 PM_1756567342025.png";
import pokeballPack from "@assets/ChatGPT Image Aug 30, 2025, 11_22_50 PM_1756567373572.png";

interface CardState {
  id: number;
  isRevealed: boolean;
  isBomb: boolean;
  isGreen: boolean;
}

interface GameState {
  cards: CardState[];
  gameOver: boolean;
  gameWon: boolean;
  greensFound: number;
  currentRound: number;
}

interface PackAward {
  tier: string;
  message: string;
  show: boolean;
}

const MINESWEEPER_COST = 15; // 15 credits per game

// Pack Image component
const PackImage = ({ packType, size = 'large' }: { packType: string; size?: 'small' | 'large' }) => {
  const getPackImage = (type: string) => {
    switch (type.toLowerCase()) {
      case 'masterball':
        return masterballPack;
      case 'ultraball':
        return ultraballPack;
      case 'greatball':
        return greatballPack;
      case 'pokeball':
        return pokeballPack;
      default:
        return pokeballPack;
    }
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

export function MinesweeperGame() {
  const { isAuthenticated } = useSupabaseAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [gameState, setGameState] = useState<GameState>({
    cards: [],
    gameOver: false,
    gameWon: false,
    greensFound: 0,
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
  const canAfford = !isCreditsLoading && isAuthenticated && creditBalance >= MINESWEEPER_COST;

  // Start game mutation (deducts credits)
  const startGameMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/credits/deduct", {
        amount: MINESWEEPER_COST,
        reason: "minesweeper_game",
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
        description: `${MINESWEEPER_COST} credits deducted. Click tiles to reveal them!`,
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
      const response = await apiRequest("POST", "/api/games/minesweeper", {
        greensFound: gameState.greensFound,
        won: gameState.gameWon,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to play game");
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      console.log('Minesweeper API response:', data);
      
      // Update game state with the result
      setGameState(prev => ({
        ...prev,
        gameOver: true,
        gameWon: data.won,
        greensFound: data.greensFound,
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
      console.error('Minesweeper API error:', error);
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
    const bombPositions = new Set<number>();
    
    // Randomly place 5 bombs
    while (bombPositions.size < 5) {
      const position = Math.floor(Math.random() * 9);
      bombPositions.add(position);
    }
    
    // Create 9 cards
    for (let i = 0; i < 9; i++) {
      cards.push({
        id: i,
        isRevealed: false,
        isBomb: bombPositions.has(i),
        isGreen: !bombPositions.has(i),
      });
    }
    
    setGameState({
      cards,
      gameOver: false,
      gameWon: false,
      greensFound: 0,
      currentRound: 0,
    });
    setGameStarted(false);
  }, []);

  // Start the game (deducts credits and allows tile selection)
  const startGame = useCallback(() => {
    if (!canAfford) {
      toast({
        title: "Insufficient Credits",
        description: `You need ${MINESWEEPER_COST} credits to play Minesweeper`,
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
    
    if (clickedCard.isBomb) {
      // Game over - reveal all cards
      updatedCards.forEach(card => card.isRevealed = true);
      setGameState(prev => ({
        ...prev,
        cards: updatedCards,
        gameOver: true,
        gameWon: false,
      }));
      
      // End the game
      console.log('Game over - calling API with:', { greensFound: gameState.greensFound, won: false });
      playGameMutation.mutate();
    } else {
      // Green card found
      clickedCard.isRevealed = true;
      const newGreensFound = gameState.greensFound + 1;
      
      setGameState(prev => ({
        ...prev,
        cards: updatedCards,
        greensFound: newGreensFound,
        currentRound: newGreensFound,
      }));
      
      // Check if all greens found
      if (newGreensFound === 4) {
        // Game won - reveal all cards
        updatedCards.forEach(card => card.isRevealed = true);
        setGameState(prev => ({
          ...prev,
          cards: updatedCards,
          gameOver: true,
          gameWon: true,
        }));
        
        // End the game
        console.log('Game won - calling API with:', { greensFound: newGreensFound, won: true });
        playGameMutation.mutate();
      }
    }
  };

  // Get pack tier based on greens found
  const getPackTier = (greens: number) => {
    if (greens === 0) return "Pokeball";
    if (greens === 1) return "Pokeball";
    if (greens === 2) return "Greatball";
    if (greens === 3) return "Ultraball";
    if (greens === 4) return "Masterball";
    return "Pokeball";
  };

  // Debug logging
  console.log('Minesweeper Game Debug:', {
    isAuthenticated,
    isCreditsLoading,
    creditBalance,
    MINESWEEPER_COST,
    canAfford,
    userCredits
  });

  // Initialize game on component mount
  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Mobile-friendly touch targets and spacing */}
      
      {/* Pack Award Popup */}
      {packAward.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-300 p-4">
          <Card className="gaming-card w-full max-w-sm sm:max-w-md animate-in zoom-in-95 duration-300">
            <CardHeader className="text-center px-4 sm:px-6">
              <CardTitle className="font-gaming text-xl sm:text-2xl text-green-500">
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
              
              <div className="text-base sm:text-lg font-semibold text-primary">
                {packAward.tier.charAt(0).toUpperCase() + packAward.tier.slice(1)} Pack!
              </div>
              
              <div className="text-sm text-muted-foreground">
                {packAward.message}
              </div>
              
              <div className="text-xs text-muted-foreground">
                Check your "My Packs" section to open it!
              </div>
              
              <Button 
                onClick={closePackAward}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-base"
              >
                Back
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
      
      <main className="pt-16 sm:pt-20 pb-8 sm:pb-12">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8">
          {/* Header */}
          <section className="py-4 sm:py-8 text-center">
            <h1 className="font-gaming font-bold text-3xl sm:text-4xl md:text-5xl mb-3 sm:mb-4">
              <span className="bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
                MINESWEEPER
              </span>
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto px-2">
              Find all the green cards before hitting a bomb! Each green card gets you closer to a better pack.
            </p>
          </section>

          {/* Game Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
            <Card className="gaming-card">
              <CardContent className="p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold text-green-500">
                  {gameState.greensFound}/4
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">Greens Found</div>
              </CardContent>
            </Card>

            <Card className="gaming-card">
              <CardContent className="p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold text-primary">
                  {MINESWEEPER_COST}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">Credits</div>
              </CardContent>
            </Card>

            <Card className="gaming-card">
              <CardContent className="p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold text-accent">
                  {creditBalance.toFixed(2)}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">Your Credits</div>
              </CardContent>
            </Card>
          </div>

          {/* Game Board */}
          <Card className="gaming-card mb-6 sm:mb-8">
            <CardHeader className="text-center px-4 sm:px-6">
              <CardTitle className="font-gaming text-xl sm:text-2xl">Game Board</CardTitle>
              <p className="text-muted-foreground text-sm sm:text-base px-2">
                {gameState.gameOver 
                  ? gameState.gameWon 
                    ? `You won! You'll receive a ${getPackTier(gameState.greensFound)} pack!`
                    : `Game over! You found ${gameState.greensFound} greens and earned a ${getPackTier(gameState.greensFound)} pack!`
                  : !gameStarted 
                    ? "Click 'Play' to start the game and deduct credits"
                    : "Click cards to reveal them. Find all greens to win!"
                }
              </p>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-sm sm:max-w-md mx-auto">
                {gameState.cards.map((card) => (
                  <Button
                    key={card.id}
                    variant="outline"
                    className={`w-16 h-16 sm:w-20 sm:h-20 p-0 text-lg sm:text-2xl font-bold transition-all duration-200 touch-manipulation ${
                      card.isRevealed
                        ? card.isBomb
                          ? "bg-red-500 text-white border-red-600"
                          : "bg-green-500 text-white border-green-600"
                        : "bg-muted hover:bg-muted/80 active:bg-muted/60 border-border"
                    }`}
                    onClick={() => handleCardClick(card.id)}
                    disabled={gameState.gameOver || card.isRevealed}
                  >
                    {card.isRevealed ? (
                      card.isBomb ? <Bomb className="w-6 h-6 sm:w-8 sm:h-8" /> : <Leaf className="w-6 h-6 sm:w-8 sm:h-8" />
                    ) : (
                      "?"
                    )}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Game Controls */}
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-3 sm:space-y-0 sm:space-x-4 mb-6 sm:mb-8">
            {!gameStarted ? (
              <Button
                onClick={startGame}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-base sm:text-sm"
                disabled={startGameMutation.isPending || playGameMutation.isPending || !canAfford}
              >
                {startGameMutation.isPending ? (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                    <span className="hidden sm:inline">Starting...</span>
                    <span className="sm:hidden">Starting</span>
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Play ({MINESWEEPER_COST} Credits)</span>
                    <span className="sm:hidden">Play</span>
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={initializeGame}
                variant="outline"
                className="w-full sm:w-auto px-6 sm:px-8 py-3 text-base sm:text-sm"
                disabled={playGameMutation.isPending}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                New Game
              </Button>
            )}
            
            <Button
              onClick={() => window.location.href = '/play'}
              variant="ghost"
              className="w-full sm:w-auto px-6 sm:px-8 py-3 text-base sm:text-sm"
            >
              <X className="w-4 h-4 mr-2" />
              Back to Games
            </Button>
          </div>

          {/* Pack Rewards Info */}
          <Card className="gaming-card mb-6 sm:mb-8">
            <CardHeader className="text-center px-4 sm:px-6">
              <CardTitle className="font-gaming text-lg sm:text-xl">Pack Rewards</CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="grid grid-cols-5 gap-2 sm:gap-4">
                {[
                  { greens: 0, tier: "pokeball", name: "Pokeball" },
                  { greens: 1, tier: "pokeball", name: "Pokeball" },
                  { greens: 2, tier: "greatball", name: "Greatball" },
                  { greens: 3, tier: "ultraball", name: "Ultraball" },
                  { greens: 4, tier: "masterball", name: "Masterball" },
                ].map((reward) => (
                  <div key={reward.greens} className="text-center">
                    <div className="flex justify-center mb-2">
                      <PackImage packType={reward.tier} size="small" />
                    </div>
                    <div className="font-semibold text-xs sm:text-sm">{reward.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {reward.greens} green{reward.greens !== 1 ? 's' : ''}
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
