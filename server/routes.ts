import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { z } from "zod";
import { 
  insertCardSchema, 
  insertPackSchema,
  insertVirtualLibrarySchema,
  insertVirtualPackSchema,
  insertVirtualPackCardSchema,
  insertShippingRequestSchema,
  type GameResult 
} from "@shared/schema";

// Map tier to pack type for Plinko

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
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
  app.post('/api/games/play', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { gameType, betAmount, plinkoResult } = req.body;

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

      let result: GameResult;
      
      if (gameType === 'plinko' && plinkoResult) {
        // Use frontend physics result for Plinko
        result = {
          cardId: '',
          tier: plinkoResult.toLowerCase(), // Convert "Masterball" to "masterball"
          gameType,
        };
        console.log(`Plinko result from frontend: ${plinkoResult} → pack type=${result.tier}`);
      } else {
        // Use backend simulation for other games
        result = await simulateGame(gameType, parseFloat(actualBetAmount));
      }
      
      // Update game session with result
      await storage.updateGameSession(gameSession.id, result, 'completed');

      if (gameType === 'plinko') {
        // For Plinko, award packs based on visual outcome
        const packType = result.tier;
        console.log(`Plinko pack assignment: ${packType}`);
        
        const packs = await storage.getActivePacks();
        const targetPack = packs.find(p => p.type === packType);
        
        if (!targetPack) {
          console.log(`Available pack types:`, packs.map(p => p.type));
          throw new Error(`Pack type ${packType} not found`);
        }

        // Award pack to user - store the pack type as tier for display
        await storage.addUserPack({
          userId,
          packId: targetPack.id,
          tier: packType, // Store pack type directly
          earnedFrom: gameType,
          isOpened: false,
        });

        // No global feed for pack earning - only when opening packs
      } else {
        // For other games, keep the old card logic
        const card = await storage.getCard(result.cardId);
        if (!card) {
          throw new Error('Card not found');
        }

        // Add card to user vault with correct pull value
        await storage.addUserCard({
          userId,
          cardId: result.cardId,
          pullValue: card.marketValue,
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

  // Vault routes
  app.get('/api/vault', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userCards = await storage.getUserCards(userId);
      res.json(userCards);
    } catch (error) {
      console.error("Error fetching vault:", error);
      res.status(500).json({ message: "Failed to fetch vault" });
    }
  });

  app.post('/api/vault/refund', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  // Global feed routes
  app.get('/api/feed', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const feed = await storage.getGlobalFeed(limit);
      res.json(feed);
    } catch (error) {
      console.error("Error fetching feed:", error);
      res.status(500).json({ message: "Failed to fetch feed" });
    }
  });

  // Credits routes
  app.post('/api/credits/purchase', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  // Shipping routes
  app.post('/api/shipping/request', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.get('/api/admin/stats', isAuthenticated, async (req: any, res) => {
    try {
      // Basic admin check (in real app, check user role)
      const stats = await storage.getSystemStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/admin/cards', isAuthenticated, async (req: any, res) => {
    try {
      const cardData = insertCardSchema.parse(req.body);
      const card = await storage.createCard(cardData);
      res.json(card);
    } catch (error) {
      console.error("Error creating card:", error);
      res.status(500).json({ message: "Failed to create card" });
    }
  });

  app.patch('/api/admin/cards/:id/stock', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { stock } = req.body;
      
      if (typeof stock !== 'number' || stock < 0) {
        return res.status(400).json({ message: "Invalid stock amount" });
      }
      
      await storage.updateCardStock(id, stock);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating card stock:", error);
      res.status(500).json({ message: "Failed to update card stock" });
    }
  });

  app.delete('/api/admin/cards/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCard(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting card:", error);
      res.status(500).json({ message: "Failed to delete card" });
    }
  });

  // Pull rate management routes
  app.get('/api/admin/pull-rates', isAuthenticated, async (req: any, res) => {
    try {
      const pullRates = await storage.getAllPullRates();
      res.json(pullRates);
    } catch (error) {
      console.error("Error fetching pull rates:", error);
      res.status(500).json({ message: "Failed to fetch pull rates" });
    }
  });

  app.get('/api/admin/pull-rates/:packType', isAuthenticated, async (req: any, res) => {
    try {
      const { packType } = req.params;
      const pullRates = await storage.getPackPullRates(packType);
      res.json(pullRates);
    } catch (error) {
      console.error("Error fetching pull rates:", error);
      res.status(500).json({ message: "Failed to fetch pull rates" });
    }
  });

  app.post('/api/admin/pull-rates/:packType', isAuthenticated, async (req: any, res) => {
    try {
      const { packType } = req.params;
      const { rates } = req.body;
      const userId = req.user.claims.sub;

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
  app.get('/api/admin/virtual-library', isAuthenticated, async (req: any, res) => {
    try {
      const virtualLibraryCards = await storage.getVirtualLibraryCards();
      res.json(virtualLibraryCards);
    } catch (error) {
      console.error("Error fetching virtual library cards:", error);
      res.status(500).json({ message: "Failed to fetch virtual library cards" });
    }
  });

  app.post('/api/admin/virtual-library', isAuthenticated, async (req: any, res) => {
    try {
      const cardData = insertVirtualLibrarySchema.parse(req.body);
      const virtualLibraryCard = await storage.createVirtualLibraryCard(cardData);
      res.json(virtualLibraryCard);
    } catch (error) {
      console.error("Error creating virtual library card:", error);
      res.status(500).json({ message: "Failed to create virtual library card" });
    }
  });

  app.patch('/api/admin/virtual-library/:id', isAuthenticated, async (req: any, res) => {
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

  app.delete('/api/admin/virtual-library/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteVirtualLibraryCard(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting virtual library card:", error);
      res.status(500).json({ message: "Failed to delete virtual library card" });
    }
  });

  // Virtual pack admin routes
  app.get('/api/admin/virtual-packs', isAuthenticated, async (req: any, res) => {
    try {
      const virtualPacks = await storage.getVirtualPacks();
      res.json(virtualPacks);
    } catch (error) {
      console.error("Error fetching virtual packs:", error);
      res.status(500).json({ message: "Failed to fetch virtual packs" });
    }
  });

  app.post('/api/admin/virtual-packs', isAuthenticated, async (req: any, res) => {
    try {
      const packData = insertVirtualPackSchema.parse(req.body);
      const virtualPack = await storage.createVirtualPack(packData);
      res.json(virtualPack);
    } catch (error) {
      console.error("Error creating virtual pack:", error);
      res.status(500).json({ message: "Failed to create virtual pack" });
    }
  });

  app.patch('/api/admin/virtual-packs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const packData = insertVirtualPackSchema.partial().parse(req.body);
      const virtualPack = await storage.updateVirtualPack(id, packData);
      res.json(virtualPack);
    } catch (error) {
      console.error("Error updating virtual pack:", error);
      res.status(500).json({ message: "Failed to update virtual pack" });
    }
  });

  app.delete('/api/admin/virtual-packs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteVirtualPack(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting virtual pack:", error);
      res.status(500).json({ message: "Failed to delete virtual pack" });
    }
  });

  app.get('/api/admin/virtual-packs/:id/cards', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const packCards = await storage.getVirtualPackCards(id);
      res.json(packCards);
    } catch (error) {
      console.error("Error fetching virtual pack cards:", error);
      res.status(500).json({ message: "Failed to fetch virtual pack cards" });
    }
  });

  app.post('/api/admin/virtual-packs/:id/cards', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { cardIds, weights } = req.body;
      
      if (!Array.isArray(cardIds) || !Array.isArray(weights)) {
        return res.status(400).json({ message: "cardIds and weights must be arrays" });
      }
      
      if (cardIds.length !== weights.length) {
        return res.status(400).json({ message: "cardIds and weights arrays must have same length" });
      }
      
      await storage.setVirtualPackCards(id, cardIds, weights);
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting virtual pack cards:", error);
      res.status(500).json({ message: "Failed to set virtual pack cards" });
    }
  });

  // Virtual pack pull rate routes
  app.get('/api/admin/virtual-packs/:id/pull-rates', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const pullRates = await storage.getVirtualPackPullRates(id);
      res.json(pullRates);
    } catch (error) {
      console.error("Error fetching virtual pack pull rates:", error);
      res.status(500).json({ message: "Failed to fetch virtual pack pull rates" });
    }
  });

  app.post('/api/admin/virtual-packs/:id/pull-rates', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { rates } = req.body;
      
      if (!Array.isArray(rates)) {
        return res.status(400).json({ message: "rates must be an array" });
      }
      
      // Validate rates format
      for (const rate of rates) {
        if (!rate.cardTier || typeof rate.probability !== 'number') {
          return res.status(400).json({ message: "Each rate must have cardTier and probability" });
        }
      }
      
      const userId = req.user.claims.sub;
      await storage.setVirtualPackPullRates(id, rates, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting virtual pack pull rates:", error);
      res.status(500).json({ message: "Failed to set virtual pack pull rates" });
    }
  });

  // Cards and packs routes
  app.get('/api/cards', async (req, res) => {
    try {
      const packType = req.query.packType as string;
      const cards = await storage.getCards(packType);
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
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch('/api/notifications/:id/read', isAuthenticated, async (req, res) => {
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
  app.get('/api/packs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userPacks = await storage.getUserPacks(userId);
      res.json(userPacks);
    } catch (error) {
      console.error("Error fetching packs:", error);
      res.status(500).json({ message: "Failed to fetch packs" });
    }
  });

  // Virtual pack routes
  app.get('/api/virtual-packs', async (req, res) => {
    try {
      const virtualPacks = await storage.getActiveVirtualPacks();
      res.json(virtualPacks);
    } catch (error) {
      console.error("Error fetching virtual packs:", error);
      res.status(500).json({ message: "Failed to fetch virtual packs" });
    }
  });

  app.post('/api/virtual-packs/:id/open', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;

      const result = await storage.openVirtualPack(id, userId);
      
      res.json({ 
        success: true,
        ...result
      });
    } catch (error) {
      console.error("Error opening virtual pack:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to open virtual pack" });
      }
    }
  });

  app.post('/api/packs/open/:packId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { packId } = req.params;

      const packResult = await storage.openUserPack(packId, userId);
      
      res.json({ 
        success: true,
        ...packResult
      });

    } catch (error: any) {
      console.error("Error opening pack:", error);
      res.status(500).json({ message: error.message || "Failed to open pack" });
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

  // For other games, use the old card-based logic
  const cards = await storage.getCards('BNW');
  
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
  
  const tierCards = cards.filter(card => card.tier === tier && (card.stock || 0) > 0);
  
  if (tierCards.length === 0) {
    const commonCards = cards.filter(card => card.tier === 'D' && (card.stock || 0) > 0);
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
  await storage.updateCardStock(selectedCard.id, (selectedCard.stock || 0) - 1);

  return {
    cardId: selectedCard.id,
    tier: selectedCard.tier,
    gameType,
  };
}
