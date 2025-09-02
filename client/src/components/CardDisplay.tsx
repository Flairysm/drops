import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Card as CardType, UserCard } from "@shared/schema";

interface CardDisplayProps {
  card: CardType;
  userCard?: UserCard;
  viewMode?: "grid" | "list";
  isSelected?: boolean;
  onClick?: () => void;
}

export function CardDisplay({ 
  card, 
  userCard, 
  viewMode = "grid", 
  isSelected = false,
  onClick 
}: CardDisplayProps) {
  const tierColors = {
    D: "d",
    C: "c",
    B: "b", 
    A: "a",
    S: "s",
    SS: "ss",
    SSS: "sss"
  };

  const tierColor = tierColors[card.tier as keyof typeof tierColors] || "d";

  if (viewMode === "list") {
    return (
      <Card 
        className={`gaming-card hover:glow-effect transition-all cursor-pointer ${
          isSelected ? `tier-glow-${tierColor}` : ""
        }`}
        onClick={onClick}
        data-testid={`card-${card.id}`}
      >
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              {card.imageUrl ? (
                <img
                  src={card.imageUrl}
                  alt={card.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-8 h-8 rounded-full bg-${tierColor}/20 flex items-center justify-center`}>
                  <span className={`font-bold tier-${tierColor}`}>{card.tier}</span>
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-semibold" data-testid={`text-card-name-${card.id}`}>
                  {card.name}
                </h3>
                <Badge className={`bg-${tierColor}/20 tier-${tierColor} border-${tierColor}/30`}>
                  {card.tier}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{card.packType} Pack</p>
              <div className="flex items-center space-x-4 text-sm">
                <span className="text-muted-foreground">
                  Credit Value: <span className="font-semibold text-accent">{card.marketValue} CR</span>
                </span>
                {userCard && (
                  <>
                    <span className="text-muted-foreground">
                      Pull Value: <span className="font-semibold text-legendary">{userCard.pullValue} CR</span>
                    </span>
                    {userCard.quantity && userCard.quantity > 1 && (
                      <span className="text-muted-foreground">
                        Quantity: <span className="font-semibold text-primary">{userCard.quantity}x</span>
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div 
      className={`relative group cursor-pointer transform hover:scale-105 transition-transform ${
        isSelected ? "scale-105" : ""
      }`}
      onClick={onClick}
      data-testid={`card-${card.id}`}
    >
      <div className={`tier-glow-${tierColor} rounded-lg overflow-hidden gaming-card ${
        isSelected ? `tier-glow-${tierColor}` : ""
      }`}>
        <div className="aspect-[3/4] bg-gradient-to-br from-primary/20 to-accent/20 relative">
          {card.imageUrl ? (
            <img
              src={card.imageUrl}
              alt={card.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className={`w-16 h-16 rounded-full bg-${tierColor}/30 flex items-center justify-center`}>
                <span className={`text-2xl font-bold tier-${tierColor}`}>{card.tier}</span>
              </div>
            </div>
          )}
          
          <div className="absolute top-2 right-2">
            <Badge className={`bg-${tierColor}/90 tier-${tierColor} text-white`}>
              {card.tier}
            </Badge>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
            <div className="text-white">
              <div className="text-sm font-semibold truncate" data-testid={`text-card-name-${card.id}`}>
                {card.name}
              </div>
              <div className="text-xs text-gray-300">
                Credit Value: {userCard?.pullValue || card.marketValue} CR
                {userCard?.quantity && userCard.quantity > 1 && (
                  <span className="ml-2 text-primary font-bold">
                    {userCard.quantity}x
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
