import React from 'react';
import { Link } from 'wouter';
import { Button } from '../components/ui/button';
import { motion } from 'framer-motion';

const Auth: React.FC = () => {
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
            DROPS TCG
          </motion.span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="text-2xl md:text-3xl text-gray-300 max-w-2xl mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          Login or sign up to continue
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
            New users get 300 free credits
          </motion.p>
        </motion.div>

        {/* Auth Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-6 justify-center items-center max-w-lg mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0 }}
        >
          <Link href="/login" className="w-full sm:w-48">
            <Button 
              size="lg" 
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Log In
            </Button>
          </Link>
          <Link href="/register" className="w-full sm:w-48">
            <Button 
              size="lg" 
              variant="outline"
              className="w-full border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-slate-900 font-semibold px-8 py-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Sign Up
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
