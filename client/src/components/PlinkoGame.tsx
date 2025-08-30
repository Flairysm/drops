import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Play, Package, DollarSign } from "lucide-react";

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
}

const BOARD_WIDTH = 600;
const BOARD_HEIGHT = 500;
const PIN_RADIUS = 6;
const BALL_RADIUS = 14; // Made bigger
const LAYERS = 8;
const OUTCOMES = ["Masterball", "Ultraball", "Greatball", "Pokeball", "Pokeball", "Pokeball", "Greatball", "Ultraball", "Masterball"];

export function PlinkoGame() {
  const [fixedPrice, setFixedPrice] = useState("5.00");
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [finalOutcome, setFinalOutcome] = useState<string | null>(null);
  const [showPackAssigned, setShowPackAssigned] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const ballRef = useRef<Ball | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch fixed price for Plinko
  const { data: gameSettings } = useQuery({
    queryKey: ['/api/games/plinko/settings'],
  });

  useEffect(() => {
    if (gameSettings?.price) {
      setFixedPrice(gameSettings.price);
    }
  }, [gameSettings]);

  const playGameMutation = useMutation({
    mutationFn: async (data: { gameType: string; betAmount: string; plinkoResult?: string }) => {
      const response = await apiRequest("POST", "/api/games/play", data);
      return response.json() as Promise<GameResult>;
    },
    onSuccess: (result) => {
      setLastResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vault"] });
      queryClient.invalidateQueries({ queryKey: ["/api/packs"] });
      
      // This mutation is no longer needed for Plinko - physics handles everything
      console.log("Plinko mutation result (not used):", result);
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
    
    // Exact Stake.us Plinko pyramid layout
    // Row 1: 3 pins, Row 2: 4 pins, ..., Row 8: 10 pins
    const rows = 8;
    const startY = 140;
    const rowSpacing = 40; // Vertical spacing between rows
    const edgePadding = 10; // Distance from board edges for last row
    
    for (let row = 0; row < rows; row++) {
      const pinsInRow = row + 3; // Row 0: 3 pins, Row 1: 4 pins, etc.
      const y = startY + (row * rowSpacing);
      
      // For the last row (10 pins), make it span nearly edge to edge
      if (row === rows - 1) {
        const availableWidth = BOARD_WIDTH - (edgePadding * 2);
        const pinSpacing = availableWidth / (pinsInRow - 1);
        const startX = edgePadding;
        
        for (let pin = 0; pin < pinsInRow; pin++) {
          const x = startX + (pin * pinSpacing);
          pins.push({ x, y });
        }
      } else {
        // For other rows, maintain proportional spacing based on last row
        const lastRowWidth = BOARD_WIDTH - (edgePadding * 2);
        const maxPinSpacing = lastRowWidth / 9; // 9 spaces between 10 pins
        const pinSpacing = maxPinSpacing;
        const rowWidth = (pinsInRow - 1) * pinSpacing;
        const startX = (BOARD_WIDTH - rowWidth) / 2;
        
        for (let pin = 0; pin < pinsInRow; pin++) {
          const x = startX + (pin * pinSpacing);
          pins.push({ x, y });
        }
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

  const startPlinkoAnimation = (betAmount: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // No predetermined target - let physics determine the outcome naturally
    const bucketWidth = BOARD_WIDTH / OUTCOMES.length;

    // Initialize ball to drop randomly between pins 1-2 or 2-3
    const firstLayerPins = getPins().filter((_, index) => index < 3); // First 3 pins
    const dropChoice = Math.random() < 0.5 ? 0 : 1; // Choose between first two gaps
    const dropX = (firstLayerPins[dropChoice].x + firstLayerPins[dropChoice + 1].x) / 2; // Drop between chosen pins
    
    const ball: Ball = {
      x: dropX + (Math.random() - 0.5) * 8, // Slight initial variation
      y: 20,
      vx: (Math.random() - 0.5) * 1.2, // More initial horizontal velocity for dynamic start
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
        // Enhanced gravity acceleration for faster gameplay
        ball.vy += 0.35;
        
        // Reduced air resistance for faster movement
        ball.vx *= 0.999; // Minimal horizontal air resistance
        ball.vy *= 0.9998; // Almost no vertical air resistance
        
        // Apply movement
        ball.x += ball.vx;
        ball.y += ball.vy;
        
        // Natural collision detection - let physics handle the bouncing
        pins.forEach(pin => {
          const dx = ball.x - pin.x;
          const dy = ball.y - pin.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = ball.radius + PIN_RADIUS;
          
          if (distance < minDistance && distance > 0) {
            // Calculate collision normal
            const nx = dx / distance;
            const ny = dy / distance;
            
            // Separate ball from pin
            const separation = minDistance - distance;
            ball.x += nx * separation;
            ball.y += ny * separation;
            
            // Enhanced energetic collision physics
            const dotProduct = ball.vx * nx + ball.vy * ny;
            
            // More energetic bounce with variation
            const bounceVariation = 1.0 + (Math.random() * 0.1); // Up to 10% extra energy
            ball.vx -= 1.8 * dotProduct * nx * bounceVariation;
            ball.vy -= 1.8 * dotProduct * ny * bounceVariation;
            
            // Reduced surface friction for more dynamic movement
            const surfaceFriction = 0.85 + (Math.random() * 0.04); // Higher friction range 0.85-0.89
            ball.vx *= surfaceFriction;
            ball.vy *= 0.88;
            
            // Add micro spin effect from collision
            const spinInfluence = (Math.random() - 0.5) * 0.1;
            ball.vx += spinInfluence;
          }
        });

        // Keep ball in bounds
        if (ball.x < ball.radius) {
          ball.x = ball.radius;
          ball.vx *= -0.5;
        }
        if (ball.x > BOARD_WIDTH - ball.radius) {
          ball.x = BOARD_WIDTH - ball.radius;
          ball.vx *= -0.5;
        }

        // Natural physics - no guidance needed
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
          
          // Trust the physics simulation - use the visual outcome
          const actualOutcome = OUTCOMES[clampedIndex];
          setFinalOutcome(actualOutcome);
          
          // Send the actual physics result to backend for pack assignment
          console.log(`Frontend physics result: ${actualOutcome} (bucket ${clampedIndex})`);
          
          // Call backend with physics result
          playGameMutation.mutate({
            gameType: "plinko",
            betAmount: fixedPrice,
            plinkoResult: actualOutcome // Send the visual result
          });
          
          setTimeout(() => {
            setShowPackAssigned(true);
          }, 1000);
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
    if (!fixedPrice || parseFloat(fixedPrice) <= 0) {
      toast({
        title: "Pricing Error",
        description: "Game pricing not available. Please try again later.",
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
    
    // Start physics simulation immediately - pass fixed price
    startPlinkoAnimation(fixedPrice);
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
              {animationComplete && finalOutcome && !showPackAssigned && (
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
              
              {/* Pack Assignment Overlay */}
              {showPackAssigned && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-lg">
                  <div className="text-center space-y-6 p-6 bg-background/90 rounded-lg border border-border max-w-sm">
                    <div className="space-y-3">
                      <div className="w-16 h-16 rounded-full mx-auto bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                        <Package className="h-8 w-8 text-white" />
                      </div>
                      <h4 className="font-bold text-xl text-white">Pack Assigned!</h4>
                      <p className="text-green-400 font-medium">
                        Pack assigned to "My Packs"
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Your {finalOutcome} pack is ready to open!
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setShowPackAssigned(false);
                        setIsPlaying(false);
                        setFinalOutcome(null);
                        setAnimationComplete(false);
                      }}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                      data-testid="button-pack-assigned-ok"
                    >
                      OK
                    </Button>
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
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg p-4 border-2 border-blue-200 dark:border-blue-700">
              <div className="flex items-center justify-center space-x-2">
                <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-game-cost">
                  Cost: {fixedPrice} credit per play
                </span>
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
                  Drop Ball ({fixedPrice} Credits)
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