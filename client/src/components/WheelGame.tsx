import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RotateCcw, Coins } from "lucide-react";

interface GameResult {
  success: boolean;
  result: {
    cardId: string;
    tier: string;
    gameType: string;
  };
  sessionId: string;
}

export function WheelGame() {
  const [betAmount, setBetAmount] = useState("2.5");
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const playGameMutation = useMutation({
    mutationFn: async (data: { gameType: string; betAmount: string }) => {
      const response = await apiRequest("POST", "/api/games/play", data);
      return response.json() as Promise<GameResult>;
    },
    onSuccess: (result) => {
      // Spin the wheel based on result
      const tierAngles = {
        D: 0,
        C: 51.4,  // 360/7 degrees per segment
        B: 102.8,
        A: 154.2,
        S: 205.6,
        SS: 257.0,
        SSS: 308.4,
      };
      
      const targetAngle = tierAngles[result.result.tier as keyof typeof tierAngles] || 0;
      const spinAmount = 1800 + targetAngle; // 5 full rotations + target
      setRotation(prev => prev + spinAmount);
      
      // Show result after animation
      setTimeout(() => {
        setLastResult(result);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        queryClient.invalidateQueries({ queryKey: ["/api/vault"] });
        
        const tierNames = {
          D: "D Tier",
          C: "C Tier",
          B: "B Tier", 
          A: "A Tier",
          S: "S Tier",
          SS: "SS Tier",
          SSS: "SSS Tier"
        };

        toast({
          title: "Card Pulled!",
          description: `You got a ${tierNames[result.result.tier as keyof typeof tierNames]} card!`,
          duration: 5000,
        });
      }, 3000);
    },
    onError: (error: Error) => {
      toast({
        title: "Game Error",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setTimeout(() => {
        setIsSpinning(false);
      }, 3000);
    },
  });

  const handleSpin = () => {
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet <= 0) {
      toast({
        title: "Invalid Bet",
        description: "Please enter a valid bet amount",
        variant: "destructive",
      });
      return;
    }

    if (bet < 2.5) {
      toast({
        title: "Minimum Bet",
        description: "Minimum bet for Wheel Spin is 2.5 credits",
        variant: "destructive",
      });
      return;
    }

    setIsSpinning(true);
    setLastResult(null);
    playGameMutation.mutate({
      gameType: "wheel",
      betAmount: betAmount,
    });
  };

  const wheelSegments = [
    { tier: "D", color: "d", label: "D Tier", odds: "50%" },
    { tier: "C", color: "c", label: "C Tier", odds: "30%" },
    { tier: "B", color: "b", label: "B Tier", odds: "15%" },
    { tier: "A", color: "a", label: "A Tier", odds: "4%" },
    { tier: "S", color: "s", label: "S Tier", odds: "0.8%" },
    { tier: "SS", color: "ss", label: "SS Tier", odds: "0.15%" },
    { tier: "SSS", color: "sss", label: "SSS Tier", odds: "0.05%" },
  ];

  return (
    <div className="space-y-6">
      {/* Wheel Visualization */}
      <Card className="gaming-card">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <h3 className="font-gaming font-bold text-xl mb-2">Fortune Wheel</h3>
            <p className="text-muted-foreground">Spin the wheel and test your luck!</p>
          </div>
          
          <div className="flex justify-center">
            <div className="relative">
              {/* Wheel */}
              <div 
                className="w-64 h-64 rounded-full border-4 border-primary relative overflow-hidden"
                style={{
                  background: `conic-gradient(
                    from 0deg,
                    hsl(var(--tier-d)) 0deg 51.4deg,
                    hsl(var(--tier-c)) 51.4deg 102.8deg, 
                    hsl(var(--tier-b)) 102.8deg 154.2deg,
                    hsl(var(--tier-a)) 154.2deg 205.6deg,
                    hsl(var(--tier-s)) 205.6deg 257deg,
                    hsl(var(--tier-ss)) 257deg 308.4deg,
                    hsl(var(--tier-sss)) 308.4deg 360deg
                  )`,
                  transform: `rotate(${rotation}deg)`,
                  transition: isSpinning ? "transform 3s cubic-bezier(0.25, 0.46, 0.45, 0.94)" : "none",
                }}
              >
                {/* Segment Labels */}
                {wheelSegments.map((segment, index) => (
                  <div
                    key={segment.tier}
                    className="absolute w-full h-full flex items-center justify-center text-white font-bold text-sm"
                    style={{
                      transform: `rotate(${index * 51.4 + 25.7}deg)`,
                      transformOrigin: "center",
                    }}
                  >
                    <span 
                      className="absolute"
                      style={{ 
                        top: "20%",
                        transform: `rotate(-${index * 51.4 + 25.7}deg)`,
                      }}
                    >
                      {segment.tier}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Pointer */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
                <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-white"></div>
              </div>
              
              {/* Center Circle */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <RotateCcw className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          {lastResult && !isSpinning && (
            <div className="text-center mt-6">
              <div className={`inline-flex items-center px-4 py-2 rounded-full bg-${wheelSegments.find(s => s.tier === lastResult.result.tier)?.color}/20 border border-${wheelSegments.find(s => s.tier === lastResult.result.tier)?.color}/50`}>
                <span className={`font-bold tier-${wheelSegments.find(s => s.tier === lastResult.result.tier)?.color} mr-2`}>
                  {lastResult.result.tier}
                </span>
                <span className="text-muted-foreground">
                  {wheelSegments.find(s => s.tier === lastResult.result.tier)?.label} Card!
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Game Controls */}
      <Card className="gaming-card">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="wheel-bet-amount">Bet Amount (Credits)</Label>
              <div className="flex space-x-2 mt-2">
                <Input
                  id="wheel-bet-amount"
                  type="number"
                  min="2.5"
                  step="0.5"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="2.5"
                  disabled={isSpinning}
                  data-testid="input-wheel-bet-amount"
                />
                <Button
                  variant="outline"
                  onClick={() => setBetAmount("2.5")}
                  disabled={isSpinning}
                  data-testid="button-wheel-bet-min"
                >
                  Min
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setBetAmount("25.0")}
                  disabled={isSpinning}
                  data-testid="button-wheel-bet-max"
                >
                  Max
                </Button>
              </div>
            </div>

            <Button
              onClick={handleSpin}
              disabled={isSpinning || playGameMutation.isPending}
              className="w-full bg-gradient-to-r from-uncommon to-rare hover:glow-effect transition-all text-lg py-6"
              data-testid="button-spin-wheel"
            >
              {isSpinning || playGameMutation.isPending ? (
                <>
                  <RotateCcw className="w-5 h-5 mr-2 animate-spin" />
                  Spinning...
                </>
              ) : (
                <>
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Spin Wheel ({betAmount} Credits)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Odds Display */}
      <Card className="gaming-card">
        <CardContent className="p-6">
          <h4 className="font-semibold mb-4">Wheel Odds</h4>
          <div className="grid grid-cols-5 gap-2">
            {wheelSegments.map((segment) => (
              <div key={segment.tier} className="text-center">
                <div className={`w-8 h-8 rounded-full bg-${segment.color}/20 mx-auto mb-1 flex items-center justify-center`}>
                  <span className={`text-xs font-bold tier-${segment.color}`}>{segment.tier}</span>
                </div>
                <div className="text-xs text-muted-foreground">{segment.odds}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
