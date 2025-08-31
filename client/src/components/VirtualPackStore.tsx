import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, CreditCard } from "lucide-react";
import { VirtualPackOpening } from "@/components/VirtualPackOpening";
import type { VirtualPack, User } from "@shared/schema";

interface VirtualPackStoreProps {
  virtualPacks: VirtualPack[];
}

export function VirtualPackStore({ virtualPacks }: VirtualPackStoreProps) {
  const { user } = useAuth() as { user: User | null; isLoading: boolean; isAuthenticated: boolean };
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openingPack, setOpeningPack] = useState<VirtualPack | null>(null);

  const handlePurchase = (pack: VirtualPack) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to purchase packs",
        variant: "destructive",
      });
      return;
    }

    const userCredits = parseFloat(user.credits || '0');
    const packPrice = parseFloat(pack.price);
    if (userCredits < packPrice) {
      toast({
        title: "Insufficient Credits",
        description: `You need ${packPrice} credits but only have ${userCredits.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    // Show the opening interface instead of immediate purchase
    setOpeningPack(pack);
  };

  const activePacks = virtualPacks.filter(pack => pack.isActive);

  // Show opening interface if a pack is selected
  if (openingPack) {
    return (
      <VirtualPackOpening 
        packId={openingPack.id}
        packName={openingPack.name}
        onClose={() => setOpeningPack(null)}
      />
    );
  }

  if (activePacks.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Themed Packs Available</h3>
        <p className="text-muted-foreground">
          Check back later for exclusive themed pack collections!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <p className="text-muted-foreground">Rip virtual packs and stand a chance to win top-tier cards</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activePacks.map((pack) => (
          <Card key={pack.id} className="gaming-card">
            <CardHeader className="text-center">
              {pack.imageUrl && (
                <div className="w-full h-32 mb-4 rounded-lg overflow-hidden">
                  <img 
                    src={pack.imageUrl} 
                    alt={pack.name}
                    className="w-full h-full object-cover"
                    data-testid={`img-virtual-pack-${pack.id}`}
                  />
                </div>
              )}
              <CardTitle className="font-gaming text-xl" data-testid={`text-virtual-pack-name-${pack.id}`}>
                {pack.name}
              </CardTitle>
              {pack.description && (
                <p className="text-sm text-muted-foreground mt-2">
                  {pack.description}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center space-x-2">
                <Badge variant="secondary" data-testid={`badge-pack-price-${pack.id}`}>
                  {pack.price} Credits
                </Badge>
                <Badge className="bg-accent text-primary-foreground" data-testid={`badge-pack-card-count-${pack.id}`}>
                  8 Cards
                </Badge>
              </div>

              <Button
                onClick={() => handlePurchase(pack)}
                disabled={!user || parseFloat(user.credits || '0') < parseFloat(pack.price)}
                className="w-full bg-gradient-to-r from-primary to-accent"
                data-testid={`button-purchase-virtual-pack-${pack.id}`}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Open Pack
              </Button>

              {user && parseFloat(user.credits || '0') < parseFloat(pack.price) && (
                <p className="text-xs text-destructive text-center">
                  Need {(parseFloat(pack.price) - parseFloat(user.credits || '0')).toFixed(2)} more credits
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
    </div>
  );
}