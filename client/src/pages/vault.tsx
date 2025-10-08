import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { NavigationFooter } from "@/components/NavigationFooter";
import { CardDisplay } from "@/components/CardDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Package, RefreshCw, Truck, Filter, Grid, List } from "lucide-react";
import type { UserCard } from "@shared/schema";
import { motion } from "framer-motion";

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

  const { data: vaultCards, isLoading: vaultLoading } = useQuery<UserCard[]>({
    queryKey: ["/api/vault"],
    enabled: isAuthenticated,
    queryFn: async () => {
      console.log('🔍 Vault query function called');
      const response = await apiRequest("GET", "/api/vault");
      const data = await response.json();
      console.log('🔍 Vault query response:', data);
      console.log('🔍 Vault cards count:', data?.length || 0);
      return data;
    },
  });

  const refundMutation = useMutation({
    mutationFn: async (cardIds: string[]) => {
      // For common cards (D tier), collect all individual common card IDs
      const allCardIds: string[] = [];
      let totalRefundAmount = 0;
      
      for (const cardId of cardIds) {
        const selectedCard = vaultCards?.find(c => c.id === cardId);
        if (selectedCard?.cardTier === 'D') {
          // For common cards, find all individual common cards with the same properties
          const commonCards = vaultCards?.filter(c => 
            c.cardTier === 'D' && 
            c.cardName === selectedCard.cardName &&
            c.cardImageUrl === selectedCard.cardImageUrl &&
            c.refundCredit === selectedCard.refundCredit
          ) || [];
          
          // Add all individual common card IDs and calculate total refund
          commonCards.forEach(card => {
            allCardIds.push(card.id);
            totalRefundAmount += parseFloat(card.refundCredit.toString());
          });
        } else {
          // For C-SSS cards, add the individual card ID
          allCardIds.push(cardId);
          totalRefundAmount += parseFloat(selectedCard?.refundCredit.toString() || '0');
        }
      }
      
      // Remove duplicates
      const uniqueCardIds = [...new Set(allCardIds)];
      
      // Make the refund API request first
      console.log("🚀 Starting refund processing for card IDs:", uniqueCardIds);
      console.log("🚀 Making API request to /api/vault/refund");
      
      const response = await apiRequest("POST", "/api/vault/refund", { cardIds: uniqueCardIds });
      console.log("✅ Refund request successful:", response);
      
      const data = await response.json();
      console.log("✅ Refund response data:", data);
      
      // Clear selected cards and show success message
      setSelectedCards([]);
      toast({
        title: "Cards Refunded",
        description: `Successfully refunded ${uniqueCardIds.length} cards for ${Math.floor(totalRefundAmount)} credits`,
      });
      
      // Invalidate and refetch the vault data to get the updated list
      await queryClient.invalidateQueries({ queryKey: ["/api/vault"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      return { success: true, refundedCards: uniqueCardIds.length, totalRefund: totalRefundAmount };
    },
    onSuccess: () => {
      // Success is handled in the mutation function
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

  console.log('🔍 Vault component render - vaultCards:', vaultCards);
  console.log('🔍 Vault component render - vaultLoading:', vaultLoading);
  console.log('🔍 Vault component render - vaultCards length:', vaultCards?.length || 0);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleSelectAll = () => {
    const originalFilteredCards = vaultCards?.filter(card => 
      filterTier === "all" || card.cardTier === getTierMapping(filterTier)
    ) || [];
    
    if (selectedCards.length === originalFilteredCards.length && originalFilteredCards.length > 0) {
      setSelectedCards([]);
    } else {
      setSelectedCards(originalFilteredCards.map(card => card.id));
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
      if (!card) return total;
      // Use refundCredit field for refund calculation
      const refundValue = parseFloat(card.refundCredit.toString());
      return total + (refundValue * card.quantity);
    }, 0);
  };

  // No need for tier mapping anymore since we're using direct tier codes
  const getTierMapping = (filterValue: string) => {
    return filterValue; // Direct mapping since database now uses D, C, B, A, S, SS, SSS
  };

  // Function to condense only common cards (D tier)
  const condenseCards = (cards: UserCard[]) => {
    const condensedCards: UserCard[] = [];
    const commonCardMap = new Map<string, UserCard>();
    
    cards.forEach(userCard => {
      // Only condense common cards (D tier)
      if (userCard.cardTier === 'D') {
        // Create a unique key based on card properties for commons
        const key = `${userCard.cardName}-${userCard.cardImageUrl}-${userCard.cardTier}-${userCard.refundCredit}`;
        
        if (commonCardMap.has(key)) {
          // If common card already exists, add to quantity
          const existingCard = commonCardMap.get(key)!;
          existingCard.quantity += userCard.quantity;
        } else {
          // Create new condensed common card entry
          commonCardMap.set(key, {
            ...userCard,
            // Use the first card's ID as the representative ID
            id: userCard.id
          });
        }
      } else {
        // Keep C to SSS cards separate (no condensation)
        condensedCards.push(userCard);
      }
    });
    
    // Add all condensed common cards and individual C-SSS cards
    return [...condensedCards, ...Array.from(commonCardMap.values())];
  };

  const filteredCards = condenseCards(
    vaultCards?.filter(card => 
      filterTier === "all" || card.cardTier === getTierMapping(filterTier)
    ) || []
  );

  const originalFilteredCards = vaultCards?.filter(card => 
    filterTier === "all" || card.cardTier === getTierMapping(filterTier)
  ) || [];

  const tierCounts = originalFilteredCards?.reduce((acc, card) => {
    // Database now uses direct tier codes (D, C, B, A, S, SS, SSS)
    if (card.cardTier) {
      acc[card.cardTier] = (acc[card.cardTier] || 0) + card.quantity;
    }
    return acc;
  }, {} as Record<string, number>) || {};

  const tiers = [
    { value: "all", label: "All Cards", count: originalFilteredCards?.reduce((sum, card) => sum + card.quantity, 0) || 0 },
    { value: "SSS", label: "SSS", count: tierCounts.SSS || 0, color: "legendary" },
    { value: "SS", label: "SS", count: tierCounts.SS || 0, color: "superrare" },
    { value: "S", label: "S", count: tierCounts.S || 0, color: "rare" },
    { value: "A", label: "A", count: tierCounts.A || 0, color: "uncommon" },
    { value: "B", label: "B", count: tierCounts.B || 0, color: "common" },
    { value: "C", label: "C", count: tierCounts.C || 0, color: "common" },
    { value: "D", label: "D", count: tierCounts.D || 0, color: "common" },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navigation />

      {/* Futuristic Card Hero Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Main background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('data:image/svg+xml;base64,${btoa(`
              <svg width="1920" height="1080" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="bg" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="#1e1b4b" stop-opacity="1"/>
                    <stop offset="100%" stop-color="#312e81" stop-opacity="1"/>
                  </radialGradient>
                  <linearGradient id="card1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.8"/>
                    <stop offset="100%" stop-color="#1d4ed8" stop-opacity="0.6"/>
                  </linearGradient>
                  <linearGradient id="card2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#ec4899" stop-opacity="0.9"/>
                    <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.8"/>
                  </linearGradient>
                  <linearGradient id="card3" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.7"/>
                    <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.9"/>
                  </linearGradient>
                </defs>
                <rect width="1920" height="1080" fill="url(#bg)"/>
                
                {/* Floating Cards */}
                <g opacity="0.6">
                  <rect x="200" y="150" width="120" height="180" rx="12" fill="url(#card1)" transform="rotate(-15 260 240)"/>
                  <rect x="1600" y="200" width="120" height="180" rx="12" fill="url(#card2)" transform="rotate(20 1660 290)"/>
                  <rect x="100" y="600" width="120" height="180" rx="12" fill="url(#card3)" transform="rotate(-25 160 690)"/>
                  <rect x="1700" y="650" width="120" height="180" rx="12" fill="url(#card1)" transform="rotate(30 1760 740)"/>
                  <rect x="400" y="400" width="100" height="150" rx="10" fill="url(#card2)" transform="rotate(45 450 475)"/>
                  <rect x="1400" y="500" width="100" height="150" rx="10" fill="url(#card3)" transform="rotate(-35 1450 575)"/>
                </g>
                
                {/* Grid Pattern */}
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#22D3EE" stroke-width="0.5" opacity="0.1"/>
                  </pattern>
                </defs>
                <rect width="1920" height="1080" fill="url(#grid)"/>
                
                {/* Floating Particles */}
                <g opacity="0.4">
                  <circle cx="300" cy="200" r="2" fill="#22D3EE"/>
                  <circle cx="800" cy="300" r="1.5" fill="#7C3AED"/>
                  <circle cx="1200" cy="150" r="2.5" fill="#22D3EE"/>
                  <circle cx="1600" cy="400" r="1" fill="#7C3AED"/>
                  <circle cx="200" cy="800" r="2" fill="#22D3EE"/>
                  <circle cx="600" cy="700" r="1.5" fill="#7C3AED"/>
                  <circle cx="1000" cy="900" r="2" fill="#22D3EE"/>
                  <circle cx="1400" cy="750" r="1" fill="#7C3AED"/>
                </g>
              </svg>
            `)}')`
          }}
        />
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/40"></div>
        {/* Additional floating particles */}
        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-cyan-400/60 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      </div>
      
      <main className="pt-24 pb-24 relative z-10">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
          {/* Header */}
          <motion.section 
            className="py-6 text-center mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl font-bold mb-3">
              <span className="bg-gradient-to-r from-[#7C3AED] via-[#A855F7] to-[#22D3EE] bg-clip-text text-transparent">
                YOUR VAULT
              </span>
            </h1>
            <p className="text-lg text-[#E5E7EB]">
              Manage your card collection • Refund for credits or ship to your door
            </p>
          </motion.section>

            {/* Quick Stats */}
            <motion.div 
              className="bg-[#151521]/40 backdrop-blur-[15px] border border-[#26263A]/50 rounded-2xl p-6 mb-12 shadow-[0_0_30px_rgba(0,0,0,0.3)]"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#22D3EE]" data-testid="text-total-cards">
                    {vaultCards?.filter(card => 
                      filterTier === "all" || card.cardTier === getTierMapping(filterTier)
                    ).reduce((sum, card) => sum + card.quantity, 0) || 0}
                  </div>
                  <div className="text-sm text-[#9CA3AF]">Total Cards</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-[#7C3AED]" data-testid="text-selected-cards">
                    {selectedCards.length}
                  </div>
                  <div className="text-sm text-[#9CA3AF]">Selected</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-[#A855F7]" data-testid="text-refund-value">
                    {Math.floor(calculateRefundValue())}
                  </div>
                  <div className="text-sm text-[#9CA3AF]">Refund Value (CR)</div>
                </div>
              </div>
            </motion.div>

            {/* Controls */}
            <motion.div 
              className="bg-[#151521]/40 backdrop-blur-[15px] border border-[#26263A]/50 rounded-2xl p-6 mb-12 shadow-[0_0_30px_rgba(0,0,0,0.3)]"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="w-4 h-4 text-[#9CA3AF]" />
                  {tiers.map((tier) => (
                    <Button
                      key={tier.value}
                      variant={filterTier === tier.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterTier(tier.value)}
                      className={filterTier === tier.value 
                        ? "bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] text-white border-0" 
                        : "bg-[#26263A]/50 border-[#26263A] text-[#E5E7EB] hover:bg-[#26263A]"
                      }
                      data-testid={`filter-${tier.value}`}
                    >
                      {tier.label} ({tier.count})
                    </Button>
                  ))}
                </div>

                {/* View Mode & Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                    className="bg-[#26263A]/50 border-[#26263A] text-[#E5E7EB] hover:bg-[#26263A]"
                    data-testid="button-toggle-view"
                  >
                    {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="bg-[#26263A]/50 border-[#26263A] text-[#E5E7EB] hover:bg-[#26263A]"
                    data-testid="button-select-all"
                  >
                    {selectedCards.length === originalFilteredCards.length ? "Deselect All" : "Select All"}
                  </Button>

                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={selectedCards.length === 0 || refundMutation.isPending}
                    onClick={() => refundMutation.mutate(selectedCards)}
                    className="bg-gradient-to-r from-[#ef4444] to-[#dc2626] hover:from-[#dc2626] hover:to-[#b91c1c] text-white border-0"
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
                    className="bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] hover:from-[#6D28D9] hover:to-[#0891B2] text-white border-0 disabled:bg-[#374151] disabled:text-[#9CA3AF]"
                    data-testid="button-ship-selected"
                  >
                    <Truck className="w-4 h-4 mr-2" />
                    Ship Cards
                  </Button>
                </div>
              </div>
            </motion.div>

          {/* Cards Display */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {vaultLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#22D3EE] mx-auto"></div>
                <p className="mt-4 text-[#9CA3AF]">Loading your collection...</p>
              </div>
            ) : filteredCards.length === 0 ? (
              <motion.div 
                className="bg-[#151521]/40 backdrop-blur-[15px] border border-[#26263A]/50 rounded-2xl p-12 text-center shadow-[0_0_30px_rgba(0,0,0,0.3)]"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <Package className="w-16 h-16 mx-auto mb-4 text-[#9CA3AF]" />
                <h3 className="text-xl font-bold mb-2 text-[#E5E7EB]">
                  {filterTier === "all" ? "No Cards Yet" : `No ${tiers.find(t => t.value === filterTier)?.label} Cards`}
                </h3>
                <p className="text-[#9CA3AF] mb-6">
                  {filterTier === "all" 
                    ? "Start playing games to build your collection!" 
                    : "Try a different filter or play more games to find these cards."
                  }
                </p>
                <Button 
                  className="bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] hover:from-[#6D28D9] hover:to-[#0891B2] text-white border-0"
                  onClick={() => window.location.href = "/games"}
                  data-testid="button-play-games"
                >
                  Play Games
                </Button>
              </motion.div>
            ) : (
              <motion.div 
                className={viewMode === "grid" 
                  ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 gap-2" 
                  : "space-y-4"
                }
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                {filteredCards.map((userCard, index) => (
                  <motion.div 
                    key={userCard.id} 
                    className="relative group"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="absolute top-2 left-2 z-10">
                      <Checkbox
                        checked={selectedCards.includes(userCard.id)}
                        onCheckedChange={() => handleCardSelect(userCard.id)}
                        className="bg-[#151521]/80 backdrop-blur-sm border-[#26263A]"
                        data-testid={`checkbox-card-${userCard.id}`}
                      />
                    </div>
                    
                    <CardDisplay 
                      card={{
                        id: userCard.id,
                        name: userCard.cardName,
                        imageUrl: userCard.cardImageUrl,
                        tier: userCard.cardTier,
                        credits: userCard.refundCredit.toString()
                      }}
                      userCard={userCard}
                      viewMode={viewMode}
                      isSelected={selectedCards.includes(userCard.id)}
                      onClick={() => handleCardSelect(userCard.id)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.section>
        </div>
      </main>
      
      {/* Navigation Footer */}
      <NavigationFooter />
    </div>
  );
}
