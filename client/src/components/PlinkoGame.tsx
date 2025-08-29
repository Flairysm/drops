import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Play, Edit, RotateCcw, Save } from "lucide-react";

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

interface Pin {
  x: number;
  y: number;
  id: string;
}

const BOARD_WIDTH = 600;
const BOARD_HEIGHT = 500;
const PIN_RADIUS = 4;
const BALL_RADIUS = 8;
const LAYERS = 9;
const OUTCOMES = ["Masterball", "Ultraball", "Greatball", "Pokeball", "Pokeball", "Pokeball", "Greatball", "Ultraball", "Masterball"];

export function PlinkoGame() {
  const [betAmount, setBetAmount] = useState("1.0");
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [finalOutcome, setFinalOutcome] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [customPins, setCustomPins] = useState<Pin[]>([]);
  const [draggedPin, setDraggedPin] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
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
      setLastResult(result);
      queryClient.invalidateQueries(["/api/auth/user"]);
      queryClient.invalidateQueries(["/api/vault"]);
      
      // Map tiers to Pokeball types
      const tierToOutcome: { [key: string]: string } = {
        common: "Pokeball",
        uncommon: "Greatball", 
        rare: "Ultraball",
        superrare: "Ultraball",
        legendary: "Masterball"
      };

      const outcome = tierToOutcome[result.result.tier] || "Pokeball";
      
      // Start animation with predetermined outcome
      startPlinkoAnimation(outcome);

      toast({
        title: "Card Pulled!",
        description: `You got a ${outcome} (${result.result.tier}) card!`,
        duration: 5000,
      });
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

  const getDefaultPins = (): Pin[] => {
    const pins: Pin[] = [];
    const startY = 80;
    const endY = BOARD_HEIGHT - 120;
    const layerHeight = (endY - startY) / (LAYERS - 1);
    
    for (let layer = 0; layer < LAYERS; layer++) {
      const pinsInLayer = layer + 2; // Start with 2 pins, increment each layer
      const y = startY + (layer * layerHeight);
      
      // Calculate even spacing - center the pins with equal gaps
      const totalPinSpace = BOARD_WIDTH * 0.8; // Use 80% of board width
      const startX = (BOARD_WIDTH - totalPinSpace) / 2;
      const pinSpacing = totalPinSpace / (pinsInLayer - 1);
      
      for (let pin = 0; pin < pinsInLayer; pin++) {
        const x = startX + (pin * pinSpacing);
        pins.push({ 
          x, 
          y, 
          id: `pin-${layer}-${pin}`
        });
      }
    }
    return pins;
  };

  const getPins = () => {
    return customPins.length > 0 ? customPins : getDefaultPins();
  };

  const getOutcomePositions = () => {
    const positions = [];
    const spacing = BOARD_WIDTH / (OUTCOMES.length + 1);
    const y = BOARD_HEIGHT - 40;
    
    for (let i = 0; i < OUTCOMES.length; i++) {
      positions.push({
        x: spacing * (i + 1),
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
    const targetX = (BOARD_WIDTH / (OUTCOMES.length + 1)) * (targetIndex + 1);

    // Initialize ball
    const ball: Ball = {
      x: BOARD_WIDTH / 2,
      y: 20,
      vx: (Math.random() - 0.5) * 2, // Small random horizontal velocity
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
        ctx.fillStyle = pos.outcome === 'Masterball' ? 'rgba(255, 215, 0, 0.2)' :
                        pos.outcome === 'Ultraball' ? 'rgba(139, 92, 246, 0.2)' :
                        pos.outcome === 'Greatball' ? 'rgba(59, 130, 246, 0.2)' :
                        'rgba(148, 163, 184, 0.2)';
        ctx.fillRect(bucketX, BOARD_HEIGHT - 60, bucketWidth, 60);
        
        // Bucket border
        ctx.strokeStyle = pos.outcome === 'Masterball' ? '#ffd700' :
                         pos.outcome === 'Ultraball' ? '#8b5cf6' :
                         pos.outcome === 'Greatball' ? '#3b82f6' :
                         '#94a3b8';
        ctx.lineWidth = 2;
        ctx.strokeRect(bucketX, BOARD_HEIGHT - 60, bucketWidth, 60);

        // Bucket label
        ctx.fillStyle = pos.outcome === 'Masterball' ? '#ffd700' :
                       pos.outcome === 'Ultraball' ? '#8b5cf6' :
                       pos.outcome === 'Greatball' ? '#3b82f6' :
                       '#64748b';
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(pos.outcome, pos.x, BOARD_HEIGHT - 20);
      });

      // Physics for ball
      if (ball.y < BOARD_HEIGHT - 80) {
        // Gravity
        ball.vy += 0.3;
        
        // Check collision with pins
        pins.forEach(pin => {
          const dx = ball.x - pin.x;
          const dy = ball.y - pin.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < ball.radius + PIN_RADIUS) {
            // Collision detected - bounce ball
            const angle = Math.atan2(dy, dx);
            const force = 0.5;
            ball.vx += Math.cos(angle) * force;
            ball.vy = Math.abs(ball.vy) * 0.7; // Reduce downward velocity
            
            // Add some randomness to make it interesting
            ball.vx += (Math.random() - 0.5) * 2;
            
            // Separate ball from pin
            ball.x = pin.x + Math.cos(angle) * (ball.radius + PIN_RADIUS + 1);
            ball.y = pin.y + Math.sin(angle) * (ball.radius + PIN_RADIUS + 1);
          }
        });

        // Update position
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Friction
        ball.vx *= 0.98;

        // Keep ball in bounds
        if (ball.x < ball.radius) {
          ball.x = ball.radius;
          ball.vx *= -0.5;
        }
        if (ball.x > BOARD_WIDTH - ball.radius) {
          ball.x = BOARD_WIDTH - ball.radius;
          ball.vx *= -0.5;
        }

        // Guide ball toward target bucket as it gets near the bottom
        if (ball.y > BOARD_HEIGHT - 150) {
          const influence = Math.min((ball.y - (BOARD_HEIGHT - 150)) / 90, 1);
          const targetDx = targetX - ball.x;
          ball.vx += targetDx * 0.01 * influence;
        }
      } else {
        // Ball has reached the bottom - determine final outcome
        const bucketWidth = BOARD_WIDTH / OUTCOMES.length;
        const bucketIndex = Math.floor(ball.x / bucketWidth);
        const clampedIndex = Math.max(0, Math.min(OUTCOMES.length - 1, bucketIndex));
        
        if (!animationComplete) {
          setFinalOutcome(OUTCOMES[clampedIndex]);
          setAnimationComplete(true);
          setTimeout(() => {
            setIsPlaying(false);
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

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!editMode) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const pins = getPins();
    const clickedPin = pins.find(pin => {
      const dx = mouseX - pin.x;
      const dy = mouseY - pin.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= PIN_RADIUS + 10; // Slightly larger hit area
    });
    
    if (clickedPin) {
      setDraggedPin(clickedPin.id);
      setDragOffset({
        x: mouseX - clickedPin.x,
        y: mouseY - clickedPin.y
      });
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!editMode || !draggedPin) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const newX = Math.max(PIN_RADIUS, Math.min(BOARD_WIDTH - PIN_RADIUS, mouseX - dragOffset.x));
    const newY = Math.max(PIN_RADIUS, Math.min(BOARD_HEIGHT - 80, mouseY - dragOffset.y));
    
    const currentPins = getPins();
    const updatedPins = currentPins.map(pin => 
      pin.id === draggedPin ? { ...pin, x: newX, y: newY } : pin
    );
    
    setCustomPins(updatedPins);
    redrawCanvas();
  };

  const handleCanvasMouseUp = () => {
    if (editMode && draggedPin) {
      setDraggedPin(null);
      setDragOffset({ x: 0, y: 0 });
    }
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear and redraw static elements
    drawStaticElements(ctx);
  };

  const drawStaticElements = (ctx: CanvasRenderingContext2D) => {
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
      
      if (editMode && pin.id === draggedPin) {
        ctx.fillStyle = '#3b82f6'; // Blue when dragging
        ctx.strokeStyle = '#1d4ed8';
      } else if (editMode) {
        ctx.fillStyle = '#10b981'; // Green in edit mode
        ctx.strokeStyle = '#059669';
      } else {
        ctx.fillStyle = '#64748b';
        ctx.strokeStyle = '#94a3b8';
      }
      
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw outcome buckets
    outcomePositions.forEach((pos, index) => {
      const bucketWidth = BOARD_WIDTH / OUTCOMES.length;
      const bucketX = index * bucketWidth;
      
      ctx.fillStyle = pos.outcome === 'Masterball' ? 'rgba(255, 215, 0, 0.2)' :
                      pos.outcome === 'Ultraball' ? 'rgba(139, 92, 246, 0.2)' :
                      pos.outcome === 'Greatball' ? 'rgba(59, 130, 246, 0.2)' :
                      'rgba(148, 163, 184, 0.2)';
      ctx.fillRect(bucketX, BOARD_HEIGHT - 60, bucketWidth, 60);
      
      ctx.strokeStyle = pos.outcome === 'Masterball' ? '#ffd700' :
                       pos.outcome === 'Ultraball' ? '#8b5cf6' :
                       pos.outcome === 'Greatball' ? '#3b82f6' :
                       '#94a3b8';
      ctx.lineWidth = 2;
      ctx.strokeRect(bucketX, BOARD_HEIGHT - 60, bucketWidth, 60);

      ctx.fillStyle = pos.outcome === 'Masterball' ? '#ffd700' :
                     pos.outcome === 'Ultraball' ? '#8b5cf6' :
                     pos.outcome === 'Greatball' ? '#3b82f6' :
                     '#64748b';
      ctx.font = 'bold 12px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(pos.outcome, pos.x, BOARD_HEIGHT - 20);
    });
  };

  const resetPins = () => {
    setCustomPins([]);
    redrawCanvas();
    toast({
      title: "Pins Reset",
      description: "All pins have been reset to default positions",
    });
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
    
    playGameMutation.mutate({
      gameType: "plinko",
      betAmount: betAmount,
    });
  };

  useEffect(() => {
    // Initialize with default pins if no custom pins exist
    if (customPins.length === 0) {
      setCustomPins(getDefaultPins());
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawStaticElements(ctx);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [editMode, customPins, draggedPin]);

  return (
    <div className="space-y-6">
      {/* Game Board */}
      <Card className="gaming-card">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-gaming font-bold text-xl">Plinko Board</h3>
              <div className="flex space-x-2">
                <Button
                  variant={editMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditMode(!editMode)}
                  disabled={isPlaying}
                  data-testid="button-edit-mode"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {editMode ? "Exit Edit" : "Edit Pins"}
                </Button>
                {editMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetPins}
                    data-testid="button-reset-pins"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                )}
              </div>
            </div>
            <p className="text-muted-foreground">
              {editMode 
                ? "Drag any pin to customize your board layout!"
                : "Drop your ball through 9 layers of pins!"
              }
            </p>
          </div>
          
          <div className="flex justify-center">
            <div className="relative">
              <canvas 
                ref={canvasRef}
                width={BOARD_WIDTH}
                height={BOARD_HEIGHT}
                className={`border border-border rounded-lg bg-background/50 ${
                  editMode ? 'cursor-grab' : 'cursor-default'
                }`}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              />
              
              {/* Result Overlay */}
              {animationComplete && finalOutcome && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                  <div className="text-center space-y-4">
                    <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${
                      finalOutcome === 'Masterball' ? 'bg-yellow-500/30 border-2 border-yellow-500' :
                      finalOutcome === 'Ultraball' ? 'bg-purple-500/30 border-2 border-purple-500' :
                      finalOutcome === 'Greatball' ? 'bg-blue-500/30 border-2 border-blue-500' :
                      'bg-gray-500/30 border-2 border-gray-500'
                    }`}>
                      <span className={`text-2xl font-bold ${
                        finalOutcome === 'Masterball' ? 'text-yellow-400' :
                        finalOutcome === 'Ultraball' ? 'text-purple-400' :
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
              disabled={isPlaying || playGameMutation.isPending || editMode}
              className="w-full bg-gradient-to-r from-primary to-accent hover:glow-effect transition-all text-lg py-6"
              data-testid="button-play-plinko"
            >
              {isPlaying || playGameMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Ball Dropping...
                </>
              ) : editMode ? (
                <>
                  <Edit className="w-5 h-5 mr-2" />
                  Exit Edit Mode to Play
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
              <div className="w-12 h-12 bg-purple-500/20 rounded-full mx-auto flex items-center justify-center">
                <span className="text-xl">⭐</span>
              </div>
              <div>
                <p className="font-semibold text-purple-400">Ultraball</p>
                <p className="text-xs text-muted-foreground">Rare</p>
              </div>
            </div>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-full mx-auto flex items-center justify-center">
                <span className="text-xl">🏆</span>
              </div>
              <div>
                <p className="font-semibold text-yellow-400">Masterball</p>
                <p className="text-xs text-muted-foreground">Legendary</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}