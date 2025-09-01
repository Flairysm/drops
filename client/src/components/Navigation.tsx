import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Moon, Sun, Zap, Menu, X } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function Navigation() {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const [, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { toast } = useToast();

  const { data: userData } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: isAuthenticated,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.clear(); // Clear all cached data
      toast({
        title: "Logged out",
        description: "You've been logged out successfully.",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Logout failed",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const navItems = [
    { path: "/", label: "Home" },
    { path: "/play", label: "Play" },
    { path: "/my-packs", label: "My Packs" },
    { path: "/vault", label: "Vault" },
    ...(isAdmin ? [{ path: "/admin", label: "Admin" }] : []),
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 nav-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center space-x-3 cursor-pointer" data-testid="link-home">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center glow-effect">
                <Zap className="text-primary-foreground text-xl" />
              </div>
              <span className="font-gaming font-bold text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Drops
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {isAuthenticated && navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <span 
                  className={`hover:text-primary transition-colors cursor-pointer ${
                    location === item.path ? "text-primary" : ""
                  }`}
                  data-testid={`link-${item.label.toLowerCase()}`}
                >
                  {item.label}
                </span>
              </Link>
            ))}

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              data-testid="button-theme-toggle"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {isAuthenticated ? (
              <>
                {/* Credits Display */}
                <div className="gaming-card px-4 py-2 rounded-lg" data-testid="display-credits">
                  <span className="text-sm text-muted-foreground">Credits:</span>
                  <span className="font-bold text-accent ml-2">
                    {(userData as any)?.credits || "0.00"}
                  </span>
                </div>

                {/* User Menu */}
                <div className="flex items-center space-x-2 gaming-card px-3 py-2 rounded-lg">
                  <img
                    src={(user as any)?.profileImageUrl || "https://via.placeholder.com/32"}
                    alt="User avatar"
                    className="w-8 h-8 rounded-full border-2 border-primary"
                    data-testid="img-avatar"
                  />
                  <span data-testid="text-username">{(user as any)?.username || (userData as any)?.username || "Player"}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                    data-testid="button-logout"
                  >
                    {logoutMutation.isPending ? "Logging out..." : "Logout"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Login/Signup buttons for non-authenticated users */}
                <Link href="/login">
                  <Button
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    data-testid="button-login"
                  >
                    Sign In
                  </Button>
                </Link>
                
                <Link href="/register">
                  <Button
                    className="bg-gradient-to-r from-primary to-accent hover:glow-effect"
                    data-testid="button-register"
                  >
                    Create Account
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="space-y-4">
              {isAuthenticated && navItems.map((item) => (
                <Link key={item.path} href={item.path}>
                  <span 
                    className={`block hover:text-primary transition-colors cursor-pointer ${
                      location === item.path ? "text-primary" : ""
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    data-testid={`link-mobile-${item.label.toLowerCase()}`}
                  >
                    {item.label}
                  </span>
                </Link>
              ))}
              
              {isAuthenticated && (
                <div className="gaming-card px-4 py-2 rounded-lg">
                  <span className="text-sm text-muted-foreground">Credits:</span>
                  <span className="font-bold text-accent ml-2">
                    {(userData as any)?.credits || "0.00"}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTheme}
                  data-testid="button-mobile-theme-toggle"
                >
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </Button>
                
                {isAuthenticated ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                    data-testid="button-mobile-logout"
                  >
                    {logoutMutation.isPending ? "Logging out..." : "Logout"}
                  </Button>
                ) : (
                  <div className="space-x-2">
                    <Link href="/login">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsMobileMenuOpen(false)}
                        data-testid="button-mobile-login"
                      >
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/register">
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-primary to-accent"
                        onClick={() => setIsMobileMenuOpen(false)}
                        data-testid="button-mobile-register"
                      >
                        Create Account
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
