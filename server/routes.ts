import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { z } from "zod";
import { 
  insertCardSchema, 
  insertPackSchema, 
  insertShippingRequestSchema,
  type GameResult 
} from "@shared/schema";

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

  // Game routes
  app.post('/api/games/play', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { gameType, betAmount } = req.body;

      // Validate input
      if (!['plinko', 'wheel', 'pack'].includes(gameType)) {
        return res.status(400).json({ message: "Invalid game type" });
      }

      const bet = parseFloat(betAmount);
      if (isNaN(bet) || bet <= 0) {
        return res.status(400).json({ message: "Invalid bet amount" });
      }

      // Check user credits
      const canDeduct = await storage.deductUserCredits(userId, betAmount);
      if (!canDeduct) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      // Create game session for crash recovery
      const gameSession = await storage.createGameSession({
        userId,
        gameType,
        gameData: { betAmount, timestamp: Date.now() },
        status: 'in_progress',
      });

      // Simulate game logic (simplified RNG)
      const result = await simulateGame(gameType, bet);
      
      // Update game session with result
      await storage.updateGameSession(gameSession.id, result, 'completed');

      // Add card to user vault
      const userCard = await storage.addUserCard({
        userId,
        cardId: result.cardId,
        pullValue: "0", // Will be updated with actual card value
      });

      // Get card details and update pull value
      const card = await storage.getCard(result.cardId);
      if (card) {
        await storage.addUserCard({
          ...userCard,
          pullValue: card.marketValue,
        });

        // Add to global feed if rare enough
        if (['R', 'SR', 'SSS'].includes(result.tier)) {
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
        amount: `-${betAmount}`,
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

  app.get('/api/packs', async (req, res) => {
    try {
      const packs = await storage.getActivePacks();
      res.json(packs);
    } catch (error) {
      console.error("Error fetching packs:", error);
      res.status(500).json({ message: "Failed to fetch packs" });
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

  const httpServer = createServer(app);
  return httpServer;
}

// Simplified game simulation logic
async function simulateGame(gameType: string, betAmount: number): Promise<GameResult> {
  // Get available cards (for now, use BNW pack)
  const cards = await storage.getCards('BNW');
  
  if (cards.length === 0) {
    throw new Error('No cards available');
  }

  // Simple RNG based on tier probabilities
  const random = Math.random();
  let tier: string;
  
  if (random < 0.002) tier = 'SSS';      // 0.2%
  else if (random < 0.02) tier = 'SR';   // 1.8%
  else if (random < 0.1) tier = 'R';     // 8.0%
  else if (random < 0.35) tier = 'UC';   // 25.0%
  else tier = 'C';                       // 65.0%

  // Find a card of the determined tier
  const tierCards = cards.filter(card => card.tier === tier && card.stock > 0);
  
  if (tierCards.length === 0) {
    // Fallback to common cards if no cards of tier available
    const commonCards = cards.filter(card => card.tier === 'C' && card.stock > 0);
    if (commonCards.length === 0) {
      throw new Error('No cards in stock');
    }
    const selectedCard = commonCards[Math.floor(Math.random() * commonCards.length)];
    return {
      cardId: selectedCard.id,
      tier: 'C',
      gameType,
    };
  }

  const selectedCard = tierCards[Math.floor(Math.random() * tierCards.length)];
  
  // Update stock
  await storage.updateCardStock(selectedCard.id, selectedCard.stock - 1);

  return {
    cardId: selectedCard.id,
    tier: selectedCard.tier,
    gameType,
  };
}
