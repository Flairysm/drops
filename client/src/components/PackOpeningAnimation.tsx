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
    
    // Reveal 7 common cards first, then hit card back - MUCH FASTER
    for (let i = 0; i < 7; i++) {
      setTimeout(() => {
        setRevealedCards(i + 1);
      }, 100 + (i * 50)); // Start after 100ms, then 50ms intervals (very fast)
    }
    
    // After 7 commons, show hit card back with minimal delay
    const hitCardTimeout = 100 + (7 * 50) + 100; // Very fast
    setTimeout(() => {
      setRevealedCards(8); // Show hit card back (8th card)
    }, hitCardTimeout);
  }, []); // Only run once when component mounts

  const handleRevealHit = () => {
    console.log('Revealing hit card...', { revealedCards, isHitRevealed });
    // Make it more aggressive - allow reveal even if not all cards are shown
    if (!isHitRevealed) {
      console.log('FORCING REVEAL!');
      setIsHitRevealed(true);
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
        className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-4 sm:p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl mobile-optimized"
        onClick={(e) => {
          console.log('Inner container clicked');
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 sm:gap-3 mb-2"
          >
            <Gift className="h-6 w-6 sm:h-8 sm:w-8 text-[#7C3AED]" />
            <h2 className="text-xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#22D3EE]">
              Pack Opening
            </h2>
            <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-[#22D3EE]" />
          </motion.div>
          <p className="text-gray-300 text-base sm:text-lg font-medium">
            {packType} Pack • {packCards.length} Cards
          </p>
        </div>

        {/* 4x2 Grid - 7 Commons + 1 Hit */}
        <div className="mb-6">
          <div className="flex flex-col items-center justify-center">
            <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full max-w-sm mx-auto mb-6">
            {/* Show 7 common cards first */}
            {commonCards.slice(0, 7).map((card, index) => {
              const isCardRevealed = index < revealedCards;

              return (
                <motion.div
                  key={`common-${index}-${card.id}`}
                  className="gaming-card p-1 sm:p-2 text-center transition-all duration-500 ease-out transform opacity-100 scale-100 animate-in slide-in-from-bottom-2"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  {isCardRevealed ? (
                    /* Common Card - Revealed */
                    <div className="w-12 h-16 sm:w-16 sm:h-24">
                      <img
                        src={card.imageUrl || "/card-images/Commons.png"}
                        alt={card.name}
                        className="w-full h-full object-cover rounded-md"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/card-images/Commons.png";
                        }}
                      />
                    </div>
                  ) : (
                    /* Common Card - Hidden */
                    <div className="w-12 h-16 sm:w-16 sm:h-24 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border border-slate-600 rounded-md">
                      <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center rounded-md">
                        <div className="text-slate-400 text-xs sm:text-sm font-bold">?</div>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}

            {/* Hit Card Slot */}
            <motion.div
              key="hit-card-slot"
              className="gaming-card p-1 sm:p-2 text-center transition-all duration-500 ease-out transform opacity-100 scale-100 animate-in slide-in-from-bottom-2"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {revealedCards >= 8 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={`relative w-12 h-16 sm:w-16 sm:h-24 ${getTierGlowColor(hitCard?.tier || '')} ${!isHitRevealed ? 'cursor-pointer' : ''}`}
                  onClick={!isHitRevealed ? handleRevealHit : undefined}
                  onTouchStart={!isHitRevealed ? handleRevealHit : undefined}
                  onTouchEnd={!isHitRevealed ? handleRevealHit : undefined}
                  onMouseDown={!isHitRevealed ? handleRevealHit : undefined}
                >
                  <img
                    src={isHitRevealed ? (hitCard?.imageUrl || "/card-images/Commons.png") : "/card-images/hit.png"}
                    alt={isHitRevealed ? "Hit Card" : "Hit Card Back - Tap to Reveal"}
                    className="w-full h-full object-cover rounded-md"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      // Only set fallback if we haven't already tried the fallback
                      if (!target.src.includes('/card-images/Commons.png') && !target.src.includes('/card-images/hit.png')) {
                        target.src = isHitRevealed ? "/card-images/Commons.png" : "/card-images/hit.png";
                      }
                    }}
                  />
                  {!isHitRevealed && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-md">
                      <div className="text-white text-xs font-bold bg-black/50 px-1 py-0.5 rounded">
                        TAP
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                /* Hit Card - Hidden */
                <div className="w-12 h-16 sm:w-16 sm:h-24 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border border-slate-600 rounded-md">
                  <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center rounded-md">
                    <div className="text-slate-400 text-xs sm:text-sm font-bold">?</div>
                  </div>
                </div>
              )}
            </motion.div>
            </div>
          </div>

          {/* Tap to Reveal Button */}
          {!isHitRevealed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-4"
            >
              <button
                onClick={handleRevealHit}
                onTouchStart={handleRevealHit}
                onTouchEnd={handleRevealHit}
                onMouseDown={handleRevealHit}
                className="btn-mobile-optimized bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] hover:from-[#6D28D9] hover:to-[#0891B2] text-white px-6 py-3 rounded-lg font-bold text-base shadow-[0_0_15px_rgba(124,58,237,0.4)] hover:shadow-[0_0_25px_rgba(124,58,237,0.6)] transition-all duration-100 hover:scale-105 mx-auto cursor-pointer border-2 border-yellow-400 select-none min-h-[56px] min-w-[220px] touch-manipulation"
                type="button"
                style={{ 
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation'
                }}
              >
                TAP TO REVEAL HIT CARD
              </button>
            </motion.div>
          )}

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
