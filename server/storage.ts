import {
  users,
  packs,
  packOdds,
  virtualLibrary,
  inventory,
  specialPacks,
  specialPackCards,
  classicPacks,
  classicPackCards,
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
  type ClassicPack,
  type InsertClassicPack,
  type ClassicPackCard,
  type InsertClassicPackCard,
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
  getClassicPacks(): Promise<Array<ClassicPack & { cards: Array<ClassicPackCard & { card: InventoryCard }> }>>;
  getClassicPackById(id: string): Promise<ClassicPack & { cards: Array<ClassicPackCard & { card: InventoryCard }> }>;
  createClassicPack(pack: InsertClassicPack): Promise<ClassicPack>;
  updateClassicPack(id: string, pack: Partial<InsertClassicPack>): Promise<ClassicPack>;
  deleteClassicPack(id: string): Promise<void>;
  
  // Classic Pack Cards
  addCardToClassicPack(packId: string, cardId: string, quantity?: number): Promise<ClassicPackCard>;
  removeCardFromClassicPack(packId: string, classicPackCardId: string): Promise<void>;
  updateClassicPackCardQuantity(packId: string, classicPackCardId: string, quantity: number): Promise<ClassicPackCard>;
  
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
    this.cache.delete(CacheKeys.specialPacks());
    this.cache.delete(CacheKeys.classicPacks());
    this.cache.delete(CacheKeys.mysteryPacks());
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
    const cacheKey = CacheKeys.user(id);
    const cached = this.cache.get<User>(cacheKey);
    if (cached) return cached;

    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (user) {
      this.cache.set(cacheKey, user, CacheTTL.MEDIUM);
    }
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
    const cacheKey = CacheKeys.userCards(userId);
    const cached = this.cache.get<UserCardWithCard[]>(cacheKey);
    if (cached) return cached;

    console.log('🔍 getUserCards called for userId:', userId);
    
    // Single optimized query with JOIN - eliminates N+1 query issue
    const result = await db
      .select({
        // User card fields
        id: userCards.id,
        userId: userCards.userId,
        cardId: userCards.cardId,
        pullValue: userCards.pullValue,
        quantity: userCards.quantity,
        pulledAt: userCards.pulledAt,
        isRefunded: userCards.isRefunded,
        isShipped: userCards.isShipped,
        packId: userCards.packId,
        packSource: userCards.packSource,
        // Inventory card fields
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
      .from(userCards)
      .innerJoin(inventory, eq(userCards.cardId, inventory.id))
      .where(and(
        eq(userCards.userId, userId),
        eq(userCards.isRefunded, false),
        eq(userCards.isShipped, false)
      ))
      .orderBy(desc(userCards.pulledAt));

      const finalResult = result.map(row => ({
        id: row.id,
        userId: row.userId,
        cardId: row.cardId,
        pullValue: row.pullValue,
        quantity: row.quantity,
        pulledAt: row.pulledAt,
        isRefunded: row.isRefunded,
        isShipped: row.isShipped,
        packId: row.packId,
        packSource: row.packSource,
        card: row.card ? {
          ...row.card,
          // Add missing fields that the old cards table had
          isActive: true,
          packType: 'inventory',
          marketValue: row.card.credits.toString(),
          stock: null,
        } : null,
      })) as UserCardWithCard[];

    console.log('🔍 Final getUserCards result:', finalResult.length, 'cards');
    console.log('🔍 Final cards:', finalResult.map(card => ({ id: card.id, name: card.card?.name, quantity: card.quantity })));
    
    this.cache.set(cacheKey, finalResult, CacheTTL.SHORT);
    return finalResult;
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

        // Check if user already has this card
        const [existingCard] = await tx
          .select()
          .from(userCards)
          .where(and(
            eq(userCards.userId, userCard.userId!),
            eq(userCards.cardId, userCard.cardId!),
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
          userId: userCard.userId,
          cardId: userCard.cardId,
          pullValue: pullValue.toString(),
          quantity: userCard.quantity,
          isRefunded: userCard.isRefunded ?? false,
          isShipped: userCard.isShipped ?? false,
          packSource: userCard.packSource || null,
          packId: userCard.packId || null,
        };

        await tx.insert(userCards).values(insertData);
          console.log(`✅ Added new card to vault: ${userCard.quantity}x ${userCard.cardId}`);
        }
        
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
          cardId: userCards.cardId,
          pullValue: userCards.pullValue,
          quantity: userCards.quantity,
          packSource: userCards.packSource,
          packId: userCards.packId,
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
        const refundAmount = parseFloat(card.pullValue) * card.quantity;
        totalRefund += refundAmount;
      }

      // OPTIMIZATION: Bulk operations instead of individual queries
      if (cardsToRefund.length > 0) {
        // Group cards by directory for library-style return system
        console.log(`🔄 Processing refund for ${cardsToRefund.length} cards`);
        console.log(`📚 Library system: Grouping cards by directory for return`);
        
        const cardsByDirectory = new Map<string, typeof cardsToRefund>();
        
        for (const card of cardsToRefund) {
          const directory = card.directory || 'Mystery Pack'; // Default to Mystery Pack for backward compatibility
          const packSource = card.packSource || 'special';
          const directoryKey = `${directory}:${packSource}`;
          
          if (!cardsByDirectory.has(directoryKey)) {
            cardsByDirectory.set(directoryKey, []);
          }
          cardsByDirectory.get(directoryKey)!.push(card);
        }

        // Process each directory separately (library-style return)
        for (const [directoryKey, cards] of Array.from(cardsByDirectory.entries())) {
          const [directory, packSource] = directoryKey.split(':');
          console.log(`📚 Library system: Processing refund for ${cards.length} cards from directory: ${directory} (${packSource} pack)`);
          
          const inventoryCardIds = cards
            .filter(card => card.inventoryCard)
            .map(card => card.inventoryCard!.id);

          if (inventoryCardIds.length > 0) {
            if (packSource === 'classic') {
              // Handle classic pack cards for specific directory
              const packCards = await tx
                .select()
                .from(classicPackCards)
                .where(and(
                  inArray(classicPackCards.cardId, inventoryCardIds),
                  eq(classicPackCards.directory, directory)
                ));

              const packCardMap = new Map(packCards.map(pc => [pc.cardId, pc]));
              const packUpdates = new Map<string, number>();
              
              for (const card of cards) {
                if (card.inventoryCard) {
                  const packCard = packCardMap.get(card.inventoryCard.id);
                  if (packCard) {
                    const currentQuantity = packUpdates.get(packCard.id) || 0;
                    packUpdates.set(packCard.id, currentQuantity + (card.quantity || 1));
                  }
                }
              }

              // Bulk update classic pack quantities
              for (const [packCardId, totalQuantity] of Array.from(packUpdates.entries())) {
                await tx
                  .update(classicPackCards)
                  .set({ 
                    quantity: sql`${classicPackCards.quantity} + ${totalQuantity}` 
                  })
                  .where(eq(classicPackCards.id, packCardId));
              }

              console.log(`✅ Bulk updated ${packUpdates.size} classic pack cards with refunded quantities for directory: ${directory}`);
              
            } else if (packSource === 'mystery') {
              // Handle mystery pack cards for specific directory
              const packCards = await tx
                .select()
                .from(mysteryPackCards)
                .where(and(
                  inArray(mysteryPackCards.cardId, inventoryCardIds),
                  eq(mysteryPackCards.directory, directory)
                ));

              const packCardMap = new Map(packCards.map(pc => [pc.cardId, pc]));
              const packUpdates = new Map<string, number>();
              
              for (const card of cards) {
                if (card.inventoryCard) {
                  const packCard = packCardMap.get(card.inventoryCard.id);
                  if (packCard) {
                    const currentQuantity = packUpdates.get(packCard.id) || 0;
                    packUpdates.set(packCard.id, currentQuantity + (card.quantity || 1));
                  }
                }
              }

              // Bulk update mystery pack quantities
              for (const [packCardId, totalQuantity] of Array.from(packUpdates.entries())) {
                await tx
                  .update(mysteryPackCards)
                  .set({ 
                    quantity: sql`${mysteryPackCards.quantity} + ${totalQuantity}` 
                  })
                  .where(eq(mysteryPackCards.id, packCardId));
              }

              console.log(`✅ Bulk updated ${packUpdates.size} mystery pack cards with refunded quantities for directory: ${directory}`);
              
            } else {
              // Handle special pack cards for specific directory
              const packCards = await tx
                .select()
                .from(specialPackCards)
                .where(and(
                  inArray(specialPackCards.cardId, inventoryCardIds),
                  eq(specialPackCards.directory, directory)
                ));

              const packCardMap = new Map(packCards.map(pc => [pc.cardId, pc]));
              const packUpdates = new Map<string, number>();
              
              for (const card of cards) {
                if (card.inventoryCard) {
                  const packCard = packCardMap.get(card.inventoryCard.id);
                  if (packCard) {
                    const currentQuantity = packUpdates.get(packCard.id) || 0;
                    packUpdates.set(packCard.id, currentQuantity + (card.quantity || 1));
                  }
                }
              }

              // Bulk update special pack quantities
              for (const [packCardId, totalQuantity] of Array.from(packUpdates.entries())) {
                await tx
                  .update(specialPackCards)
                  .set({ 
                    quantity: sql`${specialPackCards.quantity} + ${totalQuantity}` 
                  })
                  .where(eq(specialPackCards.id, packCardId));
              }

              console.log(`✅ Bulk updated ${packUpdates.size} special pack cards with refunded quantities for directory: ${directory}`);
            }
          }
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

      // Invalidate user cards cache and user cache
      this.cache.delete(CacheKeys.userCards(userId));
      this.cache.delete(CacheKeys.user(userId));
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
    const [newUserPack] = await db.insert(userPacks).values(userPack).returning();
    console.log('Storage: addUserPack result:', newUserPack);
    
    // Invalidate user packs cache
    this.cache.delete(CacheKeys.userPacks(userPack.userId || ''));
    
    return newUserPack;
  }

  private async openClassicPack(tx: any, userPack: any, classicPack: any, userId: string): Promise<PackOpenResult> {
    console.log('🎯 Opening classic pack:', classicPack.name);
    
    // Get all cards in the classic pack pool with quantity > 0
    const packCards = await tx
      .select({
        id: classicPackCards.id,
        packId: classicPackCards.packId,
        cardId: classicPackCards.cardId,
        quantity: classicPackCards.quantity,
        createdAt: classicPackCards.createdAt,
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
      .from(classicPackCards)
      .innerJoin(inventory, eq(classicPackCards.cardId, inventory.id))
      .where(
        and(
          eq(classicPackCards.packId, classicPack.id),
          gt(classicPackCards.quantity, 0) // Only include cards with quantity > 0
        )
      );

    console.log('🎯 Available pack cards (quantity > 0):', packCards.length);
    console.log('🎯 Pack cards details:', packCards.map((pc: any) => ({ 
      name: pc.card.name, 
      tier: pc.card.tier, 
      quantity: pc.quantity 
    })));
    
    if (packCards.length === 0) {
      throw new Error('No cards available in classic pack');
    }

        // Use fixed Pokeball Mystery Pack odds for Black Bolt pack
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
      const tier = pc.card?.tier || 'D';
      if (!cardsByTier[tier]) {
        cardsByTier[tier] = [];
      }
      cardsByTier[tier].push(pc);
    }
    
    console.log('🎯 Cards by tier:', cardsByTier);
    console.log('🎯 Cards by tier details:', Object.keys(cardsByTier).map(tier => ({
      tier,
      count: cardsByTier[tier].length,
      cards: cardsByTier[tier].map(pc => ({ name: pc.card.name, quantity: pc.quantity }))
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
    const cardsToDeduct: { classicPackCardId: string; quantity: number }[] = [];
    
        // Add 7 common cards (D tier) - always use D tier for common positions
        const commonCards = cardsByTier['D'] || [];
        console.log('🎯 Common cards available:', commonCards.length);
        
        if (commonCards.length === 0) {
          throw new Error('No common cards (D tier) found in classic pack');
        }
    
    for (let i = 0; i < 7; i++) {
      const selectedCard = commonCards[Math.floor(Math.random() * commonCards.length)];
      
      selectedCards.push({
        id: selectedCard.card.id,
        name: selectedCard.card.name || 'Common Card',
        imageUrl: selectedCard.card.imageUrl || '/card-images/random-common-card.png',
        tier: selectedCard.card.tier || 'D',
        marketValue: selectedCard.card.credits || 1,
        isHit: false,
        position: i
      });
      
      // Track quantity deduction
      const existingDeduction = cardsToDeduct.find(d => d.classicPackCardId === selectedCard.id);
      if (existingDeduction) {
        existingDeduction.quantity += 1;
      } else {
        cardsToDeduct.push({ classicPackCardId: selectedCard.id, quantity: 1 });
      }
    }

        // Add 1 hit card using ODDS-BASED selection (not quantity-based)
        const allHitCards = packCards.filter((pc: any) => pc.card && ['C', 'B', 'A', 'S', 'SS', 'SSS'].includes(pc.card.tier));
        console.log('🎯 Hit cards available:', allHitCards.length);
        
        if (allHitCards.length === 0) {
          throw new Error('No hit cards (C+ tier) found in classic pack');
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
      id: hitCard.card.id,
      name: hitCard.card.name || 'Hit Card',
      imageUrl: hitCard.card.imageUrl || '/card-images/hit.png',
      tier: hitCard.card.tier || 'C',
      marketValue: hitCard.card.credits || 100,
      isHit: true,
      position: 7
    });
    
    // Track quantity deduction for hit card
    const existingDeduction = cardsToDeduct.find(d => d.classicPackCardId === hitCard.id);
    if (existingDeduction) {
      existingDeduction.quantity += 1;
    } else {
      cardsToDeduct.push({ classicPackCardId: hitCard.id, quantity: 1 });
    }

    // Deduct quantities from classic pack cards
    console.log('🎯 Deducting quantities from classic pack cards...');
    console.log('🎯 Cards to deduct:', JSON.stringify(cardsToDeduct, null, 2));
    for (const deduction of cardsToDeduct) {
      console.log(`🎯 Looking for pack card with ID: ${deduction.classicPackCardId}`);
      const currentCard = packCards.find((pc: any) => pc.id === deduction.classicPackCardId);
      console.log(`🎯 Found pack card:`, currentCard ? { id: currentCard.id, cardId: currentCard.cardId, quantity: currentCard.quantity } : 'NOT FOUND');
      if (currentCard && currentCard.quantity >= deduction.quantity) {
        await tx
          .update(classicPackCards)
          .set({ quantity: currentCard.quantity - deduction.quantity })
          .where(eq(classicPackCards.id, deduction.classicPackCardId));
        console.log(`✅ Updated classic pack card ${deduction.classicPackCardId} quantity: ${currentCard.quantity} -> ${currentCard.quantity - deduction.quantity}`);
      } else {
        console.log(`❌ ERROR: Not enough quantity for card ${deduction.classicPackCardId}. Current: ${currentCard?.quantity || 0}, Required: ${deduction.quantity}`);
        throw new Error(`Not enough quantity for card ${deduction.classicPackCardId}. Current: ${currentCard?.quantity || 0}, Required: ${deduction.quantity}`);
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
          cardId: card.id,
          pullValue: card.marketValue.toString(),
          quantity,
          isRefunded: false,
          isShipped: false,
          packSource: 'classic',
          packId: classicPack.id
        });
        console.log(`✅ Added ${quantity}x ${card.name} to user vault from classic pack: ${classicPack.name} (${classicPack.id})`);
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
      console.log(`📰 Adding pack pull to global feed: ${finalHitCard.tier} tier card - ${finalHitCard.name}`);
          await this.addGlobalFeedEntry({
            userId,
            cardId: finalHitCard.id,
            tier: finalHitCard.tier,
            gameType: 'pack'
          });
      console.log('✅ Successfully added to global feed');
    }

    console.log('🎯 Classic pack opening complete');
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
        packId: null,
        packSource: null,
        directory: null
      },
      packCards: selectedCards,
      hitCardPosition: 7,
      packType: 'classic'
    };
  }

  private async openSpecialPack(tx: any, userPack: any, specialPack: any, userId: string): Promise<PackOpenResult> {
    console.log('🎯 Opening special pack:', specialPack.name);
    console.log('📚 Library system: Looking for cards in directory:', specialPack.name);
    
    // Get all cards in the special pack pool with quantity > 0 and matching directory
    const packCards = await tx
      .select({
        id: specialPackCards.id,
        packId: specialPackCards.packId,
        cardId: specialPackCards.cardId,
        quantity: specialPackCards.quantity,
        directory: specialPackCards.directory,
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
      .where(
        and(
          eq(specialPackCards.packId, specialPack.id),
          eq(specialPackCards.directory, specialPack.name), // Library system: Only cards from this directory
          gt(specialPackCards.quantity, 0) // Only include cards with quantity > 0
        )
      );

    console.log('🎯 Available special pack cards (quantity > 0):', packCards.length);
    console.log('🎯 Special pack cards details:', packCards.map((pc: any) => ({ 
      name: pc.card.name, 
      tier: pc.card.tier, 
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
      const tier = pc.card?.tier || 'D';
      if (!cardsByTier[tier]) {
        cardsByTier[tier] = [];
      }
      cardsByTier[tier].push(pc);
    }
    
    console.log('🎯 Cards by tier:', cardsByTier);
    console.log('🎯 Cards by tier details:', Object.keys(cardsByTier).map(tier => ({
      tier,
      count: cardsByTier[tier].length,
      cards: cardsByTier[tier].map(pc => ({ name: pc.card.name, quantity: pc.quantity }))
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
        id: selectedCard.card.id,
        name: selectedCard.card.name || 'Common Card',
        imageUrl: selectedCard.card.imageUrl || '/card-images/random-common-card.png',
        tier: selectedCard.card.tier || 'D',
        marketValue: selectedCard.card.credits || 1,
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
    const allHitCards = packCards.filter((pc: any) => pc.card && ['C', 'B', 'A', 'S', 'SS', 'SSS'].includes(pc.card.tier));
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
      id: hitCard.card.id,
      name: hitCard.card.name || 'Hit Card',
      imageUrl: hitCard.card.imageUrl || '/card-images/hit.png',
      tier: hitCard.card.tier || 'C',
      marketValue: hitCard.card.credits || 100,
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
      console.log(`🎯 Found pack card:`, currentCard ? { id: currentCard.id, cardId: currentCard.cardId, quantity: currentCard.quantity } : 'NOT FOUND');
      if (currentCard && currentCard.quantity >= deduction.quantity) {
        await tx
          .update(specialPackCards)
          .set({ quantity: currentCard.quantity - deduction.quantity })
          .where(eq(specialPackCards.id, deduction.specialPackCardId));
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
          cardId: card.id,
          pullValue: card.marketValue.toString(),
          quantity,
          isRefunded: false,
          isShipped: false,
          packSource: 'special',
          packId: specialPack.id,
          directory: specialPack.name // Library system: Store directory for return tracking
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
      await tx.insert(globalFeed).values({
        userId,
        cardId: finalHitCard.id,
        tier: finalHitCard.tier,
        gameType: 'pack'
      });
    }

    // Invalidate user packs cache
    this.cache.delete(CacheKeys.userPacks(userId));

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
        packId: null,
        packSource: null,
        directory: null
      },
      packCards: selectedCards,
      hitCardPosition: 7, // The 8th card (index 7) is the hit card
      packType: 'special',
    };
  }

  private async openMysteryPack(tx: any, userPack: any, mysteryPack: any, userId: string): Promise<PackOpenResult> {
    console.log('🎲 Opening mystery pack:', mysteryPack.subtype);
    console.log('📚 Library system: Looking for cards in directory: Mystery Pack');
    
    // Use the base mystery pack ID to get cards from the shared pool
    const basePackId = '00000000-0000-0000-0000-000000000001';
    console.log('🎲 Using base mystery pack ID for shared cards:', basePackId);
    console.log('🎲 Pack subtype for odds:', mysteryPack.subtype);
    
    // Get all cards in the shared mystery pack pool with quantity > 0 and matching directory
    const packCards = await tx
      .select({
        id: mysteryPackCards.id,
        packId: mysteryPackCards.packId,
        cardId: mysteryPackCards.cardId,
        quantity: mysteryPackCards.quantity,
        directory: mysteryPackCards.directory,
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
        .where(
          and(
            eq(mysteryPackCards.packId, basePackId),
            eq(mysteryPackCards.directory, 'Mystery Pack'), // Library system: Only cards from Mystery Pack directory
            gt(mysteryPackCards.quantity, 0) // Only include cards with quantity > 0
          )
        );

    console.log('🎲 Found pack cards:', packCards.length);
    console.log('🎲 Pack cards details:', packCards.map((pc: any) => ({ id: pc.id, cardName: pc.card?.name, quantity: pc.quantity })));

    if (packCards.length === 0) {
      throw new Error('No cards available in mystery pack');
    }

    console.log('🎲 Available cards in shared pool:', packCards.length);
    console.log('🎲 Pack cards details:', packCards.map((pc: any) => ({ name: pc.card.name, tier: pc.card.tier, quantity: pc.quantity })));

    // Check if we have cards for each required tier with quantity > 0
    const requiredTiers = ['D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
    const cardsByTier: { [key: string]: any[] } = {};
    for (const pc of packCards) {
      const tier = pc.card?.tier || 'D';
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
    const [latestMysteryPack] = await tx
      .select({ odds: mysteryPacks.odds })
      .from(mysteryPacks)
      .where(eq(mysteryPacks.id, mysteryPack.id));
    
    // Parse odds from the latest mystery pack data
    const odds = latestMysteryPack?.odds || {};
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
        
        if (selectedCard.card) {
          selectedCards.push({
            id: selectedCard.card.id,
            name: selectedCard.card.name || "Common Card",
            imageUrl: selectedCard.card.imageUrl || "/card-images/random-common-card.png",
            tier: selectedCard.card.tier || "D",
            marketValue: selectedCard.card.credits || 1,
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
        if (mysteryPack.subtype === 'masterball') {
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
            
            console.log(`🎯 Selected Masterball card for hit position:`, selectedHitCard.card?.name);
            
            if (selectedHitCard.card) {
              selectedCards.push({
                id: selectedHitCard.card.id,
                name: selectedHitCard.card.name || 'Hit Card',
                imageUrl: selectedHitCard.card.imageUrl || '/card-images/hit.png',
                tier: selectedHitCard.card.tier || 'A',
                marketValue: selectedHitCard.card.credits || 1000,
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
          
          console.log(`🎯 Selected card for hit position:`, selectedHitCard.card?.name);
          
          if (selectedHitCard.card) {
            selectedCards.push({
              id: selectedHitCard.card.id,
              name: selectedHitCard.card.name || 'Hit Card',
              imageUrl: selectedHitCard.card.imageUrl || '/card-images/hit.png',
              tier: selectedHitCard.card.tier || 'A',
              marketValue: selectedHitCard.card.credits || 1000,
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
          imageUrl: randomCommon.card.imageUrl || '/card-images/random-common-card.png',
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
        .from(mysteryPackCards)
        .where(eq(mysteryPackCards.id, deduction.mysteryPackCardId))
        .for('update');

      if (packCard && packCard.quantity >= deduction.quantity) {
        console.log(`🎯 Deducting ${deduction.quantity} of card ${packCard.cardId} from shared mystery pack`);
      await tx
        .update(mysteryPackCards)
          .set({ quantity: packCard.quantity - deduction.quantity })
        .where(eq(mysteryPackCards.id, deduction.mysteryPackCardId));
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
      await this.addUserCard({
        userId,
        cardId,
        quantity,
        pullValue: cardValues.get(cardId) || '0',
        isRefunded: false,
        isShipped: false,
        packSource: 'mystery',
        packId: mysteryPack.id,
        directory: 'Mystery Pack' // Library system: Store directory for return tracking
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

    // Invalidate user packs cache
    this.cache.delete(CacheKeys.userPacks(userId));

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
        packId: null,
        packSource: null,
        directory: null
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
        const mysteryPack = await tx
          .select()
          .from(mysteryPacks)
          .where(eq(mysteryPacks.id, userPack.packId))
          .limit(1);

        if (mysteryPack.length > 0) {
          // This is a mystery pack - handle it with the new logic
          return await this.openMysteryPack(tx, userPack, mysteryPack[0], userId);
        }

        // Check if it's a classic pack
        const classicPack = await tx
          .select()
          .from(classicPacks)
          .where(eq(classicPacks.id, userPack.packId))
          .limit(1);

        if (classicPack.length > 0) {
          // This is a classic pack - handle it with the new logic
          return await this.openClassicPack(tx, userPack, classicPack[0], userId);
        }

        // Check if it's a special pack
        const specialPack = await tx
          .select()
          .from(specialPacks)
          .where(eq(specialPacks.id, userPack.packId))
          .limit(1);

        if (specialPack.length > 0) {
          // This is a special pack - handle it with the new logic
          return await this.openSpecialPack(tx, userPack, specialPack[0], userId);
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

      // Invalidate user packs cache
      this.cache.delete(CacheKeys.userPacks(userId));

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
    const cacheKey = CacheKeys.globalFeed(limit, minTier);
    const cached = this.cache.get<GlobalFeedWithDetails[]>(cacheKey);
    if (cached) return cached;

    console.log('📰 getGlobalFeed called with:', { limit, minTier });
    
    try {
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
      
      console.log('📰 Using tier filter:', tierFilter);

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
        cardCredits: inventory.credits,
        cardTier: inventory.tier,
      })
      .from(globalFeed)
      .leftJoin(users, eq(globalFeed.userId, users.id))
      .leftJoin(inventory, eq(globalFeed.cardId, inventory.id))
      .where(inArray(globalFeed.tier, tierFilter))
      .orderBy(desc(globalFeed.createdAt))
      .limit(limit);

    const feedEntries = result.map(row => {
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
          credits: row.cardCredits,
        } as InventoryCard,
      };
    });

    this.cache.set(cacheKey, feedEntries, CacheTTL.SHORT);
    return feedEntries;
    } catch (error) {
      console.error('❌ Error in getGlobalFeed:', error);
      throw error;
    }
  }

  async addGlobalFeedEntry(entry: { userId: string; cardId: string; tier: string; gameType: string }): Promise<void> {
    await db.insert(globalFeed).values(entry);
    this.invalidateGlobalFeedCache();
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
  async getSpecialPacks(): Promise<Array<SpecialPack & { cards: Array<SpecialPackCard & { card: InventoryCard }> }>> {
    const cacheKey = CacheKeys.specialPacks();
    const cached = this.cache.get<Array<SpecialPack & { cards: Array<SpecialPackCard & { card: InventoryCard }> }>>(cacheKey);
    if (cached) return cached;

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
      
      this.cache.set(cacheKey, packsWithCards, CacheTTL.MEDIUM);
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

    // For the shared prize pool system, all cards are stored under the base mystery pack ID
    const basePackId = '00000000-0000-0000-0000-000000000001';
    
    // Get all cards from the shared pool
    const allCards = await db
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
      .where(eq(mysteryPackCards.packId, basePackId));

    // Return all packs with the shared cards
    return packs.map(pack => ({ ...pack, cards: allCards }));
  }

  async getMysteryPackById(id: string): Promise<MysteryPack & { cards: Array<MysteryPackCard & { card: InventoryCard }> }> {
    const [pack] = await db.select().from(mysteryPacks).where(eq(mysteryPacks.id, id));
    if (!pack) {
      throw new Error('Mystery pack not found');
    }

    // For the shared prize pool system, all cards are stored under the base mystery pack ID
    // Use the base mystery pack ID to fetch cards for all mystery pack types
    const basePackId = '00000000-0000-0000-0000-000000000001';
    
    // Get cards for this mystery pack (from the shared pool)
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
      .where(eq(mysteryPackCards.packId, basePackId));

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
  async getClassicPacks(): Promise<Array<ClassicPack & { cards: Array<ClassicPackCard & { card: InventoryCard }> }>> {
    const cacheKey = CacheKeys.classicPacks();
    const cached = this.cache.get<Array<ClassicPack & { cards: Array<ClassicPackCard & { card: InventoryCard }> }>>(cacheKey);
    if (cached) return cached;

    try {
      const packs = await db.select().from(classicPacks);
      console.log('Fetched classic packs:', packs);
      
      // Get cards for each pack
      const packsWithCards = await Promise.all(
        packs.map(async (pack) => {
          try {
            const packCards = await db
              .select({
                id: classicPackCards.id,
                packId: classicPackCards.packId,
                cardId: classicPackCards.cardId,
                quantity: classicPackCards.quantity,
                createdAt: classicPackCards.createdAt,
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
              .from(classicPackCards)
              .innerJoin(inventory, eq(classicPackCards.cardId, inventory.id))
              .where(eq(classicPackCards.packId, pack.id));
            
            console.log(`Classic pack ${pack.id} cards:`, packCards);
            return { ...pack, cards: packCards };
          } catch (error) {
            console.error(`Error fetching cards for classic pack ${pack.id}:`, error);
            return { ...pack, cards: [] };
          }
        })
      );
      
      this.cache.set(cacheKey, packsWithCards, CacheTTL.MEDIUM);
      return packsWithCards;
    } catch (error) {
      console.error('Error in getClassicPacks:', error);
      throw error;
    }
  }

  async getClassicPackById(id: string): Promise<ClassicPack & { cards: Array<ClassicPackCard & { card: InventoryCard }> }> {
    const [pack] = await db.select().from(classicPacks).where(eq(classicPacks.id, id));
    
    if (!pack) {
      throw new Error('Classic pack not found');
    }

    // Get cards for this classic pack
    const packCards = await db
      .select({
        id: classicPackCards.id,
        packId: classicPackCards.packId,
        cardId: classicPackCards.cardId,
        quantity: classicPackCards.quantity,
        createdAt: classicPackCards.createdAt,
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
      .from(classicPackCards)
      .innerJoin(inventory, eq(classicPackCards.cardId, inventory.id))
      .where(eq(classicPackCards.packId, id));

    return { ...pack, cards: packCards };
  }

  async createClassicPack(packData: InsertClassicPack): Promise<ClassicPack> {
    const [newPack] = await db.insert(classicPacks).values(packData).returning();
    return newPack;
  }

  async updateClassicPack(id: string, packData: Partial<InsertClassicPack>): Promise<ClassicPack> {
    const [updatedPack] = await db
      .update(classicPacks)
      .set(packData)
      .where(eq(classicPacks.id, id))
      .returning();
    return updatedPack;
  }

  async deleteClassicPack(id: string): Promise<void> {
    await db.delete(classicPacks).where(eq(classicPacks.id, id));
  }

  // Classic Pack Cards
  async addCardToClassicPack(packId: string, cardId: string, quantity: number = 1): Promise<ClassicPackCard> {
    const id = `cpc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const [newCard] = await db.insert(classicPackCards).values({
      id,
      packId,
      cardId,
      quantity,
    }).returning();
    return newCard;
  }

  async removeCardFromClassicPack(packId: string, classicPackCardId: string): Promise<void> {
    await db.delete(classicPackCards).where(
      and(
        eq(classicPackCards.packId, packId),
        eq(classicPackCards.id, classicPackCardId)
      )
    );
  }

  async updateClassicPackCardQuantity(packId: string, classicPackCardId: string, quantity: number): Promise<ClassicPackCard> {
    const [updatedCard] = await db
      .update(classicPackCards)
      .set({ quantity })
      .where(and(eq(classicPackCards.packId, packId), eq(classicPackCards.id, classicPackCardId)))
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
