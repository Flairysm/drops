import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Moon, Sun, Menu, X, User, LogOut, Crown, Sparkles } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function Navigation() {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const [, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const { data: userData } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: isAuthenticated,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      // Clear JWT token from localStorage
      localStorage.removeItem('authToken');
      console.log('JWT token cleared from localStorage');
      
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
    { path: "home", label: "Home" },
    { path: "/play", label: "Play" },
    { path: "/my-packs", label: "My Packs" },
    { path: "/vault", label: "Vault" },
    ...(isAdmin ? [
      { path: "/admin", label: "Admin" },
      { path: "/shippingadmin", label: "Shipping Admin" }
    ] : []),
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0B0B12]/95 backdrop-blur-xl border-b border-[#26263A]/50 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* DROPS Logo from Asset */}
          <Link href="/">
            <div className="flex items-center space-x-4 cursor-pointer group" data-testid="link-home">
              <div className="relative">
                <img 
                  src="/assets/drops-logo.png" 
                  alt="DROPS" 
                  className="h-8 w-auto group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>
          </Link>

          {/* Center Navigation - Desktop Only */}
          <div className="hidden md:flex items-center space-x-8">
            {isAuthenticated && navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <div 
                  className={`relative px-4 py-2 rounded-lg transition-all duration-300 cursor-pointer group ${
                    location === item.path 
                      ? "text-[#22D3EE] bg-[#151521]/50 shadow-[0_0_12px_rgba(34,211,238,0.2)]" 
                      : "text-[#E5E7EB] hover:text-[#22D3EE] hover:bg-[#151521]/30"
                  }`}
                  data-testid={`link-${item.label.toLowerCase()}`}
                >
                  <span className="font-medium text-sm tracking-wide uppercase">
                    {item.label}
                  </span>
                  {location === item.path && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-[#22D3EE] rounded-full shadow-[0_0_6px_rgba(34,211,238,0.8)]"></div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Right Side - Reload and Profile */}
          <div className="flex items-center space-x-4 ml-auto">
            {/* Neon Reload Credits Button */}
            <Link href="/reload">
              <Button 
                size="sm"
                className="group relative bg-gradient-to-r from-[#22D3EE] via-[#00E6A8] to-[#22D3EE] hover:from-[#00E6A8] hover:via-[#22D3EE] hover:to-[#00E6A8] text-[#0B0B12] font-semibold px-4 py-2 rounded-lg shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] transition-all duration-300 hover:scale-105"
                data-testid="button-reload-credits"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-[#0B0B12] rounded-sm flex items-center justify-center">
                    <span className="text-[#22D3EE] text-xs font-bold">₵</span>
                  </div>
                  <span className="text-sm tracking-wide">Reload</span>
                </div>
              </Button>
            </Link>

            {isAuthenticated ? (
              <>
                {/* Luxury Profile Dropdown */}
                <div className="relative" ref={profileRef}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="group flex items-center text-[#E5E7EB] hover:text-[#22D3EE] hover:bg-[#151521]/50 p-2 rounded-2xl transition-all duration-300 border border-transparent hover:border-[#26263A]/50"
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    data-testid="button-profile"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-[#7C3AED] to-[#22D3EE] rounded-full flex items-center justify-center shadow-[0_0_12px_rgba(124,58,237,0.3)] group-hover:shadow-[0_0_16px_rgba(124,58,237,0.5)] transition-all duration-300">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  </Button>

                  {/* Luxury Profile Dropdown Menu */}
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-3 w-56 bg-[#151521]/95 backdrop-blur-xl border border-[#26263A]/50 rounded-2xl shadow-2xl z-50 overflow-hidden">
                      <div className="py-3">
                        <div className="px-4 py-2 border-b border-[#26263A]/30">
                          <div className="text-xs text-[#9CA3AF] font-medium uppercase tracking-wider">Account</div>
                        </div>
                        <Link href="/profile">
                          <div 
                            className="px-4 py-3 text-[#E5E7EB] hover:bg-[#26263A]/30 cursor-pointer flex items-center space-x-3 transition-all duration-200 group"
                            onClick={() => setIsProfileOpen(false)}
                          >
                            <div className="w-8 h-8 bg-gradient-to-br from-[#7C3AED] to-[#A855F7] rounded-lg flex items-center justify-center shadow-[0_0_8px_rgba(124,58,237,0.3)] group-hover:shadow-[0_0_12px_rgba(124,58,237,0.5)] transition-all duration-200">
                              <User className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">Profile Settings</span>
                              <span className="text-xs text-[#9CA3AF]">Manage your account</span>
                            </div>
                          </div>
                        </Link>
                        <Link href="/shipping">
                          <div 
                            className="px-4 py-3 text-[#E5E7EB] hover:bg-[#26263A]/30 cursor-pointer flex items-center space-x-3 transition-all duration-200 group"
                            onClick={() => setIsProfileOpen(false)}
                          >
                            <div className="w-8 h-8 bg-gradient-to-br from-[#059669] to-[#10B981] rounded-lg flex items-center justify-center shadow-[0_0_8px_rgba(5,150,105,0.3)] group-hover:shadow-[0_0_12px_rgba(5,150,105,0.5)] transition-all duration-200">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">Shipping</span>
                              <span className="text-xs text-[#9CA3AF]">Manage addresses & track orders</span>
                            </div>
                          </div>
                        </Link>
                        <div className="border-t border-[#26263A]/30 my-2"></div>
                        <div 
                          className="px-4 py-3 text-[#FF5964] hover:bg-[#FF5964]/10 cursor-pointer flex items-center space-x-3 transition-all duration-200 group"
                          onClick={() => {
                            handleLogout();
                            setIsProfileOpen(false);
                          }}
                        >
                          <div className="w-8 h-8 bg-gradient-to-br from-[#FF5964] to-[#FF8A80] rounded-lg flex items-center justify-center shadow-[0_0_8px_rgba(255,89,100,0.3)] group-hover:shadow-[0_0_12px_rgba(255,89,100,0.5)] transition-all duration-200">
                            <LogOut className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">Sign Out</span>
                            <span className="text-xs text-[#9CA3AF]">End your session</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Login/Signup buttons for non-authenticated users */}
                <Link href="/auth">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#26263A] text-[#E5E7EB] hover:bg-[#151521] hover:border-[#7C3AED]"
                    data-testid="button-login"
                  >
                    Login
                  </Button>
                </Link>
                
                <Link href="/auth">
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white hover:from-[#7C3AED] hover:to-[#A855F7] shadow-[0_0_8px_rgba(124,58,237,0.3)]"
                    data-testid="button-register"
                  >
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Luxury Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-[#E5E7EB] hover:text-[#22D3EE] hover:bg-[#151521]/50 p-3 rounded-2xl border border-transparent hover:border-[#26263A]/50 transition-all duration-300"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            <div className="relative">
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </div>
          </Button>
        </div>

        {/* Luxury Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-6 border-t border-[#26263A]/50 bg-[#0B0B12]/95 backdrop-blur-xl">
            <div className="space-y-6">
              {isAuthenticated && navItems.map((item) => (
                <Link key={item.path} href={item.path}>
                  <div 
                    className={`mx-4 px-4 py-3 rounded-2xl transition-all duration-300 cursor-pointer group ${
                      location === item.path 
                        ? "text-[#22D3EE] bg-[#151521]/50 shadow-[0_0_12px_rgba(34,211,238,0.2)] border border-[#26263A]/50" 
                        : "text-[#E5E7EB] hover:text-[#22D3EE] hover:bg-[#151521]/30"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    data-testid={`link-mobile-${item.label.toLowerCase()}`}
                  >
                    <span className="font-medium text-sm tracking-wide uppercase">
                      {item.label}
                    </span>
                  </div>
                </Link>
              ))}
              
              <div className="px-4 space-y-4">
                  {/* Mobile Neon Reload Button */}
                  {isAuthenticated && (
                    <Link href="/reload">
                      <Button
                        className="w-full bg-gradient-to-r from-[#22D3EE] via-[#00E6A8] to-[#22D3EE] hover:from-[#00E6A8] hover:via-[#22D3EE] hover:to-[#00E6A8] text-[#0B0B12] shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] transition-all duration-300 py-3 rounded-lg"
                        data-testid="mobile-button-reload"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <div className="flex items-center justify-center space-x-3">
                          <div className="w-5 h-5 bg-[#0B0B12] rounded-sm flex items-center justify-center">
                            <span className="text-[#22D3EE] text-sm font-bold">₵</span>
                          </div>
                          <span className="font-semibold tracking-wide">Reload Credits</span>
                        </div>
                      </Button>
                    </Link>
                  )}

                {/* Mobile Profile Button */}
                {isAuthenticated && (
                  <Link href="/profile">
                    <Button
                      variant="outline"
                      className="w-full border-[#26263A]/50 text-[#E5E7EB] hover:bg-[#151521]/50 hover:border-[#7C3AED]/50 py-4 rounded-2xl transition-all duration-300"
                      data-testid="mobile-button-profile"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className="flex items-center justify-center space-x-3">
                        <div className="w-6 h-6 bg-gradient-to-br from-[#7C3AED] to-[#22D3EE] rounded-lg flex items-center justify-center shadow-[0_0_8px_rgba(124,58,237,0.3)]">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-semibold tracking-wide">PROFILE</span>
                      </div>
                    </Button>
                  </Link>
                )}

                {/* Mobile Shipping Button */}
                {isAuthenticated && (
                  <Link href="/shipping">
                    <Button
                      variant="outline"
                      className="w-full border-[#26263A]/50 text-[#E5E7EB] hover:bg-[#151521]/50 hover:border-[#059669]/50 py-4 rounded-2xl transition-all duration-300"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className="flex items-center justify-center space-x-3">
                        <div className="w-6 h-6 bg-gradient-to-br from-[#059669] to-[#10B981] rounded-lg flex items-center justify-center shadow-[0_0_8px_rgba(5,150,105,0.3)]">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <span className="font-semibold tracking-wide">SHIPPING</span>
                      </div>
                    </Button>
                  </Link>
                )}

                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleTheme}
                    className="text-[#E5E7EB] hover:text-[#22D3EE] hover:bg-[#151521]"
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
                      className="text-[#E5E7EB] hover:text-[#FF5964] hover:bg-[#151521]"
                      data-testid="button-mobile-logout"
                    >
                      {logoutMutation.isPending ? "..." : "Logout"}
                    </Button>
                  ) : (
                    <div className="space-x-2">
                      <Link href="/auth">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-[#26263A] text-[#E5E7EB] hover:bg-[#151521] hover:border-[#7C3AED]"
                          onClick={() => setIsMobileMenuOpen(false)}
                          data-testid="button-mobile-login"
                        >
                          Login
                        </Button>
                      </Link>
                      <Link href="/auth">
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white hover:from-[#7C3AED] hover:to-[#A855F7] shadow-[0_0_8px_rgba(124,58,237,0.3)]"
                          onClick={() => setIsMobileMenuOpen(false)}
                          data-testid="button-mobile-register"
                        >
                          Sign Up
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
