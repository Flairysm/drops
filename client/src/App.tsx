import { Switch, Route, Router } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, Suspense, lazy } from "react";
import "./mobile-enhancements.css";
// Lazy load pages for better performance
const Home = lazy(() => import("@/pages/home"));
const Landing = lazy(() => import("@/pages/landing"));
const Login = lazy(() => import("@/pages/login"));
const Register = lazy(() => import("@/pages/register"));
const Play = lazy(() => import("@/pages/games"));
const FindPika = lazy(() => import("./pages/findpika"));
const EnergyMatch = lazy(() => import("./pages/energy-match"));
const Dice = lazy(() => import("./pages/dice"));
const MyPacks = lazy(() => import("@/pages/my-packs"));
const Vault = lazy(() => import("@/pages/vault"));
const Admin = lazy(() => import("@/pages/admin"));
const Reload = lazy(() => import("@/pages/reload"));
const Purchase = lazy(() => import("@/pages/purchase"));
const Profile = lazy(() => import("@/pages/profile"));
const Shipping = lazy(() => import("@/pages/shipping"));
const ShippingAdmin = lazy(() => import("@/pages/shippingadmin"));
const NotFound = lazy(() => import("@/pages/not-found"));

function RouterComponent() {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Debug logging removed for production

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

  // Mobile-optimized loading component
  const MobileLoadingSpinner = () => (
    <div className="min-h-screen flex items-center justify-center mobile-spacing">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="mobile-text text-muted-foreground">Loading...</p>
      </div>
    </div>
  );

  // Show loading spinner only if actually loading and no timeout
  if (isLoading && !loadingTimeout) {
    return <MobileLoadingSpinner />;
  }

  // If timeout reached, show error state
  if (loadingTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 font-bold text-yellow-500">!</div>
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
    <Suspense fallback={<MobileLoadingSpinner />}>
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
    </Suspense>
  );
}

function App() {
  return (
    <div className="mobile-optimized">
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
    </div>
  );
}

export default App;
