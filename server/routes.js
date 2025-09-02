import { createServer } from "http";
import { storage } from "./storage.js";
import { setupAuth, isAuthenticated, isAdmin } from "./auth.js";
import { z } from "zod";
import { 
  insertCardSchema, 
  insertPackSchema,
  insertVirtualLibrarySchema,
  insertVirtualPackSchema,
  insertVirtualPackCardSchema,
  insertShippingRequestSchema
} from "../shared/schema.js";

// Map tier to pack type for Plinko

export async function registerRoutes(app) {
  // Auth middleware
  setupAuth(app);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req, res) => {
    try {
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
  app.post('/api/games/play', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const { gameType, betAmount, plinkoResult, wheelResult } = req.body;

      // Validate input
      if (!['plinko', 'wheel', 'pack'].includes(gameType)) {
        return res.status(400).json({ message: "Invalid game type" });
      }

      // For Plinko, use fixed price from database, ignore user input
      let actualBetAmount;
      if (gameType === 'plinko') {
        const gameSettings = await storage.getGameSetting('plinko');
        if (!gameSettings) {
          return res.status(500).json({ message: "Plinko pricing not configured" });
        }
        actualBetAmount = gameSettings.price;
        console.log(`Plinko fixed price: ${actualBetAmount} (user input ignored: ${betAmount})`);
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

      let result;
      
      if (gameType === 'plinko' && plinkoResult) {
        // Use frontend physics result for Plinko
        result = {
          cardId: '',
          tier: plinkoResult.toLowerCase(), // Convert "Masterball" to "masterball"
          gameType,
        };
        console.log(`Plinko result from frontend: ${plinkoResult} → pack type=${result.tier}`);
      } else if (gameType === 'wheel' && wheelResult) {
        // Use frontend wheel result
        result = {
          cardId: '',
          tier: wheelResult.toLowerCase(),
          gameType,
        };
        console.log(`Wheel result from frontend: ${wheelResult} → pack type=${result.tier}`);
      } else {
        // For other games, generate random result
        result = await storage.generateRandomCard(gameType);
      }

      // Update game session
      await storage.updateGameSession(gameSession.id, {
        gameData: { ...gameSession.gameData, result },
        status: 'completed',
      });

      // Award pack based on result
      const pack = await storage.awardPackToUser(userId, result.tier, gameType);
      
      if (pack) {
        console.log(`${gameType} pack assignment: ${pack.type}`);
      }

      res.json({
        success: true,
        result,
        pack,
        gameSessionId: gameSession.id,
      });

    } catch (error) {
      console.error("Error in game play:", error);
      res.status(500).json({ message: "Game play error occurred" });
    }
  });

  // Credit deduction endpoint
  app.post('/api/credits/deduct', isAuthenticated, async (req, res) => {
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

  // Minesweeper game endpoint
  app.post('/api/games/minesweeper', isAuthenticated, async (req, res) => {
    console.log('Minesweeper endpoint called with:', { body: req.body, userId: req.user.id });
    try {
      const userId = req.user.id;
      const { greensFound, won } = req.body;

      if (typeof greensFound !== 'number' || greensFound < 0 || greensFound > 4) {
        return res.status(400).json({ message: "Invalid greens found count" });
      }
      if (typeof won !== 'boolean') {
        return res.status(400).json({ message: "Invalid win status" });
      }

      let packTier;
      if (greensFound === 0) packTier = "pokeball";
      else if (greensFound === 1) packTier = "pokeball";
      else if (greensFound === 2) packTier = "greatball";
      else if (greensFound === 3) packTier = "ultraball";
      else if (greensFound === 4) packTier = "masterball";
      else packTier = "pokeball";

      const packs = await storage.getPacks();
      let pack = packs.find(p => p.type === packTier);
      if (!pack) {
        console.log(`Pack type ${packTier} not found, available types:`, packs.map(p => p.type));
        return res.status(500).json({ message: `Pack type ${packTier} not available` });
      }

      await storage.addUserPack({
        userId,
        packId: pack.id,
        tier: packTier,
        earnedFrom: 'minesweeper',
        isOpened: false,
      });

      await storage.addTransaction({
        userId,
        type: 'game_play',
        amount: "0",
        description: `Minesweeper game completed - ${greensFound} greens found`,
      });

      await storage.createGameSession({
        userId,
        gameType: 'minesweeper',
        gameData: { greensFound, won, timestamp: Date.now() },
        status: 'completed',
      });

      let message;
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

  // Create HTTP server
  const server = createServer(app);
  return server;
}
