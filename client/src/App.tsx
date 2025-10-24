import { Switch, Route, Router } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import Home from "@/pages/home";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Play from "@/pages/games";
import FindPika from "./pages/findpika";
import EnergyMatch from "./pages/energy-match";
import Dice from "./pages/dice";
import MyPacks from "@/pages/my-packs";
import Vault from "@/pages/vault";
import Admin from "@/pages/admin";
import Reload from "@/pages/reload";
import Purchase from "@/pages/purchase";
import Profile from "@/pages/profile";
import Shipping from "@/pages/shipping";
import ShippingAdmin from "@/pages/shippingadmin";
import NotFound from "@/pages/not-found";

function RouterComponent() {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Debug logging
  console.log('Router state:', { isAuthenticated, isLoading });

  // Add timeout to prevent infinite loading
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        setLoadingTimeout(true);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timer);
  }, [isLoading]);

  // Show loading spinner only if actually loading and no timeout
  if (isLoading && !loadingTimeout) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mb-4"></div>
        <p className="text-white text-lg font-medium">Loading...</p>
      </div>
    );
  }

  // If timeout reached, show error state
  if (loadingTimeout) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 font-bold text-yellow-500">!</div>
          <h1 className="text-2xl font-bold mb-2 text-white">Loading Timeout</h1>
          <p className="text-gray-300 mb-4">Something went wrong while loading</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/home" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      {isAuthenticated && (
        <>
          <Route path="/play" component={Play} />
          <Route path="/play/findpika" component={FindPika} />
          <Route path="/play/energy-match" component={EnergyMatch} />
          <Route path="/play/dice" component={Dice} />
          <Route path="/my-packs" component={MyPacks} />
          <Route path="/vault" component={Vault} />
          <Route path="/reload" component={Reload} />
          <Route path="/admin" component={Admin} />
          <Route path="/profile" component={Profile} />
          <Route path="/shipping" component={Shipping} />
          <Route path="/shippingadmin" component={ShippingAdmin} />
          <Route path="/purchase/:type/:id" component={Purchase} />
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
