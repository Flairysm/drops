import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { PlinkoGame } from "@/components/PlinkoGame";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Plinko() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

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
              <span className="bg-gradient-to-r from-primary via-accent to-legendary bg-clip-text text-transparent">PLINKO DROP</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
              Drop balls and watch them bounce through the pegs to win amazing cards!
            </p>
          </section>

          {/* Game */}
          <Card className="gaming-card max-w-4xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="font-gaming text-2xl">Plinko Drop</CardTitle>
              <div className="flex justify-center space-x-4 mt-4">
                <Badge className="bg-legendary text-primary-foreground">Max: SSS Tier</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <PlinkoGame />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}