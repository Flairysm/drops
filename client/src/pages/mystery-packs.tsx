import { useEffect } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { PackOpening } from "@/components/PackOpening";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function MysteryPacks() {
  const { toast } = useToast();
  const { isAuthenticated, loading } = useSupabaseAuth();

  const { data: packs } = useQuery({
    queryKey: ["/api/packs"],
    enabled: isAuthenticated,
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
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
  }, [isAuthenticated, loading, toast]);

  if (loading) {
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
            <Button 
              variant="ghost" 
              className="mb-4"
              onClick={() => window.location.href = "/play"}
              data-testid="button-back-to-play"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Play
            </Button>
            <h1 className="font-gaming font-bold text-4xl md:text-5xl mb-4">
              <span className="bg-gradient-to-r from-primary via-accent to-legendary bg-clip-text text-transparent">MYSTERY PACKS</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
              Open mystery packs filled with random cards from our entire collection!
            </p>
          </section>

          {/* Game */}
          <Card className="gaming-card max-w-4xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="font-gaming text-2xl">Mystery Pack Opening</CardTitle>
              <div className="flex justify-center space-x-4 mt-4">
                <Badge variant="secondary">Cost: 4.99 Credits</Badge>
                <Badge className="bg-accent text-primary-foreground">10 Cards Total</Badge>
                <Badge className="bg-primary text-primary-foreground">Random Tiers</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <PackOpening packs={(packs as any) || []} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}