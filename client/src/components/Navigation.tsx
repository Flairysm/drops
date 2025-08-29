import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Moon, Sun, Zap, Menu, X } from "lucide-react";
import { useState } from "react";

export function Navigation() {
  const { user, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { data: userData } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) return null;

  const navItems = [
    { path: "/", label: "Home" },
    { path: "/games", label: "Games" },
    { path: "/vault", label: "Vault" },
    { path: "/admin", label: "Admin" },
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
                Flair TCG Arcade
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
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

            {/* Credits Display */}
            <div className="gaming-card px-4 py-2 rounded-lg" data-testid="display-credits">
              <span className="text-sm text-muted-foreground">Credits:</span>
              <span className="font-bold text-accent ml-2">
                {userData?.credits || "0.00"}
              </span>
            </div>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              data-testid="button-theme-toggle"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {/* User Menu */}
            <div className="flex items-center space-x-2 gaming-card px-3 py-2 rounded-lg">
              <img
                src={user?.profileImageUrl || "https://via.placeholder.com/32"}
                alt="User avatar"
                className="w-8 h-8 rounded-full border-2 border-primary"
                data-testid="img-avatar"
              />
              <span data-testid="text-username">{user?.username || userData?.username || "Player"}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = "/api/logout"}
                data-testid="button-logout"
              >
                Logout
              </Button>
            </div>
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
              {navItems.map((item) => (
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
              
              <div className="gaming-card px-4 py-2 rounded-lg">
                <span className="text-sm text-muted-foreground">Credits:</span>
                <span className="font-bold text-accent ml-2">
                  {userData?.credits || "0.00"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTheme}
                  data-testid="button-mobile-theme-toggle"
                >
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = "/api/logout"}
                  data-testid="button-mobile-logout"
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
