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
  const [betAmount, setBetAmount] = useState("20");
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
        pokeball: 0,
        greatball: 90,
        ultraball: 180,
        masterball: 270,
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
          pokeball: "Poké Ball",
          greatball: "Great Ball",
          ultraball: "Ultra Ball",
          masterball: "Master Ball"
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

    if (bet !== 20) {
      toast({
        title: "Fixed Entry Cost",
        description: "Wheel Spin requires exactly 20 credits",
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
    { tier: "pokeball", color: "red", label: "Poké Ball", odds: "61%", slices: 22 },
    { tier: "greatball", color: "blue", label: "Great Ball", odds: "22%", slices: 8 },
    { tier: "ultraball", color: "yellow", label: "Ultra Ball", odds: "14%", slices: 5 },
    { tier: "masterball", color: "purple", label: "Master Ball", odds: "2.8%", slices: 1 },
  ];

  // Generate wheel slice positions for 36 total slices with alternating colors
  const generateWheelSlices = () => {
    const slices: Array<{
      tier: string;
      color: string;
      label: string;
      odds: string;
      slices: number;
      startAngle: number;
      endAngle: number;
      midAngle: number;
      displayColor: string;
    }> = [];
    let currentAngle = 0;
    const anglePerSlice = 360 / 36;
    
    // Create an array representing the actual distribution
    const distribution = [];
    wheelSegments.forEach((segment) => {
      for (let i = 0; i < segment.slices; i++) {
        distribution.push(segment);
      }
    });
    
    // Now create alternating visual colors while keeping the tier distribution
    const alternatingColors = ['red', 'blue', 'yellow', 'purple'];
    
    distribution.forEach((segment, index) => {
      slices.push({
        ...segment,
        startAngle: currentAngle,
        endAngle: currentAngle + anglePerSlice,
        midAngle: currentAngle + anglePerSlice / 2,
        displayColor: alternatingColors[index % 4] // Alternate visual colors
      });
      currentAngle += anglePerSlice;
    });
    
    return slices;
  };

  const wheelSlices = generateWheelSlices();

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
                className="w-80 h-80 rounded-full border-4 border-primary relative overflow-hidden shadow-2xl"
                style={{
                  background: `conic-gradient(
                    from 0deg,
                    ${wheelSlices.map((slice, index) => {
                      // Use alternating display colors for visual appeal
                      return `var(--${slice.displayColor}) ${slice.startAngle}deg ${slice.endAngle}deg`;
                    }).join(', ')}
                  )`,
                  transform: `rotate(${rotation}deg)`,
                  transition: isSpinning ? "transform 4s cubic-bezier(0.25, 0.46, 0.45, 0.94)" : "none",
                }}
              >
                {/* Slice Separators */}
                {wheelSlices.map((slice, index) => (
                  <div
                    key={index}
                    className="absolute w-full h-full"
                    style={{
                      transform: `rotate(${slice.startAngle}deg)`,
                      transformOrigin: "center",
                    }}
                  >
                    <div className="absolute top-0 left-1/2 w-0.5 h-1/2 bg-white/20 transform -translate-x-1/2"></div>
                  </div>
                ))}
                
                {/* No labels - colors only */}
              </div>
              
              {/* Pointer */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
                <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-white"></div>
              </div>
              
              {/* Center Circle */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                <RotateCcw className="w-6 h-6 text-white" />
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
                Spin Wheel (20 Credits)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Pokeball Pack Odds Display */}
      <Card className="gaming-card">
        <CardContent className="p-6">
          <h4 className="font-semibold mb-4">Pokeball Pack Odds</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {wheelSegments.map((segment) => (
              <div key={segment.tier} className="text-center p-4 rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 border-2 border-muted/50 hover:border-primary/50 transition-all">
                {/* Pokeball Design */}
                <div className="w-16 h-16 mx-auto mb-3 relative">
                  <div className={`w-full h-full rounded-full bg-gradient-to-br from-${segment.color}-400 to-${segment.color}-600 shadow-lg border-2 border-white/20`}>
                    {/* Pokeball center line */}
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-black/30 transform -translate-y-1/2"></div>
                    {/* Pokeball center button */}
                    <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-white rounded-full border border-black/20 transform -translate-x-1/2 -translate-y-1/2"></div>
                  </div>
                </div>
                <div className="text-sm font-bold">{segment.label}</div>
                <div className="text-lg font-bold text-primary">{segment.odds}</div>
                <div className="text-xs text-muted-foreground">{segment.slices} slices</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
