import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Star, Gift } from "lucide-react";

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
  const [showCommons, setShowCommons] = useState(true);
  const [showHitCard, setShowHitCard] = useState(false);
  const [isHitRevealed, setIsHitRevealed] = useState(false);

  // Guard against undefined packCards
  if (!packCards || packCards.length === 0) {
    return null;
  }

  const commonCards = packCards.filter(card => !card.isHit);
  const hitCard = packCards.find(card => card.isHit);

  const handleRevealHit = () => {
    if (showCommons) {
      setShowCommons(false);
      setShowHitCard(true);
      return;
    }
    
    if (!isHitRevealed) {
      setIsHitRevealed(true);
      return;
    }

    onComplete();
  };

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'common': return 'text-gray-500 border-gray-300';
      case 'uncommon': return 'text-green-500 border-green-300';
      case 'rare': return 'text-blue-500 border-blue-300';
      case 'superrare': return 'text-purple-500 border-purple-300';
      case 'legendary': return 'text-yellow-500 border-yellow-300';
      default: return 'text-gray-500 border-gray-300';
    }
  };

  const getTierIcon = (tier: string) => {
    if (tier === 'legendary' || tier === 'superrare') {
      return <Star className="h-4 w-4" />;
    }
    return <Sparkles className="h-4 w-4" />;
  };

  const getHitCardGlow = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'legendary':
      case 'sss':
        return {
          bg: 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600',
          glow: 'shadow-2xl shadow-yellow-500/70 ring-4 ring-yellow-400',
          animate: 'animate-pulse',
          particles: '⭐✨⭐'
        };
      case 'superrare':
      case 'sr':
        return {
          bg: 'bg-gradient-to-br from-red-400 via-red-500 to-red-600', 
          glow: 'shadow-2xl shadow-red-500/70 ring-4 ring-red-400',
          animate: 'animate-pulse',
          particles: '💎🔥💎'
        };
      case 'rare':
      case 'r':
        return {
          bg: 'bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600',
          glow: 'shadow-xl shadow-purple-500/60 ring-2 ring-purple-400',
          animate: 'animate-pulse',
          particles: '💜⚡💜'
        };
      case 'uncommon':
      case 'uc':
        return {
          bg: 'bg-gradient-to-br from-green-400 via-green-500 to-green-600',
          glow: 'shadow-lg shadow-green-500/50 ring-2 ring-green-400',
          animate: '',
          particles: '💚🍀💚'
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600',
          glow: 'shadow-md shadow-gray-500/30',
          animate: '',
          particles: '⚪⭕⚪'
        };
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="max-w-md w-full">
        {/* Pack Opening Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Gift className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-white">Pack Opening</h2>
          </div>
          {showCommons ? (
            <p className="text-gray-300">
              {commonCards.length} Common Cards + 1 Hit Card
            </p>
          ) : showHitCard ? (
            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white animate-pulse">
              HIT CARD!
            </Badge>
          ) : null}
        </div>

        {showCommons ? (
          /* Common Cards Grid */
          <div className="mb-6">
            <h3 className="text-center text-white mb-4">Common Cards</h3>
            <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto mb-6">
              {commonCards.map((card, index) => (
                <div key={index} className="gaming-card p-3 text-center">
                  {card.imageUrl ? (
                    <img
                      src={card.imageUrl}
                      alt={card.name}
                      className="w-12 h-12 mx-auto rounded object-cover mb-2"
                    />
                  ) : (
                    <div className="w-12 h-12 mx-auto bg-gradient-to-br from-gray-400 to-gray-600 rounded flex items-center justify-center mb-2">
                      <span className="text-xs text-white font-bold">
                        {card.name?.charAt(0) || '?'}
                      </span>
                    </div>
                  )}
                  <p className="text-xs font-medium truncate">{card.name}</p>
                  <p className="text-xs text-muted-foreground">${card.marketValue}</p>
                </div>
              ))}
            </div>
          </div>
        ) : showHitCard ? (
          /* Hit Card Display */
          <div className="relative mb-6">
            <Card 
              className={`gaming-card mx-auto w-full max-w-sm transition-all duration-500 cursor-pointer hover:scale-105 ${
                isHitRevealed 
                  ? `${getHitCardGlow(hitCard?.tier || '').glow} scale-105` 
                  : 'scale-100'
              }`}
              onClick={handleRevealHit}
            >
              <CardContent className="p-6 text-center space-y-4">
                {!isHitRevealed ? (
                  // Hit Card Back with tier-based glow
                  <div className="space-y-4">
                    <div className={`w-32 h-32 mx-auto rounded-xl flex flex-col items-center justify-center ${getHitCardGlow(hitCard?.tier || '').bg} ${getHitCardGlow(hitCard?.tier || '').glow} ${getHitCardGlow(hitCard?.tier || '').animate}`}>
                      <Star className="h-12 w-12 text-white mb-2" />
                      <div className="text-2xl">{getHitCardGlow(hitCard?.tier || '').particles}</div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold">Your Hit Card!</h3>
                      <div className="text-sm px-3 py-1 rounded-full bg-black bg-opacity-30 inline-block">
                        {hitCard?.tier?.toUpperCase() || 'UNKNOWN'} TIER
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">Tap to reveal your special card</p>
                  </div>
                ) : (
                  // Hit Card Front
                  <div className="space-y-4">
                    {hitCard?.imageUrl ? (
                      <img
                        src={hitCard.imageUrl}
                        alt={hitCard.name}
                        className="w-32 h-32 mx-auto rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-32 h-32 mx-auto bg-gradient-to-br from-gray-400 to-gray-600 rounded-xl flex items-center justify-center">
                        <span className="text-3xl text-white font-bold">
                          {hitCard?.name?.charAt(0) || '?'}
                        </span>
                      </div>
                    )}
                    
                    <div>
                      <h3 className="text-xl font-bold mb-2">{hitCard?.name}</h3>
                      <Badge variant="outline" className={getTierColor(hitCard?.tier || '')}>
                        {getTierIcon(hitCard?.tier || '')}
                        <span className="ml-1 capitalize">{hitCard?.tier}</span>
                      </Badge>
                    </div>
                    
                    <div className="text-lg font-semibold text-green-400">
                      Market Value: ${hitCard?.marketValue}
                    </div>
                    
                    <div className="text-center space-y-2">
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white animate-bounce">
                        ⭐ ADDED TO VAULT ⭐
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Action Button */}
        <div className="text-center">
          <Button
            onClick={handleRevealHit}
            className={`gaming-gradient w-full max-w-xs ${
              isHitRevealed ? 'animate-pulse' : ''
            }`}
            data-testid="button-reveal-card"
          >
            {showCommons 
              ? "Reveal Hit Card" 
              : !isHitRevealed 
              ? "Tap to Reveal" 
              : "Complete Opening"
            }
          </Button>
          
          <p className="text-sm text-gray-400 mt-2">
            {showCommons 
              ? "Click to see your special card!" 
              : !isHitRevealed 
              ? "Your hit card is waiting..." 
              : "This card has been added to your vault!"
            }
          </p>
        </div>
      </div>
    </div>
  );
}