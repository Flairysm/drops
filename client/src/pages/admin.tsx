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
  Clock
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

  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"],
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

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated && activeTab === "users",
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

  const { data: cards } = useQuery<CardType[]>({
    queryKey: ["/api/cards"],
    enabled: isAuthenticated && activeTab === "inventory",
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
      queryClient.invalidateQueries(["/api/cards"]);
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
      queryClient.invalidateQueries(["/api/admin/users"]);
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
            <TabsList className="grid w-full max-w-lg mx-auto grid-cols-4 mb-8">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="gaming-card">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-primary/20 rounded-full mx-auto mb-3 flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-2xl font-bold text-primary" data-testid="stat-total-users">
                      {stats?.totalUsers || 0}
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
                      RM {stats?.totalRevenue || "0.00"}
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
                      {stats?.totalCards || 0}
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
                              disabled={user.isBanned}
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
                          <Label htmlFor="marketValue">Market Value (Credits)</Label>
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
                                  {card.packType} • RM {card.marketValue}
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="font-semibold" data-testid={`text-card-stock-${card.id}`}>
                                {card.stock} in stock
                              </div>
                              <Badge variant={card.stock > 0 ? "default" : "destructive"}>
                                {card.stock > 0 ? "Available" : "Out of Stock"}
                              </Badge>
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
    </div>
  );
}
