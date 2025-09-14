import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ThemedPacks() {
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
      <main className="pt-20 pb-20">
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
              <span className="bg-gradient-to-r from-primary via-accent to-legendary bg-clip-text text-transparent">THEMED PACKS</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
              Experience a new way of Rip and Ship.
            </p>
          </section>

          {/* Coming Soon */}
          <Card className="gaming-card max-w-6xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="font-gaming text-2xl">Themed Pack Store</CardTitle>
            </CardHeader>
            <CardContent className="text-center py-12">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-muted-foreground">Coming Soon</h3>
                <p className="text-muted-foreground">
                  Themed packs are currently under development. Check back soon for exciting new pack types!
                </p>
                <Badge variant="outline" className="text-sm">
                  In Development
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}