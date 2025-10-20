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
            <div className="w-12 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center relative">
              {card.imageUrl ? (
                <img
                  src={card.imageUrl}
                  alt={card.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to default image if the imageUrl fails to load
                    const target = e.target as HTMLImageElement;
                    // Only set fallback if we haven't already tried the fallback
                    if (!target.src.includes('/card-images/Commons.png')) {
                      target.src = "/card-images/Commons.png";
                    }
                  }}
                />
              ) : (
                <img
                  src="/card-images/Commons.png"
                  alt={card.name}
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                <div className="text-white text-xs font-semibold truncate drop-shadow-md">
                  {card.tier}
                </div>
              </div>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold" data-testid={`text-card-name-${card.id}`}>
                  {card.name}
                </h3>
                <Badge className={`tier-${tierColor} bg-black/70 text-white ring-1 ring-white/30 shadow-md shadow-black/30 px-2 py-0.5 rounded-full`}> 
                  {card.tier}
                </Badge>
              </div>
              {/* Pack type removed: not present on Card type */}
              <div className="flex items-center space-x-4 text-sm">
                <span className="text-muted-foreground">
                  Credit Value: <span className="font-semibold text-accent">{card.credits || card.marketValue} CR</span>
                </span>
                {userCard && (
                  <>
                    <span className="text-muted-foreground">
                      Refund Value: <span className="font-semibold text-legendary">{userCard.refundCredit} CR</span>
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
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.includes('/card-images/Commons.png')) {
                  target.src = "/card-images/Commons.png";
                }
              }}
            />
          ) : (
            <img
              src="/card-images/Commons.png"
              alt={card.name}
              className="w-full h-full object-cover"
            />
          )}
          
          <div className="absolute top-1.5 right-1.5">
            <Badge className={`tier-${tierColor} bg-black/70 text-white ring-1 ring-white/40 shadow-md shadow-black/30 px-2 py-0.5 rounded-full`}>
              {card.tier}
            </Badge>
          </div>
        </div>
        {/* On mobile, move text below image. On larger screens, keep overlay for richness. */}
        <div className="block sm:hidden px-2 pt-2">
          <div className="text-white">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold truncate" data-testid={`text-card-name-${card.id}`}>
                {card.name}
              </div>
              <Badge className={`tier-${tierColor} bg-black/70 text-white ring-1 ring-white/30 shadow-md shadow-black/30 px-2 py-0.5 rounded-full`}>
                {card.tier}
              </Badge>
            </div>
            <div className="text-[10px] text-gray-300 mt-0.5">
              Credit Value: {userCard?.refundCredit || card.credits || card.marketValue} CR
              {userCard?.quantity && userCard.quantity > 1 && (
                <span className="ml-1 text-primary font-bold">
                  {userCard.quantity}x
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="hidden sm:block">
          <div className="relative">
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3">
              <div className="text-white">
                <div className="text-sm font-semibold truncate drop-shadow-lg" data-testid={`text-card-name-${card.id}`}>
                  {card.name}
                </div>
                <div className="text-xs text-gray-200 drop-shadow-md">
                  Credit Value: {userCard?.refundCredit || card.credits || card.marketValue} CR
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
    </div>
  );
}
