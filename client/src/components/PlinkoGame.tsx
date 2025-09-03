import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Play, Package, DollarSign } from "lucide-react";
import masterballPack from "@assets/ChatGPT Image Aug 30, 2025, 11_21_42 PM_1756567318737.png";
import ultraballPack from "@assets/ChatGPT Image Aug 30, 2025, 11_21_45 PM_1756567324980.png";
import greatballPack from "@assets/ChatGPT Image Aug 30, 2025, 11_22_18 PM_1756567342025.png";
import pokeballPack from "@assets/ChatGPT Image Aug 30, 2025, 11_22_50 PM_1756567373572.png";

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

// Real Plinko board physics constants
const GRAVITY = 0.25; // Natural falling speed
const FRICTION = 0.925; // Light friction for clean movement
const RESTITUTION = 0.725; // Natural bounce elasticity
const OUTCOMES = [
  "Masterball",
  "Ultraball",
  "Greatball",
  "Pokeball",
  "Pokeball",
  "Pokeball",
  "Greatball",
  "Ultraball",
  "Masterball",
];

const PackImage = ({
  packType,
  size = "small",
}: {
  packType: string;
  size?: "small" | "large";
}) => {
  const getPackImage = (type: string) => {
    switch (type.toLowerCase()) {
      case "masterball":
        return masterballPack;
      case "ultraball":
        return ultraballPack;
      case "greatball":
        return greatballPack;
      case "pokeball":
        return pokeballPack;
      default:
        return pokeballPack;
    }
  };

  const imageSize = size === "small" ? "w-8 h-10" : "w-16 h-20";

  return (
    <div className={`${imageSize} mx-auto`}>
      <img
        src={getPackImage(packType)}
        alt={`${packType} pack`}
        className="w-full h-full object-contain pixel-crisp"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
};

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

  // Fetch user credits
  const { data: userCredits, isLoading: isCreditsLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/auth/user");
      return response.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    staleTime: 30000,
    gcTime: 60000,
  });

  // Fetch fixed price for Plinko
  const { data: gameSettings } = useQuery({
    queryKey: ["/api/games/plinko/settings"],
  });

  useEffect(() => {
    if (
      gameSettings &&
      typeof gameSettings === "object" &&
      gameSettings !== null &&
      "price" in gameSettings
    ) {
      const price = String(gameSettings.price);
      console.log("Plinko fixed price:", price, "(user input ignored:", fixedPrice, ")");
      setFixedPrice(price);
    }
  }, [gameSettings]);

  // Credit deduction mutation for Plinko
  const deductCreditsMutation = useMutation({
    mutationFn: async () => {
      console.log("Deducting credits for Plinko:", fixedPrice);
      
      // Prevent double deduction by checking if already playing
      if (isPlaying) {
        console.log("Game already in progress, skipping credit deduction");
        return { success: true, alreadyPlaying: true };
      }
      
      const response = await fetch("/api/credits/deduct", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          amount: fixedPrice,
          reason: "plinko_game",
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to deduct credits");
      }
      
      return response.json();
    },
    onSuccess: (result) => {
      // Only proceed if this is a new game (not already playing)
      if (result.alreadyPlaying) {
        console.log("Game already in progress, not starting new one");
        return;
      }
      
      console.log("Credits deducted successfully, starting Plinko game");
      
      // Credits deducted successfully, start the game
      setIsPlaying(true);
      setAnimationComplete(false);
      setFinalOutcome(null);
      setLastResult(null);

      // Clear the canvas and redraw static board immediately
      drawStaticBoard();

      // Start physics simulation immediately - pass fixed price
      startPlinkoAnimation(fixedPrice);
      
      // Invalidate user credits query only once
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: any) => {
      console.error('Credit deduction error:', error);
      toast({
        title: "Failed to Start Game",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const playGameMutation = useMutation({
    mutationFn: async (data: {
      gameType: string;
      betAmount: string;
      plinkoResult?: string;
    }) => {
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
      const y = startY + row * rowSpacing;

      // For the last row (10 pins), make it span nearly edge to edge
      if (row === rows - 1) {
        const availableWidth = BOARD_WIDTH - edgePadding * 2;
        const pinSpacing = availableWidth / (pinsInRow - 1);
        const startX = edgePadding;

        for (let pin = 0; pin < pinsInRow; pin++) {
          const x = startX + pin * pinSpacing;
          pins.push({ x, y });
        }
      } else {
        // For other rows, maintain proportional spacing based on last row
        const lastRowWidth = BOARD_WIDTH - edgePadding * 2;
        const maxPinSpacing = lastRowWidth / 9; // 9 spaces between 10 pins
        const pinSpacing = maxPinSpacing;
        const rowWidth = (pinsInRow - 1) * pinSpacing;
        const startX = (BOARD_WIDTH - rowWidth) / 2;

        for (let pin = 0; pin < pinsInRow; pin++) {
          const x = startX + pin * pinSpacing;
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
        outcome: OUTCOMES[i],
      });
    }
    return positions;
  };

  const startPlinkoAnimation = (betAmount: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // No predetermined target - let physics determine the outcome naturally
    const bucketWidth = BOARD_WIDTH / OUTCOMES.length;

    // Initialize ball to drop randomly between pins 1-2 or 2-3
    const firstLayerPins = getPins().filter((_, index) => index < 3); // First 3 pins
    const dropChoice = Math.random() < 0.5 ? 0 : 1; // Choose between first two gaps
    const dropX =
      (firstLayerPins[dropChoice].x + firstLayerPins[dropChoice + 1].x) / 2; // Drop between chosen pins

    const ball: Ball = {
      x: dropX + (Math.random() - 0.5) * 3, // Small, predictable drop variation
      y: 20, // Standard start position
      vx: (Math.random() - 0.5) * 0.15, // Minimal horizontal variance
      vy: 0, // Start with no vertical velocity
      radius: BALL_RADIUS,
      color: "#00d4ff",
    };

    ballRef.current = ball;
    const pins = getPins();
    const outcomePositions = getOutcomePositions();

    const animate = () => {
      ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

      // Draw background
      const gradient = ctx.createLinearGradient(0, 0, 0, BOARD_HEIGHT);
      gradient.addColorStop(0, "rgba(59, 130, 246, 0.1)");
      gradient.addColorStop(1, "rgba(147, 51, 234, 0.1)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

      // Draw pins with enhanced visual effects
      pins.forEach((pin) => {
        // Check if ball is near this pin for interaction effect
        const ball = ballRef.current;
        const isNearBall = ball && Math.sqrt((ball.x - pin.x) ** 2 + (ball.y - pin.y) ** 2) < 30;
        
        ctx.beginPath();
        ctx.arc(pin.x, pin.y, PIN_RADIUS, 0, Math.PI * 2);
        
        // Enhanced pin gradient
        const pinGradient = ctx.createRadialGradient(
          pin.x - 2,
          pin.y - 2,
          0,
          pin.x,
          pin.y,
          PIN_RADIUS,
        );
        pinGradient.addColorStop(0, isNearBall ? "#94a3b8" : "#64748b");
        pinGradient.addColorStop(1, isNearBall ? "#475569" : "#475569");
        
        ctx.fillStyle = pinGradient;
        ctx.fill();
        
        // Enhanced border
        ctx.strokeStyle = isNearBall ? "#cbd5e1" : "#94a3b8";
        ctx.lineWidth = isNearBall ? 2 : 1;
        ctx.stroke();
        
        // Add subtle glow effect when ball is near
        if (isNearBall) {
          ctx.shadowColor = "#0ea5e9";
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(pin.x, pin.y, PIN_RADIUS + 2, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(14, 165, 233, 0.3)";
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw outcome buckets
      outcomePositions.forEach((pos, index) => {
        const bucketWidth = BOARD_WIDTH / OUTCOMES.length;
        const bucketX = index * bucketWidth;

        // Bucket background
        ctx.fillStyle =
          pos.outcome === "Masterball"
            ? "rgba(139, 92, 246, 0.2)"
            : pos.outcome === "Ultraball"
              ? "rgba(255, 215, 0, 0.2)"
              : pos.outcome === "Greatball"
                ? "rgba(59, 130, 246, 0.2)"
                : "rgba(148, 163, 184, 0.2)";
        ctx.fillRect(bucketX, BOARD_HEIGHT - 60, bucketWidth, 60);

        // Bucket border
        ctx.strokeStyle =
          pos.outcome === "Masterball"
            ? "#8b5cf6"
            : pos.outcome === "Ultraball"
              ? "#ffd700"
              : pos.outcome === "Greatball"
                ? "#3b82f6"
                : "#94a3b8";
        ctx.lineWidth = 2;
        ctx.strokeRect(bucketX, BOARD_HEIGHT - 60, bucketWidth, 60);

        // Bucket label - properly centered
        ctx.fillStyle =
          pos.outcome === "Masterball"
            ? "#8b5cf6"
            : pos.outcome === "Ultraball"
              ? "#ffd700"
              : pos.outcome === "Greatball"
                ? "#3b82f6"
                : "#64748b";
        ctx.font = "bold 11px Inter";
        ctx.textAlign = "center";
        ctx.fillText(pos.outcome, bucketX + bucketWidth / 2, BOARD_HEIGHT - 25);
      });

      // Stake.us-style physics for fair, natural feel
      if (ball.y < BOARD_HEIGHT - 70) {
        // Apply gravity
        ball.vy += GRAVITY;

        // Apply movement
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Enhanced collision detection with natural pin influence
        pins.forEach((pin) => {
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

            // Real Plinko board bounce physics
            const dotProduct = ball.vx * nx + ball.vy * ny;
            
            if (dotProduct < 0) {
              // Clean, predictable bounce
              ball.vx -= 2 * dotProduct * nx * RESTITUTION;
              ball.vy -= 2 * dotProduct * ny * RESTITUTION;

              // Apply friction for natural energy loss
              ball.vx *= FRICTION;
              ball.vy *= FRICTION;
            }
          }
        });

        // Clean wall collision physics
        if (ball.x < ball.radius) {
          ball.x = ball.radius;
          ball.vx = Math.abs(ball.vx) * RESTITUTION;
          ball.vy *= FRICTION;
        }
        if (ball.x > BOARD_WIDTH - ball.radius) {
          ball.x = BOARD_WIDTH - ball.radius;
          ball.vx = -Math.abs(ball.vx) * RESTITUTION;
          ball.vy *= FRICTION;
        }

        // Light air resistance for natural movement
        ball.vx *= 0.998;
        ball.vy *= 0.998;

        // Simple physics - no artificial forces
      } else {
        // Ball has reached the bottom - determine final outcome
        // Make sure ball is fully inside a bucket, not just touching
        const bucketWidth = BOARD_WIDTH / OUTCOMES.length;

        // Clamp ball position to ensure it's within bounds
        ball.x = Math.max(
          ball.radius,
          Math.min(BOARD_WIDTH - ball.radius, ball.x),
        );

        // Find which bucket the ball center is in
        const bucketIndex = Math.floor(ball.x / bucketWidth);
        const clampedIndex = Math.max(
          0,
          Math.min(OUTCOMES.length - 1, bucketIndex),
        );

        // Move ball to center of the bucket it landed in
        const bucketCenter = clampedIndex * bucketWidth + bucketWidth / 2;
        ball.x = bucketCenter;
        ball.y = BOARD_HEIGHT - 30; // Position ball inside the bucket

        if (!animationComplete) {
          setAnimationComplete(true);

          // Trust the physics simulation - use the visual outcome
          const actualOutcome = OUTCOMES[clampedIndex];
          setFinalOutcome(actualOutcome);

          // Send the actual physics result to backend for pack assignment
          console.log(
            `Frontend physics result: ${actualOutcome} (bucket ${clampedIndex})`,
          );

          // For Plinko, we don't need to call playGameMutation since credits are already deducted
          // Just show the result directly
          console.log("Plinko game completed with result:", actualOutcome);

          setTimeout(() => {
            setShowPackAssigned(true);
          }, 1000);
        }
      }

      // Draw ball with enhanced visual effects
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);

      // Enhanced ball gradient with depth
      const ballGradient = ctx.createRadialGradient(
        ball.x - 4,
        ball.y - 4,
        0,
        ball.x,
        ball.y,
        ball.radius,
      );
      ballGradient.addColorStop(0, "#ffffff");
      ballGradient.addColorStop(0.3, "#e0f2fe");
      ballGradient.addColorStop(0.7, "#0288d1");
      ballGradient.addColorStop(1, ball.color);
      ctx.fillStyle = ballGradient;
      ctx.fill();
      
      // Enhanced border with shadow effect
      ctx.strokeStyle = "#0ea5e9";
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Add highlight for 3D effect
      ctx.beginPath();
      ctx.arc(ball.x - 3, ball.y - 3, ball.radius * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.fill();

      if (ball.y < BOARD_HEIGHT - 60) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();
  };

  const handlePlay = () => {
    console.log("Plinko play button clicked. Fixed price:", fixedPrice, "Game settings:", gameSettings);
    
    // Prevent multiple clicks while game is starting
    if (isPlaying || deductCreditsMutation.isPending) {
      console.log("Game already in progress or starting, ignoring click");
      return;
    }
    
    if (!fixedPrice || parseFloat(fixedPrice) <= 0) {
      toast({
        title: "Pricing Error",
        description: "Game pricing not available. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    // Check if user has enough credits
    const creditBalance = userCredits && typeof userCredits === 'object' && 'credits' in userCredits
      ? Number((userCredits as any).credits)
      : 0;
    
    console.log("User credit balance:", creditBalance, "Required:", fixedPrice);
    
    if (creditBalance < parseFloat(fixedPrice)) {
      toast({
        title: "Insufficient Credits",
        description: `You need ${fixedPrice} credits to play. You have ${creditBalance.toFixed(2)} credits.`,
        variant: "destructive",
      });
      return;
    }

    // Deduct credits and start game
    deductCreditsMutation.mutate();
  };

  const drawStaticBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

    // Draw background
    const gradient = ctx.createLinearGradient(0, 0, 0, BOARD_HEIGHT);
    gradient.addColorStop(0, "rgba(59, 130, 246, 0.1)");
    gradient.addColorStop(1, "rgba(147, 51, 234, 0.1)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

    const pins = getPins();
    const outcomePositions = getOutcomePositions();

    // Draw pins
    pins.forEach((pin) => {
      ctx.beginPath();
      ctx.arc(pin.x, pin.y, PIN_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "#64748b";
      ctx.fill();
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw outcome buckets
    outcomePositions.forEach((pos, index) => {
      const bucketWidth = BOARD_WIDTH / OUTCOMES.length;
      const bucketX = index * bucketWidth;

      ctx.fillStyle =
        pos.outcome === "Masterball"
          ? "rgba(139, 92, 246, 0.2)"
          : pos.outcome === "Ultraball"
            ? "rgba(255, 215, 0, 0.2)"
            : pos.outcome === "Greatball"
              ? "rgba(59, 130, 246, 0.2)"
              : "rgba(148, 163, 184, 0.2)";
      ctx.fillRect(bucketX, BOARD_HEIGHT - 60, bucketWidth, 60);

      ctx.strokeStyle =
        pos.outcome === "Masterball"
          ? "#8b5cf6"
          : pos.outcome === "Ultraball"
            ? "#ffd700"
            : pos.outcome === "Greatball"
              ? "#3b82f6"
              : "#94a3b8";
      ctx.lineWidth = 2;
      ctx.strokeRect(bucketX, BOARD_HEIGHT - 60, bucketWidth, 60);

      ctx.fillStyle =
        pos.outcome === "Masterball"
          ? "#8b5cf6"
          : pos.outcome === "Ultraball"
            ? "#ffd700"
            : pos.outcome === "Greatball"
              ? "#3b82f6"
              : "#64748b";
      ctx.font = "bold 11px Inter";
      ctx.textAlign = "center";
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
            <p className="text-muted-foreground">
              Drop your ball through 9 layers of pins!
            </p>
          </div>

          <div className="flex justify-center">
            <div className="relative w-full max-w-[600px]">
              <canvas
                ref={canvasRef}
                width={BOARD_WIDTH}
                height={BOARD_HEIGHT}
                className="border border-border rounded-lg bg-background/50 w-full h-auto max-w-full"
                style={{ maxWidth: "100%", height: "auto" }}
              />

              {/* Result Overlay with Pack Design */}
              {animationComplete && finalOutcome && !showPackAssigned && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                  <div className="text-center space-y-2 p-3">
                    <div
                      className={`w-16 h-20 mx-auto rounded-lg overflow-hidden border-2 ${
                        finalOutcome === "Masterball"
                          ? "border-purple-500 shadow-lg shadow-purple-500/50"
                          : finalOutcome === "Ultraball"
                            ? "border-yellow-500 shadow-lg shadow-yellow-500/50"
                            : finalOutcome === "Greatball"
                              ? "border-blue-500 shadow-lg shadow-blue-500/50"
                              : "border-red-500 shadow-lg shadow-red-500/50"
                      }`}
                    >
                      <PackImage
                        packType={finalOutcome.toLowerCase()}
                        size="small"
                      />
                    </div>
                    <div className="text-white">
                      <h4 className="font-bold text-lg">
                        {finalOutcome} Pack!
                      </h4>
                      <p className="text-xs opacity-80">
                        Ball landed in the {finalOutcome} bucket
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Pack Assignment Overlay with Pack Design */}
              {showPackAssigned && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-lg">
                  <div className="text-center space-y-4 p-4 bg-background/90 rounded-lg border border-border max-w-xs mx-2">
                    <div className="space-y-2">
                      <div
                        className={`w-16 h-20 mx-auto rounded-lg overflow-hidden border-2 ${
                          finalOutcome === "Masterball"
                            ? "border-purple-500 shadow-lg shadow-purple-500/50"
                            : finalOutcome === "Ultraball"
                              ? "border-yellow-500 shadow-lg shadow-yellow-500/50"
                              : finalOutcome === "Greatball"
                                ? "border-blue-500 shadow-lg shadow-blue-500/50"
                                : "border-red-500 shadow-lg shadow-red-500/50"
                        }`}
                      >
                        <PackImage
                          packType={finalOutcome?.toLowerCase() || "pokeball"}
                          size="large"
                        />
                      </div>
                      <h4 className="font-bold text-xl text-white">
                        Pack Assigned!
                      </h4>
                      <p className="text-green-400 font-medium">
                        {finalOutcome} Pack added to "My Packs"
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
            {/* Credit Balance Display */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg p-2 border border-green-200 dark:border-green-700">
              <div className="flex items-center justify-center space-x-1">
                <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span
                  className="text-sm font-semibold text-green-600 dark:text-green-400"
                  data-testid="text-credit-balance"
                >
                  Your Credits: {isCreditsLoading ? "Loading..." : (userCredits && typeof userCredits === 'object' && 'credits' in userCredits ? Number((userCredits as any).credits).toFixed(2) : "0.00")}
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg p-2 border border-blue-200 dark:border-blue-700">
              <div className="flex items-center justify-center space-x-1">
                <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span
                  className="text-sm font-semibold text-blue-600 dark:text-blue-400"
                  data-testid="text-game-cost"
                >
                  Cost: {fixedPrice} credits per play
                </span>
              </div>
            </div>

            <Button
              onClick={handlePlay}
              disabled={isPlaying || playGameMutation.isPending || deductCreditsMutation.isPending}
              className="w-full bg-gradient-to-r from-primary to-accent hover:glow-effect transition-all text-lg py-6"
              data-testid="button-play-plinko"
            >
              {isPlaying || playGameMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Ball Dropping...
                </>
              ) : deductCreditsMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Starting Game...
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

      {/* Pack Tiers Display */}
      <Card className="gaming-card">
        <CardContent className="p-6">
          <h4 className="font-semibold mb-4">Pack Tiers</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center space-y-2">
              <div className="w-16 h-20 mx-auto rounded-lg overflow-hidden border-2 border-red-500 shadow-lg shadow-red-500/50">
                <PackImage packType="pokeball" size="large" />
              </div>
              <div>
                <p className="font-semibold text-red-400">Pokeball</p>
                <p className="text-xs text-muted-foreground">Most Common</p>
              </div>
            </div>
            <div className="text-center space-y-2">
              <div className="w-16 h-20 mx-auto rounded-lg overflow-hidden border-2 border-blue-500 shadow-lg shadow-blue-500/50">
                <PackImage packType="greatball" size="large" />
              </div>
              <div>
                <p className="font-semibold text-blue-400">Great Ball</p>
                <p className="text-xs text-muted-foreground">Uncommon</p>
              </div>
            </div>
            <div className="text-center space-y-2">
              <div className="w-16 h-20 mx-auto rounded-lg overflow-hidden border-2 border-yellow-500 shadow-lg shadow-yellow-500/50">
                <PackImage packType="ultraball" size="large" />
              </div>
              <div>
                <p className="font-semibold text-yellow-400">Ultra Ball</p>
                <p className="text-xs text-muted-foreground">Rare</p>
              </div>
            </div>
            <div className="text-center space-y-2">
              <div className="w-16 h-20 mx-auto rounded-lg overflow-hidden border-2 border-purple-500 shadow-lg shadow-purple-500/50">
                <PackImage packType="masterball" size="large" />
              </div>
              <div>
                <p className="font-semibold text-purple-400">Master Ball</p>
                <p className="text-xs text-muted-foreground">Legendary</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
