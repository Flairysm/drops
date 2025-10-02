import {
  users,
  packs,
  packOdds,
  virtualLibrary,
  inventory,
  specialPacks,
  specialPackCards,
  mysteryPacks,
  mysteryPackCards,
  userCards,
  userPacks,
  globalFeed,
  transactions,
  gameSessions,
  notifications,
  shippingRequests,
  gameSettings,
  systemSettings,
  pullRates,
  type User,
  type UpsertUser,
  type Card,
  type Pack,
  type PackOdds,
  type VirtualLibraryCard,
  type InventoryCard,
  type SpecialPack,
  type InsertSpecialPack,
  type SpecialPackCard,
  type InsertSpecialPackCard,
  type MysteryPack,
  type InsertMysteryPack,
  type MysteryPackCard,
  type InsertMysteryPackCard,
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
  type InsertVirtualLibraryCard,
  type InsertInventoryCard,
  type InsertUserCard,
  type InsertUserPack,
  type InsertTransaction,
  type InsertGameSession,
  type InsertNotification,
  type InsertShippingRequest,
  type InsertGameSetting,
  type SystemSetting,
  type InsertSystemSetting,
  type UserCardWithCard,
  type GlobalFeedWithDetails,
  type GameResult,
  type PullRate,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: Omit<UpsertUser, 'id'>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Card operations (using inventory instead of cards table)
  
  // Pack operations
  getPacks(): Promise<Pack[]>;
  getActivePacks(): Promise<Pack[]>;
  createPack(pack: InsertPack): Promise<Pack>;
  
  // Pack odds operations
  getPackOdds(packId: string): Promise<PackOdds[]>;
  setPackOdds(packId: string, odds: { tier: string; probability: string }[]): Promise<void>;
  
  // Virtual library operations (separate from mystery pack cards)
  getVirtualLibraryCards(): Promise<VirtualLibraryCard[]>;
  createVirtualLibraryCard(card: InsertVirtualLibraryCard): Promise<VirtualLibraryCard>;
  updateVirtualLibraryCard(id: string, card: Partial<InsertVirtualLibraryCard>): Promise<VirtualLibraryCard>;
  deleteVirtualLibraryCard(id: string): Promise<void>;
  
  
  // Vault operations
  getUserCards(userId: string): Promise<UserCardWithCard[]>;
  addUserCard(userCard: InsertUserCard): Promise<UserCard>;
  refundCards(cardIds: string[], userId: string): Promise<void>;
  refundCardsAsync(cardIds: string[], userId: string): Promise<void>;
  
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
  setUserCredits(userId: string, credits: number): Promise<void>;
  getSystemStats(): Promise<{ totalUsers: number; totalRevenue: string; totalCards: number }>;
  
  // Game settings operations
  getGameSetting(gameType: string): Promise<GameSetting | undefined>;
  updateGameSetting(gameType: string, price: string, updatedBy?: string): Promise<GameSetting>;
  
  // System settings operations
  getSystemSetting(settingKey: string): Promise<SystemSetting | undefined>;
  updateSystemSetting(settingKey: string, settingValue: boolean, updatedBy?: string): Promise<SystemSetting>;
  getAllSystemSettings(): Promise<SystemSetting[]>;
  
  // Pull rate operations
  getPackPullRates(packType: string): Promise<PullRate[]>;
  setPackPullRates(packType: string, rates: { cardTier: string; probability: number }[], updatedBy?: string): Promise<void>;
  getAllPullRates(): Promise<PullRate[]>;
  
  // Inventory operations
  getInventoryCards(): Promise<InventoryCard[]>;
  createInventoryCard(card: InsertInventoryCard): Promise<InventoryCard>;
  updateInventoryCard(id: string, card: Partial<InsertInventoryCard>): Promise<InventoryCard>;
  deleteInventoryCard(id: string): Promise<void>;
  
  // Special Packs
  getSpecialPacks(): Promise<Array<SpecialPack & { cards: Array<SpecialPackCard & { card: InventoryCard }> }>>;
  getSpecialPackById(id: string): Promise<SpecialPack & { cards: Array<SpecialPackCard & { card: InventoryCard }> }>;
  createSpecialPack(pack: InsertSpecialPack): Promise<SpecialPack>;
  updateSpecialPack(id: string, pack: Partial<InsertSpecialPack>): Promise<SpecialPack>;
  deleteSpecialPack(id: string): Promise<void>;
  
  // Classic Packs
  getClassicPacks(): Promise<Array<SpecialPack & { cards: Array<SpecialPackCard & { card: InventoryCard }> }>>;
  getClassicPackById(id: string): Promise<SpecialPack & { cards: Array<SpecialPackCard & { card: InventoryCard }> }>;
  createClassicPack(pack: any): Promise<SpecialPack>;
  updateClassicPack(id: string, pack: any): Promise<SpecialPack>;
  deleteClassicPack(id: string): Promise<void>;
  
  // Special Pack Cards
  addCardToSpecialPack(packId: string, cardId: string, quantity?: number): Promise<SpecialPackCard>;
  removeCardFromSpecialPack(packId: string, specialPackCardId: string): Promise<void>;
  updateSpecialPackCardQuantity(packId: string, specialPackCardId: string, quantity: number): Promise<SpecialPackCard>;
  
  // Mystery Packs
  getMysteryPacks(): Promise<Array<MysteryPack & { cards: Array<MysteryPackCard & { card: InventoryCard }> }>>;
  getMysteryPackById(id: string): Promise<MysteryPack & { cards: Array<MysteryPackCard & { card: InventoryCard }> }>;
  createMysteryPack(pack: InsertMysteryPack): Promise<MysteryPack>;
  updateMysteryPack(id: string, pack: Partial<InsertMysteryPack>): Promise<MysteryPack>;
  deleteMysteryPack(id: string): Promise<void>;
  
  // Mystery Pack Cards
  addCardToMysteryPack(packId: string, cardId: string, quantity?: number): Promise<MysteryPackCard>;
  removeCardFromMysteryPack(packId: string, cardId: string): Promise<void>;
  updateMysteryPackCardQuantity(packId: string, mysteryPackCardId: string, quantity: number): Promise<MysteryPackCard>;
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
  packType: string;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: Omit<UpsertUser, 'id'>): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        credits: "50.00", // Give new users 50 credits
      })
      .returning();
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

  // Card operations (using inventory instead of cards table)

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

  // Virtual pack operations
  // Virtual library methods
  async getVirtualLibraryCards(): Promise<VirtualLibraryCard[]> {
    return await db.select().from(virtualLibrary).where(eq(virtualLibrary.isActive, true));
  }

  async createVirtualLibraryCard(card: InsertVirtualLibraryCard): Promise<VirtualLibraryCard> {
    const [newCard] = await db.insert(virtualLibrary).values(card).returning();
    return newCard;
  }

  async updateVirtualLibraryCard(id: string, card: Partial<InsertVirtualLibraryCard>): Promise<VirtualLibraryCard> {
    const [updatedCard] = await db.update(virtualLibrary)
      .set(card)
      .where(eq(virtualLibrary.id, id))
      .returning();
    return updatedCard;
  }

  async deleteVirtualLibraryCard(id: string): Promise<void> {
    await db.update(virtualLibrary)
      .set({ isActive: false })
      .where(eq(virtualLibrary.id, id));
  }




  // Vault operations
  async getUserCards(userId: string): Promise<UserCardWithCard[]> {
    // First get all user cards
    const userCardsResult = await db
      .select()
      .from(userCards)
      .where(and(eq(userCards.userId, userId), eq(userCards.isRefunded, false), eq(userCards.isShipped, false)))
      .orderBy(desc(userCards.pulledAt));

    // Then get inventory details for valid UUIDs only
    const validCardIds = userCardsResult
      .map(card => card.cardId)
      .filter((cardId): cardId is string => cardId !== null && this.isValidUUID(cardId));

    const inventoryResult = validCardIds.length > 0 
      ? await db
          .select()
          .from(inventory)
          .where(inArray(inventory.id, validCardIds))
      : [];

    // Create a map for quick lookup
    const inventoryMap = new Map(inventoryResult.map(item => [item.id, item]));

    // Combine the results
    const result = userCardsResult.map(userCard => ({
      ...userCard,
      card: userCard.cardId ? inventoryMap.get(userCard.cardId) || null : null
    }));

    return result.map(row => ({
      ...row,
      card: row.card ? {
        ...row.card,
        // Add missing fields that the old cards table had
        isActive: true,
        packType: 'inventory',
        marketValue: row.card.credits.toString(),
        stock: null,
      } : null,
    })).filter(item => item.card !== null) as UserCardWithCard[];
  }

  async addUserCard(userCard: InsertUserCard): Promise<UserCard> {
    return await db.transaction(async (tx) => {
      try {
        // Get the card's current market value for pull_value
        if (!userCard.cardId) {
          throw new Error('Card ID is required');
        }
        
        const [card] = await tx
          .select({ credits: inventory.credits })
          .from(inventory)
          .where(eq(inventory.id, userCard.cardId))
          .limit(1);

        const pullValue = card?.credits || 0;

        // Insert user card into vault
        await tx.insert(userCards).values({
          ...userCard,
          pullValue: pullValue.toString(),
          isRefunded: userCard.isRefunded ?? false,
          isShipped: userCard.isShipped ?? false,
        });
        
        // Stock management removed - using inventory system instead
        // if (userCard.cardId) {
        //   await tx
        //     .update(inventory)
        //     .set({ stock: sql`${inventory.stock} - ${userCard.quantity || 1}` })
        //     .where(eq(inventory.id, userCard.cardId));
        // }
        
        // Fetch the most recent card for this user and cardId
        const [newUserCard] = await tx
          .select()
          .from(userCards)
          .where(and(
            eq(userCards.userId, userCard.userId!),
            eq(userCards.cardId, userCard.cardId!)
          ))
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
    });
  }

  async refundCards(cardIds: string[], userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // First get all user cards to refund
      const userCardsToRefund = await tx
        .select({
          id: userCards.id,
          cardId: userCards.cardId,
          pullValue: userCards.pullValue,
          quantity: userCards.quantity,
        })
        .from(userCards)
        .where(and(inArray(userCards.id, cardIds), eq(userCards.userId, userId)));

      // Filter for valid UUIDs and get inventory details
      const validCardIds = userCardsToRefund
        .map(card => card.cardId)
        .filter((cardId): cardId is string => cardId !== null && this.isValidUUID(cardId));

      const inventoryDetails = validCardIds.length > 0
        ? await tx
            .select()
            .from(inventory)
            .where(inArray(inventory.id, validCardIds))
        : [];

      // Create a map for quick lookup
      const inventoryMap = new Map(inventoryDetails.map(item => [item.id, item]));

      // Combine the results
      const cardsToRefund = userCardsToRefund.map(userCard => ({
        ...userCard,
        marketValue: userCard.pullValue, // Use pullValue as marketValue
        inventoryCard: userCard.cardId ? inventoryMap.get(userCard.cardId) || null : null
      }));

      // Calculate total refund amount
      let totalRefund = 0;
      for (const card of cardsToRefund) {
        const refundAmount = parseFloat(card.pullValue);
        totalRefund += refundAmount;
      }

      // OPTIMIZATION: Bulk operations instead of individual queries
      if (cardsToRefund.length > 0) {
        // Get all inventory card IDs that need to be added back to packs
        const inventoryCardIds = cardsToRefund
          .filter(card => card.inventoryCard)
          .map(card => card.inventoryCard!.id);

        if (inventoryCardIds.length > 0) {
          // Bulk fetch all pack cards that match the inventory cards
          const packCards = await tx
            .select()
            .from(specialPackCards)
            .where(inArray(specialPackCards.cardId, inventoryCardIds));

          // Create a map for quick lookup
          const packCardMap = new Map(packCards.map(pc => [pc.cardId, pc]));

          // Group cards by pack card ID for bulk updates
          const packUpdates = new Map<string, number>();
          
          for (const card of cardsToRefund) {
            if (card.inventoryCard) {
              const packCard = packCardMap.get(card.inventoryCard.id);
              if (packCard) {
                const currentQuantity = packUpdates.get(packCard.id) || 0;
                packUpdates.set(packCard.id, currentQuantity + (card.quantity || 1));
              }
            }
          }

          // Bulk update pack quantities
          for (const [packCardId, totalQuantity] of Array.from(packUpdates.entries())) {
            await tx
              .update(specialPackCards)
              .set({ 
                quantity: sql`${specialPackCards.quantity} + ${totalQuantity}` 
              })
              .where(eq(specialPackCards.id, packCardId));
          }

          console.log(`✅ Bulk updated ${packUpdates.size} pack cards with refunded quantities`);
        }
      }

      // Mark cards as refunded (bulk operation)
      console.log(`🔄 Marking ${cardIds.length} cards as refunded for user ${userId}`);
      const updateResult = await tx
        .update(userCards)
        .set({ isRefunded: true })
        .where(and(inArray(userCards.id, cardIds), eq(userCards.userId, userId)));
      
      console.log(`✅ Update result:`, updateResult);

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

  // Async refund function - processes refunds in background without blocking
  async refundCardsAsync(cardIds: string[], userId: string): Promise<void> {
    console.log(`🔄 Starting async refund processing for ${cardIds.length} cards for user ${userId}`);
    console.log(`🔄 Card IDs to refund:`, cardIds);
    
    try {
      // Use the same optimized refund logic but without blocking the response
      await this.refundCards(cardIds, userId);
      console.log(`✅ Async refund processing completed for ${cardIds.length} cards for user ${userId}`);
      
      // Verify the cards were actually marked as refunded
      const refundedCards = await db
        .select()
        .from(userCards)
        .where(and(inArray(userCards.id, cardIds), eq(userCards.userId, userId)));
      
      console.log(`🔍 Verification: Found ${refundedCards.length} cards after refund processing`);
      refundedCards.forEach(card => {
        console.log(`🔍 Card ${card.id}: isRefunded=${card.isRefunded}`);
      });
      
      // Add notification about successful processing
      await this.addNotification({
        userId,
        type: 'refund',
        title: 'Refund Processing Complete',
        message: `Successfully processed refund for ${cardIds.length} cards`,
      });
    } catch (error) {
      console.error(`❌ Async refund processing failed for user ${userId}:`, error);
      
      // Add error notification
      await this.addNotification({
        userId,
        type: 'error',
        title: 'Refund Processing Error',
        message: `Failed to process refund for ${cardIds.length} cards. Please contact support.`,
      });
    }
  }

  // User pack operations
  async getUserPacks(userId: string): Promise<UserPack[]> {
    console.log('Storage: getUserPacks called for userId:', userId);
    const packs = await db
      .select()
      .from(userPacks)
      .where(and(eq(userPacks.userId, userId), eq(userPacks.isOpened, false)))
      .orderBy(desc(userPacks.earnedAt));
    console.log('Storage: getUserPacks result:', packs.length, 'packs found');
    return packs;
  }

  async addUserPack(userPack: InsertUserPack): Promise<UserPack> {
    console.log('Storage: addUserPack called with:', userPack);
    const [newUserPack] = await db.insert(userPacks).values(userPack).returning();
    console.log('Storage: addUserPack result:', newUserPack);
    return newUserPack;
  }

  private async openMysteryPack(tx: any, userPack: any, mysteryPack: any, userId: string): Promise<PackOpenResult> {
    // Get all cards in the mystery pack pool
    const packCards = await tx
      .select({
        id: mysteryPackCards.id,
        packId: mysteryPackCards.packId,
        cardId: mysteryPackCards.cardId,
        quantity: mysteryPackCards.quantity,
        createdAt: mysteryPackCards.createdAt,
        card: {
          id: inventory.id,
          name: inventory.name,
          imageUrl: inventory.imageUrl,
          credits: inventory.credits,
          tier: inventory.tier,
          createdAt: inventory.createdAt,
          updatedAt: inventory.updatedAt,
        }
      })
      .from(mysteryPackCards)
      .innerJoin(inventory, eq(mysteryPackCards.cardId, inventory.id))
      .where(eq(mysteryPackCards.packId, mysteryPack.id));

    if (packCards.length === 0) {
      throw new Error('No cards available in mystery pack');
    }

    // Create 8 cards: 7 commons + 1 hit (4x2 grid format)
    const selectedCards = [];
    const cardsToDeduct: { mysteryPackCardId: string; quantity: number }[] = [];
    
    // Add 7 common cards
    const commonCards = packCards.filter((pc: any) => pc.card?.tier === 'D');
    
    if (commonCards.length > 0) {
      for (let i = 0; i < 7; i++) {
        const randomCommon = commonCards[Math.floor(Math.random() * commonCards.length)];
        if (randomCommon.card) {
          selectedCards.push({
            id: randomCommon.card.id,
            name: randomCommon.card.name || "Common Card",
            imageUrl: randomCommon.card.imageUrl || "/card-images/random-common-card.png",
            tier: randomCommon.card.tier || "D",
            marketValue: randomCommon.card.credits || 10,
            isHit: false,
            position: i
          });
          
          const existingDeduction = cardsToDeduct.find(d => d.mysteryPackCardId === randomCommon.id);
          if (existingDeduction) {
            existingDeduction.quantity++;
          } else {
            cardsToDeduct.push({ mysteryPackCardId: randomCommon.id, quantity: 1 });
          }
        }
      }
    } else {
      throw new Error('No common cards found in mystery pack pool');
    }

    // Add 1 hit card
    const hitCards = packCards.filter((pc: any) => pc.card && ['C', 'B', 'A', 'S', 'SS', 'SSS'].includes(pc.card.tier));
    
    if (hitCards.length > 0) {
      const randomHit = hitCards[Math.floor(Math.random() * hitCards.length)];
      if (randomHit.card) {
        selectedCards.push({
          id: randomHit.card.id,
          name: randomHit.card.name || 'Hit Card',
          imageUrl: randomHit.card.imageUrl || '/card-images/random-common-card.png',
          tier: randomHit.card.tier || 'C',
          marketValue: randomHit.card.credits || 100,
          isHit: true,
          position: 7
        });
        
        const existingDeduction = cardsToDeduct.find(d => d.mysteryPackCardId === randomHit.id);
        if (existingDeduction) {
          existingDeduction.quantity++;
        } else {
          cardsToDeduct.push({ mysteryPackCardId: randomHit.id, quantity: 1 });
        }
      }
    } else if (commonCards.length > 0) {
      // Fallback: if no hit cards, pick another common
      const randomCommon = commonCards[Math.floor(Math.random() * commonCards.length)];
      if (randomCommon.card) {
        selectedCards.push({
          id: randomCommon.card.id,
          name: randomCommon.card.name || 'Common Card',
          imageUrl: randomCommon.card.imageUrl || '/card-images/random-common-card.png',
          tier: randomCommon.card.tier || 'D',
          marketValue: randomCommon.card.credits || 10,
          isHit: false,
          position: 7
        });
        
        const existingDeduction = cardsToDeduct.find(d => d.mysteryPackCardId === randomCommon.id);
        if (existingDeduction) {
          existingDeduction.quantity++;
        } else {
          cardsToDeduct.push({ mysteryPackCardId: randomCommon.id, quantity: 1 });
        }
      }
    } else {
      throw new Error('No cards available for mystery pack');
    }

    if (selectedCards.length === 0) {
      throw new Error('Could not select any cards from the mystery pack pool');
    }

    // Deduct quantities from mysteryPackCards
    for (const deduction of cardsToDeduct) {
      await tx
        .update(mysteryPackCards)
        .set({ quantity: sql`${mysteryPackCards.quantity} - ${deduction.quantity}` })
        .where(eq(mysteryPackCards.id, deduction.mysteryPackCardId));
    }

    // Add cards to user's vault
    for (const card of selectedCards) {
      await this.addUserCard({
        userId,
        cardId: card.id,
        quantity: 1,
        pullValue: card.marketValue.toString(),
        isRefunded: false,
        isShipped: false,
      });
    }

    // Mark user pack as opened
    await tx
      .update(userPacks)
      .set({ 
        isOpened: true, 
        openedAt: new Date() 
      })
      .where(eq(userPacks.id, userPack.id));

    // Add to global feed
    await tx.insert(globalFeed).values({
      userId,
      cardId: selectedCards[7]?.id || selectedCards[0].id, // Use hit card or first card
      tier: selectedCards[7]?.tier || selectedCards[0].tier,
      gameType: userPack.earnedFrom,
    });

    return {
      userCard: {
        id: '',
        userId: null,
        cardId: null,
        pullValue: '0',
        quantity: 0,
        pulledAt: null,
        isRefunded: null,
        isShipped: null,
      }, // Not used in new format
      packCards: selectedCards,
      hitCardPosition: 7, // The 8th card (index 7) is the hit card
      packType: userPack.tier || 'mystery', // Use the pack tier as the pack type
    };
  }

  async openUserPack(packId: string, userId: string): Promise<PackOpenResult> {
    return await db.transaction(async (tx) => {
      try {
        // Get the pack to open with row locking
        const [userPack] = await tx
          .select()
          .from(userPacks)
          .where(and(
            eq(userPacks.id, packId),
            eq(userPacks.userId, userId),
            eq(userPacks.isOpened, false)
          ))
          .for('update');

        if (!userPack) {
          throw new Error('Pack not found or already opened');
        }

        // Check if this is a mystery pack by looking up the pack in mysteryPacks table
        if (!userPack.packId) {
          throw new Error('Pack ID is missing');
        }
        
        const mysteryPack = await tx
          .select()
          .from(mysteryPacks)
          .where(eq(mysteryPacks.id, userPack.packId))
          .limit(1);

        if (mysteryPack.length > 0) {
          // This is a mystery pack - handle it with the new logic
          return await this.openMysteryPack(tx, userPack, mysteryPack[0], userId);
        }

        // Regular pack logic continues below
        // Get pack pull rates for this pack type
        const rates = await tx
          .select()
          .from(pullRates)
          .where(and(eq(pullRates.packType, userPack.tier), eq(pullRates.isActive, true)))
          .orderBy(pullRates.cardTier);

        if (rates.length === 0) {
          throw new Error('No pull rates configured for this pack type');
        }

      // Weighted random selection based on percentages
      const random = Math.random() * 100; // 0-100
      let cumulative = 0;
      let selectedTier = rates[0].cardTier;

      for (const rate of rates) {
        cumulative += rate.probability;
        if (random <= cumulative) {
          selectedTier = rate.cardTier;
          break;
        }
      }

      const fullTierName = selectedTier;

      // Get cards of the selected tier
      const availableCards = await tx
        .select()
        .from(inventory)
        .where(and(
          eq(inventory.tier, fullTierName)
        ));

      if (availableCards.length === 0) {
        throw new Error(`No available cards in tier ${fullTierName}`);
      }

      // Generate 8 D-tier cards + 1 hit card = 9 total cards
      const packCards = [];
      
      // Get 8 random D-tier cards (guaranteed base cards)
      const commonCards = await tx
        .select()
        .from(inventory)
        .where(and(
          eq(inventory.tier, 'D')
        ));
      
      if (commonCards.length === 0) {
        throw new Error('No D-tier cards available');
      }
      
      for (let i = 0; i < 8; i++) {
        const randomCommon = commonCards[Math.floor(Math.random() * commonCards.length)];
        packCards.push({
          id: randomCommon.id,
          name: randomCommon.name,
          tier: randomCommon.tier,
          imageUrl: randomCommon.imageUrl || undefined,
          marketValue: randomCommon.credits.toString(),
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
        marketValue: hitCard.credits.toString(),
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
      for (const { card, count } of Array.from(cardQuantities.values())) {
        // Check if user already has this card with row-level locking
        const [existingCard] = await tx
          .select()
          .from(userCards)
          .where(and(
            eq(userCards.userId, userId),
            eq(userCards.cardId, card.id),
            eq(userCards.isRefunded, false),
            eq(userCards.isShipped, false)
          ))
          .for('update');
        
        if (existingCard) {
          // Update quantity if card already exists
          await tx
            .update(userCards)
            .set({ 
              quantity: sql`${userCards.quantity} + ${count}`,
              pulledAt: sql`NOW()` // Update pulled time to latest
            })
            .where(eq(userCards.id, existingCard.id));
          
          // Stock management removed - using inventory system instead
          // await tx
          //   .update(inventory)
          //   .set({ stock: sql`${inventory.stock} - ${count}` })
          //   .where(eq(inventory.id, card.id));
        } else {
          // Insert new card with quantity
          userCardInserts.push({
            userId,
            cardId: card.id,
            pullValue: card.marketValue,
            quantity: count,
            isRefunded: false,
            isShipped: false,
          });
        }
      }
      
      // Add hit card with row-level locking
      const [existingHitCard] = await tx
        .select()
        .from(userCards)
        .where(and(
          eq(userCards.userId, userId),
          eq(userCards.cardId, hitCard.id),
          eq(userCards.isRefunded, false),
          eq(userCards.isShipped, false)
        ))
        .for('update');
      
      let newUserCard;
      if (existingHitCard) {
        // Update quantity if hit card already exists
        const updatedCards = await tx
          .update(userCards)
          .set({ 
            quantity: sql`${userCards.quantity} + 1`,
            pulledAt: sql`NOW()` // Update pulled time to latest
          })
          .where(eq(userCards.id, existingHitCard.id))
          .returning();
        newUserCard = updatedCards[0];
        
        // Stock management removed - using inventory system instead
        // await tx
        //   .update(inventory)
        //   .set({ stock: sql`${inventory.stock} - 1` })
        //   .where(eq(inventory.id, hitCard.id));
      } else {
        // Insert new hit card
        userCardInserts.push({
          userId,
          cardId: hitCard.id,
          pullValue: hitCard.credits.toString(),
          quantity: 1,
          isRefunded: false,
          isShipped: false,
        });
      }
      
      // Insert all new cards at once
      if (userCardInserts.length > 0) {
        try {
          const insertedCards = await tx.insert(userCards).values(userCardInserts).returning();
          if (!newUserCard) {
            newUserCard = insertedCards.find(c => c.cardId === hitCard.id) || insertedCards[0];
          }
          
          // Stock management removed - using inventory system instead
          // for (const userCardInsert of userCardInserts) {
          //   await tx
          //     .update(inventory)
          //     .set({ stock: sql`${inventory.stock} - ${userCardInsert.quantity}` })
          //     .where(eq(inventory.id, userCardInsert.cardId!));
          // }
        } catch (error) {
          console.error('Failed to insert user cards:', error);
          throw new Error('Failed to add cards to vault - please try again');
        }
      }

      // Mark pack as opened
      await tx
        .update(userPacks)
        .set({ isOpened: true, openedAt: new Date() })
        .where(eq(userPacks.id, packId));

      // Stock reduction is now handled above for all cards

      // Add to global feed for all hit cards (C-tier and above)
      if (['C', 'B', 'A', 'S', 'SS', 'SSS'].includes(hitCard.tier)) {
        await tx.insert(globalFeed).values({
          userId,
          cardId: hitCard.id,
          tier: hitCard.tier,
          gameType: 'pack',
        });
      }

      
      // Log stock changes for debugging
      
      if (!newUserCard) {
        throw new Error('Failed to create or retrieve user card');
      }
      
      return {
        userCard: newUserCard,
        packCards: packCards,
        hitCardPosition: 8,
        packType: userPack.tier || 'regular'
      };
      } catch (error) {
        console.error('Pack opening transaction failed:', error);
        // Re-throw the error to rollback the transaction
        throw error;
      }
    });
  }

  // Global feed operations
  async getGlobalFeed(limit = 500, minTier?: string): Promise<GlobalFeedWithDetails[]> {
    // Define tier hierarchy for filtering (higher index = rarer tier)
    const tierHierarchy = ['D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
    
    let tierFilter: string[];
    if (minTier) {
      const minIndex = tierHierarchy.indexOf(minTier);
      if (minIndex >= 0) {
        // Include all tiers from minTier and above
        tierFilter = tierHierarchy.slice(minIndex);
      } else {
        // Invalid minTier, default to all non-D tiers
        tierFilter = ['C', 'B', 'A', 'S', 'SS', 'SSS'];
      }
    } else {
      // No filter, show all non-D tiers
      tierFilter = ['C', 'B', 'A', 'S', 'SS', 'SSS'];
    }

    const result = await db
      .select({
        id: globalFeed.id,
        userId: globalFeed.userId,
        cardId: globalFeed.cardId,
        tier: globalFeed.tier,
        gameType: globalFeed.gameType,
        createdAt: globalFeed.createdAt,
        username: users.username,
        email: users.email,
        cardName: inventory.name,
        cardImageUrl: inventory.imageUrl,
        cardMarketValue: inventory.marketValue,
        cardTier: inventory.tier,
      })
      .from(globalFeed)
      .leftJoin(users, eq(globalFeed.userId, users.id))
      .leftJoin(inventory, eq(globalFeed.cardId, inventory.id))
      .where(inArray(globalFeed.tier, tierFilter))
      .orderBy(desc(globalFeed.createdAt))
      .limit(limit);

    return result.map(row => {
      // Create a display name from username or email prefix
      let displayName = row.username;
      if (!displayName && row.email) {
        // Extract username from email (everything before @)
        displayName = row.email.split('@')[0];
      }
      displayName = displayName || 'Unknown';

      return {
        id: row.id,
        userId: row.userId,
        cardId: row.cardId,
        tier: row.tier,
        gameType: row.gameType,
        createdAt: row.createdAt,
        user: { username: displayName },
        card: {
          id: row.cardId,
          name: row.cardName || 'Unknown Card',
          tier: row.cardTier,
          imageUrl: row.cardImageUrl,
          marketValue: row.cardMarketValue,
        } as InventoryCard,
      };
    });
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

  async setUserCredits(userId: string, credits: number): Promise<void> {
    await db.update(users).set({ credits: credits.toString() }).where(eq(users.id, userId));
  }

  async getSystemStats(): Promise<{ totalUsers: number; totalRevenue: string; totalCards: number }> {
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    
    // Only count actual payments (purchase transactions), not game spending
    const [revenueSum] = await db.select({ 
      sum: sql<string>`coalesce(sum(${transactions.amount}), 0)` 
    }).from(transactions).where(eq(transactions.type, 'purchase'));
    
    const [cardCount] = await db.select({ count: sql<number>`count(*)` }).from(inventory);

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
  async getPackPullRates(packType: string): Promise<PullRate[]> {
    return await db
      .select()
      .from(pullRates)
      .where(and(eq(pullRates.packType, packType), eq(pullRates.isActive, true)))
      .orderBy(pullRates.cardTier);
  }

  async getAllPullRates(): Promise<PullRate[]> {
    return await db
      .select()
      .from(pullRates)
      .where(eq(pullRates.isActive, true))
      .orderBy(pullRates.packType, pullRates.cardTier);
  }

  async setPackPullRates(packType: string, rates: { cardTier: string; probability: number }[], updatedBy?: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Deactivate existing rates for this pack type
      await tx
        .update(pullRates)
        .set({ isActive: false })
        .where(eq(pullRates.packType, packType));

      // Insert new rates
      if (rates.length > 0) {
        await tx.insert(pullRates).values(
          rates.map(rate => ({
            packType,
            cardTier: rate.cardTier,
            probability: rate.probability,
            isActive: true,
            updatedBy: updatedBy
          }))
        );
      }
    });
  }

  // System settings operations
  async getSystemSetting(settingKey: string): Promise<SystemSetting | undefined> {
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.settingKey, settingKey));
    return setting;
  }

  async updateSystemSetting(settingKey: string, settingValue: boolean, updatedBy?: string): Promise<SystemSetting> {
    const [updated] = await db
      .insert(systemSettings)
      .values({
        settingKey,
        settingValue,
        updatedBy: updatedBy,
        description: this.getSettingDescription(settingKey),
      })
      .onConflictDoUpdate({
        target: systemSettings.settingKey,
        set: {
          settingValue: settingValue,
          updatedAt: new Date(),
          updatedBy: updatedBy,
        },
      })
      .returning();
    return updated;
  }

  async getAllSystemSettings(): Promise<SystemSetting[]> {
    return await db.select().from(systemSettings).orderBy(systemSettings.settingKey);
  }

  // Inventory operations
  async getInventoryCards(): Promise<InventoryCard[]> {
    return await db.select().from(inventory).orderBy(desc(inventory.createdAt));
  }

  async createInventoryCard(card: InsertInventoryCard): Promise<InventoryCard> {
    const [newCard] = await db.insert(inventory).values(card).returning();
    return newCard;
  }

  async updateInventoryCard(id: string, card: Partial<InsertInventoryCard>): Promise<InventoryCard> {
    const [updatedCard] = await db
      .update(inventory)
      .set({ ...card, updatedAt: new Date() })
      .where(eq(inventory.id, id))
      .returning();
    return updatedCard;
  }

  async deleteInventoryCard(id: string): Promise<void> {
    await db.delete(inventory).where(eq(inventory.id, id));
  }

  // Special Packs
  async getSpecialPacks(): Promise<Array<SpecialPack & { cards: Array<SpecialPackCard & { card: InventoryCard }> }>> {
    try {
      const packs = await db.select().from(specialPacks).where(eq(specialPacks.packType, 'special'));
      console.log('Fetched special packs:', packs);
      
      // Get cards for each pack
      const packsWithCards = await Promise.all(
        packs.map(async (pack) => {
          try {
            const packCards = await db
              .select({
                id: specialPackCards.id,
                packId: specialPackCards.packId,
                cardId: specialPackCards.cardId,
                quantity: specialPackCards.quantity,
                createdAt: specialPackCards.createdAt,
                card: {
                  id: inventory.id,
                  name: inventory.name,
                  imageUrl: inventory.imageUrl,
                  credits: inventory.credits,
                  tier: inventory.tier,
                  createdAt: inventory.createdAt,
                  updatedAt: inventory.updatedAt,
                }
              })
              .from(specialPackCards)
              .innerJoin(inventory, eq(specialPackCards.cardId, inventory.id))
              .where(eq(specialPackCards.packId, pack.id));
            
            console.log(`Pack ${pack.id} cards:`, packCards);
            return { ...pack, cards: packCards };
          } catch (error) {
            console.error(`Error fetching cards for pack ${pack.id}:`, error);
            return { ...pack, cards: [] };
          }
        })
      );
      
      return packsWithCards;
    } catch (error) {
      console.error('Error in getSpecialPacks:', error);
      throw error;
    }
  }

  async getSpecialPackById(id: string): Promise<SpecialPack & { cards: Array<SpecialPackCard & { card: InventoryCard }> }> {
    const [pack] = await db.select().from(specialPacks).where(and(eq(specialPacks.id, id), eq(specialPacks.packType, 'special')));
    if (!pack) {
      throw new Error('Special pack not found');
    }

    // Get cards for this special pack
    const packCards = await db
      .select({
        id: specialPackCards.id,
        packId: specialPackCards.packId,
        cardId: specialPackCards.cardId,
        quantity: specialPackCards.quantity,
        createdAt: specialPackCards.createdAt,
        card: {
          id: inventory.id,
          name: inventory.name,
          imageUrl: inventory.imageUrl,
          credits: inventory.credits,
          tier: inventory.tier,
          createdAt: inventory.createdAt,
          updatedAt: inventory.updatedAt,
        }
      })
      .from(specialPackCards)
      .innerJoin(inventory, eq(specialPackCards.cardId, inventory.id))
      .where(eq(specialPackCards.packId, id));

    return { ...pack, cards: packCards };
  }

  async createSpecialPack(pack: InsertSpecialPack): Promise<SpecialPack> {
    try {
      
      const packWithType = { ...pack, packType: 'special' };
      const [newPack] = await db.insert(specialPacks).values(packWithType).returning();
      console.log('Storage: Created special pack:', newPack);
      return newPack;
    } catch (error: any) {
      console.error('Storage: Error creating special pack:', error);
      console.error('Storage: Error message:', error.message);
      console.error('Storage: Error code:', error.code);
      throw error;
    }
  }

  async updateSpecialPack(id: string, pack: Partial<InsertSpecialPack>): Promise<SpecialPack> {
    const packWithType = { ...pack, packType: 'special' };
    const [updatedPack] = await db
      .update(specialPacks)
      .set(packWithType)
      .where(and(eq(specialPacks.id, id), eq(specialPacks.packType, 'special')))
      .returning();
    return updatedPack;
  }

  async deleteSpecialPack(id: string): Promise<void> {
    await db.delete(specialPacks).where(and(eq(specialPacks.id, id), eq(specialPacks.packType, 'special')));
  }

  // Special Pack Cards
  async addCardToSpecialPack(packId: string, cardId: string, quantity: number = 1): Promise<SpecialPackCard> {
    console.log('Storage: addCardToSpecialPack called with:', { packId, cardId, quantity });
    
    const existingCard = await db
      .select()
      .from(specialPackCards)
      .where(and(eq(specialPackCards.packId, packId), eq(specialPackCards.cardId, cardId)))
      .limit(1);

    console.log('Storage: existing card check result:', existingCard);

    if (existingCard.length > 0) {
      // Update existing card quantity
      console.log('Storage: updating existing card quantity');
      const [updatedCard] = await db
        .update(specialPackCards)
        .set({ quantity: existingCard[0].quantity + quantity })
        .where(eq(specialPackCards.id, existingCard[0].id))
        .returning();
      console.log('Storage: updated card:', updatedCard);
      return updatedCard;
    } else {
      // Create new card entry
      console.log('Storage: creating new card entry');
      const newCardData = {
        id: `spc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        packId,
        cardId,
        quantity
      };
      console.log('Storage: new card data:', newCardData);
      
      const [newCard] = await db
        .insert(specialPackCards)
        .values(newCardData)
        .returning();
      console.log('Storage: created new card:', newCard);
      return newCard;
    }
  }

  async removeCardFromSpecialPack(packId: string, specialPackCardId: string): Promise<void> {
    try {
      console.log('Removing card from special pack:', { packId, specialPackCardId });
      const result = await db
        .delete(specialPackCards)
        .where(and(eq(specialPackCards.packId, packId), eq(specialPackCards.id, specialPackCardId)));
      console.log('Delete result:', result);
    } catch (error) {
      console.error('Error in removeCardFromSpecialPack:', error);
      throw error;
    }
  }

  async updateSpecialPackCardQuantity(packId: string, specialPackCardId: string, quantity: number): Promise<SpecialPackCard> {
    const [updatedCard] = await db
      .update(specialPackCards)
      .set({ quantity })
      .where(and(eq(specialPackCards.packId, packId), eq(specialPackCards.id, specialPackCardId)))
      .returning();
    return updatedCard;
  }

  // Mystery Packs
  async getMysteryPacks(): Promise<Array<MysteryPack & { cards: Array<MysteryPackCard & { card: InventoryCard }> }>> {
    const packs = await db.select().from(mysteryPacks);
    // For now, return packs with empty cards array
    // TODO: Implement proper join with mysteryPackCards and inventory tables
    return packs.map(pack => ({ ...pack, cards: [] }));
  }

  async getMysteryPackById(id: string): Promise<MysteryPack & { cards: Array<MysteryPackCard & { card: InventoryCard }> }> {
    const [pack] = await db.select().from(mysteryPacks).where(eq(mysteryPacks.id, id));
    if (!pack) {
      throw new Error('Mystery pack not found');
    }

    // Get cards for this mystery pack
    const packCards = await db
      .select({
        id: mysteryPackCards.id,
        packId: mysteryPackCards.packId,
        cardId: mysteryPackCards.cardId,
        quantity: mysteryPackCards.quantity,
        createdAt: mysteryPackCards.createdAt,
        card: {
          id: inventory.id,
          name: inventory.name,
          imageUrl: inventory.imageUrl,
          credits: inventory.credits,
          tier: inventory.tier,
          createdAt: inventory.createdAt,
          updatedAt: inventory.updatedAt,
        }
      })
      .from(mysteryPackCards)
      .innerJoin(inventory, eq(mysteryPackCards.cardId, inventory.id))
      .where(eq(mysteryPackCards.packId, id));

    return { ...pack, cards: packCards };
  }

  async createMysteryPack(pack: InsertMysteryPack): Promise<MysteryPack> {
    try {
      console.log('Storage: Creating mystery pack with data:', pack);

      const [newPack] = await db
        .insert(mysteryPacks)
        .values(pack)
        .returning();

      console.log('Storage: Created mystery pack:', newPack);
      return newPack;
    } catch (error: any) {
      console.error('Storage: Error creating mystery pack:', error);
      console.error('Storage: Error message:', error.message);
      console.error('Storage: Error code:', error.code);
      throw new Error(`Failed to create mystery pack: ${error.message}`);
    }
  }

  async updateMysteryPack(id: string, pack: Partial<InsertMysteryPack>): Promise<MysteryPack> {
    const [updatedPack] = await db
      .update(mysteryPacks)
      .set(pack)
      .where(eq(mysteryPacks.id, id))
      .returning();
    return updatedPack;
  }

  async deleteMysteryPack(id: string): Promise<void> {
    await db.delete(mysteryPacks).where(eq(mysteryPacks.id, id));
  }

  async addCardToMysteryPack(packId: string, cardId: string, quantity: number = 1): Promise<MysteryPackCard> {
    console.log('Storage: addCardToMysteryPack called with:', { packId, cardId, quantity });

    // Check if card already exists in pack
    const existingCard = await db
      .select()
      .from(mysteryPackCards)
      .where(and(eq(mysteryPackCards.packId, packId), eq(mysteryPackCards.cardId, cardId)));

    console.log('Storage: existing card check result:', existingCard);

    if (existingCard.length > 0) {
      // Update existing card quantity
      console.log('Storage: updating existing card quantity');
      const [updatedCard] = await db
        .update(mysteryPackCards)
        .set({ quantity: existingCard[0].quantity + quantity })
        .where(and(eq(mysteryPackCards.packId, packId), eq(mysteryPackCards.cardId, cardId)))
        .returning();
      
      console.log('Storage: updated card:', updatedCard);
      return updatedCard;
    } else {
      // Create new card entry
      console.log('Storage: creating new card entry');
      const newCardData = {
        id: `mpc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        packId,
        cardId,
        quantity
      };
      
      console.log('Storage: new card data:', newCardData);
      
      const [newCard] = await db
        .insert(mysteryPackCards)
        .values(newCardData)
        .returning();
      
      console.log('Storage: created new card:', newCard);
      return newCard;
    }
  }

  async removeCardFromMysteryPack(packId: string, cardId: string): Promise<void> {
    await db
      .delete(mysteryPackCards)
      .where(and(eq(mysteryPackCards.packId, packId), eq(mysteryPackCards.cardId, cardId)));
  }

  async updateMysteryPackCardQuantity(packId: string, mysteryPackCardId: string, quantity: number): Promise<MysteryPackCard> {
    const [updatedCard] = await db
      .update(mysteryPackCards)
      .set({ quantity })
      .where(and(eq(mysteryPackCards.packId, packId), eq(mysteryPackCards.id, mysteryPackCardId)))
      .returning();
    return updatedCard;
  }

  // Classic Packs (separate from special packs)
  async getClassicPacks(): Promise<Array<SpecialPack & { cards: Array<SpecialPackCard & { card: InventoryCard }> }>> {
    try {
      const packs = await db.select().from(specialPacks).where(eq(specialPacks.packType, 'classic'));
      console.log('Fetched classic packs:', packs);
      
      // Get cards for each pack
      const packsWithCards = await Promise.all(
        packs.map(async (pack) => {
          try {
            const packCards = await db
              .select({
                id: specialPackCards.id,
                packId: specialPackCards.packId,
                cardId: specialPackCards.cardId,
                quantity: specialPackCards.quantity,
                createdAt: specialPackCards.createdAt,
                card: {
                  id: inventory.id,
                  name: inventory.name,
                  imageUrl: inventory.imageUrl,
                  credits: inventory.credits,
                  tier: inventory.tier,
                  createdAt: inventory.createdAt,
                  updatedAt: inventory.updatedAt,
                }
              })
              .from(specialPackCards)
              .innerJoin(inventory, eq(specialPackCards.cardId, inventory.id))
              .where(eq(specialPackCards.packId, pack.id));
            
            console.log(`Classic pack ${pack.id} cards:`, packCards);
            return { ...pack, cards: packCards };
          } catch (error) {
            console.error(`Error fetching cards for classic pack ${pack.id}:`, error);
            return { ...pack, cards: [] };
          }
        })
      );
      
      return packsWithCards;
    } catch (error) {
      console.error('Error in getClassicPacks:', error);
      throw error;
    }
  }

  async getClassicPackById(id: string): Promise<SpecialPack & { cards: Array<SpecialPackCard & { card: InventoryCard }> }> {
    const [pack] = await db.select().from(specialPacks).where(and(eq(specialPacks.id, id), eq(specialPacks.packType, 'classic')));
    
    if (!pack) {
      throw new Error('Classic pack not found');
    }

    // Get cards for this classic pack
    const packCards = await db
      .select({
        id: specialPackCards.id,
        packId: specialPackCards.packId,
        cardId: specialPackCards.cardId,
        quantity: specialPackCards.quantity,
        createdAt: specialPackCards.createdAt,
        card: {
          id: inventory.id,
          name: inventory.name,
          imageUrl: inventory.imageUrl,
          credits: inventory.credits,
          tier: inventory.tier,
          createdAt: inventory.createdAt,
          updatedAt: inventory.updatedAt,
        }
      })
      .from(specialPackCards)
      .innerJoin(inventory, eq(specialPackCards.cardId, inventory.id))
      .where(eq(specialPackCards.packId, id));

    return { ...pack, cards: packCards };
  }

  async createClassicPack(packData: any): Promise<SpecialPack> {
    const packWithType = { ...packData, packType: 'classic' };
    const [newPack] = await db.insert(specialPacks).values(packWithType).returning();
    return newPack;
  }

  async updateClassicPack(id: string, packData: any): Promise<SpecialPack> {
    const packWithType = { ...packData, packType: 'classic' };
    const [updatedPack] = await db
      .update(specialPacks)
      .set(packWithType)
      .where(and(eq(specialPacks.id, id), eq(specialPacks.packType, 'classic')))
      .returning();
    return updatedPack;
  }

  async deleteClassicPack(id: string): Promise<void> {
    await db.delete(specialPacks).where(and(eq(specialPacks.id, id), eq(specialPacks.packType, 'classic')));
  }

  // Helper function to validate UUID format
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  async purchaseAndOpenClassicPack(userId: string, packId: string): Promise<{ packCards: any[], hitCardPosition: number }> {
    return await db.transaction(async (tx) => {
      // Get the pack details
      const [pack] = await tx
        .select()
        .from(specialPacks)
        .where(and(eq(specialPacks.id, packId), eq(specialPacks.packType, 'classic')));
      
      if (!pack) {
        throw new Error('Pack not found');
      }

      // Get user details
      const [user] = await tx.select().from(users).where(eq(users.id, userId));
      if (!user) {
        throw new Error('User not found');
      }

      const packPrice = parseFloat(pack.price);
      const userCredits = parseFloat(user.credits || '0');
      if (userCredits < packPrice) {
        throw new Error('Insufficient credits');
      }

      // Deduct credits
      await tx
        .update(users)
        .set({ credits: (userCredits - packPrice).toString() })
        .where(eq(users.id, userId));

      // Deduct pack quantity if totalPacks is set
      if (pack.totalPacks && pack.totalPacks > 0) {
        await tx
          .update(specialPacks)
          .set({ totalPacks: pack.totalPacks - 1 })
          .where(eq(specialPacks.id, packId));
      }

      // Get pack cards
      const packCards = await tx
        .select({
          id: specialPackCards.id,
          cardId: specialPackCards.cardId,
          quantity: specialPackCards.quantity,
          card: {
            id: inventory.id,
            name: inventory.name,
            imageUrl: inventory.imageUrl,
            credits: inventory.credits,
            tier: inventory.tier
          }
        })
        .from(specialPackCards)
        .leftJoin(inventory, eq(specialPackCards.cardId, inventory.id))
        .where(eq(specialPackCards.packId, packId));

      // Create 8 cards: 7 commons + 1 hit
      const selectedCards = [];
      
      // Add 7 common cards from the pack's prize pool
      const commonCards = packCards.filter(pc => 
        pc.card?.tier === 'D' || pc.card?.name === 'Common Card'
      );
      
      const selectedCommonCards = [];
      if (commonCards.length > 0) {
        // Use existing common cards from the pack - ALWAYS use the existing card ID
        for (let i = 0; i < 7; i++) {
          const randomCommonCard = commonCards[Math.floor(Math.random() * commonCards.length)];
          const cardId = randomCommonCard.card?.id;
          if (!cardId) {
            throw new Error('Common card missing ID in pack prize pool');
          }
          selectedCommonCards.push(randomCommonCard);
          selectedCards.push({
            id: cardId, // Always use the existing card ID from the pack
            name: randomCommonCard.card?.name || "Common Card",
            imageUrl: randomCommonCard.card?.imageUrl || "/card-images/random-common-card.png",
            tier: randomCommonCard.card?.tier || "D",
            marketValue: randomCommonCard.card?.credits || 10
          });
        }
      } else {
        throw new Error('No common cards found in pack prize pool');
      }

      // Add 1 hit card from the pack
      let selectedHitCard = null;
      if (packCards.length > 0) {
        const hitCards = packCards.filter(pc => 
          pc.card?.tier && ['C', 'B', 'A', 'S', 'SS', 'SSS'].includes(pc.card.tier)
        );
        
        if (hitCards.length > 0) {
          const randomHitCard = hitCards[Math.floor(Math.random() * hitCards.length)];
          const cardId = randomHitCard.card?.id;
          if (!cardId) {
            throw new Error('Hit card missing ID in pack prize pool');
          }
          selectedHitCard = randomHitCard;
          selectedCards.push({
            id: cardId, // Always use the existing card ID from the pack
            name: randomHitCard.card?.name || 'Hit Card',
            imageUrl: randomHitCard.card?.imageUrl || '/card-images/random-common-card.png',
            tier: randomHitCard.card?.tier || 'C',
            marketValue: randomHitCard.card?.credits || 100
          });
        } else {
          // Fallback to any available card
          const randomCard = packCards[Math.floor(Math.random() * packCards.length)];
          const cardId = randomCard.card?.id;
          if (!cardId) {
            throw new Error('Card missing ID in pack prize pool');
          }
          selectedHitCard = randomCard;
          selectedCards.push({
            id: cardId, // Always use the existing card ID from the pack
            name: randomCard.card?.name || 'Hit Card',
            imageUrl: randomCard.card?.imageUrl || '/card-images/random-common-card.png',
            tier: randomCard.card?.tier || 'C',
            marketValue: randomCard.card?.credits || 100
          });
        }
      } else {
        throw new Error('No cards found in pack prize pool');
      }

      // Add cards to user's vault (only if they exist in inventory)
      for (const card of selectedCards) {
        // Verify the card exists in inventory (it should, since we're using existing card IDs)
        const existingInventoryCard = await tx
          .select()
          .from(inventory)
          .where(eq(inventory.id, card.id))
          .limit(1);

        if (existingInventoryCard.length === 0) {
          throw new Error(`Card ${card.id} not found in inventory - this should not happen`);
        }

        const existingCard = await tx
          .select()
          .from(userCards)
          .where(and(eq(userCards.userId, userId), eq(userCards.cardId, card.id)))
          .limit(1);

        if (existingCard.length > 0) {
          // Update quantity
          await tx
            .update(userCards)
            .set({ quantity: existingCard[0].quantity + 1 })
            .where(and(eq(userCards.userId, userId), eq(userCards.cardId, card.id)));
        } else {
          // Insert new card
          await tx.insert(userCards).values({
            userId,
            cardId: card.id,
            pullValue: card.marketValue.toString(),
            quantity: 1,
            isRefunded: false,
            isShipped: false
          });
        }
      }

      // Record transaction
      await tx.insert(transactions).values({
        userId,
        type: 'pack_purchase',
        amount: (-packPrice).toString(),
        description: `Purchased ${pack.name} pack`
      });

      // Add hit cards to global feed
      const hitCards = selectedCards.filter(card => 
        card.tier && ['C', 'B', 'A', 'S', 'SS', 'SSS'].includes(card.tier)
      );
      
      for (const hitCard of hitCards) {
        await tx.insert(globalFeed).values({
          userId,
          cardId: hitCard.id,
          tier: hitCard.tier,
          gameType: 'pack_opening'
        });
      }

      // Note: We don't deduct from inventory as it's a static database
      // We only deduct from the pack's prize pool (specialPackCards) which represents
      // the available cards in that specific pack, not the global inventory
      
      // Deduct selected cards from prize pool
      // Deduct common cards - count occurrences and deduct accordingly
      const commonCardCounts = new Map<string, number>();
      for (const commonCard of selectedCommonCards) {
        const key = commonCard.cardId; // Use cardId (inventory ID) not pack card entry ID
        commonCardCounts.set(key, (commonCardCounts.get(key) || 0) + 1);
      }
      
      for (const [cardId, count] of Array.from(commonCardCounts.entries())) {
        await tx
          .update(specialPackCards)
          .set({ quantity: sql`${specialPackCards.quantity} - ${count}` })
          .where(and(
            eq(specialPackCards.packId, packId),
            eq(specialPackCards.cardId, cardId)
          ));
      }
      
      // Deduct hit card from prize pool if it was selected from the pack
      if (selectedHitCard && selectedHitCard.quantity > 0) {
        await tx
          .update(specialPackCards)
          .set({ quantity: selectedHitCard.quantity - 1 })
          .where(and(
            eq(specialPackCards.packId, packId),
            eq(specialPackCards.cardId, selectedHitCard.cardId)
          ));
      }

      return {
        packCards: selectedCards,
        hitCardPosition: 7 // The hit card is always in the last position (index 7)
      };
    });
  }

  private getSettingDescription(settingKey: string): string {
    const descriptions: Record<string, string> = {
      'maintenance_mode': 'When enabled, displays maintenance message to users and restricts access',
      'new_registrations': 'Allow new users to register accounts',
      'pack_openings': 'Allow users to open packs and earn cards',
      'credit_purchases': 'Allow users to purchase credits',
      'global_feed': 'Display the global activity feed to users',
    };
    return descriptions[settingKey] || 'Administrative setting';
  }
}

export const storage = new DatabaseStorage();
