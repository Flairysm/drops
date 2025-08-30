import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
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
  UserX, 
  Plus,
  Edit,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  Save
} from "lucide-react";
import type { User, Card as CardType, Pack, VirtualPack, VirtualPackCard } from "@shared/schema";

const cardSchema = z.object({
  name: z.string().min(1, "Card name is required"),
  tier: z.enum(["D", "C", "B", "A", "S", "SS", "SSS"]),
  imageUrl: z.string().url("Valid image URL required").optional(),
  marketValue: z.string().min(1, "Market value is required"),
  stock: z.number().min(0, "Stock must be non-negative"),
});

const virtualPackSchema = z.object({
  name: z.string().min(1, "Pack name is required"),
  description: z.string().optional(),
  imageUrl: z.string().url("Valid image URL required").optional(),
  price: z.string().min(1, "Price is required"),
  cardCount: z.number().min(1, "Card count must be at least 1").max(20, "Card count cannot exceed 20"),
});

type CardFormData = z.infer<typeof cardSchema>;
type VirtualPackFormData = z.infer<typeof virtualPackSchema>;

export default function Admin() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const [newStock, setNewStock] = useState<number>(0);
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);
  const [editingVirtualPack, setEditingVirtualPack] = useState<VirtualPack | null>(null);
  const [deleteVirtualPackId, setDeleteVirtualPackId] = useState<string | null>(null);
  const [managingPackCards, setManagingPackCards] = useState<VirtualPack | null>(null);
  const [selectedCards, setSelectedCards] = useState<{ cardId: string; weight: number }[]>([]);


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

  const { data: stats = {} } = useQuery({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated,
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated && activeTab === "users",
  });

  const { data: cards } = useQuery<CardType[]>({
    queryKey: ["/api/cards"],
    enabled: isAuthenticated && activeTab === "inventory",
  });

  const { data: virtualPacks } = useQuery<VirtualPack[]>({
    queryKey: ["/api/admin/virtual-packs"],
    enabled: isAuthenticated && activeTab === "virtual-packs",
  });

  const form = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
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
      description: "",
      imageUrl: "",
      price: "",
      cardCount: 10,
    },
  });

  const createCardMutation = useMutation({
    mutationFn: async (data: CardFormData) => {
      await apiRequest("POST", "/api/admin/cards", {
        ...data,
        marketValue: data.marketValue,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      form.reset();
      toast({
        title: "Card Created",
        description: "New card has been added to the system",
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
        title: "Error Creating Card",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const banUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("POST", `/api/admin/users/${userId}/ban`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User Banned",
        description: "User has been banned from the platform",
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
        title: "Error Banning User",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStockMutation = useMutation({
    mutationFn: async ({ cardId, stock }: { cardId: string; stock: number }) => {
      await apiRequest("PATCH", `/api/admin/cards/${cardId}/stock`, { stock });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      setEditingCard(null);
      toast({
        title: "Stock Updated",
        description: "Card stock has been updated successfully",
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
        title: "Error Updating Stock",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: async (cardId: string) => {
      await apiRequest("DELETE", `/api/admin/cards/${cardId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      setDeleteCardId(null);
      toast({
        title: "Card Deleted",
        description: "Card has been removed from the system",
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
        title: "Error Deleting Card",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Virtual pack mutations
  const createVirtualPackMutation = useMutation({
    mutationFn: async (data: VirtualPackFormData) => {
      await apiRequest("POST", "/api/admin/virtual-packs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/virtual-packs"] });
      virtualPackForm.reset();
      toast({
        title: "Virtual Pack Created",
        description: "New themed pack has been added",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Creating Virtual Pack",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateVirtualPackMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VirtualPackFormData> }) => {
      await apiRequest("PATCH", `/api/admin/virtual-packs/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/virtual-packs"] });
      setEditingVirtualPack(null);
      toast({
        title: "Virtual Pack Updated",
        description: "Pack details have been updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Updating Virtual Pack",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteVirtualPackMutation = useMutation({
    mutationFn: async (packId: string) => {
      await apiRequest("DELETE", `/api/admin/virtual-packs/${packId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/virtual-packs"] });
      setDeleteVirtualPackId(null);
      toast({
        title: "Virtual Pack Deleted",
        description: "Pack has been removed from the system",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Deleting Virtual Pack",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateVirtualPackCardsMutation = useMutation({
    mutationFn: async ({ packId, cardIds, weights }: { packId: string; cardIds: string[]; weights: number[] }) => {
      await apiRequest("POST", `/api/admin/virtual-packs/${packId}/cards`, { cardIds, weights });
    },
    onSuccess: () => {
      setManagingPackCards(null);
      setSelectedCards([]);
      toast({
        title: "Card Pool Updated",
        description: "Virtual pack card pool has been configured",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Updating Card Pool",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditStock = (card: CardType) => {
    setEditingCard(card);
    setNewStock(card.stock || 0);
  };

  const handleUpdateStock = () => {
    if (!editingCard) return;
    updateStockMutation.mutate({ cardId: editingCard.id, stock: newStock });
  };

  const handleDeleteCard = (cardId: string) => {
    setDeleteCardId(cardId);
  };

  const confirmDeleteCard = () => {
    if (!deleteCardId) return;
    deleteCardMutation.mutate(deleteCardId);
  };

  const onVirtualPackSubmit = (data: VirtualPackFormData) => {
    if (editingVirtualPack) {
      updateVirtualPackMutation.mutate({ id: editingVirtualPack.id, data });
    } else {
      createVirtualPackMutation.mutate(data);
    }
  };

  const handleEditVirtualPack = (pack: VirtualPack) => {
    setEditingVirtualPack(pack);
    virtualPackForm.reset({
      name: pack.name,
      description: pack.description || "",
      imageUrl: pack.imageUrl || "",
      price: pack.price,
      cardCount: pack.cardCount,
    });
  };

  const handleDeleteVirtualPack = (packId: string) => {
    setDeleteVirtualPackId(packId);
  };

  const confirmDeleteVirtualPack = () => {
    if (!deleteVirtualPackId) return;
    deleteVirtualPackMutation.mutate(deleteVirtualPackId);
  };

  const handleManagePackCards = (pack: VirtualPack) => {
    setManagingPackCards(pack);
    setSelectedCards([]);
  };

  const handleAddCardToPack = (cardId: string) => {
    if (selectedCards.find(c => c.cardId === cardId)) return;
    setSelectedCards(prev => [...prev, { cardId, weight: 1 }]);
  };

  const handleRemoveCardFromPack = (cardId: string) => {
    setSelectedCards(prev => prev.filter(c => c.cardId !== cardId));
  };

  const handleUpdateCardWeight = (cardId: string, weight: number) => {
    setSelectedCards(prev => prev.map(c => c.cardId === cardId ? { ...c, weight } : c));
  };

  const handleSavePackCards = () => {
    if (!managingPackCards || selectedCards.length === 0) return;
    
    const cardIds = selectedCards.map(c => c.cardId);
    const weights = selectedCards.map(c => c.weight);
    
    updateVirtualPackCardsMutation.mutate({
      packId: managingPackCards.id,
      cardIds,
      weights,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const onSubmit = (data: CardFormData) => {
    createCardMutation.mutate(data);
  };

  const tierColors = {
    D: "d",
    C: "c", 
    B: "b",
    A: "a",
    S: "s",
    SS: "ss",
    SSS: "sss"
  };

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
                  ADMIN DASHBOARD
                </span>
              </h1>
              <p className="text-muted-foreground text-lg">
                Manage users, inventory, and system configuration
              </p>
            </div>
          </section>

          {/* Admin Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-5xl mx-auto grid-cols-5 mb-8">
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
              <TabsTrigger value="virtual-packs" data-testid="tab-virtual-packs">
                <Package className="w-4 h-4 mr-2" />
                Virtual Packs
              </TabsTrigger>
              <TabsTrigger value="settings" data-testid="tab-settings">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="gaming-card">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-primary/20 rounded-full mx-auto mb-3 flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-2xl font-bold text-primary" data-testid="stat-total-users">
                      {(stats as any)?.totalUsers || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Users</div>
                  </CardContent>
                </Card>

                <Card className="gaming-card">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-legendary/20 rounded-full mx-auto mb-3 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-legendary" />
                    </div>
                    <div className="text-2xl font-bold text-legendary" data-testid="stat-total-revenue">
                      RM {(stats as any)?.totalRevenue || "0.00"}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Revenue</div>
                  </CardContent>
                </Card>

                <Card className="gaming-card">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-accent/20 rounded-full mx-auto mb-3 flex items-center justify-center">
                      <Package className="w-6 h-6 text-accent" />
                    </div>
                    <div className="text-2xl font-bold text-accent" data-testid="stat-total-cards">
                      {(stats as any)?.totalCards || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Cards</div>
                  </CardContent>
                </Card>
              </div>

              <Card className="gaming-card">
                <CardHeader>
                  <CardTitle className="font-gaming">System Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Database Connection</span>
                    <Badge className="bg-green-500 text-white">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Online
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Game Services</span>
                    <Badge className="bg-green-500 text-white">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Operational
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Payment Gateway</span>
                    <Badge className="bg-yellow-500 text-white">
                      <Clock className="w-3 h-3 mr-1" />
                      Maintenance
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users">
              <Card className="gaming-card">
                <CardHeader>
                  <CardTitle className="font-gaming">User Management</CardTitle>
                </CardHeader>
                <CardContent>
                  {users ? (
                    <div className="space-y-4">
                      {users.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                          <div className="flex items-center space-x-4">
                            <img
                              src={user.profileImageUrl || "https://via.placeholder.com/40"}
                              alt={user.username || "User"}
                              className="w-10 h-10 rounded-full"
                              data-testid={`img-user-${user.id}`}
                            />
                            <div>
                              <div className="font-semibold" data-testid={`text-username-${user.id}`}>
                                {user.username || user.email}
                              </div>
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

            {/* Inventory Tab */}
            <TabsContent value="inventory">
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Add New Card */}
                <Card className="gaming-card">
                  <CardHeader>
                    <CardTitle className="font-gaming">Add New Card</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Card Name</Label>
                        <Input
                          id="name"
                          {...form.register("name")}
                          placeholder="e.g. Charizard VMAX"
                          data-testid="input-card-name"
                        />
                        {form.formState.errors.name && (
                          <p className="text-sm text-destructive mt-1">
                            {form.formState.errors.name.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="tier">Tier</Label>
                        <Select 
                          value={form.watch("tier")} 
                          onValueChange={(value) => form.setValue("tier", value as any)}
                        >
                          <SelectTrigger data-testid="select-card-tier">
                            <SelectValue />
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
                        <Label htmlFor="imageUrl">Image URL (Optional)</Label>
                        <Input
                          id="imageUrl"
                          {...form.register("imageUrl")}
                          placeholder="https://example.com/card-image.jpg"
                          data-testid="input-image-url"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="marketValue">Credit Value (Credits)</Label>
                          <Input
                            id="marketValue"
                            {...form.register("marketValue")}
                            placeholder="10.50"
                            data-testid="input-market-value"
                          />
                        </div>

                        <div>
                          <Label htmlFor="stock">Initial Stock</Label>
                          <Input
                            id="stock"
                            type="number"
                            {...form.register("stock", { valueAsNumber: true })}
                            placeholder="100"
                            data-testid="input-stock"
                          />
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-primary to-accent"
                        disabled={createCardMutation.isPending}
                        data-testid="button-create-card"
                      >
                        {createCardMutation.isPending ? (
                          <>Creating...</>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Card
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Existing Cards */}
                <Card className="gaming-card">
                  <CardHeader>
                    <CardTitle className="font-gaming">Card Inventory</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {cards ? (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {cards.map((card) => (
                          <div key={card.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full bg-${tierColors[card.tier as keyof typeof tierColors]}/20 flex items-center justify-center`}>
                                <span className={`text-xs font-bold tier-${tierColors[card.tier as keyof typeof tierColors]}`}>
                                  {card.tier}
                                </span>
                              </div>
                              <div>
                                <div className="font-semibold" data-testid={`text-card-name-${card.id}`}>
                                  {card.name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {card.packType} • {card.marketValue} Credits
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <div className="font-semibold" data-testid={`text-card-stock-${card.id}`}>
                                  {card.stock || 0} in stock
                                </div>
                                <Badge variant={(card.stock || 0) > 0 ? "default" : "destructive"}>
                                  {(card.stock || 0) > 0 ? "Available" : "Out of Stock"}
                                </Badge>
                              </div>
                              
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditStock(card)}
                                  data-testid={`button-edit-stock-${card.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteCard(card.id)}
                                  data-testid={`button-delete-card-${card.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-2 text-muted-foreground">Loading inventory...</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Virtual Packs Tab */}
            <TabsContent value="virtual-packs">
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Add New Virtual Pack */}
                <Card className="gaming-card">
                  <CardHeader>
                    <CardTitle className="font-gaming">
                      {editingVirtualPack ? "Edit Virtual Pack" : "Add New Virtual Pack"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={virtualPackForm.handleSubmit(onVirtualPackSubmit)} className="space-y-4">
                      <div>
                        <Label htmlFor="pack-name">Pack Name</Label>
                        <Input
                          id="pack-name"
                          {...virtualPackForm.register("name")}
                          placeholder="e.g. Black Bolt, Destined Rivals"
                          data-testid="input-virtual-pack-name"
                        />
                        {virtualPackForm.formState.errors.name && (
                          <p className="text-sm text-destructive mt-1">
                            {virtualPackForm.formState.errors.name.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="pack-description">Description (Optional)</Label>
                        <Textarea
                          id="pack-description"
                          {...virtualPackForm.register("description")}
                          placeholder="Describe this themed pack..."
                          data-testid="input-virtual-pack-description"
                        />
                      </div>

                      <div>
                        <Label htmlFor="pack-image">Image URL (Optional)</Label>
                        <Input
                          id="pack-image"
                          {...virtualPackForm.register("imageUrl")}
                          placeholder="https://example.com/pack-image.jpg"
                          data-testid="input-virtual-pack-image"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="pack-price">Price (Credits)</Label>
                          <Input
                            id="pack-price"
                            {...virtualPackForm.register("price")}
                            placeholder="10.00"
                            data-testid="input-virtual-pack-price"
                          />
                          {virtualPackForm.formState.errors.price && (
                            <p className="text-sm text-destructive mt-1">
                              {virtualPackForm.formState.errors.price.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="pack-card-count">Cards Per Pack</Label>
                          <Input
                            id="pack-card-count"
                            type="number"
                            {...virtualPackForm.register("cardCount", { valueAsNumber: true })}
                            placeholder="10"
                            min="1"
                            max="20"
                            data-testid="input-virtual-pack-card-count"
                          />
                          {virtualPackForm.formState.errors.cardCount && (
                            <p className="text-sm text-destructive mt-1">
                              {virtualPackForm.formState.errors.cardCount.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button 
                          type="submit" 
                          className="flex-1 bg-gradient-to-r from-primary to-accent"
                          disabled={createVirtualPackMutation.isPending || updateVirtualPackMutation.isPending}
                          data-testid="button-save-virtual-pack"
                        >
                          {(createVirtualPackMutation.isPending || updateVirtualPackMutation.isPending) ? (
                            <>Saving...</>
                          ) : editingVirtualPack ? (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Update Pack
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-2" />
                              Create Pack
                            </>
                          )}
                        </Button>
                        {editingVirtualPack && (
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setEditingVirtualPack(null);
                              virtualPackForm.reset();
                            }}
                            data-testid="button-cancel-edit-virtual-pack"
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* Existing Virtual Packs */}
                <Card className="gaming-card">
                  <CardHeader>
                    <CardTitle className="font-gaming">Virtual Pack Library</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {virtualPacks ? (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {virtualPacks.map((pack) => (
                          <div key={pack.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                                <Package className="w-6 h-6 text-primary" />
                              </div>
                              <div>
                                <div className="font-semibold" data-testid={`text-virtual-pack-name-${pack.id}`}>
                                  {pack.name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {pack.price} Credits • {pack.cardCount} Cards
                                </div>
                                {pack.description && (
                                  <div className="text-xs text-muted-foreground">
                                    {pack.description}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Badge variant={pack.isActive ? "default" : "destructive"}>
                                {pack.isActive ? "Active" : "Inactive"}
                              </Badge>
                              
                              <div className="flex space-x-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleManagePackCards(pack)}
                                  data-testid={`button-manage-cards-${pack.id}`}
                                >
                                  <Package className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditVirtualPack(pack)}
                                  data-testid={`button-edit-virtual-pack-${pack.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteVirtualPack(pack.id)}
                                  data-testid={`button-delete-virtual-pack-${pack.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-2 text-muted-foreground">Loading virtual packs...</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <div className="space-y-6">
                <Card className="gaming-card">
                  <CardHeader>
                    <CardTitle className="font-gaming">System Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="maintenance">Maintenance Mode</Label>
                        <p className="text-sm text-muted-foreground">
                          Disable gameplay and credit purchases
                        </p>
                      </div>
                      <Switch id="maintenance" data-testid="switch-maintenance" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="registrations">New Registrations</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow new users to create accounts
                        </p>
                      </div>
                      <Switch id="registrations" defaultChecked data-testid="switch-registrations" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="global-feed">Global Feed</Label>
                        <p className="text-sm text-muted-foreground">
                          Show recent pulls publicly
                        </p>
                      </div>
                      <Switch id="global-feed" defaultChecked data-testid="switch-global-feed" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="gaming-card">
                  <CardHeader>
                    <CardTitle className="font-gaming text-destructive">Danger Zone</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg">
                      <div>
                        <div className="font-semibold text-destructive">Reset All Statistics</div>
                        <p className="text-sm text-muted-foreground">
                          Clear all analytics and usage data
                        </p>
                      </div>
                      <Button variant="destructive" data-testid="button-reset-stats">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Reset Stats
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg">
                      <div>
                        <div className="font-semibold text-destructive">Clear Global Feed</div>
                        <p className="text-sm text-muted-foreground">
                          Remove all global feed entries
                        </p>
                      </div>
                      <Button variant="destructive" data-testid="button-clear-feed">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Clear Feed
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Edit Stock Dialog */}
      <Dialog open={!!editingCard} onOpenChange={(open) => !open && setEditingCard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Stock</DialogTitle>
            <DialogDescription>
              Update the stock quantity for {editingCard?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-stock">New Stock Quantity</Label>
              <Input
                id="new-stock"
                type="number"
                value={newStock}
                onChange={(e) => setNewStock(parseInt(e.target.value) || 0)}
                min="0"
                data-testid="input-new-stock"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCard(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateStock} 
              disabled={updateStockMutation.isPending}
              data-testid="button-confirm-update-stock"
            >
              {updateStockMutation.isPending ? (
                "Updating..."
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update Stock
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Card Confirmation Dialog */}
      <Dialog open={!!deleteCardId} onOpenChange={(open) => !open && setDeleteCardId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Card</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this card? This action cannot be undone.
              The card will be marked as inactive and removed from the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCardId(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteCard}
              disabled={deleteCardMutation.isPending}
              data-testid="button-confirm-delete-card"
            >
              {deleteCardMutation.isPending ? (
                "Deleting..."
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Card
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Virtual Pack Confirmation Dialog */}
      <Dialog open={!!deleteVirtualPackId} onOpenChange={(open) => !open && setDeleteVirtualPackId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Virtual Pack</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this virtual pack? This action cannot be undone.
              The pack will be marked as inactive and removed from the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteVirtualPackId(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteVirtualPack}
              disabled={deleteVirtualPackMutation.isPending}
              data-testid="button-confirm-delete-virtual-pack"
            >
              {deleteVirtualPackMutation.isPending ? (
                "Deleting..."
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Pack
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Pack Cards Dialog */}
      <Dialog open={!!managingPackCards} onOpenChange={(open) => !open && setManagingPackCards(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Card Pool: {managingPackCards?.name}</DialogTitle>
            <DialogDescription>
              Select cards and set their probability weights for this themed pack.
              Higher weights mean cards appear more frequently.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Selected Cards */}
            {selectedCards.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Selected Cards ({selectedCards.length})</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedCards.map((selected) => {
                    const card = cards?.find(c => c.id === selected.cardId);
                    return (
                      <div key={selected.cardId} className="flex items-center justify-between p-2 rounded-lg border border-border">
                        <div className="flex items-center space-x-2">
                          <div className={`w-6 h-6 rounded-full bg-${tierColors[card?.tier as keyof typeof tierColors]}/20 flex items-center justify-center`}>
                            <span className={`text-xs font-bold tier-${tierColors[card?.tier as keyof typeof tierColors]}`}>
                              {card?.tier}
                            </span>
                          </div>
                          <span className="text-sm">{card?.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            min="1"
                            value={selected.weight}
                            onChange={(e) => handleUpdateCardWeight(selected.cardId, parseInt(e.target.value) || 1)}
                            className="w-16 h-8"
                            data-testid={`input-card-weight-${selected.cardId}`}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveCardFromPack(selected.cardId)}
                            data-testid={`button-remove-card-${selected.cardId}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Available Cards */}
            <div>
              <h4 className="font-semibold mb-2">Available Cards</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                {cards?.filter(card => !selectedCards.find(s => s.cardId === card.id)).map((card) => (
                  <Button
                    key={card.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddCardToPack(card.id)}
                    className="justify-start space-x-2"
                    data-testid={`button-add-card-${card.id}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-${tierColors[card.tier as keyof typeof tierColors]}/20 flex items-center justify-center`}>
                      <span className={`text-xs font-bold tier-${tierColors[card.tier as keyof typeof tierColors]}`}>
                        {card.tier}
                      </span>
                    </div>
                    <span className="text-xs truncate">{card.name}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setManagingPackCards(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSavePackCards}
              disabled={selectedCards.length === 0 || updateVirtualPackCardsMutation.isPending}
              data-testid="button-save-pack-cards"
            >
              {updateVirtualPackCardsMutation.isPending ? (
                "Saving..."
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Card Pool
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
