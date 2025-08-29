import {
  users,
  cards,
  packs,
  packOdds,
  userCards,
  userPacks,
  globalFeed,
  transactions,
  gameSessions,
  notifications,
  shippingRequests,
  type User,
  type UpsertUser,
  type Card,
  type Pack,
  type PackOdds,
  type UserCard,
  type UserPack,
  type GlobalFeed,
  type Transaction,
  type GameSession,
  type Notification,
  type ShippingRequest,
  type InsertCard,
  type InsertPack,
  type InsertUserCard,
  type InsertUserPack,
  type InsertTransaction,
  type InsertGameSession,
  type InsertNotification,
  type InsertShippingRequest,
  type UserCardWithCard,
  type GlobalFeedWithDetails,
  type GameResult,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Card operations
  getCards(packType?: string): Promise<Card[]>;
  getCard(id: string): Promise<Card | undefined>;
  createCard(card: InsertCard): Promise<Card>;
  updateCardStock(id: string, stock: number): Promise<void>;
  
  // Pack operations
  getPacks(): Promise<Pack[]>;
  getActivePacks(): Promise<Pack[]>;
  createPack(pack: InsertPack): Promise<Pack>;
  
  // Pack odds operations
  getPackOdds(packId: string): Promise<PackOdds[]>;
  setPackOdds(packId: string, odds: { tier: string; probability: string }[]): Promise<void>;
  
  // Vault operations
  getUserCards(userId: string): Promise<UserCardWithCard[]>;
  addUserCard(userCard: InsertUserCard): Promise<UserCard>;
  refundCards(cardIds: string[], userId: string): Promise<void>;
  
  // User pack operations
  getUserPacks(userId: string): Promise<UserPack[]>;
  addUserPack(userPack: InsertUserPack): Promise<UserPack>;
  openUserPack(packId: string, userId: string): Promise<UserCard>;
  
  // Global feed operations
  getGlobalFeed(limit?: number): Promise<GlobalFeedWithDetails[]>;
  addGlobalFeedEntry(entry: { userId: string; cardId: string; tier: string; gameType: string }): Promise<void>;
  
  // Transaction operations
  addTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getUserTransactions(userId: string): Promise<Transaction[]>;
  
  // Game session operations (for crash recovery)
  createGameSession(session: InsertGameSession): Promise<GameSession>;
  getGameSession(id: string): Promise<GameSession | undefined>;
  updateGameSession(id: string, result: GameResult, status: string): Promise<void>;
  
  // Credit operations
  updateUserCredits(userId: string, amount: string): Promise<void>;
  deductUserCredits(userId: string, amount: string): Promise<boolean>;
  
  // Notification operations
  getUserNotifications(userId: string): Promise<Notification[]>;
  addNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<void>;
  
  // Shipping operations
  createShippingRequest(request: InsertShippingRequest): Promise<ShippingRequest>;
  getUserShippingRequests(userId: string): Promise<ShippingRequest[]>;
  updateShippingStatus(id: string, status: string, trackingNumber?: string): Promise<void>;
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  banUser(userId: string): Promise<void>;
  suspendUser(userId: string): Promise<void>;
  getSystemStats(): Promise<{ totalUsers: number; totalRevenue: string; totalCards: number }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        credits: "50.00", // Give new users 50 credits for testing
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Card operations
  async getCards(packType?: string): Promise<Card[]> {
    if (packType) {
      return await db.select().from(cards).where(and(eq(cards.packType, packType), eq(cards.isActive, true)));
    }
    return await db.select().from(cards).where(eq(cards.isActive, true));
  }

  async getCard(id: string): Promise<Card | undefined> {
    const [card] = await db.select().from(cards).where(eq(cards.id, id));
    return card;
  }

  async createCard(card: InsertCard): Promise<Card> {
    const [newCard] = await db.insert(cards).values(card).returning();
    return newCard;
  }

  async updateCardStock(id: string, stock: number): Promise<void> {
    await db.update(cards).set({ stock }).where(eq(cards.id, id));
  }

  // Pack operations
  async getPacks(): Promise<Pack[]> {
    return await db.select().from(packs);
  }

  async getActivePacks(): Promise<Pack[]> {
    return await db.select().from(packs).where(eq(packs.isActive, true));
  }

  async createPack(pack: InsertPack): Promise<Pack> {
    const [newPack] = await db.insert(packs).values(pack).returning();
    return newPack;
  }

  // Pack odds operations
  async getPackOdds(packId: string): Promise<PackOdds[]> {
    return await db.select().from(packOdds).where(eq(packOdds.packId, packId));
  }

  async setPackOdds(packId: string, odds: { tier: string; probability: string }[]): Promise<void> {
    // Delete existing odds
    await db.delete(packOdds).where(eq(packOdds.packId, packId));
    
    // Insert new odds
    await db.insert(packOdds).values(
      odds.map(odd => ({
        packId,
        tier: odd.tier,
        probability: odd.probability,
      }))
    );
  }

  // Vault operations
  async getUserCards(userId: string): Promise<UserCardWithCard[]> {
    const result = await db
      .select()
      .from(userCards)
      .leftJoin(cards, eq(userCards.cardId, cards.id))
      .where(and(eq(userCards.userId, userId), eq(userCards.isRefunded, false), eq(userCards.isShipped, false)))
      .orderBy(desc(userCards.pulledAt));

    return result.map(row => ({
      ...row.user_cards,
      card: row.cards!,
    }));
  }

  async addUserCard(userCard: InsertUserCard): Promise<UserCard> {
    try {
      // Insert without returning and then fetch by unique combination
      await db.insert(userCards).values({
        ...userCard,
        isRefunded: userCard.isRefunded ?? false,
        isShipped: userCard.isShipped ?? false,
      });
      
      // Fetch the most recent card for this user  
      const [newUserCard] = await db
        .select()
        .from(userCards)
        .where(eq(userCards.userId, userCard.userId!))
        .orderBy(desc(userCards.pulledAt))
        .limit(1);
      
      if (!newUserCard) {
        throw new Error('Failed to fetch inserted user card');
      }
      
      return newUserCard;
    } catch (error) {
      console.error('Error adding user card:', error);
      throw error;
    }
  }

  async refundCards(cardIds: string[], userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Get cards to refund
      const cardsToRefund = await tx
        .select()
        .from(userCards)
        .where(and(inArray(userCards.id, cardIds), eq(userCards.userId, userId)));

      let totalRefund = 0;
      for (const card of cardsToRefund) {
        totalRefund += parseFloat(card.pullValue) * 0.8; // 80% refund
      }

      // Mark cards as refunded
      await tx
        .update(userCards)
        .set({ isRefunded: true })
        .where(and(inArray(userCards.id, cardIds), eq(userCards.userId, userId)));

      // Add credits to user
      await tx
        .update(users)
        .set({ 
          credits: sql`${users.credits} + ${totalRefund.toFixed(2)}` 
        })
        .where(eq(users.id, userId));

      // Create transaction record
      await tx.insert(transactions).values({
        userId,
        type: 'refund',
        amount: totalRefund.toFixed(2),
        description: `Refunded ${cardsToRefund.length} cards`,
      });
    });
  }

  // User pack operations
  async getUserPacks(userId: string): Promise<UserPack[]> {
    return await db
      .select()
      .from(userPacks)
      .where(and(eq(userPacks.userId, userId), eq(userPacks.isOpened, false)))
      .orderBy(desc(userPacks.earnedAt));
  }

  async addUserPack(userPack: InsertUserPack): Promise<UserPack> {
    const [newUserPack] = await db.insert(userPacks).values(userPack).returning();
    return newUserPack;
  }

  async openUserPack(packId: string, userId: string): Promise<UserCard> {
    return await db.transaction(async (tx) => {
      // Get the pack to open
      const [userPack] = await tx
        .select()
        .from(userPacks)
        .where(and(
          eq(userPacks.id, packId),
          eq(userPacks.userId, userId),
          eq(userPacks.isOpened, false)
        ));

      if (!userPack) {
        throw new Error('Pack not found or already opened');
      }

      // Get pack odds for this pack
      const odds = await tx
        .select()
        .from(packOdds)
        .where(eq(packOdds.packId, userPack.packId!));

      if (odds.length === 0) {
        throw new Error('No odds configured for this pack');
      }

      // Weighted random selection based on odds
      const random = Math.random();
      let cumulative = 0;
      let selectedTier = odds[0].tier;

      for (const odd of odds) {
        cumulative += parseFloat(odd.probability);
        if (random <= cumulative) {
          selectedTier = odd.tier;
          break;
        }
      }

      // Convert short tier code to full tier name
      const tierMapping: { [key: string]: string } = {
        'C': 'common',
        'UC': 'uncommon', 
        'R': 'rare',
        'SR': 'superrare',
        'SSS': 'legendary'
      };
      const fullTierName = tierMapping[selectedTier] || selectedTier;

      // Get cards of the selected tier
      const availableCards = await tx
        .select()
        .from(cards)
        .where(and(
          eq(cards.tier, fullTierName),
          eq(cards.isActive, true),
          sql`${cards.stock} > 0`
        ));

      if (availableCards.length === 0) {
        throw new Error(`No available cards in tier ${fullTierName}`);
      }

      // Select random card from available cards
      const selectedCard = availableCards[Math.floor(Math.random() * availableCards.length)];

      // Add card to user's vault
      const [newUserCard] = await tx.insert(userCards).values({
        userId,
        cardId: selectedCard.id,
        pullValue: selectedCard.marketValue,
      }).returning();

      // Mark pack as opened
      await tx
        .update(userPacks)
        .set({ isOpened: true, openedAt: new Date() })
        .where(eq(userPacks.id, packId));

      // Update card stock
      await tx
        .update(cards)
        .set({ stock: sql`${cards.stock} - 1` })
        .where(eq(cards.id, selectedCard.id));

      // Add to global feed
      await tx.insert(globalFeed).values({
        userId,
        cardId: selectedCard.id,
        tier: selectedCard.tier,
        gameType: 'pack',
      });

      return newUserCard;
    });
  }

  // Global feed operations
  async getGlobalFeed(limit = 500): Promise<GlobalFeedWithDetails[]> {
    const result = await db
      .select({
        id: globalFeed.id,
        userId: globalFeed.userId,
        cardId: globalFeed.cardId,
        tier: globalFeed.tier,
        gameType: globalFeed.gameType,
        createdAt: globalFeed.createdAt,
        username: users.username,
        cardName: cards.name,
        cardImageUrl: cards.imageUrl,
      })
      .from(globalFeed)
      .leftJoin(users, eq(globalFeed.userId, users.id))
      .leftJoin(cards, eq(globalFeed.cardId, cards.id))
      .orderBy(desc(globalFeed.createdAt))
      .limit(limit);

    return result.map(row => ({
      id: row.id,
      userId: row.userId,
      cardId: row.cardId,
      tier: row.tier,
      gameType: row.gameType,
      createdAt: row.createdAt,
      user: { username: row.username || 'Unknown' },
      card: {
        id: row.cardId,
        name: row.cardName || 'Unknown Card',
        imageUrl: row.cardImageUrl,
      } as Card,
    }));
  }

  async addGlobalFeedEntry(entry: { userId: string; cardId: string; tier: string; gameType: string }): Promise<void> {
    await db.insert(globalFeed).values(entry);
  }

  // Transaction operations
  async addTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    return newTransaction;
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  // Game session operations
  async createGameSession(session: InsertGameSession): Promise<GameSession> {
    const [newSession] = await db.insert(gameSessions).values(session).returning();
    return newSession;
  }

  async getGameSession(id: string): Promise<GameSession | undefined> {
    const [session] = await db.select().from(gameSessions).where(eq(gameSessions.id, id));
    return session;
  }

  async updateGameSession(id: string, result: GameResult, status: string): Promise<void> {
    await db
      .update(gameSessions)
      .set({ 
        result,
        status,
        completedAt: new Date(),
      })
      .where(eq(gameSessions.id, id));
  }

  // Credit operations
  async updateUserCredits(userId: string, amount: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        credits: sql`${users.credits} + ${amount}`,
        totalSpent: sql`${users.totalSpent} + ${amount}`,
      })
      .where(eq(users.id, userId));
  }

  async deductUserCredits(userId: string, amount: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ 
        credits: sql`${users.credits} - ${amount}` 
      })
      .where(and(eq(users.id, userId), sql`${users.credits} >= ${amount}`))
      .returning();

    return result.length > 0;
  }

  // Notification operations
  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async addNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async markNotificationRead(id: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  // Shipping operations
  async createShippingRequest(request: InsertShippingRequest): Promise<ShippingRequest> {
    const [newRequest] = await db.insert(shippingRequests).values(request).returning();
    return newRequest;
  }

  async getUserShippingRequests(userId: string): Promise<ShippingRequest[]> {
    return await db
      .select()
      .from(shippingRequests)
      .where(eq(shippingRequests.userId, userId))
      .orderBy(desc(shippingRequests.createdAt));
  }

  async updateShippingStatus(id: string, status: string, trackingNumber?: string): Promise<void> {
    const updateData: any = { status };
    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
    }
    if (status === 'shipped') {
      updateData.shippedAt = new Date();
    }
    
    await db.update(shippingRequests).set(updateData).where(eq(shippingRequests.id, id));
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async banUser(userId: string): Promise<void> {
    await db.update(users).set({ isBanned: true }).where(eq(users.id, userId));
  }

  async suspendUser(userId: string): Promise<void> {
    await db.update(users).set({ isSuspended: true }).where(eq(users.id, userId));
  }

  async getSystemStats(): Promise<{ totalUsers: number; totalRevenue: string; totalCards: number }> {
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [revenueSum] = await db.select({ 
      sum: sql<string>`coalesce(sum(${users.totalSpent}), 0)` 
    }).from(users);
    const [cardCount] = await db.select({ count: sql<number>`count(*)` }).from(cards);

    return {
      totalUsers: userCount.count,
      totalRevenue: revenueSum.sum || "0",
      totalCards: cardCount.count,
    };
  }
}

export const storage = new DatabaseStorage();
