import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Star, Gift } from "lucide-react";
import hitCardImage from "/assets/classic-image.png";

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
  const [revealedCards, setRevealedCards] = useState(0);
  const [hitCardRevealed, setHitCardRevealed] = useState(false);

  // Guard against undefined packCards
  if (!packCards || packCards.length === 0) {
    return null;
  }
  
  // Show all 9 cards in the initial display, but the hit card will have special styling
  const hitCard = packCards.find(card => card.isHit);
  const hitCardIndex = packCards.findIndex(card => card.isHit);
  const nonHitCards = packCards.filter(card => !card.isHit);

  // Start sequential card reveal animation - 8 commons + 1 hit card
  useEffect(() => {
    if (showCommons) {
      // Reset revealed cards
      setRevealedCards(0);
      
      // Reveal 8 common cards first, then hit card back
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          setRevealedCards(i + 1);
        }, 500 + (i * 150)); // Start after 500ms, then 150ms intervals
      }
      
      // After 8 commons, show hit card back with a small delay
      setTimeout(() => {
        setRevealedCards(9); // Show hit card back
      }, 500 + (8 * 150) + 500);
    }
  }, [showCommons]);

  const handleRevealHit = () => {
    if (showCommons) {
      setShowHitCard(true);
      setIsHitRevealed(true); // Immediately reveal the hit card
      setShowCommons(false); // Set to false so next click will close
      return;
    }

    onComplete();
  };

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'd': return 'text-gray-500 border-gray-300';
      case 'c': return 'text-green-500 border-green-300';
      case 'b': return 'text-blue-500 border-blue-300';
      case 'a': return 'text-purple-500 border-purple-300';
      case 's': return 'text-yellow-500 border-yellow-300';
      case 'ss': return 'text-pink-500 border-pink-300';
      case 'sss': return 'text-red-500 border-red-300';
      default: return 'text-gray-500 border-gray-300';
    }
  };

  const getTierIcon = (tier: string) => {
    if (tier === 'SSS' || tier === 'SS' || tier === 'S') {
      return <Star className="h-4 w-4" />;
    }
    return <Sparkles className="h-4 w-4" />;
  };

  const getHitCardGlow = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'sss':
        return {
          bg: 'bg-gradient-to-br from-red-400 via-red-500 to-red-600',
          glow: 'shadow-2xl shadow-red-500/70 ring-4 ring-red-400 drop-shadow-2xl',
          animate: 'animate-pulse',
          particles: '•••',
          borderGlow: 'border-red-400 shadow-red-500/80'
        };
      case 'ss':
        return {
          bg: 'bg-gradient-to-br from-pink-400 via-pink-500 to-pink-600', 
          glow: 'shadow-2xl shadow-pink-500/70 ring-4 ring-pink-400 drop-shadow-2xl',
          animate: 'animate-pulse',
          particles: '♦♦♦',
          borderGlow: 'border-pink-400 shadow-pink-500/80'
        };
      case 's':
        return {
          bg: 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600',
          glow: 'shadow-xl shadow-yellow-500/60 ring-2 ring-yellow-400 drop-shadow-xl',
          animate: 'animate-pulse',
          particles: '▲▲▲',
          borderGlow: 'border-yellow-400 shadow-yellow-500/70'
        };
      case 'a':
        return {
          bg: 'bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600',
          glow: 'shadow-xl shadow-purple-500/60 ring-2 ring-purple-400 drop-shadow-xl',
          animate: 'animate-pulse',
          particles: '◆◆◆',
          borderGlow: 'border-purple-400 shadow-purple-500/70'
        };
      case 'b':
        return {
          bg: 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600',
          glow: 'shadow-lg shadow-blue-500/50 ring-2 ring-blue-400 drop-shadow-lg',
          animate: '',
          particles: '💙🔹💙',
          borderGlow: 'border-blue-400 shadow-blue-500/60'
        };
      case 'c':
        return {
          bg: 'bg-gradient-to-br from-green-400 via-green-500 to-green-600',
          glow: 'shadow-lg shadow-green-500/50 ring-2 ring-green-400 drop-shadow-lg',
          animate: '',
          particles: '💚🍀💚',
          borderGlow: 'border-green-400 shadow-green-500/60'
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600',
          glow: 'shadow-md shadow-gray-500/30 drop-shadow-md',
          animate: '',
          particles: '⚪⭕⚪',
          borderGlow: 'border-gray-400 shadow-gray-500/50'
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
              Revealing cards... {revealedCards}/{packCards.length} cards revealed
            </p>
          ) : showHitCard ? (
            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white animate-pulse">
              HIT CARD!
            </Badge>
          ) : null}
        </div>

        {showCommons ? (
          /* 3x3 Grid - 8 commons + 1 hit card */
          <div className="mb-6">
            <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto mb-6">
              {/* Show 8 common cards first */}
              {nonHitCards.slice(0, 8).map((card, index) => {
                const isCardRevealed = index < revealedCards;

                return (
                  <div
                    key={card.id}
                    className="gaming-card p-2 text-center transition-all duration-500 ease-out transform opacity-100 scale-100 animate-in slide-in-from-bottom-2"
                  >
                    {isCardRevealed ? (
                      /* Common Card - Revealed */
                      <div>
                        <img
                          src={card.imageUrl || "/card-images/random-common-card.png"}
                          alt={card.name}
                          className="w-12 h-16 mx-auto rounded object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/card-images/random-common-card.png";
                          }}
                        />
                      </div>
                    ) : (
                      /* Common Card - Hidden */
                      <div>
                        <div className="w-12 h-16 mx-auto bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-xs text-gray-400">?</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Hit card in the center (9th position) */}
              {hitCard && (
                <div
                  className={`gaming-card p-2 text-center transition-all duration-500 ease-out transform opacity-100 scale-100 animate-in slide-in-from-bottom-2 ${
                    revealedCards >= 8
                      ? `${getHitCardGlow(hitCard.tier).glow} ${getHitCardGlow(hitCard.tier).animate} border-2 border-yellow-400 cursor-pointer hover:scale-105 animate-pulse`
                      : ''
                  }`}
                  onClick={revealedCards >= 8 ? handleRevealHit : undefined}
                >
                  {revealedCards >= 8 ? (
                    /* Hit Card - Show hit.png first, then actual card after click */
                    <div>
                      <div className={`w-12 h-16 mx-auto rounded overflow-hidden border-2 ${getHitCardGlow(hitCard.tier).borderGlow} ${getHitCardGlow(hitCard.tier).glow} ${getHitCardGlow(hitCard.tier).animate}`}>
                        <img 
                          src={showHitCard ? (hitCard.imageUrl || hitCardImage) : "/assets/hit.png"} 
                          alt={showHitCard ? "Hit Card" : "Hit Card Back"} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = showHitCard ? hitCardImage : "/assets/hit.png";
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    /* Hit Card - Hidden */
                    <div>
                      <div className="w-12 h-16 mx-auto bg-gray-200 rounded flex items-center justify-center">
                        <span className="text-xs text-gray-400">?</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                  // Hit Card Back with tier-based glow using the HIT CARD image
                  <div className="space-y-4">
                    <div className={`w-32 h-44 mx-auto rounded-xl overflow-hidden border-4 ${getHitCardGlow(hitCard?.tier || '').borderGlow} ${getHitCardGlow(hitCard?.tier || '').glow} ${getHitCardGlow(hitCard?.tier || '').animate} relative`}>
                      <img 
                        src={hitCardImage} 
                        alt="Hit Card" 
                        className="w-full h-full object-cover"
                      />
                      {/* Floating particles overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-3xl animate-bounce opacity-90">
                          {getHitCardGlow(hitCard?.tier || '').particles}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold">Your Hit Card!</h3>
                      <div className={`text-sm px-3 py-1 rounded-full bg-black bg-opacity-30 inline-block border-2 ${getHitCardGlow(hitCard?.tier || '').borderGlow}`}>
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
                        className="w-32 h-44 mx-auto rounded-xl object-cover"
                        onError={(e) => {
                          // Fallback to default image if the imageUrl fails to load
                          const target = e.target as HTMLImageElement;
                          target.src = "/card-images/random-common-card.png";
                        }}
                      />
                    ) : (
                      <div className="w-32 h-44 mx-auto bg-gradient-to-br from-gray-400 to-gray-600 rounded-xl flex items-center justify-center">
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
                      Credit Value: {parseFloat(hitCard?.marketValue || '0').toFixed(2)} credits
                    </div>
                    
                    <div className="text-center space-y-2">
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white animate-bounce">
                        ADDED TO VAULT
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
              ? revealedCards >= 8 ? "Click Hit Card!" : "Revealing Cards..."
              : !isHitRevealed 
              ? "Tap to Reveal" 
              : "Complete Opening"
            }
          </Button>
          
          <p className="text-sm text-gray-400 mt-2">
            {showCommons 
              ? revealedCards >= 8 
                ? "All cards revealed! Click the glowing hit card to reveal it!" 
                : "Watch as your cards pop up one by one..."
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