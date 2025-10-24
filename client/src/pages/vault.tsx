import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { NavigationFooter } from "@/components/NavigationFooter";
import { CardDisplay } from "@/components/CardDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Package, RefreshCw, Truck, Filter, Grid, List, Search } from "lucide-react";
import type { UserCard } from "@shared/schema";
import { motion } from "framer-motion";


export default function Vault() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [filterTier, setFilterTier] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [allCards, setAllCards] = useState<UserCard[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreCards, setHasMoreCards] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Load more cards when button is clicked
  const handleLoadMore = async () => {
    if (!hasMoreCards || isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      const response = await apiRequest("GET", `/api/vault?page=${currentPage + 1}&limit=16`);
      const data = await response.json();
      
      if (data.cards && data.cards.length > 0) {
        setAllCards(prev => [...prev, ...data.cards]);
        setCurrentPage(prev => prev + 1);
        // Only show "Load More" if there are more pages AND we got cards in this response
        setHasMoreCards(data.pagination.hasNextPage && data.cards.length > 0);
      } else {
        setHasMoreCards(false);
      }
    } catch (error) {
      console.error("Error loading more cards:", error);
      toast({
        title: "Error",
        description: "Failed to load more cards. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMore(false);
    }
  };
  
  // Shipping popup state
  const [showShippingPopup, setShowShippingPopup] = useState(false);
  const [userAddresses, setUserAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [isCreatingShippingRequest, setIsCreatingShippingRequest] = useState(false);
  
  // Shipping success popup state
  const [showShippingSuccessPopup, setShowShippingSuccessPopup] = useState(false);
  const [shippingSuccessData, setShippingSuccessData] = useState<{
    requestId: string;
    totalCards: number;
    totalValue: number;
  } | null>(null);
  
  // Refund success popup state
  const [showRefundSuccessPopup, setShowRefundSuccessPopup] = useState(false);
  const [refundSuccessData, setRefundSuccessData] = useState<{
    cardCount: number;
    totalAmount: number;
  } | null>(null);

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

  const { data: vaultData, isLoading: vaultLoading } = useQuery({
    queryKey: ["/api/vault", 1, 16],
    enabled: isAuthenticated,
    queryFn: async () => {
      console.log('Vault query function called - page 1, limit 16');
      const response = await apiRequest("GET", "/api/vault?page=1&limit=16");
      const data = await response.json();
      console.log('Vault query response:', data);
      console.log('Vault cards count:', data?.cards?.length || 0);
      console.log('Total cards:', data?.pagination?.totalCount || 0);
      return data;
    },
  });

  // Update allCards when initial data loads
  React.useEffect(() => {
    if (vaultData?.cards) {
      setAllCards(vaultData.cards);
      setCurrentPage(1);
      // Only show "Load More" if there are actually more pages AND we have cards
      const hasMore = vaultData.pagination?.hasNextPage && vaultData.cards.length > 0;
      setHasMoreCards(hasMore);
    }
  }, [vaultData]);

  const vaultCards = allCards;

  const refundMutation = useMutation({
    mutationFn: async (cardIds: string[]) => {
      // Process only the specifically selected cards
      const allCardIds: string[] = [];
      let totalRefundAmount = 0;
      
      for (const cardId of cardIds) {
        const selectedCard = vaultCards?.find(c => c.id === cardId);
        if (selectedCard) {
          // For grouped common cards, send the grouped card ID directly
          if (selectedCard.id.startsWith('grouped-Common-Cards-D')) {
            allCardIds.push(cardId);
            // Calculate total refund amount by multiplying by quantity
            totalRefundAmount += parseFloat(selectedCard.refundCredit.toString()) * (selectedCard.quantity || 1);
          } else {
            // For regular cards, add the individual card ID
            allCardIds.push(cardId);
            totalRefundAmount += parseFloat(selectedCard.refundCredit.toString());
          }
        }
      }
      
      // Remove duplicates
      const uniqueCardIds = [...new Set(allCardIds)];
      
      // Limit the number of cards that can be refunded at once
      const MAX_REFUND_CARDS = 50;
      if (uniqueCardIds.length > MAX_REFUND_CARDS) {
        toast({
          title: "Too many cards selected",
          description: `Please select no more than ${MAX_REFUND_CARDS} cards to refund at once.`,
          variant: "destructive",
        });
        return;
      }
      
      // Make the refund API request first
      console.log("Starting refund processing for card IDs:", uniqueCardIds);
      console.log("Making API request to /api/vault/refund");
      
      const response = await apiRequest("POST", "/api/vault/refund", { cardIds: uniqueCardIds });
      console.log("✅ Refund request successful:", response);
      
      const data = await response.json();
      console.log("✅ Refund response data:", data);
      
      // Clear selected cards and show success popup
      setSelectedCards([]);
      setRefundSuccessData({
        cardCount: uniqueCardIds.length,
        totalAmount: Math.floor(totalRefundAmount)
      });
      setShowRefundSuccessPopup(true);
      
      // Invalidate and refetch the vault data to get the updated list
      await queryClient.invalidateQueries({ queryKey: ["/api/vault"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Reset the vault state to force a fresh load
      setAllCards([]);
      setCurrentPage(1);
      setHasMoreCards(false);
      
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

  console.log('Vault component render - vaultCards:', vaultCards);
  console.log('Vault component render - vaultLoading:', vaultLoading);
  console.log('Vault component render - vaultCards length:', vaultCards?.length || 0);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleSelectAll = () => {
    const allCardIds = originalFilteredCards.map(card => card.id);
    
    if (selectedCards.length === allCardIds.length && allCardIds.length > 0) {
      setSelectedCards([]);
    } else {
      setSelectedCards(allCardIds);
    }
  };

  const handleCardSelect = (cardId: string) => {
    setSelectedCards(prev => {
      const newSelection = prev.includes(cardId) 
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId];
      console.log('Card selection updated:', { cardId, newSelection, count: newSelection.length });
      return newSelection;
    });
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

  const handleShipSelected = async () => {
    console.log('handleShipSelected called with selectedCards:', selectedCards.length);
    
    if (selectedCards.length === 0) {
      toast({
        title: "No cards selected",
        description: "Please select cards to ship.",
        variant: "destructive",
      });
      return;
    }

    // Limit the number of cards that can be shipped at once to prevent storage quota issues
    const MAX_SHIPPING_CARDS = 50; // Increased limit to match refund limit
    if (selectedCards.length > MAX_SHIPPING_CARDS) {
      console.log('❌ Too many cards selected:', selectedCards.length, '>', MAX_SHIPPING_CARDS);
      toast({
        title: "Too many cards selected",
        description: `Please select no more than ${MAX_SHIPPING_CARDS} cards to ship at once.`,
        variant: "destructive",
      });
      return;
    }

    // Fetch user addresses
    setIsLoadingAddresses(true);
    try {
      const response = await apiRequest("GET", "/api/shipping/addresses");
      const addresses = await response.json();
      setUserAddresses(addresses);
      
      if (addresses.length === 0) {
        toast({
          title: "No addresses found",
          description: "Please add an address first before shipping cards.",
          variant: "destructive",
        });
        setIsLoadingAddresses(false);
        return;
      }
      
      // Set default address if available
      const defaultAddress = addresses.find((addr: any) => addr.isDefault);
      if (defaultAddress) {
        setSelectedAddress(defaultAddress.id);
      }
      
    } catch (error) {
      console.error('❌ Failed to fetch addresses:', error);
      toast({
        title: "Error",
        description: "Failed to load addresses. Please try again.",
        variant: "destructive",
      });
      setIsLoadingAddresses(false);
      return;
    }
    
    setIsLoadingAddresses(false);
    setShowShippingPopup(true);
  };

  const fetchUserAddresses = async () => {
    setIsLoadingAddresses(true);
    try {
      const response = await apiRequest("GET", "/api/shipping/addresses");
      const addresses = await response.json();
      setUserAddresses(addresses);
    } catch (error) {
      console.error('❌ Failed to fetch addresses:', error);
      toast({
        title: "Error",
        description: "Failed to load addresses.",
        variant: "destructive",
      });
    }
    setIsLoadingAddresses(false);
  };

  const createShippingRequest = async () => {
    if (!selectedAddress) {
      toast({
        title: "No address selected",
        description: "Please select a shipping address.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingShippingRequest(true);
    
    try {
      // Prepare the selected cards data
      const selectedCardsData = vaultCards?.filter(card => selectedCards.includes(card.id))
        .map(card => {
          console.log('Vault card data:', JSON.stringify(card, null, 2));
          return {
            id: card.id,
            name: card.cardName,
            tier: card.cardTier,
            qty: card.quantity,
            credit: card.refundCredit,
            imageUrl: card.cardImageUrl,
            cardImageUrl: card.cardImageUrl
          };
        }) || [];

      const totalValue = selectedCardsData.reduce((total, card) => {
        return total + (parseFloat(card.credit?.toString() || '0') * card.qty);
      }, 0);

      const requestData = {
        addressId: selectedAddress,
        items: selectedCardsData,
        totalValue: totalValue
      };

      console.log('Sending shipping request data:', JSON.stringify(requestData, null, 2));
      const response = await apiRequest("POST", "/api/shipping/requests", requestData);
      const responseData = await response.json();
      
      console.log('Shipping request response:', responseData);
      
      // Show success popup with summary
      setShowShippingSuccessPopup(true);
      setShippingSuccessData({
        requestId: responseData.id?.slice(-8) || 'N/A',
        totalCards: selectedCards.length,
        totalValue: totalValue
      });

      // Close popup and clear selection
      setShowShippingPopup(false);
      setSelectedCards([]);
      setSelectedAddress("");
      
      // Refresh vault data
      queryClient.invalidateQueries({ queryKey: ["/api/vault"] });
      
      // Reset the vault state to force a fresh load
      setAllCards([]);
      setCurrentPage(1);
      setHasMoreCards(false);
      
    } catch (error) {
      console.error('❌ Failed to create shipping request:', error);
      toast({
        title: "Error",
        description: "Failed to create shipping request. Please try again.",
        variant: "destructive",
      });
    }
    
    setIsCreatingShippingRequest(false);
  };

  // No need for tier mapping anymore since we're using direct tier codes
  const getTierMapping = (filterValue: string) => {
    return filterValue; // Direct mapping since database now uses D, C, B, A, S, SS, SSS
  };

  // Function to condense only common cards (D tier) - hit cards are already grouped by backend
  const condenseCards = (cards: UserCard[]) => {
    // The backend already handles grouping, so we just return the cards as-is
    // The backend groups D-tier cards and keeps hit cards separate
    return cards;
  };

  const filteredCards = condenseCards(
    vaultCards?.filter(card => {
      const matchesTier = filterTier === "all" || card.cardTier === getTierMapping(filterTier);
      const matchesSearch = searchQuery === "" || 
        card.cardName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.cardTier?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTier && matchesSearch;
    }) || []
  );

  const originalFilteredCards = vaultCards?.filter(card => {
    const matchesTier = filterTier === "all" || card.cardTier === getTierMapping(filterTier);
    const matchesSearch = searchQuery === "" || 
      card.cardName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.cardTier?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTier && matchesSearch;
  }) || [];

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
                    {originalFilteredCards.reduce((sum, card) => sum + card.quantity, 0)}
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
              <div className="flex flex-col space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                  <Input
                    type="text"
                    placeholder="Search cards by name or tier..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10 bg-[#26263A]/50 border-[#26263A] text-[#E5E7EB] placeholder-[#9CA3AF] focus:border-[#7C3AED] focus:ring-[#7C3AED]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF] hover:text-[#E5E7EB] transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>

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
                    {selectedCards.length === originalFilteredCards.length ? "Deselect All" : `Select All (${originalFilteredCards.length})`}
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
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        Refunding...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refund Selected
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    disabled={selectedCards.length === 0}
                    onClick={() => {
                      console.log('Ship button clicked, selected cards:', selectedCards.length);
                      handleShipSelected();
                    }}
                    className="bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] hover:from-[#6D28D9] hover:to-[#0891B2] text-white border-0 disabled:bg-[#374151] disabled:text-[#9CA3AF]"
                    data-testid="button-ship-selected"
                    title={selectedCards.length === 0 ? "Select cards first to ship them" : `Ship ${selectedCards.length} selected cards`}
                  >
                    <Truck className="w-4 h-4 mr-2" />
                    Ship Cards {selectedCards.length > 0 && `(${selectedCards.length})`}
                  </Button>
                </div>
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
                  {searchQuery 
                    ? "No Cards Found" 
                    : filterTier === "all" 
                      ? "No Cards Yet" 
                      : `No ${tiers.find(t => t.value === filterTier)?.label} Cards`
                  }
                </h3>
                <p className="text-[#9CA3AF] mb-6">
                  {searchQuery 
                    ? `No cards match "${searchQuery}". Try a different search term or clear the search.`
                    : filterTier === "all" 
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
                  ? "grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2"
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

            {/* Loading More Cards Indicator */}
            {isLoadingMore && (
              <motion.div 
                className="flex justify-center items-center gap-4 mt-8 mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6 }}
              >
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#7C3AED]"></div>
                  <span className="text-sm text-[#9CA3AF]">Loading more cards...</span>
                </div>
              </motion.div>
            )}

            {/* Cards Info */}
            {vaultData && (
              <motion.div 
                className="flex justify-center items-center gap-4 mt-8 mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6 }}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-[#9CA3AF]">
                    Showing {vaultCards.length} of {vaultData.pagination?.totalCount || 0} cards
                  </span>
                  {hasMoreCards && (
                    <Button
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="bg-[#1E1E2E] hover:bg-[#2A2A3E] text-white border-[#26263A]"
                    >
                      {isLoadingMore ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          Load More (16)
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </motion.section>
        </div>
      </main>
      
      {/* Shipping Popup Dialog */}
      <Dialog open={showShippingPopup} onOpenChange={setShowShippingPopup}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Truck className="w-5 h-5" />
              Ship Selected Cards
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Review your selected cards and choose a shipping address
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Selected Cards Summary */}
            <div>
              <h3 className="font-semibold mb-3 text-white">Selected Cards ({selectedCards.length})</h3>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {(() => {
                  // Group selected cards by their properties
                  const selectedCardsData = vaultCards?.filter(card => selectedCards.includes(card.id)) || [];
                  const groupedSelectedCards = selectedCardsData.reduce((groups, card) => {
                    const key = `${card.cardName}-${card.cardTier}`;
                    if (!groups[key]) {
                      groups[key] = {
                        cardName: card.cardName,
                        cardTier: card.cardTier,
                        cardImageUrl: card.cardImageUrl,
                        quantity: 0,
                        firstCard: card
                      };
                    }
                    groups[key].quantity += card.quantity || 1;
                    return groups;
                  }, {} as Record<string, {
                    cardName: string;
                    cardTier: string;
                    cardImageUrl: string;
                    quantity: number;
                    firstCard: any;
                  }>);

                  return Object.values(groupedSelectedCards).map((groupedCard, index) => (
                    <div key={`${groupedCard.cardName}-${groupedCard.cardTier}-${index}`} className="flex items-center gap-3 p-3 bg-muted rounded-lg border border-border">
                      <div className="w-12 h-16 bg-gradient-to-br from-[#7C3AED] to-[#22D3EE] rounded flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                        {groupedCard.cardImageUrl ? (
                          <img 
                            src={groupedCard.cardImageUrl} 
                            alt={groupedCard.cardName}
                            className="w-full h-full object-cover rounded"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`absolute inset-0 flex items-center justify-center ${groupedCard.cardImageUrl ? 'hidden' : 'flex'}`}>
                          <span className="text-xs font-bold text-white">{groupedCard.cardTier}</span>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground truncate">{groupedCard.cardName}</div>
                        <div className="text-sm text-muted-foreground">
                          {groupedCard.cardTier}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="text-sm text-muted-foreground">
                          Quantity: <span className="text-foreground font-medium">{groupedCard.quantity}</span>
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Address Selection */}
            <div>
              <Label htmlFor="address" className="text-foreground">Shipping Address *</Label>
              {isLoadingAddresses ? (
                <div className="mt-2 p-3 bg-muted rounded-lg text-center border border-border">
                  <div className="text-muted-foreground">Loading addresses...</div>
                </div>
              ) : userAddresses.length === 0 ? (
                <div className="mt-2 p-3 bg-muted rounded-lg text-center border border-border">
                  <div className="text-muted-foreground mb-2">No addresses found</div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setShowShippingPopup(false);
                      window.location.href = '/shipping?tab=manage';
                    }}
                    className="border-border text-foreground hover:bg-muted"
                  >
                    Add Address
                  </Button>
                </div>
              ) : (
                <select
                  id="address"
                  value={selectedAddress}
                  onChange={(e) => setSelectedAddress(e.target.value)}
                  className="w-full mt-1 p-3 border border-border rounded-md focus:ring-2 focus:ring-[#7C3AED] focus:border-[#7C3AED] bg-background text-foreground text-sm"
                >
                  <option value="" className="text-foreground">Select an address</option>
                  {userAddresses.map((address) => (
                    <option key={address.id} value={address.id} className="text-foreground">
                      {address.name} - {address.address}, {address.city}, {address.state}
                      {address.isDefault && " (Default)"}
                    </option>
                  ))}
                </select>
              )}
            </div>

          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowShippingPopup(false)}
              disabled={isCreatingShippingRequest}
              className="w-full sm:w-auto border-border text-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              onClick={createShippingRequest}
              disabled={!selectedAddress || isCreatingShippingRequest || userAddresses.length === 0}
              className="w-full sm:w-auto bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] hover:from-[#6D28D9] hover:to-[#0891B2] text-white"
            >
              {isCreatingShippingRequest ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Truck className="w-4 h-4 mr-2" />
                  Create Shipping Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Success Popup */}
      <Dialog open={showRefundSuccessPopup} onOpenChange={setShowRefundSuccessPopup}>
        <DialogContent className="max-w-md bg-gray-800 border-green-600">
          <DialogHeader className="pb-4 border-b border-green-600">
            <DialogTitle className="text-center text-2xl font-bold text-green-400">
              Refund Success
            </DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-[#9CA3AF]">Total cards:</span>
                <span className="text-white font-semibold">{refundSuccessData?.cardCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#9CA3AF]">Total amount refunded:</span>
                <span className="font-bold bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
                  {refundSuccessData?.totalAmount} CR
                </span>
              </div>
            </div>
            <div className="text-sm text-[#9CA3AF] text-center mb-6">
              Your credits have been added to your account.
            </div>
            <Button 
              onClick={() => setShowRefundSuccessPopup(false)}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0"
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shipping Success Popup */}
      <Dialog open={showShippingSuccessPopup} onOpenChange={setShowShippingSuccessPopup}>
        <DialogContent className="max-w-md bg-gray-800 border-gray-700">
          <DialogHeader className="pb-4 border-b border-gray-700">
            <DialogTitle className="text-center text-2xl font-bold text-white">
              Shipping Request Created
            </DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-[#9CA3AF]">Request ID:</span>
                <span className="text-white font-semibold">#{shippingSuccessData?.requestId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#9CA3AF]">Total cards:</span>
                <span className="text-white font-semibold">{shippingSuccessData?.totalCards}</span>
              </div>
            </div>
            <div className="text-sm text-[#9CA3AF] text-center mb-6">
              Your shipping request has been submitted successfully. We'll process it within 1-2 business days.
            </div>
            <Button 
              onClick={() => setShowShippingSuccessPopup(false)}
              className="w-full bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] hover:from-[#6D28D9] hover:to-[#0891B2] text-white border-0"
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Navigation Footer */}
      <NavigationFooter />
    </div>
  );
}
