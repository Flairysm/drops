import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { Package, BarChart3, Gift, Play, Sparkles, X, Coins } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { PackOpeningAnimation } from "@/components/PackOpeningAnimation";

interface ClassicPackPopupProps {
  pack: any;
  isOpen: boolean;
  onClose: () => void;
  onOpenPack: (packId: string) => void;
}

export function ClassicPackPopup({ pack, isOpen, onClose, onOpenPack }: ClassicPackPopupProps) {
  const [packData, setPackData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [openedCards, setOpenedCards] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [revealedCards, setRevealedCards] = useState<number>(0);
  const [showTapToReveal, setShowTapToReveal] = useState(false);
  const [showHitCardBack, setShowHitCardBack] = useState(false);
  const [showContinueButton, setShowContinueButton] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [packResult, setPackResult] = useState<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch detailed pack data when popup opens
  useEffect(() => {
    if (isOpen && pack?.id) {
      fetchPackDetails();
    }
  }, [isOpen, pack?.id]);

  const fetchPackDetails = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('GET', `/api/admin/classic-packs/${pack.id}`);
      const data = await response.json();
      setPackData(data);
    } catch (error) {
      console.error('Error fetching pack details:', error);
      toast({
        title: "Error",
        description: "Failed to load pack details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPack = async () => {
    if (!pack?.id) return;
    
    setIsOpening(true);
    try {
      console.log('🎮 Opening Black Bolt pack:', pack.id);
      const response = await apiRequest('POST', `/api/classic-packs/purchase/${pack.id}`);
      console.log('🎮 Response status:', response.status);
      const result = await response.json();
      console.log('🎮 Response result:', result);
      console.log('🎮 Response result keys:', Object.keys(result));
      console.log('🎮 Response result.success:', result.success);
      
      if (result.success) {
        console.log('🎮 Pack opening successful, showing animation');
        
        // Transform the result to match PackOpeningAnimation format
        const transformedResult = {
          ...result,
          packCards: result.packCards.map((card: any, index: number) => ({
            ...card,
            isHit: card.isHit || index === result.hitCardPosition,
            position: index
          }))
        };
        
        console.log('🎮 Transformed result:', transformedResult);
        
        // Set the pack result and show animation
        setPackResult(transformedResult);
        setShowAnimation(true);
        
        // Invalidate queries to refresh user data
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        queryClient.invalidateQueries({ queryKey: ["/api/vault"] });
      } else {
        console.error('🎮 Pack opening failed:', result.message);
        throw new Error(result.message || 'Failed to open pack');
      }
    } catch (error: any) {
      console.error('🎮 Error opening pack:', error);
      toast({
        title: "Error Opening Pack",
        description: error.message || "Failed to open pack",
        variant: "destructive",
      });
    } finally {
      setIsOpening(false);
    }
  };

  const handleAnimationComplete = () => {
    setShowAnimation(false);
    setPackResult(null);
    toast({
      title: "Pack Opened!",
      description: "Your cards have been added to your vault!",
      variant: "default",
    });
  };

  const revealCardsProgressively = (cards: any[]) => {
    let currentRevealed = 0;
    const revealInterval = setInterval(() => {
      currentRevealed++;
      setRevealedCards(currentRevealed);
      
      if (currentRevealed >= 7) {
        clearInterval(revealInterval);
        // Add a small pause before showing the hit card back and tap button
        setTimeout(() => {
          setShowHitCardBack(true);
          setShowTapToReveal(true);
        }, 500); // 500ms pause after 7th card
      }
    }, 150); // Reveal a card every 150ms for consistent timing
  };

  const handleRevealLastCard = () => {
    setRevealedCards(8);
    setShowTapToReveal(false);
    
    // Count hit cards for the toast message
    const hitCount = openedCards.filter(card => 
      card.card?.tier && ['C', 'B', 'A', 'S', 'SS', 'SSS'].includes(card.card.tier)
    ).length;
    
    // Add a small delay for the hit card animation to complete, then show continue button
    setTimeout(() => {
      toast({
        title: "Pack Complete!",
        description: `You received 8 cards with ${hitCount} hit card(s)!`,
      });
      setShowContinueButton(true);
    }, 300);
  };

  const handleCloseResults = () => {
    setShowResults(false);
    setOpenedCards([]);
    setRevealedCards(0);
    setShowTapToReveal(false);
    setShowHitCardBack(false);
    setShowContinueButton(false);
  };

  if (!pack) return null;

  return (
    <>
      {/* Pack Opening Animation */}
      {showAnimation && packResult && (
        <PackOpeningAnimation
          packCards={packResult.packCards}
          hitCardPosition={packResult.hitCardPosition}
          onComplete={handleAnimationComplete}
          packType="classic"
        />
      )}

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0B0B12] border-[#26263A]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#E5E7EB] flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            {pack.name}
          </DialogTitle>
        </DialogHeader>


        <div className="space-y-6">
          {/* Pack Image */}
          <div className="flex justify-center">
            <Card className="w-full max-w-md h-64 bg-[#151521] border-[#26263A] overflow-hidden">
              <CardContent className="p-0 h-full">
                {pack.imageUrl ? (
                  <img 
                    src={pack.imageUrl} 
                    alt={pack.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                    <Package className="w-16 h-16 text-white opacity-50" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* User Info Section - Gaming Card Style */}
          {user && (
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <Card className="gaming-card bg-gray-900/95 border-gray-600 shadow-lg">
                <CardContent className="p-3 sm:p-4 text-center">
                  <div className="text-xl sm:text-2xl font-bold text-white">
                    {user.credits?.toLocaleString() || 0}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-200 font-medium">Your Credits</div>
                </CardContent>
              </Card>

              <Card className="gaming-card bg-gray-900/95 border-gray-600 shadow-lg">
                <CardContent className="p-3 sm:p-4 text-center">
                  <div className="text-xl sm:text-2xl font-bold text-orange-500">
                    {pack.price}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-200 font-medium">Pack Cost</div>
                </CardContent>
              </Card>

              <Card className="gaming-card bg-gray-900/95 border-gray-600 shadow-lg">
                <CardContent className="p-3 sm:p-4 text-center">
                  <div className="text-lg sm:text-xl font-bold text-white mb-1">
                    Classic
                  </div>
                  <div className="text-xs sm:text-sm text-gray-200 font-medium">Pack Type</div>
                </CardContent>
              </Card>
            </div>
          )}


          {/* Pack Description */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-[#E5E7EB] mb-2">Description</h3>
            <p className="text-[#9CA3AF] leading-relaxed max-w-2xl mx-auto">
              {pack.description || "A classic pack containing various cards with different rarities."}
            </p>
          </div>

          {/* Open Pack Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleOpenPack}
              disabled={isOpening || (user && user.credits < pack.price)}
              className={`w-full max-w-md font-semibold py-3 rounded-lg transition-all duration-300 ${
                user && user.credits < pack.price
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]'
              }`}
            >
              {isOpening ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Opening Pack...
                </>
              ) : user && user.credits < pack.price ? (
                <>
                  <Coins className="w-4 h-4 mr-2" />
                  Insufficient Credits
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Open Pack
                </>
              )}
            </Button>
          </div>

          {/* Tabs for detailed information */}
          <Tabs defaultValue="prizepool" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-[#151521] border border-[#26263A]">
              <TabsTrigger value="prizepool" className="data-[state=active]:bg-[#26263A] data-[state=active]:text-[#22D3EE]">
                <Gift className="w-4 h-4 mr-2" />
                Prize Pool
              </TabsTrigger>
              <TabsTrigger value="stats" className="data-[state=active]:bg-[#26263A] data-[state=active]:text-[#22D3EE]">
                <BarChart3 className="w-4 h-4 mr-2" />
                Statistics
              </TabsTrigger>
            </TabsList>


            <TabsContent value="stats" className="mt-6">
              <Card className="gaming-card bg-gradient-to-br from-gray-900 to-gray-800 border-gray-600 shadow-2xl">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Pack Statistics</h3>
                  <div className="text-center text-gray-300">
                    <p>Pack statistics are displayed above the description.</p>
                    <p className="text-sm text-gray-400 mt-2">Check the Prize Pool tab to see available cards.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="prizepool" className="mt-6">
              <Card className="gaming-card bg-gradient-to-br from-gray-900 to-gray-800 border-gray-600 shadow-2xl">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Prize Pool</h3>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#22D3EE]"></div>
                    </div>
                  ) : packData?.cards?.length > 0 ? (
                    <div className="space-y-6">
                      {['SSS', 'SS', 'S', 'A', 'B', 'C'].map((tier) => {
                        const tierCards = packData.cards.filter((card: any) => 
                          (card.card?.tier || 'D') === tier
                        );
                        
                        if (tierCards.length === 0) return null;
                        
                        return (
                          <div key={tier} className="space-y-3">
                            <div className="flex items-center gap-3">
                              <Badge 
                                className={`text-sm font-bold px-3 py-1 ${
                                  tier === 'SSS' ? 'bg-red-500' :
                                  tier === 'SS' ? 'bg-purple-500' :
                                  tier === 'S' ? 'bg-blue-500' :
                                  tier === 'A' ? 'bg-green-500' :
                                  tier === 'B' ? 'bg-yellow-500' :
                                  tier === 'C' ? 'bg-orange-500' :
                                  'bg-gray-500'
                                } text-white`}
                              >
                                {tier} Tier
                              </Badge>
                              <span className="text-gray-300 text-sm">
                                {tierCards.length} card{tierCards.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                              {tierCards.map((card: any, index: number) => (
                                <motion.div
                                  key={`${card.id}-${index}`}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: index * 0.05 }}
                                  className="relative group"
                                >
                                  <img 
                                    src={card.card?.imageUrl || card.imageUrl} 
                                    alt={card.card?.name || card.name}
                                    className="w-full aspect-[3/4] rounded-lg object-cover border-2 border-gray-600 hover:border-[#22D3EE]/50 transition-colors duration-200"
                                  />
                                  {card.quantity > 1 && (
                                    <div className="absolute -top-1 -right-1 bg-[#22D3EE] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                      {card.quantity}
                                    </div>
                                  )}
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-300">
                      No cards available in this pack.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Pack Opening Animation */}
          <AnimatePresence>
            {isOpening && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
              >
                <motion.div
                  initial={{ scale: 0.5, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="bg-gradient-to-br from-orange-500 to-red-500 rounded-full p-8 shadow-[0_0_50px_rgba(249,115,22,0.8)]"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Package className="w-16 h-16 text-white" />
                  </motion.div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="absolute bottom-1/4 text-center"
                >
                  <h3 className="text-2xl font-bold text-white mb-2">Opening Pack...</h3>
                  <p className="text-white/80">Please wait while we reveal your cards!</p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pack Opening Results */}
          <AnimatePresence>
            {showResults && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
              >
                <motion.div
                  initial={{ scale: 0.8, y: 50 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="bg-[#151521] border border-[#26263A] rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto"
                >
                  <div className="flex items-center justify-center mb-6">
                    <h2 className="text-2xl font-bold text-[#E5E7EB] flex items-center gap-2">
                      <Sparkles className="w-6 h-6 text-[#22D3EE]" />
                      Pack Opened!
                    </h2>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    {openedCards.map((card, index) => {
                      const isHitCard = card.card?.tier && ['C', 'B', 'A', 'S', 'SS', 'SSS'].includes(card.card.tier);
                      const isRevealed = index < revealedCards;
                      const isLastCard = index === 7;
                      
                      return (
                        <motion.div
                          key={`${card.id}-${index}`}
                          initial={{ opacity: 0, scale: 0.7, y: 15 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ 
                            delay: index * 0.05, 
                            duration: 0.6, 
                            ease: [0.25, 0.46, 0.45, 0.94],
                            type: "spring",
                            stiffness: 80,
                            damping: 25
                          }}
                          className={`bg-[#0B0B12] border rounded-lg hover:border-[#22D3EE]/50 transition-colors duration-200 relative aspect-[3/4] ${
                            isHitCard && isRevealed
                              ? 'border-[#22D3EE] shadow-[0_0_10px_rgba(34,211,238,0.3)]' 
                              : 'border-[#26263A]'
                          }`}
                        >
                          {isRevealed ? (
                            <div className="flex items-center justify-center h-full">
                              <img 
                                src={card.card?.tier === 'D' || !card.card?.tier || card.card?.name === 'Common Card' ? '/card-images/random-common-card.png' : (card.card?.imageUrl || card.imageUrl)} 
                                alt={card.card?.name || card.name}
                                className="w-full h-full rounded-lg object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              {isHitCard && showHitCardBack ? (
                                <img 
                                  src="/card-images/hit.png" 
                                  alt="Hit Card Back"
                                  className="w-full h-full rounded-lg object-cover"
                                />
                              ) : (
                                <div className="w-full h-full rounded-lg bg-[#26263A] flex items-center justify-center">
                                  <div className="text-4xl text-[#9CA3AF]">?</div>
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  {showTapToReveal && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="mt-6 text-center"
                    >
                      <Button
                        onClick={handleRevealLastCard}
                        className="bg-gradient-to-r from-[#22D3EE] to-[#7C3AED] hover:from-[#22D3EE]/80 hover:to-[#7C3AED]/80 text-white font-semibold px-8 py-3 rounded-lg text-lg animate-pulse"
                      >
                        <Sparkles className="w-5 h-5 mr-2" />
                        Tap to Reveal Final Card!
                      </Button>
                    </motion.div>
                  )}

                  {/* Continue Button - Only show after final card is revealed */}
                  {showContinueButton && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="mt-6 text-center"
                    >
                      <Button
                        onClick={handleCloseResults}
                        className="bg-gradient-to-r from-[#22D3EE] to-[#7C3AED] hover:from-[#22D3EE]/80 hover:to-[#7C3AED]/80 text-white font-semibold px-8 py-2 rounded-lg"
                      >
                        Continue
                      </Button>
                    </motion.div>
                  )}

                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
