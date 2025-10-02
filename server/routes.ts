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
import { 
  insertCardSchema, 
  insertPackSchema,
  insertVirtualLibrarySchema,
  insertInventorySchema,
  insertShippingRequestSchema,
  specialPacks,
  specialPackCards,
  inventory,
  mysteryPacks,
  mysteryPackCards,
  userCards,
  globalFeed,
  users,
  cards,
  type GameResult 
} from "@shared/schema";

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
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
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
        const targetPack = mysteryPacks.find(p => p.subtype === packType);
        
        if (!targetPack) {
          // If specific pack type doesn't exist, use the first available pack
          const fallbackPack = mysteryPacks[0];
          if (!fallbackPack) {
            throw new Error(`No mystery packs available`);
          }
          
          // Award fallback pack to user
          await storage.addUserPack({
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
          userId,
          cardId: result.cardId,
          pullValue: card.credits.toString(),
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
      let pack = mysteryPacks.find(p => p.subtype === packTier);
      if (!pack) {
        // If pack doesn't exist, use the first available pack
        pack = mysteryPacks[0];
        if (!pack) {
          return res.status(500).json({ message: `No mystery packs available` });
        }
      }

      // Award pack to user
      await storage.addUserPack({
        userId,
        packId: pack.id,
        packType: 'mystery',
        tier: packTier,
        earnedFrom: 'minesweeper',
        isOpened: false,
      });

      // Create transaction record
      await storage.addTransaction({
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
      let pack = mysteryPacks.find(p => p.subtype === packTier);
      if (!pack) {
        // If pack doesn't exist, use the first available pack
        pack = mysteryPacks[0];
        if (!pack) {
          return res.status(500).json({ message: `No mystery packs available` });
        }
      }

      // Award mystery pack to user
      console.log('Awarding mystery pack to user:', { userId, packId: pack.id, packType: 'mystery', tier: packTier, earnedFrom: 'find-pikachu' });
      const userPack = await storage.addUserPack({
        userId,
        packId: pack.id,
        packType: 'mystery',
        tier: packTier,
        earnedFrom: 'find-pikachu',
        isOpened: false,
      });
      console.log('Successfully added user pack:', userPack);

      // Create transaction record
      await storage.addTransaction({
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
      let pack = mysteryPacks.find(p => p.subtype === packTier);
      if (!pack) {
        // If pack doesn't exist, use the first available pack
        pack = mysteryPacks[0];
        if (!pack) {
          return res.status(500).json({ message: `No mystery packs available` });
        }
      }

      // Award mystery pack to user
      await storage.addUserPack({
        userId,
        packId: pack.id,
        packType: 'mystery',
        tier: packTier,
        earnedFrom: 'energy-match',
        isOpened: false,
      });

      // Create transaction record
      await storage.addTransaction({
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

  // Vault routes
  app.get('/api/vault', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userCards = await storage.getUserCards(userId);
      res.json(userCards);
    } catch (error) {
      console.error("Error fetching vault:", error);
      res.status(500).json({ message: "Failed to fetch vault" });
    }
  });

  app.post('/api/vault/refund', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { cardIds } = req.body;

      if (!Array.isArray(cardIds) || cardIds.length === 0) {
        return res.status(400).json({ message: "Invalid card IDs" });
      }

      await storage.refundCards(cardIds, userId);
      
      // Add notification
      await storage.addNotification({
        userId,
        type: 'refund',
        title: 'Cards Refunded',
        message: `Successfully refunded ${cardIds.length} cards`,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error refunding cards:", error);
      res.status(500).json({ message: "Failed to refund cards" });
    }
  });

  // Async refund endpoint - processes refunds in background
  app.post('/api/vault/refund-async', isAuthenticatedCombined, async (req: any, res) => {
    console.log("🔥 ASYNC REFUND ENDPOINT HIT!");
    console.log("🔥 Request body:", req.body);
    console.log("🔥 User:", req.user);
    console.log("🔥 Request headers:", req.headers);
    
    try {
      const userId = req.user.id;
      const { cardIds } = req.body;

      console.log(`🚀 Async refund endpoint called for user ${userId} with ${cardIds?.length || 0} cards`);
      console.log(`🚀 Card IDs:`, cardIds);

      if (!Array.isArray(cardIds) || cardIds.length === 0) {
        console.log("❌ Invalid card IDs provided");
        return res.status(400).json({ message: "Invalid card IDs" });
      }

      // Immediately respond to client
      console.log("🚀 Sending immediate response to client");
      res.json({ success: true, message: "Refund processing started" });

      // Process refund in background (don't await)
      console.log("🚀 Starting background processing...");
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
          pullValue: card.pullValue
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

      console.log(`🧪 TEST: Manual refund trigger for user ${userId} with ${cardIds?.length || 0} cards`);

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

  // Simple test endpoint to verify routing
  app.post('/api/vault/test-simple', isAuthenticatedCombined, async (req: any, res) => {
    console.log("🧪 SIMPLE TEST ENDPOINT HIT!");
    res.json({ success: true, message: "Simple test endpoint working" });
  });

  // Image upload endpoint - using different path to avoid Vite interference
  app.post('/api/admin/upload-image', isAuthenticatedCombined, async (req: any, res) => {
    console.log("🖼️ IMAGE UPLOAD ENDPOINT HIT!");
    console.log("🖼️ Request body keys:", Object.keys(req.body || {}));
    console.log("🖼️ Request files keys:", Object.keys(req.files || {}));
    console.log("🖼️ User:", req.user);
    
    try {
      const userId = req.user.id;
      console.log("🖼️ User ID:", userId);
      
      // Check if user is admin
      const user = await storage.getUser(userId);
      console.log("🖼️ User from DB:", user);
      console.log("🖼️ User role:", user?.role);
      
      if (!user || user.role !== 'admin') {
        console.log("🖼️ ❌ Admin access denied");
        return res.status(403).json({ message: "Admin access required" });
      }

      // Handle file upload using multer or similar
      // For now, we'll use a simple approach with express-fileupload
      console.log("🖼️ Checking for files...");
      console.log("🖼️ req.files:", req.files);
      
      if (!req.files || !req.files.image) {
        console.log("🖼️ ❌ No image file provided");
        return res.status(400).json({ message: "No image file provided" });
      }

      const imageFile = req.files.image;
      console.log("🖼️ Image file:", {
        name: imageFile.name,
        size: imageFile.size,
        mimetype: imageFile.mimetype
      });
      
      // Validate file type
      if (!imageFile.mimetype.startsWith('image/')) {
        console.log("🖼️ ❌ Invalid file type:", imageFile.mimetype);
        return res.status(400).json({ message: "File must be an image" });
      }

      // Validate file size (10MB limit)
      if (imageFile.size > 10 * 1024 * 1024) {
        console.log("🖼️ ❌ File too large:", imageFile.size);
        return res.status(400).json({ message: "File size must be less than 10MB" });
      }

      // Generate unique filename
      const fileExtension = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
      console.log("🖼️ Generated filename:", fileName);
      
      // Save file to uploads directory
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const uploadPath = path.join(__dirname, '../client/public/uploads', fileName);
      console.log("🖼️ Upload path:", uploadPath);
      
      // Ensure uploads directory exists
      const fs = await import('fs');
      const uploadsDir = path.join(__dirname, '../client/public/uploads');
      if (!fs.existsSync(uploadsDir)) {
        console.log("🖼️ Creating uploads directory:", uploadsDir);
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      await imageFile.mv(uploadPath);
      console.log("🖼️ ✅ File saved successfully");

      // Return the public URL
      const imageUrl = `/uploads/${fileName}`;
      console.log("🖼️ ✅ Returning image URL:", imageUrl);
      
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
    console.log("🧪 BASIC TEST ENDPOINT HIT!");
    res.json({ success: true, message: "Basic test endpoint working" });
  });


  // Test endpoint to check global feed table
  app.get('/api/feed/debug', async (req, res) => {
    try {
      console.log('🔍 DEBUG: Checking global_feed table...');
      
      // Check total count
      const totalCount = await db.select({ count: sql<number>`count(*)` }).from(globalFeed);
      console.log('🔍 Total entries in global_feed:', totalCount[0]?.count || 0);
      
      // Get all entries
      const allEntries = await db.select().from(globalFeed).limit(10);
      console.log('🔍 Sample entries:', allEntries);
      
      res.json({
        totalCount: totalCount[0]?.count || 0,
        sampleEntries: allEntries
      });
    } catch (error) {
      console.error("❌ Error in debug endpoint:", error);
      res.status(500).json({ message: "Debug endpoint error" });
    }
  });

  // Test endpoint to manually add a feed entry
  app.post('/api/feed/test-add', isAuthenticatedCombined, async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log('🧪 TEST: Adding manual feed entry for user:', userId);
      
      // Get a random card from inventory
      const inventoryCards = await storage.getInventoryCards();
      if (inventoryCards.length === 0) {
        return res.status(400).json({ message: "No cards in inventory" });
      }
      
      const randomCard = inventoryCards[0];
      console.log('🧪 Using card:', randomCard);
      
      await storage.addGlobalFeedEntry({
        userId,
        cardId: randomCard.id,
        tier: randomCard.tier,
        gameType: 'test',
      });
      
      console.log('✅ Test feed entry added successfully');
      res.json({ success: true, message: "Test feed entry added" });
    } catch (error) {
      console.error("❌ Error adding test feed entry:", error);
      res.status(500).json({ message: "Failed to add test entry" });
    }
  });

  // Global feed routes
  app.get('/api/feed', async (req, res) => {
    try {
      const { limit = 50, minTier } = req.query;
      
      console.log('📰 Fetching global feed with params:', { limit, minTier });
      
      // Use the storage method instead of direct query
      const feedData = await storage.getGlobalFeed(parseInt(limit as string), minTier as string);
      
      console.log(`📰 Found ${feedData.length} feed entries`);
      if (feedData.length > 0) {
        console.log('📰 Sample feed entry:', JSON.stringify(feedData[0], null, 2));
      }
      
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
        userId,
        type: 'purchase',
        amount: creditAmount.toFixed(2),
        description: `Credit purchase - ${bundleType || 'custom'}`,
      });

      await storage.addNotification({
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
      const { credits } = req.body;


      const creditAmount = parseFloat(credits);
      if (isNaN(creditAmount) || creditAmount <= 0) {
        return res.status(400).json({ message: "Invalid credit amount" });
      }


      // Add credits to user account
      await storage.updateUserCredits(userId, creditAmount.toFixed(2));
      
      // Add transaction record
      await storage.addTransaction({
        userId,
        type: 'purchase',
        amount: creditAmount.toFixed(2),
        description: `Credit reload - ${creditAmount} credits`,
      });

      // Add notification
      await storage.addNotification({
        userId,
        type: 'purchase',
        title: 'Credits Added',
        message: `Added ${creditAmount} credits to your account`,
      });

      res.json({ success: true, creditsAdded: creditAmount });
    } catch (error) {
      console.error("Error updating user credits:", error);
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
      // Basic admin check (in real app, check user role)
      const stats = await storage.getSystemStats();
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

  app.post('/api/admin/cards', isAdminCombined, async (req: any, res) => {
    try {
      // Redirect to inventory since cards table was removed
      const cardData = insertInventorySchema.parse(req.body);
      const card = await storage.createInventoryCard(cardData);
      res.json(card);
    } catch (error) {
      console.error("Error creating card:", error);
      res.status(500).json({ message: "Failed to create card" });
    }
  });

  app.patch('/api/admin/cards/:id', isAdminCombined, async (req: any, res) => {
    try {
      const { id } = req.params;
      // Redirect to inventory since cards table was removed
      const cardData = insertInventorySchema.partial().parse(req.body);
      const card = await storage.updateInventoryCard(id, cardData);
      res.json(card);
    } catch (error) {
      console.error("Error updating card:", error);
      res.status(500).json({ message: "Failed to update card" });
    }
  });

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

  app.post('/api/admin/virtual-library', isAdminCombined, async (req: any, res) => {
    try {
      const cardData = insertVirtualLibrarySchema.parse(req.body);
      const virtualLibraryCard = await storage.createVirtualLibraryCard(cardData);
      res.json(virtualLibraryCard);
    } catch (error) {
      console.error("Error creating virtual library card:", error);
      res.status(500).json({ message: "Failed to create virtual library card" });
    }
  });

  app.patch('/api/admin/virtual-library/:id', isAdminCombined, async (req: any, res) => {
    try {
      const { id } = req.params;
      const cardData = insertVirtualLibrarySchema.partial().parse(req.body);
      const virtualLibraryCard = await storage.updateVirtualLibraryCard(id, cardData);
      res.json(virtualLibraryCard);
    } catch (error) {
      console.error("Error updating virtual library card:", error);
      res.status(500).json({ message: "Failed to update virtual library card" });
    }
  });

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

  app.post('/api/admin/inventory', isAdminCombined, async (req: any, res) => {
    try {
      const cardData = insertInventorySchema.parse(req.body);
      const inventoryCard = await storage.createInventoryCard(cardData);
      res.json(inventoryCard);
    } catch (error: any) {
      console.error("Error creating inventory card:", error);
      res.status(500).json({ message: "Failed to create inventory card", error: error.message });
    }
  });

  app.patch('/api/admin/inventory/:id', isAdminCombined, async (req: any, res) => {
    try {
      const { id } = req.params;
      const cardData = insertInventorySchema.partial().parse(req.body);
      const inventoryCard = await storage.updateInventoryCard(id, cardData);
      res.json(inventoryCard);
    } catch (error) {
      console.error("Error updating inventory card:", error);
      res.status(500).json({ message: "Failed to update inventory card" });
    }
  });

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
      console.log('Testing special packs query...');
      const result = await db.select().from(specialPacks);
      console.log('Query result:', result);
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
      console.log('Testing cascading deletion for card:', cardId);
      
      // Check if card exists in special pack cards
      const specialPackCardsResult = await db
        .select()
        .from(specialPackCards)
        .where(eq(specialPackCards.cardId, cardId));
      
      // Check if card exists in mystery pack cards
      const mysteryPackCardsResult = await db
        .select()
        .from(mysteryPackCards)
        .where(eq(mysteryPackCards.cardId, cardId));
      
      res.json({ 
        success: true, 
        cardId,
        specialPackCards: specialPackCardsResult.length,
        mysteryPackCards: mysteryPackCardsResult.length,
        message: `Card ${cardId} is used in ${specialPackCardsResult.length} special pack(s) and ${mysteryPackCardsResult.length} mystery pack(s)`
      });
    } catch (error: any) {
      console.error('Cascade delete test error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Test endpoint to check inventory table directly
  app.get('/api/test-inventory', async (req: any, res) => {
    try {
      console.log('Testing inventory table query...');
      const result = await db.select().from(inventory);
      console.log('Inventory query result:', result);
      res.json({ success: true, result, count: result.length });
    } catch (error: any) {
      console.error('Inventory test error:', error);
      res.status(500).json({ success: false, error: error.message, stack: error.stack });
    }
  });

  // Test endpoint to add tier column
  app.get('/api/fix-inventory-tier', async (req: any, res) => {
    try {
      console.log('Adding tier column to inventory table...');
      
      // Add tier column if it doesn't exist
      await db.execute(sql`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'D' NOT NULL;`);
      
      // Update existing records to have 'D' tier if they don't have one
      await db.execute(sql`UPDATE inventory SET tier = 'D' WHERE tier IS NULL;`);
      
      // Test the query again
      const result = await db.select().from(inventory);
      console.log('Inventory after adding tier column:', result);
      
      res.json({ success: true, message: 'Tier column added successfully', result, count: result.length });
    } catch (error: any) {
      console.error('Fix inventory tier error:', error);
      res.status(500).json({ success: false, error: error.message, stack: error.stack });
    }
  });

  // Test endpoint to add packType column
  app.get('/api/fix-pack-type', async (req: any, res) => {
    try {
      console.log('Adding packType column to special_packs table...');
      
      // Add packType column if it doesn't exist
      await db.execute(sql`ALTER TABLE special_packs ADD COLUMN IF NOT EXISTS pack_type VARCHAR(50) DEFAULT 'special' NOT NULL;`);
      
      // Update existing records to have 'special' as pack_type
      await db.execute(sql`UPDATE special_packs SET pack_type = 'special' WHERE pack_type IS NULL;`);
      
      // Test the query again
      const result = await db.select().from(specialPacks);
      console.log('Special packs after adding packType column:', result);
      
      res.json({ success: true, message: 'PackType column added successfully', result, count: result.length });
    } catch (error: any) {
      console.error('Fix pack type error:', error);
      res.status(500).json({ success: false, error: error.message, stack: error.stack });
    }
  });

  app.get('/api/test-remove-card', async (req: any, res) => {
    try {
      console.log('Testing remove card functionality...');
      const packId = '348915f7-5185-481b-bcb6-590c8e87d02d';
      const specialPackCardId = 'spc-1758596540504-agi7i73cb';
      
      console.log('Calling removeCardFromSpecialPack with:', { packId, specialPackCardId });
      await storage.removeCardFromSpecialPack(packId, specialPackCardId);
      console.log('Remove card successful');
      res.json({ success: true });
    } catch (error: any) {
      console.error('Remove card test error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Admin special packs routes
  app.get('/api/admin/special-packs', isAdminCombined, async (req: any, res) => {
    try {
      console.log('Getting special packs...');
      const packs = await storage.getSpecialPacks();
      console.log('Successfully fetched packs:', packs);
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
      console.log('Getting classic packs...');
      const packs = await storage.getClassicPacks();
      console.log('Successfully fetched classic packs:', packs);
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
        name,
        description,
        imageUrl: image,
        price: price.toString(),
        totalPacks: parseInt(totalCards),
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
        totalPacks: totalCards ? parseInt(totalCards) : undefined
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
      const { cardId, quantity = 1 } = req.body;
      
      console.log('Adding card to special pack:', { packId, cardId, quantity });
      
      if (!cardId) {
        return res.status(400).json({ error: 'Missing cardId' });
      }

      const packCard = await storage.addCardToSpecialPack(packId, cardId, quantity);
      console.log('Successfully added card to pack:', packCard);
      res.json(packCard);
    } catch (error: any) {
      console.error('Error adding card to special pack:', error);
      console.error('Error details:', error.message, error.stack);
      res.status(500).json({ error: 'Failed to add card to special pack' });
    }
  });

  app.delete('/api/admin/special-packs/:packId/cards/:specialPackCardId', isAdminCombined, async (req: any, res) => {
    try {
      const { packId, specialPackCardId } = req.params;
      console.log('Route handler - removing card:', { packId, specialPackCardId });
      await storage.removeCardFromSpecialPack(packId, specialPackCardId);
      console.log('Route handler - card removed successfully');
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
      
      console.log('Received classic pack data:', { name, description, image, price });
      
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

      console.log('Creating classic pack with data:', packData);
      const newPack = await storage.createClassicPack(packData);
      console.log('Successfully created classic pack:', newPack);
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
      console.log('Updated classic pack:', updatedPack);
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
      console.log('Deleted classic pack:', id);
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

  app.post('/api/admin/classic-packs/:id/cards', isAdminCombined, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { cardId, quantity = 1 } = req.body;
      
      console.log('Adding card to classic pack:', { packId: id, cardId, quantity });
      
      const result = await storage.addCardToSpecialPack(id, cardId, quantity);
      console.log('Successfully added card to pack:', result);
      res.json(result);
    } catch (error: any) {
      console.error('Error adding card to classic pack:', error);
      res.status(500).json({ error: 'Failed to add card to pack' });
    }
  });

  app.delete('/api/admin/classic-packs/:id/cards/:specialPackCardId', isAdminCombined, async (req: any, res) => {
    try {
      const { id, specialPackCardId } = req.params;
      
      console.log('Route handler - removing card:', { packId: id, specialPackCardId });
      
      await storage.removeCardFromSpecialPack(id, specialPackCardId);
      console.log('Route handler - card removed successfully');
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error removing card from classic pack:', error);
      res.status(500).json({ error: 'Failed to remove card from pack' });
    }
  });

  app.patch('/api/admin/classic-packs/:id/cards/:specialPackCardId', isAdminCombined, async (req: any, res) => {
    try {
      const { id, specialPackCardId } = req.params;
      const { quantity } = req.body;
      
      console.log('Updating classic pack card quantity:', { packId: id, specialPackCardId, quantity });
      
      const result = await storage.updateSpecialPackCardQuantity(id, specialPackCardId, quantity);
      console.log('Successfully updated classic pack card quantity:', result);
      res.json(result);
    } catch (error: any) {
      console.error('Error updating classic pack card quantity:', error);
      res.status(500).json({ error: 'Failed to update card quantity' });
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
      
      console.log('Received mystery pack data:', { name, description, image, price, totalCards });
      
      const packData = {
        name,
        description,
        imageUrl: image,
        price: price ? price.toString() : undefined,
        totalPacks: totalCards ? parseInt(totalCards) : undefined,
        isActive: true
      };
      
      console.log('Creating mystery pack with data:', packData);
      
      const pack = await storage.createMysteryPack(packData);
      console.log('Created mystery pack:', pack);
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
        price: price ? price.toString() : undefined,
        totalPacks: totalCards ? parseInt(totalCards) : undefined
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
      console.log('Deleted mystery pack:', id);
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
      const { cardId, quantity = 1 } = req.body;
      
      console.log('Adding card to mystery pack:', { packId, cardId, quantity });
      
      if (!cardId) {
        return res.status(400).json({ error: 'Missing cardId' });
      }

      const packCard = await storage.addCardToMysteryPack(packId, cardId, quantity);
      console.log('Successfully added card to mystery pack:', packCard);
      res.json(packCard);
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
      const classicPacks = await storage.getClassicPacks();
      const mysteryPacks = await storage.getMysteryPacks();
      
      // Filter only active packs
      const activeSpecialPacks = specialPacks.filter(pack => pack.isActive);
      const activeClassicPacks = classicPacks.filter(pack => pack.isActive);
      const activeMysteryPacks = mysteryPacks.filter(pack => pack.isActive);
      
      res.json({
        specialPacks: activeSpecialPacks,
        classicPacks: activeClassicPacks,
        mysteryPacks: activeMysteryPacks
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
      console.log('📦 Pack opening result:', JSON.stringify(packResult, null, 2));
      
      // Add to global feed for all cards (temporarily for testing)
      const hitCard = packResult.packCards.find(card => card.isHit);
      console.log('🎯 Hit card found:', hitCard);
      
      if (hitCard && hitCard.tier) {
        console.log(`📰 Adding pack pull to global feed: ${hitCard.tier} tier card - ${hitCard.name}`);
        try {
          await storage.addGlobalFeedEntry({
            userId,
            cardId: hitCard.id,
            tier: hitCard.tier,
            gameType: 'pack',
          });
          console.log('✅ Successfully added to global feed');
        } catch (error) {
          console.error('❌ Failed to add to global feed:', error);
        }
      } else {
        console.log('❌ No hit card found or missing tier');
      }
      
      res.json({ 
        success: true,
        ...packResult
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

      console.log('Purchasing Black Bolt pack:', {
        userId,
        packId
      });

      // Get user to check credits
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Get classic pack details
      console.log('📦 Getting classic packs...');
      const classicPacks = await storage.getClassicPacks();
      console.log('📦 Classic packs retrieved:', classicPacks.length);
      const classicPack = classicPacks.find(p => p.id === packId);
      console.log('📦 Found classic pack:', classicPack ? 'YES' : 'NO');
      
      if (!classicPack) {
        return res.status(404).json({ message: 'Classic pack not found' });
      }

      const packPrice = parseFloat(classicPack.price);
      console.log('📦 Pack price:', packPrice, 'User credits:', user.credits);
      if (!user.credits || parseFloat(user.credits) < packPrice) {
        console.log('📦 Insufficient credits error');
        return res.status(400).json({ message: 'Insufficient credits' });
      }

      // Deduct credits
      console.log('📦 Deducting credits...');
      await storage.updateUserCredits(userId, (-packPrice).toString());
      console.log('📦 Credits deducted successfully');

      // Create user pack
      console.log('📦 Creating user pack...');
      const userPack = await storage.addUserPack({
        userId,
        packId: classicPack.id,
        packType: 'classic',
        tier: 'classic',
        earnedFrom: 'purchase',
        isOpened: false,
      });
      console.log('📦 User pack created:', userPack.id);

      // Open the pack immediately
      console.log('📦 Opening pack...');
      const packResult = await storage.openUserPack(userPack.id, userId);
      console.log('📦 Black Bolt pack opening result:', JSON.stringify(packResult, null, 2));

      const response = { 
        success: true,
        ...packResult
      };
      console.log('📦 Sending response:', JSON.stringify(response, null, 2));
      res.json(response);

    } catch (error: any) {
      console.error("Error purchasing Black Bolt pack:", error);
      res.status(500).json({ message: error.message || "Failed to purchase pack" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Simplified game simulation logic
async function simulateGame(gameType: string, betAmount: number): Promise<GameResult> {
  if (gameType === 'plinko') {
    // For Plinko, simulate the bucket the ball would land in
    // This matches the visual Plinko layout: [Masterball, Ultraball, Greatball, Pokeball, Pokeball, Pokeball, Greatball, Ultraball, Masterball]
    const plinkoOutcomes = ["masterball", "ultraball", "greatball", "pokeball", "pokeball", "pokeball", "greatball", "ultraball", "masterball"];
    
    // Realistic physics-based distribution (center buckets more likely)
    const weights = [0.5, 4.5, 10, 20, 30, 20, 10, 4.5, 0.5]; // Matches bell curve distribution
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    
    let random = Math.random() * totalWeight;
    let selectedIndex = 0;
    
    for (let i = 0; i < weights.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        selectedIndex = i;
        break;
      }
    }
    
    const packType = plinkoOutcomes[selectedIndex];
    
    return {
      cardId: '', // Not needed for Plinko
      tier: packType, // This is now the pack type directly
      gameType,
    };
  }

  if (gameType === 'wheel') {
    // For wheel game, use pokeball pack system like plinko
    // Wheel odds: Pokeball 61%, Greatball 22%, Ultraball 14%, Masterball 2.8%
    const random = Math.random();
    let tier: string;
    
    if (random < 0.028) tier = 'masterball';
    else if (random < 0.168) tier = 'ultraball'; // 0.028 + 0.14
    else if (random < 0.388) tier = 'greatball'; // 0.168 + 0.22
    else tier = 'pokeball'; // remaining 61.2%
    
    return {
      cardId: '', // Not needed for wheel
      tier: tier, // Pack type
      gameType,
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
