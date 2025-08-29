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
  gameSettings,
  pullRates,
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
  type GameSetting,
  type InsertCard,
  type InsertPack,
  type InsertUserCard,
  type InsertUserPack,
  type InsertTransaction,
  type InsertGameSession,
  type InsertNotification,
  type InsertShippingRequest,
  type InsertGameSetting,
  type UserCardWithCard,
  type GlobalFeedWithDetails,
  type GameResult,
  type PullRate,
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
  deleteCard(id: string): Promise<void>;
  
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
  openUserPack(packId: string, userId: string): Promise<PackOpenResult>;
  
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
  
  // Game settings operations
  getGameSetting(gameType: string): Promise<GameSetting | undefined>;
  updateGameSetting(gameType: string, price: string, updatedBy?: string): Promise<GameSetting>;
  
  // Pull rate operations
  getPullRates(gameType: string): Promise<PullRate[]>;
  setPullRates(gameType: string, rates: { tier: string; probability: string }[], updatedBy?: string): Promise<void>;
}

interface PackOpenResult {
  userCard: UserCard;
  packCards: Array<{
    id: string;
    name: string;
    tier: string;
    imageUrl?: string;
    marketValue: string;
    isHit: boolean;
    position: number;
  }>;
  hitCardPosition: number;
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

  async deleteCard(id: string): Promise<void> {
    await db.update(cards).set({ isActive: false }).where(eq(cards.id, id));
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

  async openUserPack(packId: string, userId: string): Promise<PackOpenResult> {
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

      // Generate 8 common cards + 1 hit card = 9 total cards
      const packCards = [];
      
      // Get 8 random common cards
      const commonCards = await tx
        .select()
        .from(cards)
        .where(and(
          eq(cards.tier, 'common'),
          eq(cards.isActive, true),
          sql`${cards.stock} > 0`
        ));
      
      if (commonCards.length === 0) {
        throw new Error('No common cards available');
      }
      
      for (let i = 0; i < 8; i++) {
        const randomCommon = commonCards[Math.floor(Math.random() * commonCards.length)];
        packCards.push({
          id: randomCommon.id,
          name: randomCommon.name,
          tier: randomCommon.tier,
          imageUrl: randomCommon.imageUrl || undefined,
          marketValue: randomCommon.marketValue,
          isHit: false,
          position: i
        });
      }
      
      // Select the hit card from available cards of selected tier
      const hitCard = availableCards[Math.floor(Math.random() * availableCards.length)];
      packCards.push({
        id: hitCard.id,
        name: hitCard.name,
        tier: hitCard.tier,
        imageUrl: hitCard.imageUrl || undefined,
        marketValue: hitCard.marketValue,
        isHit: true,
        position: 8
      });
      
      // Group common cards by cardId and count quantities
      const cardQuantities = new Map<string, { card: any, count: number }>();
      
      // Count common cards by type
      packCards.filter(c => !c.isHit).forEach(card => {
        const key = card.id;
        if (cardQuantities.has(key)) {
          cardQuantities.get(key)!.count++;
        } else {
          cardQuantities.set(key, { card, count: 1 });
        }
      });
      
      // Add all cards to user vault
      const userCardInserts = [];
      
      // Insert common cards with quantities
      for (const { card, count } of cardQuantities.values()) {
        // Check if user already has this card
        const [existingCard] = await tx
          .select()
          .from(userCards)
          .where(and(
            eq(userCards.userId, userId),
            eq(userCards.cardId, card.id)
          ));
        
        if (existingCard) {
          // Update quantity if card already exists
          await tx
            .update(userCards)
            .set({ quantity: sql`${userCards.quantity} + ${count}` })
            .where(eq(userCards.id, existingCard.id));
        } else {
          // Insert new card with quantity
          userCardInserts.push({
            userId,
            cardId: card.id,
            pullValue: card.marketValue,
            quantity: count,
          });
        }
      }
      
      // Add hit card
      const [existingHitCard] = await tx
        .select()
        .from(userCards)
        .where(and(
          eq(userCards.userId, userId),
          eq(userCards.cardId, hitCard.id)
        ));
      
      let newUserCard;
      if (existingHitCard) {
        // Update quantity if hit card already exists
        await tx
          .update(userCards)
          .set({ quantity: sql`${userCards.quantity} + 1` })
          .where(eq(userCards.id, existingHitCard.id));
        newUserCard = existingHitCard;
      } else {
        // Insert new hit card
        userCardInserts.push({
          userId,
          cardId: hitCard.id,
          pullValue: hitCard.marketValue,
          quantity: 1,
        });
      }
      
      // Insert all new cards at once
      if (userCardInserts.length > 0) {
        const insertedCards = await tx.insert(userCards).values(userCardInserts).returning();
        if (!newUserCard) {
          newUserCard = insertedCards.find(c => c.cardId === hitCard.id) || insertedCards[0];
        }
      }

      // Mark pack as opened
      await tx
        .update(userPacks)
        .set({ isOpened: true, openedAt: new Date() })
        .where(eq(userPacks.id, packId));

      // Update card stock for hit card only
      await tx
        .update(cards)
        .set({ stock: sql`${cards.stock} - 1` })
        .where(eq(cards.id, hitCard.id));

      // Add to global feed only if rare or above
      if (['rare', 'superrare', 'legendary'].includes(hitCard.tier)) {
        await tx.insert(globalFeed).values({
          userId,
          cardId: hitCard.id,
          tier: hitCard.tier,
          gameType: 'pack',
        });
      }

      console.log(`Pack opened: Generated ${packCards.length} total cards (${packCards.filter(c => !c.isHit).length} commons + ${packCards.filter(c => c.isHit).length} hit)`);
      
      return {
        userCard: newUserCard,
        packCards: packCards,
        hitCardPosition: 8
      };
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
      .where(sql`${globalFeed.tier} IN ('rare', 'superrare', 'legendary')`)
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

  // Game settings operations
  async getGameSetting(gameType: string): Promise<GameSetting | undefined> {
    const [setting] = await db.select().from(gameSettings).where(eq(gameSettings.gameType, gameType));
    return setting;
  }

  async updateGameSetting(gameType: string, price: string, updatedBy?: string): Promise<GameSetting> {
    const [updated] = await db
      .update(gameSettings)
      .set({ 
        price: price,
        updatedAt: new Date(),
        updatedBy: updatedBy
      })
      .where(eq(gameSettings.gameType, gameType))
      .returning();
    return updated;
  }

  // Pull rate operations
  async getPullRates(gameType: string): Promise<PullRate[]> {
    return await db
      .select()
      .from(pullRates)
      .where(and(eq(pullRates.gameType, gameType), eq(pullRates.isActive, true)))
      .orderBy(pullRates.tier);
  }

  async setPullRates(gameType: string, rates: { tier: string; probability: string }[], updatedBy?: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Deactivate existing rates for this game type
      await tx
        .update(pullRates)
        .set({ isActive: false })
        .where(eq(pullRates.gameType, gameType));

      // Insert new rates
      if (rates.length > 0) {
        await tx.insert(pullRates).values(
          rates.map(rate => ({
            gameType,
            tier: rate.tier,
            probability: rate.probability,
            isActive: true,
            updatedBy: updatedBy
          }))
        );
      }
    });
  }
}

export const storage = new DatabaseStorage();
