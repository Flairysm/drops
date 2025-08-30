import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Users, 
  Package, 
  Settings, 
  TrendingUp, 
  Ban,
  Plus,
  Edit,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import type { User, VirtualLibraryCard } from "@shared/schema";

const virtualLibrarySchema = z.object({
  name: z.string().min(1, "Card name is required"),
  tier: z.enum(["D", "C", "B", "A", "S", "SS", "SSS"]),
  imageUrl: z.string().optional(),
  marketValue: z.string().min(1, "Market value is required"),
  stock: z.number().min(0, "Stock must be 0 or greater").optional(),
});

const virtualPackSchema = z.object({
  name: z.string().min(1, "Pack name is required"),
  price: z.string().min(1, "Price is required"),
  imageUrl: z.string().optional(),
  category: z.enum(["Special", "Classic"]),
});

type VirtualLibraryFormData = z.infer<typeof virtualLibrarySchema>;
type VirtualPackFormData = z.infer<typeof virtualPackSchema>;

const tierColors = {
  D: "gray",
  C: "green",
  B: "blue", 
  A: "purple",
  S: "yellow",
  SS: "orange",
  SSS: "red"
};

// Card Gallery Component for displaying cards by tier
const CardGalleryContent = ({ packId }: { packId: string }) => {
  const [galleryCards, setGalleryCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGalleryCards = async () => {
      if (!packId) return;
      
      setLoading(true);
      try {
        const packCardsResponse = await apiRequest("GET", `/api/admin/virtual-packs/${packId}/cards`);
        const virtualLibraryResponse = await apiRequest("GET", "/api/admin/virtual-library");
        
        const packCards = await packCardsResponse.json();
        const virtualLibraryCards = await virtualLibraryResponse.json();
        
        console.log("Pack cards:", packCards);
        console.log("Virtual library cards:", virtualLibraryCards);
        
        if (!Array.isArray(packCards) || !Array.isArray(virtualLibraryCards)) {
          console.error("Invalid data structure - expected arrays");
          setGalleryCards([]);
          return;
        }
        
        const cardDetails = packCards.map((pc: any) => {
          const card = virtualLibraryCards.find((c: any) => c.id === pc.virtualLibraryCardId);
          return card ? { ...card, weight: pc.weight } : null;
        }).filter(Boolean);
        
        console.log("Gallery loaded:", cardDetails.length, "cards for pack", packId);
        setGalleryCards(cardDetails);
      } catch (error) {
        console.error("Failed to load gallery cards:", error);
        setGalleryCards([]);
      } finally {
        setLoading(false);
      }
    };

    loadGalleryCards();
  }, [packId]);

  if (loading) {
    return <div className="flex items-center justify-center h-32">Loading cards...</div>;
  }

  if (galleryCards.length === 0) {
    return <div className="text-center text-muted-foreground py-8">No cards in this pack</div>;
  }

  // Group cards by tier
  const cardsByTier = galleryCards.reduce((acc, card: any) => {
    const tier = card.tier || 'D';
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(card);
    return acc;
  }, {} as Record<string, any[]>);

  const tierOrder = ['SSS', 'SS', 'S', 'A', 'B', 'C', 'D'];
  
  return (
    <div className="space-y-6">
      {tierOrder.map(tier => {
        const tierCards = cardsByTier[tier];
        if (!tierCards || tierCards.length === 0) return null;
        
        return (
          <div key={tier} className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className={`w-6 h-6 rounded-full bg-${tierColors[tier as keyof typeof tierColors]}/20 flex items-center justify-center`}>
                <span className={`text-sm font-bold tier-${tierColors[tier as keyof typeof tierColors]}`}>
                  {tier}
                </span>
              </div>
              <h3 className="text-lg font-semibold">
                {tier} Tier ({tierCards.length} card{tierCards.length !== 1 ? 's' : ''})
              </h3>
            </div>
            
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
              {tierCards.map((card: any) => (
                <div key={card.id} className="relative group">
                  <div className="aspect-[3/4] rounded-md overflow-hidden bg-muted/30 border border-muted hover:border-primary/50 transition-colors w-20 h-28">
                    {card.imageUrl ? (
                      <img 
                        src={card.imageUrl} 
                        alt={card.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.setAttribute('style', 'display: flex');
                        }}
                      />
                    ) : null}
                    <div className="w-full h-full bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center" style={{ display: card.imageUrl ? 'none' : 'flex' }}>
                      <Package className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  
                  {/* Card Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/90 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="text-[10px] font-medium truncate">{card.name}</div>
                    <div className="text-[9px] text-gray-300">{card.marketValue}c</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default function Admin() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [inventorySection, setInventorySection] = useState<"inventory" | "content">("inventory");
  const [editingCard, setEditingCard] = useState<any>(null);
  const [editingPack, setEditingPack] = useState<any>(null);
  const [showPackCardSelector, setShowPackCardSelector] = useState(false);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [expandedPacks, setExpandedPacks] = useState<Set<string>>(new Set());
  const [packCardPools, setPackCardPools] = useState<Record<string, any[]>>({});
  const [showCardGallery, setShowCardGallery] = useState(false);
  const [galleryPack, setGalleryPack] = useState<any>(null);
  const [inventorySearch, setInventorySearch] = useState("");

  // Set up form data when editing a card
  useEffect(() => {
    if (editingCard) {
      virtualLibraryForm.reset({
        name: editingCard.name,
        tier: editingCard.tier,
        imageUrl: editingCard.imageUrl || "",
        marketValue: editingCard.marketValue.toString(),
        stock: editingCard.stock || 0,
      });
    }
  }, [editingCard]);

  const virtualLibraryForm = useForm<VirtualLibraryFormData>({
    resolver: zodResolver(virtualLibrarySchema),
    defaultValues: {
      name: "",
      tier: "D",
      imageUrl: "",
      marketValue: "",
      stock: 0,
    },
  });

  const virtualPackForm = useForm<VirtualPackFormData>({
    resolver: zodResolver(virtualPackSchema),
    defaultValues: {
      name: "",
      price: "",
      imageUrl: "",
      category: "Classic",
    },
  });

  // Data queries
  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"],
    enabled: !!isAuthenticated,
    retry: (failureCount, error) => !isUnauthorizedError(error) && failureCount < 3,
  });

  const { data: users } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: !!isAuthenticated,
    retry: (failureCount, error) => !isUnauthorizedError(error) && failureCount < 3,
  });

  const { data: virtualLibraryCards } = useQuery({
    queryKey: ["/api/admin/virtual-library"],
    enabled: !!isAuthenticated,
    retry: (failureCount, error) => !isUnauthorizedError(error) && failureCount < 3,
  });

  const { data: virtualPacks } = useQuery({
    queryKey: ["/api/admin/virtual-packs"],
    enabled: !!isAuthenticated,
    retry: (failureCount, error) => !isUnauthorizedError(error) && failureCount < 3,
  });


  // Mutations
  const createVirtualLibraryCardMutation = useMutation({
    mutationFn: (data: VirtualLibraryFormData) => apiRequest("POST", "/api/admin/virtual-library", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/virtual-library"] });
      virtualLibraryForm.reset();
      toast({
        title: "Success",
        description: "Card created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteVirtualLibraryCardMutation = useMutation({
    mutationFn: (cardId: string) => apiRequest("DELETE", `/api/admin/virtual-library/${cardId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/virtual-library"] });
      setDeleteVirtualLibraryCardId(null);
      toast({
        title: "Success",
        description: "Card deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createVirtualPackMutation = useMutation({
    mutationFn: async (data: VirtualPackFormData) => {
      // Create the pack with category info
      const packData = {
        ...data,
        cardCount: 10, // Default card count
        description: `${data.category} Pack` // Auto-generate description
      };
      const packResponse = await apiRequest("POST", "/api/admin/virtual-packs", packData);
      const newPack = packResponse as any;
      
      // Set default pull rates for the new pack
      if (newPack && newPack.id) {
        try {
          await apiRequest("POST", `/api/admin/virtual-packs/${newPack.id}/pull-rates`, {
            rates: [
              { cardTier: 'D', probability: 70.0 },
              { cardTier: 'C', probability: 20.0 },
              { cardTier: 'B', probability: 7.0 },
              { cardTier: 'A', probability: 2.0 },
              { cardTier: 'S', probability: 0.8 },
              { cardTier: 'SS', probability: 0.15 },
              { cardTier: 'SSS', probability: 0.05 }
            ]
          });
        } catch (error) {
          console.log("Pull rates setup completed with default odds");
        }
      }
      
      return newPack;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/virtual-packs"] });
      virtualPackForm.reset();
      toast({
        title: "Content Created",
        description: "New content pack created with default pull rates",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const banUserMutation = useMutation({
    mutationFn: (userId: string) => apiRequest("POST", `/api/admin/users/${userId}/ban`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User banned successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onVirtualLibrarySubmit = (data: VirtualLibraryFormData) => {
    createVirtualLibraryCardMutation.mutate(data);
  };

  const handleDeleteVirtualLibraryCard = (cardId: string) => {
    if (confirm("Are you sure you want to delete this card?")) {
      deleteVirtualLibraryCardMutation.mutate(cardId);
    }
  };

  const deleteVirtualPackMutation = useMutation({
    mutationFn: (packId: string) => apiRequest("DELETE", `/api/admin/virtual-packs/${packId}`),
    onSuccess: () => {
      console.log("Pack deleted successfully, invalidating cache...");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/virtual-packs"] });
      // Force a refetch to see if it helps
      queryClient.refetchQueries({ queryKey: ["/api/admin/virtual-packs"] });
      toast({
        title: "Success",
        description: "Pack deleted successfully",
      });
    },
    onError: (error) => {
      console.error("Delete pack error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteVirtualPack = (packId: string) => {
    if (confirm("Are you sure you want to delete this pack?")) {
      deleteVirtualPackMutation.mutate(packId);
    }
  };

  const handleManagePackCards = async (pack: any) => {
    setEditingPack(pack);
    setShowPackCardSelector(true);
    
    // Load current cards in pack
    try {
      const currentCards = await apiRequest("GET", `/api/admin/virtual-packs/${pack.id}/cards`);
      const cardIds = currentCards.map((card: any) => card.virtualLibraryCardId);
      setSelectedCards(cardIds);
    } catch (error) {
      console.error("Failed to load current card pool:", error);
      setSelectedCards([]);
    }
  };

  const handleSavePackCards = async () => {
    if (!editingPack) return;
    
    console.log(`Saving card pool for pack ${editingPack.id} with ${selectedCards.length} cards:`, selectedCards);
    
    try {
      const response = await apiRequest("POST", `/api/admin/virtual-packs/${editingPack.id}/cards`, {
        cardIds: selectedCards,
        weights: selectedCards.map(() => 1),
      });
      
      console.log("Card pool save response:", response);
      
      // Clear the cached card pool for this pack to force reload
      setPackCardPools(prev => {
        const updated = { ...prev };
        delete updated[editingPack.id];
        return updated;
      });
      
      // Force expansion to show updated cards
      setExpandedPacks(prev => new Set([...prev, editingPack.id]));
      
      queryClient.invalidateQueries({ queryKey: ["/api/admin/virtual-packs"] });
      setShowPackCardSelector(false);
      setEditingPack(null);
      setSelectedCards([]);
      
      toast({
        title: "Success",
        description: `Card pool updated successfully (${selectedCards.length} cards)`,
      });
    } catch (error: any) {
      console.error("Card pool save error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save card pool",
        variant: "destructive",
      });
    }
  };

  const handleSaveCardEdit = async (data: VirtualLibraryFormData) => {
    if (!editingCard) return;
    
    try {
      const response = await apiRequest("PATCH", `/api/admin/virtual-library/${editingCard.id}`, data);
      await response.json();
      
      queryClient.invalidateQueries({ queryKey: ["/api/admin/virtual-library"] });
      setEditingCard(null);
      virtualLibraryForm.reset();
      
      toast({
        title: "Success",
        description: "Card updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update card",
        variant: "destructive",
      });
    }
  };

  const toggleCardSelection = (cardId: string) => {
    setSelectedCards(prev => 
      prev.includes(cardId) 
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    );
  };

  const togglePackExpansion = async (packId: string) => {
    const newExpanded = new Set(expandedPacks);
    
    if (expandedPacks.has(packId)) {
      newExpanded.delete(packId);
    } else {
      newExpanded.add(packId);
      
      // Load card pool if not already loaded
      if (!packCardPools[packId]) {
        try {
          const packCards = await apiRequest("GET", `/api/admin/virtual-packs/${packId}/cards`);
          const cardDetails = await Promise.all(
            packCards.map(async (pc: any) => {
              const card = virtualLibraryCards?.find((c: any) => c.id === pc.virtualLibraryCardId);
              return card ? { ...card, weight: pc.weight } : null;
            })
          );
          
          setPackCardPools(prev => ({
            ...prev,
            [packId]: cardDetails.filter(Boolean)
          }));
        } catch (error) {
          console.error("Failed to load pack cards:", error);
        }
      }
    }
    
    setExpandedPacks(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Admin Access Required</h1>
          <p className="text-muted-foreground">Please log in to access the admin panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold font-gaming mb-8 text-center">Admin Dashboard</h1>
          
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full max-w-4xl mx-auto grid-cols-4 mb-8">
              <TabsTrigger value="overview" data-testid="tab-overview">
                <TrendingUp className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="users" data-testid="tab-users">
                <Users className="w-4 h-4 mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger value="inventory" data-testid="tab-inventory">
                <Package className="w-4 h-4 mr-2" />
                Inventory
              </TabsTrigger>
              <TabsTrigger value="settings" data-testid="tab-settings">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="gaming-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                  </CardContent>
                </Card>

                <Card className="gaming-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">RM {stats?.totalRevenue || "0.00"}</div>
                  </CardContent>
                </Card>

                <Card className="gaming-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cards in Library</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{virtualLibraryCards?.length || 0}</div>
                  </CardContent>
                </Card>

                <Card className="gaming-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Themed Packs</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{virtualPacks?.length || 0}</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users">
              <Card className="gaming-card">
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                </CardHeader>
                <CardContent>
                  {users ? (
                    <div className="space-y-4">
                      {users.map((user: User) => (
                        <div key={user.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                              <Users className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-semibold">{user.email}</div>
                              <div className="text-sm text-muted-foreground">
                                Credits: {user.credits} • Spent: RM {user.totalSpent}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {user.isBanned && (
                              <Badge variant="destructive">Banned</Badge>
                            )}
                            {user.isSuspended && (
                              <Badge variant="secondary">Suspended</Badge>
                            )}
                            
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={user.isBanned || false}
                              onClick={() => banUserMutation.mutate(user.id)}
                              data-testid={`button-ban-${user.id}`}
                            >
                              <Ban className="w-3 h-3 mr-1" />
                              Ban
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2 text-muted-foreground">Loading users...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Inventory Management - Two Sections */}
            <TabsContent value="inventory">
              <div className="space-y-6">
                {/* Section Selector */}
                <div className="flex gap-4 mb-6">
                  <Button
                    variant={inventorySection === "inventory" ? "default" : "outline"}
                    onClick={() => setInventorySection("inventory")}
                    data-testid="tab-manage-inventory"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Manage Inventory
                  </Button>
                  <Button
                    variant={inventorySection === "content" ? "default" : "outline"}
                    onClick={() => setInventorySection("content")}
                    data-testid="tab-manage-content"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Manage Content
                  </Button>
                </div>

                {/* Manage Inventory Section */}
                {inventorySection === "inventory" && (
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Add New Card */}
                      <Card className="gaming-card">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Plus className="w-5 h-5" />
                            Add New Card to Inventory
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <form onSubmit={virtualLibraryForm.handleSubmit(onVirtualLibrarySubmit)} className="space-y-4">
                            <div>
                              <Label htmlFor="card-name">Card Name</Label>
                              <Input
                                id="card-name"
                                {...virtualLibraryForm.register("name")}
                                placeholder="Enter card name"
                                data-testid="input-card-name"
                              />
                              {virtualLibraryForm.formState.errors.name && (
                                <p className="text-sm text-destructive mt-1">{virtualLibraryForm.formState.errors.name.message}</p>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="card-tier">Tier</Label>
                                <Select onValueChange={(value) => virtualLibraryForm.setValue("tier", value as any)}>
                                  <SelectTrigger data-testid="select-card-tier">
                                    <SelectValue placeholder="Select tier" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="D">D Tier</SelectItem>
                                    <SelectItem value="C">C Tier</SelectItem>
                                    <SelectItem value="B">B Tier</SelectItem>
                                    <SelectItem value="A">A Tier</SelectItem>
                                    <SelectItem value="S">S Tier</SelectItem>
                                    <SelectItem value="SS">SS Tier</SelectItem>
                                    <SelectItem value="SSS">SSS Tier</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label htmlFor="card-value">Market Value</Label>
                                <Input
                                  id="card-value"
                                  {...virtualLibraryForm.register("marketValue")}
                                  placeholder="1.00"
                                  data-testid="input-card-value"
                                />
                              </div>
                            </div>

                            <div>
                              <Label htmlFor="card-image">Image URL (Optional)</Label>
                              <Input
                                id="card-image"
                                {...virtualLibraryForm.register("imageUrl")}
                                placeholder="https://example.com/image.jpg"
                                data-testid="input-card-image"
                              />
                            </div>

                            <Button 
                              type="submit" 
                              className="w-full"
                              disabled={createVirtualLibraryCardMutation.isPending}
                              data-testid="button-add-card"
                            >
                              {createVirtualLibraryCardMutation.isPending ? "Adding..." : "Add to Inventory"}
                            </Button>
                          </form>
                        </CardContent>
                      </Card>

                      {/* Current Inventory */}
                      <Card className="gaming-card">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle>Current Inventory ({virtualLibraryCards?.length || 0} cards)</CardTitle>
                          </div>
                          <div className="mt-3">
                            <Input
                              type="text"
                              placeholder="Search cards by name or tier..."
                              value={inventorySearch}
                              onChange={(e) => setInventorySearch(e.target.value)}
                              className="max-w-md"
                              data-testid="input-inventory-search"
                            />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 max-h-80 overflow-y-auto">
                            {virtualLibraryCards?.filter((card: any) => {
                              const searchTerm = inventorySearch.toLowerCase();
                              return card.name.toLowerCase().includes(searchTerm) || 
                                     card.tier.toLowerCase().includes(searchTerm);
                            }).map((card: any) => (
                              <div key={card.id} className="flex items-center justify-between p-3 rounded border">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full bg-${tierColors[card.tier as keyof typeof tierColors]}/20 flex items-center justify-center`}>
                                    <span className={`text-xs font-bold tier-${tierColors[card.tier as keyof typeof tierColors]}`}>
                                      {card.tier}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="font-medium">{card.name}</div>
                                    <div className="text-sm text-muted-foreground">{card.marketValue} credits</div>
                                    <div className="text-xs text-blue-600 dark:text-blue-400">
                                      Stock: {card.stock || 0} available
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingCard(card)}
                                    data-testid={`button-edit-card-${card.id}`}
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeleteVirtualLibraryCard(card.id)}
                                    data-testid={`button-delete-card-${card.id}`}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            )) || (
                              <p className="text-center text-muted-foreground py-8">No cards in inventory yet.</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {/* Manage Content Section */}
                {inventorySection === "content" && (
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Create New Content */}
                      <Card className="gaming-card">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Plus className="w-5 h-5" />
                            Create New Content
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <form onSubmit={virtualPackForm.handleSubmit((data) => {
                            createVirtualPackMutation.mutate(data);
                          })} className="space-y-4">
                            <div>
                              <Label htmlFor="content-name">Content Name</Label>
                              <Input
                                id="content-name"
                                {...virtualPackForm.register("name")}
                                placeholder="e.g., Black Bolt Collection"
                                data-testid="input-content-name"
                              />
                              {virtualPackForm.formState.errors.name && (
                                <p className="text-sm text-destructive mt-1">{virtualPackForm.formState.errors.name.message}</p>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="content-price">Price</Label>
                                <Input
                                  id="content-price"
                                  {...virtualPackForm.register("price")}
                                  placeholder="8.00"
                                  data-testid="input-content-price"
                                />
                                {virtualPackForm.formState.errors.price && (
                                  <p className="text-sm text-destructive mt-1">{virtualPackForm.formState.errors.price.message}</p>
                                )}
                              </div>

                              <div>
                                <Label htmlFor="content-category">Category</Label>
                                <Select onValueChange={(value) => virtualPackForm.setValue("category", value as any)}>
                                  <SelectTrigger data-testid="select-content-category">
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Special">Special Packs</SelectItem>
                                    <SelectItem value="Classic">Classic Packs</SelectItem>
                                  </SelectContent>
                                </Select>
                                {virtualPackForm.formState.errors.category && (
                                  <p className="text-sm text-destructive mt-1">{virtualPackForm.formState.errors.category.message}</p>
                                )}
                              </div>
                            </div>

                            <div>
                              <Label htmlFor="content-image">Image URL (Optional)</Label>
                              <Input
                                id="content-image"
                                {...virtualPackForm.register("imageUrl")}
                                placeholder="https://example.com/pack-image.jpg"
                                data-testid="input-content-image"
                              />
                            </div>

                            <Button 
                              type="submit" 
                              className="w-full" 
                              disabled={createVirtualPackMutation.isPending}
                              data-testid="button-create-content"
                            >
                              {createVirtualPackMutation.isPending ? "Creating..." : "Create Content"}
                            </Button>
                          </form>
                        </CardContent>
                      </Card>

                      {/* Content List */}
                      <Card className="gaming-card">
                        <CardHeader>
                          <CardTitle>Content Library ({virtualPacks?.length || 0} packs)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3 max-h-80 overflow-y-auto">
                            {virtualPacks?.map((pack: any) => (
                              <div key={pack.id} className="border rounded">
                                <div className="flex items-center justify-between p-3">
                                  <div className="flex-1">
                                    <div className="font-medium">{pack.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {pack.price} credits • {pack.description || 'No description'}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {packCardPools[pack.id]?.length || 0} cards in pool
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setGalleryPack(pack);
                                        setShowCardGallery(true);
                                        // Clear cache to force fresh data load
                                        setPackCardPools(prev => {
                                          const updated = { ...prev };
                                          delete updated[pack.id];
                                          return updated;
                                        });
                                      }}
                                      data-testid={`button-view-cards-${pack.id}`}
                                      title="View card gallery"
                                    >
                                      <Eye className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleManagePackCards(pack)}
                                      data-testid={`button-edit-pack-${pack.id}`}
                                      title="Edit card pool"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleDeleteVirtualPack(pack.id)}
                                      data-testid={`button-delete-pack-${pack.id}`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                                
                                {/* Expanded Card Pool View */}
                                {expandedPacks.has(pack.id) && (
                                  <div className="border-t bg-muted/30 p-3">
                                    <div className="text-xs font-medium mb-2 text-muted-foreground">
                                      Card Pool ({packCardPools[pack.id]?.length || 0} cards):
                                    </div>
                                    {packCardPools[pack.id]?.length > 0 ? (
                                      <div className="grid gap-2 max-h-32 overflow-y-auto">
                                        {packCardPools[pack.id].map((card: any) => (
                                          <div key={card.id} className="flex items-center space-x-2 text-xs">
                                            <div className={`w-4 h-4 rounded-full bg-${tierColors[card.tier as keyof typeof tierColors]}/20 flex items-center justify-center`}>
                                              <span className={`text-[10px] font-bold tier-${tierColors[card.tier as keyof typeof tierColors]}`}>
                                                {card.tier}
                                              </span>
                                            </div>
                                            <span className="flex-1">{card.name}</span>
                                            <span className="text-muted-foreground">{card.marketValue}c</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground">No cards assigned to this pack</p>
                                    )}
                                    <div className="mt-2">
                                      <Button
                                        size="sm"
                                        variant="link"
                                        onClick={() => togglePackExpansion(pack.id)}
                                        className="text-xs p-0 h-auto"
                                      >
                                        <ChevronUp className="w-3 h-3 mr-1" />
                                        Hide cards
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )) || (
                              <p className="text-center text-muted-foreground py-8">No content created yet.</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <Card className="gaming-card">
                <CardHeader>
                  <CardTitle>System Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Settings panel coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Card Gallery Dialog */}
          <Dialog open={showCardGallery} onOpenChange={setShowCardGallery}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Card Gallery - {galleryPack?.name}</DialogTitle>
              </DialogHeader>
              
              <CardGalleryContent packId={galleryPack?.id} />
            </DialogContent>
          </Dialog>

          {/* Edit Card Dialog */}
          <Dialog open={!!editingCard} onOpenChange={(open) => !open && setEditingCard(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Card</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={virtualLibraryForm.handleSubmit(handleSaveCardEdit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Card Name</Label>
                  <Input
                    id="edit-name"
                    {...virtualLibraryForm.register("name")}
                    placeholder="Enter card name"
                    data-testid="input-edit-name"
                  />
                  {virtualLibraryForm.formState.errors.name && (
                    <p className="text-sm text-destructive">{virtualLibraryForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-tier">Tier</Label>
                  <Select onValueChange={(value) => virtualLibraryForm.setValue("tier", value as any)}>
                    <SelectTrigger data-testid="select-edit-tier">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["D", "C", "B", "A", "S", "SS", "SSS"].map((tier) => (
                        <SelectItem key={tier} value={tier}>{tier}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {virtualLibraryForm.formState.errors.tier && (
                    <p className="text-sm text-destructive">{virtualLibraryForm.formState.errors.tier.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-marketValue">Market Value (credits)</Label>
                  <Input
                    id="edit-marketValue"
                    {...virtualLibraryForm.register("marketValue")}
                    placeholder="100"
                    data-testid="input-edit-market-value"
                  />
                  {virtualLibraryForm.formState.errors.marketValue && (
                    <p className="text-sm text-destructive">{virtualLibraryForm.formState.errors.marketValue.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-imageUrl">Image URL (optional)</Label>
                  <Input
                    id="edit-imageUrl"
                    {...virtualLibraryForm.register("imageUrl")}
                    placeholder="https://example.com/card-image.jpg"
                    data-testid="input-edit-image"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-stock">Stock Quantity</Label>
                  <Input
                    id="edit-stock"
                    type="number"
                    min="0"
                    {...virtualLibraryForm.register("stock", { valueAsNumber: true })}
                    placeholder="0"
                    data-testid="input-edit-stock"
                  />
                  {virtualLibraryForm.formState.errors.stock && (
                    <p className="text-sm text-destructive">{virtualLibraryForm.formState.errors.stock.message}</p>
                  )}
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingCard(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" data-testid="button-save-card-edit">
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Card Pool Selection Dialog */}
          <Dialog open={showPackCardSelector} onOpenChange={setShowPackCardSelector}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Card Pool for {editingPack?.name}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Select which cards from inventory should be included in this pack:
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Currently selected: {selectedCards.length} cards
                  </p>
                </div>
                
                <div className="grid gap-3">
                  {virtualLibraryCards?.map((card: any) => (
                    <div key={card.id} className="flex items-center space-x-3 p-3 border rounded">
                      <Checkbox
                        checked={selectedCards.includes(card.id)}
                        onCheckedChange={() => toggleCardSelection(card.id)}
                        data-testid={`checkbox-card-${card.id}`}
                      />
                      <div className={`w-8 h-8 rounded-full bg-${tierColors[card.tier as keyof typeof tierColors]}/20 flex items-center justify-center`}>
                        <span className={`text-xs font-bold tier-${tierColors[card.tier as keyof typeof tierColors]}`}>
                          {card.tier}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{card.name}</div>
                        <div className="text-sm text-muted-foreground">{card.marketValue} credits</div>
                      </div>
                    </div>
                  )) || (
                    <p className="text-center text-muted-foreground py-8">No cards available in inventory.</p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPackCardSelector(false);
                    setEditingPack(null);
                    setSelectedCards([]);
                  }}
                  data-testid="button-cancel-card-selection"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePackCards}
                  data-testid="button-save-card-pool"
                >
                  Save Card Pool ({selectedCards.length} selected)
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}