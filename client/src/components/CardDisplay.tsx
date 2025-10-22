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

  const tierBgColor = "#6b7280"; // Generic grey for all tiers

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
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-lg" data-testid={`text-card-name-${card.id}`}>
                  {card.name}
                </h3>
                <Badge className={`tier-${tierColor} text-white ring-1 ring-white/30 shadow-md shadow-black/30 px-3 py-1 rounded-full font-bold`} style={{
                  backgroundColor: tierBgColor
                }}> 
                  {card.tier}
                </Badge>
              </div>
              <div className="flex items-center space-x-6 text-sm">
                {userCard && userCard.quantity && userCard.quantity > 1 && (
                  <span className="text-muted-foreground">
                    Quantity: <span className="font-bold text-primary">{userCard.quantity}x</span>
                  </span>
                )}
                <span className="text-muted-foreground flex items-center">
                  <div className="w-4 h-4 bg-[#0B0B12] rounded-sm flex items-center justify-center mr-2">
                    <span className="text-[#22D3EE] text-xs font-bold">₵</span>
                  </div>
                  <span className="font-semibold text-accent">{userCard?.refundCredit || card.marketValue}</span>
                </span>
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
            <Badge className={`tier-${tierColor} text-white ring-1 ring-white/40 shadow-md shadow-black/30 px-2 py-0.5 rounded-full font-bold`} style={{
              backgroundColor: tierBgColor
            }}>
              {card.tier}
            </Badge>
          </div>
        </div>
        {/* On mobile, move text below image. On larger screens, keep overlay for richness. */}
        <div className="block sm:hidden px-2 pt-2 pb-2">
          <div className="text-white">
            <div className="text-xs font-semibold truncate mb-1" data-testid={`text-card-name-${card.id}`}>
              {card.name}
            </div>
            {userCard?.quantity && userCard.quantity > 1 && (
              <div className="text-[10px] text-primary font-bold mb-1">
                Qty: {userCard.quantity}
              </div>
            )}
            <div className="text-[10px] text-gray-300 flex items-center">
              <div className="w-3 h-3 bg-[#0B0B12] rounded-sm flex items-center justify-center mr-1">
                <span className="text-[#22D3EE] text-[8px] font-bold">₵</span>
              </div>
              {userCard?.refundCredit || card.marketValue}
            </div>
          </div>
        </div>
        <div className="hidden sm:block">
          <div className="relative">
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3">
              <div className="text-white">
                <div className="text-sm font-bold truncate drop-shadow-lg mb-1" data-testid={`text-card-name-${card.id}`}>
                  {card.name}
                </div>
                {userCard?.quantity && userCard.quantity > 1 && (
                  <div className="text-xs text-primary font-bold drop-shadow-md mb-1">
                    Qty: {userCard.quantity}
                  </div>
                )}
                <div className="text-xs text-gray-100 drop-shadow-md font-medium flex items-center">
                  <div className="w-3 h-3 bg-[#0B0B12] rounded-sm flex items-center justify-center mr-1">
                    <span className="text-[#22D3EE] text-[8px] font-bold">₵</span>
                  </div>
                  {userCard?.refundCredit || card.marketValue}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
