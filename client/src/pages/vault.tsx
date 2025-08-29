import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { CardDisplay } from "@/components/CardDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Package, RefreshCw, Truck, Filter, Grid, List } from "lucide-react";
import type { UserCardWithCard } from "@shared/schema";

export default function Vault() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [filterTier, setFilterTier] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: vaultCards, isLoading: vaultLoading } = useQuery<UserCardWithCard[]>({
    queryKey: ["/api/vault"],
    enabled: isAuthenticated,
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
    },
  });

  const refundMutation = useMutation({
    mutationFn: async (cardIds: string[]) => {
      await apiRequest("POST", "/api/vault/refund", { cardIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["/api/vault"]);
      queryClient.invalidateQueries(["/api/auth/user"]);
      setSelectedCards([]);
      toast({
        title: "Cards Refunded",
        description: `Successfully refunded ${selectedCards.length} cards`,
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Refund Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleSelectAll = () => {
    if (selectedCards.length === filteredCards.length) {
      setSelectedCards([]);
    } else {
      setSelectedCards(filteredCards.map(card => card.id));
    }
  };

  const handleCardSelect = (cardId: string) => {
    setSelectedCards(prev => 
      prev.includes(cardId) 
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    );
  };

  const calculateRefundValue = () => {
    if (!vaultCards) return 0;
    return selectedCards.reduce((total, cardId) => {
      const card = vaultCards.find(c => c.id === cardId);
      return total + (card ? parseFloat(card.pullValue) * 0.8 : 0);
    }, 0);
  };

  const filteredCards = vaultCards?.filter(card => 
    filterTier === "all" || card.card.tier === filterTier
  ) || [];

  const tierCounts = vaultCards?.reduce((acc, card) => {
    acc[card.card.tier] = (acc[card.card.tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const tiers = [
    { value: "all", label: "All Cards", count: vaultCards?.length || 0 },
    { value: "SSS", label: "Legendary", count: tierCounts.SSS || 0, color: "legendary" },
    { value: "SR", label: "Super Rare", count: tierCounts.SR || 0, color: "superrare" },
    { value: "R", label: "Rare", count: tierCounts.R || 0, color: "rare" },
    { value: "UC", label: "Uncommon", count: tierCounts.UC || 0, color: "uncommon" },
    { value: "C", label: "Common", count: tierCounts.C || 0, color: "common" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <section className="py-8">
            <div className="text-center mb-8">
              <h1 className="font-gaming font-bold text-4xl md:text-5xl mb-4">
                <span className="bg-gradient-to-r from-primary via-accent to-legendary bg-clip-text text-transparent">
                  YOUR VAULT
                </span>
              </h1>
              <p className="text-muted-foreground text-lg">
                Manage your card collection • Refund for credits or ship to your door
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="gaming-card">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary" data-testid="text-total-cards">
                    {vaultCards?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Cards</div>
                </CardContent>
              </Card>

              <Card className="gaming-card">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-accent" data-testid="text-selected-cards">
                    {selectedCards.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Selected</div>
                </CardContent>
              </Card>

              <Card className="gaming-card">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-legendary" data-testid="text-refund-value">
                    {calculateRefundValue().toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Refund Value (CR)</div>
                </CardContent>
              </Card>

              <Card className="gaming-card">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-superrare" data-testid="text-legendary-count">
                    {tierCounts.SSS || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Legendary Cards</div>
                </CardContent>
              </Card>
            </div>

            {/* Controls */}
            <Card className="gaming-card mb-8">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    {tiers.map((tier) => (
                      <Button
                        key={tier.value}
                        variant={filterTier === tier.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilterTier(tier.value)}
                        className={tier.color ? `hover:tier-glow-${tier.color}` : ""}
                        data-testid={`filter-${tier.value}`}
                      >
                        {tier.label} ({tier.count})
                      </Button>
                    ))}
                  </div>

                  {/* View Mode & Actions */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                      data-testid="button-toggle-view"
                    >
                      {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      data-testid="button-select-all"
                    >
                      {selectedCards.length === filteredCards.length ? "Deselect All" : "Select All"}
                    </Button>

                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={selectedCards.length === 0 || refundMutation.isPending}
                      onClick={() => refundMutation.mutate(selectedCards)}
                      data-testid="button-refund-selected"
                    >
                      {refundMutation.isPending ? (
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Refund Selected
                    </Button>

                    <Button
                      size="sm"
                      disabled={selectedCards.length === 0}
                      data-testid="button-ship-selected"
                    >
                      <Truck className="w-4 h-4 mr-2" />
                      Ship Cards
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Cards Display */}
          <section>
            {vaultLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading your collection...</p>
              </div>
            ) : filteredCards.length === 0 ? (
              <Card className="gaming-card">
                <CardContent className="p-12 text-center">
                  <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">
                    {filterTier === "all" ? "No Cards Yet" : `No ${tiers.find(t => t.value === filterTier)?.label} Cards`}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {filterTier === "all" 
                      ? "Start playing games to build your collection!" 
                      : "Try a different filter or play more games to find these cards."
                    }
                  </p>
                  <Button 
                    className="bg-gradient-to-r from-primary to-accent"
                    onClick={() => window.location.href = "/games"}
                    data-testid="button-play-games"
                  >
                    Play Games
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className={viewMode === "grid" 
                ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4" 
                : "space-y-4"
              }>
                {filteredCards.map((userCard) => (
                  <div key={userCard.id} className="relative group">
                    <div className="absolute top-2 left-2 z-10">
                      <Checkbox
                        checked={selectedCards.includes(userCard.id)}
                        onCheckedChange={() => handleCardSelect(userCard.id)}
                        className="bg-background/80 backdrop-blur-sm"
                        data-testid={`checkbox-card-${userCard.id}`}
                      />
                    </div>
                    
                    <CardDisplay 
                      card={userCard.card}
                      userCard={userCard}
                      viewMode={viewMode}
                      isSelected={selectedCards.includes(userCard.id)}
                      onClick={() => handleCardSelect(userCard.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
