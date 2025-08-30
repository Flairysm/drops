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
  Trash2
} from "lucide-react";
import type { User, VirtualLibraryCard } from "@shared/schema";

const virtualLibrarySchema = z.object({
  name: z.string().min(1, "Card name is required"),
  tier: z.enum(["D", "C", "B", "A", "S", "SS", "SSS"]),
  imageUrl: z.string().optional(),
  marketValue: z.string().min(1, "Market value is required"),
});

const virtualPackSchema = z.object({
  name: z.string().min(1, "Pack name is required"),
  description: z.string().optional(),
  price: z.string().min(1, "Price is required"),
  cardCount: z.number().min(1, "Card count must be at least 1").max(20, "Card count cannot exceed 20"),
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

export default function Admin() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPackType, setSelectedPackType] = useState<string>("");
  const [deleteVirtualLibraryCardId, setDeleteVirtualLibraryCardId] = useState<string | null>(null);

  const virtualLibraryForm = useForm<VirtualLibraryFormData>({
    resolver: zodResolver(virtualLibrarySchema),
    defaultValues: {
      name: "",
      tier: "D",
      imageUrl: "",
      marketValue: "",
    },
  });

  const virtualPackForm = useForm<VirtualPackFormData>({
    resolver: zodResolver(virtualPackSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      cardCount: 10,
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
      // Create the pack first
      const packResponse = await apiRequest("POST", "/api/admin/virtual-packs", data);
      const newPack = packResponse as any;
      
      if (newPack && newPack.id) {
        // Set default pokeball odds
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
          console.log("Pull rates setup skipped:", error);
        }

        // Add cards if pool selected
        if (selectedPackType && virtualLibraryCards) {
          try {
            const cardsToAdd = virtualLibraryCards.filter((card: any) => 
              selectedPackType === "all" || card.tier === selectedPackType
            );
            
            if (cardsToAdd.length > 0) {
              await apiRequest("POST", `/api/admin/virtual-packs/${newPack.id}/cards`, {
                cardIds: cardsToAdd.map((card: any) => card.id),
                weights: cardsToAdd.map(() => 1),
              });
            }
          } catch (error) {
            console.log("Card pool setup skipped:", error);
          }
        }
      }
      
      return newPack;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/virtual-packs"] });
      virtualPackForm.reset();
      setSelectedPackType("");
      toast({
        title: "Pack Created",
        description: "Themed pack created successfully",
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/virtual-packs"] });
      toast({
        title: "Success",
        description: "Pack deleted successfully",
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

  const handleDeleteVirtualPack = (packId: string) => {
    if (confirm("Are you sure you want to delete this pack?")) {
      deleteVirtualPackMutation.mutate(packId);
    }
  };

  const handleManagePackCards = (pack: any) => {
    toast({
      title: "Feature Coming Soon",
      description: "Advanced pack card management will be available soon",
    });
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

            {/* Unified Inventory Management */}
            <TabsContent value="inventory">
              <div className="space-y-8">
                {/* Quick Actions Row */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Add New Card */}
                  <Card className="gaming-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Add New Card
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={virtualLibraryForm.handleSubmit(onVirtualLibrarySubmit)} className="space-y-4">
                        <div>
                          <Label htmlFor="unified-card-name">Card Name</Label>
                          <Input
                            id="unified-card-name"
                            {...virtualLibraryForm.register("name")}
                            placeholder="Enter card name"
                            data-testid="input-unified-card-name"
                          />
                          {virtualLibraryForm.formState.errors.name && (
                            <p className="text-sm text-destructive mt-1">{virtualLibraryForm.formState.errors.name.message}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="unified-card-tier">Tier</Label>
                            <Select onValueChange={(value) => virtualLibraryForm.setValue("tier", value as any)}>
                              <SelectTrigger data-testid="select-unified-card-tier">
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
                            <Label htmlFor="unified-card-value">Market Value</Label>
                            <Input
                              id="unified-card-value"
                              {...virtualLibraryForm.register("marketValue")}
                              placeholder="1.00"
                              data-testid="input-unified-card-value"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="unified-card-image">Image URL (Optional)</Label>
                          <Input
                            id="unified-card-image"
                            {...virtualLibraryForm.register("imageUrl")}
                            placeholder="https://example.com/image.jpg"
                            data-testid="input-unified-card-image"
                          />
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={createVirtualLibraryCardMutation.isPending}
                          data-testid="button-unified-create-card"
                        >
                          {createVirtualLibraryCardMutation.isPending ? "Creating..." : "Add Card"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Create Themed Pack */}
                  <Card className="gaming-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Create Themed Pack
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={virtualPackForm.handleSubmit((data) => {
                        createVirtualPackMutation.mutate(data);
                      })} className="space-y-4">
                        <div>
                          <Label htmlFor="unified-pack-name">Pack Name</Label>
                          <Input
                            id="unified-pack-name"
                            {...virtualPackForm.register("name")}
                            placeholder="e.g., Black Bolt Collection"
                            data-testid="input-unified-pack-name"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="unified-pack-price">Price</Label>
                            <Input
                              id="unified-pack-price"
                              {...virtualPackForm.register("price")}
                              placeholder="8.00"
                              data-testid="input-unified-pack-price"
                            />
                          </div>

                          <div>
                            <Label htmlFor="unified-card-pool">Card Pool</Label>
                            <Select onValueChange={setSelectedPackType}>
                              <SelectTrigger data-testid="select-unified-card-pool">
                                <SelectValue placeholder="Select cards" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Cards</SelectItem>
                                <SelectItem value="D">D Tier Only</SelectItem>
                                <SelectItem value="C">C Tier Only</SelectItem>
                                <SelectItem value="B">B Tier Only</SelectItem>
                                <SelectItem value="A">A Tier Only</SelectItem>
                                <SelectItem value="S">S Tier Only</SelectItem>
                                <SelectItem value="SS">SS Tier Only</SelectItem>
                                <SelectItem value="SSS">SSS Tier Only</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                          <strong>Default Pokeball Odds:</strong> D:70%, C:20%, B:7%, A:2%, S:0.8%, SS:0.15%, SSS:0.05%
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full" 
                          disabled={createVirtualPackMutation.isPending}
                          data-testid="button-unified-create-pack"
                        >
                          {createVirtualPackMutation.isPending ? "Creating..." : "Create Pack"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>

                {/* Management Sections */}
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Card Library */}
                  <Card className="gaming-card">
                    <CardHeader>
                      <CardTitle>Card Library ({virtualLibraryCards?.length || 0} cards)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {virtualLibraryCards?.map((card: any) => (
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
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteVirtualLibraryCard(card.id)}
                              data-testid={`button-delete-card-${card.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )) || (
                          <p className="text-center text-muted-foreground py-8">No cards created yet.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Themed Packs */}
                  <Card className="gaming-card">
                    <CardHeader>
                      <CardTitle>Themed Packs ({virtualPacks?.length || 0} packs)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {virtualPacks?.map((pack: any) => (
                          <div key={pack.id} className="flex items-center justify-between p-3 rounded border">
                            <div>
                              <div className="font-medium">{pack.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {pack.price} credits • {pack.cardCount} cards
                              </div>
                              {pack.description && (
                                <div className="text-xs text-muted-foreground">{pack.description}</div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleManagePackCards(pack)}
                                data-testid={`button-manage-cards-${pack.id}`}
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
                        )) || (
                          <p className="text-center text-muted-foreground py-8">No themed packs created yet.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
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
        </div>
      </div>
    </div>
  );
}