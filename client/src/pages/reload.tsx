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
import { useState } from "react";
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

  const creditOptions = [
    { id: 1, credits: 100, price: "RM5.00" },
    { id: 2, credits: 200, price: "RM10.00" },
    { id: 3, credits: 500, price: "RM25.00" },
    { id: 4, credits: 1000, price: "RM50.00" },
    { id: 5, credits: 2000, price: "RM100.00" },
    { id: 6, credits: 5000, price: "RM250.00" }
  ];

  const [selectedAmount, setSelectedAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePurchase = async () => {
    if (!selectedAmount) return;
    
    setIsProcessing(true);
    try {
      // Find the selected option
      const selectedOption = creditOptions.find(option => option.price === selectedAmount);
      if (!selectedOption) {
        console.error('Selected option not found');
        return;
      }

      console.log('Sending request for credits:', selectedOption.credits);

      // Update credits in Supabase
      const response = await fetch('/api/user/update-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          credits: selectedOption.credits
        })
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`Failed to update credits: ${response.status} ${errorText}`);
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);
      
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error('Non-JSON response:', responseText);
        throw new Error('Server returned non-JSON response');
      }

      const result = await response.json();
      console.log('Success result:', result);
      
      // Reset selection
      setSelectedAmount("");
      
      // Refresh user data to show updated credits
      window.location.reload();
      
    } catch (error) {
      console.error('Purchase failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Futuristic Card Hero Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Main background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('data:image/svg+xml;base64,${btoa(`
              <svg width="1920" height="1080" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="bg" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="#1e1b4b" stop-opacity="1"/>
                    <stop offset="100%" stop-color="#312e81" stop-opacity="1"/>
                  </radialGradient>
                  <linearGradient id="card1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.8"/>
                    <stop offset="100%" stop-color="#1d4ed8" stop-opacity="0.6"/>
                  </linearGradient>
                  <linearGradient id="card2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#ec4899" stop-opacity="0.9"/>
                    <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.8"/>
                  </linearGradient>
                  <linearGradient id="card3" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.7"/>
                    <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.9"/>
                  </linearGradient>
                </defs>
                
                <!-- Background -->
                <rect width="1920" height="1080" fill="url(#bg)"/>
                
                <!-- Floating cards -->
                <g transform="translate(100, 200) rotate(-10)">
                  <rect x="0" y="0" width="120" height="180" rx="12" fill="url(#card1)" opacity="0.6" filter="blur(1px)">
                    <animate attributeName="opacity" values="0.4;0.7;0.4" dur="2s" repeatCount="indefinite"/>
                  </rect>
                  <rect x="20" y="20" width="80" height="140" rx="8" fill="white" opacity="0.1"/>
                </g>
                
                <g transform="translate(300, 150) rotate(5)">
                  <rect x="0" y="0" width="120" height="180" rx="12" fill="url(#card2)" opacity="0.7" filter="blur(1px)">
                    <animate attributeName="opacity" values="0.5;0.8;0.5" dur="2.5s" repeatCount="indefinite"/>
                  </rect>
                  <rect x="20" y="20" width="80" height="140" rx="8" fill="white" opacity="0.15"/>
                </g>
                
                <g transform="translate(500, 180) rotate(-15)">
                  <rect x="0" y="0" width="120" height="180" rx="12" fill="url(#card3)" opacity="0.8" filter="blur(1px)">
                    <animate attributeName="opacity" values="0.6;0.9;0.6" dur="3s" repeatCount="indefinite"/>
                  </rect>
                  <rect x="20" y="20" width="80" height="140" rx="8" fill="white" opacity="0.2"/>
                </g>
                
                <!-- Digital cards -->
                <g transform="translate(1200, 300) rotate(15)">
                  <rect x="0" y="0" width="120" height="180" rx="12" fill="url(#card1)" opacity="0.7" filter="blur(1px)">
                    <animate attributeName="opacity" values="0.5;0.8;0.5" dur="2s" repeatCount="indefinite"/>
                  </rect>
                  <rect x="20" y="20" width="80" height="140" rx="8" fill="white" opacity="0.1"/>
                </g>
                
                <g transform="translate(1350, 280) rotate(20)">
                  <rect x="0" y="0" width="120" height="180" rx="12" fill="url(#card2)" opacity="0.8" filter="blur(1px)">
                    <animate attributeName="opacity" values="0.6;0.9;0.6" dur="2.5s" repeatCount="indefinite"/>
                  </rect>
                  <rect x="20" y="20" width="80" height="140" rx="8" fill="white" opacity="0.15"/>
                </g>
                
                <g transform="translate(1500, 260) rotate(25)">
                  <rect x="0" y="0" width="120" height="180" rx="12" fill="url(#card3)" opacity="0.9" filter="blur(1px)">
                    <animate attributeName="opacity" values="0.7;1;0.7" dur="3s" repeatCount="indefinite"/>
                  </rect>
                  <rect x="20" y="20" width="80" height="140" rx="8" fill="white" opacity="0.2"/>
                </g>
                
                <!-- Grid pattern -->
                <g opacity="0.1" stroke="#06b6d4" stroke-width="1">
                  ${[...Array(20)].map((_, i) => `
                    <line x1="${i * 100}" y1="0" x2="${i * 100}" y2="1080"/>
                    <line x1="0" y1="${i * 60}" x2="1920" y2="${i * 60}"/>
                  `).join('')}
                </g>
              </svg>
            `)}')`
          }}
        />
        
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/40"></div>
        
        {/* Additional floating particles */}
        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-cyan-400/60 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      </div>

      <Navigation />
      
      <main className="pt-24 pb-24 relative z-10">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-10">
          
          {/* Header Section */}
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl sm:text-4xl font-bold mb-6">
              <span className="bg-gradient-to-r from-[#7C3AED] via-[#A855F7] to-[#22D3EE] bg-clip-text text-transparent">
                Reload Credits
              </span>
            </h1>
            <p className="text-lg text-[#E5E7EB] mb-8">
              Choose a credit package to continue your TCG journey
            </p>
            <div className="inline-flex items-center space-x-2 bg-[#151521]/30 backdrop-blur-[10px] border border-[#26263A] rounded-full px-6 py-3">
              <Coins className="w-5 h-5 text-[#22D3EE]" />
              <span className="text-[#22D3EE] font-semibold">
                Current Balance: {userData?.credits || 0} credits
              </span>
            </div>
          </motion.div>

          {/* Credit Options Container */}
          <motion.div 
            className="bg-[#151521]/40 backdrop-blur-[15px] rounded-2xl border border-[#26263A]/50 shadow-[0_0_30px_rgba(0,0,0,0.3)]"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="p-8">
              {/* Predefined Amount Buttons */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-[#E5E7EB] mb-4">Quick Select</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {creditOptions.map((option) => (
                    <motion.button
                      key={option.id}
                      onClick={() => {
                        setSelectedAmount(option.price);
                      }}
                      className={`p-4 rounded-xl border transition-all duration-300 ${
                        selectedAmount === option.price
                          ? 'bg-gradient-to-r from-[#7C3AED]/20 to-[#22D3EE]/20 border-[#7C3AED]/50 shadow-[0_0_15px_rgba(124,58,237,0.2)]'
                          : 'bg-[#151521]/60 border-[#26263A]/60 hover:border-[#7C3AED]/30 hover:bg-[#151521]/80'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="text-center">
                        <div className="text-xl font-bold text-[#E5E7EB] mb-1">
                          {option.credits.toLocaleString()} Credits
                        </div>
                        <div className="text-sm text-[#22D3EE] font-semibold">
                          {option.price}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>


              {/* Purchase Button */}
              <div className="text-center">
                <Button
                  onClick={handlePurchase}
                  className="px-12 py-4 bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] hover:from-[#6D28D9] hover:to-[#0891B2] shadow-[0_0_20px_rgba(124,58,237,0.4)] text-lg font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  size="lg"
                  disabled={!selectedAmount || isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-6 h-6 mr-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-6 h-6 mr-3" />
                      Reload Credits
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Footer Section */}
            <div className="border-t border-[#26263A]/50 bg-[#0F0F0F]/30 px-8 py-6 rounded-b-2xl">
              <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
                <div className="text-center sm:text-left">
                  <p className="text-[#9CA3AF] text-sm">
                    <span className="text-[#22D3EE] font-semibold">Secure Payment</span> • Instant Credit Delivery
                  </p>
                </div>
                <div className="text-center sm:text-right">
                  <p className="text-[#9CA3AF] text-sm">
                    Exchange Rate: <span className="text-[#22D3EE] font-semibold">1 RM = 20 Credits</span>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </main>

      <NavigationFooter />
    </div>
  );
}