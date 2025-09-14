import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Star, Package, Loader2 } from "lucide-react";
// import hitCardImage from "@assets/ChatGPT Image Aug 31, 2025, 11_19_51 AM_1756610395060.png";
const hitCardImage = "/assets/ChatGPT Image Aug 31, 2025, 11_19_51 AM_1756610395060.png";

interface ClassicPackResult {
  success: boolean;
  cards: Array<{
    id: string;
    name: string;
    tier: string;
    imageUrl?: string;
    marketValue: string;
  }>;
  totalValue: string;
  packName: string;
}

interface ClassicPackOpeningAnimationProps {
  result: ClassicPackResult;
  onClose: () => void;
  packPrice: number;
  onOpenAgain: () => void;
  isOpeningAgain?: boolean;
}

// Tier color system (matching mystery packs)
const tierColors = {
  D: "gray",
  C: "green", 
  B: "cyan",
  A: "pink",
  S: "yellow",
  SS: "orange",
  SSS: "red"
};

const getTierColor = (tier: string) => {
  const colors = {
    D: "bg-gray-500",
    C: "bg-green-500", 
    B: "bg-cyan-500",
    A: "bg-pink-500",
    S: "bg-yellow-500",
    SS: "bg-orange-500",
    SSS: "bg-red-500"
  };
  return colors[tier as keyof typeof colors] || "bg-gray-500";
};

const getTierTextColor = (tier: string) => {
  const colors = {
    D: "text-white",
    C: "text-green-400", 
    B: "text-cyan-400",
    A: "text-pink-400",
    S: "text-yellow-400",
    SS: "text-orange-400",
    SSS: "text-red-400"
  };
  return colors[tier as keyof typeof colors] || "text-white";
};

// Tier glow effects for hit cards
const getTierGlow = (tier: string) => {
  const glowEffects = {
    D: "shadow-lg shadow-gray-500/50",
    C: "shadow-lg shadow-green-500/50", 
    B: "shadow-lg shadow-cyan-500/50",
    A: "shadow-lg shadow-pink-500/50",
    S: "shadow-xl shadow-yellow-500/60",
    SS: "shadow-xl shadow-orange-500/70",
    SSS: "shadow-2xl shadow-red-500/80"
  };
  return glowEffects[tier as keyof typeof glowEffects] || "shadow-lg shadow-gray-500/50";
};

const getTierGlowBorder = (tier: string) => {
  const glowBorders = {
    D: "ring-2 ring-gray-500/30",
    C: "ring-2 ring-green-500/30", 
    B: "ring-2 ring-cyan-500/30",
    A: "ring-2 ring-pink-500/30",
    S: "ring-2 ring-yellow-500/40",
    SS: "ring-2 ring-orange-500/50",
    SSS: "ring-2 ring-red-500/60"
  };
  return glowBorders[tier as keyof typeof glowBorders] || "ring-2 ring-gray-500/30";
};

export function ClassicPackOpeningAnimation({ result, onClose, packPrice, onOpenAgain, isOpeningAgain = false }: ClassicPackOpeningAnimationProps) {
  const [animationPhase, setAnimationPhase] = useState<"opening" | "opened">("opening");
  const [revealedCards, setRevealedCards] = useState(0);
  const [hitCardRevealed, setHitCardRevealed] = useState(false);

  // Debug logging
  console.log('🔍 ClassicPackOpeningAnimation render:', {
    result,
    packPrice,
    isOpeningAgain,
    animationPhase,
    revealedCards,
    hitCardRevealed
  });

  // Reset animation state when result changes (for "Open Again" functionality)
  useEffect(() => {
    setAnimationPhase("opening");
    setRevealedCards(0);
    setHitCardRevealed(false);
  }, [result.cards]);

  const handleRevealHitCard = () => {
    setHitCardRevealed(true);
    setTimeout(() => {
      setAnimationPhase("opened");
    }, 1500);
  };

  // Start the card reveal animation
  useEffect(() => {
    if (animationPhase === "opening") {
      // Reveal common cards one by one
      let currentRevealed = 0;
      const interval = setInterval(() => {
        currentRevealed++;
        setRevealedCards(currentRevealed);
        
        if (currentRevealed >= 7) {
          clearInterval(interval);
          // Stop here - hit card will be revealed when user clicks "TAP!"
        }
      }, 100); // Reveal a card every 200ms (faster)
    
      return () => clearInterval(interval);
    }
  }, [animationPhase]);

  if (animationPhase === "opened") {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto gaming-card pulse-border"
        >
          <div className="flex justify-between items-center mb-6">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-2xl font-headline-bold text-white flex items-center gap-2 text-luxury">
                <Sparkles className="text-warn" />
                Pack Opened!
                <Sparkles className="text-warn" />
              </h2>
            </motion.div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="luxury-button-ghost text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <h3 className="text-lg font-semibold text-white mb-2">{result.packName}</h3>
            <p className="text-white">
              You received {result.cards.length} cards!
            </p>
          </motion.div>

          <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
            {result.cards.map((card: any, index: number) => {
              const isHitCard = index === result.cards.length - 1;
              return (
                <div 
                  key={`${card.id}-${index}`}
                  className={`relative overflow-hidden rounded-lg border-2 border-${tierColors[(card.tier) as keyof typeof tierColors]}/50 bg-gradient-to-b from-${tierColors[(card.tier) as keyof typeof tierColors]}/20 to-transparent aspect-[2.5/3.5] ${
                    isHitCard ? `${getTierGlow(card.tier)} ${getTierGlowBorder(card.tier)}` : ''
                  }`}
                >
                <div className="p-2 text-center h-full flex flex-col justify-between">
                  {/* Card Image */}
                  <div className="w-full h-full relative flex flex-col">
                    {card.imageUrl ? (
                      <img
                        src={card.imageUrl}
                        alt={card.name}
                        className="w-full flex-1 object-cover rounded-md"
                        onError={(e) => {
                          // Fallback to default image if the imageUrl fails to load
                          const target = e.target as HTMLImageElement;
                          target.src = "/card-images/random-common-card.png";
                        }}
                      />
                    ) : (
                      <img
                        src="/card-images/random-common-card.png"
                        alt={card.name}
                        className="w-full flex-1 object-cover rounded-md"
                      />
                    )}
                    
                    {/* Hit card star */}
                    {(card.tier) !== "D" && (
                      <div className="absolute top-1 right-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 flex justify-center space-x-4"
          >
            <Button
              onClick={onOpenAgain}
              disabled={isOpeningAgain}
              className="luxury-button-primary text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isOpeningAgain ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Package className="w-4 h-4 mr-2" />
              )}
              {isOpeningAgain ? "Opening..." : `Open Again (${packPrice.toFixed(2)} Credits)`}
            </Button>
            <Button
              onClick={onClose}
              className="luxury-button-secondary text-white"
            >
              Close
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Opening animation phase
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 max-w-4xl w-full">
        <div className="text-center mb-6">
          <motion.h2 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-2xl font-bold text-white mb-2"
          >
            Opening {result.packName}...
          </motion.h2>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-white"
          >
            Revealing cards... {revealedCards}/7
          </motion.p>
        </div>

        <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
          {result.cards.map((card: any, index: number) => {
            const isHitCard = index === result.cards.length - 1;
            const isRevealed = isHitCard ? hitCardRevealed : index < revealedCards;
            const canReveal = isHitCard && revealedCards >= 7 && !hitCardRevealed;
            
            return (
              <div 
                key={`${card.id}-${index}`}
                className={`relative transition-all duration-500 aspect-[2.5/3.5] ${
                  isRevealed
                    ? `opacity-100 transform scale-100 border-2 border-${tierColors[(card.tier) as keyof typeof tierColors]}/50 bg-gradient-to-b from-${tierColors[(card.tier) as keyof typeof tierColors]}/20 to-transparent ${
                        isHitCard ? `animate-pulse ${getTierGlow(card.tier)} ${getTierGlowBorder(card.tier)}` : ''
                      }` 
                    : canReveal
                    ? `opacity-100 transform scale-100 border-2 border-${tierColors[(card.tier) as keyof typeof tierColors]}-400 bg-gradient-to-b from-${tierColors[(card.tier) as keyof typeof tierColors]}-400/20 to-transparent cursor-pointer hover:scale-105 animate-pulse ${getTierGlow(card.tier)} ${getTierGlowBorder(card.tier)}`
                    : "opacity-30 transform scale-95 border-2 border-gray-300 bg-gray-100"
                } overflow-hidden rounded-lg`}
                onClick={canReveal ? handleRevealHitCard : undefined}
              >
                <div className="p-2 text-center h-full flex flex-col justify-between">
                  {isRevealed ? (
                    <>
                      {/* Card Image */}
                      <div className="w-full h-full relative flex flex-col">
                        {card.imageUrl ? (
                          <img
                            src={card.imageUrl}
                            alt={card.name}
                            className="w-full flex-1 object-cover rounded-md"
                            onError={(e) => {
                              // Fallback to default image if the imageUrl fails to load
                              const target = e.target as HTMLImageElement;
                              target.src = "/card-images/random-common-card.png";
                            }}
                          />
                        ) : (
                          <div className={`w-full flex-1 rounded-md bg-gradient-to-br from-${tierColors[(card.tier) as keyof typeof tierColors]}-400 to-${tierColors[(card.tier) as keyof typeof tierColors]}-600 flex items-center justify-center`}>
                            <span className="text-white font-bold text-lg">
                              {card.name?.charAt(0) || '?'}
                            </span>
                          </div>
                        )}
                        
                        {/* Hit card star */}
                        {isHitCard && (
                          <div className="absolute top-1 right-1 animate-bounce">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        {canReveal ? (
                          /* Hit Card - Show HIT CARD image with tier glow */
                          <img 
                            src={hitCardImage} 
                            alt="Hit Card" 
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-center">
                            <Package className="w-4 h-4 text-white mx-auto mb-1" />
                            <div className="text-xs text-white">
                              {isHitCard ? "HIT!" : "???"}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {hitCardRevealed && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-center mt-8"
          >
            <div className="text-yellow-400 font-semibold text-lg">
              🎉 Hit Card Revealed! 🎉
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
