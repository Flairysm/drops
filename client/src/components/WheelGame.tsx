import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  const wheelSegments = [
    { tier: "pokeball", color: "red", label: "Poké Ball", odds: "61%", slices: 22 },
    { tier: "greatball", color: "blue", label: "Great Ball", odds: "22%", slices: 8 },
    { tier: "ultraball", color: "yellow", label: "Ultra Ball", odds: "14%", slices: 5 },
    { tier: "masterball", color: "purple", label: "Master Ball", odds: "2.8%", slices: 1 },
  ];

  // Generate wheel slice positions for 36 total slices with red pokeballs as separators
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
    }> = [];
    let currentAngle = 0;
    const anglePerSlice = 360 / 36;
    
    // Create pattern with red pokeballs strategically placed to separate other colors
    const pattern = [];
    
    // Start with strategic layout: red between different colors
    // Place masterball (1)
    pattern.push('masterball');
    pattern.push('pokeball'); // red separator
    pattern.push('pokeball'); // red separator
    
    // Place ultraballs (5) with red separation
    for (let i = 0; i < 5; i++) {
      pattern.push('ultraball');
      pattern.push('pokeball'); // red separator
      if (i < 2) pattern.push('pokeball'); // extra red for separation
    }
    
    // Place greatballs (8) with red separation
    for (let i = 0; i < 8; i++) {
      pattern.push('greatball');
      pattern.push('pokeball'); // red separator
      if (i < 3) pattern.push('pokeball'); // extra red for separation
    }
    
    // Fill remaining with pokeballs to reach 36 total
    while (pattern.length < 36) {
      pattern.push('pokeball');
    }
    
    // Shuffle while maintaining some separation
    for (let i = pattern.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pattern[i], pattern[j]] = [pattern[j], pattern[i]];
    }
    
    pattern.forEach((tier, index) => {
      const segment = wheelSegments.find(s => s.tier === tier) || wheelSegments[0];
      slices.push({
        ...segment,
        startAngle: currentAngle,
        endAngle: currentAngle + anglePerSlice,
        midAngle: currentAngle + anglePerSlice / 2
      });
      currentAngle += anglePerSlice;
    });
    
    return slices;
  };

  const wheelSlices = generateWheelSlices();

  const playGameMutation = useMutation({
    mutationFn: async (data: { gameType: string; betAmount: string }) => {
      const response = await apiRequest("POST", "/api/games/play", data);
      return response.json() as Promise<GameResult>;
    },
    onSuccess: (result) => {
      // Find a slice that matches the result tier
      const matchingSlices = wheelSlices.filter(slice => slice.tier === result.result.tier);
      const targetSlice = matchingSlices[Math.floor(Math.random() * matchingSlices.length)];
      const targetAngle = targetSlice.midAngle;
      
      // Calculate final rotation to land on target with no additional shifts
      const spins = 5; // Number of full rotations
      const finalRotation = (spins * 360) + (360 - targetAngle);
      
      setRotation(finalRotation);
      
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
          title: "Pack Won!",
          description: `You won a ${tierNames[result.result.tier as keyof typeof tierNames]} pack!`,
          duration: 5000,
        });
      }, 3500);
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
      }, 3500);
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
                      // Use the slice's actual pokeball color
                      return `var(--${slice.color}) ${slice.startAngle}deg ${slice.endAngle}deg`;
                    }).join(', ')}
                  )`,
                  transform: `rotate(${rotation}deg)`,
                  transition: isSpinning ? "transform 3.5s cubic-bezier(0.25, 0.1, 0.25, 1)" : "none",
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
          <div className="flex justify-center mt-4">
            <Badge className="bg-purple-600 text-white">
              Win Mystery Packs
            </Badge>
          </div>
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
