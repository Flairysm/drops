import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "@/components/Navigation";
import { NavigationFooter } from "@/components/NavigationFooter";
import { RecentPulls } from "@/components/RecentPulls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Play, Package, Coins, TrendingUp, Zap, RotateCcw, Gamepad2, Star, Crown, Sparkles, Trophy } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import type { User } from "@shared/schema";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  const { data: userData } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: isAuthenticated,
  }) as { data: User | undefined };

  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Landing page for non-authenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-6">
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
                  <rect width="1920" height="1080" fill="url(#bg)"/>
                  
                  <!-- Stars/particles -->
                  <g opacity="0.8">
                    ${[...Array(200)].map((_, i) => `
                      <circle cx="${Math.random() * 1920}" cy="${Math.random() * 1080}" r="${Math.random() * 2 + 0.5}" fill="white" opacity="${Math.random() * 0.8 + 0.2}"/>
                    `).join('')}
                  </g>
                  
                  <!-- Light trails -->
                  <path d="M 100 200 Q 300 400 500 600 Q 700 800 400 1000" stroke="url(#card1)" stroke-width="8" fill="none" opacity="0.6">
                    <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" repeatCount="indefinite"/>
                  </path>
                  <path d="M 1500 100 Q 1700 300 1600 500 Q 1500 700 1400 900" stroke="url(#card2)" stroke-width="6" fill="none" opacity="0.4">
                    <animate attributeName="opacity" values="0.2;0.6;0.2" dur="4s" repeatCount="indefinite"/>
                  </path>
                  
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
                  scale: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2 + Math.random() * 3,
                  repeat: Infinity,
                  delay: Math.random() * 3,
                }}
              />
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-12">
          {/* Main Title */}
          <motion.h1 
            className="text-6xl md:text-8xl font-bold"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <motion.span 
              className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent"
              animate={{ 
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              Drops TCG
            </motion.span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            className="text-2xl md:text-3xl text-gray-300 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            A new way to experience TCG collecting
          </motion.p>

          {/* CTA Question */}
          <motion.p 
            className="text-xl md:text-2xl text-gray-400 max-w-xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            Ready to join millions of collectors?
          </motion.p>

          {/* Free Credits Offer */}
          <motion.div 
            className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-cyan-400/30 rounded-2xl p-6 max-w-md mx-auto backdrop-blur-sm"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            whileHover={{ scale: 1.05 }}
          >
            <motion.p 
              className="text-lg text-cyan-300 font-semibold"
              animate={{ 
                textShadow: [
                  '0 0 10px rgba(34, 211, 238, 0.5)',
                  '0 0 20px rgba(34, 211, 238, 0.8)',
                  '0 0 10px rgba(34, 211, 238, 0.5)'
                ]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              Sign up now for 30 free credits
            </motion.p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.0 }}
          >
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link href="/register">
                <Button 
                  size="lg" 
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-300 shadow-2xl hover:shadow-cyan-500/25"
                >
                  Create Account
                </Button>
              </Link>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link href="/login">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="w-full border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-slate-900 px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-300"
                >
                  Login
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navigation />
      
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
                <rect width="1920" height="1080" fill="url(#bg)"/>
                
                <!-- Stars/particles -->
                <g opacity="0.8">
                  ${[...Array(200)].map((_, i) => `
                    <circle cx="${Math.random() * 1920}" cy="${Math.random() * 1080}" r="${Math.random() * 2 + 0.5}" fill="white" opacity="${Math.random() * 0.8 + 0.2}"/>
                  `).join('')}
                </g>
                
                <!-- Light trails -->
                <path d="M 100 200 Q 300 400 500 600 Q 700 800 400 1000" stroke="url(#card1)" stroke-width="8" fill="none" opacity="0.6">
                  <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" repeatCount="indefinite"/>
                </path>
                <path d="M 1500 100 Q 1700 300 1600 500 Q 1500 700 1400 900" stroke="url(#card2)" stroke-width="6" fill="none" opacity="0.4">
                  <animate attributeName="opacity" values="0.2;0.6;0.2" dur="4s" repeatCount="indefinite"/>
                </path>
                
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
                scale: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 3,
              }}
            />
          ))}
        </div>
      </div>
      
      <main className="pt-20 pb-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
         {/* Welcome Section */}
         <motion.section 
           className="mb-8"
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6 }}
         >
           <div className="flex flex-row items-center justify-between mb-6 gap-4 mt-8">
             <div className="flex-1">
               <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white mb-2 tracking-[-0.04em] leading-[1.15]">
                 Hey <span className="text-white">{userData?.username || userData?.firstName || "Player"}</span>!
               </h1>
               <p className="text-base sm:text-lg text-[#9CA3AF] font-normal leading-[1.6]">Your TCG adventure awaits</p>
             </div>
             
             {/* Available Credits Display - Yellow Box */}
             <div className="px-4 py-2 sm:px-8 sm:py-4 rounded-xl bg-gradient-to-r from-[#FACC15] to-[#FFD166] shadow-[0_0_20px_rgba(250,204,21,0.3)] flex-shrink-0">
               <div className="text-center">
                 <p className="text-xs text-[#0B0B12] mb-1 sm:mb-2 font-semibold uppercase tracking-wide hidden sm:block">Available Credits</p>
                 <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                   <div className="w-4 h-4 sm:w-6 sm:h-6 bg-[#0B0B12] rounded-full flex items-center justify-center">
                     <span className="text-[#FACC15] text-xs sm:text-sm font-bold">₵</span>
                   </div>
                   <div className="flex flex-col sm:flex-row items-center space-y-0 sm:space-y-0 sm:space-x-2">
                     <span className="text-xs sm:hidden text-[#0B0B12] font-semibold uppercase tracking-wide">Credits</span>
                     <span className="text-lg sm:text-2xl font-bold text-[#0B0B12] tabular-nums">
                       {(userData as any)?.credits || "0.00"}
                     </span>
                   </div>
                 </div>
               </div>
             </div>
           </div>
         </motion.section>

          {/* Featured Title Section */}
          <motion.section 
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex items-center mb-6">
              {/* Neon Strip */}
              <div className="w-1 h-8 bg-gradient-to-b from-[#7C3AED] via-[#A855F7] to-[#22D3EE] rounded-full mr-4 shadow-[0_0_8px_rgba(124,58,237,0.3)]"></div>
              
             {/* Featured Title */}
             <h2 className="text-2xl sm:text-3xl font-semibold text-[#E5E7EB] tracking-[-0.03em] leading-[1.15]">FEATURED</h2>
            </div>
          </motion.section>

          {/* Featured Banner */}
          <motion.section 
            className="mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="rounded-2xl bg-[#151521] border border-[#26263A] backdrop-blur-[10px] shadow-[0_0_20px_rgba(124,58,237,0.1)] overflow-hidden">
              <div className="relative w-full aspect-[1200/620] max-w-[1200px] mx-auto">
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{
                    backgroundImage: `url('/assets/black-bolt-banner.png')`
                  }}
                />
                {/* Overlay for text readability */}
                <div className="absolute inset-0 bg-[#0B0B12]/20"></div>
               
               {/* Content */}
               <CardContent className="relative z-10 p-4 sm:p-6 text-left h-full flex flex-col justify-center">
                 <motion.h1 
                   className="text-2xl sm:text-3xl font-semibold text-[#FACC15] mb-2 tracking-[-0.03em] leading-[1.15]"
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ duration: 0.8, delay: 0.2 }}
                 >
                   NEW DROP
                 </motion.h1>
                 <motion.p 
                   className="text-xs sm:text-sm text-[#9CA3AF] mb-3 leading-[1.6]"
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ duration: 0.8, delay: 0.4 }}
                 >
                   Black Bolt just dropped.<br />
                   Rip Now!
                 </motion.p>
                 <motion.div
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ duration: 0.8, delay: 0.6 }}
                 >
                   <Button 
                     size="sm"
                     className="bg-gradient-to-r from-[#00E6A8] to-[#00E6A8] hover:from-[#00E6A8] hover:to-[#00E6A8] text-black px-4 py-2 rounded-xl font-medium w-fit shadow-[0_0_12px_rgba(0,230,168,0.3)] hover:shadow-[0_0_16px_rgba(0,230,168,0.4)] transition-all duration-200 text-sm"
                   >
                     Open Now
                   </Button>
                 </motion.div>
               </CardContent>
             </div>
           </Card>
          </motion.section>

          {/* Quick Play Games Carousel */}
          <motion.section 
            className="mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="flex items-center mb-6">
              {/* Neon Strip */}
              <div className="w-1 h-8 bg-gradient-to-b from-[#7C3AED] via-[#A855F7] to-[#22D3EE] rounded-full mr-4 shadow-[0_0_8px_rgba(124,58,237,0.3)]"></div>
              
             {/* Quick Play Title */}
             <h2 className="text-2xl sm:text-3xl font-semibold text-[#E5E7EB] tracking-[-0.03em] leading-[1.15]">Quick Play</h2>
            </div>
            
            {/* Game Carousel */}
            <div className="relative">
              <div className="flex space-x-4 sm:space-x-6 overflow-x-auto pb-4 scrollbar-hide">
                {/* Classic Pack */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-shrink-0"
                >
                  <Link href="/purchase">
                    <Card className="rounded-2xl bg-[#151521] border border-[#26263A] backdrop-blur-[10px] hover:scale-[1.02] transition-all duration-200 cursor-pointer shadow-[0_0_20px_rgba(124,58,237,0.1)] hover:shadow-[0_0_24px_rgba(124,58,237,0.15)] w-64 h-56 overflow-hidden">
                      <CardContent className="p-0 h-full">
                        {/* Classic Pack Image */}
                        <div 
                          className="w-full h-full bg-cover bg-center rounded-2xl shadow-[0_0_12px_rgba(124,58,237,0.4)]"
                          style={{
                            backgroundImage: `url('/assets/classic-image.png')`
                          }}
                        />
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>

                {/* Find Pika Game */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-shrink-0"
                >
                  <Link href="/play/findpika">
                    <Card className="rounded-2xl bg-[#151521] border border-[#26263A] backdrop-blur-[10px] hover:scale-[1.02] transition-all duration-200 cursor-pointer shadow-[0_0_20px_rgba(124,58,237,0.1)] hover:shadow-[0_0_24px_rgba(124,58,237,0.15)] w-64 h-56 overflow-hidden">
                      <CardContent className="p-0 h-full">
                        {/* Find Pika Game Image */}
                        <div 
                          className="w-full h-full bg-cover bg-center rounded-2xl shadow-[0_0_12px_rgba(34,197,94,0.4)]"
                          style={{
                            backgroundImage: `url('/assets/find-pika-image.png')`
                          }}
                        />
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>

                {/* Energy Match Game */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-shrink-0"
                >
                  <Link href="/play/energy-match">
                    <Card className="rounded-2xl bg-[#151521] border border-[#26263A] backdrop-blur-[10px] hover:scale-[1.02] transition-all duration-200 cursor-pointer shadow-[0_0_20px_rgba(124,58,237,0.1)] hover:shadow-[0_0_24px_rgba(124,58,237,0.15)] w-64 h-56 overflow-hidden">
                      <CardContent className="p-0 h-full">
                        {/* Energy Match Game Image */}
                        <div 
                          className="w-full h-full bg-cover bg-center rounded-2xl shadow-[0_0_12px_rgba(236,72,153,0.4)]"
                          style={{
                            backgroundImage: `url('/assets/energy-match.png')`
                          }}
                        />
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.section>

          {/* New Release Section */}
          <motion.section 
            className="mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <div className="flex items-center mb-6">
              {/* Neon Strip */}
              <div className="w-1 h-8 bg-gradient-to-b from-[#7C3AED] via-[#A855F7] to-[#22D3EE] rounded-full mr-4 shadow-[0_0_8px_rgba(124,58,237,0.3)]"></div>
              
              {/* New Release Title */}
              <h2 className="text-2xl sm:text-3xl font-semibold text-[#E5E7EB] tracking-[-0.03em] leading-[1.15]">New Release</h2>
            </div>
            
            {/* New Release Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Mystery Pack Release */}
              <motion.div
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="group"
              >
                <Link href="/purchase">
                  <Card className="rounded-2xl bg-gradient-to-br from-[#151521] to-[#1a1a2e] border border-[#26263A] backdrop-blur-[10px] hover:border-[#7C3AED]/50 transition-all duration-300 cursor-pointer shadow-[0_0_20px_rgba(124,58,237,0.1)] hover:shadow-[0_0_30px_rgba(124,58,237,0.2)] overflow-hidden">
                    <CardContent className="p-6">
                      {/* Pack Image */}
                      <div className="relative mb-4">
                        <div className="w-full h-32 bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-xl flex items-center justify-center border border-purple-500/30">
                          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-white" />
                          </div>
                        </div>
                        {/* New Badge */}
                        <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-[#00E6A8] to-[#00D4AA] text-black font-bold text-xs px-2 py-1">
                          NEW
                        </Badge>
                      </div>
                      
                      {/* Content */}
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-white group-hover:text-[#A855F7] transition-colors">
                          Mystery Packs
                        </h3>
                        <p className="text-sm text-[#9CA3AF] leading-relaxed">
                          Discover rare cards with our new mystery pack system. Each pack contains guaranteed hits!
                        </p>
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-[#FACC15] font-semibold text-sm">Starting at 100₵</span>
                          <Sparkles className="w-4 h-4 text-[#FACC15]" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>

              {/* Special Edition Release */}
              <motion.div
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="group"
              >
                <Link href="/purchase">
                  <Card className="rounded-2xl bg-gradient-to-br from-[#151521] to-[#1a1a2e] border border-[#26263A] backdrop-blur-[10px] hover:border-[#EC4899]/50 transition-all duration-300 cursor-pointer shadow-[0_0_20px_rgba(236,72,153,0.1)] hover:shadow-[0_0_30px_rgba(236,72,153,0.2)] overflow-hidden">
                    <CardContent className="p-6">
                      {/* Pack Image */}
                      <div className="relative mb-4">
                        <div className="w-full h-32 bg-gradient-to-br from-pink-600/20 to-cyan-600/20 rounded-xl flex items-center justify-center border border-pink-500/30">
                          <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-cyan-500 rounded-full flex items-center justify-center">
                            <Crown className="w-8 h-8 text-white" />
                          </div>
                        </div>
                        {/* Limited Badge */}
                        <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-[#EC4899] to-[#F97316] text-white font-bold text-xs px-2 py-1">
                          LIMITED
                        </Badge>
                      </div>
                      
                      {/* Content */}
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-white group-hover:text-[#EC4899] transition-colors">
                          Special Edition
                        </h3>
                        <p className="text-sm text-[#9CA3AF] leading-relaxed">
                          Exclusive limited-time packs with premium cards and special artwork. Don't miss out!
                        </p>
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-[#FACC15] font-semibold text-sm">500₵</span>
                          <Trophy className="w-4 h-4 text-[#FACC15]" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>

              {/* Classic Pack Update */}
              <motion.div
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="group"
              >
                <Link href="/purchase">
                  <Card className="rounded-2xl bg-gradient-to-br from-[#151521] to-[#1a1a2e] border border-[#26263A] backdrop-blur-[10px] hover:border-[#22D3EE]/50 transition-all duration-300 cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.1)] hover:shadow-[0_0_30px_rgba(34,211,238,0.2)] overflow-hidden">
                    <CardContent className="p-6">
                      {/* Pack Image */}
                      <div className="relative mb-4">
                        <div className="w-full h-32 bg-gradient-to-br from-cyan-600/20 to-blue-600/20 rounded-xl flex items-center justify-center border border-cyan-500/30">
                          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                            <Star className="w-8 h-8 text-white" />
                          </div>
                        </div>
                        {/* Updated Badge */}
                        <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-[#22D3EE] to-[#3B82F6] text-white font-bold text-xs px-2 py-1">
                          UPDATED
                        </Badge>
                      </div>
                      
                      {/* Content */}
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-white group-hover:text-[#22D3EE] transition-colors">
                          Classic Packs
                        </h3>
                        <p className="text-sm text-[#9CA3AF] leading-relaxed">
                          Updated with new card sets and improved odds. Your favorite packs just got better!
                        </p>
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-[#FACC15] font-semibold text-sm">50₵</span>
                          <TrendingUp className="w-4 h-4 text-[#FACC15]" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            </div>
          </motion.section>

          {/* Recent Pulls */}
          <motion.section 
            className="mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <RecentPulls limit={10} />
          </motion.section>

        </div>
      </main>

      <NavigationFooter />
    </div>
  );
}