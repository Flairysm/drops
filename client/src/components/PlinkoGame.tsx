import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Play, Package, DollarSign, X, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import classicPack from "/assets/classic-image.png";

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
const BOARD_HEIGHT = 600;
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
      case 'pokeball':
        return "/assets/pokeball.png";
      case 'greatball':
        return "/assets/greatball.png";
      case 'ultraball':
        return "/assets/ultraball.png";
      case 'masterball':
        return "/assets/masterball.png";
      default:
        return "/assets/pokeball.png";
    }
  };

  const imageSize = size === "small" ? "w-8 h-10" : "w-16 h-20";

  return (
    <div className={`${imageSize} mx-auto flex items-center justify-center`}>
      <img
        src={getPackImage(packType)}
        alt={`${packType} pack`}
        className="w-full h-full object-contain pixel-crisp"
        style={{ imageRendering: "pixelated" }}
        onError={(e) => {
          console.error('Pack image failed to load:', getPackImage(packType));
          e.currentTarget.src = "/assets/pokeball.png";
        }}
      />
    </div>
  );
};

export function PlinkoGame() {
  const [fixedPrice, setFixedPrice] = useState("300");
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [finalOutcome, setFinalOutcome] = useState<string | null>(null);
  const [showPackAssigned, setShowPackAssigned] = useState(false);
  const [showGameOverPopup, setShowGameOverPopup] = useState(false);
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

  // Fixed price is always 300 credits for Plinko

  // Get reward tier based on outcome
  const getRewardTier = (outcome: string) => {
    switch (outcome) {
      case "Masterball":
        return { tier: "masterball", name: "Masterball" };
      case "Ultraball":
        return { tier: "ultraball", name: "Ultraball" };
      case "Greatball":
        return { tier: "greatball", name: "Greatball" };
      case "Pokeball":
      default:
        return { tier: "pokeball", name: "Pokeball" };
    }
  };

  // Credit deduction mutation for Plinko
  const deductCreditsMutation = useMutation({
    mutationFn: async () => {
      console.log("Deducting credits for Plinko:", fixedPrice);
      
      // Prevent double deduction by checking if already playing
      if (isPlaying) {
        console.log("Game already in progress, skipping credit deduction");
        return { success: true, alreadyPlaying: true };
      }
      
      const response = await apiRequest("POST", "/api/credits/deduct", {
        amount: fixedPrice,
        reason: "plinko_game",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to deduct credits");
      }
      
      return await response.json();
    },
    onSuccess: (result) => {
      // Only proceed if this is a new game (not already playing)
      if (result.alreadyPlaying) {
        console.log("Game already in progress, not starting new one");
        return;
      }
      
      console.log("Credits deducted successfully, starting Plinko game");
      
      // Credits deducted successfully, start the game
      console.log("Starting game, setting isPlaying=true, animationComplete=false");
      setIsPlaying(true);
      setAnimationComplete(false);
      setFinalOutcome(null);
      setLastResult(null);
      setShowGameOverPopup(false);

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
      return await response.json() as GameResult;
    },
    onSuccess: (result) => {
      setLastResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vault"] });
      queryClient.invalidateQueries({ queryKey: ["/api/packs"] });

      console.log("Plinko pack assignment successful:", result);
      
      // Show game over popup after successful pack assignment
      setShowGameOverPopup(true);
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
    const y = BOARD_HEIGHT + 20;

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

    console.log("Starting Plinko animation");

    // Create ball at the top center
    const ball: Ball = {
      x: BOARD_WIDTH / 2 + (Math.random() - 0.5) * 20, // Small random variation
      y: 30, // Start position
      vx: (Math.random() - 0.5) * 0.1, // Small horizontal velocity
      vy: 0, // Start with no vertical velocity
      radius: BALL_RADIUS,
      color: "#00d4ff",
    };

    ballRef.current = ball;
    console.log("Ball created:", ball);
    const pins = getPins();
    const outcomePositions = getOutcomePositions();

    const animate = () => {
      const ball = ballRef.current;
      if (!ball) return;

      // Clear canvas
      ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

      // Draw background
      const gradient = ctx.createLinearGradient(0, 0, 0, BOARD_HEIGHT);
      gradient.addColorStop(0, "rgba(59, 130, 246, 0.1)");
      gradient.addColorStop(1, "rgba(147, 51, 234, 0.1)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

      // Draw pins
      pins.forEach((pin) => {
        ctx.beginPath();
        ctx.arc(pin.x, pin.y, PIN_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "#e2e8f0";
        ctx.fill();
        ctx.strokeStyle = "#64748b";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Draw buckets
      outcomePositions.forEach((pos, index) => {
        const bucketWidth = BOARD_WIDTH / OUTCOMES.length;
        const bucketX = index * bucketWidth;

        // Bucket background
        ctx.fillStyle = pos.outcome === "Masterball" ? "rgba(139, 92, 246, 0.2)" :
                       pos.outcome === "Ultraball" ? "rgba(255, 215, 0, 0.2)" :
                       pos.outcome === "Greatball" ? "rgba(59, 130, 246, 0.2)" :
                       "rgba(148, 163, 184, 0.2)";
        ctx.fillRect(bucketX, BOARD_HEIGHT - 160, bucketWidth, 80);

        // Bucket border
        ctx.strokeStyle = pos.outcome === "Masterball" ? "rgba(139, 92, 246, 0.6)" :
                         pos.outcome === "Ultraball" ? "rgba(255, 215, 0, 0.6)" :
                         pos.outcome === "Greatball" ? "rgba(59, 130, 246, 0.6)" :
                         "rgba(148, 163, 184, 0.6)";
        ctx.lineWidth = 2;
        ctx.strokeRect(bucketX, BOARD_HEIGHT - 160, bucketWidth, 80);
      });

      // Ball physics
      if (ball.y < BOARD_HEIGHT - 200) { // Stop physics when ball reaches bucket area
        // Apply gravity
        ball.vy += GRAVITY;

        // Apply movement
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Collision with pins
        pins.forEach((pin) => {
          const dx = ball.x - pin.x;
          const dy = ball.y - pin.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = ball.radius + PIN_RADIUS;

          if (distance < minDistance && distance > 0) {
            // Separate ball from pin
            const separation = minDistance - distance;
            const nx = dx / distance;
            const ny = dy / distance;
            ball.x += nx * separation;
            ball.y += ny * separation;

            // Bounce physics
            const dotProduct = ball.vx * nx + ball.vy * ny;
            if (dotProduct < 0) {
              ball.vx -= 2 * dotProduct * nx * RESTITUTION;
              ball.vy -= 2 * dotProduct * ny * RESTITUTION;
              ball.vx *= FRICTION;
              ball.vy *= FRICTION;
            }
          }
        });

        // Wall collisions
        if (ball.x < ball.radius) {
          ball.x = ball.radius;
          ball.vx = Math.abs(ball.vx) * RESTITUTION;
        }
        if (ball.x > BOARD_WIDTH - ball.radius) {
          ball.x = BOARD_WIDTH - ball.radius;
          ball.vx = -Math.abs(ball.vx) * RESTITUTION;
        }

        // Air resistance
        ball.vx *= 0.998;
        ball.vy *= 0.998;
      } else {
        // Ball has reached the bucket area
        console.log("Ball reached bucket area, animationComplete:", animationComplete);
        if (!animationComplete) {
          // Determine which bucket the ball landed in
          const bucketWidth = BOARD_WIDTH / OUTCOMES.length;
          const bucketIndex = Math.floor(ball.x / bucketWidth);
          const clampedIndex = Math.max(0, Math.min(OUTCOMES.length - 1, bucketIndex));
          
          // Position ball in the center of the bucket
          const bucketCenter = clampedIndex * bucketWidth + bucketWidth / 2;
          ball.x = bucketCenter;
          ball.y = BOARD_HEIGHT - 120; // Position inside bucket
          ball.vx = 0;
          ball.vy = 0;

          console.log(`Ball landed in bucket ${clampedIndex}, outcome: ${OUTCOMES[clampedIndex]}`);
          
          setAnimationComplete(true);
          setIsPlaying(false);

          const actualOutcome = OUTCOMES[clampedIndex];
          setFinalOutcome(actualOutcome);

          // Send result to backend - popup will show after API success
          playGameMutation.mutate({
            gameType: 'plinko',
            betAmount: fixedPrice.toString(),
            plinkoResult: actualOutcome,
          });
        }
      }

      // Draw ball
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = ball.color;
      ctx.fill();
      ctx.strokeStyle = "#0ea5e9";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Continue animation if ball hasn't reached bucket area
      if (ball.y < BOARD_HEIGHT - 200 && !animationComplete) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();
  };

  const handlePlay = () => {
    console.log("Plinko play button clicked. Fixed price:", fixedPrice);
    
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

    // Draw pins with enhanced styling
    pins.forEach((pin) => {
      // Pin shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.beginPath();
      ctx.arc(pin.x + 1, pin.y + 1, PIN_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      
      // Pin gradient
      const gradient = ctx.createRadialGradient(pin.x, pin.y, 0, pin.x, pin.y, PIN_RADIUS);
      gradient.addColorStop(0, "#fbbf24");
      gradient.addColorStop(0.7, "#f59e0b");
      gradient.addColorStop(1, "#d97706");
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(pin.x, pin.y, PIN_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      
      // Pin highlight
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw outcome buckets
    outcomePositions.forEach((pos, index) => {
      const bucketWidth = BOARD_WIDTH / OUTCOMES.length;
      const bucketX = index * bucketWidth;

      // Bucket gradient background - moved up more
      const bucketGradient = ctx.createLinearGradient(bucketX, BOARD_HEIGHT - 160, bucketX, BOARD_HEIGHT - 80);
      bucketGradient.addColorStop(0, 
        pos.outcome === "Masterball"
          ? "rgba(139, 92, 246, 0.3)"
          : pos.outcome === "Ultraball"
            ? "rgba(255, 215, 0, 0.3)"
            : pos.outcome === "Greatball"
              ? "rgba(59, 130, 246, 0.3)"
              : "rgba(239, 68, 68, 0.3)"
      );
      bucketGradient.addColorStop(1, 
        pos.outcome === "Masterball"
          ? "rgba(139, 92, 246, 0.1)"
          : pos.outcome === "Ultraball"
            ? "rgba(255, 215, 0, 0.1)"
            : pos.outcome === "Greatball"
              ? "rgba(59, 130, 246, 0.1)"
              : "rgba(239, 68, 68, 0.1)"
      );
      ctx.fillStyle = bucketGradient;
      ctx.fillRect(bucketX, BOARD_HEIGHT - 160, bucketWidth, 80);

      // Bucket border with glow - moved up more
      ctx.strokeStyle =
        pos.outcome === "Masterball"
          ? "#8b5cf6"
          : pos.outcome === "Ultraball"
            ? "#ffd700"
            : pos.outcome === "Greatball"
              ? "#3b82f6"
              : "#ef4444";
      ctx.lineWidth = 3;
      ctx.strokeRect(bucketX, BOARD_HEIGHT - 160, bucketWidth, 80);
      
      // Inner border highlight - moved up more
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(bucketX + 1, BOARD_HEIGHT - 159, bucketWidth - 2, 78);

      // Pack images are now displayed as overlay, no need to draw on canvas
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
      <Card className="gaming-card mb-6 sm:mb-8 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-purple-500/30 shadow-2xl shadow-purple-500/20">
        <CardHeader className="text-center px-4 sm:px-6">
          <CardTitle className="font-gaming text-xl sm:text-2xl text-white mb-4">
            <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
              Game Board
            </span>
          </CardTitle>
          
          {/* Instruction Message */}
          <div className="bg-gradient-to-r from-purple-800/30 to-blue-800/30 rounded-lg p-4 border border-purple-500/50 mb-4 backdrop-blur-sm">
            <p className="text-white text-sm sm:text-base px-2 font-medium">
              {isPlaying 
                ? "Ball is dropping through the pins..."
                : "Click 'Drop Ball' to start the game and watch it bounce through the pegs!"
              }
            </p>
          </div>

        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="flex justify-center">
            <div className="relative w-full max-w-[600px]">
              {/* Animated background particles */}
              <div className="absolute inset-0 overflow-hidden rounded-xl">
                <div className="absolute top-4 left-4 w-2 h-2 bg-yellow-400/30 rounded-full animate-pulse"></div>
                <div className="absolute top-8 right-8 w-1 h-1 bg-purple-400/40 rounded-full animate-ping"></div>
                <div className="absolute top-16 left-1/3 w-1.5 h-1.5 bg-blue-400/30 rounded-full animate-pulse"></div>
                <div className="absolute top-12 right-1/4 w-1 h-1 bg-orange-400/40 rounded-full animate-ping"></div>
                <div className="absolute top-20 left-2/3 w-2 h-2 bg-pink-400/30 rounded-full animate-pulse"></div>
              </div>
              <canvas
                ref={canvasRef}
                width={BOARD_WIDTH}
                height={BOARD_HEIGHT}
                className="border-2 border-purple-500/50 rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 w-full h-auto max-w-full shadow-2xl shadow-purple-500/20"
                style={{ maxWidth: "100%", height: "auto" }}
              />

              {/* Pack Images Overlay */}
              <div className="absolute bottom-14 left-0 right-0 flex justify-center" style={{ transform: 'translateY(2.1px)' }}>
                <div className="flex justify-center w-full max-w-[600px] px-0">
                  {OUTCOMES.map((outcome, index) => (
                    <div key={index} className="flex flex-col items-center justify-center" style={{ 
                      width: `${100/OUTCOMES.length}%`,
                      marginLeft: index > 0 ? '-0.65px' : '0px'
                    }}>
                      <div className="w-16 h-20 flex items-center justify-center" style={{ 
                        transform: `scale(1.796875) ${outcome === 'Ultraball' && index === 2 ? 'translateX(2px)' : ''}` 
                      }}>
                        <PackImage
                          packType={outcome.toLowerCase()}
                          size="small"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game Controls */}
      <div className="flex flex-col sm:flex-row justify-center items-center space-y-3 sm:space-y-0 sm:space-x-4 mb-6 sm:mb-8">
        <Button
          onClick={handlePlay}
          className="w-full sm:w-auto px-6 sm:px-8 py-3 text-base sm:text-sm bg-green-600 hover:bg-green-700 text-white border-2 border-green-500 hover:border-green-400 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          disabled={isPlaying || playGameMutation.isPending || deductCreditsMutation.isPending}
          data-testid="button-play-plinko"
        >
          {isPlaying || playGameMutation.isPending ? (
            <>
              <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
              <span className="hidden sm:inline">Ball Dropping...</span>
              <span className="sm:hidden">Dropping...</span>
            </>
          ) : deductCreditsMutation.isPending ? (
            <>
              <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
              <span className="hidden sm:inline">Processing...</span>
              <span className="sm:hidden">Processing</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Drop Ball</span>
              <span className="sm:hidden">Drop Ball</span>
              <Badge variant="secondary" className="ml-2 bg-yellow-500/20 text-yellow-400 border-yellow-400/30">
                {fixedPrice} Credits
              </Badge>
            </>
          )}
        </Button>
        
        <Button
          onClick={() => window.location.href = '/play'}
          variant="ghost"
          className="w-full sm:w-auto px-6 sm:px-8 py-3 text-base sm:text-sm text-gray-400 hover:text-white hover:bg-gray-800/60 transition-all duration-300 border border-transparent hover:border-gray-600/30"
        >
          <X className="w-4 h-4 mr-2" />
          Back to Games
        </Button>
      </div>

      {/* Pack Rewards Info */}
      <Card className="gaming-card mb-6 sm:mb-8 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-purple-500/30 shadow-2xl shadow-purple-500/20">
        <CardHeader className="text-center px-4 sm:px-6 pb-4">
          <CardTitle className="font-gaming text-xl sm:text-2xl text-white mb-2">
            <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
              Pack Rewards
            </span>
          </CardTitle>
          <p className="text-white text-sm font-medium">
            Drop balls to win amazing packs!
          </p>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {[
              { tier: "pokeball", name: "Pokeball", color: "from-red-500 to-red-600", bgColor: "bg-red-500/10", borderColor: "border-red-500/30", image: "/assets/pokeball.png" },
              { tier: "greatball", name: "Greatball", color: "from-blue-500 to-blue-600", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30", image: "/assets/greatball.png" },
              { tier: "ultraball", name: "Ultraball", color: "from-yellow-500 to-orange-500", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30", image: "/assets/ultraball.png" },
              { tier: "masterball", name: "Masterball", color: "from-purple-500 to-purple-600", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30", image: "/assets/masterball.png" },
            ].map((reward) => (
              <div key={reward.tier} className={`text-center p-4 sm:p-5 rounded-lg border-2 ${reward.bgColor} ${reward.borderColor} transition-all duration-300 hover:scale-105 hover:shadow-xl`}>
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24">
                      <img 
                        src={reward.image} 
                        alt={reward.name}
                        className="w-full h-full object-cover drop-shadow-lg"
                        onError={(e) => {
                          console.error('Pack reward image failed to load:', reward.image, 'for', reward.name);
                        }}
                      />
                    </div>
                  </div>
                  <div className="font-bold text-base sm:text-lg text-white mb-2">{reward.name}</div>
                  <div className="text-sm text-gray-200 font-medium">
                    {reward.tier === 'pokeball' ? 'Common' : reward.tier === 'greatball' ? 'Uncommon' : reward.tier === 'ultraball' ? 'Rare' : 'Legendary'}
                  </div>
                </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Game Over Popup */}
      <AnimatePresence>
        {showGameOverPopup && finalOutcome && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-600 rounded-xl p-8 max-w-lg w-full shadow-2xl"
            >
              <div className="text-center space-y-6">
                {/* Header */}
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-white tracking-wide">
                    GAME OVER
                  </h2>
                  <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
                </div>
                
                {/* Pack Image */}
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="w-24 h-24 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl border-2 border-gray-600 flex items-center justify-center shadow-lg">
                      <img 
                        src={`/assets/${getRewardTier(finalOutcome).tier}.png`}
                        alt={`${getRewardTier(finalOutcome).name} Pack`}
                        className="w-16 h-16 object-cover"
                        onError={(e) => {
                          console.error('Pack image failed to load:', `/assets/${getRewardTier(finalOutcome).tier}.png`);
                          e.currentTarget.src = "/assets/pokeball.png";
                        }}
                      />
                    </div>
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-xl blur-sm -z-10"></div>
                  </div>
                </div>
                
                {/* Content */}
                <div className="space-y-3">
                  <p className="text-xl text-gray-200">
                    You have won a <span className="font-bold text-green-400">{getRewardTier(finalOutcome).name}</span> pack!
                  </p>
                  
                  <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                    <p className="text-sm text-gray-300">
                      Go to My Packs to open it
                    </p>
                    <p className="text-sm text-gray-300">
                      Click Drop Ball for a new game
                    </p>
                  </div>
                </div>
                
                {/* Button */}
                <Button
                  onClick={() => {
                    setShowGameOverPopup(false);
                    setIsPlaying(false);
                    setFinalOutcome(null);
                    setAnimationComplete(false);
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  OK
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
