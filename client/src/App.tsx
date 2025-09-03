import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
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

// Trigger new Vercel deployment with updated Vite config
// Force redeploy to pick up latest fixes
function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
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
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
