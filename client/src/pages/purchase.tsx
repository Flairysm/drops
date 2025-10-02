import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { NavigationFooter } from "@/components/NavigationFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Package, ArrowLeft, Play } from "lucide-react";
import { Link } from "wouter";
import { PackOpeningAnimation } from "@/components/PackOpeningAnimation";

export default function Purchase() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const params = useParams();
  const packType = params.type; // 'classic' or 'special'
  const packId = params.id;

  const [packData, setPackData] = useState<any>(null);
  const [isLoadingPack, setIsLoadingPack] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [packResult, setPackResult] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch pack data
  useEffect(() => {
    if (packId && packType) {
      fetchPackData();
    }
  }, [packId, packType]);

  const fetchPackData = async () => {
    setIsLoadingPack(true);
    try {
      const endpoint = packType === 'classic' ? 'classic-packs' : 'special-packs';
      const response = await apiRequest('GET', `/api/admin/${endpoint}/${packId}`);
      const data = await response.json();
      setPackData(data);
    } catch (error) {
      console.error('Error fetching pack data:', error);
      toast({
        title: "Error",
        description: "Failed to load pack data",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPack(false);
    }
  };

  // Pack opening mutation
  const openPackMutation = useMutation({
    mutationFn: async () => {
      // Use the correct endpoint based on pack type
      const endpoint = packType === 'classic' 
        ? `/api/classic-packs/purchase/${packId}`
        : `/api/packs/open/${packId}`;
      
      console.log('🎮 Making API request to:', endpoint);
      console.log('🎮 Pack type:', packType);
      
      const response = await apiRequest("POST", endpoint);
      console.log('🎮 API response status:', response.status);
      console.log('🎮 API response ok:', response.ok);
      
      const result = await response.json();
      console.log('🎮 API response data:', result);
      
      return result;
    },
    onSuccess: (result) => {
      console.log('Pack opening result:', result);
      
      // Transform the result to match PackOpeningAnimation expectations
      const transformedResult = {
        ...result,
        packCards: result.packCards.map((card: any, index: number) => ({
          ...card,
          isHit: index === result.hitCardPosition,
          position: index
        }))
      };
      
      console.log('Transformed result for animation:', transformedResult);
      console.log('Hit card position:', result.hitCardPosition);
      console.log('Cards with isHit:', transformedResult.packCards.map((card: any) => ({ name: card.name, tier: card.tier, isHit: card.isHit })));
      
      setPackResult(transformedResult);
      setShowAnimation(true);
      
      // Invalidate queries to refresh user data and vault
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vault"] });
    },
    onError: (error: Error) => {
      console.error('Error opening pack:', error);
      toast({
        title: "Pack Opening Error",
        description: error.message,
        variant: "destructive",
      });
      setIsOpening(false);
    },
  });

  const handleOpenPack = async () => {
    if (!packData) return;
    
    console.log('🎮 Starting pack opening for:', packData.name);
    console.log('🎮 Pack type:', packType);
    console.log('🎮 Pack ID:', packId);
    
    setIsOpening(true);
    openPackMutation.mutate();
  };

  const handleAnimationComplete = () => {
    setShowAnimation(false);
    setIsOpening(false);
    setPackResult(null);
    
    toast({
      title: "Pack Opened!",
      description: "Your cards have been added to your vault!",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in to purchase packs</h1>
          <Link href="/login">
            <Button>Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navigation />

      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      <main className="pt-16 pb-16 relative z-10">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-10">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <Link href="/play">
              <Button variant="ghost" className="text-[#E5E7EB] hover:text-[#22D3EE]">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Games
              </Button>
            </Link>
          </motion.div>

          {/* Pack Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            {isLoadingPack ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#22D3EE]"></div>
              </div>
            ) : packData ? (
              <>
                {/* Pack Header */}
                <Card className="bg-[#151521] border-[#26263A]">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Pack Image */}
                      <div className="flex-shrink-0">
                        <div className="w-full lg:w-64 h-48 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                          {packData.imageUrl ? (
                            <img 
                              src={packData.imageUrl} 
                              alt={packData.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Package className="w-16 h-16 text-white opacity-50" />
                          )}
                        </div>
                      </div>

                      {/* Pack Info */}
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3">
                          <h1 className="text-2xl font-bold text-[#E5E7EB]">{packData.name}</h1>
                          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
                            {packType === 'classic' ? 'Classic Pack' : 'Special Pack'}
                          </Badge>
                        </div>

                        <p className="text-[#9CA3AF] leading-relaxed">
                          {packData.description || "A pack containing various cards with different rarities."}
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-[#0B0B12] border border-[#26263A] rounded-lg p-3">
                            <div className="text-sm text-[#9CA3AF]">Total Cards</div>
                            <div className="text-lg font-semibold text-[#E5E7EB]">
                              {packData.cards?.length || 0}
                            </div>
                          </div>
                          <div className="bg-[#0B0B12] border border-[#26263A] rounded-lg p-3">
                            <div className="text-sm text-[#9CA3AF]">Pack Price</div>
                            <div className="text-lg font-semibold text-[#22D3EE]">
                              {packData.price} Credits
                            </div>
                          </div>
                        </div>

                        <Button
                          onClick={handleOpenPack}
                          disabled={isOpening}
                          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-3 rounded-lg shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] transition-all duration-300"
                        >
                          {isOpening ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Opening Pack...
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Open Pack
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Prize Pool Preview */}
                {packData.cards && packData.cards.length > 0 && (
                  <Card className="bg-[#151521] border-[#26263A]">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-[#E5E7EB] mb-4">Possible Rewards</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {packData.cards.slice(0, 6).map((card: any, index: number) => (
                          <motion.div
                            key={card.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-[#0B0B12] border border-[#26263A] rounded-lg p-4 hover:border-[#22D3EE]/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <img 
                                src={card.card?.imageUrl || card.imageUrl} 
                                alt={card.card?.name || card.name}
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                              <div className="flex-1">
                                <h4 className="font-medium text-[#E5E7EB] text-sm">
                                  {card.card?.name || card.name}
                                </h4>
                                <Badge 
                                  className={`text-xs ${
                                    card.card?.tier === 'SSS' ? 'bg-red-500' :
                                    card.card?.tier === 'SS' ? 'bg-purple-500' :
                                    card.card?.tier === 'S' ? 'bg-blue-500' :
                                    card.card?.tier === 'A' ? 'bg-green-500' :
                                    card.card?.tier === 'B' ? 'bg-yellow-500' :
                                    card.card?.tier === 'C' ? 'bg-orange-500' :
                                    'bg-gray-500'
                                  } text-white`}
                                >
                                  {card.card?.tier || 'D'}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-[#9CA3AF]">Value:</span>
                              <span className="text-[#22D3EE] font-medium">
                                {card.card?.credits || card.credits} Credits
                              </span>
                            </div>
                          </motion.div>
                        ))}
                        {packData.cards.length > 6 && (
                          <div className="bg-[#0B0B12] border border-[#26263A] rounded-lg p-4 flex items-center justify-center">
                            <span className="text-[#9CA3AF] text-sm">
                              +{packData.cards.length - 6} more cards
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="bg-[#151521] border-[#26263A]">
                <CardContent className="p-12 text-center">
                  <Package className="w-16 h-16 text-[#9CA3AF] mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-[#E5E7EB] mb-2">Pack Not Found</h3>
                  <p className="text-[#9CA3AF] mb-4">The pack you're looking for doesn't exist or has been removed.</p>
                  <Link href="/play">
                    <Button>Back to Games</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </main>

      <NavigationFooter />

      {/* Pack Opening Animation */}
      {showAnimation && packResult && (
        <PackOpeningAnimation
          packCards={packResult.packCards || []}
          hitCardPosition={packResult.hitCardPosition || 7}
          onComplete={handleAnimationComplete}
          packType={packData?.name || 'Pack'}
        />
      )}
    </div>
  );
}
