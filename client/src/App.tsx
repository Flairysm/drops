import { Switch, Route, Router } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useState, useEffect } from "react";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import EmailSent from "@/pages/email-sent";
import VerifyEmail from "@/pages/verify-email";
import Play from "@/pages/games";
import Plinko from "@/pages/plinko";
import Wheel from "@/pages/wheel";
import Minesweeper from "@/pages/minesweeper";
import MysteryPacks from "@/pages/mystery-packs";
import ThemedPacks from "@/pages/themed-packs";
import MyPacks from "@/pages/my-packs";
import Vault from "@/pages/vault";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";

function RouterComponent() {
  const { isAuthenticated, loading } = useSupabaseAuth();
  
  // Debug logging
  console.log('🔍 Router state:', { isAuthenticated, loading });

  // Add timeout to prevent infinite loading
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        setLoadingTimeout(true);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timer);
  }, [loading]);

  // Show loading spinner only if actually loading and no timeout
  if (loading && !loadingTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // If timeout reached, show error state
  if (loadingTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">Loading Timeout</h1>
          <p className="text-muted-foreground mb-4">Something went wrong while loading</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/email-sent" component={EmailSent} />
      <Route path="/verify-email" component={VerifyEmail} />
      {isAuthenticated && (
        <>
          <Route path="/play" component={Play} />
          <Route path="/play/plinko" component={Plinko} />
          <Route path="/play/wheel" component={Wheel} />
          <Route path="/play/minesweeper" component={Minesweeper} />
          <Route path="/play/mystery-packs" component={MysteryPacks} />
          <Route path="/play/themed-packs" component={ThemedPacks} />
          <Route path="/my-packs" component={MyPacks} />
          <Route path="/vault" component={Vault} />
          <Route path="/admin" component={Admin} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router>
            <RouterComponent />
          </Router>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
