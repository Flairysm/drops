import { useUserData } from "@/hooks/useUserData";
import { Navigation } from "@/components/Navigation";
import { NavigationFooter } from "@/components/NavigationFooter";
import { RecentPullsCarousel } from "@/components/RecentPullsCarousel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Play, Package, Coins, TrendingUp, Zap, RotateCcw, Gamepad2, Star, ArrowLeft, MessageCircle, Gift, Flame, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import type { User } from "@shared/schema";
import { motion } from "framer-motion";

export default function Home() {
  const { isAuthenticated, loading, user } = useUserData();

  // Get user data from Supabase auth
  const userData = user;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Landing page for non-authenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <Navigation />
        
        {/* Luxury Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Animated gradient orbs */}
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-accent/20 to-legendary/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-primary/10 to-accent/10 rounded-full blur-3xl animate-pulse delay-500"></div>
          
          {/* Floating particles */}
          <div className="absolute inset-0">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-accent/30 rounded-full animate-luxury-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${3 + Math.random() * 4}s`
                }}
              ></div>
            ))}
          </div>
        </div>
        
        {/* Hero Section - Futuristic Digital Artwork */}
        <section className="relative min-h-screen flex items-center overflow-hidden">
            {/* Hero Background Image */}
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: "url('/assets/hero/futuristic-cards-hero.png')",
                backgroundAttachment: 'fixed'
              }}
            >
              {/* Lighter overlay to show more background */}
              <div className="absolute inset-0 bg-black/30"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-black/40"></div>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/30"></div>
            </div>
            
            <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 w-full">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center min-h-[80vh]">
                {/* Content */}
                <div className="text-center lg:text-left space-y-8 lg:space-y-10">
                  {/* Main Title */}
                  <motion.div 
                    className="space-y-4"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  >
                    <motion.h1 
                      className="font-headline-bold text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[10rem] text-white drop-shadow-2xl leading-[0.9] tracking-tight"
                      animate={{ 
                        y: [0, -15, 0],
                        scale: [1, 1.05, 1],
                        rotate: [0, 1, -1, 0]
                      }}
                      transition={{ 
                        duration: 3, 
                        repeat: Infinity, 
                        ease: "easeInOut" 
                      }}
                    >
                      Drops
                    </motion.h1>
                    <motion.div 
                      className="w-24 h-1 bg-gradient-to-r from-accent to-primary mx-auto lg:mx-0 rounded-full"
                      animate={{ 
                        scaleX: [1, 1.3, 1],
                        opacity: [0.6, 1, 0.6],
                        width: ["6rem", "8rem", "6rem"]
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity, 
                        ease: "easeInOut",
                        delay: 0.5
                      }}
                    ></motion.div>
                  </motion.div>
                  
                  {/* Subtitle */}
                  <motion.h2 
                    className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-headline-bold text-white leading-tight drop-shadow-xl max-w-4xl"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                  >
                    Experience TCG collecting in a new way
                  </motion.h2>
                  
                  {/* Description */}
                  <motion.p 
                    className="text-xl sm:text-2xl md:text-3xl text-white leading-relaxed max-w-3xl font-body"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                  >
                    Play TCG themed minigames, open premium packs and collect rare cards
                  </motion.p>
                  
                  {/* Free Credits Offer */}
                  <motion.div 
                    className="text-xl sm:text-xl md:text-2xl font-body-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    30 FREE CREDITS FOR NEW USERS
                  </motion.div>
                  
                  {/* CTA Buttons */}
                  <motion.div 
                    className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start pt-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 1 }}
                  >
                    <Link href="/register">
                      <motion.div
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        animate={{ 
                          y: [0, -8, 0],
                          scale: [1, 1.02, 1]
                        }}
                        transition={{ 
                          duration: 2.5, 
                          repeat: Infinity, 
                          ease: "easeInOut",
                          delay: 1.2
                        }}
                      >
                        <Button
                          size="lg"
                          className="luxury-button-primary px-12 py-6 text-xl font-body-bold rounded-2xl w-full sm:w-auto"
                        >
                          Create Account
                        </Button>
                      </motion.div>
                    </Link>
                    <Link href="/login">
                      <motion.div
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        animate={{ 
                          y: [0, -8, 0],
                          scale: [1, 1.02, 1]
                        }}
                        transition={{ 
                          duration: 2.5, 
                          repeat: Infinity, 
                          ease: "easeInOut",
                          delay: 1.4
                        }}
                      >
                        <Button
                          size="lg"
                          variant="outline"
                          className="luxury-button-secondary px-12 py-6 text-xl font-body-bold rounded-2xl w-full sm:w-auto"
                        >
                          Login
                        </Button>
                      </motion.div>
                    </Link>
                  </motion.div>
                </div>
                
              </div>
            </div>
          </section>

    </div>
    );
  }

  // Authenticated user home page - Gaming Platform Style
  const featuredGames = [
    {
      name: "Wheel Spin", 
      description: "Spin and Win!",
      cost: "20",
      icon: <RotateCcw className="w-8 h-8 text-white" />,
      color: "from-orange-500 to-red-600",
      route: "/play/wheel",
      popular: true,
      percentage: "+8.3%",
      volume: "1.8K",
    },
    {
      name: "Classic Packs",
      description: "Rip some classic packs",
      cost: "16",
      icon: <Package className="w-8 h-8 text-white" />,
      color: "from-green-500 to-emerald-600",
      route: "/play/themed-packs",
      popular: false,
      percentage: "+15.2%",
      volume: "3.1K",
    },
    {
      name: "Mystery Packs",
      description: "Mystery awaits!",
      cost: "25",
      icon: <Gift className="w-8 h-8 text-white" />,
      color: "from-purple-500 to-pink-600",
      route: "/play/mystery-packs",
      popular: true,
      percentage: "+22.1%",
      volume: "4.2K",
    },
    {
      name: "Vault",
      description: "Secure your cards",
      cost: "0",
      icon: <Package className="w-8 h-8 text-white" />,
      color: "from-gray-500 to-slate-600",
      route: "/play/vault",
      popular: false,
      percentage: "+5.7%",
      volume: "892",
    },
    {
      name: "Admin Panel",
      description: "Manage content",
      cost: "0",
      icon: <Gamepad2 className="w-8 h-8 text-white" />,
      color: "from-indigo-500 to-blue-600",
      route: "/admin",
      popular: false,
      percentage: "+3.2%",
      volume: "156",
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <Navigation />
      
      <main className="pt-20 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Credits Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-headline-bold text-white">
                Hey {userData?.username || userData?.email?.split('@')[0] || "Player"}!
              </h1>
              <p className="text-white font-body">Your TCG adventure awaits</p>
            </div>
            <div className="bg-gradient-to-r from-yellow-600/95 to-yellow-500/95 backdrop-blur-sm border border-yellow-500/40 rounded-xl px-4 py-2 flex items-center space-x-2 shadow-lg">
              <Coins className="w-4 h-4 text-white" />
              <div className="text-right">
                <div className="text-lg font-body-bold text-white" data-testid="text-user-credits">
                  {userData?.credits || "0"}
                </div>
                <div className="text-xs text-white font-body">Credits</div>
              </div>
            </div>
          </div>

          {/* Featured Section */}
          <motion.section 
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="relative">
                <div className="w-1 h-10 bg-gradient-to-b from-purple-400 via-cyan-400 to-purple-400 rounded-full shadow-lg shadow-purple-500/30"></div>
                <div className="absolute inset-0 w-1 h-10 bg-gradient-to-b from-purple-400 via-cyan-400 to-purple-400 rounded-full blur-sm opacity-50"></div>
              </div>
              <h2 className="text-2xl font-headline-bold text-white">Featured</h2>
            </div>
            
            {/* Classic Pack Banner */}
            <div className="relative overflow-hidden rounded-2xl mb-8">
              <div 
                className="w-full h-64 bg-cover bg-center bg-no-repeat"
                style={{
                  backgroundImage: "url('/assets/black-bolt-banner.png')",
                }}
              >
                {/* Light overlay for better text readability */}
                <div className="absolute inset-0 bg-black/10"></div>
                
                {/* Content */}
                <div className="relative h-full flex items-center">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                    <div className="flex items-center justify-between">
                     {/* Left side - Text content */}
                     <div className="flex-1 max-w-2xl">
                       <div className="space-y-4">
                         <motion.h3 
                           className="text-4xl sm:text-5xl font-headline-bold text-yellow-400" 
                           style={{ textShadow: '2px 2px 0px black, -2px -2px 0px black, 2px -2px 0px black, -2px 2px 0px black' }}
                           initial={{ opacity: 0, y: 30, scale: 0.8 }}
                           animate={{ opacity: 1, y: 0, scale: 1 }}
                           transition={{ 
                             duration: 0.8, 
                             delay: 0.2,
                             type: "spring",
                             stiffness: 100,
                             damping: 15
                           }}
                         >
                           NEW SET
                         </motion.h3>
                         <motion.p 
                           className="text-lg sm:text-xl text-gray-200 font-body leading-tight" 
                           style={{ textShadow: '1px 1px 0px black, -1px -1px 0px black, 1px -1px 0px black, -1px 1px 0px black' }}
                           initial={{ opacity: 0, y: 20, x: -20 }}
                           animate={{ opacity: 1, y: 0, x: 0 }}
                           transition={{ 
                             duration: 0.6, 
                             delay: 0.4,
                             type: "spring",
                             stiffness: 80,
                             damping: 12
                           }}
                         >
                           Rip Black Bolt Packs.<br />
                           Don't Miss Out
                         </motion.p>
                         <motion.div
                           initial={{ opacity: 0, y: 20, scale: 0.9 }}
                           animate={{ opacity: 1, y: 0, scale: 1 }}
                           transition={{ 
                             duration: 0.6, 
                             delay: 0.6,
                             type: "spring",
                             stiffness: 100,
                             damping: 15
                           }}
                         >
                           <Button
                             onClick={() => window.location.href = '/play?open=black-bolt'}
                             className="bg-gradient-to-r from-green-700 to-green-600 hover:from-green-800 hover:to-green-700 text-white font-semibold px-8 py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                           >
                             Open Now
                           </Button>
                         </motion.div>
                       </div>
                     </div>
                      
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Quick Play Section */}
          <section className="mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="relative">
                <div className="w-1 h-10 bg-gradient-to-b from-purple-400 via-cyan-400 to-purple-400 rounded-full shadow-lg shadow-purple-500/30"></div>
                <div className="absolute inset-0 w-1 h-10 bg-gradient-to-b from-purple-400 via-cyan-400 to-purple-400 rounded-full blur-sm opacity-50"></div>
              </div>
              <h2 className="text-2xl font-headline-bold text-white">Quick Play</h2>
            </div>
            
            <div className="flex overflow-x-auto scrollbar-hide gap-6 pb-4 snap-x snap-mandatory max-w-6xl mx-auto px-4">
              {/* Classic Packs */}
              <div className="group cursor-pointer flex-shrink-0 w-64" onClick={() => window.location.href = '/play#classic-packs'}>
                <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-orange-500 transition-all duration-300 cursor-pointer group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-orange-500/20">
                  <CardContent className="p-0">
                    <div className="relative overflow-hidden rounded-lg">
                      <img 
                        src="/assets/classic-image.png" 
                        alt="Classic Packs" 
                        className="w-full h-56 sm:h-64 object-cover object-center group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/5 group-hover:bg-black/2 transition-colors duration-300"></div>
                      <div className="absolute bottom-2 left-2">
                        <Badge className="bg-green-500/90 text-white text-xs">16 Credits</Badge>
                      </div>
                      <div className="absolute bottom-2 right-2">
                        <Badge className="bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-semibold">
                          Classic Packs
                        </Badge>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-white mb-1 truncate">Classic Packs</h3>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Minesweeper Game */}
              <div className="group cursor-pointer flex-shrink-0 w-64" onClick={() => window.location.href = '/play/minesweeper'}>
                <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-green-500 transition-all duration-300 cursor-pointer group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-green-500/20">
                  <CardContent className="p-0">
                    <div className="relative overflow-hidden rounded-lg">
                      <img 
                        src="/assets/minesweeper-image.png" 
                        alt="Minesweeper Game" 
                        className="w-full h-56 sm:h-64 object-cover object-center group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/5 group-hover:bg-black/2 transition-colors duration-300"></div>
                      <div className="absolute bottom-2 left-2">
                        <Badge className="bg-green-500/90 text-white text-xs">15 Credits</Badge>
                      </div>
                      <div className="absolute bottom-2 right-2">
                        <Badge className="bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-semibold">
                          Win Mystery Packs
                        </Badge>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-white mb-1 truncate">Minesweeper</h3>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Wheel Game */}
              <div className="group cursor-pointer flex-shrink-0 w-64" onClick={() => window.location.href = '/play/wheel'}>
                <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-yellow-500 transition-all duration-300 cursor-pointer group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-yellow-500/20">
                  <CardContent className="p-0">
                    <div className="relative overflow-hidden rounded-lg">
                      <div className="w-full h-56 sm:h-64 bg-gradient-to-br from-yellow-500 to-red-600 flex items-center justify-center">
                        <div className="text-4xl sm:text-5xl">🎡</div>
                      </div>
                      <div className="absolute inset-0 bg-black/5 group-hover:bg-black/2 transition-colors duration-300"></div>
                      <div className="absolute bottom-2 left-2">
                        <Badge className="bg-green-500/90 text-white text-xs">20 Credits</Badge>
                      </div>
                      <div className="absolute bottom-2 right-2">
                        <Badge className="bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-semibold">
                          Win Mystery Packs
                        </Badge>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-white mb-1 truncate">Wheel Game</h3>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Special Packs */}
              <div className="group cursor-pointer flex-shrink-0 w-64" onClick={() => window.location.href = '/play/special-packs'}>
                <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-purple-500 transition-all duration-300 cursor-pointer group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-purple-500/20">
                  <CardContent className="p-0">
                    <div className="relative overflow-hidden rounded-lg">
                      <div className="w-full h-56 sm:h-64 bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                        <div className="text-4xl sm:text-5xl">✨</div>
                      </div>
                      <div className="absolute inset-0 bg-black/5 group-hover:bg-black/2 transition-colors duration-300"></div>
                      <div className="absolute bottom-2 left-2">
                        <Badge className="bg-green-500/90 text-white text-xs">25 Credits</Badge>
                      </div>
                      <div className="absolute bottom-2 right-2">
                        <Badge className="bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-semibold">
                          Special Packs
                        </Badge>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-white mb-1 truncate">Special Packs</h3>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Recent Pulls Carousel */}
          <RecentPullsCarousel />

        </div>
      </main>
      
      {/* Footer with Quick Links */}
      <footer className="bg-gradient-to-r from-gray-900 to-gray-800 border-t border-gray-700 py-8 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Quick Links */}
            <div>
              <h3 className="text-white font-body-bold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link href="/" className="text-white hover:text-purple-400 transition-colors font-body">Home</Link></li>
                <li><Link href="/play" className="text-white hover:text-purple-400 transition-colors font-body">Play</Link></li>
                <li><Link href="/my-packs" className="text-white hover:text-purple-400 transition-colors font-body">My Packs</Link></li>
                <li><Link href="/vault" className="text-white hover:text-purple-400 transition-colors font-body">Vault</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-white font-body-bold mb-4">Support</h3>
              <ul className="space-y-2">
                <li><Link href="/help" className="text-white hover:text-purple-400 transition-colors font-body">Help Center</Link></li>
                <li><Link href="/contact" className="text-white hover:text-purple-400 transition-colors font-body">Contact Us</Link></li>
                <li><Link href="/terms" className="text-white hover:text-purple-400 transition-colors font-body">Terms of Service</Link></li>
                <li><Link href="/privacy" className="text-white hover:text-purple-400 transition-colors font-body">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="mt-8 pt-6 border-t border-gray-700">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-white text-sm font-body">
                © 2025 Drops TCG. All rights reserved.
              </div>
              <div className="flex space-x-4 mt-4 md:mt-0">
                <a href="#" className="text-white hover:text-purple-400 transition-colors">
                  <span className="sr-only">Twitter</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-white hover:text-purple-400 transition-colors">
                  <span className="sr-only">Discord</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M16.942 4.556a16.3 16.3 0 0 0-4.126-1.3 12.04 12.04 0 0 0-.529 1.1 15.175 15.175 0 0 0-4.573 0 11.585 11.585 0 0 0-.535-1.1 16.274 16.274 0 0 0-4.129 1.3A17.392 17.392 0 0 0 .182 13.218a15.785 15.785 0 0 0 4.963 2.521c.41-.564.773-1.16 1.084-1.785a10.63 10.63 0 0 1-1.706-.83c.143-.106.283-.217.418-.33a11.664 11.664 0 0 0 10.118 0c.137.113.272.224.418.33-.544.328-1.116.606-1.71.832a12.52 12.52 0 0 0 1.084 1.785 16.46 16.46 0 0 0 5.064-2.595 17.286 17.286 0 0 0-2.973-8.662zM6.678 10.813a1.941 1.941 0 0 1-1.8-2.045 1.93 1.93 0 0 1 1.8-2.047 1.919 1.919 0 0 1 1.8 2.047 1.93 1.93 0 0 1-1.8 2.045zm6.644 0a1.94 1.94 0 0 1-1.8-2.045 1.93 1.93 0 0 1 1.8-2.047 1.918 1.918 0 0 1 1.8 2.047 1.93 1.93 0 0 1-1.8 2.045z"/>
                  </svg>
                </a>
                <a href="#" className="text-white hover:text-purple-400 transition-colors">
                  <span className="sr-only">GitHub</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Navigation Footer */}
      <NavigationFooter />
    </div>
  );
}