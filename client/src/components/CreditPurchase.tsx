import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CreditCard, Coins, Zap, Star } from "lucide-react";

interface PurchaseResult {
  success: boolean;
  creditsAdded: number;
}

export function CreditPurchase() {
  const [customAmount, setCustomAmount] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const purchaseMutation = useMutation({
    mutationFn: async (data: { amount: string; bundleType?: string }) => {
      const response = await apiRequest("POST", "/api/credits/purchase", data);
      return response.json() as Promise<PurchaseResult>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(["/api/auth/user"]);
      toast({
        title: "Credits Added!",
        description: `Successfully added ${result.creditsAdded.toFixed(2)} credits to your account`,
        duration: 5000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Purchase Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleBundlePurchase = (amount: string, bundleType: string) => {
    purchaseMutation.mutate({ amount, bundleType });
  };

  const handleCustomPurchase = () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (amount < 1) {
      toast({
        title: "Minimum Purchase",
        description: "Minimum purchase amount is RM 1.00",
        variant: "destructive",
      });
      return;
    }

    purchaseMutation.mutate({ amount: customAmount });
  };

  const bundles = [
    {
      credits: 10,
      price: "10.00",
      bonus: 0,
      popular: false,
      icon: <Coins className="w-6 h-6" />,
      color: "from-blue-500 to-blue-600",
    },
    {
      credits: 50,
      price: "50.00", 
      bonus: 5,
      popular: true,
      icon: <Star className="w-6 h-6" />,
      color: "from-purple-500 to-purple-600",
    },
    {
      credits: 100,
      price: "100.00",
      bonus: 20,
      popular: false,
      icon: <Zap className="w-6 h-6" />,
      color: "from-yellow-500 to-yellow-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Bundle Options */}
      <div className="grid gap-4">
        {bundles.map((bundle, index) => (
          <Card 
            key={index} 
            className={`gaming-card hover:glow-effect transition-all relative ${
              bundle.popular ? "border-2 border-accent" : ""
            }`}
          >
            {bundle.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-accent text-accent-foreground">
                  Most Popular
                </Badge>
              </div>
            )}
            
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${bundle.color} flex items-center justify-center text-white`}>
                    {bundle.icon}
                  </div>
                  <div>
                    <div className="font-semibold">
                      {bundle.credits} {bundle.bonus > 0 && `+ ${bundle.bonus}`} Credits
                    </div>
                    <div className="text-sm text-muted-foreground">
                      RM {bundle.price} {bundle.bonus > 0 && `(${Math.round((bundle.bonus / bundle.credits) * 100)}% bonus!)`}
                    </div>
                  </div>
                </div>
                
                <Button
                  onClick={() => handleBundlePurchase(bundle.price, `bundle_${bundle.credits}`)}
                  disabled={purchaseMutation.isPending}
                  className={`bg-gradient-to-r ${bundle.color} hover:glow-effect transition-all`}
                  data-testid={`button-purchase-bundle-${bundle.credits}`}
                >
                  {purchaseMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Buy Now
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Custom Amount */}
      <Card className="gaming-card">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="custom-amount">Custom Amount (RM)</Label>
              <p className="text-sm text-muted-foreground mb-2">
                1 RM = 1 Credit • Credits never expire
              </p>
              <div className="flex space-x-2">
                <Input
                  id="custom-amount"
                  type="number"
                  min="1"
                  step="0.01"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="25.00"
                  data-testid="input-custom-amount"
                />
                <Button
                  onClick={handleCustomPurchase}
                  disabled={!customAmount || purchaseMutation.isPending}
                  className="bg-gradient-to-r from-primary to-accent hover:glow-effect"
                  data-testid="button-purchase-custom"
                >
                  {purchaseMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Top Up
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Info */}
      <Card className="gaming-card">
        <CardContent className="p-6">
          <h4 className="font-semibold mb-4">Payment Information</h4>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Secure payment processing</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Credits added instantly</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Credits never expire</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>No cash refunds - all sales final</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
