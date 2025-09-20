import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { NavigationFooter } from "@/components/NavigationFooter";
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
    <div className="min-h-screen bg-black">
      <Navigation />
      
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      <main className="pt-16 pb-16 relative z-10">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 w-full">
          {/* Header */}
          <section className="py-4 sm:py-8 text-center">
            <h1 className="font-gaming font-bold text-3xl sm:text-4xl md:text-5xl mb-3 sm:mb-4">
              <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                PLINKO DROP
              </span>
            </h1>
            <p className="text-white text-base sm:text-lg max-w-2xl mx-auto px-2">
              Drop balls and watch them bounce through the pegs to win amazing packs!
            </p>
          </section>


          {/* Game */}
          <PlinkoGame />
        </div>
      </main>
      
      <NavigationFooter />
    </div>
  );
}