import {
  users,
  classicPack,
  classicPrize,
  mysteryPack,
  mysteryPrize,
  specialPack,
  specialPrize,
  userCards,
  userPacks,
  transactions,
  globalFeed,
  type User,
  type UpsertUser,
  type ClassicPack,
  type InsertClassicPack,
  type ClassicPrize,
  type InsertClassicPrize,
  type MysteryPack,
  type InsertMysteryPack,
  type MysteryPrize,
  type InsertMysteryPrize,
  type SpecialPack,
  type InsertSpecialPack,
  type SpecialPrize,
  type InsertSpecialPrize,
  type UserCard,
  type UserPack,
  type GlobalFeed,
  type Transaction,
  type InsertUserCard,
  type InsertUserPack,
  type InsertTransaction,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, inArray, gt } from "drizzle-orm";
import { randomUUID } from "crypto";
import { SimpleCache, CacheKeys, CacheTTL } from "./cache/simpleCache";

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
  getUserCards(userId: string): Promise<UserCard[]>;
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
  getSpecialPacks(): Promise<Array<SpecialPack & { cards: Array<SpecialPrize> }>>;
  getSpecialPackById(id: string): Promise<SpecialPack & { cards: Array<SpecialPrize> }>;
  createSpecialPack(pack: InsertSpecialPack): Promise<SpecialPack>;
  updateSpecialPack(id: string, pack: Partial<InsertSpecialPack>): Promise<SpecialPack>;
  deleteSpecialPack(id: string): Promise<void>;
  
  
  // Special Pack Cards
  addCardToSpecialPack(packId: string, cardId: string, quantity?: number): Promise<SpecialPackCard>;
  addCardToSpecialPackSimplified(packId: string, cardData: { cardName: string; cardImageUrl: string; cardTier: string; refundCredit: number; quantity: number }): Promise<SpecialPackCard>;
  removeCardFromSpecialPack(packId: string, specialPackCardId: string): Promise<void>;
  updateSpecialPackCardQuantity(packId: string, specialPackCardId: string, quantity: number): Promise<SpecialPackCard>;
  
  // Mystery Packs
  getMysteryPacks(): Promise<Array<MysteryPack & { cards: Array<MysteryPrize> }>>;
  getMysteryPackById(id: string): Promise<MysteryPack & { cards: Array<MysteryPrize> }>;
  createMysteryPack(pack: InsertMysteryPack): Promise<MysteryPack>;
  updateMysteryPack(id: string, pack: Partial<InsertMysteryPack>): Promise<MysteryPack>;
  deleteMysteryPack(id: string): Promise<void>;
  
  // Mystery Pack Cards
  addCardToMysteryPack(packId: string, cardId: string, quantity?: number): Promise<MysteryPackCard>;
  addCardToMysteryPackSimplified(packId: string, cardData: { cardName: string; cardImageUrl: string; cardTier: string; refundCredit: number; quantity: number }): Promise<MysteryPackCard>;
  removeCardFromMysteryPack(packId: string, cardId: string): Promise<void>;
  updateMysteryPackCardQuantity(packId: string, mysteryPackCardId: string, quantity: number): Promise<MysteryPackCard>;
  
  // Classic Packs
  getClassicPacks(): Promise<Array<ClassicPack & { cards: Array<ClassicPackCard> }>>;
  getClassicPackById(id: string): Promise<ClassicPack & { cards: Array<ClassicPackCard> }>;
  createClassicPack(pack: InsertClassicPack): Promise<ClassicPack>;
  updateClassicPack(id: string, pack: Partial<InsertClassicPack>): Promise<ClassicPack>;
  deleteClassicPack(id: string): Promise<void>;
  
  // Classic Pack Cards
  addCardToClassicPack(packId: string, cardId: string, quantity?: number): Promise<ClassicPackCard>;
  addCardToClassicPackSimplified(packId: string, cardData: { cardName: string; cardImageUrl: string; cardTier: string; refundCredit: number; quantity: number }): Promise<ClassicPackCard>;
  removeCardFromClassicPack(packId: string, cardId: string): Promise<void>;
  updateClassicPackCardQuantity(packId: string, classicPackCardId: string, quantity: number): Promise<ClassicPackCard>;
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
  private cache = SimpleCache.getInstance();

  // Cache invalidation methods
  private invalidateInventoryCache(): void {
    this.cache.delete(CacheKeys.inventoryAll());
    // Invalidate tier-specific caches
    ['D', 'C', 'B', 'A', 'S', 'SS', 'SSS'].forEach(tier => {
      this.cache.delete(CacheKeys.inventoryByTier(tier));
    });
  }

  private invalidatePackCache(): void {
    this.cache.delete(CacheKeys.specialPack());
    this.cache.delete(CacheKeys.classicPack());
    this.cache.delete(CacheKeys.mysteryPack());
  }

  private invalidateGlobalFeedCache(): void {
    // Invalidate all global feed variations
    this.cache.delete(CacheKeys.globalFeed(10));
    this.cache.delete(CacheKeys.globalFeed(5));
    this.cache.delete(CacheKeys.globalFeed(10, 'A'));
    this.cache.delete(CacheKeys.globalFeed(5, 'A'));
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    // Always fetch fresh user data from database to ensure credits are up-to-date
    // This is important for admin credit updates to reflect immediately
    const result = await db.execute(sql`SELECT id, username, email, password_hash as password, role, credits FROM users WHERE id = ${id} LIMIT 1`);
    const user = result.rows[0] as any;
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // Use direct SQL query to avoid schema mapping issues
    const result = await db.execute(sql`SELECT id, username, email, password_hash as password, role, credits FROM users WHERE email = ${email} LIMIT 1`);
    const user = result.rows[0] as any;
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Use direct SQL query to avoid schema mapping issues
    const result = await db.execute(sql`SELECT id, username, email, password_hash as password, role, credits FROM users WHERE username = ${username} LIMIT 1`);
    const user = result.rows[0] as any;
    return user;
  }

  async createUser(userData: Omit<UpsertUser, 'id'>): Promise<User> {
    // Use direct SQL to avoid schema mapping issues
    // Password is already hashed by the auth endpoint
    
    const result = await db.execute(sql`
      INSERT INTO users (id, username, email, password_hash, role, credits) 
      VALUES (gen_random_uuid(), ${userData.username}, ${userData.email}, ${userData.password}, ${userData.role || 'user'}, 50.00)
      RETURNING id, username, email, password_hash as password, role, credits
    `);
    
    return result.rows[0] as User;
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
  async getUserCards(userId: string): Promise<UserCard[]> {
    const cacheKey = CacheKeys.userCards(userId);
    const cached = this.cache.get<UserCard[]>(cacheKey);
    if (cached) return cached;

    console.log('🔍 getUserCards called for userId:', userId);
    
    // Simplified query for new schema
    const result = await db
      .select({
        id: userCards.id,
        userId: userCards.userId,
        cardName: userCards.cardName,
        cardImageUrl: userCards.cardImageUrl,
        cardTier: userCards.cardTier,
        refundCredit: userCards.refundCredit,
        quantity: userCards.quantity,
        createdAt: userCards.createdAt,
        isRefunded: userCards.isRefunded,
        isShipped: userCards.isShipped,
        packId: userCards.packId,
        packSource: userCards.packSource,
        cardSource: userCards.cardSource,
      })
      .from(userCards)
      .where(and(
        eq(userCards.userId, userId),
        eq(userCards.isRefunded, false),
        eq(userCards.isShipped, false)
      ))
      .orderBy(desc(userCards.createdAt));

    console.log('🔍 Final getUserCards result:', result.length, 'cards');
    console.log('🔍 Final cards:', result.map(card => ({ id: card.id, name: card.cardName, quantity: card.quantity })));
    
    this.cache.set(cacheKey, result, CacheTTL.SHORT);
    return result;
  }

  async addUserCard(userCard: InsertUserCard): Promise<UserCard> {
    return await db.transaction(async (tx) => {
      try {
        // Check if user already has this card
        const [existingCard] = await tx
          .select()
          .from(userCards)
          .where(and(
            eq(userCards.userId, userCard.userId!),
            eq(userCards.cardName, userCard.cardName!),
            eq(userCards.packId, userCard.packId!),
            eq(userCards.isRefunded, false),
            eq(userCards.isShipped, false)
          ))
          .limit(1);

        if (existingCard) {
          // Update existing card quantity
          await tx
            .update(userCards)
            .set({ 
              quantity: existingCard.quantity + (userCard.quantity || 1),
              pulledAt: new Date() // Update the pull time
            })
            .where(eq(userCards.id, existingCard.id));
          
          console.log(`✅ Updated existing card quantity: ${existingCard.quantity} -> ${existingCard.quantity + (userCard.quantity || 1)}`);
        } else {
        // Insert new user card into vault
        const insertData: any = {
          id: `uc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId: userCard.userId,
          cardName: userCard.cardName,
          cardImageUrl: userCard.cardImageUrl,
          cardTier: userCard.cardTier,
          refundCredit: userCard.refundCredit,
          quantity: userCard.quantity,
          pullValue: userCard.pullValue || "0.00",
          isRefunded: userCard.isRefunded ?? false,
          isShipped: userCard.isShipped ?? false,
          packSource: userCard.packSource || null,
          packId: userCard.packId || null,
          cardSource: userCard.cardSource || null,
        };

        await tx.insert(userCards).values(insertData);
          console.log(`✅ Added new card to vault: ${userCard.quantity}x ${userCard.cardName}`);
        }
        
        // Fetch the most recent card for this user and cardName
        const [newUserCard] = await tx
          .select()
          .from(userCards)
          .where(and(
            eq(userCards.userId, userCard.userId!),
            eq(userCards.cardName, userCard.cardName!),
            eq(userCards.packId, userCard.packId!)
          ))
          .orderBy(desc(userCards.pulledAt))
          .limit(1);
        
        if (!newUserCard) {
          throw new Error('Failed to fetch inserted user card');
        }
        
        // Invalidate user cards cache
        this.cache.delete(CacheKeys.userCards(userCard.userId || ''));
        
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
          cardName: userCards.cardName,
          cardImageUrl: userCards.cardImageUrl,
          cardTier: userCards.cardTier,
          refundCredit: userCards.refundCredit,
          quantity: userCards.quantity,
          packSource: userCards.packSource,
          packId: userCards.packId,
          cardSource: userCards.cardSource,
        })
        .from(userCards)
        .where(and(inArray(userCards.id, cardIds), eq(userCards.userId, userId)));

      // Calculate total refund amount
      let totalRefund = 0;
      for (const card of userCardsToRefund) {
        const refundAmount = card.refundCredit * card.quantity;
        totalRefund += refundAmount;
      }

      // Process refund for simplified system
      if (userCardsToRefund.length > 0) {
        console.log(`🔄 Processing refund for ${userCardsToRefund.length} cards`);
        
        // Group cards by pack source for quantity restoration
        const cardsByPackSource = new Map<string, typeof userCardsToRefund>();
        
        for (const card of userCardsToRefund) {
          const packSource = card.packSource || 'mystery';
          if (!cardsByPackSource.has(packSource)) {
            cardsByPackSource.set(packSource, []);
          }
          cardsByPackSource.get(packSource)!.push(card);
        }

        // Process each pack source separately
        for (const [packSource, cards] of Array.from(cardsByPackSource.entries())) {
          console.log(`🔄 Processing refund for ${cards.length} cards from ${packSource} pack`);
          
          if (packSource === 'mystery') {
            // Handle mystery pack cards
            for (const card of cards) {
              await tx
                .update(mysteryPrize)
                .set({ quantity: sql`${mysteryPrize.quantity} + ${card.quantity}` })
                .where(and(
                  eq(mysteryPrize.cardName, card.cardName),
                  eq(mysteryPrize.packId, 'mystery-pokeball')
                ));
            }
          } else if (packSource === 'special') {
            // Handle special pack cards
            for (const card of cards) {
              await tx
                .update(specialPrize)
                .set({ quantity: sql`${specialPrize.quantity} + ${card.quantity}` })
                .where(and(
                  eq(specialPrize.cardName, card.cardName),
                  card.packId ? eq(specialPrize.packId, card.packId) : sql`1=0`
                ));
            }
          } else if (packSource === 'classic') {
            // Handle classic pack cards
            for (const card of cards) {
              await tx
                .update(classicPrize)
                .set({ quantity: sql`${classicPrize.quantity} + ${card.quantity}` })
                .where(and(
                  eq(classicPrize.cardName, card.cardName),
                  card.packId ? eq(classicPrize.packId, card.packId) : sql`1=0`
                ));
            }
          }
        }

        // Mark user cards as refunded
        await tx
          .update(userCards)
          .set({ isRefunded: true })
          .where(and(inArray(userCards.id, cardIds), eq(userCards.userId, userId)));

        // Add refund transaction
        await tx.insert(transactions).values({
          id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId,
          type: 'refund',
          amount: totalRefund.toString(),
          description: `Refunded ${userCardsToRefund.length} cards`,
        });

        // Invalidate user cards cache and user cache
        this.cache.delete(CacheKeys.userCards(userId));
        this.cache.delete(CacheKeys.user(userId));
      }
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
    const cacheKey = CacheKeys.userPacks(userId);
    const cached = this.cache.get<UserPack[]>(cacheKey);
    if (cached) return cached;

    console.log('Storage: getUserPacks called for userId:', userId);
    const packs = await db
      .select()
      .from(userPacks)
      .where(and(eq(userPacks.userId, userId), eq(userPacks.isOpened, false)))
      .orderBy(desc(userPacks.earnedAt));
    console.log('Storage: getUserPacks result:', packs.length, 'packs found');
    
    this.cache.set(cacheKey, packs, CacheTTL.SHORT);
    return packs;
  }

  async addUserPack(userPack: InsertUserPack): Promise<UserPack> {
    console.log('Storage: addUserPack called with:', userPack);
    
    // Generate a proper ID since the database expects VARCHAR(255) and doesn't auto-generate
    const userPackWithId = {
      ...userPack,
      id: `up-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    const [newUserPack] = await db.insert(userPacks).values(userPackWithId).returning();
    console.log('Storage: addUserPack result:', newUserPack);
    
    // Invalidate user packs cache
    this.cache.delete(CacheKeys.userPacks(userPack.userId || ''));
    
    return newUserPack;
  }


  private async openSpecialPack(tx: any, userPack: any, specialPack: any, userId: string): Promise<PackOpenResult> {
    console.log('🎯 Opening special pack:', specialPack.name);
    
    // Get all cards in the special pack pool with quantity > 0 (simplified system)
    const packCards = await tx
      .select({
        id: specialPrize.id,
        packId: specialPrize.packId,
        cardName: specialPrize.cardName,
        cardImageUrl: specialPrize.cardImageUrl,
        cardTier: specialPrize.cardTier,
        refundCredit: specialPrize.refundCredit,
        quantity: specialPrize.quantity,
        cardSource: specialPrize.cardSource,
        createdAt: specialPrize.createdAt,
      })
      .from(specialPrize)
      .where(
        and(
          eq(specialPrize.packId, specialPack.id),
          gt(specialPrize.quantity, 0) // Only include cards with quantity > 0
        )
      );

    console.log('🎯 Available special pack cards (quantity > 0):', packCards.length);
    console.log('🎯 Special pack cards details:', packCards.map((pc: any) => ({ 
      name: pc.cardName, 
      tier: pc.cardTier, 
      quantity: pc.quantity 
    })));
    
    if (packCards.length === 0) {
      throw new Error('No cards available in special pack');
    }

    // Use fixed Pokeball Mystery Pack odds for special packs
    const baseOdds = {
      "SSS": 0.005,
      "SS": 0.015, 
      "S": 0.03,
      "A": 0.05,
      "B": 0.10,
      "C": 0.20,
      "D": 0.60
    };
    console.log('🎯 Using fixed Pokeball Mystery Pack odds:', baseOdds);
    
    // Group cards by tier for selection
    const cardsByTier: { [key: string]: any[] } = {};
    for (const pc of packCards) {
      const tier = pc.cardTier || 'D';
      if (!cardsByTier[tier]) {
        cardsByTier[tier] = [];
      }
      cardsByTier[tier].push(pc);
    }
    
    console.log('🎯 Cards by tier:', cardsByTier);
    console.log('🎯 Cards by tier details:', Object.keys(cardsByTier).map(tier => ({
      tier,
      count: cardsByTier[tier].length,
      cards: cardsByTier[tier].map(pc => ({ name: pc.cardName, quantity: pc.quantity }))
    })));
    
    // Check if we have cards for each required tier with quantity > 0
    const requiredTiers = ['D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
    const missingTiers = requiredTiers.filter(tier => {
      const tierCards = cardsByTier[tier];
      if (!tierCards || tierCards.length === 0) {
        return true; // No cards in this tier
      }
      // Check if any card in this tier has quantity > 0
      const hasAvailableCards = tierCards.some(pc => pc.quantity > 0);
      return !hasAvailableCards; // No cards with quantity > 0
    });
    
    if (missingTiers.length > 0) {
      throw new Error(`No cards available in tier(s): ${missingTiers.join(', ')}`);
    }

    // Create 8 cards: 7 commons + 1 hit
    const selectedCards = [];
    const cardsToDeduct: { specialPackCardId: string; quantity: number }[] = [];
    
    // Add 7 common cards (D tier) - always use D tier for common positions
    const commonCards = cardsByTier['D'] || [];
    console.log('🎯 Common cards available:', commonCards.length);
    
    if (commonCards.length === 0) {
      throw new Error('No common cards (D tier) found in special pack');
    }

    for (let i = 0; i < 7; i++) {
      const selectedCard = commonCards[Math.floor(Math.random() * commonCards.length)];
      
      selectedCards.push({
        id: selectedCard.id,
        name: selectedCard.cardName || 'Common Card',
        imageUrl: selectedCard.cardImageUrl || '/assets/Commons.png',
        tier: selectedCard.cardTier || 'D',
        marketValue: selectedCard.refundCredit || 1,
        isHit: false,
        position: i
      });
      
      // Track quantity deduction
      const existingDeduction = cardsToDeduct.find(d => d.specialPackCardId === selectedCard.id);
      if (existingDeduction) {
        existingDeduction.quantity += 1;
      } else {
        cardsToDeduct.push({ specialPackCardId: selectedCard.id, quantity: 1 });
      }
    }

    // Add 1 hit card using ODDS-BASED selection (not quantity-based)
    const allHitCards = packCards.filter((pc: any) => ['C', 'B', 'A', 'S', 'SS', 'SSS'].includes(pc.cardTier));
    console.log('🎯 Hit cards available:', allHitCards.length);
    
    if (allHitCards.length === 0) {
      throw new Error('No hit cards (C+ tier) found in special pack');
    }
    
    // ODDS-BASED SELECTION: First select tier based on fixed odds, then select any card from that tier
    const hitTiers = ['SSS', 'SS', 'S', 'A', 'B', 'C'];
    const hitWeights: { [key: string]: number } = {};
    let totalHitWeight = 0;
    
    // Use fixed odds regardless of quantity
    for (const tier of hitTiers) {
      if (cardsByTier[tier] && cardsByTier[tier].length > 0) {
        hitWeights[tier] = baseOdds[tier as keyof typeof baseOdds] || 0;
        totalHitWeight += hitWeights[tier];
        console.log(`🎯 Tier ${tier}: ${cardsByTier[tier].length} cards, weight: ${hitWeights[tier]}`);
      } else {
        console.log(`🎯 Tier ${tier}: No cards available`);
      }
    }
    
    console.log('🎯 Hit tier weights (odds-based):', hitWeights);
    console.log('🎯 Total hit weight:', totalHitWeight);
    
    // Select hit card tier using weighted random selection based on ODDS
    const random = Math.random() * totalHitWeight;
    let cumulativeWeight = 0;
    let selectedTier = 'C'; // fallback
    
    for (const tier of hitTiers) {
      if (hitWeights[tier]) {
        cumulativeWeight += hitWeights[tier];
        if (random <= cumulativeWeight) {
          selectedTier = tier;
          break;
        }
      }
    }
    
    console.log('🎯 Selected hit tier (odds-based):', selectedTier);
    
    // Select a card from the selected tier that has quantity > 0
    const tierCards = cardsByTier[selectedTier];
    const availableTierCards = tierCards.filter((pc: any) => pc.quantity > 0);
    
    if (availableTierCards.length === 0) {
      throw new Error(`No cards available in ${selectedTier} tier (all have quantity = 0)`);
    }
    
    const hitCard = availableTierCards[Math.floor(Math.random() * availableTierCards.length)];

    selectedCards.push({
      id: hitCard.id,
      name: hitCard.cardName || 'Hit Card',
      imageUrl: hitCard.cardImageUrl || '/card-images/hit.png',
      tier: hitCard.cardTier || 'C',
      marketValue: hitCard.refundCredit || 100,
      isHit: true,
      position: 7
    });
    
    // Track quantity deduction for hit card
    const existingDeduction = cardsToDeduct.find(d => d.specialPackCardId === hitCard.id);
    if (existingDeduction) {
      existingDeduction.quantity += 1;
    } else {
      cardsToDeduct.push({ specialPackCardId: hitCard.id, quantity: 1 });
    }

    // Deduct quantities from special pack cards
    console.log('🎯 Deducting quantities from special pack cards...');
    console.log('🎯 Cards to deduct:', JSON.stringify(cardsToDeduct, null, 2));
    for (const deduction of cardsToDeduct) {
      console.log(`🎯 Looking for pack card with ID: ${deduction.specialPackCardId}`);
      const currentCard = packCards.find((pc: any) => pc.id === deduction.specialPackCardId);
      console.log(`🎯 Found pack card:`, currentCard ? { id: currentCard.id, cardName: currentCard.cardName, quantity: currentCard.quantity } : 'NOT FOUND');
      if (currentCard && currentCard.quantity >= deduction.quantity) {
        await tx
          .update(specialPrize)
          .set({ quantity: currentCard.quantity - deduction.quantity })
          .where(eq(specialPrize.id, deduction.specialPackCardId));
        console.log(`✅ Updated special pack card ${deduction.specialPackCardId} quantity: ${currentCard.quantity} -> ${currentCard.quantity - deduction.quantity}`);
      } else {
        console.log(`❌ ERROR: Not enough quantity for card ${deduction.specialPackCardId}. Current: ${currentCard?.quantity || 0}, Required: ${deduction.quantity}`);
        throw new Error(`Not enough quantity for card ${deduction.specialPackCardId}. Current: ${currentCard?.quantity || 0}, Required: ${deduction.quantity}`);
      }
    }

    // Add cards to user's vault (consolidate quantities)
    console.log('🎯 Adding cards to user vault...');
    const cardQuantityMap = new Map<string, number>();
    
    for (const card of selectedCards) {
      const currentQuantity = cardQuantityMap.get(card.id) || 0;
      cardQuantityMap.set(card.id, currentQuantity + 1);
    }

        for (const [cardId, quantity] of Array.from(cardQuantityMap.entries())) {
      const card = selectedCards.find(c => c.id === cardId);
      if (card) {
        await this.addUserCard({
          userId,
          cardName: card.name,
          cardImageUrl: card.imageUrl,
          cardTier: card.tier,
          refundCredit: parseInt(card.marketValue),
          quantity,
          isRefunded: false,
          isShipped: false,
          packSource: 'special',
          packId: specialPack.id,
          cardSource: specialPack.name
        });
        console.log(`✅ Added ${quantity}x ${card.name} to user vault from special pack: ${specialPack.name} (${specialPack.id}) - Directory: ${specialPack.name}`);
      }
    }

    // Mark pack as opened
    await tx
      .update(userPacks)
      .set({ isOpened: true, openedAt: new Date() })
      .where(eq(userPacks.id, userPack.id));

    // Add hit card to global feed if it's A tier or above
    const finalHitCard = selectedCards.find(card => card.isHit);
    if (finalHitCard && ['A', 'S', 'SS', 'SSS'].includes(finalHitCard.tier)) {
      // Skip global feed insertion since table doesn't exist
      console.log('📰 Skipping global feed entry for hit card:', finalHitCard.name, finalHitCard.tier);
    }

    // Invalidate user packs cache
    this.cache.delete(CacheKeys.userPacks(userId));

    return {
      userCard: {
        id: '',
        userId: null,
        cardName: '',
        cardImageUrl: '',
        cardTier: '',
        refundCredit: 0,
        quantity: 0,
        pulledAt: null,
        isRefunded: null,
        isShipped: null,
        packId: null,
        packSource: null,
        cardSource: null
      },
      packCards: selectedCards,
      hitCardPosition: 7, // The 8th card (index 7) is the hit card
      packType: 'special',
    };
  }

  private async openMysteryPack(tx: any, userPack: any, mysteryPack: any, userId: string): Promise<PackOpenResult> {
    console.log('🎲 Opening mystery pack:', mysteryPack.pack_type);
    console.log('📚 Library system: Looking for cards in directory: Mystery Pack');
    
    // Use the base mystery pack ID to get cards from the shared pool
    const basePackId = 'mystery-pokeball';
    console.log('🎲 Using base mystery pack ID for shared cards:', basePackId);
    console.log('🎲 Pack type for odds:', mysteryPack.pack_type);
    
    // Get all cards in the shared mystery pack pool with quantity > 0
    const packCards = await tx
      .select({
        id: mysteryPrize.id,
        packId: mysteryPrize.packId,
        cardName: mysteryPrize.cardName,
        cardImageUrl: mysteryPrize.cardImageUrl,
        cardTier: mysteryPrize.cardTier,
        refundCredit: mysteryPrize.refundCredit,
        quantity: mysteryPrize.quantity,
        cardSource: mysteryPrize.cardSource,
        createdAt: mysteryPrize.createdAt,
      })
        .from(mysteryPrize)
        .where(
          and(
            eq(mysteryPrize.packId, basePackId),
            gt(mysteryPrize.quantity, 0) // Only include cards with quantity > 0
          )
        );

    console.log('🎲 Found pack cards:', packCards.length);
    console.log('🎲 Pack cards details:', packCards.map((pc: any) => ({ id: pc.id, cardName: pc.cardName, quantity: pc.quantity })));

    if (packCards.length === 0) {
      throw new Error('No cards available in mystery pack');
    }

    console.log('🎲 Available cards in shared pool:', packCards.length);
    console.log('🎲 Pack cards details:', packCards.map((pc: any) => ({ name: pc.cardName, tier: pc.cardTier, quantity: pc.quantity })));

    // Check if we have cards for each required tier with quantity > 0
    const requiredTiers = ['D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
    const cardsByTier: { [key: string]: any[] } = {};
    for (const pc of packCards) {
      const tier = pc.cardTier || 'D';
      if (!cardsByTier[tier]) {
        cardsByTier[tier] = [];
      }
      cardsByTier[tier].push(pc);
    }
    
    // Check for tiers with no cards OR no cards with quantity > 0
    const missingTiers = requiredTiers.filter(tier => {
      const tierCards = cardsByTier[tier];
      if (!tierCards || tierCards.length === 0) {
        return true; // No cards in this tier
      }
      // Check if any card in this tier has quantity > 0
      const hasAvailableCards = tierCards.some(pc => pc.quantity > 0);
      return !hasAvailableCards; // No cards with quantity > 0
    });
    
    if (missingTiers.length > 0) {
      throw new Error(`No cards available in tier(s): ${missingTiers.join(', ')}`);
    }

    // Fetch the latest odds from the database to ensure we have the most up-to-date values
    const [latestMysteryPackData] = await tx
      .select({ odds: mysteryPack.odds })
      .from(mysteryPack)
      .where(eq(mysteryPack.id, mysteryPack.id));
    
    // Parse odds from the latest mystery pack data
    const odds = latestMysteryPackData?.odds || {};
    console.log('🎲 Pack odds (latest from DB):', odds);

    // Create 8 cards: 7 commons + 1 hit (4x2 grid format)
    const selectedCards = [];
    const cardsToDeduct: { mysteryPackCardId: string; quantity: number }[] = [];
    
    // Add 7 common cards using odds
    const commonCards = packCards.filter((pc: any) => pc.card?.tier === 'D');
    const commonOdds = parseFloat(odds.D || '0.85'); // Default 85% for common
    
    if (commonCards.length > 0) {
      for (let i = 0; i < 7; i++) {
        // Use weighted selection based on odds
        const random = Math.random();
        let selectedCard;
        
        if (random < commonOdds && commonCards.length > 0) {
          // Select common card
          selectedCard = commonCards[Math.floor(Math.random() * commonCards.length)];
        } else {
          // Fallback to common card only (never select higher tier cards for common positions)
          selectedCard = commonCards[Math.floor(Math.random() * commonCards.length)];
        }
        
        if (selectedCard) {
          selectedCards.push({
            id: selectedCard.id,
            name: selectedCard.cardName || "Common Card",
            imageUrl: selectedCard.cardImageUrl || "/assets/Commons.png",
            tier: selectedCard.cardTier || "D",
            marketValue: selectedCard.refundCredit || 1,
            isHit: false,
            position: i
          });
          
          const existingDeduction = cardsToDeduct.find(d => d.mysteryPackCardId === selectedCard.id);
          if (existingDeduction) {
            existingDeduction.quantity++;
          } else {
            cardsToDeduct.push({ mysteryPackCardId: selectedCard.id, quantity: 1 });
          }
        }
      }
    } else {
      throw new Error('No common cards found in mystery pack pool');
    }

      // Add 1 hit card using weighted random selection based on all odds
      const allHitCards = packCards.filter((pc: any) => pc.card && ['C', 'B', 'A', 'S', 'SS', 'SSS'].includes(pc.card.tier));
      
      if (allHitCards.length > 0) {
        // Hit card is ALWAYS C tier or above (never D tier)
        // D tier cards are only for the 7 common positions
        console.log(`🎯 Selecting hit card (C tier or above) using weighted odds`);
        
        // Special logic for Masterball packs - guarantee A tier or higher
        if (mysteryPack.pack_type === 'masterball') {
          console.log(`🎯 Masterball pack detected - guaranteeing A tier or higher for hit card`);
          const masterballHitCards = packCards.filter((pc: any) => pc.card && ['A', 'S', 'SS', 'SSS'].includes(pc.card.tier));
          
          if (masterballHitCards.length > 0) {
            // Create weighted selection for Masterball (A, S, SS, SSS only)
            const masterballTierWeights = {
              'A': parseFloat(odds.A || '0.3'),
              'S': parseFloat(odds.S || '0.12'),
              'SS': parseFloat(odds.SS || '0.08'),
              'SSS': parseFloat(odds.SSS || '0.05')
            };
            
            console.log(`🎲 Masterball hit card tier weights:`, masterballTierWeights);
            
            // Group cards by tier for Masterball
            const masterballCardsByTier: { [key: string]: any[] } = {};
            masterballHitCards.forEach((pc: any) => {
              const tier = pc.card.tier;
              if (!masterballCardsByTier[tier]) masterballCardsByTier[tier] = [];
              masterballCardsByTier[tier].push(pc);
            });
            
            console.log(`🎲 Available Masterball hit cards by tier:`, Object.keys(masterballCardsByTier).map(tier => `${tier}: ${masterballCardsByTier[tier].length} cards`));

            // Calculate total weight for Masterball hit cards only
            const totalMasterballWeight = Object.values(masterballTierWeights).reduce((sum, weight) => sum + weight, 0);
            console.log(`🎲 Total Masterball hit card weight: ${totalMasterballWeight.toFixed(4)}`);

            // Use random number for Masterball hit card tier selection (normalized to total weight)
            const masterballRandom = Math.random() * totalMasterballWeight;
            console.log(`🎲 Random number for Masterball hit card tier selection: ${masterballRandom.toFixed(4)} (normalized to total weight)`);
            
            let cumulativeWeight = 0;
            let selectedTier = 'A'; // fallback
            let selectedHitCard;

            // Find which tier to select based on cumulative weights (in descending rarity order)
            for (const tier of ['SSS', 'SS', 'S', 'A']) {
              const weight = masterballTierWeights[tier as keyof typeof masterballTierWeights];
              if (weight > 0 && masterballCardsByTier[tier] && masterballCardsByTier[tier].length > 0) {
                cumulativeWeight += weight;
                console.log(`🎲 Checking ${tier} tier: cumulative weight = ${cumulativeWeight.toFixed(4)}, random = ${masterballRandom.toFixed(4)}`);
                
                if (masterballRandom <= cumulativeWeight) {
                  selectedTier = tier;
                  // Only select cards with quantity > 0
                  const availableTierCards = masterballCardsByTier[tier].filter((pc: any) => pc.quantity > 0);
                  if (availableTierCards.length === 0) {
                    console.warn(`No cards available in ${tier} tier (all have quantity = 0), trying next tier`);
                    continue;
                  }
                  selectedHitCard = availableTierCards[Math.floor(Math.random() * availableTierCards.length)];
                  console.log(`🎯 Selected ${tier} tier hit card for Masterball!`);
                  break;
                }
              }
            }
            
            // Fallback if no tier was selected
            if (!selectedHitCard) {
              console.warn('No Masterball hit card tier selected by weight, using fallback');
              const availableTiers = Object.keys(masterballCardsByTier).filter(tier => {
                const tierCards = masterballCardsByTier[tier];
                return tierCards.length > 0 && tierCards.some((pc: any) => pc.quantity > 0);
              });
              if (availableTiers.length > 0) {
                selectedTier = availableTiers[0];
                const availableTierCards = masterballCardsByTier[selectedTier].filter((pc: any) => pc.quantity > 0);
                selectedHitCard = availableTierCards[Math.floor(Math.random() * availableTierCards.length)];
              } else {
                // Find any card with quantity > 0
                const availableCards = masterballHitCards.filter((pc: any) => pc.quantity > 0);
                if (availableCards.length === 0) {
                  throw new Error('No cards available in Masterball pack (all have quantity = 0)');
                }
                selectedHitCard = availableCards[0];
              }
            }
            
            console.log(`🎯 Selected Masterball card for hit position:`, selectedHitCard.cardName);
            
            if (selectedHitCard) {
              selectedCards.push({
                id: selectedHitCard.id,
                name: selectedHitCard.cardName || 'Hit Card',
                imageUrl: selectedHitCard.cardImageUrl || '/card-images/hit.png',
                tier: selectedHitCard.cardTier || 'A',
                marketValue: selectedHitCard.refundCredit || 1000,
                isHit: true,
                position: 7
              });
              
              const existingDeduction = cardsToDeduct.find(d => d.mysteryPackCardId === selectedHitCard.id);
              if (existingDeduction) {
                existingDeduction.quantity++;
              } else {
                cardsToDeduct.push({ mysteryPackCardId: selectedHitCard.id, quantity: 1 });
              }
            }
          } else {
            throw new Error('No A+ tier cards available for Masterball pack');
          }
        } else {
          // Regular logic for other pack types
          // Create weighted selection based on hit card odds only (C, B, A, S, SS, SSS)
          const tierWeights = {
            'C': parseFloat(odds.C || '0.25'),
            'B': parseFloat(odds.B || '0.20'), 
            'A': parseFloat(odds.A || '0.15'),
            'S': parseFloat(odds.S || '0.05'),
            'SS': parseFloat(odds.SS || '0.02'),
            'SSS': parseFloat(odds.SSS || '0.01')
          };
          
          // Group cards by tier
          const cardsByTier: { [key: string]: any[] } = {};
          allHitCards.forEach((pc: any) => {
            const tier = pc.card.tier;
            if (!cardsByTier[tier]) cardsByTier[tier] = [];
            cardsByTier[tier].push(pc);
          });
          
          console.log(`🎲 Hit card tier weights:`, tierWeights);
          console.log(`🎲 Available hit cards by tier:`, Object.keys(cardsByTier).map(tier => `${tier}: ${cardsByTier[tier].length} cards`));

          // Calculate total weight for hit cards only
          const totalHitWeight = Object.values(tierWeights).reduce((sum, weight) => sum + weight, 0);
          console.log(`🎲 Total hit card weight: ${totalHitWeight.toFixed(4)}`);

          // Use random number for hit card tier selection (normalized to total weight)
          const hitRandom = Math.random() * totalHitWeight;
          console.log(`🎲 Random number for hit card tier selection: ${hitRandom.toFixed(4)} (normalized to total weight)`);
          
          let cumulativeWeight = 0;
          let selectedTier = 'A'; // fallback
          let selectedHitCard;

          // Find which tier to select based on cumulative weights (in descending rarity order)
          for (const tier of ['SSS', 'SS', 'S', 'A', 'B', 'C']) {
            const weight = tierWeights[tier as keyof typeof tierWeights];
            if (weight > 0 && cardsByTier[tier] && cardsByTier[tier].length > 0) {
              cumulativeWeight += weight;
              console.log(`🎲 Checking ${tier} tier: cumulative weight = ${cumulativeWeight.toFixed(4)}, random = ${hitRandom.toFixed(4)}`);
              
              if (hitRandom <= cumulativeWeight) {
                selectedTier = tier;
                // Only select cards with quantity > 0
                const availableTierCards = cardsByTier[tier].filter((pc: any) => pc.quantity > 0);
                if (availableTierCards.length === 0) {
                  console.warn(`No cards available in ${tier} tier (all have quantity = 0), trying next tier`);
                  continue;
                }
                selectedHitCard = availableTierCards[Math.floor(Math.random() * availableTierCards.length)];
                console.log(`🎯 Selected ${tier} tier hit card!`);
                break;
              }
            }
          }
          
          // Fallback if no tier was selected
          if (!selectedHitCard) {
            console.warn('No hit card tier selected by weight, using fallback');
            const availableTiers = Object.keys(cardsByTier).filter(tier => {
              const tierCards = cardsByTier[tier];
              return tierCards.length > 0 && tierCards.some((pc: any) => pc.quantity > 0);
            });
            if (availableTiers.length > 0) {
              selectedTier = availableTiers[0];
              const availableTierCards = cardsByTier[selectedTier].filter((pc: any) => pc.quantity > 0);
              selectedHitCard = availableTierCards[Math.floor(Math.random() * availableTierCards.length)];
            } else {
              // Find any card with quantity > 0
              const availableCards = allHitCards.filter((pc: any) => pc.quantity > 0);
              if (availableCards.length === 0) {
                throw new Error('No cards available in mystery pack (all have quantity = 0)');
              }
              selectedHitCard = availableCards[0];
            }
          }
          
          console.log(`🎯 Selected card for hit position:`, selectedHitCard.cardName);
          
          if (selectedHitCard) {
            selectedCards.push({
              id: selectedHitCard.id,
              name: selectedHitCard.cardName || 'Hit Card',
              imageUrl: selectedHitCard.cardImageUrl || '/card-images/hit.png',
              tier: selectedHitCard.cardTier || 'A',
              marketValue: selectedHitCard.refundCredit || 1000,
              isHit: true,
              position: 7
            });
            
            const existingDeduction = cardsToDeduct.find(d => d.mysteryPackCardId === selectedHitCard.id);
            if (existingDeduction) {
              existingDeduction.quantity++;
            } else {
              cardsToDeduct.push({ mysteryPackCardId: selectedHitCard.id, quantity: 1 });
            }
          }
        }
    } else if (commonCards.length > 0) {
      // Fallback: if no hit cards, pick another common
      const randomCommon = commonCards[Math.floor(Math.random() * commonCards.length)];
      if (randomCommon.card) {
        selectedCards.push({
          id: randomCommon.card.id,
          name: randomCommon.card.name || 'Common Card',
          imageUrl: randomCommon.card.imageUrl || '/assets/Commons.png',
          tier: randomCommon.card.tier || 'D',
          marketValue: randomCommon.card.credits || 1,
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

    // Deduct quantities from shared mystery pack cards
    console.log('🎯 Deducting quantities from shared mystery pack cards...');
    for (const deduction of cardsToDeduct) {
      const [packCard] = await tx
        .select()
        .from(mysteryPrize)
        .where(eq(mysteryPrize.id, deduction.mysteryPackCardId))
        .for('update');

      if (packCard && packCard.quantity >= deduction.quantity) {
        console.log(`🎯 Deducting ${deduction.quantity} of card ${packCard.cardId} from shared mystery pack`);
      await tx
        .update(mysteryPrize)
        .set({ quantity: packCard.quantity - deduction.quantity })
        .where(eq(mysteryPrize.id, deduction.mysteryPackCardId));
        console.log(`✅ Updated shared mystery pack quantity: ${packCard.quantity} -> ${packCard.quantity - deduction.quantity}`);
      } else {
        throw new Error(`Insufficient quantity for card ${deduction.mysteryPackCardId}`);
      }
    }

    // Add cards to user's vault (consolidate by card type)
    const cardQuantities = new Map<string, number>();
    const cardValues = new Map<string, string>();
    
    // Count quantities and track values for each card type
    for (const card of selectedCards) {
      const currentQuantity = cardQuantities.get(card.id) || 0;
      cardQuantities.set(card.id, currentQuantity + 1);
      cardValues.set(card.id, card.marketValue.toString());
    }
    
    // Add consolidated cards to vault
    for (const [cardId, quantity] of Array.from(cardQuantities.entries())) {
      const card = selectedCards.find(c => c.id === cardId);
      if (card) {
        await this.addUserCard({
          userId,
          cardName: card.name,
          cardImageUrl: card.imageUrl,
          cardTier: card.tier,
          refundCredit: parseInt(card.marketValue),
          quantity,
          isRefunded: false,
          isShipped: false,
          packSource: 'mystery',
          packId: mysteryPack.id,
          cardSource: 'Mystery Pack'
        });
      }
    }

    // Mark user pack as opened
    await tx
      .update(userPacks)
      .set({ 
        isOpened: true, 
        openedAt: new Date() 
      })
      .where(eq(userPacks.id, userPack.id));

    // Invalidate user packs cache
    this.cache.delete(CacheKeys.userPacks(userId));

    // Add to global feed
    // Skip global feed insertion since table doesn't exist
    console.log('📰 Skipping global feed entry for pack opening');

    return {
      userCard: {
        id: '',
        userId: null,
        cardName: '',
        cardImageUrl: '',
        cardTier: '',
        refundCredit: 0,
        quantity: 0,
        pulledAt: null,
        isRefunded: null,
        isShipped: null,
        packId: null,
        packSource: null,
        cardSource: null
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

        // Check if this is a mystery pack or classic pack by looking up the pack in respective tables
        if (!userPack.packId) {
          throw new Error('Pack ID is missing');
        }
        
        // Check if it's a mystery pack
        const mysteryPackData = await tx
          .select()
          .from(mysteryPack)
          .where(eq(mysteryPack.id, userPack.packId))
          .limit(1);

        if (mysteryPackData.length > 0) {
          // This is a mystery pack - handle it with the new logic
          return await this.openMysteryPack(tx, userPack, mysteryPackData[0], userId);
        }


        // Check if it's a special pack
        const specialPackData = await tx
          .select()
          .from(specialPack)
          .where(eq(specialPack.id, userPack.packId))
          .limit(1);

        if (specialPackData.length > 0) {
          // This is a special pack - handle it with the new logic
          return await this.openSpecialPack(tx, userPack, specialPackData[0], userId);
        }

        // Regular pack logic continues below
        // Skip pull rates since table doesn't exist - use fixed odds
        console.log('📊 Using fixed odds for pack opening (pullRates table not available)');

      // Use fixed odds for mystery pack
      const fixedOdds = {
        "SSS": 0.005,
        "SS": 0.015,
        "S": 0.03,
        "A": 0.05,
        "B": 0.10,
        "C": 0.20,
        "D": 0.60
      };

      // Weighted random selection based on fixed odds
      const random = Math.random();
      let cumulative = 0;
      let selectedTier = 'D'; // fallback

      for (const [tier, probability] of Object.entries(fixedOdds)) {
        cumulative += probability;
        if (random <= cumulative) {
          selectedTier = tier;
          break;
        }
      }

      const fullTierName = selectedTier;

      // Get cards of the selected tier from mystery pack cards
      const availableCards = await tx
        .select()
        .from(mysteryPrize)
        .where(and(
          eq(mysteryPrize.cardTier, fullTierName),
          gt(mysteryPrize.quantity, 0)
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
            cardName: card.name,
            cardImageUrl: card.imageUrl || '',
            cardTier: card.tier,
            refundCredit: parseInt(card.marketValue),
            quantity: count,
            isRefunded: false,
            isShipped: false,
            packSource: 'mystery',
            packId: null,
            cardSource: 'Mystery Pack'
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
          cardName: hitCard.cardName,
          cardImageUrl: hitCard.cardImageUrl,
          cardTier: hitCard.cardTier,
          refundCredit: hitCard.refundCredit,
          quantity: 1,
          isRefunded: false,
          isShipped: false,
          packSource: 'mystery',
          packId: null,
          cardSource: 'Mystery Pack'
        });
      }
      
      // Insert all new cards at once
      if (userCardInserts.length > 0) {
        try {
          const insertedCards = await tx.insert(userCards).values(userCardInserts).returning();
          if (!newUserCard) {
            newUserCard = insertedCards.find(c => c.cardName === hitCard.cardName) || insertedCards[0];
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

      // Invalidate user packs cache
      this.cache.delete(CacheKeys.userPacks(userId));

      // Stock reduction is now handled above for all cards

      // Add to global feed for all hit cards (C-tier and above)
      if (['C', 'B', 'A', 'S', 'SS', 'SSS'].includes(hitCard.tier)) {
        // Skip global feed insertion since table doesn't exist
        console.log('📰 Skipping global feed entry for hit card:', hitCard.name, hitCard.tier);
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
    const cacheKey = CacheKeys.globalFeed(limit, minTier);
    const cached = this.cache.get<GlobalFeedWithDetails[]>(cacheKey);
    if (cached) return cached;

    console.log('📰 getGlobalFeed called with:', { limit, minTier });
    
    try {
      // Since global_feed table doesn't exist, return empty array for now
      // This prevents the error and allows the app to function
      console.log('📰 Global feed table not available, returning empty feed');
      
      const feedEntries: GlobalFeedWithDetails[] = [];
      this.cache.set(cacheKey, feedEntries, CacheTTL.SHORT);
      return feedEntries;
    } catch (error: any) {
      console.error('❌ Error in getGlobalFeed:', error);
      // Return empty array instead of throwing error to prevent app crashes
      return [];
    }
  }

  async addGlobalFeedEntry(entry: { userId: string; cardId: string; tier: string; gameType: string }): Promise<void> {
    // Since global_feed table doesn't exist, skip adding entries for now
    console.log('📰 Global feed table not available, skipping entry:', entry);
    this.invalidateGlobalFeedCache();
  }

  // Transaction operations
  async addTransaction(transaction: InsertTransaction): Promise<Transaction> {
    // Generate a proper ID since the database expects VARCHAR(255) and doesn't auto-generate
    const transactionWithId = {
      ...transaction,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    const [newTransaction] = await db.insert(transactions).values(transactionWithId).returning();
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
    // Since gameSessions table doesn't exist, skip creating game session
    console.log('🎮 Game sessions table not available, skipping game session:', session);
    return {
      id: `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: session.userId,
      gameType: session.gameType,
      result: null,
      status: 'pending',
      createdAt: new Date(),
      completedAt: null
    } as GameSession;
  }

  async getGameSession(id: string): Promise<GameSession | undefined> {
    // Since gameSessions table doesn't exist, return undefined
    console.log('🎮 Game sessions table not available, returning undefined for session:', id);
    return undefined;
  }

  async updateGameSession(id: string, result: GameResult, status: string): Promise<void> {
    // Since gameSessions table doesn't exist, skip updating game session
    console.log('🎮 Game sessions table not available, skipping game session update for:', id, status);
  }

  // Credit operations
  async updateUserCredits(userId: string, amount: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        credits: sql`${users.credits} + ${amount}`,
      })
      .where(eq(users.id, userId));
    
    // Invalidate user cache to ensure fresh data
    this.cache.delete(CacheKeys.user(userId));
  }

  async deductUserCredits(userId: string, amount: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ 
        credits: sql`${users.credits} - ${amount}` 
      })
      .where(and(eq(users.id, userId), sql`${users.credits} >= ${amount}`))
      .returning();

    // Invalidate user cache to ensure fresh data
    if (result.length > 0) {
      this.cache.delete(CacheKeys.user(userId));
    }

    return result.length > 0;
  }

  // Notification operations
  async getUserNotifications(userId: string): Promise<Notification[]> {
    // Since notifications table doesn't exist, return empty array
    console.log('📧 Notifications table not available, returning empty notifications for user:', userId);
    return [];
  }

  async addNotification(notification: InsertNotification): Promise<Notification> {
    // Since notifications table doesn't exist, skip adding notifications
    console.log('📧 Notifications table not available, skipping notification:', notification);
    return {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: false,
      createdAt: new Date()
    } as Notification;
  }

  async markNotificationRead(id: string): Promise<void> {
    // Since notifications table doesn't exist, skip marking as read
    console.log('📧 Notifications table not available, skipping mark as read for:', id);
  }

  // Shipping operations
  async createShippingRequest(request: InsertShippingRequest): Promise<ShippingRequest> {
    // Since shippingRequests table doesn't exist, skip creating shipping request
    console.log('📦 Shipping requests table not available, skipping shipping request:', request);
    return {
      id: `ship-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: request.userId,
      cardIds: request.cardIds,
      status: 'pending',
      trackingNumber: null,
      createdAt: new Date(),
      shippingCost: '0.00',
      region: 'US',
      address: 'N/A',
      shippedAt: null
    } as ShippingRequest;
  }

  async getUserShippingRequests(userId: string): Promise<ShippingRequest[]> {
    // Since shippingRequests table doesn't exist, return empty array
    console.log('📦 Shipping requests table not available, returning empty shipping requests for user:', userId);
    return [];
  }

  async updateShippingStatus(id: string, status: string, trackingNumber?: string): Promise<void> {
    // Since shippingRequests table doesn't exist, skip updating shipping status
    console.log('📦 Shipping requests table not available, skipping shipping status update for:', id, status);
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    const result = await db.execute(sql`SELECT id, username, email, password_hash as password, role, credits FROM users ORDER BY created_at DESC`);
    return result.rows as User[];
  }

  async banUser(userId: string): Promise<void> {
    await db.execute(sql`UPDATE users SET is_banned = true WHERE id = ${userId}`);
  }

  async suspendUser(userId: string): Promise<void> {
    await db.execute(sql`UPDATE users SET is_suspended = true WHERE id = ${userId}`);
  }

  async setUserCredits(userId: string, credits: number): Promise<void> {
    await db.execute(sql`UPDATE users SET credits = ${credits.toString()} WHERE id = ${userId}`);
  }

  async getSystemStats(): Promise<{ totalUsers: number; totalRevenue: string; totalCards: number }> {
    const userCountResult = await db.execute(sql`SELECT count(*) as count FROM users`);
    const userCount = parseInt(userCountResult.rows[0].count);
    
    // Only count actual payments (purchase transactions), not game spending
    const revenueResult = await db.execute(sql`SELECT coalesce(sum(amount), 0) as sum FROM transactions WHERE type = 'purchase'`);
    const revenueSum = revenueResult.rows[0].sum;
    
    // Count cards from all pack prize pools
    const classicCardCount = await db.execute(sql`SELECT count(*) as count FROM classic_prize`);
    const mysteryCardCount = await db.execute(sql`SELECT count(*) as count FROM mystery_prize`);
    const specialCardCount = await db.execute(sql`SELECT count(*) as count FROM special_prize`);
    const cardCount = parseInt(classicCardCount.rows[0].count) + parseInt(mysteryCardCount.rows[0].count) + parseInt(specialCardCount.rows[0].count);

    return {
      totalUsers: userCount,
      totalRevenue: revenueSum || "0",
      totalCards: cardCount,
    };
  }

  // Game settings operations
  async getGameSetting(gameType: string): Promise<GameSetting | undefined> {
    // Since gameSettings table doesn't exist, return undefined
    console.log('🎮 Game settings table not available, returning undefined for game type:', gameType);
    return undefined;
  }

  async updateGameSetting(gameType: string, price: string, updatedBy?: string): Promise<GameSetting> {
    // Since gameSettings table doesn't exist, return mock data
    console.log('🎮 Game settings table not available, skipping update for game type:', gameType);
    return {
      id: `game-setting-${Date.now()}`,
      gameType,
      price,
      updatedAt: new Date(),
      updatedBy: updatedBy || 'system'
    } as GameSetting;
  }

  // Pull rate operations
  async getPackPullRates(packType: string): Promise<PullRate[]> {
    // Since pullRates table doesn't exist, return empty array
    console.log('📊 Pull rates table not available, returning empty rates for pack type:', packType);
    return [];
  }

  async getAllPullRates(): Promise<PullRate[]> {
    // Since pullRates table doesn't exist, return empty array
    console.log('📊 Pull rates table not available, returning empty rates');
    return [];
  }

  async setPackPullRates(packType: string, rates: { cardTier: string; probability: number }[], updatedBy?: string): Promise<void> {
    // Since pullRates table doesn't exist, skip setting rates
    console.log('📊 Pull rates table not available, skipping rate setting for pack type:', packType);
  }

  // System settings operations
  async getSystemSetting(settingKey: string): Promise<SystemSetting | undefined> {
    // Since systemSettings table doesn't exist, return undefined
    console.log('⚙️ System settings table not available, returning undefined for setting:', settingKey);
    return undefined;
  }

  async updateSystemSetting(settingKey: string, settingValue: boolean, updatedBy?: string): Promise<SystemSetting> {
    // Since systemSettings table doesn't exist, return mock data
    console.log('⚙️ System settings table not available, skipping update for setting:', settingKey);
    return {
      id: `system-setting-${Date.now()}`,
      settingKey,
      settingValue,
      description: `Setting for ${settingKey}`,
      updatedAt: new Date(),
      updatedBy: updatedBy || 'system'
    } as SystemSetting;
  }

  async getAllSystemSettings(): Promise<SystemSetting[]> {
    // Since systemSettings table doesn't exist, return empty array
    console.log('⚙️ System settings table not available, returning empty settings');
    return [];
  }

  // Inventory operations
  async getInventoryCards(): Promise<InventoryCard[]> {
    const cacheKey = CacheKeys.inventoryAll();
    const cached = this.cache.get<InventoryCard[]>(cacheKey);
    if (cached) return cached;

    const cards = await db.select().from(inventory).orderBy(desc(inventory.createdAt));
    this.cache.set(cacheKey, cards, CacheTTL.LONG);
    return cards;
  }

  async createInventoryCard(card: InsertInventoryCard): Promise<InventoryCard> {
    const [newCard] = await db.insert(inventory).values(card).returning();
    this.invalidateInventoryCache();
    return newCard;
  }

  async updateInventoryCard(id: string, card: Partial<InsertInventoryCard>): Promise<InventoryCard> {
    const [updatedCard] = await db
      .update(inventory)
      .set({ ...card, updatedAt: new Date() })
      .where(eq(inventory.id, id))
      .returning();
    this.invalidateInventoryCache();
    return updatedCard;
  }

  async deleteInventoryCard(id: string): Promise<void> {
    await db.delete(inventory).where(eq(inventory.id, id));
    this.invalidateInventoryCache();
  }

  // Special Packs
  async getSpecialPacks(): Promise<Array<SpecialPack & { cards: Array<SpecialPrize> }>> {
    const cacheKey = CacheKeys.specialPack();
    const cached = this.cache.get<Array<SpecialPack & { cards: Array<SpecialPrize> }>>(cacheKey);
    if (cached) return cached;

    try {
      const packs = await db.select().from(specialPack);
      console.log('Fetched special packs:', packs);
      
      // Get cards for each pack (simplified schema - no inventory join needed)
      const packsWithCards = await Promise.all(
        packs.map(async (pack) => {
          try {
            const packCards = await db
              .select()
              .from(specialPrize)
              .where(eq(specialPrize.packId, pack.id));
            
            console.log(`Pack ${pack.id} cards:`, packCards);
            return { ...pack, cards: packCards };
          } catch (error) {
            console.error(`Error fetching cards for pack ${pack.id}:`, error);
            return { ...pack, cards: [] };
          }
        })
      );
      
      this.cache.set(cacheKey, packsWithCards, CacheTTL.MEDIUM);
      return packsWithCards;
    } catch (error) {
      console.error('Error in getSpecialPacks:', error);
      throw error;
    }
  }

  async getSpecialPackById(id: string): Promise<SpecialPack & { cards: Array<SpecialPrize> }> {
    const [pack] = await db.select().from(specialPack).where(eq(specialPack.id, id));
    if (!pack) {
      throw new Error('Special pack not found');
    }

    // Get cards for this special pack (simplified schema - no inventory join needed)
    const packCards = await db
      .select()
      .from(specialPrize)
      .where(eq(specialPrize.packId, id));

    return { ...pack, cards: packCards };
  }

  async createSpecialPack(pack: InsertSpecialPack): Promise<SpecialPack> {
    try {
      const packWithId = {
        ...pack,
        id: `sp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      console.log('Storage: Creating special pack with ID:', packWithId.id);
      const [newPack] = await db.insert(specialPack).values(packWithId).returning();
      console.log('Storage: Created special pack:', newPack);
      return newPack;
    } catch (error: any) {
      console.error('Storage: Error creating special pack:', error);
      console.error('Storage: Error message:', error.message);
      console.error('Storage: Error code:', error.code);
      console.error('Storage: Pack data being inserted:', pack);
      throw error;
    }
  }

  async updateSpecialPack(id: string, pack: Partial<InsertSpecialPack>): Promise<SpecialPack> {
    const [updatedPack] = await db
      .update(specialPack)
      .set(pack)
      .where(eq(specialPack.id, id))
      .returning();
    return updatedPack;
  }

  async deleteSpecialPack(id: string): Promise<void> {
    await db.delete(specialPack).where(eq(specialPack.id, id));
  }

  // Special Pack Cards
  async addCardToSpecialPack(packId: string, cardId: string, quantity: number = 1): Promise<SpecialPackCard> {
    console.log('Storage: addCardToSpecialPack called with:', { packId, cardId, quantity });

    // In simplified system, treat cardId as cardName and create a basic card entry
    const newCardData = {
      id: `spc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      packId,
      cardName: cardId, // Treat cardId as cardName in simplified system
      cardImageUrl: '/assets/Commons.png', // Default image
      cardTier: 'D', // Default tier
      refundCredit: 1, // Default refund credit
      quantity
    };
    
    console.log('Storage: new simplified card data:', newCardData);
    
    const [newCard] = await db
      .insert(specialPrize)
      .values(newCardData)
      .returning();
    
    console.log('Storage: created new simplified card:', newCard);
    return newCard;
  }

  async addCardToSpecialPackSimplified(packId: string, cardData: { cardName: string; cardImageUrl: string; cardTier: string; refundCredit: number; quantity: number }): Promise<SpecialPackCard> {
    console.log('Storage: addCardToSpecialPackSimplified called with:', { packId, cardData });
    
    const newCardData = {
      id: `spc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      packId,
      cardName: cardData.cardName,
      cardImageUrl: cardData.cardImageUrl,
      cardTier: cardData.cardTier,
      refundCredit: cardData.refundCredit,
      quantity: cardData.quantity,
      cardSource: 'Special Pack' // Auto-assigned based on pack type
    };
    
    console.log('Storage: new simplified card data:', newCardData);
    
    const [newCard] = await db
      .insert(specialPrize)
      .values(newCardData)
      .returning();
    
    console.log('Storage: created new simplified card:', newCard);
    return newCard;
  }

  async removeCardFromSpecialPack(packId: string, specialPackCardId: string): Promise<void> {
    try {
      console.log('Removing card from special pack:', { packId, specialPackCardId });
      const result = await db
        .delete(specialPrize)
        .where(and(eq(specialPrize.packId, packId), eq(specialPrize.id, specialPackCardId)));
      console.log('Delete result:', result);
    } catch (error) {
      console.error('Error in removeCardFromSpecialPack:', error);
      throw error;
    }
  }

  async updateSpecialPackCardQuantity(packId: string, specialPackCardId: string, quantity: number): Promise<SpecialPackCard> {
    const [updatedCard] = await db
      .update(specialPrize)
      .set({ quantity })
      .where(and(eq(specialPrize.packId, packId), eq(specialPrize.id, specialPackCardId)))
      .returning();
    return updatedCard;
  }

  // Mystery Packs
  async getMysteryPacks(): Promise<Array<MysteryPack & { cards: Array<MysteryPrize> }>> {
    const packs = await db.select().from(mysteryPack);

    // For the shared prize pool system, all cards are stored under the pokeball mystery pack ID
    const basePackId = 'mystery-pokeball';
    
    // Get all cards from the shared pool (simplified system - no inventory join needed)
    const allCards = await db
      .select()
      .from(mysteryPrize)
      .where(eq(mysteryPrize.packId, basePackId));

    // Return all packs with the shared cards
    return packs.map(pack => ({ ...pack, cards: allCards }));
  }

  async getMysteryPackById(id: string): Promise<MysteryPack & { cards: Array<MysteryPrize> }> {
    const [pack] = await db.select().from(mysteryPack).where(eq(mysteryPack.id, id));
    if (!pack) {
      throw new Error('Mystery pack not found');
    }

    // For the shared prize pool system, all cards are stored under the pokeball mystery pack ID
    // Use the pokeball mystery pack ID to fetch cards for all mystery pack types
    const basePackId = 'mystery-pokeball';
    
    // Get cards for this mystery pack (from the shared pool) - simplified system
    const packCards = await db
      .select()
      .from(mysteryPrize)
      .where(eq(mysteryPrize.packId, basePackId));

    return { ...pack, cards: packCards };
  }

  async createMysteryPack(pack: InsertMysteryPack): Promise<MysteryPack> {
    try {
      console.log('Storage: Creating mystery pack with data:', pack);

      const [newPack] = await db
        .insert(mysteryPack)
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
      .update(mysteryPack)
      .set(pack)
      .where(eq(mysteryPack.id, id))
      .returning();
    return updatedPack;
  }

  async deleteMysteryPack(id: string): Promise<void> {
    await db.delete(mysteryPack).where(eq(mysteryPack.id, id));
  }

  async addCardToMysteryPack(packId: string, cardId: string, quantity: number = 1): Promise<MysteryPackCard> {
    console.log('Storage: addCardToMysteryPack called with:', { packId, cardId, quantity });

    // In simplified system, treat cardId as cardName and create a basic card entry
    const newCardData = {
      id: `mpc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      packId,
      cardName: cardId, // Treat cardId as cardName in simplified system
      cardImageUrl: '/assets/Commons.png', // Default image
      cardTier: 'D', // Default tier
      refundCredit: 1, // Default refund credit
      quantity
    };
    
    console.log('Storage: new simplified card data:', newCardData);
    
    const [newCard] = await db
      .insert(mysteryPrize)
      .values(newCardData)
      .returning();
    
    console.log('Storage: created new simplified card:', newCard);
    return newCard;
  }

  async addCardToMysteryPackSimplified(packId: string, cardData: { cardName: string; cardImageUrl: string; cardTier: string; refundCredit: number; quantity: number }): Promise<MysteryPackCard> {
    console.log('Storage: addCardToMysteryPackSimplified called with:', { packId, cardData });
    
    const newCardData = {
      id: `mpc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      packId,
      cardName: cardData.cardName,
      cardImageUrl: cardData.cardImageUrl,
      cardTier: cardData.cardTier,
      refundCredit: cardData.refundCredit,
      quantity: cardData.quantity,
      cardSource: 'Mystery Pack' // Auto-assigned based on pack type
    };
    
    console.log('Storage: new simplified mystery card data:', newCardData);
    
    const [newCard] = await db
      .insert(mysteryPrize)
      .values(newCardData)
      .returning();
    
    console.log('Storage: created new simplified mystery card:', newCard);
    return newCard;
  }

  async removeCardFromMysteryPack(packId: string, cardId: string): Promise<void> {
    await db
      .delete(mysteryPrize)
      .where(and(eq(mysteryPrize.packId, packId), eq(mysteryPrize.id, cardId)));
  }

  async updateMysteryPackCardQuantity(packId: string, mysteryPackCardId: string, quantity: number): Promise<MysteryPackCard> {
    const [updatedCard] = await db
      .update(mysteryPrize)
      .set({ quantity })
      .where(and(eq(mysteryPrize.packId, packId), eq(mysteryPrize.id, mysteryPackCardId)))
      .returning();
    return updatedCard;
  }

  // Classic Packs
  async getClassicPacks(): Promise<Array<ClassicPack & { cards: Array<ClassicPackCard> }>> {
    const packs = await db.select().from(classicPack);
    
    // Get cards for each pack
    const packsWithCards = await Promise.all(
      packs.map(async (pack) => {
        const cards = await db
          .select()
          .from(classicPrize)
          .where(eq(classicPrize.packId, pack.id));
        return { ...pack, cards };
      })
    );
    
    return packsWithCards;
  }

  async getClassicPackById(id: string): Promise<ClassicPack & { cards: Array<ClassicPackCard> }> {
    const [pack] = await db.select().from(classicPack).where(eq(classicPack.id, id));
    if (!pack) {
      throw new Error('Classic pack not found');
    }

    const cards = await db
      .select()
      .from(classicPrize)
      .where(eq(classicPrize.packId, id));

    return { ...pack, cards };
  }

  async createClassicPack(pack: InsertClassicPack): Promise<ClassicPack> {
    try {
      const packWithId = {
        ...pack,
        id: `cp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      console.log('Storage: Creating classic pack with ID:', packWithId.id);
      const [newPack] = await db.insert(classicPack).values(packWithId).returning();
      console.log('Storage: Created classic pack:', newPack);
      return newPack;
    } catch (error: any) {
      console.error('Error creating classic pack:', error);
      throw error;
    }
  }

  async updateClassicPack(id: string, pack: Partial<InsertClassicPack>): Promise<ClassicPack> {
    const [updatedPack] = await db
      .update(classicPack)
      .set(pack)
      .where(eq(classicPack.id, id))
      .returning();
    return updatedPack;
  }

  async deleteClassicPack(id: string): Promise<void> {
    await db.delete(classicPack).where(eq(classicPack.id, id));
  }

  // Classic Pack Cards
  async addCardToClassicPack(packId: string, cardId: string, quantity: number = 1): Promise<ClassicPackCard> {
    console.log('Storage: addCardToClassicPack called with:', { packId, cardId, quantity });

    // In simplified system, treat cardId as cardName and create a basic card entry
    const newCardData = {
      id: `cpc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      packId,
      cardName: cardId, // Treat cardId as cardName in simplified system
      cardImageUrl: '/assets/Commons.png', // Default image
      cardTier: 'D', // Default tier
      refundCredit: 1, // Default refund credit
      quantity
    };
    
    console.log('Storage: new simplified card data:', newCardData);
    
    const [newCard] = await db
      .insert(classicPrize)
      .values(newCardData)
      .returning();
    
    console.log('Storage: created new simplified card:', newCard);
    return newCard;
  }

  async addCardToClassicPackSimplified(packId: string, cardData: { cardName: string; cardImageUrl: string; cardTier: string; refundCredit: number; quantity: number }): Promise<ClassicPackCard> {
    console.log('Storage: addCardToClassicPackSimplified called with:', { packId, cardData });
    
    const newCardData = {
      id: `cpc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      packId,
      cardName: cardData.cardName,
      cardImageUrl: cardData.cardImageUrl,
      cardTier: cardData.cardTier,
      refundCredit: cardData.refundCredit,
      quantity: cardData.quantity,
      cardSource: 'Classic Pack' // Auto-assigned based on pack type
    };
    
    console.log('Storage: new simplified classic card data:', newCardData);
    
    const [newCard] = await db
      .insert(classicPrize)
      .values(newCardData)
      .returning();
    
    console.log('Storage: created new simplified classic card:', newCard);
    return newCard;
  }

  async removeCardFromClassicPack(packId: string, cardId: string): Promise<void> {
    await db
      .delete(classicPrize)
      .where(and(eq(classicPrize.packId, packId), eq(classicPrize.id, cardId)));
  }

  async updateClassicPackCardQuantity(packId: string, classicPackCardId: string, quantity: number): Promise<ClassicPackCard> {
    const [updatedCard] = await db
      .update(classicPrize)
      .set({ quantity })
      .where(and(eq(classicPrize.packId, packId), eq(classicPrize.id, classicPackCardId)))
      .returning();
    return updatedCard;
  }

  // Helper function to validate UUID format
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  // purchaseAndOpenClassicPack function - REMOVED FOR REBUILD

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
