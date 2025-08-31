import {
  users,
  cards,
  packs,
  packOdds,
  virtualLibrary,
  virtualPacks,
  virtualPackCards,
  virtualPackPullRates,
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
  type VirtualLibraryCard,
  type VirtualPack,
  type VirtualPackCard,
  type VirtualPackPullRate,
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
  type InsertVirtualPack,
  type InsertVirtualPackCard,
  type InsertVirtualPackPullRate,
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
  type VirtualPackOpenResult,
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
  updateCard(id: string, card: Partial<InsertCard>): Promise<Card>;
  updateCardStock(id: string, stock: number): Promise<void>;
  deleteCard(id: string): Promise<void>;
  
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
  
  // Virtual pack operations
  getVirtualPacks(): Promise<VirtualPack[]>;
  getActiveVirtualPacks(): Promise<VirtualPack[]>;
  createVirtualPack(pack: InsertVirtualPack): Promise<VirtualPack>;
  updateVirtualPack(id: string, pack: Partial<InsertVirtualPack>): Promise<VirtualPack>;
  deleteVirtualPack(id: string): Promise<void>;
  
  // Virtual pack card pool operations (using virtual library cards)
  getVirtualPackCards(virtualPackId: string): Promise<VirtualPackCard[]>;
  setVirtualPackCards(virtualPackId: string, cardIds: string[], weights: number[]): Promise<void>;
  
  // Virtual pack pull rate operations (tier-based probabilities)
  getVirtualPackPullRates(virtualPackId: string): Promise<VirtualPackPullRate[]>;
  setVirtualPackPullRates(virtualPackId: string, rates: { cardTier: string; probability: number }[], updatedBy?: string): Promise<void>;
  
  openVirtualPack(virtualPackId: string, userId: string): Promise<VirtualPackOpenResult>;
  
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
  getPackPullRates(packType: string): Promise<PullRate[]>;
  setPackPullRates(packType: string, rates: { cardTier: string; probability: number }[], updatedBy?: string): Promise<void>;
  getAllPullRates(): Promise<PullRate[]>;
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

  async updateCard(id: string, cardData: Partial<InsertCard>): Promise<Card> {
    const [updatedCard] = await db.update(cards)
      .set({ ...cardData })
      .where(eq(cards.id, id))
      .returning();
    return updatedCard;
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

  async getVirtualPacks(): Promise<VirtualPack[]> {
    return await db.select().from(virtualPacks).where(eq(virtualPacks.isActive, true));
  }

  async getActiveVirtualPacks(): Promise<VirtualPack[]> {
    return await db.select().from(virtualPacks).where(eq(virtualPacks.isActive, true));
  }

  async createVirtualPack(pack: InsertVirtualPack): Promise<VirtualPack> {
    const [newPack] = await db.insert(virtualPacks).values(pack).returning();
    return newPack;
  }

  async updateVirtualPack(id: string, pack: Partial<InsertVirtualPack>): Promise<VirtualPack> {
    const [updatedPack] = await db.update(virtualPacks).set(pack).where(eq(virtualPacks.id, id)).returning();
    return updatedPack;
  }

  async deleteVirtualPack(id: string): Promise<void> {
    await db.update(virtualPacks).set({ isActive: false }).where(eq(virtualPacks.id, id));
  }

  // Virtual pack card pool operations
  async getVirtualPackCards(virtualPackId: string): Promise<VirtualPackCard[]> {
    return await db.select().from(virtualPackCards).where(and(eq(virtualPackCards.virtualPackId, virtualPackId), eq(virtualPackCards.isActive, true)));
  }

  async setVirtualPackCards(virtualPackId: string, cardIds: string[], weights: number[]): Promise<void> {
    await db.transaction(async (tx) => {
      // Remove existing card pool
      await tx.update(virtualPackCards).set({ isActive: false }).where(eq(virtualPackCards.virtualPackId, virtualPackId));
      
      // Add new card pool using virtual library cards
      const newCards = cardIds.map((cardId, index) => ({
        virtualPackId,
        virtualLibraryCardId: cardId,
        weight: weights[index] || 1,
      }));
      
      if (newCards.length > 0) {
        await tx.insert(virtualPackCards).values(newCards);
      }
    });
  }

  async getVirtualPackPullRates(virtualPackId: string): Promise<VirtualPackPullRate[]> {
    return await db.select()
      .from(virtualPackPullRates)
      .where(eq(virtualPackPullRates.virtualPackId, virtualPackId));
  }

  async setVirtualPackPullRates(virtualPackId: string, rates: { cardTier: string; probability: number }[], updatedBy?: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Remove existing pull rates for this pack
      await tx.delete(virtualPackPullRates).where(eq(virtualPackPullRates.virtualPackId, virtualPackId));
      
      // Add new pull rates
      const newRates = rates.map(rate => ({
        virtualPackId,
        cardTier: rate.cardTier,
        probability: rate.probability,
        updatedBy: updatedBy || 'system',
      }));
      
      if (newRates.length > 0) {
        await tx.insert(virtualPackPullRates).values(newRates);
      }
    });
  }

  async openVirtualPack(virtualPackId: string, userId: string): Promise<VirtualPackOpenResult> {
    return await db.transaction(async (tx) => {
      // Get virtual pack info
      const [virtualPack] = await tx.select().from(virtualPacks).where(eq(virtualPacks.id, virtualPackId));
      if (!virtualPack) {
        throw new Error('Virtual pack not found');
      }

      // Get virtual pack pull rates (tier-based probabilities)
      const pullRates = await tx.select()
        .from(virtualPackPullRates)
        .where(eq(virtualPackPullRates.virtualPackId, virtualPackId));

      if (pullRates.length === 0) {
        throw new Error('No pull rates configured for this virtual pack');
      }

      // Get pack-specific cards assigned through manage content
      const packCards = await tx
        .select({
          card: virtualLibrary,
          weight: virtualPackCards.weight,
        })
        .from(virtualPackCards)
        .innerJoin(virtualLibrary, eq(virtualPackCards.virtualLibraryCardId, virtualLibrary.id))
        .where(and(
          eq(virtualPackCards.virtualPackId, virtualPackId),
          eq(virtualPackCards.isActive, true),
          eq(virtualLibrary.isActive, true)
        ));

      if (packCards.length === 0) {
        throw new Error('No cards assigned to this virtual pack. Please use Manage Content to assign cards.');
      }

      // Group pack-specific cards by tier
      const cardsByTier = packCards.reduce((acc, packCard) => {
        const card = packCard.card;
        if (card.tier) {
          if (!acc[card.tier]) acc[card.tier] = [];
          acc[card.tier].push(card);
        }
        return acc;
      }, {} as Record<string, any[]>);

      // Deduct credits
      const creditCost = parseFloat(virtualPack.price);
      const user = await tx.select().from(users).where(eq(users.id, userId));
      if (!user[0] || parseFloat(user[0].credits || '0') < creditCost) {
        throw new Error('Insufficient credits');
      }

      await tx.update(users).set({
        credits: sql`${users.credits} - ${creditCost}`,
        totalSpent: sql`${users.totalSpent} + ${creditCost}`,
      }).where(eq(users.id, userId));

      // Generate cards using tier-based probabilities
      const pulledCards: UserCardWithCard[] = [];
      
      // First, add 7 guaranteed D-tier "Random Commons" cards
      const dTierCards = cardsByTier['D'] || [];
      if (dTierCards.length > 0) {
        for (let i = 0; i < 7; i++) {
          const randomCard = dTierCards[Math.floor(Math.random() * dTierCards.length)];
          if (randomCard) {
            // Check if user already has this card
            const existingCard = await tx.select().from(userCards)
              .where(and(eq(userCards.userId, userId), eq(userCards.cardId, randomCard.id)));
            
            let newUserCard;
            if (existingCard.length > 0) {
              // Update existing card quantity
              [newUserCard] = await tx.update(userCards)
                .set({ quantity: sql`${userCards.quantity} + 1` })
                .where(and(eq(userCards.userId, userId), eq(userCards.cardId, randomCard.id)))
                .returning();
            } else {
              // Insert new card
              [newUserCard] = await tx.insert(userCards).values({
                userId,
                cardId: randomCard.id,
                pullValue: randomCard.marketValue,
                quantity: 1,
              }).returning();
            }

            // Decrease card stock when added to vault
            await tx
              .update(virtualLibrary)
              .set({ stock: sql`${virtualLibrary.stock} - 1` })
              .where(eq(virtualLibrary.id, randomCard.id));

            pulledCards.push({
              ...newUserCard,
              card: randomCard,
            });
          }
        }
      }

      // Then, generate 1 hit card based on pull rates
      const selectedTier = this.selectTierByProbability(pullRates);
      const tierCards = cardsByTier[selectedTier];
      
      if (tierCards && tierCards.length > 0) {
        const randomCard = tierCards[Math.floor(Math.random() * tierCards.length)];
        if (randomCard) {
          // Check if user already has this card
          const existingCard = await tx.select().from(userCards)
            .where(and(eq(userCards.userId, userId), eq(userCards.cardId, randomCard.id)));
          
          let newUserCard;
          if (existingCard.length > 0) {
            // Update existing card quantity
            [newUserCard] = await tx.update(userCards)
              .set({ quantity: sql`${userCards.quantity} + 1` })
              .where(and(eq(userCards.userId, userId), eq(userCards.cardId, randomCard.id)))
              .returning();
          } else {
            // Insert new card
            [newUserCard] = await tx.insert(userCards).values({
              userId,
              cardId: randomCard.id,
              pullValue: randomCard.marketValue,
              quantity: 1,
            }).returning();
          }

          // Decrease card stock when added to vault
          await tx
            .update(virtualLibrary)
            .set({ stock: sql`${virtualLibrary.stock} - 1` })
            .where(eq(virtualLibrary.id, randomCard.id));

          pulledCards.push({
            ...newUserCard,
            card: randomCard,
          });

          // Add to global feed for rare pulls (A tier and above)
          if (['A', 'S', 'SS', 'SSS'].includes(selectedTier)) {
            await tx.insert(globalFeed).values({
              userId,
              cardId: randomCard.id,
              tier: selectedTier,
              gameType: 'virtual-pack',
            });
          }
        }
      }

      // Add transaction record
      await tx.insert(transactions).values({
        userId,
        type: 'debit',
        amount: virtualPack.price,
        description: `Opened virtual pack: ${virtualPack.name}`,
      });

      return {
        cards: pulledCards,
        packName: virtualPack.name,
      };
    });
  }

  private selectCardByWeight(weightedCards: { card: Card | null; weight: number }[]): { card: Card; weight: number } | null {
    const validCards = weightedCards.filter(item => item.card !== null) as { card: Card; weight: number }[];
    if (validCards.length === 0) return null;

    const totalWeight = validCards.reduce((sum, item) => sum + item.weight, 0);
    const random = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (const item of validCards) {
      currentWeight += item.weight;
      if (random <= currentWeight) {
        return item;
      }
    }
    
    return validCards[validCards.length - 1];
  }

  private selectVirtualCardByWeight(weightedCards: { card: VirtualLibraryCard | null; weight: number }[]): { card: VirtualLibraryCard; weight: number } | null {
    const validCards = weightedCards.filter(item => item.card !== null) as { card: VirtualLibraryCard; weight: number }[];
    if (validCards.length === 0) return null;

    const totalWeight = validCards.reduce((sum, item) => sum + item.weight, 0);
    const random = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (const item of validCards) {
      currentWeight += item.weight;
      if (random <= currentWeight) {
        return item;
      }
    }
    
    return validCards[validCards.length - 1];
  }

  private selectTierByProbability(pullRates: VirtualPackPullRate[]): string {
    const totalProbability = pullRates.reduce((sum, rate) => sum + rate.probability, 0);
    const random = Math.random() * totalProbability;
    
    let currentProbability = 0;
    for (const rate of pullRates) {
      currentProbability += rate.probability;
      if (random <= currentProbability) {
        return rate.cardTier;
      }
    }
    
    // Fallback to D tier if something goes wrong
    return 'D';
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
    return await db.transaction(async (tx) => {
      try {
        // Insert user card into vault
        await tx.insert(userCards).values({
          ...userCard,
          isRefunded: userCard.isRefunded ?? false,
          isShipped: userCard.isShipped ?? false,
        });
        
        // Decrease card stock when added to vault
        if (userCard.cardId) {
          await tx
            .update(cards)
            .set({ stock: sql`${cards.stock} - ${userCard.quantity || 1}` })
            .where(eq(cards.id, userCard.cardId));
        }
        
        // Fetch the most recent card for this user  
        const [newUserCard] = await tx
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
    });
  }

  async refundCards(cardIds: string[], userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Get cards to refund with card details
      const cardsToRefund = await tx
        .select({
          id: userCards.id,
          cardId: userCards.cardId,
          pullValue: userCards.pullValue,
          quantity: userCards.quantity,
        })
        .from(userCards)
        .where(and(inArray(userCards.id, cardIds), eq(userCards.userId, userId)));

      let totalRefund = 0;
      for (const card of cardsToRefund) {
        totalRefund += parseFloat(card.pullValue) * 0.8; // 80% refund
        
        // Restore card stock when refunded
        if (card.cardId) {
          await tx
            .update(cards)
            .set({ stock: sql`${cards.stock} + ${card.quantity}` })
            .where(eq(cards.id, card.cardId));
        }
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
        .from(cards)
        .where(and(
          eq(cards.tier, fullTierName),
          eq(cards.isActive, true),
          sql`${cards.stock} > 0`
        ));

      if (availableCards.length === 0) {
        throw new Error(`No available cards in tier ${fullTierName}`);
      }

      // Generate 8 D-tier cards + 1 hit card = 9 total cards
      const packCards = [];
      
      // Get 8 random D-tier cards (guaranteed base cards)
      const commonCards = await tx
        .select()
        .from(cards)
        .where(and(
          eq(cards.tier, 'D'),
          eq(cards.isActive, true),
          sql`${cards.stock} > 0`
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
          
          // Reduce stock for existing card quantity update
          await tx
            .update(cards)
            .set({ stock: sql`${cards.stock} - ${count}` })
            .where(eq(cards.id, card.id));
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
        
        // Reduce stock for existing hit card quantity update
        await tx
          .update(cards)
          .set({ stock: sql`${cards.stock} - 1` })
          .where(eq(cards.id, hitCard.id));
      } else {
        // Insert new hit card
        userCardInserts.push({
          userId,
          cardId: hitCard.id,
          pullValue: hitCard.marketValue,
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
          
          // Reduce stock for all newly inserted cards
          for (const userCardInsert of userCardInserts) {
            await tx
              .update(cards)
              .set({ stock: sql`${cards.stock} - ${userCardInsert.quantity}` })
              .where(eq(cards.id, userCardInsert.cardId!));
          }
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

      console.log(`Pack opened: Generated ${packCards.length} total cards (${packCards.filter(c => !c.isHit).length} commons + ${packCards.filter(c => c.isHit).length} hit)`);
      
      // Log stock changes for debugging
      console.log(`Stock reduction summary:`);
      
      if (!newUserCard) {
        throw new Error('Failed to create or retrieve user card');
      }
      
      return {
        userCard: newUserCard,
        packCards: packCards,
        hitCardPosition: 8
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
        cardName: cards.name,
        cardImageUrl: cards.imageUrl,
      })
      .from(globalFeed)
      .leftJoin(users, eq(globalFeed.userId, users.id))
      .leftJoin(cards, eq(globalFeed.cardId, cards.id))
      .where(inArray(globalFeed.tier, tierFilter))
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
}

export const storage = new DatabaseStorage();
