import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Star, Gift, Zap, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PackCard {
  id: string;
  name: string;
  tier: string;
  imageUrl?: string;
  marketValue: string;
  isHit: boolean;
  position: number;
}

interface PackOpeningAnimationProps {
  packCards: PackCard[];
  hitCardPosition: number;
  onComplete: () => void;
  packType: string;
}

export function PackOpeningAnimation({ packCards, hitCardPosition, onComplete, packType }: PackOpeningAnimationProps) {
  const handleComplete = () => {
    onComplete();
  };
  const [revealedCards, setRevealedCards] = useState(0);
  const [showHitCard, setShowHitCard] = useState(false);
  const [isHitRevealed, setIsHitRevealed] = useState(false);

  // Function to get tier glow color
  const getTierGlowColor = (tier: string) => {
    switch (tier?.toUpperCase()) {
      case 'C':
        return 'shadow-[0_0_30px_rgba(59,130,246,0.9),0_0_60px_rgba(59,130,246,0.5)]'; // Blue
      case 'B':
        return 'shadow-[0_0_30px_rgba(34,197,94,0.9),0_0_60px_rgba(34,197,94,0.5)]'; // Green
      case 'A':
        return 'shadow-[0_0_30px_rgba(239,68,68,0.9),0_0_60px_rgba(239,68,68,0.5)]'; // Red
      case 'S':
        return 'shadow-[0_0_30px_rgba(236,72,153,0.9),0_0_60px_rgba(236,72,153,0.5)]'; // Pink
      case 'SS':
        return 'shadow-[0_0_30px_rgba(255,215,0,0.9),0_0_60px_rgba(255,215,0,0.5)]'; // Yellow
      case 'SSS':
        return 'shadow-[0_0_35px_rgba(168,85,247,1),0_0_70px_rgba(168,85,247,0.7)]'; // Purple
      default:
        return 'shadow-[0_0_25px_rgba(124,58,237,0.6)]'; // Default purple
    }
  };

  // Separate common cards and hit card
  const commonCards = packCards.filter(card => !card.isHit);
  const hitCard = packCards.find(card => card.isHit);
  

  // Start sequential card reveal animation - 7 commons + 1 hit card
  useEffect(() => {
    // Reset revealed cards
    setRevealedCards(0);
    setIsHitRevealed(false);
    
    // Reveal 7 common cards first, then hit card back
    for (let i = 0; i < 7; i++) {
      setTimeout(() => {
        setRevealedCards(i + 1);
      }, 500 + (i * 150)); // Start after 500ms, then 150ms intervals
    }
    
    // After 7 commons, show hit card back with a small delay
    const hitCardTimeout = 500 + (7 * 150) + 500;
    setTimeout(() => {
      setRevealedCards(8); // Show hit card back (8th card)
    }, hitCardTimeout);
  }, []); // Only run once when component mounts

  const handleRevealHit = (e: React.MouseEvent | React.TouchEvent) => {
    console.log('handleRevealHit called:', { revealedCards, isHitRevealed });
    
    if (revealedCards >= 8 && !isHitRevealed) {
      console.log('Revealing hit card!');
      setIsHitRevealed(true); // Reveal the hit card
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'D': return 'text-gray-500';
      case 'C': return 'text-green-500';
      case 'B': return 'text-blue-500';
      case 'A': return 'text-purple-500';
      case 'S': return 'text-yellow-500';
      case 'SS': return 'text-pink-500';
      case 'SSS': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'D': return 'bg-gray-500';
      case 'C': return 'bg-green-500';
      case 'B': return 'bg-blue-500';
      case 'A': return 'bg-purple-500';
      case 'S': return 'bg-yellow-500';
      case 'SS': return 'bg-pink-500';
      case 'SSS': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  
  return (
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" 
      style={{ pointerEvents: 'auto' }}
      onClick={(e) => {
        console.log('Main container clicked');
        e.stopPropagation();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl"
        onClick={(e) => {
          console.log('Inner container clicked');
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-3 mb-2"
          >
            <Gift className="h-8 w-8 text-[#7C3AED]" />
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#22D3EE]">
              Pack Opening
            </h2>
            <Sparkles className="h-8 w-8 text-[#22D3EE]" />
          </motion.div>
          <p className="text-gray-300 text-lg font-medium">
            {packType} Pack • {packCards.length} Cards
          </p>
        </div>

        {/* 4x2 Grid - 7 Commons + 1 Hit */}
        <div className="mb-6">
          <div className="flex flex-col items-center space-y-3">
            {/* First Row - 4 Cards */}
            <div className="flex justify-center space-x-3">
              {commonCards.slice(0, 4).map((card, index) => {
                const isCardRevealed = index < revealedCards;

                return (
                  <motion.div
                    key={`common-${index}-${card.id}`}
                    className="gaming-card p-2 transition-all duration-500 ease-out transform opacity-100 scale-100 animate-in slide-in-from-bottom-2"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    {isCardRevealed ? (
                      /* Common Card - Revealed */
                      <div className="w-18 h-26">
                        <img
                          src={card.imageUrl || "/card-images/Commons.png"}
                          alt={card.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/card-images/Commons.png";
                          }}
                        />
                      </div>
                    ) : (
                      /* Common Card - Hidden */
                      <div className="w-18 h-26 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border border-slate-600">
                        <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                          <div className="text-slate-400 text-lg font-bold">?</div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Second Row - 3 Commons + 1 Hit */}
            <div className="flex justify-center space-x-3">
              {/* 3 more common cards */}
              {commonCards.slice(4, 7).map((card, index) => {
                const actualIndex = index + 4;
                const isCardRevealed = actualIndex < revealedCards;

                return (
                  <motion.div
                    key={`common-${actualIndex}-${card.id}`}
                    className="gaming-card p-2 transition-all duration-500 ease-out transform opacity-100 scale-100 animate-in slide-in-from-bottom-2"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    {isCardRevealed ? (
                      /* Common Card - Revealed */
                      <div className="w-18 h-26">
                        <img
                          src={card.imageUrl || "/card-images/Commons.png"}
                          alt={card.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/card-images/Commons.png";
                          }}
                        />
                      </div>
                    ) : (
                      /* Common Card - Hidden */
                      <div className="w-18 h-26 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border border-slate-600">
                        <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                          <div className="text-slate-400 text-lg font-bold">?</div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {/* Hit Card Slot */}
              <motion.div
                key="hit-card-slot"
                className="gaming-card p-2 transition-all duration-500 ease-out transform opacity-100 scale-100 animate-in slide-in-from-bottom-2"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {revealedCards >= 8 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className={`relative w-18 h-26 ${getTierGlowColor(hitCard?.tier || '')}`}
                  >
                    <img
                      src={isHitRevealed ? (hitCard?.imageUrl || "/card-images/Commons.png") : "/card-images/hit.png"}
                      alt={isHitRevealed ? "Hit Card" : "Hit Card Back"}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        // Only set fallback if we haven't already tried the fallback
                        if (!target.src.includes('/card-images/Commons.png') && !target.src.includes('/card-images/hit.png')) {
                          target.src = isHitRevealed ? "/card-images/Commons.png" : "/card-images/hit.png";
                        }
                      }}
                    />
                  </motion.div>
                ) : (
                  /* Hit Card - Hidden */
                  <div className="w-18 h-26 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border border-slate-600">
                    <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
                      <div className="text-slate-400 text-lg font-bold">?</div>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>

          {/* Tap to Reveal Button */}
          {revealedCards >= 8 && !isHitRevealed && (() => {
            console.log('Rendering TAP TO REVEAL button:', { revealedCards, isHitRevealed });
            console.log('Button condition - revealedCards >= 8:', revealedCards >= 8);
            console.log('Button condition - !isHitRevealed:', !isHitRevealed);
            return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-4"
              style={{ touchAction: 'manipulation' }}
            >
              <button
                onClick={(e) => {
                  console.log('BUTTON CLICKED!');
                  handleRevealHit(e);
                }}
                onTouchEnd={(e) => {
                  console.log('Touch end on button - triggering reveal');
                  handleRevealHit(e as any);
                }}
                className="bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] hover:from-[#6D28D9] hover:to-[#0891B2] text-white px-4 py-2 rounded-lg font-medium text-sm shadow-[0_0_15px_rgba(124,58,237,0.4)] hover:shadow-[0_0_25px_rgba(124,58,237,0.6)] transition-all duration-300 hover:scale-105 mx-auto cursor-pointer border-2 border-yellow-400 select-none touch-manipulation"
                style={{ pointerEvents: 'auto', zIndex: 10000, minHeight: '44px', minWidth: '200px' }}
                type="button"
              >
                TAP TO REVEAL HIT CARD
              </button>
            </motion.div>
            );
          })()}

          {isHitRevealed && (() => {
            console.log('Rendering revealed hit card:', { isHitRevealed, hitCard });
            return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-4"
            >
              <button
                onClick={handleComplete}
                className="bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] hover:from-[#6D28D9] hover:to-[#0891B2] text-white px-8 py-3 rounded-lg font-bold text-lg shadow-[0_0_15px_rgba(124,58,237,0.4)] hover:shadow-[0_0_25px_rgba(124,58,237,0.6)] transition-all duration-300 hover:scale-105"
              >
                Continue
              </button>
            </motion.div>
            );
          })()}
        </div>


      </motion.div>
    </div>
  );
}
