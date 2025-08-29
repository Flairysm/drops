import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Play } from "lucide-react";

interface GameResult {
  success: boolean;
  result: {
    cardId: string;
    tier: string;
    gameType: string;
  };
  sessionId: string;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isLanding?: boolean;
  targetX?: number;
  targetY?: number;
}

const BOARD_WIDTH = 600;
const BOARD_HEIGHT = 500;
const PIN_RADIUS = 6;
const BALL_RADIUS = 12; // Made bigger
const LAYERS = 9;
const OUTCOMES = ["Masterball", "Ultraball", "Greatball", "Pokeball", "Pokeball", "Pokeball", "Greatball", "Ultraball", "Masterball"];

export function PlinkoGame() {
  const [betAmount, setBetAmount] = useState("1.0");
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [finalOutcome, setFinalOutcome] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const ballRef = useRef<Ball | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const playGameMutation = useMutation({
    mutationFn: async (data: { gameType: string; betAmount: string }) => {
      const response = await apiRequest("POST", "/api/games/play", data);
      return response.json() as Promise<GameResult>;
    },
    onSuccess: (result) => {
      console.log('Frontend received result:', result);
      setLastResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vault"] });
      
      // Map tiers to Pokeball types
      const tierToOutcome: { [key: string]: string } = {
        common: "Pokeball",
        uncommon: "Greatball", 
        rare: "Ultraball",
        superrare: "Ultraball",
        legendary: "Masterball"
      };

      const outcome = tierToOutcome[result.result.tier] || "Pokeball";
      console.log(`Tier: ${result.result.tier} -> Outcome: ${outcome}`);
      
      // Start animation with predetermined outcome
      startPlinkoAnimation(outcome);

      // Toast will be shown when ball lands in the animation
    },
    onError: (error: Error) => {
      toast({
        title: "Game Error",
        description: error.message,
        variant: "destructive",
      });
      setIsPlaying(false);
    },
  });

  const getPins = () => {
    const pins = [];
    
    for (let layer = 0; layer < LAYERS; layer++) {
      const pinsInLayer = layer + 2; // Layer 0: 2 pins, Layer 1: 3 pins, etc.
      
      // Vertical position - evenly spaced from top to bottom
      const y = 80 + (layer * 40);
      
      // Create proper pyramid spacing - center each layer
      const totalWidth = 560; // Even wider pyramid for better coverage
      const startX = (BOARD_WIDTH - totalWidth) / 2; // Center the pyramid
      const spacing = totalWidth / (LAYERS + 1); // Even spacing between pins
      
      for (let pin = 0; pin < pinsInLayer; pin++) {
        // Calculate X position for pyramid shape
        // Each layer should be centered with equal spacing between pins
        const layerWidth = spacing * (pinsInLayer - 1);
        const layerStartX = startX + (totalWidth - layerWidth) / 2;
        const x = layerStartX + (pin * spacing);
        
        pins.push({ x, y });
      }
    }
    return pins;
  };

  const getOutcomePositions = () => {
    const positions = [];
    const bucketWidth = BOARD_WIDTH / OUTCOMES.length;
    const y = BOARD_HEIGHT - 40;
    
    for (let i = 0; i < OUTCOMES.length; i++) {
      positions.push({
        x: bucketWidth * i + bucketWidth / 2,
        y,
        outcome: OUTCOMES[i]
      });
    }
    return positions;
  };

  const startPlinkoAnimation = (targetOutcome: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Find target bucket index
    const targetIndex = OUTCOMES.findIndex(o => o === targetOutcome);
    const bucketWidth = BOARD_WIDTH / OUTCOMES.length;
    const targetX = bucketWidth * targetIndex + bucketWidth / 2;

    // Initialize ball to drop between the first two pins
    const firstLayerPins = getPins().filter((_, index) => index < 2); // First layer has 2 pins
    const dropX = (firstLayerPins[0].x + firstLayerPins[1].x) / 2; // Exactly between first two pins
    
    const ball: Ball = {
      x: dropX + (Math.random() - 0.5) * 10, // Small variation around center
      y: 20,
      vx: (Math.random() - 0.5) * 1, // Reduced initial velocity
      vy: 0,
      radius: BALL_RADIUS,
      color: '#00d4ff'
    };

    ballRef.current = ball;
    const pins = getPins();
    const outcomePositions = getOutcomePositions();

    const animate = () => {
      ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
      
      // Draw background
      const gradient = ctx.createLinearGradient(0, 0, 0, BOARD_HEIGHT);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.1)');
      gradient.addColorStop(1, 'rgba(147, 51, 234, 0.1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

      // Draw pins
      pins.forEach(pin => {
        ctx.beginPath();
        ctx.arc(pin.x, pin.y, PIN_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = '#64748b';
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Draw outcome buckets
      outcomePositions.forEach((pos, index) => {
        const bucketWidth = BOARD_WIDTH / OUTCOMES.length;
        const bucketX = index * bucketWidth;
        
        // Bucket background
        ctx.fillStyle = pos.outcome === 'Masterball' ? 'rgba(139, 92, 246, 0.2)' :
                        pos.outcome === 'Ultraball' ? 'rgba(255, 215, 0, 0.2)' :
                        pos.outcome === 'Greatball' ? 'rgba(59, 130, 246, 0.2)' :
                        'rgba(148, 163, 184, 0.2)';
        ctx.fillRect(bucketX, BOARD_HEIGHT - 60, bucketWidth, 60);
        
        // Bucket border
        ctx.strokeStyle = pos.outcome === 'Masterball' ? '#8b5cf6' :
                         pos.outcome === 'Ultraball' ? '#ffd700' :
                         pos.outcome === 'Greatball' ? '#3b82f6' :
                         '#94a3b8';
        ctx.lineWidth = 2;
        ctx.strokeRect(bucketX, BOARD_HEIGHT - 60, bucketWidth, 60);

        // Bucket label - properly centered
        ctx.fillStyle = pos.outcome === 'Masterball' ? '#8b5cf6' :
                       pos.outcome === 'Ultraball' ? '#ffd700' :
                       pos.outcome === 'Greatball' ? '#3b82f6' :
                       '#64748b';
        ctx.font = 'bold 11px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(pos.outcome, bucketX + bucketWidth / 2, BOARD_HEIGHT - 25);
      });

      // Physics for ball
      if (ball.y < BOARD_HEIGHT - 70) {
        // Slower gravity for more controlled movement
        ball.vy += 0.2;
        
        // Check collision with pins
        pins.forEach(pin => {
          const dx = ball.x - pin.x;
          const dy = ball.y - pin.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < ball.radius + PIN_RADIUS) {
            // Collision detected - much more random bouncing
            const angle = Math.atan2(dy, dx);
            
            // True 50/50 physics - each pin collision is pure left/right choice
            const leftOrRight = Math.random() < 0.5 ? -1 : 1;
            ball.vx = leftOrRight * 2; // Strong left or right force
            
            // Maintain consistent downward velocity
            ball.vy = Math.abs(ball.vy) * 0.8;
            
            // No additional randomness - clean 50/50 split
            
            // Separate ball from pin with more space
            const separationDistance = ball.radius + PIN_RADIUS + 2;
            ball.x = pin.x + Math.cos(angle) * separationDistance;
            ball.y = pin.y + Math.sin(angle) * separationDistance;
          }
        });

        // Handle landing animation
        if (ball.isLanding && ball.targetX !== undefined && ball.targetY !== undefined) {
          // Much smoother animation to target bucket
          const dx = ball.targetX - ball.x;
          const dy = ball.targetY - ball.y;
          
          if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
            ball.x += dx * 0.03; // Much slower movement
            ball.y += dy * 0.03;
            ball.vx *= 0.9; // Gradually slow down existing velocity
            ball.vy *= 0.9;
          } else {
            ball.x = ball.targetX;
            ball.y = ball.targetY;
            ball.vx = 0;
            ball.vy = 0;
          }
        } else {
          // Normal movement
          ball.x += ball.vx;
          ball.y += ball.vy;
        }

        // More friction to slow down the ball
        ball.vx *= 0.985;

        // Keep ball in bounds
        if (ball.x < ball.radius) {
          ball.x = ball.radius;
          ball.vx *= -0.5;
        }
        if (ball.x > BOARD_WIDTH - ball.radius) {
          ball.x = BOARD_WIDTH - ball.radius;
          ball.vx *= -0.5;
        }

        // Very light guidance only at the very bottom to prevent getting stuck
        if (ball.y > BOARD_HEIGHT - 100) {
          const influence = Math.min((ball.y - (BOARD_HEIGHT - 100)) / 50, 1) * 0.3;
          const targetDx = targetX - ball.x;
          ball.vx += targetDx * 0.003 * influence; // Much weaker guidance
        }
      } else {
        // Ball has reached the bottom - determine final outcome
        // Make sure ball is fully inside a bucket, not just touching
        const bucketWidth = BOARD_WIDTH / OUTCOMES.length;
        
        // Clamp ball position to ensure it's within bounds
        ball.x = Math.max(ball.radius, Math.min(BOARD_WIDTH - ball.radius, ball.x));
        
        // Find which bucket the ball center is in
        const bucketIndex = Math.floor(ball.x / bucketWidth);
        const clampedIndex = Math.max(0, Math.min(OUTCOMES.length - 1, bucketIndex));
        
        // Move ball to center of the bucket it landed in
        const bucketCenter = (clampedIndex * bucketWidth) + (bucketWidth / 2);
        ball.x = bucketCenter;
        ball.y = BOARD_HEIGHT - 30; // Position ball inside the bucket
        
        if (!animationComplete) {
          setAnimationComplete(true);
          
          // CRITICAL FIX: Use the backend result to determine both visual and message outcome
          const backendTier = lastResult?.result?.tier || 'common';
          console.log('Ball landing - backend tier:', backendTier);
          
          const tierToOutcome: { [key: string]: string } = {
            common: "Pokeball",
            uncommon: "Greatball", 
            rare: "Ultraball",
            superrare: "Ultraball",
            legendary: "Masterball"
          };
          
          const actualOutcome = tierToOutcome[backendTier] || "Pokeball";
          console.log('Ball landing - actual outcome:', actualOutcome);
          
          // Find the correct slot for this outcome type
          let selectedSlot = 4; // Default to center
          
          if (actualOutcome === "Masterball") {
            // Masterball is only in slots 0 and 8, choose randomly
            selectedSlot = Math.random() < 0.5 ? 0 : 8;
          } else if (actualOutcome === "Ultraball") {
            // Ultraball is in slots 1 and 7, choose randomly
            selectedSlot = Math.random() < 0.5 ? 1 : 7;
          } else if (actualOutcome === "Greatball") {
            // Greatball is in slots 2 and 6, choose randomly
            selectedSlot = Math.random() < 0.5 ? 2 : 6;
          } else if (actualOutcome === "Pokeball") {
            // Pokeball is in slots 3, 4, and 5 - choose based on probability weights
            const pokeBallRandom = Math.random();
            if (pokeBallRandom < 0.31) { // 21.88 / (21.88 + 27.34 + 21.88) ≈ 0.31
              selectedSlot = 3;
            } else if (pokeBallRandom < 0.69) { // 27.34 / (21.88 + 27.34 + 21.88) ≈ 0.38, so 0.31 + 0.38 = 0.69
              selectedSlot = 4; // Center - most likely
            } else {
              selectedSlot = 5;
            }
          }
          
          // Smoothly animate ball to the selected slot
          const bucketWidth = BOARD_WIDTH / OUTCOMES.length;
          const targetX = (selectedSlot * bucketWidth) + (bucketWidth / 2);
          const targetY = BOARD_HEIGHT - 30;
          
          // Set target for smooth animation
          ball.targetX = targetX;
          ball.targetY = targetY;
          ball.isLanding = true;
          
          setFinalOutcome(actualOutcome);
          
          toast({
            title: "Card Pulled!",
            description: `You got a ${actualOutcome}!`,
            duration: 5000,
          });
          
          setTimeout(() => {
            setIsPlaying(false);
          }, 2000); // Even longer delay to show smooth landing
        }
      }

      // Draw ball
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      
      // Ball gradient
      const ballGradient = ctx.createRadialGradient(ball.x - 3, ball.y - 3, 0, ball.x, ball.y, ball.radius);
      ballGradient.addColorStop(0, '#ffffff');
      ballGradient.addColorStop(1, ball.color);
      ctx.fillStyle = ballGradient;
      ctx.fill();
      ctx.strokeStyle = '#0ea5e9';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (ball.y < BOARD_HEIGHT - 60) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();
  };

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
    setAnimationComplete(false);
    setFinalOutcome(null);
    setLastResult(null);
    
    // Clear the canvas and redraw static board immediately
    drawStaticBoard();
    
    playGameMutation.mutate({
      gameType: "plinko",
      betAmount: betAmount,
    });
  };

  const drawStaticBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    
    // Draw background
    const gradient = ctx.createLinearGradient(0, 0, 0, BOARD_HEIGHT);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.1)');
    gradient.addColorStop(1, 'rgba(147, 51, 234, 0.1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

    const pins = getPins();
    const outcomePositions = getOutcomePositions();

    // Draw pins
    pins.forEach(pin => {
      ctx.beginPath();
      ctx.arc(pin.x, pin.y, PIN_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#64748b';
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw outcome buckets
    outcomePositions.forEach((pos, index) => {
      const bucketWidth = BOARD_WIDTH / OUTCOMES.length;
      const bucketX = index * bucketWidth;
      
      ctx.fillStyle = pos.outcome === 'Masterball' ? 'rgba(139, 92, 246, 0.2)' :
                      pos.outcome === 'Ultraball' ? 'rgba(255, 215, 0, 0.2)' :
                      pos.outcome === 'Greatball' ? 'rgba(59, 130, 246, 0.2)' :
                      'rgba(148, 163, 184, 0.2)';
      ctx.fillRect(bucketX, BOARD_HEIGHT - 60, bucketWidth, 60);
      
      ctx.strokeStyle = pos.outcome === 'Masterball' ? '#8b5cf6' :
                       pos.outcome === 'Ultraball' ? '#ffd700' :
                       pos.outcome === 'Greatball' ? '#3b82f6' :
                       '#94a3b8';
      ctx.lineWidth = 2;
      ctx.strokeRect(bucketX, BOARD_HEIGHT - 60, bucketWidth, 60);

      ctx.fillStyle = pos.outcome === 'Masterball' ? '#8b5cf6' :
                     pos.outcome === 'Ultraball' ? '#ffd700' :
                     pos.outcome === 'Greatball' ? '#3b82f6' :
                     '#64748b';
      ctx.font = 'bold 11px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(pos.outcome, bucketX + bucketWidth / 2, BOARD_HEIGHT - 25);
    });
  };

  useEffect(() => {
    drawStaticBoard();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Game Board */}
      <Card className="gaming-card">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <h3 className="font-gaming font-bold text-xl mb-2">Plinko Board</h3>
            <p className="text-muted-foreground">Drop your ball through 9 layers of pins!</p>
          </div>
          
          <div className="flex justify-center">
            <div className="relative">
              <canvas 
                ref={canvasRef}
                width={BOARD_WIDTH}
                height={BOARD_HEIGHT}
                className="border border-border rounded-lg bg-background/50"
              />
              
              {/* Result Overlay */}
              {animationComplete && finalOutcome && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                  <div className="text-center space-y-4">
                    <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${
                      finalOutcome === 'Masterball' ? 'bg-purple-500/30 border-2 border-purple-500' :
                      finalOutcome === 'Ultraball' ? 'bg-yellow-500/30 border-2 border-yellow-500' :
                      finalOutcome === 'Greatball' ? 'bg-blue-500/30 border-2 border-blue-500' :
                      'bg-gray-500/30 border-2 border-gray-500'
                    }`}>
                      <span className={`text-2xl font-bold ${
                        finalOutcome === 'Masterball' ? 'text-purple-400' :
                        finalOutcome === 'Ultraball' ? 'text-yellow-400' :
                        finalOutcome === 'Greatball' ? 'text-blue-400' :
                        'text-gray-400'
                      }`}>
                        {finalOutcome === 'Masterball' ? '🏆' :
                         finalOutcome === 'Ultraball' ? '⭐' :
                         finalOutcome === 'Greatball' ? '🔹' :
                         '⚪'}
                      </span>
                    </div>
                    <div className="text-white">
                      <h4 className="font-bold text-xl">{finalOutcome}!</h4>
                      <p className="text-sm opacity-80">Ball landed in the {finalOutcome} bucket</p>
                    </div>
                  </div>
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
                  Ball Dropping...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Drop Ball ({betAmount} Credits)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payout Table */}
      <Card className="gaming-card">
        <CardContent className="p-6">
          <h4 className="font-semibold mb-4">Pokéball Tiers</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-gray-500/20 rounded-full mx-auto flex items-center justify-center">
                <span className="text-xl">⚪</span>
              </div>
              <div>
                <p className="font-semibold text-gray-400">Pokeball</p>
                <p className="text-xs text-muted-foreground">Most Common</p>
              </div>
            </div>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full mx-auto flex items-center justify-center">
                <span className="text-xl">🔹</span>
              </div>
              <div>
                <p className="font-semibold text-blue-400">Greatball</p>
                <p className="text-xs text-muted-foreground">Uncommon</p>
              </div>
            </div>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-full mx-auto flex items-center justify-center">
                <span className="text-xl">⭐</span>
              </div>
              <div>
                <p className="font-semibold text-yellow-400">Ultraball</p>
                <p className="text-xs text-muted-foreground">Rare</p>
              </div>
            </div>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full mx-auto flex items-center justify-center">
                <span className="text-xl">🏆</span>
              </div>
              <div>
                <p className="font-semibold text-purple-400">Masterball</p>
                <p className="text-xs text-muted-foreground">Legendary</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}