import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAuthenticatedCombined, isAdmin, isAdminCombined } from "./auth";
import { db } from "./db";
import { sql, eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import path from "path";
import { fileURLToPath } from 'url';
import fileUpload from 'express-fileupload';
import { handleError, createErrorResponse, createSuccessResponse, asyncHandler } from './utils/errorHandler';
import { createValidationMiddleware, createParamValidationMiddleware, raffleSchemas, commonSchemas } from './utils/validation';
import { 
  classicPack,
  classicPrize,
  mysteryPack,
  mysteryPrize,
  specialPack,
  specialPrize,
  userCards,
  globalFeed,
  users,
  transactions,
  raffles,
  rafflePrizes,
  raffleEntries,
  raffleWinners,
  insertShippingRequestSchema
} from "@shared/schema";

// Game result interface
interface GameResult {
  cardId: string;
  tier: string;
  gameType: string;
}

// Map tier to pack type for Plinko

export async function registerRoutes(app: Express): Promise<Server> {
  // CRITICAL: Session middleware must be set up BEFORE CORS
  // This ensures cookies are properly handled
  setupAuth(app);

  // File upload middleware
  app.use(fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    abortOnLimit: true,
    responseOnLimit: 'File size limit has been reached',
    createParentPath: true
  }));

  // Health check endpoint
  app.get('/api/health', async (req, res) => {
    try {
      // Check database connection
      await db.execute(sql`SELECT 1`);
      
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        database: 'connected',
        environment: process.env.NODE_ENV || 'development'
      });
    } catch (error) {
      res.status(503).json({ 
        status: 'error', 
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: 'Database connection failed'
      });
    }
  });

  // Test endpoint to assign packs to user
  app.post('/api/admin/assign-test-packs', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { count = 100 } = req.body;
      
      console.log(`🎁 Assigning ${count} test packs to user ${userId}`);
      
      const packTypes = [
        { packId: 'mystery-pokeball', tier: 'pokeball' },
        { packId: 'mystery-greatball', tier: 'greatball' },
        { packId: 'mystery-ultraball', tier: 'ultraball' },
        { packId: 'mystery-masterball', tier: 'masterball' }
      ];
      
      let totalAdded = 0;
      
      for (const packType of packTypes) {
        console.log(`📦 Adding ${count} ${packType.tier} packs...`);
        
        for (let i = 0; i < count; i++) {
          try {
            await storage.addUserPack({
              id: `test-${packType.tier}-${Date.now()}-${i}`,
              userId,
              packId: packType.packId,
              packType: 'mystery',
              tier: packType.tier,
              earnedFrom: 'admin_test',
              isOpened: false,
            });
            totalAdded++;
          } catch (error: any) {
            console.error(`❌ Error adding ${packType.tier} pack ${i + 1}:`, error.message);
          }
        }
        
        console.log(`✅ Completed adding ${count} ${packType.tier} packs`);
      }
      
      console.log(`🎉 All test packs assigned successfully! Total: ${totalAdded}`);
      
      res.json({ 
        success: true, 
        message: `Successfully assigned ${totalAdded} test packs`,
        totalAdded,
        packsPerType: count
      });
    } catch (error) {
      console.error("❌ Error assigning test packs:", error);
      res.status(500).json({ message: "Failed to assign test packs" });
    }
  });

  // Test inventory endpoint (no auth required for testing)
  app.get('/api/test-inventory', async (req, res) => {
    try {
      const inventoryCards = await storage.getInventoryCards();
      res.json({ success: true, count: inventoryCards.length, cards: inventoryCards });
    } catch (error: any) {
      console.error("Error testing inventory:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Test database schema endpoint
  app.get('/api/test-schema', async (req, res) => {
    try {
      // Check users table schema
      const usersResult = await db.execute(sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position`);
      res.json({ 
        success: true, 
        usersTableColumns: usersResult.rows,
        message: "Database schema check completed"
      });
    } catch (error: any) {
      console.error('Test schema error:', error);
      res.json({ success: false, error: error.message });
    }
  });

  // Test user lookup endpoint
  app.get('/api/test-user/:email', async (req, res) => {
    try {
      const { email } = req.params;
      // Direct database query to avoid schema issues
      const userResult = await db.execute(sql`SELECT id, username, email, password_hash, role, credits FROM users WHERE email = ${email} LIMIT 1`);
      const user = userResult.rows[0] as any;
      res.json({ 
        success: true, 
        user: user ? {
          id: user.id,
          username: user.username,
          email: user.email,
          hasPassword: !!user.password_hash,
          role: user.role,
          credits: user.credits
        } : null,
        message: user ? "User found" : "User not found"
      });
    } catch (error: any) {
      console.error('Test user error:', error);
      res.json({ success: false, error: error.message });
    }
  });

  // Test all users endpoint
  app.get('/api/test-users', async (req, res) => {
    try {
      // Get all users
      const usersResult = await db.execute(sql`SELECT id, username, email, role, credits FROM users LIMIT 10`);
      res.json({ 
        success: true, 
        users: usersResult.rows,
        count: usersResult.rows.length,
        message: "Users retrieved"
      });
    } catch (error: any) {
      console.error('Test users error:', error);
      res.json({ success: false, error: error.message });
    }
  });

  // Create test user endpoint
  app.post('/api/test-create-user', async (req, res) => {
    try {
      const { email, username, password } = req.body;
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Insert user directly
      const result = await db.execute(sql`
        INSERT INTO users (id, username, email, password_hash, role, credits) 
        VALUES (gen_random_uuid(), ${username}, ${email}, ${hashedPassword}, 'user', 1000)
        RETURNING id, username, email, role, credits
      `);
      
      res.json({ 
        success: true, 
        user: result.rows[0],
        message: "User created successfully"
      });
    } catch (error: any) {
      console.error('Create user error:', error);
      res.json({ success: false, error: error.message });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticatedCombined, async (req: any, res) => {
    try {
      // Disable caching for user data to prevent 304 responses
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const user = req.user; // User is now attached directly by custom middleware
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Game settings routes
  app.get('/api/games/:gameType/settings', async (req, res) => {
    try {
      // Disable caching for game settings
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const { gameType } = req.params;
      const settings = await storage.getGameSetting(gameType);
      if (!settings) {
        return res.status(404).json({ message: "Game settings not found" });
      }
      res.json(settings);
    } catch (error) {
      console.error("Error fetching game settings:", error);
      res.status(500).json({ message: "Failed to fetch game settings" });
    }
  });

  // Game routes
  app.post('/api/games/play', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { gameType, betAmount, plinkoResult, wheelResult } = req.body;

      // Validate input
      if (!['plinko', 'wheel', 'pack'].includes(gameType)) {
        return res.status(400).json({ message: "Invalid game type" });
      }

      // For Plinko, use fixed price from database, ignore user input
      let actualBetAmount: string;
      if (gameType === 'plinko') {
        const gameSettings = await storage.getGameSetting('plinko');
        if (!gameSettings) {
          return res.status(500).json({ message: "Plinko pricing not configured" });
        }
        actualBetAmount = gameSettings.price;
      } else {
        // For other games, validate user input
        const bet = parseFloat(betAmount);
        if (isNaN(bet) || bet <= 0) {
          return res.status(400).json({ message: "Invalid bet amount" });
        }
        actualBetAmount = betAmount;
      }

      // Check user credits using actual bet amount
      const canDeduct = await storage.deductUserCredits(userId, actualBetAmount);
      if (!canDeduct) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      // Create game session for crash recovery
      const gameSession = await storage.createGameSession({
        userId,
        gameType,
        gameData: { betAmount: actualBetAmount, timestamp: Date.now() },
        status: 'in_progress',
      });

      let result: GameResult;
      
      if (gameType === 'plinko' && plinkoResult) {
        // Use frontend physics result for Plinko
        result = {
          cardId: '',
          tier: plinkoResult.toLowerCase(), // Convert "Masterball" to "masterball"
          gameType,
        };
      } else if (gameType === 'wheel' && wheelResult) {
        // Use frontend wheel result for Wheel
        result = {
          cardId: '',
          tier: wheelResult.toLowerCase(), // Use wheel result from frontend
          gameType,
        };
      } else {
        // Use backend simulation for other games
        result = await simulateGame(gameType, parseFloat(actualBetAmount));
      }
      
      // Update game session with result
      await storage.updateGameSession(gameSession.id, result, 'completed');

      if (gameType === 'plinko' || gameType === 'wheel') {
        // For Plinko and Wheel, award mystery packs based on outcome
        const packType = result.tier;
        
        const mysteryPacks = await storage.getMysteryPacks();
        const targetPack = mysteryPacks.find(p => p.packType === packType);
        
        if (!targetPack) {
          // If specific pack type doesn't exist, use the first available pack
          const fallbackPack = mysteryPacks[0];
          if (!fallbackPack) {
            throw new Error(`No mystery packs available`);
          }
          
          // Award fallback pack to user
          await storage.addUserPack({
            id: `up-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId,
            packId: fallbackPack.id,
            packType: 'mystery',
            tier: packType, // Store pack type directly
            earnedFrom: gameType,
            isOpened: false,
          });
        } else {
          // Award pack to user - store the pack type as tier for display
          await storage.addUserPack({
            id: `up-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId,
            packId: targetPack.id,
            packType: 'mystery',
            tier: packType, // Store pack type directly
            earnedFrom: gameType,
            isOpened: false,
          });
        }

        // No global feed for pack earning - only when opening packs
      } else {
        // For other games, keep the old card logic
        // Redirect to inventory since cards table was removed
        const inventoryCards = await storage.getInventoryCards();
        const card = inventoryCards.find(c => c.id === result.cardId);
        if (!card) {
          throw new Error('Card not found');
        }

        // Add card to user vault with correct pull value
        await storage.addUserCard({
          id: `uc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId,
          cardName: card.name,
          cardImageUrl: card.imageUrl,
          cardTier: card.tier,
          refundCredit: card.credits,
        });

        // Add to global feed if rare enough
        if (['rare', 'superrare', 'legendary'].includes(result.tier)) {
          await storage.addGlobalFeedEntry({
            userId,
            cardId: result.cardId,
            tier: result.tier,
            gameType,
          });
        }
      }

      // Create transaction record
      await storage.addTransaction({
        id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'game_play',
        amount: `-${actualBetAmount}`,
        description: `Played ${gameType} game`,
      });

      res.json({ 
        success: true, 
        result,
        sessionId: gameSession.id,
      });

    } catch (error) {
      console.error("Error playing game:", error);
      res.status(500).json({ message: "Game error occurred" });
    }
  });

  // Minesweeper game endpoint
  app.post('/api/games/minesweeper', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { greensFound, won } = req.body;

      // Validate input
      if (typeof greensFound !== 'number' || greensFound < 0 || greensFound > 4) {
        return res.status(400).json({ message: "Invalid greens found count" });
      }

      if (typeof won !== 'boolean') {
        return res.status(400).json({ message: "Invalid win status" });
      }

      // Determine pack tier based on greens found
      let packTier: string;
      if (greensFound === 0) packTier = "pokeball";
      else if (greensFound === 1) packTier = "pokeball";
      else if (greensFound === 2) packTier = "greatball";
      else if (greensFound === 3) packTier = "ultraball";
      else if (greensFound === 4) packTier = "masterball";
      else packTier = "pokeball";

      // Get the mystery pack by tier
      const mysteryPacks = await storage.getMysteryPacks();
      let pack = mysteryPacks.find(p => p.packType === packTier);
      if (!pack) {
        // If pack doesn't exist, use the first available pack
        pack = mysteryPacks[0];
        if (!pack) {
          return res.status(500).json({ message: `No mystery packs available` });
        }
      }

      // Award pack to user
      await storage.addUserPack({
        id: `up-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        packId: pack.id,
        packType: 'mystery',
        tier: packTier,
        earnedFrom: 'minesweeper',
        isOpened: false,
      });

      // Create transaction record
      await storage.addTransaction({
        id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'game_play',
        amount: "0", // No additional cost since credits were already deducted
        description: `Minesweeper game completed - ${greensFound} greens found`,
      });

      // Create game session
      await storage.createGameSession({
        userId,
        gameType: 'minesweeper',
        gameData: { greensFound, won, timestamp: Date.now() },
        status: 'completed',
      });

      // Prepare response message
      let message: string;
      if (won) {
        message = `Congratulations! You found all ${greensFound} green cards and won a ${packTier.charAt(0).toUpperCase() + packTier.slice(1)} pack!`;
      } else {
        message = `Game over! You found ${greensFound} green cards and earned a ${packTier.charAt(0).toUpperCase() + packTier.slice(1)} pack!`;
      }

      res.json({
        success: true,
        won,
        greensFound,
        packTier,
        message,
        currentRound: 1,
      });

    } catch (error) {
      console.error("Error in Minesweeper game:", error);
      res.status(500).json({ message: "Minesweeper game error occurred" });
    }
  });

  // Find Pikachu game endpoint
  app.post('/api/games/find-pikachu', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { pikachusFound, won } = req.body;

      // Validate input
      if (typeof pikachusFound !== 'number' || pikachusFound < 0 || pikachusFound > 4) {
        return res.status(400).json({ message: "Invalid pikachus found count" });
      }

      if (typeof won !== 'boolean') {
        return res.status(400).json({ message: "Invalid win status" });
      }

      // Determine mystery pack tier based on pikachus found
      let packTier: string;
      if (pikachusFound === 0 || pikachusFound === 1) packTier = "pokeball";
      else if (pikachusFound === 2) packTier = "greatball";
      else if (pikachusFound === 3) packTier = "ultraball";
      else if (pikachusFound === 4) packTier = "masterball";
      else packTier = "pokeball";

      // Get the mystery pack by tier
      const mysteryPacks = await storage.getMysteryPacks();
      let pack = mysteryPacks.find(p => p.packType === packTier);
      if (!pack) {
        // If pack doesn't exist, use the first available pack
        pack = mysteryPacks[0];
        if (!pack) {
          return res.status(500).json({ message: `No mystery packs available` });
        }
      }

      // Award mystery pack to user
      const userPack = await storage.addUserPack({
        id: `up-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        packId: pack.id,
        packType: 'mystery',
        tier: packTier,
        earnedFrom: 'find-pikachu',
        isOpened: false,
      });

      // Create transaction record
      await storage.addTransaction({
        id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'game_play',
        amount: "0", // No additional cost since credits were already deducted
        description: `Find Pikachu game completed - ${pikachusFound} pikachus found`,
      });

      // Create game session
      await storage.createGameSession({
        userId,
        gameType: 'find-pikachu',
        gameData: { pikachusFound, won, timestamp: Date.now() },
        status: 'completed',
      });

      // Prepare response message
      let message: string;
      if (won) {
        message = `Congratulations! You found all ${pikachusFound} Pikachus and won a ${packTier.charAt(0).toUpperCase() + packTier.slice(1)} mystery pack!`;
      } else {
        message = `Game over! You found ${pikachusFound} Pikachus and earned a ${packTier.charAt(0).toUpperCase() + packTier.slice(1)} mystery pack!`;
      }

      res.json({
        success: true,
        won,
        pikachusFound,
        packTier,
        message,
        currentRound: 1,
      });

    } catch (error) {
      console.error("Error in Find Pikachu game:", error);
      res.status(500).json({ message: "Find Pikachu game error occurred" });
    }
  });

  // Energy Match game endpoint
  app.post('/api/games/energy-match', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { matches, selectedEnergy } = req.body;

      // Validate input
      if (typeof matches !== 'number' || matches < 0 || matches > 5) {
        return res.status(400).json({ message: "Invalid matches count" });
      }

      if (typeof selectedEnergy !== 'string') {
        return res.status(400).json({ message: "Invalid selected energy" });
      }

      // Determine mystery pack tier based on matches
      let packTier: string;
      if (matches <= 1) packTier = "pokeball";
      else if (matches === 2) packTier = "greatball";
      else if (matches === 3) packTier = "ultraball";
      else if (matches === 4) packTier = "masterball";
      else if (matches === 5) packTier = "luxuryball";
      else packTier = "pokeball";

      // Get the mystery pack by tier
      const mysteryPacks = await storage.getMysteryPacks();
      let pack = mysteryPacks.find(p => p.packType === packTier);
      if (!pack) {
        // If pack doesn't exist, use the first available pack
        pack = mysteryPacks[0];
        if (!pack) {
          return res.status(500).json({ message: `No mystery packs available` });
        }
      }

      // Award mystery pack to user
      await storage.addUserPack({
        id: `up-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        packId: pack.id,
        packType: 'mystery',
        tier: packTier,
        earnedFrom: 'energy-match',
        isOpened: false,
      });

      // Create transaction record
      await storage.addTransaction({
        id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'game_play',
        amount: "0", // No additional cost since credits were already deducted
        description: `Energy Match game completed - ${matches} matches with ${selectedEnergy} energy`,
      });

      // Create game session
      await storage.createGameSession({
        userId,
        gameType: 'energy-match',
        gameData: { matches, selectedEnergy, timestamp: Date.now() },
        status: 'completed',
      });

      // Prepare response message
      const message = `Great job! You matched ${matches} ${selectedEnergy} energy cards and earned a ${packTier.charAt(0).toUpperCase() + packTier.slice(1)} mystery pack!`;

      res.json({
        success: true,
        matches,
        selectedEnergy,
        packTier,
        message,
        currentRound: 1,
      });

    } catch (error) {
      console.error("Error in Energy Match game:", error);
      res.status(500).json({ message: "Energy Match game error occurred" });
    }
  });

  // Dice game endpoint
  app.post('/api/dice/roll', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { amount } = req.body;

      // Validate input
      if (typeof amount !== 'number' || amount < 250) {
        return res.status(400).json({ message: "Minimum bet is 250 credits" });
      }

      // Simulate dice roll - 5 dice with 6 Pokemon types
      const pokemonTypes = ['psychic', 'fire', 'grass', 'water', 'electric', 'dark'];
      const dice = Array.from({ length: 5 }, () => 
        pokemonTypes[Math.floor(Math.random() * pokemonTypes.length)]
      );
      
      // Count matches
      const counts: { [key: string]: number } = {};
      dice.forEach(type => {
        counts[type] = (counts[type] || 0) + 1;
      });
      
      const maxMatches = Math.max(...Object.values(counts));
      
      // Determine reward based on matches
      let packTier: string;
      if (maxMatches >= 5) {
        packTier = 'masterball';
      } else if (maxMatches >= 4) {
        packTier = 'ultraball';
      } else if (maxMatches >= 3) {
        packTier = 'greatball';
      } else if (maxMatches >= 2) {
        packTier = 'pokeball';
      } else {
        packTier = 'pokeball'; // Minimum reward
      }

      // Create transaction record
      await storage.addTransaction({
        id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'game_play',
        amount: amount.toString(),
        description: `Pokemon Dice game - rolled ${dice.join(', ')} with ${maxMatches} matches`,
      });

      // Create game session
      await storage.createGameSession({
        userId,
        gameType: 'dice',
        gameData: { dice, maxMatches, packTier, timestamp: Date.now() },
        status: 'completed',
      });

      res.json({
        success: true,
        dice,
        maxMatches,
        packTier,
        message: `You rolled ${dice.join(', ')} and got ${maxMatches} matches! You won a ${packTier} pack!`,
      });

    } catch (error) {
      console.error("Error in Dice game:", error);
      res.status(500).json({ message: "Dice game error occurred" });
    }
  });

  app.post('/api/dice/play', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { result } = req.body;
      
      if (!result) {
        return res.status(400).json({ message: "Game result is required" });
      }

      // Get the mystery pack by tier
      const mysteryPacks = await storage.getMysteryPacks();
      let pack = mysteryPacks.find(p => p.packType === result);
      if (!pack) {
        // If pack doesn't exist, use the first available pack
        pack = mysteryPacks[0];
        if (!pack) {
          return res.status(500).json({ message: `No mystery packs available` });
        }
      }

      // Award mystery pack to user
      await storage.addUserPack({
        id: `up-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        packId: pack.id,
        packType: 'mystery',
        tier: result,
        earnedFrom: 'dice',
        isOpened: false,
      });

      res.json({
        success: true,
        message: "Pack added to your inventory!",
      });

    } catch (error) {
      console.error("Error assigning dice pack:", error);
      res.status(500).json({ message: "Failed to assign pack" });
    }
  });

  // Wheel game endpoint
  app.post('/api/wheel/deduct-credits', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { amount } = req.body;

      // Validate input
      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      // Get current user credits
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const currentCredits = Number(user.credits);
      if (currentCredits < amount) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      // Deduct credits
      const newCredits = currentCredits - amount;
      await storage.updateUserCredits(userId, newCredits.toString());

      // Create transaction record
      await storage.addTransaction({
        id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'game_play',
        amount: `-${amount}`,
        description: `Wheel game spin - ${amount} credits`,
      });

      res.json({
        success: true,
        newCredits,
        deducted: amount,
      });

    } catch (error) {
      console.error("Error deducting credits for wheel game:", error);
      res.status(500).json({ message: "Failed to deduct credits" });
    }
  });

  // Wheel game play endpoint
  app.post('/api/wheel/play', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { result } = req.body;

      // Validate input
      if (typeof result !== 'string') {
        return res.status(400).json({ message: "Invalid result" });
      }

      // Map wheel result to mystery pack tier
      let packTier: string;
      switch (result.toLowerCase()) {
        case 'pokeball':
          packTier = 'pokeball';
          break;
        case 'greatball':
          packTier = 'greatball';
          break;
        case 'ultraball':
          packTier = 'ultraball';
          break;
        case 'masterball':
          packTier = 'masterball';
          break;
        default:
          packTier = 'pokeball'; // Default fallback
      }

      console.log(`🎯 Wheel result: ${result} -> packTier: ${packTier}`);

      // Get the mystery pack by tier
      const mysteryPacks = await storage.getMysteryPacks();
      console.log(`📦 Available mystery packs:`, mysteryPacks.map(p => ({ id: p.id, name: p.name, packType: p.packType })));
      
      let pack = mysteryPacks.find(p => p.packType === packTier);
      console.log(`🎯 Looking for packType: ${packTier}, found:`, pack ? { id: pack.id, name: pack.name, packType: pack.packType } : 'null');
      
      if (!pack) {
        // If pack doesn't exist, use the first available pack
        pack = mysteryPacks[0];
        console.log(`⚠️ Pack not found, using first available:`, pack ? { id: pack.id, name: pack.name, packType: pack.packType } : 'null');
        if (!pack) {
          return res.status(500).json({ message: `No mystery packs available` });
        }
      }

      // Award mystery pack to user
      await storage.addUserPack({
        id: `up-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        packId: pack.id,
        packType: 'mystery',
        tier: packTier,
        earnedFrom: 'wheel-spin',
        isOpened: false,
      });

      // Create transaction record
      await storage.addTransaction({
        id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'game_play',
        amount: "0", // No additional cost since credits were already deducted
        description: `Wheel game completed - won ${packTier} mystery pack`,
      });

      // Create game session
      await storage.createGameSession({
        userId,
        gameType: 'wheel-spin',
        gameData: { result, packTier, timestamp: Date.now() },
        status: 'completed',
      });

      // Prepare response message
      const message = `Congratulations! You won a ${packTier.charAt(0).toUpperCase() + packTier.slice(1)} mystery pack!`;

      res.json({
        success: true,
        result,
        packTier,
        message,
        packId: pack.id,
      });

    } catch (error) {
      console.error("Error in Wheel game play:", error);
      res.status(500).json({ message: "Wheel game play error occurred" });
    }
  });

  // Vault routes
  app.get('/api/vault', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 16;
      const offset = (page - 1) * limit;

      console.log(`📦 Vault request - userId: ${userId}, page: ${page}, limit: ${limit}, offset: ${offset}`);

      // Get paginated grouped cards and total unique count
      const [userCards, totalCount] = await Promise.all([
        storage.getUserCardsGrouped(userId, limit, offset),
        storage.getUserCardsGroupedCount(userId)
      ]);

      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      res.json({
        cards: userCards,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage,
          hasPrevPage
        }
      });
    } catch (error) {
      console.error("Error fetching vault:", error);
      res.status(500).json({ message: "Failed to fetch vault" });
    }
  });

  // Get card image from card pools
  app.get('/api/card-image/:cardName', async (req: any, res) => {
    try {
      const { cardName } = req.params;
      console.log('🔍 Searching for card image:', cardName);
      
      // Search in mystery pack cards first
      const mysteryCard = await db
        .select({ cardImageUrl: mysteryPrize.cardImageUrl })
        .from(mysteryPrize)
        .where(eq(mysteryPrize.cardName, cardName))
        .limit(1);
      
      console.log('🔍 Mystery pack search result:', mysteryCard);
      
      if (mysteryCard.length > 0 && mysteryCard[0].cardImageUrl) {
        console.log('✅ Found in mystery pack:', mysteryCard[0].cardImageUrl);
        return res.json({ imageUrl: mysteryCard[0].cardImageUrl });
      }
      
      // Search in classic pack cards
      const classicCard = await db
        .select({ cardImageUrl: classicPrize.cardImageUrl })
        .from(classicPrize)
        .where(eq(classicPrize.cardName, cardName))
        .limit(1);
      
      console.log('🔍 Classic pack search result:', classicCard);
      
      if (classicCard.length > 0 && classicCard[0].cardImageUrl) {
        console.log('✅ Found in classic pack:', classicCard[0].cardImageUrl);
        return res.json({ imageUrl: classicCard[0].cardImageUrl });
      }
      
      // Search in special pack cards
      const specialCard = await db
        .select({ cardImageUrl: specialPrize.cardImageUrl })
        .from(specialPrize)
        .where(eq(specialPrize.cardName, cardName))
        .limit(1);
      
      console.log('🔍 Special pack search result:', specialCard);
      
      if (specialCard.length > 0 && specialCard[0].cardImageUrl) {
        console.log('✅ Found in special pack:', specialCard[0].cardImageUrl);
        return res.json({ imageUrl: specialCard[0].cardImageUrl });
      }
      
      // No card found - let's see what cards are actually in the database
      console.log('❌ No card found in any pack for:', cardName);
      
      // Debug: Show some sample cards from each pack type
      const sampleMysteryCards = await db
        .select({ cardName: mysteryPrize.cardName, cardImageUrl: mysteryPrize.cardImageUrl })
        .from(mysteryPrize)
        .limit(5);
      console.log('🔍 Sample mystery pack cards:', sampleMysteryCards);
      
      const sampleClassicCards = await db
        .select({ cardName: classicPrize.cardName, cardImageUrl: classicPrize.cardImageUrl })
        .from(classicPrize)
        .limit(5);
      console.log('🔍 Sample classic pack cards:', sampleClassicCards);
      
      res.json({ imageUrl: null });
    } catch (error) {
      console.error("Error fetching card image:", error);
      res.status(500).json({ message: "Failed to fetch card image" });
    }
  });

  app.post('/api/vault/refund', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { cardIds } = req.body;

      if (!Array.isArray(cardIds) || cardIds.length === 0) {
        return res.status(400).json({ message: "Invalid card IDs" });
      }

      console.log(`🔄 Processing refund for user ${userId}: ${cardIds.length} cards`);

      await storage.refundCards(cardIds, userId);
      
      // Add notification
      await storage.addNotification({
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'refund',
        title: 'Cards Refunded',
        message: `Successfully refunded ${cardIds.length} cards`,
      });

      console.log(`✅ Refund completed successfully for user ${userId}`);

      res.json({ 
        success: true, 
        message: `Successfully refunded ${cardIds.length} cards`,
        refundedCount: cardIds.length
      });
    } catch (error) {
      console.error("❌ Error refunding cards:", error);
      res.status(500).json({ message: "Failed to refund cards" });
    }
  });

  // Async refund endpoint - processes refunds in background
  app.post('/api/vault/refund-async', isAuthenticatedCombined, async (req: any, res) => {
    
    try {
      const userId = req.user.id;
      const { cardIds } = req.body;


      if (!Array.isArray(cardIds) || cardIds.length === 0) {
        return res.status(400).json({ message: "Invalid card IDs" });
      }

      // Immediately respond to client
      res.json({ success: true, message: "Refund processing started" });

      // Process refund in background (don't await)
      storage.refundCardsAsync(cardIds, userId).catch(error => {
        console.error("❌ Async refund processing failed:", error);
        // Could add error notification here if needed
      });
      
    } catch (error) {
      console.error("❌ Error starting async refund:", error);
      res.status(500).json({ message: "Failed to start refund processing" });
    }
  });

  // Debug endpoint to check refund status
  app.get('/api/vault/debug/:userId', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.params.userId;
      const { cardIds } = req.query;
      
      if (!cardIds) {
        return res.status(400).json({ message: "cardIds query parameter required" });
      }
      
      const cardIdArray = Array.isArray(cardIds) ? cardIds : [cardIds];
      
      // Check the current status of these cards
      const cards = await db
        .select()
        .from(userCards)
        .where(and(inArray(userCards.id, cardIdArray), eq(userCards.userId, userId)));
      
      res.json({
        userId,
        cardIds: cardIdArray,
        cards: cards.map(card => ({
          id: card.id,
          isRefunded: card.isRefunded,
          isShipped: card.isShipped,
          refundCredit: card.refundCredit
        }))
      });
    } catch (error) {
      console.error("Error in debug endpoint:", error);
      res.status(500).json({ message: "Debug endpoint error" });
    }
  });

  // Test endpoint to manually trigger refund processing
  app.post('/api/vault/test-refund', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { cardIds } = req.body;


      if (!Array.isArray(cardIds) || cardIds.length === 0) {
        return res.status(400).json({ message: "Invalid card IDs" });
      }

      // Process refund synchronously for testing
      await storage.refundCards(cardIds, userId);
      
      res.json({ 
        success: true, 
        message: `Successfully processed refund for ${cardIds.length} cards`,
        cardIds 
      });
    } catch (error: any) {
      console.error("Error in test refund:", error);
      res.status(500).json({ message: "Test refund failed", error: error.message });
    }
  });

  // Debug endpoint to check mystery packs and cards
  app.get('/api/debug/mystery-data', async (req, res) => {
    try {
      // Get all mystery packs
      const mysteryPacks = await db.select().from(mysteryPack);
      console.log('🔍 Mystery packs:', mysteryPacks);
      
      // Get all mystery prizes
      const mysteryPrizes = await db.select().from(mysteryPrize);
      console.log('🔍 Mystery prizes:', mysteryPrizes);
      
      res.json({
        success: true,
        mysteryPacks,
        mysteryPrizes
      });
    } catch (error) {
      console.error('❌ Error fetching mystery data:', error);
      res.status(500).json({ error: 'Failed to fetch mystery data' });
    }
  });

  // Simple test endpoint to verify routing
  app.post('/api/vault/test-simple', isAuthenticatedCombined, async (req: any, res) => {
    res.json({ success: true, message: "Simple test endpoint working" });
  });

  // Image upload endpoint - using different path to avoid Vite interference
  app.post('/api/admin/upload-image', isAuthenticatedCombined, async (req: any, res) => {
    
    try {
      const userId = req.user.id;
      
      // Check if user is admin
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Handle file upload using multer or similar
      // For now, we'll use a simple approach with express-fileupload
      
      if (!req.files || !req.files.image) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const imageFile = req.files.image;
      console.log('📁 Image file received:', {
        name: imageFile.name,
        size: imageFile.size,
        mimetype: imageFile.mimetype
      });
      
      // Validate file type
      if (!imageFile.mimetype.startsWith('image/')) {
        return res.status(400).json({ message: "File must be an image" });
      }

      // Validate file size (10MB limit)
      if (imageFile.size > 10 * 1024 * 1024) {
        return res.status(400).json({ message: "File size must be less than 10MB" });
      }

      // Generate unique filename
      const fileExtension = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
      
      // Save file to uploads directory
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const uploadPath = path.join(__dirname, '../client/public/uploads', fileName);
      
      // Ensure uploads directory exists
      const fs = await import('fs');
      const uploadsDir = path.join(__dirname, '../client/public/uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      await imageFile.mv(uploadPath);

      // Return the public URL
      const imageUrl = `/uploads/${fileName}`;
      
      res.json({ 
        success: true, 
        imageUrl,
        message: "Image uploaded successfully" 
      });
    } catch (error: any) {
      console.error("🖼️ ❌ Error uploading image:", error);
      console.error("🖼️ ❌ Error stack:", error.stack);
      res.status(500).json({ message: "Failed to upload image", error: error.message });
    }
  });

  // Test endpoint without authentication to verify basic routing
  app.post('/api/vault/test-basic', async (req: any, res) => {
    res.json({ success: true, message: "Basic test endpoint working" });
  });


  // Test endpoint to check global feed table
  app.get('/api/feed/debug', async (req, res) => {
    try {
      
      // Check total count
      const totalCount = await db.select({ count: sql<number>`count(*)` }).from(globalFeed);
      
      // Get all entries
      const allEntries = await db.select().from(globalFeed).limit(10);
      
      res.json({
        totalCount: totalCount[0]?.count || 0,
        sampleEntries: allEntries
      });
    } catch (error) {
      console.error("❌ Error in debug endpoint:", error);
      res.status(500).json({ message: "Debug endpoint error" });
    }
  });

  // Test endpoint to check global feed table
  app.get('/api/feed/test-table', async (req, res) => {
    try {
      // Check if global_feed table exists and has data
      const result = await db.execute(sql`SELECT COUNT(*) as count FROM global_feed`);
      const count = result.rows[0]?.count || 0;
      
      // Get a few sample records
      const sampleResult = await db.execute(sql`SELECT * FROM global_feed LIMIT 5`);
      
      res.json({ 
        success: true, 
        count: count,
        sampleRecords: sampleResult.rows,
        message: "Global feed table check completed"
      });
    } catch (error: any) {
      console.error("❌ Error checking global feed table:", error);
      res.status(500).json({ message: "Failed to check global feed table", error: error.message });
    }
  });

  // Test endpoint to manually add a feed entry
  app.post('/api/feed/test-add', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Get a random card from inventory
      const inventoryCards = await storage.getInventoryCards();
      if (inventoryCards.length === 0) {
        return res.status(400).json({ message: "No cards in inventory" });
      }
      
      const randomCard = inventoryCards[0];
      
      await storage.addGlobalFeedEntry({
        userId,
        cardId: randomCard.id,
        tier: randomCard.tier,
        gameType: 'test',
      });
      
      res.json({ success: true, message: "Test feed entry added" });
    } catch (error) {
      console.error("❌ Error adding test feed entry:", error);
      res.status(500).json({ message: "Failed to add test entry" });
    }
  });

  // Global feed routes
  app.get('/api/feed', async (req, res) => {
    try {
      const { limit = 10, minTier = 'A' } = req.query;
      
      console.log("📰 Feed request - limit:", limit, "minTier:", minTier);
      
      // Use the storage method instead of direct query
      const feedData = await storage.getGlobalFeed(parseInt(limit as string), minTier as string);
      
      console.log("📰 Feed response - returning", feedData.length, "entries");
      
      res.json(feedData);
    } catch (error) {
      console.error("❌ Error fetching feed:", error);
      res.status(500).json({ message: "Failed to fetch feed" });
    }
  });

  // Credits routes
  app.post('/api/credits/purchase', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { amount, bundleType } = req.body;

      const purchaseAmount = parseFloat(amount);
      if (isNaN(purchaseAmount) || purchaseAmount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      // Apply bundle bonuses
      let creditAmount = purchaseAmount;
      if (bundleType === 'bundle_50') {
        creditAmount = purchaseAmount * 1.1; // 10% bonus
      } else if (bundleType === 'bundle_100') {
        creditAmount = purchaseAmount * 1.2; // 20% bonus
      }

      // In a real implementation, integrate with payment processor here
      // For now, we'll just add the credits directly

      await storage.updateUserCredits(userId, creditAmount.toFixed(2));
      
      await storage.addTransaction({
        id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'purchase',
        amount: creditAmount.toFixed(2),
        description: `Credit purchase - ${bundleType || 'custom'}`,
      });

      await storage.addNotification({
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'purchase',
        title: 'Credits Added',
        message: `Added ${creditAmount.toFixed(2)} credits to your account`,
      });

      res.json({ success: true, creditsAdded: creditAmount });
    } catch (error) {
      console.error("Error purchasing credits:", error);
      res.status(500).json({ message: "Failed to purchase credits" });
    }
  });

  // Credit deduction endpoint
  app.post('/api/credits/deduct', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { amount, reason } = req.body;

      const deductAmount = parseFloat(amount);
      if (isNaN(deductAmount) || deductAmount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const canDeduct = await storage.deductUserCredits(userId, deductAmount.toFixed(2));
      
      if (!canDeduct) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      await storage.addTransaction({
        id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'deduction',
        amount: (-deductAmount).toFixed(2),
        description: `Credit deduction - ${reason}`,
      });

      res.json({ success: true, creditsDeducted: deductAmount });
    } catch (error) {
      console.error("Error deducting credits:", error);
      res.status(500).json({ message: "Failed to deduct credits" });
    }
  });

  // User credit update endpoint for reload page
  app.post('/api/user/update-credits', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { credits, amount } = req.body;

      console.log("🔄 Credit reload request:", { userId, credits, amount, body: req.body });

      // Support both 'credits' and 'amount' parameters for backward compatibility
      const creditAmount = parseFloat(credits || amount);
      if (isNaN(creditAmount) || creditAmount <= 0) {
        return res.status(400).json({ message: "Invalid credit amount" });
      }

      // Get current user credits
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const currentCredits = parseFloat(user.credits || "0");
      const newCredits = currentCredits + creditAmount;

      console.log("🔄 Credit calculation:", { 
        userId, 
        currentCredits, 
        creditAmount, 
        newCredits,
        userCreditsString: user.credits,
        calculation: `${currentCredits} + ${creditAmount} = ${newCredits}`
      });

      // Add credits to user account
      await storage.updateUserCredits(userId, newCredits.toFixed(2));
      
      // Add transaction record
      await storage.addTransaction({
        id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'purchase',
        amount: creditAmount.toFixed(2),
        description: `Credit reload - ${creditAmount} credits`,
      });

      // Add notification
      await storage.addNotification({
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'purchase',
        title: 'Credits Added',
        message: `Added ${creditAmount} credits to your account`,
      });

      console.log("✅ Credit reload successful:", { userId, creditsAdded: creditAmount, newTotal: newCredits });

      res.json({ success: true, creditsAdded: creditAmount, newTotal: newCredits });
    } catch (error) {
      console.error("❌ Error updating user credits:", error);
      res.status(500).json({ message: "Failed to update credits" });
    }
  });

  // Shipping routes
  app.post('/api/shipping/request', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const requestData = insertShippingRequestSchema.parse({
        ...req.body,
        userId,
      });

      const shippingRequest = await storage.createShippingRequest(requestData);
      
      await storage.addNotification({
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'shipping',
        title: 'Shipping Request Created',
        message: `Your shipping request has been submitted`,
      });

      res.json(shippingRequest);
    } catch (error) {
      console.error("Error creating shipping request:", error);
      res.status(500).json({ message: "Failed to create shipping request" });
    }
  });

  // Admin routes
  app.get('/api/admin/stats', isAdminCombined, async (req: any, res) => {
    try {
      console.log('🚀 Admin stats API called');
      // Basic admin check (in real app, check user role)
      const stats = await storage.getSystemStats();
      console.log('📊 Returning stats:', stats);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      // Return basic stats without card count if there's an error
      res.json({
        totalUsers: 0,
        totalRevenue: "0",
        totalCards: 0
      });
    }
  });

  app.get('/api/admin/users', isAdminCombined, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/cards', isAdminCombined, async (req: any, res) => {
    try {
      // Redirect to inventory since cards table was removed
      const inventoryCards = await storage.getInventoryCards();
      res.json(inventoryCards);
    } catch (error) {
      console.error("Error fetching cards:", error);
      res.status(500).json({ message: "Failed to fetch cards" });
    }
  });

  // LEGACY ADMIN ROUTE - COMMENTED OUT (references non-existent inventory functionality)
  // app.post('/api/admin/cards', isAdminCombined, async (req: any, res) => {
  //   try {
  //     // Redirect to inventory since cards table was removed
  //     const cardData = insertInventorySchema.parse(req.body);
  //     const card = await storage.createInventoryCard(cardData);
  //     res.json(card);
  //   } catch (error) {
  //     console.error("Error creating card:", error);
  //     res.status(500).json({ message: "Failed to create card" });
  //   }
  // });

  // LEGACY ADMIN ROUTE - COMMENTED OUT (references non-existent inventory functionality)
  // app.patch('/api/admin/cards/:id', isAdminCombined, async (req: any, res) => {
  //   try {
  //     const { id } = req.params;
  //     // Redirect to inventory since cards table was removed
  //     const cardData = insertInventorySchema.partial().parse(req.body);
  //     const card = await storage.updateInventoryCard(id, cardData);
  //     res.json(card);
  //   } catch (error) {
  //     console.error("Error updating card:", error);
  //     res.status(500).json({ message: "Failed to update card" });
  //   }
  // });

  app.patch('/api/admin/cards/:id/stock', isAdminCombined, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { stock } = req.body;
      
      if (typeof stock !== 'number' || stock < 0) {
        return res.status(400).json({ message: "Invalid stock amount" });
      }
      
      // Stock management removed since cards table was removed
      // await storage.updateCardStock(id, stock);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating card stock:", error);
      res.status(500).json({ message: "Failed to update card stock" });
    }
  });

  app.delete('/api/admin/cards/:id', isAdminCombined, async (req: any, res) => {
    try {
      const { id } = req.params;
      // Redirect to inventory since cards table was removed
      await storage.deleteInventoryCard(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting card:", error);
      res.status(500).json({ message: "Failed to delete card" });
    }
  });

  // Pull rate management routes
  app.get('/api/admin/pull-rates', isAdminCombined, async (req: any, res) => {
    try {
      const pullRates = await storage.getAllPullRates();
      res.json(pullRates);
    } catch (error) {
      console.error("Error fetching pull rates:", error);
      res.status(500).json({ message: "Failed to fetch pull rates" });
    }
  });

  app.get('/api/admin/pull-rates/:packType', isAdminCombined, async (req: any, res) => {
    try {
      const { packType } = req.params;
      const pullRates = await storage.getPackPullRates(packType);
      res.json(pullRates);
    } catch (error) {
      console.error("Error fetching pull rates:", error);
      res.status(500).json({ message: "Failed to fetch pull rates" });
    }
  });

  app.post('/api/admin/pull-rates/:packType', isAdminCombined, async (req: any, res) => {
    try {
      const { packType } = req.params;
      const { rates } = req.body;
      const userId = req.user.id;

      // Validate rates array
      if (!Array.isArray(rates)) {
        return res.status(400).json({ message: "Rates must be an array" });
      }

      // Validate each rate
      for (const rate of rates) {
        const probability = parseInt(rate.probability);
        if (isNaN(probability) || probability < 0 || probability > 100) {
          return res.status(400).json({ message: `Invalid probability for tier ${rate.cardTier}` });
        }
      }

      // Check that probabilities sum to 100%
      const totalProbability = rates.reduce((sum, rate) => sum + parseInt(rate.probability), 0);
      if (totalProbability !== 100) {
        return res.status(400).json({ 
          message: `Probabilities must sum to 100% (currently ${totalProbability}%)` 
        });
      }

      await storage.setPackPullRates(packType, rates, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating pull rates:", error);
      res.status(500).json({ message: "Failed to update pull rates" });
    }
  });

  // Virtual library admin routes (separate card pool from mystery packs)
  app.get('/api/admin/virtual-library', isAdminCombined, async (req: any, res) => {
    try {
      const virtualLibraryCards = await storage.getVirtualLibraryCards();
      res.json(virtualLibraryCards);
    } catch (error) {
      console.error("Error fetching virtual library cards:", error);
      res.status(500).json({ message: "Failed to fetch virtual library cards" });
    }
  });

  // LEGACY ADMIN ROUTE - COMMENTED OUT (references non-existent virtual library functionality)
  // app.post('/api/admin/virtual-library', isAdminCombined, async (req: any, res) => {
  //   try {
  //     const cardData = insertVirtualLibrarySchema.parse(req.body);
  //     const virtualLibraryCard = await storage.createVirtualLibraryCard(cardData);
  //     res.json(virtualLibraryCard);
  //   } catch (error) {
  //     console.error("Error creating virtual library card:", error);
  //     res.status(500).json({ message: "Failed to create virtual library card" });
  //   }
  // });

  // LEGACY ADMIN ROUTE - COMMENTED OUT (references non-existent virtual library functionality)
  // app.patch('/api/admin/virtual-library/:id', isAdminCombined, async (req: any, res) => {
  //   try {
  //     const { id } = req.params;
  //     const cardData = insertVirtualLibrarySchema.partial().parse(req.body);
  //     const virtualLibraryCard = await storage.updateVirtualLibraryCard(id, cardData);
  //     res.json(virtualLibraryCard);
  //   } catch (error) {
  //     console.error("Error updating virtual library card:", error);
  //     res.status(500).json({ message: "Failed to update virtual library card" });
  //   }
  // });

  app.delete('/api/admin/virtual-library/:id', isAdminCombined, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteVirtualLibraryCard(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting virtual library card:", error);
      res.status(500).json({ message: "Failed to delete virtual library card" });
    }
  });

  // Inventory admin routes
  app.get('/api/admin/inventory', isAdminCombined, async (req: any, res) => {
    try {
      const inventoryCards = await storage.getInventoryCards();
      res.json(inventoryCards);
    } catch (error) {
      console.error("Error fetching inventory cards:", error);
      res.status(500).json({ message: "Failed to fetch inventory cards" });
    }
  });

  // LEGACY ADMIN ROUTE - COMMENTED OUT (references non-existent inventory functionality)
  // app.post('/api/admin/inventory', isAdminCombined, async (req: any, res) => {
  //   try {
  //     const cardData = insertInventorySchema.parse(req.body);
  //     const inventoryCard = await storage.createInventoryCard(cardData);
  //     res.json(inventoryCard);
  //   } catch (error: any) {
  //     console.error("Error creating inventory card:", error);
  //     res.status(500).json({ message: "Failed to create inventory card", error: error.message });
  //   }
  // });

  // LEGACY ADMIN ROUTE - COMMENTED OUT (references non-existent inventory functionality)
  // app.patch('/api/admin/inventory/:id', isAdminCombined, async (req: any, res) => {
  //   try {
  //     const { id } = req.params;
  //     const cardData = insertInventorySchema.partial().parse(req.body);
  //     const inventoryCard = await storage.updateInventoryCard(id, cardData);
  //     res.json(inventoryCard);
  //   } catch (error) {
  //     console.error("Error updating inventory card:", error);
  //     res.status(500).json({ message: "Failed to update inventory card" });
  //   }
  // });

  app.delete('/api/admin/inventory/:id', isAdminCombined, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteInventoryCard(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting inventory card:", error);
      res.status(500).json({ message: "Failed to delete inventory card", error: error.message });
    }
  });

  // Test endpoint for debugging
  app.get('/api/test-db', async (req: any, res) => {
    try {
      // Test raw SQL insert
      const result = await db.execute(sql`
        INSERT INTO special_packs (id, name, description, image_url, price, total_packs, is_active) 
        VALUES (gen_random_uuid(), ${'Test Pack'}, ${'Test Description'}, ${'https://example.com/test.jpg'}, ${'10.99'}, ${5}, ${true})
        RETURNING *
      `);
      res.json({ success: true, result: result.rows });
    } catch (error: any) {
      console.error('Test DB error:', error);
      res.status(500).json({ error: error.message, stack: error.stack });
    }
  });

  app.get('/api/test-special-packs', async (req: any, res) => {
    try {
      const result = await db.select().from(specialPack);
      res.json({ success: true, result });
    } catch (error: any) {
      console.error('Special packs test error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Test endpoint to verify cascading deletion
  app.get('/api/test-cascade-delete/:cardId', async (req: any, res) => {
    try {
      const { cardId } = req.params;
      
      // Check if card exists in special pack prizes
      const specialPackResult = await db
        .select()
        .from(specialPrize)
        .where(eq(specialPrize.cardName, cardId));
      
      // Check if card exists in mystery pack prizes
      const mysteryPackResult = await db
        .select()
        .from(mysteryPrize)
        .where(eq(mysteryPrize.cardName, cardId));
      
      res.json({ 
        success: true, 
        cardId,
        specialPack: specialPackResult.length,
        mysteryPack: mysteryPackResult.length,
        message: `Card ${cardId} is used in ${specialPackResult.length} special pack(s) and ${mysteryPackResult.length} mystery pack(s)`
      });
    } catch (error: any) {
      console.error('Cascade delete test error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // LEGACY TEST ENDPOINT - COMMENTED OUT (references non-existent inventory table)
  // app.get('/api/test-inventory', async (req: any, res) => {
  //   try {
  //     const result = await db.select().from(inventory);
  //     res.json({ success: true, result, count: result.length });
  //   } catch (error: any) {
  //     console.error('Inventory test error:', error);
  //     res.status(500).json({ success: false, error: error.message, stack: error.stack });
  //   }
  // });

  // Test endpoint to add tier column
  app.get('/api/fix-inventory-tier', async (req: any, res) => {
    try {
      
      // Add tier column if it doesn't exist
      await db.execute(sql`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'D' NOT NULL;`);
      
      // Update existing records to have 'D' tier if they don't have one
      await db.execute(sql`UPDATE inventory SET tier = 'D' WHERE tier IS NULL;`);
      
      // Test the query again
      // const result = await db.select().from(inventory);
      
      res.json({ success: true, message: 'Tier column added successfully' });
    } catch (error: any) {
      console.error('Fix inventory tier error:', error);
      res.status(500).json({ success: false, error: error.message, stack: error.stack });
    }
  });

  // Test endpoint to add packType column
  app.get('/api/fix-pack-type', async (req: any, res) => {
    try {
      
      // Add packType column if it doesn't exist
      await db.execute(sql`ALTER TABLE special_packs ADD COLUMN IF NOT EXISTS pack_type VARCHAR(50) DEFAULT 'special' NOT NULL;`);
      
      // Update existing records to have 'special' as pack_type
      await db.execute(sql`UPDATE special_packs SET pack_type = 'special' WHERE pack_type IS NULL;`);
      
      // Test the query again
      const result = await db.select().from(specialPack);
      
      res.json({ success: true, message: 'PackType column added successfully', result, count: result.length });
    } catch (error: any) {
      console.error('Fix pack type error:', error);
      res.status(500).json({ success: false, error: error.message, stack: error.stack });
    }
  });

  app.get('/api/test-remove-card', async (req: any, res) => {
    try {
      const packId = '348915f7-5185-481b-bcb6-590c8e87d02d';
      const specialPackCardId = 'spc-1758596540504-agi7i73cb';
      
      await storage.removeCardFromSpecialPack(packId, specialPackCardId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Remove card test error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Admin special packs routes
  app.get('/api/admin/special-packs', isAdminCombined, async (req: any, res) => {
    try {
      const packs = await storage.getSpecialPacks();
      res.json(packs);
    } catch (error: any) {
      console.error('Error fetching special packs:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      res.status(500).json({ error: 'Failed to fetch special packs' });
    }
  });

  // Classic Packs Routes
  app.get('/api/admin/classic-packs', isAdminCombined, async (req: any, res) => {
    try {
      const packs = await storage.getClassicPacks();
      res.json(packs);
    } catch (error: any) {
      console.error('Error fetching classic packs:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      res.status(500).json({ error: 'Failed to fetch classic packs' });
    }
  });

  app.post('/api/admin/special-packs', isAdminCombined, async (req: any, res) => {
    try {
      const { name, description, image, price, totalCards } = req.body;
      
      
      if (!name || !description || !image || !price || !totalCards) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const packData = {
        id: `sp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        description,
        imageUrl: image,
        price: price.toString(),
        totalCards: parseInt(totalCards),
        isActive: true
      };

      const pack = await storage.createSpecialPack(packData);
      res.json(pack);
    } catch (error: any) {
      console.error('Error creating special pack:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      res.status(500).json({ error: 'Failed to create special pack' });
    }
  });

  app.put('/api/admin/special-packs/:id', isAdminCombined, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, description, image, price, totalCards } = req.body;
      
      const pack = await storage.updateSpecialPack(id, {
        name,
        description,
        imageUrl: image,
        price: price ? price.toString() : undefined,
        totalCards: totalCards ? parseInt(totalCards) : undefined
      });

      res.json(pack);
    } catch (error: any) {
      console.error('Error updating special pack:', error);
      res.status(500).json({ error: 'Failed to update special pack' });
    }
  });

  app.delete('/api/admin/special-packs/:id', isAdminCombined, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSpecialPack(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting special pack:', error);
      res.status(500).json({ error: 'Failed to delete special pack' });
    }
  });

  // Get individual special pack with cards
  app.get('/api/admin/special-packs/:id', isAdminCombined, async (req: any, res) => {
    try {
      const { id } = req.params;
      const pack = await storage.getSpecialPackById(id);
      res.json(pack);
    } catch (error: any) {
      console.error('Error fetching special pack:', error);
      res.status(500).json({ error: 'Failed to fetch special pack' });
    }
  });

  // Special pack cards routes
  app.post('/api/admin/special-packs/:packId/cards', isAdminCombined, async (req: any, res) => {
    try {
      const { packId } = req.params;
      const { cardId, quantity = 1, cardName, cardImageUrl, cardTier, refundCredit } = req.body;
      
      
      // Support both old system (cardId) and new simplified system (cardName, etc.)
      if (cardId) {
        // Old system - add card by cardId
        const packCard = await storage.addCardToSpecialPack(packId, cardId, quantity);
        res.json(packCard);
      } else if (cardName && cardImageUrl && cardTier && refundCredit !== undefined) {
        // New simplified system - add card with full details
        const packCard = await storage.addCardToSpecialPackSimplified(packId, {
          cardName,
          cardImageUrl,
          cardTier,
          refundCredit,
          quantity
        });
        res.json(packCard);
      } else {
        return res.status(400).json({ error: 'Missing required fields. Provide either cardId or cardName, cardImageUrl, cardTier, refundCredit' });
      }
    } catch (error: any) {
      console.error('Error adding card to special pack:', error);
      console.error('Error details:', error.message, error.stack);
      res.status(500).json({ error: 'Failed to add card to special pack' });
    }
  });

  app.delete('/api/admin/special-packs/:packId/cards/:specialPackCardId', isAdminCombined, async (req: any, res) => {
    try {
      const { packId, specialPackCardId } = req.params;
      await storage.removeCardFromSpecialPack(packId, specialPackCardId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error removing card from special pack:', error);
      console.error('Error details:', error.message, error.stack);
      res.status(500).json({ error: 'Failed to remove card from special pack' });
    }
  });

  app.patch('/api/admin/special-packs/:packId/cards/:specialPackCardId', isAdminCombined, async (req: any, res) => {
    try {
      const { packId, specialPackCardId } = req.params;
      const { quantity } = req.body;
      
      if (quantity === undefined) {
        return res.status(400).json({ error: 'Missing quantity' });
      }

      const packCard = await storage.updateSpecialPackCardQuantity(packId, specialPackCardId, quantity);
      res.json(packCard);
    } catch (error: any) {
      console.error('Error updating special pack card quantity:', error);
      res.status(500).json({ error: 'Failed to update special pack card quantity' });
    }
  });

  // Classic Pack CRUD Routes
  app.post('/api/admin/classic-packs', isAdminCombined, async (req: any, res) => {
    try {
      const { name, description, image, price } = req.body;
      
      
      if (!name || !description || !image || !price) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const packData = {
        id: `cp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        description,
        imageUrl: image,
        price: price.toString(),
        totalPacks: 0, // Default to 0 since total cards is not needed
        isActive: true
      };

      const newPack = await storage.createClassicPack(packData);
      res.json(newPack);
    } catch (error: any) {
      console.error('Error creating classic pack:', error);
      console.error('Error details:', error.message, error.stack);
      res.status(500).json({ error: 'Failed to create classic pack' });
    }
  });

  app.put('/api/admin/classic-packs/:id', isAdminCombined, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, description, image, price } = req.body;
      
      if (!name || !description || !image || !price) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const packData = {
        name,
        description,
        imageUrl: image,
        price: price.toString(),
        totalPacks: 0, // Default to 0 since total cards is not needed
        isActive: true
      };

      const updatedPack = await storage.updateClassicPack(id, packData);
      res.json(updatedPack);
    } catch (error: any) {
      console.error('Error updating classic pack:', error);
      res.status(500).json({ error: 'Failed to update classic pack' });
    }
  });

  app.delete('/api/admin/classic-packs/:id', isAdminCombined, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteClassicPack(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting classic pack:', error);
      res.status(500).json({ error: 'Failed to delete classic pack' });
    }
  });

  // Classic Pack Card Management Routes
  app.get('/api/admin/classic-packs/:id', isAdminCombined, async (req: any, res) => {
    try {
      const { id } = req.params;
      const pack = await storage.getClassicPackById(id);
      res.json(pack);
    } catch (error: any) {
      console.error('Error fetching classic pack:', error);
      res.status(500).json({ error: 'Failed to fetch classic pack' });
    }
  });

  // Classic pack cards routes
  app.post('/api/admin/classic-packs/:packId/cards', isAdminCombined, async (req: any, res) => {
    try {
      const { packId } = req.params;
      const { cardId, quantity = 1, cardName, cardImageUrl, cardTier, refundCredit } = req.body;
      
      
      // Support both old system (cardId) and new simplified system (cardName, etc.)
      if (cardId) {
        // Old system - add card by cardId
        const packCard = await storage.addCardToClassicPack(packId, cardId, quantity);
        res.json(packCard);
      } else if (cardName && cardImageUrl && cardTier && refundCredit !== undefined) {
        // New simplified system - add card with full details
        const packCard = await storage.addCardToClassicPackSimplified(packId, {
          cardName,
          cardImageUrl,
          cardTier,
          refundCredit,
          quantity
        });
        res.json(packCard);
      } else {
        return res.status(400).json({ error: 'Missing required fields. Provide either cardId or cardName, cardImageUrl, cardTier, refundCredit' });
      }
    } catch (error: any) {
      console.error('Error adding card to classic pack:', error);
      console.error('Error details:', error.message, error.stack);
      res.status(500).json({ error: 'Failed to add card to classic pack' });
    }
  });

  app.delete('/api/admin/classic-packs/:packId/cards/:classicPackCardId', isAdminCombined, async (req: any, res) => {
    try {
      const { packId, classicPackCardId } = req.params;
      await storage.removeCardFromClassicPack(packId, classicPackCardId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error removing card from classic pack:', error);
      res.status(500).json({ error: 'Failed to remove card from classic pack' });
    }
  });

  app.patch('/api/admin/classic-packs/:packId/cards/:classicPackCardId', isAdminCombined, async (req: any, res) => {
    try {
      const { packId, classicPackCardId } = req.params;
      const { quantity, cardName, cardImageUrl, cardTier, refundCredit } = req.body;
      
      
      if (quantity !== undefined) {
        const updatedCard = await storage.updateClassicPackCardQuantity(packId, classicPackCardId, quantity);
        res.json(updatedCard);
      } else {
        return res.status(400).json({ error: 'Only quantity updates are supported for classic pack cards' });
      }
    } catch (error: any) {
      console.error('Error updating classic pack card:', error);
      res.status(500).json({ error: 'Failed to update classic pack card' });
    }
  });



  // Classic Pack Purchase Route (Public) - REMOVED FOR REBUILD

  // Admin mystery packs routes
  app.get('/api/admin/mystery-packs', isAdminCombined, async (req: any, res) => {
    try {
      const packs = await storage.getMysteryPacks();
      res.json(packs);
    } catch (error: any) {
      console.error('Error fetching mystery packs:', error);
      res.status(500).json({ error: 'Failed to fetch mystery packs' });
    }
  });

  app.post('/api/admin/mystery-packs', isAdminCombined, async (req: any, res) => {
    try {
      const { name, description, image, price, totalCards } = req.body;
      
      
      const packData = {
        id: `mp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        description,
        imageUrl: image,
        price: price ? price.toString() : undefined,
        totalPacks: totalCards ? parseInt(totalCards) : undefined,
        isActive: true
      };
      
      
      const pack = await storage.createMysteryPack(packData);
      res.json(pack);
    } catch (error: any) {
      console.error('Error creating mystery pack:', error);
      res.status(500).json({ error: 'Failed to create mystery pack' });
    }
  });

  app.put('/api/admin/mystery-packs/:id', isAdminCombined, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, description, image, price, totalCards } = req.body;
      
      const pack = await storage.updateMysteryPack(id, {
        name,
        description,
        imageUrl: image,
        price: price ? price.toString() : undefined
      });

      res.json(pack);
    } catch (error: any) {
      console.error('Error updating mystery pack:', error);
      res.status(500).json({ error: 'Failed to update mystery pack' });
    }
  });

  app.delete('/api/admin/mystery-packs/:id', isAdminCombined, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteMysteryPack(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting mystery pack:', error);
      res.status(500).json({ error: 'Failed to delete mystery pack' });
    }
  });

  // Get individual mystery pack with cards
  app.get('/api/admin/mystery-packs/:id', isAdminCombined, async (req: any, res) => {
    try {
      const { id } = req.params;
      const pack = await storage.getMysteryPackById(id);
      res.json(pack);
    } catch (error: any) {
      console.error('Error fetching mystery pack:', error);
      res.status(500).json({ error: 'Failed to fetch mystery pack' });
    }
  });

  // Mystery pack cards routes
  app.post('/api/admin/mystery-packs/:packId/cards', isAdminCombined, async (req: any, res) => {
    try {
      const { packId } = req.params;
      const { cardId, quantity = 1, cardName, cardImageUrl, cardTier, refundCredit } = req.body;
      
      
      // Support both old system (cardId) and new simplified system (cardName, etc.)
      if (cardId) {
        // Old system - add card by cardId
        const packCard = await storage.addCardToMysteryPack(packId, cardId, quantity);
        res.json(packCard);
      } else if (cardName && cardImageUrl && cardTier && refundCredit !== undefined) {
        // New simplified system - add card with full details
        const packCard = await storage.addCardToMysteryPackSimplified(packId, {
          cardName,
          cardImageUrl,
          cardTier,
          refundCredit,
          quantity
        });
        res.json(packCard);
      } else {
        return res.status(400).json({ error: 'Missing required fields. Provide either cardId or cardName, cardImageUrl, cardTier, refundCredit' });
      }
    } catch (error: any) {
      console.error('Error adding card to mystery pack:', error);
      console.error('Error details:', error.message, error.stack);
      res.status(500).json({ error: 'Failed to add card to mystery pack' });
    }
  });

  app.delete('/api/admin/mystery-packs/:packId/cards/:cardId', isAdminCombined, async (req: any, res) => {
    try {
      const { packId, cardId } = req.params;
      await storage.removeCardFromMysteryPack(packId, cardId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error removing card from mystery pack:', error);
      res.status(500).json({ error: 'Failed to remove card from mystery pack' });
    }
  });

  app.patch('/api/admin/mystery-packs/:packId/cards/:mysteryPackCardId', isAdminCombined, async (req: any, res) => {
    try {
      const { packId, mysteryPackCardId } = req.params;
      const { quantity } = req.body;
      
      if (quantity === undefined) {
        return res.status(400).json({ error: 'Missing quantity' });
      }

      const packCard = await storage.updateMysteryPackCardQuantity(packId, mysteryPackCardId, quantity);
      res.json(packCard);
    } catch (error: any) {
      console.error('Error updating mystery pack card quantity:', error);
      res.status(500).json({ error: 'Failed to update mystery pack card quantity' });
    }
  });

  // User management routes
  app.post('/api/admin/users/:id/ban', isAdminCombined, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.banUser(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error banning user:", error);
      res.status(500).json({ message: "Failed to ban user" });
    }
  });

  app.patch('/api/admin/users/:id/credits', isAdminCombined, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { credits } = req.body;

      // Validate credits amount
      if (typeof credits !== 'number' || credits < 0) {
        return res.status(400).json({ message: "Invalid credits amount" });
      }

      await storage.setUserCredits(id, credits);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user credits:", error);
      res.status(500).json({ message: "Failed to update user credits" });
    }
  });

  app.get('/api/admin/users/:id/transactions', isAdminCombined, async (req: any, res) => {
    try {
      const { id } = req.params;
      const transactions = await storage.getUserTransactions(id);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching user transactions:", error);
      res.status(500).json({ message: "Failed to fetch user transactions" });
    }
  });


  // Admin system settings routes
  app.get('/api/admin/system-settings', isAdminCombined, async (req: any, res) => {
    try {
      const settings = await storage.getAllSystemSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching system settings:", error);
      res.status(500).json({ message: "Failed to fetch system settings" });
    }
  });

  app.post('/api/admin/system-settings/:settingKey', isAdminCombined, async (req: any, res) => {
    try {
      const { settingKey } = req.params;
      const { settingValue } = req.body;
      const userId = req.user.id;
      
      if (typeof settingValue !== 'boolean') {
        return res.status(400).json({ message: "settingValue must be a boolean" });
      }
      
      const setting = await storage.updateSystemSetting(settingKey, settingValue, userId);
      res.json(setting);
    } catch (error) {
      console.error("Error updating system setting:", error);
      res.status(500).json({ message: "Failed to update system setting" });
    }
  });

  app.put('/api/admin/system-settings/:settingKey', isAdminCombined, async (req: any, res) => {
    try {
      const { settingKey } = req.params;
      const { value } = req.body;
      const userId = req.user.id;
      
      const setting = await storage.updateSystemSetting(settingKey, value, userId);
      res.json(setting);
    } catch (error) {
      console.error("Error updating system setting:", error);
      res.status(500).json({ message: "Failed to update system setting" });
    }
  });

  // ============================================================================
  // SHIPPING ROUTES
  // ============================================================================

  // Get user addresses
  app.get('/api/shipping/addresses', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const addresses = await storage.getUserAddresses(userId);
      res.json(addresses);
    } catch (error) {
      console.error("Error fetching user addresses:", error);
      res.status(500).json({ message: "Failed to fetch addresses" });
    }
  });

  // Create user address
  app.post('/api/shipping/addresses', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const addressData = { ...req.body, userId };
      const address = await storage.createUserAddress(addressData);
      res.json(address);
    } catch (error) {
      console.error("Error creating address:", error);
      res.status(500).json({ message: "Failed to create address" });
    }
  });

  // Update user address
  app.put('/api/shipping/addresses/:addressId', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const { addressId } = req.params;
      const addressData = req.body;
      const address = await storage.updateUserAddress(addressId, addressData);
      res.json(address);
    } catch (error) {
      console.error("Error updating address:", error);
      res.status(500).json({ message: "Failed to update address" });
    }
  });

  // Delete user address
  app.delete('/api/shipping/addresses/:addressId', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const { addressId } = req.params;
      await storage.deleteUserAddress(addressId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting address:", error);
      res.status(500).json({ message: "Failed to delete address" });
    }
  });

  // Set default address
  app.put('/api/shipping/addresses/:addressId/default', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const { addressId } = req.params;
      const userId = req.user.id;
      await storage.setDefaultAddress(userId, addressId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting default address:", error);
      res.status(500).json({ message: "Failed to set default address" });
    }
  });

  // Create shipping request
  app.post('/api/shipping/requests', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const requestData = { ...req.body, userId };
      const request = await storage.createShippingRequest(requestData);
      res.json(request);
    } catch (error) {
      console.error("Error creating shipping request:", error);
      res.status(500).json({ message: "Failed to create shipping request" });
    }
  });

  // Get user shipping requests
  app.get('/api/shipping/requests', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const requests = await storage.getUserShippingRequests(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching shipping requests:", error);
      res.status(500).json({ message: "Failed to fetch shipping requests" });
    }
  });

  // Admin: Get all shipping requests
  app.get('/api/admin/shipping/requests', isAdminCombined, async (req: any, res) => {
    try {
      const requests = await storage.getAllShippingRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error fetching all shipping requests:", error);
      res.status(500).json({ message: "Failed to fetch shipping requests" });
    }
  });

  // Admin: Update shipping request (tracking number, status)
  app.put('/api/admin/shipping/requests/:requestId', isAdminCombined, async (req: any, res) => {
    try {
      const { requestId } = req.params;
      const updateData = req.body;
      const request = await storage.updateShippingRequest(requestId, updateData);
      res.json(request);
    } catch (error) {
      console.error("Error updating shipping request:", error);
      res.status(500).json({ message: "Failed to update shipping request" });
    }
  });

  // Cards and packs routes
  app.get('/api/cards', async (req, res) => {
    try {
      const packType = req.query.packType as string;
      // Redirect to inventory since cards table was removed
      const cards = await storage.getInventoryCards();
      res.json(cards);
    } catch (error) {
      console.error("Error fetching cards:", error);
      res.status(500).json({ message: "Failed to fetch cards" });
    }
  });


  app.get('/api/packs/:id/odds', async (req, res) => {
    try {
      const { id } = req.params;
      const odds = await storage.getPackOdds(id);
      res.json(odds);
    } catch (error) {
      console.error("Error fetching pack odds:", error);
      res.status(500).json({ message: "Failed to fetch pack odds" });
    }
  });

  // Notifications routes
  app.get('/api/notifications', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch('/api/notifications/:id/read', isAuthenticatedCombined, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.markNotificationRead(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification read:", error);
      res.status(500).json({ message: "Failed to mark notification read" });
    }
  });

  // Pack routes
  app.get('/api/packs', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userPacks = await storage.getUserPacks(userId);
      res.json(userPacks);
    } catch (error) {
      console.error("Error fetching packs:", error);
      res.status(500).json({ message: "Failed to fetch packs" });
    }
  });

  // Available packs for purchase (public endpoint)
  app.get('/api/available-packs', async (req: any, res) => {
    try {
      const specialPacks = await storage.getSpecialPacks();
      const mysteryPacks = await storage.getMysteryPacks();
      const classicPacks = await storage.getClassicPacks();
      
      // Filter only active packs
      const activeSpecialPacks = specialPacks.filter(pack => pack.isActive);
      const activeMysteryPacks = mysteryPacks.filter(pack => pack.isActive);
      const activeClassicPacks = classicPacks.filter(pack => pack.isActive);
      
      res.json({
        specialPacks: activeSpecialPacks,
        mysteryPacks: activeMysteryPacks,
        classicPacks: activeClassicPacks
      });
    } catch (error) {
      console.error("Error fetching available packs:", error);
      res.status(500).json({ message: "Failed to fetch available packs" });
    }
  });


  app.post('/api/packs/open/:packId', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { packId } = req.params;

      const packResult = await storage.openUserPack(packId, userId);
      
      // Add to global feed for A+ tier hit cards only
      const hitCard = packResult.packCards.find(card => card.isHit);
      
      if (hitCard && hitCard.tier && ['A', 'S', 'SS', 'SSS'].includes(hitCard.tier)) {
        try {
          // Get user info for the feed
          const user = await storage.getUser(userId);
          await storage.addGlobalFeedEntry({
            userId,
            username: user?.username || 'Unknown',
            packId: packId,
            packType: packResult.packType,
            cardName: hitCard.name,
            cardTier: hitCard.tier,
            imageUrl: hitCard.imageUrl
          });
          console.log("✅ Added A+ tier hit card to global feed:", hitCard.name, hitCard.tier);
        } catch (error) {
          console.error('❌ Failed to add to global feed:', error);
        }
      } else {
        console.log("ℹ️ No A+ tier hit card found, skipping global feed");
      }
      
      res.json({ 
        ...packResult,
        success: true
      });

    } catch (error: any) {
      console.error("Error opening pack:", error);
      res.status(500).json({ message: error.message || "Failed to open pack" });
    }
  });

  // Black Bolt pack purchase and opening endpoint
  app.post('/api/classic-packs/purchase/:packId', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { packId } = req.params;
      
      
      // Get the pack (could be classic or special)
      let pack = await storage.getClassicPackById(packId);
      let packType = 'classic';
      
      if (!pack) {
        // Try to get it as a special pack
        pack = await storage.getSpecialPackById(packId);
        packType = 'special';
      }
      
      if (!pack) {
        return res.status(404).json({ message: 'Pack not found' });
      }
      
      
      // Check if pack is active
      if (!pack.isActive) {
        return res.status(400).json({ message: 'Pack is not available' });
      }
      
      // Get user data
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      
      // Check credits
      const packPrice = parseFloat(pack.price);
      const userCredits = parseFloat(user.credits || '0');
      
      if (userCredits < packPrice) {
        return res.status(400).json({ message: 'Insufficient credits' });
      }

      // Deduct credits
      const success = await storage.deductUserCredits(userId, packPrice.toString());
      if (!success) {
        return res.status(400).json({ message: 'Failed to deduct credits' });
      }

      // Create user pack
      const userPack = await storage.addUserPack({
        id: `up-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        packId: pack.id,
        packType: packType,
        tier: packType,
        earnedFrom: 'purchase',
        isOpened: false,
      });

      // Open the pack immediately
      const packResult = await storage.openUserPack(userPack.id, userId);

      // Add to global feed for A+ tier hit cards only
      const hitCard = packResult.packCards.find(card => card.isHit);
      
      if (hitCard && hitCard.tier && ['A', 'S', 'SS', 'SSS'].includes(hitCard.tier)) {
        try {
          // Get user info for the feed
          const user = await storage.getUser(userId);
          await storage.addGlobalFeedEntry({
            userId,
            username: user?.username || 'Unknown',
            packId: packId,
            packType: packResult.packType,
            cardName: hitCard.name,
            cardTier: hitCard.tier,
            imageUrl: hitCard.imageUrl
          });
          console.log("✅ Added A+ tier hit card to global feed:", hitCard.name, hitCard.tier);
        } catch (error) {
          console.error('❌ Failed to add to global feed:', error);
        }
      } else {
        console.log("ℹ️ No A+ tier hit card found, skipping global feed");
      }

      const response = { 
        ...packResult,
        success: true
      };
      res.json(response);

    } catch (error: any) {
      console.error("Error purchasing classic pack:", error);
      res.status(500).json({ message: error.message || "Failed to purchase pack" });
    }
  });

  // Profile management endpoints
  app.put('/api/user/profile', isAuthenticatedCombined, asyncHandler(async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const { username, email } = req.body;

      if (!userId) {
        const { statusCode, response } = createErrorResponse('User not authenticated', 'UNAUTHORIZED', null, 401);
        return res.status(statusCode).json(response);
      }

      // Validate input
      if (!username || !email) {
        const { statusCode, response } = createErrorResponse('Username and email are required', 'VALIDATION_ERROR', null, 400);
        return res.status(statusCode).json(response);
      }

      // Check if username or email already exists (excluding current user)
      const existingUser = await db
        .select()
        .from(users)
        .where(
          and(
            sql`${users.id} != ${userId}`,
            sql`(${users.username} = ${username} OR ${users.email} = ${email})`
          )
        )
        .limit(1);

      if (existingUser.length > 0) {
        const { statusCode, response } = createErrorResponse('Username or email already exists', 'CONFLICT', null, 409);
        return res.status(statusCode).json(response);
      }

      // Update user profile
      await db
        .update(users)
        .set({
          username,
          email,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      const response = createSuccessResponse(
        { username, email },
        'Profile updated successfully'
      );
      res.json(response);
    } catch (error) {
      console.error('Error updating profile:', error);
      const { statusCode, response } = createErrorResponse('Failed to update profile', 'INTERNAL_SERVER_ERROR', null, 500);
      res.status(statusCode).json(response);
    }
  }));

  app.put('/api/user/password', isAuthenticatedCombined, asyncHandler(async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        const { statusCode, response } = createErrorResponse('User not authenticated', 'UNAUTHORIZED', null, 401);
        return res.status(statusCode).json(response);
      }

      // Validate input
      if (!currentPassword || !newPassword) {
        const { statusCode, response } = createErrorResponse('Current password and new password are required', 'VALIDATION_ERROR', null, 400);
        return res.status(statusCode).json(response);
      }

      if (newPassword.length < 8) {
        const { statusCode, response } = createErrorResponse('New password must be at least 8 characters long', 'VALIDATION_ERROR', null, 400);
        return res.status(statusCode).json(response);
      }

      // Get user from database
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user.length === 0) {
        const { statusCode, response } = createErrorResponse('User not found', 'NOT_FOUND', null, 404);
        return res.status(statusCode).json(response);
      }

      // Verify current password (you'll need to implement password hashing verification)
      // For now, we'll assume the password verification is handled by your auth system
      // This is a placeholder - you should implement proper password verification
      const isCurrentPasswordValid = true; // Replace with actual password verification

      if (!isCurrentPasswordValid) {
        const { statusCode, response } = createErrorResponse('Current password is incorrect', 'UNAUTHORIZED', null, 401);
        return res.status(statusCode).json(response);
      }

      // Hash new password (you'll need to implement password hashing)
      // For now, we'll just store it as-is (NOT RECOMMENDED FOR PRODUCTION)
      const hashedNewPassword = newPassword; // Replace with actual password hashing

      // Update password
      await db
        .update(users)
        .set({
          password: hashedNewPassword,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      const response = createSuccessResponse(
        null,
        'Password updated successfully'
      );
      res.json(response);
    } catch (error) {
      console.error('Error updating password:', error);
      const { statusCode, response } = createErrorResponse('Failed to update password', 'INTERNAL_SERVER_ERROR', null, 500);
      res.status(statusCode).json(response);
    }
  }));

  app.get('/api/user/profile', isAuthenticatedCombined, asyncHandler(async (req, res) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        const { statusCode, response } = createErrorResponse('User not authenticated', 'UNAUTHORIZED', null, 401);
        return res.status(statusCode).json(response);
      }

      // Get user profile
      const user = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          role: users.role,
          credits: users.credits,
          createdAt: users.createdAt
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user.length === 0) {
        const { statusCode, response } = createErrorResponse('User not found', 'NOT_FOUND', null, 404);
        return res.status(statusCode).json(response);
      }

      const response = createSuccessResponse(user[0], 'Profile retrieved successfully');
      res.json(response);
    } catch (error) {
      console.error('Error getting profile:', error);
      const { statusCode, response } = createErrorResponse('Failed to get profile', 'INTERNAL_SERVER_ERROR', null, 500);
      res.status(statusCode).json(response);
    }
  }));

  // Debug endpoints - only available in development
  if (process.env.NODE_ENV === 'development') {
    // Migration endpoint
    app.post('/api/debug/migrate-database', async (req, res) => {
    try {
      
      // Add pack_source column
      await db.execute(sql`ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS pack_source VARCHAR(50);`);
      
      // Add pack_id column
      await db.execute(sql`ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS pack_id VARCHAR(255);`);
      
      res.json({
        success: true,
        message: 'Database migration completed successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('❌ Migration failed:', error);
      res.status(500).json({ error: 'Migration failed', details: error.message });
    }
  });

  // Check user_cards table schema
  app.get('/api/debug/check-user-cards-schema', async (req, res) => {
    try {
      
      const result = await db.execute(sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'user_cards'
        ORDER BY ordinal_position
      `);
      
      
      res.json({
        success: true,
        columns: result.rows
      });
    } catch (error: any) {
      console.error('❌ Error checking schema:', error);
      res.status(500).json({ error: 'Failed to check schema', details: error.message });
    }
  });

  // Debug mystery packs endpoint
  app.get('/api/debug/mystery-packs', async (req, res) => {
    try {
      
      const result = await db.execute(sql`
        SELECT 
          id,
          name,
          pack_type,
          odds,
          is_active
        FROM mystery_pack
        ORDER BY pack_type
      `);
      
      
      res.json({
        totalCount: result.rows.length,
        packs: result.rows
      });
    } catch (error) {
      console.error('❌ Error in mystery packs debug endpoint:', error);
      res.status(500).json({ error: 'Failed to check mystery_packs table' });
    }
  });

  app.get('/api/debug/special-packs', async (req, res) => {
    try {
      
      const result = await db.execute(sql`
        SELECT 
          id,
          name,
          description,
          image_url,
          price,
          total_cards,
          is_active,
          created_at
        FROM special_pack
        ORDER BY created_at DESC
      `);
      
      
      res.json({
        totalCount: result.rows.length,
        packs: result.rows
      });
    } catch (error: any) {
      console.error('🔍 DEBUG: Error checking special_pack table:', error);
      res.status(500).json({ error: 'Failed to check special_pack table' });
    }
  });

  app.get('/api/debug/classic-packs', async (req, res) => {
    try {
      
      const result = await db.execute(sql`
        SELECT 
          id,
          name,
          description,
          image_url,
          price,
          is_active,
          created_at
        FROM classic_pack
        ORDER BY created_at DESC
      `);
      
      
      res.json({
        totalCount: result.rows.length,
        packs: result.rows
      });
    } catch (error: any) {
      console.error('🔍 DEBUG: Error checking classic_pack table:', error);
      res.status(500).json({ error: 'Failed to check classic_pack table' });
    }
  });

  // Debug endpoint to show current odds and what the new 1-1000 system would do
  app.get('/api/debug/show-pack-odds', async (req, res) => {
    try {
      console.log('🧪 Showing current pack odds and 1-1000 system...');
      
      // Get current Masterball odds
      const masterballResult = await db.execute(sql`
        SELECT odds FROM mystery_pack WHERE id = 'mystery-masterball'
      `);
      
      if (masterballResult.rows.length === 0) {
        return res.status(404).json({ error: 'Masterball pack not found' });
      }
      
      const currentOdds = masterballResult.rows[0].odds as Record<string, number>;
      console.log('📊 Current Masterball odds:', currentOdds);
      
      // Calculate tier ranges for 1-1000 system with current odds
      const currentTierRanges = {
        SSS: { start: 1, end: Math.floor(currentOdds.SSS * 1000) },
        SS: { start: Math.floor(currentOdds.SSS * 1000) + 1, end: Math.floor((currentOdds.SSS + currentOdds.SS) * 1000) },
        S: { start: Math.floor((currentOdds.SSS + currentOdds.SS) * 1000) + 1, end: Math.floor((currentOdds.SSS + currentOdds.SS + currentOdds.S) * 1000) },
        A: { start: Math.floor((currentOdds.SSS + currentOdds.SS + currentOdds.S) * 1000) + 1, end: Math.floor((currentOdds.SSS + currentOdds.SS + currentOdds.S + currentOdds.A) * 1000) },
        B: { start: Math.floor((currentOdds.SSS + currentOdds.SS + currentOdds.S + currentOdds.A) * 1000) + 1, end: Math.floor((currentOdds.SSS + currentOdds.SS + currentOdds.S + currentOdds.A + currentOdds.B) * 1000) },
        C: { start: Math.floor((currentOdds.SSS + currentOdds.SS + currentOdds.S + currentOdds.A + currentOdds.B) * 1000) + 1, end: Math.floor((currentOdds.SSS + currentOdds.SS + currentOdds.S + currentOdds.A + currentOdds.B + currentOdds.C) * 1000) },
        D: { start: Math.floor((currentOdds.SSS + currentOdds.SS + currentOdds.S + currentOdds.A + currentOdds.B + currentOdds.C) * 1000) + 1, end: 1000 }
      };
      
      // Calculate tier ranges for 1-1000 system with NEW odds (from image)
      const newOdds = {
        SSS: 0.05,
        SS: 0.15, 
        S: 0.30,
        A: 0.50,
        B: 0.0,
        C: 0.0,
        D: 0.0
      };
      
      const newTierRanges = {
        SSS: { start: 1, end: Math.floor(newOdds.SSS * 1000) },
        SS: { start: Math.floor(newOdds.SSS * 1000) + 1, end: Math.floor((newOdds.SSS + newOdds.SS) * 1000) },
        S: { start: Math.floor((newOdds.SSS + newOdds.SS) * 1000) + 1, end: Math.floor((newOdds.SSS + newOdds.SS + newOdds.S) * 1000) },
        A: { start: Math.floor((newOdds.SSS + newOdds.SS + newOdds.S) * 1000) + 1, end: Math.floor((newOdds.SSS + newOdds.SS + newOdds.S + newOdds.A) * 1000) },
        B: { start: Math.floor((newOdds.SSS + newOdds.SS + newOdds.S + newOdds.A) * 1000) + 1, end: Math.floor((newOdds.SSS + newOdds.SS + newOdds.S + newOdds.A + newOdds.B) * 1000) },
        C: { start: Math.floor((newOdds.SSS + newOdds.SS + newOdds.S + newOdds.A + newOdds.B) * 1000) + 1, end: Math.floor((newOdds.SSS + newOdds.SS + newOdds.S + newOdds.A + newOdds.B + newOdds.C) * 1000) },
        D: { start: Math.floor((newOdds.SSS + newOdds.SS + newOdds.S + newOdds.A + newOdds.B + newOdds.C) * 1000) + 1, end: 1000 }
      };
      
      console.log('🎯 Current tier ranges (1-1000):', currentTierRanges);
      console.log('🎯 NEW tier ranges (1-1000):', newTierRanges);
      
      res.json({
        success: true,
        message: 'Current vs New pack odds comparison',
        currentOdds,
        newOdds,
        currentTierRanges,
        newTierRanges,
        comparison: {
          current: {
            SSS: `${currentOdds.SSS * 100}% chance (${currentTierRanges.SSS.start}-${currentTierRanges.SSS.end})`,
            SS: `${currentOdds.SS * 100}% chance (${currentTierRanges.SS.start}-${currentTierRanges.SS.end})`,
            S: `${currentOdds.S * 100}% chance (${currentTierRanges.S.start}-${currentTierRanges.S.end})`,
            A: `${currentOdds.A * 100}% chance (${currentTierRanges.A.start}-${currentTierRanges.A.end})`,
            B: `${currentOdds.B * 100}% chance (${currentTierRanges.B.start}-${currentTierRanges.B.end})`,
            C: `${currentOdds.C * 100}% chance (${currentTierRanges.C.start}-${currentTierRanges.C.end})`,
            D: `${currentOdds.D * 100}% chance (${currentTierRanges.D.start}-${currentTierRanges.D.end})`
          },
          new: {
            SSS: `${newOdds.SSS * 100}% chance (${newTierRanges.SSS.start}-${newTierRanges.SSS.end})`,
            SS: `${newOdds.SS * 100}% chance (${newTierRanges.SS.start}-${newTierRanges.SS.end})`,
            S: `${newOdds.S * 100}% chance (${newTierRanges.S.start}-${newTierRanges.S.end})`,
            A: `${newOdds.A * 100}% chance (${newTierRanges.A.start}-${newTierRanges.A.end})`,
            B: `${newOdds.B * 100}% chance (${newTierRanges.B.start}-${newTierRanges.B.end})`,
            C: `${newOdds.C * 100}% chance (${newTierRanges.C.start}-${newTierRanges.C.end})`,
            D: `${newOdds.D * 100}% chance (${newTierRanges.D.start}-${newTierRanges.D.end})`
          }
        }
      });
    } catch (error: any) {
      console.error('❌ Error showing pack odds:', error);
      res.status(500).json({ error: 'Failed to show pack odds', details: error.message });
    }
  });

  // Debug endpoint to check user data
  app.get('/api/debug/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      
      res.json({
        success: true,
        user: user
      });
    } catch (error) {
      console.error('❌ Error checking user:', error);
      res.status(500).json({ error: 'Failed to check user' });
    }
  });

  // Debug endpoint to check classic pack cards with quantity details
  app.get('/api/debug/classic-pack-cards/:packId', async (req, res) => {
    try {
      const { packId } = req.params;
      
      
      const { db } = await import('./db');
      const { classicPrize } = await import('../shared/schema');
      const { eq, and, gt } = await import('drizzle-orm');
      
      // Get all cards (including quantity = 0) - simplified system
      const allCards = await db
        .select({
          id: classicPrize.id,
          packId: classicPrize.packId,
          cardName: classicPrize.cardName,
          cardImageUrl: classicPrize.cardImageUrl,
          cardTier: classicPrize.cardTier,
          refundCredit: classicPrize.refundCredit,
          quantity: classicPrize.quantity,
        })
        .from(classicPrize)
        .where(eq(classicPrize.packId, packId));
      
      // Get only cards with quantity > 0 - simplified system
      const availableCards = await db
        .select({
          id: classicPrize.id,
          packId: classicPrize.packId,
          cardName: classicPrize.cardName,
          cardImageUrl: classicPrize.cardImageUrl,
          cardTier: classicPrize.cardTier,
          refundCredit: classicPrize.refundCredit,
          quantity: classicPrize.quantity,
        })
        .from(classicPrize)
        .where(
          and(
            eq(classicPrize.packId, packId),
            gt(classicPrize.quantity, 0)
          )
        );
      
      
      res.json({
        success: true,
        packId,
        allCards: allCards.length,
        availableCards: availableCards.length,
        allCardsDetails: allCards,
        availableCardsDetails: availableCards
      });
    } catch (error) {
      console.error('❌ Error checking classic pack cards:', error);
      res.status(500).json({ error: 'Failed to check classic pack cards' });
    }
  });

  // Debug endpoint to add pack source tracking columns
  app.post('/api/debug/add-pack-source-tracking', async (req, res) => {
    try {
      
      const { db } = await import('./db');
      const { sql } = await import('drizzle-orm');
      
      // Add pack_source column if it doesn't exist
      await db.execute(sql`
        ALTER TABLE user_cards 
        ADD COLUMN IF NOT EXISTS pack_source VARCHAR(50)
      `);
      
      // Add pack_id column if it doesn't exist
      await db.execute(sql`
        ALTER TABLE user_cards 
        ADD COLUMN IF NOT EXISTS pack_id VARCHAR(255)
      `);
      
      
      res.json({
        success: true,
        message: 'Successfully added pack source tracking columns'
      });
    } catch (error) {
      console.error('❌ Error adding pack source tracking columns:', error);
      res.status(500).json({ error: 'Failed to add pack source tracking columns' });
    }
  });

  // Debug endpoint to fix common card value
  app.post('/api/debug/update-common-card-value', async (req, res) => {
    try {
      
      // Update the common card value in inventory
      await db.execute(sql`
        UPDATE inventory 
        SET credits = 1
        WHERE id = 'f776501e-10fa-4340-b4f7-263540306506'
      `);
      
      
      res.json({
        success: true,
        message: 'Successfully updated common card value to 1 credit'
      });
    } catch (error) {
      console.error('❌ Error updating common card value:', error);
      res.status(500).json({ error: 'Failed to update common card value' });
    }
  });

  // Debug endpoint to add credits to user account
  app.post('/api/debug/add-credits', async (req, res) => {
    try {
      const { userId, amount } = req.body;
      
      if (!userId || !amount) {
        return res.status(400).json({ error: 'Missing required fields: userId, amount' });
      }
      
      
      // Get current user credits
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const currentCredits = parseFloat(user.credits || '0');
      const newCredits = currentCredits + parseFloat(amount);
      
      // Update user credits
      await storage.updateUserCredits(userId, newCredits.toString());
      
      
      res.json({
        success: true,
        message: `Successfully added ${amount} credits to user ${userId}`,
        previousCredits: currentCredits,
        newCredits: newCredits
      });
    } catch (error) {
      console.error('❌ Error adding credits:', error);
      res.status(500).json({ error: 'Failed to add credits' });
    }
  });

  // Debug endpoint to add packs to user account
  app.post('/api/debug/add-packs', async (req, res) => {
    try {
      const { userId, packType, packId, quantity = 1 } = req.body;
      
      if (!userId || !packType || !packId) {
        return res.status(400).json({ error: 'Missing required fields: userId, packType, packId' });
      }
      
      
      // Use the existing storage method to add packs
      for (let i = 0; i < quantity; i++) {
        // Determine the correct tier based on pack ID for mystery packs
        let tier = packType;
        if (packType === 'mystery') {
          if (packId === 'e140f1bd-8277-436c-aa03-14bdc354da46') tier = 'pokeball';
          else if (packId === 'fc1479fc-0254-4cec-a81b-a84509d4f0b6') tier = 'greatball';
          else if (packId === '1a373648-35ba-42a7-a0be-294cec7efb16') tier = 'ultraball';
          else if (packId === '35f87706-28e3-452b-ab85-1cca72dfc32a') tier = 'masterball';
          else tier = 'pokeball'; // fallback
        }
        
        await storage.addUserPack({
          id: `up-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId,
          packId,
          packType,
          tier,
          earnedFrom: 'debug',
          isOpened: false
        });
      }
      
      
      res.json({
        success: true,
        message: `Successfully added ${quantity} ${packType} packs to user ${userId}`,
        packsAdded: quantity
      });
    } catch (error) {
      console.error('❌ Error adding packs:', error);
      res.status(500).json({ error: 'Failed to add packs' });
    }
  });

  // Debug endpoint to clear user packs
  app.post('/api/debug/clear-user-packs/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      
      await db.execute(sql`DELETE FROM user_packs WHERE user_id = ${userId}`);
      
      
      res.json({
        success: true,
        message: `Successfully cleared all packs for user ${userId}`
      });
    } catch (error) {
      console.error('❌ Error clearing user packs:', error);
      res.status(500).json({ error: 'Failed to clear user packs' });
    }
  });

  // Debug endpoint to check user packs
  app.get('/api/debug/user-packs/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      
      const packs = await storage.getUserPacks(userId);
      
      
      res.json({
        success: true,
        userId,
        packCount: packs.length,
        packs: packs
      });
    } catch (error) {
      console.error('❌ Error checking user packs:', error);
      res.status(500).json({ error: 'Failed to check user packs' });
    }
  });

  // Update mystery pack odds endpoint
  app.post('/api/debug/update-pokeball-odds', async (req, res) => {
    try {
      
      // Update Pokeball Mystery Pack odds to be more realistic for a common pack
      await db.execute(sql`
        UPDATE mystery_packs 
        SET odds = '{
          "SSS": 0.005,
          "SS": 0.015, 
          "S": 0.03,
          "A": 0.05,
          "B": 0.10,
          "C": 0.20,
          "D": 0.60
        }'::jsonb
        WHERE id = 'e140f1bd-8277-436c-aa03-14bdc354da46'
      `);
      
      
      res.json({
        success: true,
        message: 'Successfully updated Pokeball pack odds to be more realistic'
      });
    } catch (error) {
      console.error('❌ Error updating Pokeball pack odds:', error);
      res.status(500).json({ error: 'Failed to update Pokeball pack odds' });
    }
  });

  // Fix mystery pack cards endpoint
  app.post('/api/debug/fix-mystery-pack-cards', async (req, res) => {
    try {
      
      // Move all cards to the base mystery pack
      const result = await db.execute(sql`
        UPDATE mystery_pack_cards 
        SET pack_id = '00000000-0000-0000-0000-000000000001'
        WHERE pack_id != '00000000-0000-0000-0000-000000000001'
      `);
      
      
      // Show the result
      const cardsResult = await db.execute(sql`
        SELECT 
          mpc.id,
          mpc.pack_id,
          mp.name as pack_name,
          mp.pack_type,
          i.name as card_name,
          i.tier,
          mpc.quantity
        FROM mystery_pack_cards mpc
        LEFT JOIN mystery_packs mp ON mpc.pack_id = mp.id
        LEFT JOIN inventory i ON mpc.card_id = i.id
        ORDER BY mp.pack_type, i.tier
      `);
      
      
      res.json({
        success: true,
        updatedRows: result.rowCount,
        cards: cardsResult.rows
      });
    } catch (error) {
      console.error('❌ Error fixing mystery pack cards:', error);
      res.status(500).json({ error: 'Failed to fix mystery pack cards' });
    }
  });

  // Debug user cards endpoint
  app.get('/api/debug/user-cards/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      const result = await db.execute(sql`
        SELECT 
          id,
          user_id,
          card_id,
          pull_value,
          quantity,
          pulled_at,
          is_refunded,
          is_shipped
        FROM user_cards 
        WHERE user_id = ${userId}
        ORDER BY pulled_at DESC
      `);
      
      
      // Group by status
      const active = result.rows.filter((row: any) => !row.is_refunded && !row.is_shipped);
      const refunded = result.rows.filter((row: any) => row.is_refunded);
      const shipped = result.rows.filter((row: any) => row.is_shipped);
      
      res.json({
        totalCount: result.rows.length,
        active: active.length,
        refunded: refunded.length,
        shipped: shipped.length,
        entries: result.rows,
        summary: {
          active,
          refunded,
          shipped
        }
      });
    } catch (error) {
      console.error('❌ Error in user cards debug endpoint:', error);
      res.status(500).json({ error: 'Failed to check user_cards table' });
    }
  });

  // Mystery pack cards debug endpoint
  app.get('/api/debug/mystery-pack-cards', async (req, res) => {
    try {
      
      const result = await db.execute(sql`
        SELECT 
          mpc.id,
          mpc.pack_id,
          mpc.card_id,
          mpc.quantity,
          mpc.created_at,
          mp.name as pack_name,
          i.name as card_name,
          i.tier
        FROM mystery_pack_cards mpc
        LEFT JOIN mystery_packs mp ON mpc.pack_id = mp.id
        LEFT JOIN inventory i ON mpc.card_id = i.id
        ORDER BY mpc.created_at DESC
      `);
      
      
      // Group by pack
      const packGroups: { [key: string]: any[] } = {};
      result.rows.forEach((row: any) => {
        if (!packGroups[row.pack_name]) {
          packGroups[row.pack_name] = [];
        }
        packGroups[row.pack_name].push(row);
      });
      
      res.json({
        totalCount: result.rows.length,
        entries: result.rows,
        groupedByPack: packGroups
      });
    } catch (error) {
      console.error('❌ Error in mystery pack cards debug endpoint:', error);
      res.status(500).json({ error: 'Failed to check mystery_pack_cards table' });
    }
  });

  // Debug endpoint to check Black Bolt pack cards
  app.get('/api/debug/black-bolt-cards', async (req, res) => {
    try {
      
      const result = await db.execute(sql`
        SELECT 
          cpc.id,
          cpc.pack_id,
          cpc.card_id,
          cpc.quantity,
          i.name as card_name,
          i.tier,
          i.credits
        FROM classic_pack_cards cpc
        LEFT JOIN inventory i ON cpc.card_id = i.id
        WHERE cpc.pack_id = 'c7b5a8b3-4dc4-4faf-afc0-3c235cb0f0c1'
        ORDER BY i.tier, i.name
      `);
      
      
      res.json({
        success: true,
        packId: 'c7b5a8b3-4dc4-4faf-afc0-3c235cb0f0c1',
        cards: result.rows
      });
    } catch (error) {
      console.error('❌ Error checking Black Bolt pack cards:', error);
      res.status(500).json({ error: 'Failed to check Black Bolt pack cards' });
    }
  });
  } // End of debug endpoints (development only)

  // Admin endpoint to force refresh user data (useful when credits are updated directly in database)
  app.post('/api/admin/refresh-user/:userId', isAdminCombined, async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      // Force fetch fresh user data from database
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ 
        success: true, 
        message: 'User data refreshed',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          credits: user.credits
        }
      });
    } catch (error: any) {
      console.error('Error refreshing user data:', error);
      res.status(500).json({ error: 'Failed to refresh user data' });
    }
  });

  // Admin endpoint to invalidate all user caches
  app.post('/api/admin/invalidate-user-caches', isAdminCombined, async (req: any, res) => {
    try {
      // Clear all user-related caches
      // Note: Since we disabled user caching, this is mainly for future use
      res.json({ 
        success: true, 
        message: 'User caches invalidated (user data is now always fresh)' 
      });
    } catch (error: any) {
      console.error('Error invalidating user caches:', error);
      res.status(500).json({ error: 'Failed to invalidate user caches' });
    }
  });

  // Test endpoint to update user credits directly in database
  app.post('/api/test-update-credits', async (req, res) => {
    try {
      const { userId, credits } = req.body;
      await db.execute(sql`UPDATE users SET credits = ${credits.toString()} WHERE id = ${userId}`);
      res.json({ 
        success: true, 
        message: `Updated user ${userId} credits to ${credits}` 
      });
    } catch (error: any) {
      console.error('Test update credits error:', error);
      res.json({ success: false, error: error.message });
    }
  });

  // Test endpoint to test credit deduction directly
  app.post('/api/test-deduct-credits', async (req, res) => {
    try {
      const { userId, amount } = req.body;
      
      // Test direct database query
      const result = await db.execute(sql`
        UPDATE users 
        SET credits = credits - ${amount} 
        WHERE id = ${userId} AND credits >= ${amount}
        RETURNING id, credits
      `);
      
      if (result.rows.length > 0) {
        res.json({ 
          success: true, 
          message: `Deducted ${amount} credits from user ${userId}`,
          newCredits: result.rows[0].credits
        });
      } else {
        res.json({ 
          success: false, 
          message: `Failed to deduct credits - insufficient balance or user not found` 
        });
      }
    } catch (error: any) {
      console.error('Test deduct credits error:', error);
      res.json({ success: false, error: error.message });
    }
  });

  // Test endpoint to test storage.deductUserCredits function
  app.post('/api/test-storage-deduct', async (req, res) => {
    try {
      const { userId, amount } = req.body;
      
      const success = await storage.deductUserCredits(userId, amount);
      
      if (success) {
        res.json({ 
          success: true, 
          message: `Storage deducted ${amount} credits from user ${userId}` 
        });
      } else {
        res.json({ 
          success: false, 
          message: `Storage failed to deduct credits - insufficient balance or user not found` 
        });
      }
    } catch (error: any) {
      console.error('Test storage deduct error:', error);
      res.json({ success: false, error: error.message });
    }
  });

  // ============================================================================
  // RAFFLE ENDPOINTS
  // ============================================================================

  // Get all active raffles
  app.get('/api/raffles', async (req, res) => {
    try {
      const activeRaffles = await db
        .select({
          id: raffles.id,
          title: raffles.title,
          description: raffles.description,
          imageUrl: raffles.imageUrl,
          totalSlots: raffles.totalSlots,
          pricePerSlot: raffles.pricePerSlot,
          filledSlots: raffles.filledSlots,
          maxWinners: raffles.maxWinners,
          status: raffles.status,
          isActive: raffles.isActive,
          autoDraw: raffles.autoDraw,
          drawnAt: raffles.drawnAt,
          createdAt: raffles.createdAt,
          creator: {
            username: users.username
          }
        })
        .from(raffles)
        .leftJoin(users, eq(raffles.createdBy, users.id))
        .where(eq(raffles.isActive, true))
        .orderBy(sql`${raffles.createdAt} DESC`);

      // Get prizes and winners for each raffle
      const rafflesWithPrizesAndWinners = await Promise.all(
        activeRaffles.map(async (raffle) => {
          const prizes = await db
            .select()
            .from(rafflePrizes)
            .where(eq(rafflePrizes.raffleId, raffle.id))
            .orderBy(rafflePrizes.position);

          const winners = await db
            .select({
              id: raffleWinners.id,
              userId: raffleWinners.userId,
              prizePosition: raffleWinners.prizePosition,
              wonAt: raffleWinners.wonAt,
              prizeName: rafflePrizes.name,
              prizeImageUrl: rafflePrizes.imageUrl,
              winnerUsername: users.username
            })
            .from(raffleWinners)
            .leftJoin(rafflePrizes, eq(raffleWinners.prizeId, rafflePrizes.id))
            .leftJoin(users, eq(raffleWinners.userId, users.id))
            .where(eq(raffleWinners.raffleId, raffle.id))
            .orderBy(raffleWinners.prizePosition);

          return {
            ...raffle,
            prizes,
            winners
          };
        })
      );

      res.json({ success: true, raffles: rafflesWithPrizesAndWinners });
    } catch (error) {
      console.error('Error fetching raffles:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch raffles' });
    }
  });

  // Get completed raffles for transparency
  app.get('/api/raffles/completed', async (req, res) => {
    try {
      const completedRaffles = await db
        .select({
          id: raffles.id,
          title: raffles.title,
          description: raffles.description,
          imageUrl: raffles.imageUrl,
          totalSlots: raffles.totalSlots,
          pricePerSlot: raffles.pricePerSlot,
          filledSlots: raffles.filledSlots,
          maxWinners: raffles.maxWinners,
          status: raffles.status,
          isActive: raffles.isActive,
          autoDraw: raffles.autoDraw,
          drawnAt: raffles.drawnAt,
          createdAt: raffles.createdAt,
          creator: {
            username: users.username
          }
        })
        .from(raffles)
        .leftJoin(users, eq(raffles.createdBy, users.id))
        .where(and(eq(raffles.status, 'completed'), eq(raffles.isActive, true)))
        .orderBy(sql`${raffles.drawnAt} DESC`);

      // Get prizes and winners for each raffle
      const rafflesWithPrizesAndWinners = await Promise.all(
        completedRaffles.map(async (raffle) => {
          const prizes = await db
            .select()
            .from(rafflePrizes)
            .where(eq(rafflePrizes.raffleId, raffle.id))
            .orderBy(rafflePrizes.position);

          const winners = await db
            .select({
              id: raffleWinners.id,
              userId: raffleWinners.userId,
              prizePosition: raffleWinners.prizePosition,
              wonAt: raffleWinners.wonAt,
              prizeName: rafflePrizes.name,
              prizeImageUrl: rafflePrizes.imageUrl,
              winnerUsername: users.username
            })
            .from(raffleWinners)
            .leftJoin(rafflePrizes, eq(raffleWinners.prizeId, rafflePrizes.id))
            .leftJoin(users, eq(raffleWinners.userId, users.id))
            .where(eq(raffleWinners.raffleId, raffle.id))
            .orderBy(raffleWinners.prizePosition);

          return {
            ...raffle,
            prizes,
            winners
          };
        })
      );

      res.json({ success: true, raffles: rafflesWithPrizesAndWinners });
    } catch (error) {
      console.error('Error fetching completed raffles:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch completed raffles' });
    }
  });

  // Get user's raffle history
  app.get('/api/raffles/my-history', isAuthenticatedCombined, async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      // Get user's entries
      const userEntries = await db
        .select({
          id: raffleEntries.id,
          raffleId: raffleEntries.raffleId,
          slots: raffleEntries.slots,
          totalCost: raffleEntries.totalCost,
          createdAt: raffleEntries.entryDate,
          raffle: {
            title: raffles.title,
            imageUrl: raffles.imageUrl,
            status: raffles.status,
            drawnAt: raffles.drawnAt
          }
        })
        .from(raffleEntries)
        .leftJoin(raffles, eq(raffleEntries.raffleId, raffles.id))
        .where(eq(raffleEntries.userId, userId))
        .orderBy(sql`${raffleEntries.entryDate} DESC`);

      // Get user's wins
      const userWins = await db
        .select({
          id: raffleWinners.id,
          raffleId: raffleWinners.raffleId,
          prizePosition: raffleWinners.prizePosition,
          wonAt: raffleWinners.wonAt,
          raffle: {
            title: raffles.title,
            imageUrl: raffles.imageUrl,
            status: raffles.status,
            drawnAt: raffles.drawnAt
          }
        })
        .from(raffleWinners)
        .leftJoin(raffles, eq(raffleWinners.raffleId, raffles.id))
        .where(eq(raffleWinners.userId, userId))
        .orderBy(sql`${raffleWinners.wonAt} DESC`);

      res.json({ 
        success: true, 
        entries: userEntries,
        wins: userWins
      });
    } catch (error) {
      console.error('Error fetching user raffle history:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch raffle history' });
    }
  });

  // Get raffle details with entries and winners
  app.get('/api/raffles/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // Get raffle details
      const raffleDetails = await db
        .select({
          id: raffles.id,
          title: raffles.title,
          description: raffles.description,
          imageUrl: raffles.imageUrl,
          totalSlots: raffles.totalSlots,
          pricePerSlot: raffles.pricePerSlot,
          filledSlots: raffles.filledSlots,
          maxWinners: raffles.maxWinners,
          status: raffles.status,
          isActive: raffles.isActive,
          autoDraw: raffles.autoDraw,
          drawnAt: raffles.drawnAt,
          createdAt: raffles.createdAt,
          creator: {
            username: users.username
          }
        })
        .from(raffles)
        .leftJoin(users, eq(raffles.createdBy, users.id))
        .where(eq(raffles.id, id))
        .limit(1);

      if (raffleDetails.length === 0) {
        return res.status(404).json({ success: false, error: 'Raffle not found' });
      }

      const raffle = raffleDetails[0];

      // Get entries
      const entries = await db
        .select({
          id: raffleEntries.id,
          userId: raffleEntries.userId,
          slots: raffleEntries.slots,
          totalCost: raffleEntries.totalCost,
          createdAt: raffleEntries.entryDate,
          user: {
            username: users.username
          }
        })
        .from(raffleEntries)
        .leftJoin(users, eq(raffleEntries.userId, users.id))
        .where(eq(raffleEntries.raffleId, id))
        .orderBy(sql`${raffleEntries.entryDate} ASC`);

      // Get winners
      const winners = await db
        .select({
          id: raffleWinners.id,
          userId: raffleWinners.userId,
          prizePosition: raffleWinners.prizePosition,
          wonAt: raffleWinners.wonAt,
          user: {
            username: users.username
          }
        })
        .from(raffleWinners)
        .leftJoin(users, eq(raffleWinners.userId, users.id))
        .where(eq(raffleWinners.raffleId, id))
        .orderBy(sql`${raffleWinners.prizePosition} ASC`);

      res.json({
        success: true,
        raffle: {
          ...raffle,
          entries,
          winners
        }
      });
    } catch (error) {
      console.error('Error fetching raffle details:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch raffle details' });
    }
  });

  // Join a raffle
  app.post('/api/raffles/:id/join', 
    createParamValidationMiddleware(commonSchemas.id, 'id'),
    createValidationMiddleware(raffleSchemas.joinRaffle),
    isAuthenticatedCombined, 
    asyncHandler(async (req, res) => {
      try {
        const { id } = req.params;
        const { slots } = req.body;
        const userId = (req as any).user?.id;

        if (!userId) {
          const { statusCode, response } = createErrorResponse('User not authenticated', 'UNAUTHORIZED', null, 401);
          return res.status(statusCode).json(response);
        }

        // Use database transaction to prevent race conditions
        const result = await db.transaction(async (tx) => {
          // Get raffle details with row-level lock
          const raffleDetails = await tx
            .select()
            .from(raffles)
            .where(and(eq(raffles.id, id), eq(raffles.isActive, true)))
            .limit(1)
            .for('update'); // Row-level lock to prevent race conditions

          if (raffleDetails.length === 0) {
            throw new Error('Raffle not found or inactive');
          }

          const raffle = raffleDetails[0];

          // Check if raffle is still active
          if (raffle.status !== 'active') {
            throw new Error('Raffle is no longer active');
          }

          // Check if there are enough slots available
          const availableSlots = raffle.totalSlots - (raffle.filledSlots || 0);
          if (slots > availableSlots) {
            throw new Error(`Only ${availableSlots} slots available`);
          }

          const totalCost = Number(raffle.pricePerSlot) * slots;

          // Check user credits
          const user = await storage.getUser(userId);
          if (!user || Number(user.credits) < totalCost) {
            throw new Error('Insufficient credits');
          }

          // Create entry
          await tx.insert(raffleEntries).values({
            raffleId: id,
            userId: userId,
            slots: slots,
            totalCost: totalCost.toString()
          });

          // Update raffle filled slots atomically
        const newFilledSlots = (raffle.filledSlots || 0) + slots;
        await tx
          .update(raffles)
          .set({ 
            filledSlots: newFilledSlots,
            status: newFilledSlots >= raffle.totalSlots ? 'filled' : 'active'
          })
          .where(eq(raffles.id, id));

        // Deduct credits
        await storage.deductUserCredits(userId, totalCost.toString());

        // Create transaction record
        await storage.addTransaction({
          id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId: userId,
          type: 'raffle_entry',
          amount: totalCost.toString(),
          description: `Joined raffle: ${raffle.title} (${slots} slots)`,
          packId: id,
          packType: 'raffle'
        });

          return {
            success: true,
            message: `Successfully joined raffle with ${slots} slots`,
            totalCost: totalCost,
            raffle,
            newFilledSlots
          };
        });

        // Check if raffle is now full and auto-draw (outside transaction)
        if (result.raffle.autoDraw && result.newFilledSlots >= result.raffle.totalSlots) {
          await drawRaffleWinners(id);
        }

        const response = createSuccessResponse(
          { totalCost: result.totalCost },
          result.message
        );
        res.json(response);
      } catch (error) {
        console.error('Error joining raffle:', error);
        
        // Handle specific error cases
        if (error instanceof Error) {
          if (error.message.includes('Insufficient credits')) {
            const { statusCode, response } = createErrorResponse(
              'Insufficient credits to join raffle',
              'INSUFFICIENT_CREDITS',
              null,
              400
            );
            return res.status(statusCode).json(response);
          }
          
          if (error.message.includes('Only') && error.message.includes('slots available')) {
            const { statusCode, response } = createErrorResponse(
              error.message,
              'INSUFFICIENT_SLOTS',
              null,
              400
            );
            return res.status(statusCode).json(response);
          }
          
          if (error.message.includes('Raffle is no longer active')) {
            const { statusCode, response } = createErrorResponse(
              'Raffle is no longer active',
              'RAFFLE_INACTIVE',
              null,
              400
            );
            return res.status(statusCode).json(response);
          }
          
          if (error.message.includes('Raffle not found')) {
            const { statusCode, response } = createErrorResponse(
              'Raffle not found or inactive',
              'RAFFLE_NOT_FOUND',
              null,
              404
            );
            return res.status(statusCode).json(response);
          }
        }
        
        // Generic error response
        const { statusCode, response } = createErrorResponse(
          'Failed to join raffle',
          'INTERNAL_ERROR',
          null,
          500
        );
        res.status(statusCode).json(response);
      }
    }));

  // Admin: Get all raffles (including completed ones with winners)
  app.get('/api/admin/raffles', isAdminCombined, async (req, res) => {
    try {
      const allRaffles = await db
        .select({
          id: raffles.id,
          title: raffles.title,
          description: raffles.description,
          imageUrl: raffles.imageUrl,
          totalSlots: raffles.totalSlots,
          pricePerSlot: raffles.pricePerSlot,
          filledSlots: raffles.filledSlots,
          maxWinners: raffles.maxWinners,
          status: raffles.status,
          isActive: raffles.isActive,
          autoDraw: raffles.autoDraw,
          drawnAt: raffles.drawnAt,
          createdAt: raffles.createdAt,
          creator: {
            username: users.username
          }
        })
        .from(raffles)
        .leftJoin(users, eq(raffles.createdBy, users.id))
        .orderBy(sql`${raffles.createdAt} DESC`);

      // Get prizes and winners for each raffle
      const rafflesWithPrizesAndWinners = await Promise.all(
        allRaffles.map(async (raffle) => {
          const prizes = await db
            .select()
            .from(rafflePrizes)
            .where(eq(rafflePrizes.raffleId, raffle.id))
            .orderBy(rafflePrizes.position);

          const winners = await db
            .select({
              id: raffleWinners.id,
              userId: raffleWinners.userId,
              prizePosition: raffleWinners.prizePosition,
              wonAt: raffleWinners.wonAt,
              prizeName: rafflePrizes.name,
              prizeImageUrl: rafflePrizes.imageUrl,
              winnerUsername: users.username
            })
            .from(raffleWinners)
            .leftJoin(rafflePrizes, eq(raffleWinners.prizeId, rafflePrizes.id))
            .leftJoin(users, eq(raffleWinners.userId, users.id))
            .where(eq(raffleWinners.raffleId, raffle.id))
            .orderBy(raffleWinners.prizePosition);

          return {
            ...raffle,
            prizes,
            winners
          };
        })
      );

      res.json({ success: true, raffles: rafflesWithPrizesAndWinners });
    } catch (error) {
      console.error('Error fetching admin raffles:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch raffles' });
    }
  });

  // Admin: Create raffle
  app.post('/api/admin/raffles', isAdminCombined, async (req, res) => {
    try {
      const {
        title,
        description,
        imageUrl,
        prizes,
        totalSlots,
        pricePerSlot,
        maxWinners,
        autoDraw
      } = req.body;

      const userId = (req as any).user?.id;

      if (!title || !totalSlots || !pricePerSlot) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields' 
        });
      }

      if (!prizes || !Array.isArray(prizes) || prizes.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'At least one prize is required' 
        });
      }

      const raffleId = `raffle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create the raffle
      await db.insert(raffles).values({
        id: raffleId,
        title,
        description,
        imageUrl,
        totalSlots: parseInt(totalSlots),
        pricePerSlot: pricePerSlot.toString(),
        maxWinners: maxWinners ? parseInt(maxWinners) : 1,
        autoDraw: autoDraw !== false,
        createdBy: userId
      });

      // Create the prizes
      await db.insert(rafflePrizes).values(
        prizes.map((prize: any) => ({
          raffleId,
          position: prize.position,
          name: prize.name,
          type: prize.type,
          value: prize.value || '',
          imageUrl: prize.imageUrl || null
        }))
      );

      res.json({ 
        success: true, 
        message: 'Raffle created successfully',
        raffleId: raffleId
      });
    } catch (error) {
      console.error('Error creating raffle:', error);
      res.status(500).json({ success: false, error: 'Failed to create raffle' });
    }
  });

  // Admin: Update raffle
  app.put('/api/admin/raffles/:id', isAdminCombined, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      console.log('Update raffle request:', { id, updateData });

      // Handle raffle content updates
      const raffleUpdateData = {
        title: updateData.title,
        description: updateData.description,
        imageUrl: updateData.imageUrl,
        totalSlots: updateData.totalSlots,
        pricePerSlot: updateData.pricePerSlot,
        maxWinners: updateData.maxWinners,
        status: updateData.status,
        isActive: updateData.isActive,
        autoDraw: updateData.autoDraw
      };

      // Remove undefined fields
      Object.keys(raffleUpdateData).forEach(key => {
        if ((raffleUpdateData as any)[key] === undefined) {
          delete (raffleUpdateData as any)[key];
        }
      });

      // Update raffle if there are changes
      if (Object.keys(raffleUpdateData).length > 0) {
        await db
          .update(raffles)
          .set(raffleUpdateData)
          .where(eq(raffles.id, id));
      }

      // Handle prizes updates
      if (updateData.prizes && Array.isArray(updateData.prizes)) {
        console.log('🔍 Server received updateData:', updateData);
        console.log('🔍 Server received prizes:', updateData.prizes);
        console.log('🔍 First prize object:', updateData.prizes[0]);
        console.log('🔍 First prize imageUrl:', updateData.prizes[0]?.imageUrl);
        
        // Delete existing prizes
        await db
          .delete(rafflePrizes)
          .where(eq(rafflePrizes.raffleId, id));

        // Insert new prizes
        if (updateData.prizes.length > 0) {
          const prizeData = updateData.prizes.map((prize: any) => ({
            raffleId: id,
            position: prize.position,
            name: prize.name,
            type: prize.type,
            value: prize.value || '',
            imageUrl: prize.imageUrl || null
          }));
          
          console.log('🔍 Server inserting prize data:', prizeData);
          console.log('🔍 First prize data imageUrl:', prizeData[0]?.imageUrl);
          
          await db.insert(rafflePrizes).values(prizeData);
        }
      }

      res.json({ success: true, message: 'Raffle updated successfully' });
    } catch (error) {
      console.error('Error updating raffle:', error);
      res.status(500).json({ success: false, error: 'Failed to update raffle' });
    }
  });

  // Admin: Delete raffle
  app.delete('/api/admin/raffles/:id', isAdminCombined, async (req, res) => {
    try {
      const { id } = req.params;

      // Delete related data first (due to foreign key constraints)
      await db.delete(raffleWinners).where(eq(raffleWinners.raffleId, id));
      await db.delete(raffleEntries).where(eq(raffleEntries.raffleId, id));
      await db.delete(rafflePrizes).where(eq(rafflePrizes.raffleId, id));
      
      // Finally delete the raffle itself
      await db.delete(raffles).where(eq(raffles.id, id));

      res.json({ success: true, message: 'Raffle deleted successfully' });
    } catch (error) {
      console.error('Error deleting raffle:', error);
      res.status(500).json({ success: false, error: 'Failed to delete raffle' });
    }
  });

  // Admin: Manually draw winners
  app.post('/api/admin/raffles/:id/draw', isAdminCombined, async (req, res) => {
    try {
      const { id } = req.params;

      const result = await drawRaffleWinners(id);
      res.json({ success: true, message: 'Winners drawn successfully', winners: result });
    } catch (error) {
      console.error('Error drawing winners:', error);
      res.status(500).json({ success: false, error: 'Failed to draw winners' });
    }
  });

  // Helper function to draw raffle winners
  async function drawRaffleWinners(raffleId: string) {
    console.log('🎲 Starting auto-draw for raffle:', raffleId);
    
    // Use database transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      const raffle = await tx
        .select()
        .from(raffles)
        .where(eq(raffles.id, raffleId))
        .limit(1)
        .for('update'); // Lock the raffle row

      if (raffle.length === 0) {
        throw new Error('Raffle not found');
      }

      const raffleData = raffle[0];

      if ((raffleData.filledSlots || 0) < raffleData.totalSlots) {
        throw new Error('Raffle is not full yet');
      }

      if (raffleData.status !== 'active' && raffleData.status !== 'filled') {
        throw new Error('Raffle is not active');
      }

      // Get all entries
      const entries = await tx
        .select()
        .from(raffleEntries)
        .where(eq(raffleEntries.raffleId, raffleId));

      console.log('🎲 Found entries:', entries.length);

      // Get prizes for this raffle
      const prizes = await tx
        .select()
        .from(rafflePrizes)
        .where(eq(rafflePrizes.raffleId, raffleId))
        .orderBy(rafflePrizes.position);

      console.log('🎲 Found prizes:', prizes.length);
      console.log('🎲 Prizes details:', prizes.map(p => ({ position: p.position, name: p.name, type: p.type })));

      if (prizes.length === 0) {
        throw new Error('No prizes found for this raffle');
      }

      // Create array of all slot numbers based on entry slots
      const allSlots = [];
      let currentSlot = 1;
      
      for (const entry of entries) {
        for (let i = 0; i < entry.slots; i++) {
          allSlots.push({ 
            slot: currentSlot, 
            entryId: entry.id, 
            userId: entry.userId 
          });
          currentSlot++;
        }
      }

      console.log('🎲 Total slots available for drawing:', allSlots.length);

      // Draw winners
      const winners = [];
      // Draw winners based on the number of prizes available, not maxWinners
      const maxWinners = Math.min(prizes.length, allSlots.length);
      const winningUserIds = new Set(); // Track users who won main prizes
      
      console.log(`🎲 Drawing ${maxWinners} winners from ${allSlots.length} slots for ${prizes.length} prizes`);

      for (let i = 0; i < maxWinners; i++) {
        const randomIndex = Math.floor(Math.random() * allSlots.length);
        const winner = allSlots.splice(randomIndex, 1)[0];
        const prize = prizes[i];

        const winnerId = `winner-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        await tx.insert(raffleWinners).values({
          raffleId: raffleId,
          userId: winner.userId,
          prizePosition: i + 1,
          prizeId: prize.id,
          wonAt: new Date()
        });

        winners.push({
          id: winnerId,
          userId: winner.userId,
          winningSlot: winner.slot,
          prizePosition: i + 1,
          prizeName: prize.name
        });

        winningUserIds.add(winner.userId); // Track this user as a main prize winner

        console.log(`🎲 Winner ${i + 1}: User ${winner.userId}, Slot ${winner.slot}, Prize: ${prize.name}`);

        // Award prize to winner based on prize type
        if (prize.type === 'pack' && winner.userId) {
          await storage.addUserPack({
            id: `pack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId: winner.userId,
            packId: raffleId,
            packType: 'raffle',
            tier: prize.name,
            earnedFrom: `raffle_${raffleId}`
          });
          console.log(`🎁 Awarded pack "${prize.name}" to user ${winner.userId}`);
        } else if (prize.type === 'credits' && prize.value && winner.userId) {
          await storage.updateUserCredits(winner.userId, prize.value.toString());
          console.log(`💰 Awarded ${prize.value} credits to user ${winner.userId}`);
        } else if (prize.type === 'physical' && winner.userId) {
          // For physical prizes, add directly to vault as a card
          await storage.addUserCard({
            id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId: winner.userId,
            cardName: prize.name,
            cardImageUrl: prize.imageUrl || '/assets/classic-image.png',
            cardTier: 'SSS', // Physical prizes are highest tier
            refundCredit: 1000, // High refund value for physical prizes
            packSource: `raffle_${raffleId}`,
            cardSource: 'raffle_prize'
          });
          console.log(`🎁 Awarded physical prize "${prize.name}" directly to user ${winner.userId}'s vault`);
        }
      }

      // Award 1 credit consolation prize to all participants who didn't win main prizes
      const allParticipantUserIds = new Set(entries.map(entry => entry.userId));
      const consolationWinners = [...allParticipantUserIds].filter(userId => !winningUserIds.has(userId));
      
      console.log(`🎁 Awarding 1 credit consolation prize to ${consolationWinners.length} participants`);
      
      for (const userId of consolationWinners) {
        if (userId && typeof userId === 'string') { // Ensure userId is not null and is a string
          // Get current user credits
          const user = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
          if (user.length > 0) {
            const currentCredits = parseFloat(user[0].credits || "0");
            const newCredits = currentCredits + 1;
            await storage.updateUserCredits(userId, newCredits.toFixed(2));
            console.log(`💰 Awarded 1 credit consolation prize to user ${userId} (${currentCredits} + 1 = ${newCredits})`);
          }
        }
      }

      // Update raffle status
      await tx
        .update(raffles)
        .set({ 
          status: 'completed',
          drawnAt: new Date()
        })
        .where(eq(raffles.id, raffleId));

      console.log('🎲 Auto-draw completed successfully!');
      console.log(`🎁 Summary: ${winners.length} main prize winners, ${consolationWinners.length} consolation prize winners (1 credit each)`);
      return winners;
    });
  }

  const httpServer = createServer(app);
  return httpServer;
}

// Simplified game simulation logic
async function simulateGame(gameType: string, betAmount: number): Promise<GameResult> {

  if (gameType === 'dice') {
    // For dice game, simulate rolling 5 dice with 6 Pokemon types
    const pokemonTypes = ['fire', 'water', 'grass', 'electric', 'psychic', 'fighting'];
    const dice = Array.from({ length: 5 }, () => 
      pokemonTypes[Math.floor(Math.random() * pokemonTypes.length)]
    );
    
    // Count matches
    const counts: { [key: string]: number } = {};
    dice.forEach(type => {
      counts[type] = (counts[type] || 0) + 1;
    });
    
    const maxMatches = Math.max(...Object.values(counts));
    
    // Determine reward based on matches
    let tier: string;
    if (maxMatches >= 5) {
      tier = 'masterball';
    } else if (maxMatches >= 4) {
      tier = 'ultraball';
    } else if (maxMatches >= 3) {
      tier = 'greatball';
    } else if (maxMatches >= 2) {
      tier = 'pokeball';
    } else {
      tier = 'pokeball'; // Minimum reward
    }
    
    return {
      cardId: `dice-${Date.now()}`,
      tier: tier,
      gameType
    };
  }

  // For other games, use the old card-based logic
  // Redirect to inventory since cards table was removed
  const cards = await storage.getInventoryCards();
  
  if (cards.length === 0) {
    throw new Error('No cards available');
  }

  // Simple tier selection for non-Plinko games using new 7-tier system
  const random = Math.random();
  let tier: string;
  
  if (random < 0.0001) tier = 'SSS';
  else if (random < 0.0015) tier = 'SS';
  else if (random < 0.0030) tier = 'S';
  else if (random < 0.0210) tier = 'A';
  else if (random < 0.1010) tier = 'B';
  else if (random < 0.2510) tier = 'C';
  else tier = 'D';
  
  const tierCards = cards.filter((card: any) => card.tier === tier);
  
  if (tierCards.length === 0) {
    const commonCards = cards.filter((card: any) => card.tier === 'D');
    if (commonCards.length === 0) {
      throw new Error('No cards in stock');
    }
    const selectedCard = commonCards[Math.floor(Math.random() * commonCards.length)];
    return {
      cardId: selectedCard.id,
      tier: 'D',
      gameType,
    };
  }

  const selectedCard = tierCards[Math.floor(Math.random() * tierCards.length)];
  // Stock management removed since cards table was removed
  // await storage.updateCardStock(selectedCard.id, (selectedCard.stock || 0) - 1);

  return {
    cardId: selectedCard.id,
    tier: selectedCard.tier,
    gameType,
  };
}
