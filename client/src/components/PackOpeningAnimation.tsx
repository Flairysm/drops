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
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [showingHitCard, setShowingHitCard] = useState(false);

  // Guard against undefined packCards
  if (!packCards || packCards.length === 0) {
    return null;
  }

  const currentCard = packCards[currentCardIndex];
  const isLastCard = currentCardIndex === packCards.length - 1;
  const isHitCard = currentCard?.isHit;

  const handleCardReveal = () => {
    if (!isRevealed) {
      setIsRevealed(true);
      if (isHitCard) {
        setShowingHitCard(true);
      }
      return;
    }

    if (isLastCard) {
      onComplete();
      return;
    }

    // Move to next card
    setCurrentCardIndex(currentCardIndex + 1);
    setIsRevealed(false);
    setShowingHitCard(false);
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="max-w-md w-full">
        {/* Pack Opening Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Gift className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-white">Pack Opening</h2>
          </div>
          <p className="text-gray-300">
            Card {currentCardIndex + 1} of {packCards.length}
          </p>
          {isHitCard && (
            <Badge className="mt-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white animate-pulse">
              HIT CARD!
            </Badge>
          )}
        </div>

        {/* Card Display */}
        <div className="relative mb-6">
          <Card 
            className={`gaming-card mx-auto w-full max-w-sm transition-all duration-500 cursor-pointer hover:scale-105 ${
              showingHitCard 
                ? 'ring-4 ring-yellow-500 shadow-2xl shadow-yellow-500/50 animate-pulse' 
                : isRevealed 
                ? 'scale-105' 
                : 'scale-100'
            }`}
            onClick={handleCardReveal}
          >
            <CardContent className="p-6 text-center space-y-4">
              {!isRevealed ? (
                // Card Back
                <div className="space-y-4">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Gift className="h-12 w-12 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold">Tap to Reveal</h3>
                  <p className="text-sm text-muted-foreground">
                    {packType} Pack
                  </p>
                </div>
              ) : (
                // Card Front
                <div className="space-y-4">
                  {currentCard?.imageUrl ? (
                    <img
                      src={currentCard.imageUrl}
                      alt={currentCard.name}
                      className="w-24 h-24 mx-auto rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-gray-400 to-gray-600 rounded-xl flex items-center justify-center">
                      <span className="text-2xl text-white font-bold">
                        {currentCard?.name?.charAt(0) || '?'}
                      </span>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{currentCard?.name}</h3>
                    <Badge variant="outline" className={getTierColor(currentCard?.tier || '')}>
                      {getTierIcon(currentCard?.tier || '')}
                      <span className="ml-1 capitalize">{currentCard?.tier}</span>
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    Market Value: ${currentCard?.marketValue}
                  </div>
                  
                  {isHitCard && (
                    <div className="text-center space-y-2">
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white animate-bounce">
                        ⭐ ADDED TO VAULT ⭐
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Button */}
        <div className="text-center">
          <Button
            onClick={handleCardReveal}
            className={`gaming-gradient w-full max-w-xs ${
              showingHitCard ? 'animate-pulse' : ''
            }`}
            data-testid="button-reveal-card"
          >
            {!isRevealed 
              ? "Reveal Card" 
              : isLastCard 
              ? "Complete Opening" 
              : "Next Card"
            }
          </Button>
          
          {isRevealed && (
            <p className="text-sm text-gray-400 mt-2">
              {isHitCard 
                ? "This card has been added to your vault!" 
                : isLastCard 
                ? "Pack opening complete!" 
                : "Tap to continue..."
              }
            </p>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="mt-4">
          <div className="flex justify-center space-x-1">
            {packCards.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index < currentCardIndex 
                    ? 'bg-green-500' 
                    : index === currentCardIndex 
                    ? 'bg-primary animate-pulse' 
                    : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}