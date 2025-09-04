import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Package, Sparkles, Coins } from "lucide-react";
import type { Pack } from "@shared/schema";

interface PackOpeningProps {
  packs: Pack[];
}

interface GameResult {
  success: boolean;
  result: {
    cardId: string;
    tier: string;
    gameType: string;
  };
  sessionId: string;
}

export function PackOpening({ packs }: PackOpeningProps) {
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [animationPhase, setAnimationPhase] = useState<"closed" | "opening" | "opened">("closed");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const activePacks = packs.filter(pack => pack.isActive);
  const bnwPacks = activePacks.filter(pack => pack.type === "BNW");

  const playGameMutation = useMutation({
    mutationFn: async (data: { gameType: string; betAmount: string }) => {
      const response = await apiRequest("POST", "/api/games/play", data);
      return await response.json() as GameResult;
    },
    onSuccess: (result) => {
      // Start opening animation
      setAnimationPhase("opening");
      
      setTimeout(() => {
        setAnimationPhase("opened");
        setLastResult(result);
        
        queryClient.invalidateQueries(["/api/auth/user"]);
        queryClient.invalidateQueries(["/api/vault"]);
        
        const tierNames = {
          C: "Common",
          UC: "Uncommon",
          R: "Rare",
          SR: "Super Rare", 
          SSS: "Legendary"
        };

        toast({
          title: "Pack Opened!",
          description: `You got a ${tierNames[result.result.tier as keyof typeof tierNames]} card!`,
          duration: 5000,
        });
      }, 2000);
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

  const handleOpenPack = (pack: Pack) => {
    setSelectedPack(pack);
    setIsOpening(true);
    setLastResult(null);
    setAnimationPhase("closed");
    
    playGameMutation.mutate({
      gameType: "pack",
      betAmount: pack.price,
    });
  };

  const resetPack = () => {
    setAnimationPhase("closed");
    setLastResult(null);
    setSelectedPack(null);
  };

  const tierColors = {
    C: "common",
    UC: "uncommon",
    R: "rare",
    SR: "superrare",
    SSS: "legendary"
  };

  return (
    <div className="space-y-6">
      {/* Pack Selection */}
      {!selectedPack && (
        <div className="grid md:grid-cols-2 gap-6">
          {bnwPacks.length > 0 ? (
            bnwPacks.map((pack) => (
              <Card key={pack.id} className="gaming-card hover:glow-effect transition-all transform hover:scale-105">
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="w-full h-48 rounded-lg mb-6 overflow-hidden bg-gradient-to-br from-purple-600/20 to-pink-600/20 relative flex items-center justify-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-superrare to-legendary rounded-lg flex items-center justify-center">
                        <Package className="w-10 h-10 text-white" />
                      </div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <Badge className="bg-primary text-primary-foreground">
                          {pack.type} Pack
                        </Badge>
                      </div>
                    </div>
                    
                    <h3 className="font-gaming font-bold text-xl mb-3 text-superrare">
                      {pack.name}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      10 cards total: 9 bulk cards + 1 special guaranteed!
                    </p>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Pack price:</span>
                        <span className="font-semibold text-accent">{pack.price} Credits</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Cards per pack:</span>
                        <span className="font-semibold text-legendary">10 Total</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Special guarantee:</span>
                        <span className="font-semibold text-superrare">1 Rare+</span>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => handleOpenPack(pack)}
                      disabled={isOpening}
                      className="w-full bg-gradient-to-r from-superrare to-legendary hover:glow-effect transition-all"
                      data-testid={`button-open-pack-${pack.id}`}
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Open Pack ({pack.price} Credits)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="gaming-card col-span-2">
              <CardContent className="p-12 text-center">
                <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Packs Available</h3>
                <p className="text-muted-foreground">
                  BNW packs are currently out of stock. Check back later!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Pack Opening Animation */}
      {selectedPack && (
        <Card className="gaming-card">
          <CardContent className="p-8">
            <div className="text-center">
              <h3 className="font-gaming font-bold text-2xl mb-6">
                Opening {selectedPack.name}...
              </h3>
              
              <div className="relative mb-8">
                {animationPhase === "closed" && (
                  <div className="w-48 h-64 mx-auto bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center transform hover:scale-105 transition-transform">
                    <Package className="w-24 h-24 text-white" />
                  </div>
                )}
                
                {animationPhase === "opening" && (
                  <div className="w-48 h-64 mx-auto bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center animate-pulse">
                    <div className="relative">
                      <Package className="w-24 h-24 text-white animate-bounce" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-yellow-300 animate-spin" />
                      </div>
                    </div>
                  </div>
                )}
                
                {animationPhase === "opened" && lastResult && (
                  <div className="space-y-4">
                    <div className={`w-48 h-64 mx-auto rounded-lg flex items-center justify-center tier-glow-${tierColors[lastResult.result.tier as keyof typeof tierColors]} animate-card-flip`}>
                      <div className={`w-32 h-32 rounded-full bg-${tierColors[lastResult.result.tier as keyof typeof tierColors]}/30 flex items-center justify-center`}>
                        <span className={`text-4xl font-bold tier-${tierColors[lastResult.result.tier as keyof typeof tierColors]}`}>
                          {lastResult.result.tier}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <Badge className={`bg-${tierColors[lastResult.result.tier as keyof typeof tierColors]}/90 text-white text-lg px-4 py-2`}>
                        {lastResult.result.tier} Tier Card
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
              
              {animationPhase === "opening" && (
                <div className="space-y-2">
                  <div className="text-lg font-semibold text-accent">
                    Opening pack...
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Revealing your cards...
                  </div>
                </div>
              )}
              
              {animationPhase === "opened" && (
                <div className="space-y-4">
                  <Button
                    onClick={resetPack}
                    className="bg-gradient-to-r from-primary to-accent"
                    data-testid="button-open-another-pack"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Open Another Pack
                  </Button>
                  
                  <div className="text-sm text-muted-foreground">
                    Card has been added to your vault!
                  </div>

                  {/* Available Credits Bar */}
                  <Card className="gaming-card bg-gradient-to-r from-accent/10 to-primary/10 border-accent/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-center gap-3">
                        <Coins className="w-5 h-5 text-accent" />
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Available Credits</div>
                          <div className="text-xl font-bold text-accent" data-testid="text-available-credits">
                            {(user as any)?.credits || "0.00"}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pack Info */}
      <Card className="gaming-card">
        <CardContent className="p-6">
          <h4 className="font-semibold mb-4">About Virtual Packs</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Each pack contains 10 cards total</p>
            <p>• 9 bulk cards are automatically refunded at 0.01 credits each</p>
            <p>• 1 special card (Common to Legendary) goes to your vault</p>
            <p>• Currently only Black & White (BNW) packs available</p>
            <p>• More pack types coming soon!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
