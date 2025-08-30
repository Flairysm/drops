import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Package, Sparkles, Star, Coins } from "lucide-react";
import type { Card as CardType } from "@shared/schema";

interface VirtualPackOpeningProps {
  packId: string;
  packName: string;
  onClose: () => void;
}

interface VirtualPackResult {
  success: boolean;
  cards: Array<{
    id: string;
    name: string;
    tier: string;
    marketValue: string;
    packType: string;
  }>;
  packName: string;
}

const tierColors = {
  D: "gray",
  C: "green", 
  B: "blue",
  A: "purple",
  S: "yellow",
  SS: "orange",
  SSS: "red"
} as const;

const tierNames = {
  D: "D-Tier",
  C: "C-Tier", 
  B: "B-Tier",
  A: "A-Tier",
  S: "S-Tier",
  SS: "SS-Tier",
  SSS: "SSS-Tier"
} as const;

export function VirtualPackOpening({ packId, packName, onClose }: VirtualPackOpeningProps) {
  const [isOpening, setIsOpening] = useState(false);
  const [result, setResult] = useState<VirtualPackResult | null>(null);
  const [animationPhase, setAnimationPhase] = useState<"closed" | "opening" | "opened">("closed");
  const [revealedCards, setRevealedCards] = useState<number>(0);
  const [hitCardRevealed, setHitCardRevealed] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user data for credits display
  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const openPackMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/virtual-packs/${packId}/open`);
      return await response.json() as VirtualPackResult;
    },
    onSuccess: (result) => {
      setResult(result);
      setAnimationPhase("opening");
      
      // Reveal first 7 cards quickly, then pause for hit card (don't auto-reveal)
      result.cards.forEach((_, index) => {
        if (index < 7) {
          // Reveal commons quickly
          setTimeout(() => {
            setRevealedCards(index + 1);
          }, 500 + (index * 100));
        }
        // Hit card (index 7) will be revealed by user tap, not auto-revealed
      });

      // Wait for commons to be revealed, then show "tap to reveal" for hit card
      setTimeout(() => {
        // Don't auto-transition to "opened" - wait for user to reveal hit card
        toast({
          title: "Commons Revealed!",
          description: `Tap the hit card to reveal your special card!`,
          duration: 4000,
        });
      }, 500 + (7 * 100) + 500); // Wait for 7 commons + small delay
    },
    onError: (error: Error) => {
      toast({
        title: "Pack Opening Error",
        description: error.message,
        variant: "destructive",
      });
      setAnimationPhase("closed");
    },
    onSettled: () => {
      setIsOpening(false);
    },
  });

  const handleOpenPack = () => {
    setIsOpening(true);
    setResult(null);
    setRevealedCards(0);
    openPackMutation.mutate();
  };

  const handleReset = () => {
    setAnimationPhase("closed");
    setResult(null);
    setRevealedCards(0);
    setHitCardRevealed(false);
    setIsOpening(false);
  };

  const handleRevealHitCard = () => {
    setHitCardRevealed(true);
    if (result) {
      const hitCard = result.cards[result.cards.length - 1];
      const tier = hitCard ? hitCard.tier : "D";
      const tierName = tier ? tierNames[tier as keyof typeof tierNames] : "Common";
      
      toast({
        title: "Hit Card Revealed!",
        description: `You got a ${tierName}!`,
        duration: 3000,
      });

      // Transition to opened state after hit card is revealed
      setTimeout(() => {
        setAnimationPhase("opened");
        
        toast({
          title: "Pack Opened!",
          description: `${packName} opened! You got ${result.cards.length} cards including a ${tierName} hit card!`,
          duration: 5000,
        });

        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        queryClient.invalidateQueries({ queryKey: ["/api/vault"] });
      }, 1500);
    }
  };

  if (animationPhase === "opened" && result) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="font-gaming text-2xl mb-2">Pack Opened!</h3>
          <p className="text-muted-foreground">Your new cards have been added to your vault</p>
        </div>

        <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
          {result.cards.map((card, index) => (
            <div 
              key={`${card.id}-${index}`}
              className={`relative overflow-hidden rounded-lg border-2 border-${tierColors[(card.tier) as keyof typeof tierColors]}/50 bg-gradient-to-b from-${tierColors[(card.tier) as keyof typeof tierColors]}/20 to-transparent aspect-[2.5/3.5]`}
              data-testid={`card-result-${index}`}
            >
              <div className="p-2 text-center h-full flex flex-col justify-between">
                <div className={`w-6 h-6 rounded-full bg-${tierColors[(card.tier) as keyof typeof tierColors]}/30 mx-auto flex items-center justify-center`}>
                  <span className={`text-xs font-bold tier-${tierColors[(card.tier) as keyof typeof tierColors]}`}>
                    {card.tier}
                  </span>
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <div className="text-xs font-semibold mb-1 line-clamp-2">{card.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {parseFloat(card.marketValue || '0').toFixed(2)} credits
                  </div>
                </div>
                {(card.tier) !== "D" && (
                  <div className="absolute top-1 right-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center space-x-4">
          <Button onClick={handleReset} variant="outline" data-testid="button-open-another">
            Open Another Pack
          </Button>
          <Button onClick={onClose} data-testid="button-close-opening">
            Back to Store
          </Button>
        </div>

        {/* Available Credits Bar */}
        <Card className="gaming-card bg-gradient-to-r from-accent/10 to-primary/10 border-accent/20 max-w-xs mx-auto">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-3">
              <Coins className="w-5 h-5 text-accent" />
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Available Credits</div>
                <div className="text-xl font-bold text-accent" data-testid="text-available-credits">
                  {parseFloat((user as any)?.credits || '0').toFixed(2)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (animationPhase === "opening" && result) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="font-gaming text-2xl mb-2">Opening {packName}...</h3>
          <div className="animate-pulse">
            <Package className="w-16 h-16 mx-auto text-primary" />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
          {result.cards.map((card, index) => {
            const isHitCard = index === result.cards.length - 1;
            const isRevealed = isHitCard ? hitCardRevealed : index < revealedCards;
            const canReveal = isHitCard && revealedCards >= 7 && !hitCardRevealed;
            
            return (
            <div 
              key={`${card.id}-${index}`}
              className={`relative transition-all duration-500 aspect-[2.5/3.5] ${
                isRevealed
                  ? `opacity-100 transform scale-100 border-2 border-${tierColors[(card.tier) as keyof typeof tierColors]}/50 bg-gradient-to-b from-${tierColors[(card.tier) as keyof typeof tierColors]}/20 to-transparent ${
                      isHitCard ? 'animate-pulse shadow-lg ring-2 ring-yellow-400' : ''
                    }` 
                  : canReveal
                  ? "opacity-100 transform scale-100 border-2 border-yellow-400 bg-gradient-to-b from-yellow-400/20 to-transparent cursor-pointer hover:scale-105 animate-pulse"
                  : "opacity-30 transform scale-95 border-2 border-gray-300 bg-gray-100"
              } overflow-hidden rounded-lg`}
              data-testid={`card-reveal-${index}`}
              onClick={canReveal ? handleRevealHitCard : undefined}
            >
              <div className="p-2 text-center h-full flex flex-col justify-between">
                {isRevealed ? (
                  <>
                    <div className={`w-4 h-4 rounded-full bg-${tierColors[(card.tier) as keyof typeof tierColors]}/30 mx-auto flex items-center justify-center`}>
                      <span className={`text-xs font-bold tier-${tierColors[(card.tier) as keyof typeof tierColors]}`}>
                        {card.tier}
                      </span>
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="text-xs font-semibold mb-1 line-clamp-2 leading-tight">{card.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {parseFloat(card.marketValue || '0').toFixed(2)}c
                      </div>
                    </div>
                    {isHitCard && (
                      <div className="absolute top-1 right-1 animate-bounce">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <Package className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                      <div className="text-xs text-gray-400">
                        {canReveal ? "TAP!" : isHitCard ? "HIT!" : "???"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>

        <div className="text-center">
          <div className="animate-pulse text-sm text-muted-foreground">
            Revealing cards... {revealedCards}/{result.cards.length}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="font-gaming text-2xl mb-4">
          Open {packName || 'Pack'}
        </h3>
        
        {/* Credits Display */}
        {user && (user as any).credits !== undefined && (
          <div className="max-w-xs mx-auto mb-4">
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-3 border border-primary/20">
              <div className="text-sm text-muted-foreground">Available Credits</div>
              <div className="text-2xl font-bold text-primary">
                {parseFloat((user as any).credits || '0').toFixed(2)}
              </div>
            </div>
          </div>
        )}
        
        <div className="inline-block">
          <div className="relative">
            <Package className="w-32 h-32 text-primary mx-auto" />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-legendary/20 rounded-full animate-pulse"></div>
          </div>
        </div>
        <p className="text-muted-foreground mt-4">
          Click to open your themed pack and reveal your cards!
        </p>
      </div>

      <div className="text-center space-y-2">
        <div className="flex justify-center space-x-2 mb-4">
          <Badge className="bg-accent text-primary-foreground">7 Random Commons</Badge>
          <Badge className="bg-legendary text-primary-foreground">1 Special Card</Badge>
        </div>
        
        <Button
          onClick={handleOpenPack}
          disabled={isOpening}
          size="lg"
          className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
          data-testid="button-open-virtual-pack"
        >
          {isOpening ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
              Opening Pack...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Open Pack
            </>
          )}
        </Button>
      </div>
    </div>
  );
}