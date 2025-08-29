import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Play, Coins } from "lucide-react";

interface GameResult {
  success: boolean;
  result: {
    cardId: string;
    tier: string;
    gameType: string;
  };
  sessionId: string;
}

export function PlinkoGame() {
  const [betAmount, setBetAmount] = useState("1.0");
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const playGameMutation = useMutation({
    mutationFn: async (data: { gameType: string; betAmount: string }) => {
      const response = await apiRequest("POST", "/api/games/play", data);
      return response.json() as Promise<GameResult>;
    },
    onSuccess: (result) => {
      setLastResult(result);
      queryClient.invalidateQueries(["/api/auth/user"]);
      queryClient.invalidateQueries(["/api/vault"]);
      
      const tierNames = {
        C: "Common",
        UC: "Uncommon", 
        R: "Rare",
        SR: "Super Rare",
        SSS: "Legendary"
      };

      toast({
        title: "Card Pulled!",
        description: `You got a ${tierNames[result.result.tier as keyof typeof tierNames]} card!`,
        duration: 5000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Game Error",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsPlaying(false);
    },
  });

  const handlePlay = () => {
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet <= 0) {
      toast({
        title: "Invalid Bet",
        description: "Please enter a valid bet amount",
        variant: "destructive",
      });
      return;
    }

    if (bet < 1.0) {
      toast({
        title: "Minimum Bet",
        description: "Minimum bet for Plinko is 1.0 credits",
        variant: "destructive",
      });
      return;
    }

    setIsPlaying(true);
    playGameMutation.mutate({
      gameType: "plinko",
      betAmount: betAmount,
    });
  };

  const tierColors = {
    C: "common",
    UC: "uncommon",
    R: "rare",
    SR: "superrare",
    SSS: "legendary"
  };

  return (
    <div className="space-y-6">
      {/* Game Board Visualization */}
      <Card className="gaming-card">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <h3 className="font-gaming font-bold text-xl mb-2">Plinko Board</h3>
            <p className="text-muted-foreground">Drop your chip and watch it bounce to your destiny!</p>
          </div>
          
          {/* Simple Plinko Board Visualization */}
          <div className="relative bg-gradient-to-b from-blue-600/20 to-purple-600/20 rounded-lg p-8 min-h-64 flex items-center justify-center">
            <div className="text-center">
              {isPlaying ? (
                <div className="space-y-4">
                  <div className="animate-bounce">
                    <div className="w-8 h-8 bg-primary rounded-full mx-auto"></div>
                  </div>
                  <p className="text-white font-semibold">Ball is dropping...</p>
                </div>
              ) : lastResult ? (
                <div className="space-y-4">
                  <div className={`w-16 h-16 rounded-full bg-${tierColors[lastResult.result.tier as keyof typeof tierColors]}/30 mx-auto flex items-center justify-center tier-glow-${tierColors[lastResult.result.tier as keyof typeof tierColors]}`}>
                    <span className={`text-2xl font-bold tier-${tierColors[lastResult.result.tier as keyof typeof tierColors]}`}>
                      {lastResult.result.tier}
                    </span>
                  </div>
                  <p className="text-white font-semibold">
                    You got a {lastResult.result.tier} tier card!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-muted/30 rounded-full mx-auto flex items-center justify-center">
                    <Play className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">Ready to play</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game Controls */}
      <Card className="gaming-card">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="bet-amount">Bet Amount (Credits)</Label>
              <div className="flex space-x-2 mt-2">
                <Input
                  id="bet-amount"
                  type="number"
                  min="1.0"
                  step="0.1"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="1.0"
                  disabled={isPlaying}
                  data-testid="input-bet-amount"
                />
                <Button
                  variant="outline"
                  onClick={() => setBetAmount("1.0")}
                  disabled={isPlaying}
                  data-testid="button-bet-min"
                >
                  Min
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setBetAmount("10.0")}
                  disabled={isPlaying}
                  data-testid="button-bet-max"
                >
                  Max
                </Button>
              </div>
            </div>

            <Button
              onClick={handlePlay}
              disabled={isPlaying || playGameMutation.isPending}
              className="w-full bg-gradient-to-r from-primary to-accent hover:glow-effect transition-all text-lg py-6"
              data-testid="button-play-plinko"
            >
              {isPlaying || playGameMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Playing...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Drop Chip ({betAmount} Credits)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Game Info */}
      <Card className="gaming-card">
        <CardContent className="p-6">
          <h4 className="font-semibold mb-4">How to Play</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Choose your bet amount (minimum 1.0 credits)</p>
            <p>• Click "Drop Chip" to start the game</p>
            <p>• Watch your chip bounce down the board</p>
            <p>• Your card tier is determined by where the chip lands</p>
            <p>• Higher bets don't affect odds, but determine card value</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
