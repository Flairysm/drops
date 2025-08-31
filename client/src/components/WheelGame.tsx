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
import masterballPack from '@assets/ChatGPT Image Aug 30, 2025, 11_21_42 PM_1756567318737.png';
import ultraballPack from '@assets/ChatGPT Image Aug 30, 2025, 11_21_45 PM_1756567324980.png';
import greatballPack from '@assets/ChatGPT Image Aug 30, 2025, 11_22_18 PM_1756567342025.png';
import pokeballPack from '@assets/ChatGPT Image Aug 30, 2025, 11_22_50 PM_1756567373572.png';

interface GameResult {
  success: boolean;
  result: {
    cardId: string;
    tier: string;
    gameType: string;
  };
  sessionId: string;
}

const PackImage = ({ packType, size = 'small' }: { packType: string; size?: 'small' | 'large' }) => {
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
  
  const imageSize = size === 'small' ? 'w-8 h-10' : 'w-16 h-20';
  
  return (
    <div className={`${imageSize} mx-auto`}>
      <img 
        src={getPackImage(packType)} 
        alt={`${packType} pack`}
        className="w-full h-full object-contain pixel-crisp"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
};

export function WheelGame() {
  const [betAmount, setBetAmount] = useState("20");
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [showPackDialog, setShowPackDialog] = useState(false);
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
    
    // Create evenly distributed pattern with red pokeballs as separators
    const pattern = new Array(36);
    
    // Place non-red balls first in evenly spaced positions
    // Place the 1 masterball
    pattern[0] = 'masterball';
    
    // Place 5 ultraballs evenly (every ~7 positions)
    for (let i = 0; i < 5; i++) {
      const pos = 5 + (i * 7); // positions 5, 12, 19, 26, 33
      if (pos < 36) pattern[pos] = 'ultraball';
    }
    
    // Place 8 greatballs in remaining good positions
    const greatballPositions = [2, 8, 11, 15, 18, 22, 28, 31];
    greatballPositions.forEach((pos, i) => {
      if (pos < 36 && !pattern[pos]) {
        pattern[pos] = 'greatball';
      }
    });
    
    // Fill all remaining positions with pokeballs (red separators)
    for (let i = 0; i < 36; i++) {
      if (!pattern[i]) {
        pattern[i] = 'pokeball';
      }
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
    mutationFn: async (data: { gameType: string; betAmount: string; wheelResult?: string }) => {
      const response = await apiRequest("POST", "/api/games/play", data);
      return response.json() as Promise<GameResult>;
    },
    onSuccess: (result) => {
      // Server result received, show popup immediately (animation is already complete)
      setLastResult(result);
      setShowPackDialog(true);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vault"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Game Error",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Stop spinning state immediately when server responds
      setIsSpinning(false);
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

    // Start spinning animation
    setIsSpinning(true);
    setLastResult(null);
    setShowPackDialog(false);
    
    // Generate random final rotation (multiple spins + random final position)
    const spins = 5 + Math.random() * 3; // 5-8 full rotations
    const finalAngle = Math.random() * 360; // Random final position
    const finalRotation = rotation + (spins * 360) + finalAngle;
    
    setRotation(finalRotation);
    
    // After animation completes, determine what the needle landed on
    setTimeout(() => {
      // Calculate where needle points after rotation (needle is at top pointing down)
      const normalizedAngle = (finalRotation % 360 + 360) % 360;
      const needleAngle = normalizedAngle;
      
      // Find which slice the needle is pointing to
      const targetSlice = wheelSlices.find(slice => 
        needleAngle >= slice.startAngle && needleAngle < slice.endAngle
      ) || wheelSlices[0]; // fallback to first slice
      
      const wheelResult = targetSlice.tier;
      
      playGameMutation.mutate({
        gameType: "wheel",
        betAmount: betAmount,
        wheelResult: wheelResult,
      });
    }, 3500); // Wait for animation to complete
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
              
              {/* Pointer - pointing down into the wheel */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-white"></div>
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

      {/* Pack Assignment Dialog */}
      {showPackDialog && lastResult && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
          <div className="text-center space-y-6 p-6 bg-background/90 rounded-lg border border-border max-w-sm">
            <div className="space-y-3">
              <div className={`w-20 h-28 mx-auto rounded-lg overflow-hidden border-2 ${
                lastResult.result.tier === 'masterball' ? 'border-purple-500 shadow-lg shadow-purple-500/50' :
                lastResult.result.tier === 'ultraball' ? 'border-yellow-500 shadow-lg shadow-yellow-500/50' :
                lastResult.result.tier === 'greatball' ? 'border-blue-500 shadow-lg shadow-blue-500/50' :
                'border-red-500 shadow-lg shadow-red-500/50'
              }`}>
                <PackImage packType={lastResult.result.tier} size="large" />
              </div>
              <h4 className="font-bold text-xl text-white">Pack Won!</h4>
              <p className="text-green-400 font-medium">
                {lastResult.result.tier === 'pokeball' ? 'Poké Ball' :
                 lastResult.result.tier === 'greatball' ? 'Great Ball' :
                 lastResult.result.tier === 'ultraball' ? 'Ultra Ball' :
                 'Master Ball'} Pack added to "My Packs"
              </p>
              <p className="text-sm text-muted-foreground">
                Your {lastResult.result.tier === 'pokeball' ? 'Poké Ball' :
                      lastResult.result.tier === 'greatball' ? 'Great Ball' :
                      lastResult.result.tier === 'ultraball' ? 'Ultra Ball' :
                      'Master Ball'} pack is ready to open!
              </p>
            </div>
            <Button
              onClick={() => setShowPackDialog(false)}
              className="w-full bg-gradient-to-r from-primary to-accent"
              data-testid="button-pack-dialog-ok"
            >
              OK
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
