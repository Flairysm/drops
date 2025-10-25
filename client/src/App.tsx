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
  const [routerReady, setRouterReady] = useState(false);
  
  // Debug logging (disabled in production)
  if (import.meta.env.DEV) {
    console.log('Router state:', { isAuthenticated, isLoading, routerReady });
  }

  // Ensure router is ready before rendering
  useEffect(() => {
    const timer = setTimeout(() => {
      setRouterReady(true);
    }, 100); // Small delay to ensure everything is initialized

    return () => clearTimeout(timer);
  }, []);

  // Add timeout to prevent infinite loading
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        setLoadingTimeout(true);
        console.warn('Authentication loading timeout - proceeding with app');
      }
    }, 5000); // Reduced to 5 second timeout

    return () => clearTimeout(timer);
  }, [isLoading]);

  // Error boundary effect
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      // Don't set error for 404s or network errors that might be temporary
      if (!event.error?.message?.includes('404') && !event.error?.message?.includes('Failed to fetch')) {
        setHasError(true);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      // Don't set error for 404s or network errors that might be temporary
      if (!event.reason?.message?.includes('404') && !event.reason?.message?.includes('Failed to fetch')) {
        setHasError(true);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Show error state if there's an error
  if (hasError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Something went wrong</h1>
          <p className="text-gray-300 mb-6">Please refresh the page to try again</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-2 rounded-lg transition-all duration-200"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Show loading spinner only if actually loading and no timeout
  if ((isLoading && !loadingTimeout) || !routerReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mb-4"></div>
        <p className="text-white text-lg font-medium">Loading...</p>
        <p className="text-gray-400 text-sm mt-2">If this takes too long, try refreshing the page</p>
      </div>
    );
  }

  // If loading timeout occurred, show a fallback with option to retry
  if (loadingTimeout) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Loading took too long</h1>
          <p className="text-gray-300 mb-6">The app is taking longer than expected to load</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-2 rounded-lg transition-all duration-200"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }


  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/home" component={Home} />
      <Route path="/auth" component={Landing} />
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
      {/* Fallback route - if nothing matches, show home page */}
      <Route component={Home} />
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
