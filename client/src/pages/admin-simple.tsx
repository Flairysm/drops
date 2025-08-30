import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Package, Plus, Settings } from "lucide-react";

// Original pokeball odds from the wheel game
const DEFAULT_PACK_ODDS = [
  { tier: "D", probability: 70.0 },
  { tier: "C", probability: 20.0 },
  { tier: "B", probability: 7.0 },
  { tier: "A", probability: 2.0 },
  { tier: "S", probability: 0.8 },
  { tier: "SS", probability: 0.15 },
  { tier: "SSS", probability: 0.05 },
];

const cardSchema = z.object({
  name: z.string().min(1, "Card name is required"),
  tier: z.enum(["D", "C", "B", "A", "S", "SS", "SSS"]),
  imageUrl: z.string().url("Valid image URL required").optional(),
  marketValue: z.string().min(1, "Market value is required"),
  packType: z.string().optional(),
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

export default function AdminSimple() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPackType, setSelectedPackType] = useState<string>("");

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

  // Forms
  const cardForm = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      name: "",
      tier: "D",
      imageUrl: "",
      marketValue: "1.00",
      packType: "",
    },
  });

  const virtualPackForm = useForm<VirtualPackFormData>({
    resolver: zodResolver(virtualPackSchema),
    defaultValues: {
      name: "",
      description: "",
      imageUrl: "",
      price: "8.00",
      cardCount: 8,
    },
  });

  // Queries
  const { data: virtualPacks } = useQuery({
    queryKey: ["/api/admin/virtual-packs"],
    enabled: isAuthenticated,
  });

  const { data: virtualLibraryCards } = useQuery({
    queryKey: ["/api/admin/virtual-library"],
    enabled: isAuthenticated,
  });

  // Mutations
  const createVirtualLibraryCardMutation = useMutation({
    mutationFn: async (data: CardFormData) => {
      await apiRequest("POST", "/api/admin/virtual-library", {
        cardId: `card_${Date.now()}`,
        name: data.name,
        tier: data.tier,
        imageUrl: data.imageUrl || null,
        marketValue: data.marketValue,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/virtual-library"] });
      cardForm.reset();
      toast({
        title: "Card Created",
        description: "New card has been added to the virtual library",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Creating Card",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createVirtualPackMutation = useMutation({
    mutationFn: async (data: VirtualPackFormData) => {
      // Create the pack
      const packResponse = await apiRequest("POST", "/api/admin/virtual-packs", data);
      const newPack = packResponse as any;

      // Set default pull rates using original pokeball odds
      await apiRequest("POST", `/api/admin/virtual-packs/${newPack.id}/pull-rates`, {
        rates: DEFAULT_PACK_ODDS.map(odd => ({
          cardTier: odd.tier,
          probability: odd.probability,
        }))
      });

      // Add selected cards to pack if any pack type is selected
      if (selectedPackType) {
        const cardsToAdd = (virtualLibraryCards as any)?.filter((card: any) => 
          card.tier === selectedPackType || 
          (selectedPackType === "all" && true)
        );
        
        if (cardsToAdd && cardsToAdd.length > 0) {
          await apiRequest("POST", `/api/admin/virtual-packs/${newPack.id}/cards`, {
            cardIds: cardsToAdd.map((card: any) => card.id),
            weights: cardsToAdd.map(() => 1),
          });
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
        description: "New themed pack has been created with default odds",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Creating Pack",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onCardSubmit = (data: CardFormData) => {
    createVirtualLibraryCardMutation.mutate(data);
  };

  const onPackSubmit = (data: VirtualPackFormData) => {
    createVirtualPackMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <section className="py-8 text-center">
            <h1 className="font-gaming font-bold text-4xl md:text-5xl mb-4">
              <span className="bg-gradient-to-r from-primary via-accent to-legendary bg-clip-text text-transparent">ADMIN PANEL</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
              Simplified admin interface for managing cards and themed packs
            </p>
          </section>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Add New Card */}
            <Card className="gaming-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add New Card
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={cardForm.handleSubmit(onCardSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="card-name">Card Name</Label>
                    <Input
                      id="card-name"
                      {...cardForm.register("name")}
                      placeholder="Enter card name"
                      data-testid="input-card-name"
                    />
                    {cardForm.formState.errors.name && (
                      <p className="text-sm text-destructive mt-1">{cardForm.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="card-tier">Tier</Label>
                    <Select onValueChange={(value) => cardForm.setValue("tier", value as any)}>
                      <SelectTrigger data-testid="select-card-tier">
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="D">D Tier (Common)</SelectItem>
                        <SelectItem value="C">C Tier (Uncommon)</SelectItem>
                        <SelectItem value="B">B Tier (Rare)</SelectItem>
                        <SelectItem value="A">A Tier (Epic)</SelectItem>
                        <SelectItem value="S">S Tier (Legendary)</SelectItem>
                        <SelectItem value="SS">SS Tier (Mythic)</SelectItem>
                        <SelectItem value="SSS">SSS Tier (Ultimate)</SelectItem>
                      </SelectContent>
                    </Select>
                    {cardForm.formState.errors.tier && (
                      <p className="text-sm text-destructive mt-1">{cardForm.formState.errors.tier.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="card-image">Image URL (Optional)</Label>
                    <Input
                      id="card-image"
                      {...cardForm.register("imageUrl")}
                      placeholder="https://example.com/image.jpg"
                      data-testid="input-card-image"
                    />
                    {cardForm.formState.errors.imageUrl && (
                      <p className="text-sm text-destructive mt-1">{cardForm.formState.errors.imageUrl.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="card-value">Market Value</Label>
                    <Input
                      id="card-value"
                      {...cardForm.register("marketValue")}
                      placeholder="1.00"
                      data-testid="input-card-value"
                    />
                    {cardForm.formState.errors.marketValue && (
                      <p className="text-sm text-destructive mt-1">{cardForm.formState.errors.marketValue.message}</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={createVirtualLibraryCardMutation.isPending}
                    data-testid="button-create-card"
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
                <form onSubmit={virtualPackForm.handleSubmit(onPackSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="pack-name">Pack Name</Label>
                    <Input
                      id="pack-name"
                      {...virtualPackForm.register("name")}
                      placeholder="e.g., Black Bolt Collection"
                      data-testid="input-pack-name"
                    />
                    {virtualPackForm.formState.errors.name && (
                      <p className="text-sm text-destructive mt-1">{virtualPackForm.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="pack-description">Description (Optional)</Label>
                    <Input
                      id="pack-description"
                      {...virtualPackForm.register("description")}
                      placeholder="Pack description"
                      data-testid="input-pack-description"
                    />
                  </div>

                  <div>
                    <Label htmlFor="pack-price">Price</Label>
                    <Input
                      id="pack-price"
                      {...virtualPackForm.register("price")}
                      placeholder="8.00"
                      data-testid="input-pack-price"
                    />
                    {virtualPackForm.formState.errors.price && (
                      <p className="text-sm text-destructive mt-1">{virtualPackForm.formState.errors.price.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="card-pool">Card Pool</Label>
                    <Select onValueChange={setSelectedPackType}>
                      <SelectTrigger data-testid="select-card-pool">
                        <SelectValue placeholder="Select which cards to include" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Cards</SelectItem>
                        <SelectItem value="D">D Tier Cards Only</SelectItem>
                        <SelectItem value="C">C Tier Cards Only</SelectItem>
                        <SelectItem value="B">B Tier Cards Only</SelectItem>
                        <SelectItem value="A">A Tier Cards Only</SelectItem>
                        <SelectItem value="S">S Tier Cards Only</SelectItem>
                        <SelectItem value="SS">SS Tier Cards Only</SelectItem>
                        <SelectItem value="SSS">SSS Tier Cards Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <Settings className="w-4 h-4" />
                      <span className="font-semibold">Default Pokeball Odds Applied:</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <span>D: 70%</span><span>C: 20%</span>
                      <span>B: 7%</span><span>A: 2%</span>
                      <span>S: 0.8%</span><span>SS: 0.15%</span>
                      <span className="col-span-2">SSS: 0.05%</span>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={createVirtualPackMutation.isPending}
                    data-testid="button-create-pack"
                  >
                    {createVirtualPackMutation.isPending ? "Creating..." : "Create Pack"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Existing Packs */}
          <section className="mt-12">
            <Card className="gaming-card">
              <CardHeader>
                <CardTitle>Existing Themed Packs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {(virtualPacks as any)?.map((pack: any) => (
                    <div key={pack.id} className="border rounded-lg p-4 space-y-2">
                      <h3 className="font-semibold">{pack.name}</h3>
                      <p className="text-sm text-muted-foreground">{pack.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Price: {pack.price} credits</span>
                        <span className="text-sm">Cards: {pack.cardCount}</span>
                      </div>
                    </div>
                  )) || (
                    <p className="text-muted-foreground">No themed packs created yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}