import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Star, Zap, Crown, Sparkles, Coins, Users, Gift, Eye, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useToast } from '../hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface ClassicPackPopupProps {
  pack: {
    id: string;
    name: string;
    description: string;
    imageUrl?: string;
    expansionId: string;
    price: number;
  };
  userCredits: number;
  onClose: () => void;
  onOpenPack: () => void;
}

interface Card {
  id: string;
  name: string;
  tier: string;
  imageUrl: string;
  marketValue: string;
}

export function ClassicPackPopup({ pack, userCredits, onClose, onOpenPack }: ClassicPackPopupProps) {
  console.log('🔍 ClassicPackPopup rendered with:', { pack, userCredits, onClose, onOpenPack });
  
  const [isLoading, setIsLoading] = useState(false);
  const [showAllCards, setShowAllCards] = useState(false);
  const { toast } = useToast();
  
  const packCost = pack.price; // Use the set's price
  const canAfford = userCredits >= packCost;

  // Fetch the prize pool for this pack
  const { data: prizePool, isLoading: isLoadingPrizePool } = useQuery({
    queryKey: [`/api/admin/classic-packs/sets/${pack.id}/cards`],
    queryFn: async () => {
      const response = await fetch(`/api/admin/classic-packs/sets/${pack.id}/cards`);
      if (!response.ok) throw new Error('Failed to fetch prize pool');
      return response.json();
    },
    enabled: !!pack.id,
  });

  // Fetch card details for the prize pool
  const { data: cards, isLoading: isLoadingCards } = useQuery({
    queryKey: ['/api/admin/cards'],
    queryFn: async () => {
      const response = await fetch('/api/admin/cards');
      if (!response.ok) throw new Error('Failed to fetch cards');
      return response.json();
    },
  });

  // Get the actual card details from the prize pool
  const prizePoolCards = React.useMemo(() => {
    if (!prizePool || !cards) return [];
    
    return prizePool
      .map((cardId: string) => cards.find((card: Card) => card.id === cardId))
      .filter(Boolean);
  }, [prizePool, cards]);

  // Get top hits (SS and SSS cards)
  const topHits = React.useMemo(() => {
    return prizePoolCards.filter((card: Card) => ['SS', 'SSS'].includes(card.tier));
  }, [prizePoolCards]);

  // Get cards to display (top hits or all cards)
  const displayCards = showAllCards ? prizePoolCards : topHits;

  const getTierColor = (tier: string) => {
    const colors = {
      'D': 'from-gray-500 to-gray-600',
      'C': 'from-gray-400 to-gray-500',
      'UC': 'from-green-500 to-green-600',
      'R': 'from-blue-500 to-blue-600',
      'SR': 'from-purple-500 to-purple-600',
      'SS': 'from-orange-500 to-orange-600',
      'SSS': 'from-red-500 to-red-600',
    };
    return colors[tier as keyof typeof colors] || colors['D'];
  };

  const getTierIcon = (tier: string) => {
    if (tier === 'SSS') return <Crown className="w-4 h-4" />;
    if (tier === 'SS') return <Star className="w-4 h-4" />;
    if (tier === 'SR') return <Sparkles className="w-4 h-4" />;
    if (tier === 'R') return <Zap className="w-4 h-4" />;
    return <Package className="w-4 h-4" />;
  };

  const handleOpenPack = async () => {
    console.log('🔍 ClassicPackPopup handleOpenPack called');
    console.log('🔍 canAfford:', canAfford);
    console.log('🔍 userCredits:', userCredits);
    console.log('🔍 packCost:', packCost);
    
    if (!canAfford) {
      console.log('❌ Cannot afford pack, showing toast');
      toast({
        title: "Insufficient Credits",
        description: `You need ${packCost} credits but only have ${userCredits.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    console.log('✅ Can afford pack, calling onOpenPack');
    setIsLoading(true);
    try {
      await onOpenPack();
      console.log('✅ onOpenPack completed successfully');
    } catch (error) {
      console.error('❌ onOpenPack failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700 max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Clean Header */}
          <div className="p-4 md:p-6 border-b border-gray-700">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {/* Pack Image */}
                {pack.imageUrl && (
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border-2 border-emerald-500/30 mx-auto mb-4">
                    <img
                      src={pack.imageUrl}
                      alt={pack.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                
                {/* Title */}
                <h2 className="text-2xl md:text-3xl font-headline-bold text-white text-center mb-3">
                  <span className="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                    {pack.name}
                  </span>
                </h2>
                
                {/* Description */}
                <p className="text-white text-sm md:text-base text-center leading-relaxed mb-4 max-w-2xl mx-auto">
                  {pack.description || `Experience the thrill of opening authentic ${pack.name} packs. Each pack contains carefully curated cards with the chance to pull ultra-rare hits.`}
                </p>
                
                {/* Pack Info */}
                <div className="flex items-center justify-center space-x-6 text-center">
                  <div className="flex items-center space-x-2">
                    <Package className="w-4 h-4 text-white" />
                    <span className="text-white text-sm">8 Commons</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Crown className="w-4 h-4 text-yellow-400" />
                    <span className="text-white text-sm">1 Hit Card</span>
                  </div>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="luxury-button-ghost text-white flex-shrink-0 ml-4"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {/* Top Hits Section */}
            <div className="mb-4 md:mb-6">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <h3 className="text-lg md:text-xl font-gaming text-white flex items-center">
                  <Crown className="w-5 h-5 md:w-6 md:h-6 mr-2 text-yellow-400" />
                  <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                    Top Hits
                  </span>
                </h3>
                <Badge variant="outline" className="bg-gray-700 border-gray-600 text-emerald-400 text-xs md:text-sm">
                  {topHits.length} Ultra-Rare
                </Badge>
              </div>
              
              {isLoadingCards || isLoadingPrizePool ? (
                <div className="text-center py-8 md:py-12">
                  <div className="animate-spin w-6 h-6 md:w-8 md:h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-white text-sm md:text-base">Loading top hits...</p>
                </div>
              ) : topHits.length > 0 ? (
                <div className="flex overflow-x-auto scrollbar-hide gap-3 md:gap-4 pb-2">
                  {topHits
                    .sort((a: any, b: any) => {
                      // Prioritize SSS cards first, then SS cards
                      if (a.tier === 'SSS' && b.tier !== 'SSS') return -1;
                      if (b.tier === 'SSS' && a.tier !== 'SSS') return 1;
                      if (a.tier === 'SS' && b.tier !== 'SS') return -1;
                      if (b.tier === 'SS' && a.tier !== 'SS') return 1;
                      return 0;
                    })
                    .map((card: Card) => (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex-shrink-0 w-32 md:w-36 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg md:rounded-xl p-3 md:p-4 border border-gray-700 hover:border-emerald-500/50 transition-all duration-300"
                    >
                      <div className="aspect-[3/4] mb-2 md:mb-3 rounded-lg overflow-hidden bg-gray-700">
                        <img
                          src={card.imageUrl}
                          alt={card.name}
                          className="w-full h-full object-cover object-center"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                      <h4 className="text-sm md:text-base font-medium text-white truncate mb-1 md:mb-2">{card.name}</h4>
                      <Badge className={`w-full justify-center bg-gradient-to-r ${getTierColor(card.tier)} text-white text-xs md:text-sm`}>
                        {getTierIcon(card.tier)}
                        <span className="ml-1">{card.tier}</span>
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 md:py-12 bg-gray-800/50 rounded-xl border border-gray-700">
                  <Crown className="w-10 h-10 md:w-12 md:h-12 text-white mx-auto mb-4" />
                  <p className="text-white text-sm md:text-base">No ultra-rare cards in this pack yet</p>
                </div>
              )}
            </div>

            {/* View All Cards Button */}
            <div className="text-center mb-4 md:mb-6">
              <Button
                onClick={() => setShowAllCards(!showAllCards)}
                variant="outline"
                size="sm"
                className="luxury-button-secondary text-white text-sm"
              >
                <Eye className="w-4 h-4 mr-2" />
                {showAllCards ? 'Show Top Hits Only' : 'View All Cards'}
                <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showAllCards ? 'rotate-180' : ''}`} />
              </Button>
            </div>

            {/* All Cards Section (when expanded) */}
            {showAllCards && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 md:mb-6"
              >
                <h3 className="text-base md:text-lg font-gaming text-white mb-3 md:mb-4 flex items-center">
                  <Package className="w-4 h-4 md:w-5 md:h-5 mr-2 text-emerald-400" />
                  All Cards ({prizePoolCards.length})
                </h3>
                
                <div className="space-y-6 max-h-64 md:max-h-80 overflow-y-auto">
                  {/* Group cards by tier */}
                  {['SSS', 'SS', 'S', 'A', 'B', 'C'].map(tier => {
                    const tierCards = prizePoolCards.filter((card: Card) => card.tier === tier);
                    if (tierCards.length === 0) return null;
                    
                    return (
                      <div key={tier} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge className={`bg-gradient-to-r ${getTierColor(tier)} text-white text-sm px-3 py-1`}>
                            {getTierIcon(tier)}
                            <span className="ml-1">{tier} Tier</span>
                          </Badge>
                          <span className="text-white text-sm">({tierCards.length} cards)</span>
                        </div>
                        
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 md:gap-3">
                          {tierCards.map((card: Card) => (
                            <div
                              key={card.id}
                              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-1.5 md:p-2 border border-gray-700 hover:border-emerald-500/50 transition-all duration-300"
                            >
                              <div className="aspect-[3/4] mb-1 rounded overflow-hidden bg-gray-700">
                                <img
                                  src={card.imageUrl}
                                  alt={card.name}
                                  className="w-full h-full object-cover object-center"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                              <h4 className="text-xs font-medium text-white truncate">{card.name}</h4>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>

          {/* Fixed Bottom Bar with Credits and Open Pack */}
          <div className="p-4 md:p-6 border-t border-gray-700 bg-gray-900/50 backdrop-blur-sm">
            {/* Mobile Layout */}
            <div className="block md:hidden space-y-4">
              {/* Credit Information - Mobile */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Coins className="w-4 h-4 text-yellow-500" />
                  <span className="text-white font-semibold text-sm">Available:</span>
                  <span className="text-yellow-400 font-bold">{userCredits.toFixed(2)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4 text-emerald-500" />
                  <span className="text-white font-semibold text-sm">Cost:</span>
                  <span className="text-emerald-400 font-bold">{packCost}</span>
                </div>
              </div>
              
              {/* Action Buttons - Mobile */}
              <div className="flex items-center space-x-3">
                <Button
                  onClick={onClose}
                  variant="outline"
                  size="sm"
                  className="luxury-button-secondary text-white flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleOpenPack}
                  disabled={!canAfford || isLoading}
                  size="sm"
                  className={`flex-1 ${
                    canAfford
                      ? 'luxury-button-primary text-white'
                      : 'luxury-button-ghost text-white cursor-not-allowed opacity-50'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Opening...
                    </>
                  ) : (
                    <>
                      <Package className="w-4 h-4 mr-2" />
                      Open Pack
                    </>
                  )}
                </Button>
              </div>

              {!canAfford && (
                <div className="text-center">
                  <p className="text-red-400 text-xs">
                    Insufficient credits. You need {packCost} credits to open this pack.
                  </p>
                </div>
              )}
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:block">
              <div className="flex items-center justify-between">
                {/* Credit Information */}
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Coins className="w-5 h-5 text-yellow-500" />
                    <span className="text-white font-semibold">Available:</span>
                    <span className="text-yellow-400 font-bold text-lg">{userCredits.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Package className="w-5 h-5 text-emerald-500" />
                    <span className="text-white font-semibold">Cost:</span>
                    <span className="text-emerald-400 font-bold text-lg">{packCost}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-white">After:</span>
                    <span className={`font-bold text-lg ${canAfford ? 'text-white' : 'text-red-400'}`}>
                      {(userCredits - packCost).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-4">
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="luxury-button-secondary text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleOpenPack}
                    disabled={!canAfford || isLoading}
                    className={`px-8 py-3 text-lg font-semibold ${
                      canAfford
                        ? 'luxury-button-primary text-white'
                        : 'luxury-button-ghost text-white cursor-not-allowed opacity-50'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        Opening...
                      </>
                    ) : (
                      <>
                        <Package className="w-5 h-5 mr-2" />
                        Open Pack
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {!canAfford && (
                <div className="mt-3 text-center">
                  <p className="text-red-400 text-sm">
                    Insufficient credits. You need {packCost} credits to open this pack.
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
