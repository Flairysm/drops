import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "@/components/Navigation";
import { NavigationFooter } from "@/components/NavigationFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Coins, CreditCard } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import type { User } from "@shared/schema";

export default function Reload() {
  const { isAuthenticated, isLoading } = useAuth();

  const { data: userData } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: isAuthenticated,
  }) as { data: User | undefined };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in to reload credits</h1>
          <Link href="/login">
            <Button>Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  const creditPackages = [
    { id: 1, name: "Starter Pack", credits: 100, price: "$4.99", bonus: 0, popular: false },
    { id: 2, name: "Player Pack", credits: 250, price: "$9.99", bonus: 25, popular: true },
    { id: 3, name: "Pro Pack", credits: 500, price: "$19.99", bonus: 100, popular: false },
    { id: 4, name: "Elite Pack", credits: 1000, price: "$39.99", bonus: 300, popular: false },
    { id: 5, name: "Legendary Pack", credits: 2500, price: "$99.99", bonus: 1000, popular: false }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navigation />
      
      <main className="pt-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <motion.section 
            className="mb-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                Reload Credits
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-6">
              Choose a credit package to continue your TCG journey
            </p>
            <div className="flex items-center justify-center space-x-2">
              <Coins className="w-6 h-6 text-cyan-400" />
              <span className="text-cyan-300 text-lg font-semibold">
                Current Balance: {userData?.credits || 0} credits
              </span>
            </div>
          </motion.section>

          {/* Credit Packages */}
          <motion.section 
            className="mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {creditPackages.map((pkg, index) => (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 * index }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Card className={`gaming-card cursor-pointer transition-all duration-300 ${
                    pkg.popular ? 'ring-2 ring-cyan-400/50 bg-gradient-to-br from-cyan-500/10 to-blue-600/10' : 'bg-gradient-to-br from-slate-800/50 to-slate-900/50'
                  }`}>
                    {pkg.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-1">
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    <CardHeader className="text-center pb-4">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <Coins className="w-8 h-8 text-white" />
                      </div>
                      <CardTitle className="text-2xl font-bold text-white">{pkg.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <div className="mb-6">
                        <div className="text-4xl font-bold text-white mb-2">
                          {pkg.credits.toLocaleString()}
                          {pkg.bonus > 0 && (
                            <span className="text-lg text-cyan-400 ml-2">
                              +{pkg.bonus} bonus
                            </span>
                          )}
                        </div>
                        <div className="text-2xl font-semibold text-cyan-400">{pkg.price}</div>
                      </div>
                      <Button 
                        className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-white font-semibold py-3"
                        size="lg"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Purchase Now
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.section>

        </div>
      </main>

      <NavigationFooter />
    </div>
  );
}