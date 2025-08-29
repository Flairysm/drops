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
import type { User, Card as CardType, Pack } from "@shared/schema";

const cardSchema = z.object({
  name: z.string().min(1, "Card name is required"),
  tier: z.enum(["C", "UC", "R", "SR", "SSS"]),
  packType: z.string().min(1, "Pack type is required"),
  imageUrl: z.string().url("Valid image URL required").optional(),
  marketValue: z.string().min(1, "Market value is required"),
  stock: z.number().min(0, "Stock must be non-negative"),
});

type CardFormData = z.infer<typeof cardSchema>;

export default function Admin() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const [newStock, setNewStock] = useState<number>(0);
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);

  // Pull rate form state
  const [pullRates, setPullRates] = useState({
    pokeball: { common: 80, uncommon: 18, rare: 2, superrare: 0, legendary: 0 },
    greatball: { common: 50, uncommon: 35, rare: 14, superrare: 1, legendary: 0 },
    ultraball: { common: 25, uncommon: 40, rare: 25, superrare: 8, legendary: 2 },
    masterball: { common: 5, uncommon: 10, rare: 15, superrare: 10, legendary: 60 }
  });

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

  const form = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      name: "",
      tier: "C",
      packType: "BNW",
      imageUrl: "",
      marketValue: "",
      stock: 0,
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

  // Pull rate mutation
  const updatePullRatesMutation = useMutation({
    mutationFn: async ({ packType, rates }: { packType: string; rates: Array<{ cardTier: string; probability: string }> }) => {
      await apiRequest("POST", `/api/admin/pull-rates/${packType}`, { rates });
    },
    onSuccess: () => {
      toast({
        title: "Pull Rates Updated",
        description: "Pack pull rates have been updated successfully",
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
        title: "Error Updating Pull Rates",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle pull rate input changes
  const handlePullRateChange = (packType: keyof typeof pullRates, cardTier: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setPullRates(prev => ({
      ...prev,
      [packType]: {
        ...prev[packType],
        [cardTier]: numValue
      }
    }));
  };

  // Handle pull rate update submission
  const handleUpdatePullRates = (packType: keyof typeof pullRates) => {
    const rates = Object.entries(pullRates[packType]).map(([cardTier, probability]) => ({
      cardTier,
      probability: probability.toString()
    }));

    // Validate that rates sum to 100%
    const total = Object.values(pullRates[packType]).reduce((sum, rate) => sum + rate, 0);
    if (total !== 100) {
      toast({
        title: "Invalid Rates",
        description: `Rates must sum to 100% (currently ${total}%)`,
        variant: "destructive",
      });
      return;
    }

    updatePullRatesMutation.mutate({ packType, rates });
  };

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
    C: "common",
    UC: "uncommon", 
    R: "rare",
    SR: "superrare",
    SSS: "legendary"
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
            <TabsList className="grid w-full max-w-4xl mx-auto grid-cols-5 mb-8">
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
              <TabsTrigger value="pull-rates" data-testid="tab-pull-rates">
                <Settings className="w-4 h-4 mr-2" />
                Pull Rates
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

                      <div className="grid grid-cols-2 gap-4">
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
                              <SelectItem value="C">Common (C)</SelectItem>
                              <SelectItem value="UC">Uncommon (UC)</SelectItem>
                              <SelectItem value="R">Rare (R)</SelectItem>
                              <SelectItem value="SR">Super Rare (SR)</SelectItem>
                              <SelectItem value="SSS">Legendary (SSS)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="packType">Pack Type</Label>
                          <Input
                            id="packType"
                            {...form.register("packType")}
                            placeholder="e.g. BNW"
                            data-testid="input-pack-type"
                          />
                        </div>
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

            {/* Pull Rates Tab */}
            <TabsContent value="pull-rates">
              <div className="space-y-6">
                {/* Pokeball Pack Rates */}
                <Card className="gaming-card">
                  <CardHeader>
                    <CardTitle className="font-gaming">Pokeball Pack Pull Rates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div>
                          <Label htmlFor="pokeball-common">Common</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="pokeball-common"
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              value={pullRates.pokeball.common}
                              onChange={(e) => handlePullRateChange('pokeball', 'common', e.target.value)}
                              data-testid="input-pokeball-common"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="pokeball-uncommon">Uncommon</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="pokeball-uncommon"
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              value={pullRates.pokeball.uncommon}
                              onChange={(e) => handlePullRateChange('pokeball', 'uncommon', e.target.value)}
                              data-testid="input-pokeball-uncommon"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="pokeball-rare">Rare</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="pokeball-rare"
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              value={pullRates.pokeball.rare}
                              onChange={(e) => handlePullRateChange('pokeball', 'rare', e.target.value)}
                              data-testid="input-pokeball-rare"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="pokeball-superrare">Super Rare</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="pokeball-superrare"
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              value={pullRates.pokeball.superrare}
                              onChange={(e) => handlePullRateChange('pokeball', 'superrare', e.target.value)}
                              data-testid="input-pokeball-superrare"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="pokeball-legendary">Legendary</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="pokeball-legendary"
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              value={pullRates.pokeball.legendary}
                              onChange={(e) => handlePullRateChange('pokeball', 'legendary', e.target.value)}
                              data-testid="input-pokeball-legendary"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div className="flex items-end">
                          <Button 
                            className="w-full" 
                            onClick={() => handleUpdatePullRates('pokeball')}
                            disabled={updatePullRatesMutation.isPending}
                            data-testid="button-update-pokeball-rates"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {updatePullRatesMutation.isPending ? 'Updating...' : 'Update Pokeball'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Greatball Pack Rates */}
                <Card className="gaming-card">
                  <CardHeader>
                    <CardTitle className="font-gaming">Greatball Pack Pull Rates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div>
                          <Label htmlFor="greatball-common">Common</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="greatball-common"
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              value={pullRates.greatball.common}
                              onChange={(e) => handlePullRateChange('greatball', 'common', e.target.value)}
                              data-testid="input-greatball-common"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="greatball-uncommon">Uncommon</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="greatball-uncommon"
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              value={pullRates.greatball.uncommon}
                              onChange={(e) => handlePullRateChange('greatball', 'uncommon', e.target.value)}
                              data-testid="input-greatball-uncommon"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="greatball-rare">Rare</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="greatball-rare"
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              value={pullRates.greatball.rare}
                              onChange={(e) => handlePullRateChange('greatball', 'rare', e.target.value)}
                              data-testid="input-greatball-rare"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="greatball-superrare">Super Rare</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="greatball-superrare"
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              value={pullRates.greatball.superrare}
                              onChange={(e) => handlePullRateChange('greatball', 'superrare', e.target.value)}
                              data-testid="input-greatball-superrare"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="greatball-legendary">Legendary</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="greatball-legendary"
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              value={pullRates.greatball.legendary}
                              onChange={(e) => handlePullRateChange('greatball', 'legendary', e.target.value)}
                              data-testid="input-greatball-legendary"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div className="flex items-end">
                          <Button 
                            className="w-full" 
                            onClick={() => handleUpdatePullRates('greatball')}
                            disabled={updatePullRatesMutation.isPending}
                            data-testid="button-update-greatball-rates"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {updatePullRatesMutation.isPending ? 'Updating...' : 'Update Greatball'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Ultraball Pack Rates */}
                <Card className="gaming-card">
                  <CardHeader>
                    <CardTitle className="font-gaming">Ultraball Pack Pull Rates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div>
                          <Label htmlFor="ultraball-common">Common</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="ultraball-common"
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              value={pullRates.ultraball.common}
                              onChange={(e) => handlePullRateChange('ultraball', 'common', e.target.value)}
                              data-testid="input-ultraball-common"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="ultraball-uncommon">Uncommon</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="ultraball-uncommon"
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              value={pullRates.ultraball.uncommon}
                              onChange={(e) => handlePullRateChange('ultraball', 'uncommon', e.target.value)}
                              data-testid="input-ultraball-uncommon"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="ultraball-rare">Rare</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="ultraball-rare"
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              value={pullRates.ultraball.rare}
                              onChange={(e) => handlePullRateChange('ultraball', 'rare', e.target.value)}
                              data-testid="input-ultraball-rare"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="ultraball-superrare">Super Rare</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="ultraball-superrare"
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              value={pullRates.ultraball.superrare}
                              onChange={(e) => handlePullRateChange('ultraball', 'superrare', e.target.value)}
                              data-testid="input-ultraball-superrare"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="ultraball-legendary">Legendary</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="ultraball-legendary"
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              value={pullRates.ultraball.legendary}
                              onChange={(e) => handlePullRateChange('ultraball', 'legendary', e.target.value)}
                              data-testid="input-ultraball-legendary"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div className="flex items-end">
                          <Button 
                            className="w-full" 
                            onClick={() => handleUpdatePullRates('ultraball')}
                            disabled={updatePullRatesMutation.isPending}
                            data-testid="button-update-ultraball-rates"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {updatePullRatesMutation.isPending ? 'Updating...' : 'Update Ultraball'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Masterball Pack Rates */}
                <Card className="gaming-card">
                  <CardHeader>
                    <CardTitle className="font-gaming">Masterball Pack Pull Rates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div>
                          <Label htmlFor="masterball-common">Common</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="masterball-common"
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              value={pullRates.masterball.common}
                              onChange={(e) => handlePullRateChange('masterball', 'common', e.target.value)}
                              data-testid="input-masterball-common"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="masterball-uncommon">Uncommon</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="masterball-uncommon"
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              value={pullRates.masterball.uncommon}
                              onChange={(e) => handlePullRateChange('masterball', 'uncommon', e.target.value)}
                              data-testid="input-masterball-uncommon"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="masterball-rare">Rare</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="masterball-rare"
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              value={pullRates.masterball.rare}
                              onChange={(e) => handlePullRateChange('masterball', 'rare', e.target.value)}
                              data-testid="input-masterball-rare"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="masterball-superrare">Super Rare</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="masterball-superrare"
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              value={pullRates.masterball.superrare}
                              onChange={(e) => handlePullRateChange('masterball', 'superrare', e.target.value)}
                              data-testid="input-masterball-superrare"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="masterball-legendary">Legendary</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="masterball-legendary"
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              value={pullRates.masterball.legendary}
                              onChange={(e) => handlePullRateChange('masterball', 'legendary', e.target.value)}
                              data-testid="input-masterball-legendary"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div className="flex items-end">
                          <Button 
                            className="w-full" 
                            onClick={() => handleUpdatePullRates('masterball')}
                            disabled={updatePullRatesMutation.isPending}
                            data-testid="button-update-masterball-rates"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {updatePullRatesMutation.isPending ? 'Updating...' : 'Update Masterball'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Current Rates Display */}
                <Card className="gaming-card">
                  <CardHeader>
                    <CardTitle className="font-gaming">Current Pack Pull Rates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3 text-gray-600">Pokeball Pack</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Common:</span>
                            <span className="font-bold">80%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Uncommon:</span>
                            <span className="font-bold">18%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Rare:</span>
                            <span className="font-bold">2%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Super Rare:</span>
                            <span className="font-bold">0%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Legendary:</span>
                            <span className="font-bold">0%</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-3 text-green-600">Greatball Pack</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Common:</span>
                            <span className="font-bold">50%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Uncommon:</span>
                            <span className="font-bold">35%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Rare:</span>
                            <span className="font-bold">14%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Super Rare:</span>
                            <span className="font-bold">1%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Legendary:</span>
                            <span className="font-bold">0%</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-3 text-blue-600">Ultraball Pack</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Common:</span>
                            <span className="font-bold">25%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Uncommon:</span>
                            <span className="font-bold">40%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Rare:</span>
                            <span className="font-bold">25%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Super Rare:</span>
                            <span className="font-bold">8%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Legendary:</span>
                            <span className="font-bold">2%</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-3 text-purple-600">Masterball Pack</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Common:</span>
                            <span className="font-bold">5%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Uncommon:</span>
                            <span className="font-bold">10%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Rare:</span>
                            <span className="font-bold">15%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Super Rare:</span>
                            <span className="font-bold">10%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Legendary:</span>
                            <span className="font-bold text-legendary">60%</span>
                          </div>
                        </div>
                      </div>
                    </div>
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
    </div>
  );
}
