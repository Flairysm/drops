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
  systemSettings,
  userAddresses,
  shippingRequests,
  type User,
  type InsertUser,
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
  type SystemSetting,
  type InsertSystemSetting,
  type UserAddress,
  type InsertUserAddress,
  type ShippingRequest,
  type InsertShippingRequest,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

// ============================================================================
// TYPES
// ============================================================================

export interface PackOpenResult {
  success: boolean;
  packCards: any[];
  hitCardPosition: number;
  packType: string;
}

// ============================================================================
// STORAGE CLASS
// ============================================================================

export class DatabaseStorage {
  // ============================================================================
  // USER METHODS
  // ============================================================================

  async getUser(userId: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const user = result[0] || null;
    if (user) {
      console.log("👤 Retrieved user from database:", { userId, credits: user.credits });
    }
    return user;
  }

  async updateUserCredits(userId: string, credits: string): Promise<void> {
    console.log("💾 Updating user credits in database:", { userId, credits });
    await db.update(users).set({ credits }).where(eq(users.id, userId));
    console.log("✅ User credits updated successfully");
  }

  async setUserCredits(userId: string, credits: number): Promise<void> {
    await db.update(users).set({ credits: credits.toString() }).where(eq(users.id, userId));
  }

  async deductUserCredits(userId: string, amount: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    
    const currentCredits = parseFloat(user.credits || "0");
    const deductAmount = parseFloat(amount);
    
    if (currentCredits < deductAmount) return false;
    
    const newCredits = (currentCredits - deductAmount).toFixed(2);
    await this.updateUserCredits(userId, newCredits);
    return true;
  }

  async banUser(userId: string): Promise<void> {
    await db.update(users).set({ isActive: false }).where(eq(users.id, userId));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] || null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0] || null;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const result = await db.insert(users).values(userData).returning();
    return result[0];
  }

  // ============================================================================
  // USER PACKS METHODS
  // ============================================================================

  async getUserPacks(userId: string): Promise<UserPack[]> {
    console.log("Storage: getUserPacks called for userId:", userId);
    const result = await db
      .select()
      .from(userPacks)
      .where(and(
        eq(userPacks.userId, userId),
        eq(userPacks.isOpened, false) // Only return unopened packs
      ));
    console.log("Storage: getUserPacks result:", result.length, "packs found");
    return result;
  }

  async addUserPack(packData: InsertUserPack): Promise<UserPack> {
    const result = await db.insert(userPacks).values(packData).returning();
    return result[0];
  }

  // ============================================================================
  // USER CARDS METHODS
  // ============================================================================

  async getUserCards(userId: string, limit: number = 50, offset: number = 0): Promise<UserCard[]> {
    console.log("getUserCards called for userId:", userId, "limit:", limit, "offset:", offset);
    const result = await db
      .select()
      .from(userCards)
      .where(and(
        eq(userCards.userId, userId),
        eq(userCards.isRefunded, false) // Only return non-refunded cards
      ))
      .orderBy(desc(userCards.createdAt))
      .limit(limit)
      .offset(offset);

    console.log("Final getUserCards result:", result.length, "cards");
    return result;
  }

  // Helper function to clean up individual D-tier cards and group them
  async cleanupAndGroupD_tierCards(userId: string): Promise<void> {
    console.log("🧹 Cleaning up individual D-tier cards for user:", userId);
    
    // First, check if there's already a grouped D-tier card
    const existingGroupedCard = await db
      .select()
      .from(userCards)
      .where(and(
        eq(userCards.userId, userId),
        eq(userCards.isRefunded, false),
        eq(userCards.cardTier, 'D'),
        sql`${userCards.id} LIKE 'grouped-Common-Cards-D%'`
      ))
      .limit(1);
    
    // Get all individual D-tier cards (not grouped ones)
    const individualDTierCards = await db
      .select()
      .from(userCards)
      .where(and(
        eq(userCards.userId, userId),
        eq(userCards.isRefunded, false),
        eq(userCards.cardTier, 'D'),
        sql`${userCards.id} NOT LIKE 'grouped-Common-Cards-D%'`
      ));
    
    if (individualDTierCards.length === 0) {
      console.log("🧹 No individual D-tier cards to clean up");
      return;
    }
    
    console.log(`🧹 Found ${individualDTierCards.length} individual D-tier cards to group`);
    
    // Calculate total quantity from individual cards
    const individualQuantity = individualDTierCards.reduce((sum, card) => sum + (card.quantity || 1), 0);
    
    // Use transaction to ensure atomicity
    await db.transaction(async (tx) => {
      if (existingGroupedCard.length > 0) {
        // Update existing grouped card with additional quantity
        const currentQuantity = existingGroupedCard[0].quantity || 0;
        const newQuantity = currentQuantity + individualQuantity;
        
        await tx
          .update(userCards)
          .set({ 
            quantity: newQuantity
          })
          .where(eq(userCards.id, existingGroupedCard[0].id));
        
        console.log(`🧹 Updated existing grouped D-tier card: ${currentQuantity} + ${individualQuantity} = ${newQuantity}`);
      } else {
        // Create new grouped card
        const groupedCardId = `grouped-Common-Cards-D-${Date.now()}`;
        const groupedCard = {
          id: groupedCardId,
          userId: userId,
          cardName: 'Common Cards',
          cardTier: 'D',
          cardImageUrl: '/assets/Commons.png',
          quantity: individualQuantity,
          refundCredit: 1,
          cardSource: 'mystery', // Always set to 'mystery' for D-tier cards
          packSource: 'mystery-pokeball', // Always set to 'mystery-pokeball' for D-tier cards
          isRefunded: false,
          createdAt: new Date()
        };
        
        await tx.insert(userCards).values(groupedCard);
        console.log(`🧹 Created new grouped D-tier card with quantity ${individualQuantity}`);
      }
      
      // Mark all individual D-tier cards as refunded (soft delete)
      await tx
        .update(userCards)
        .set({ 
          isRefunded: true
        })
        .where(and(
          eq(userCards.userId, userId),
          eq(userCards.isRefunded, false),
          eq(userCards.cardTier, 'D'),
          sql`${userCards.id} NOT LIKE 'grouped-Common-Cards-D%'`
        ));
    });
    
    console.log(`🧹 Successfully grouped ${individualDTierCards.length} individual D-tier cards`);
  }

  // New function to get grouped cards (common cards grouped together)
  async getUserCardsGrouped(userId: string, limit: number = 16, offset: number = 0): Promise<UserCard[]> {
    console.log("getUserCardsGrouped called for userId:", userId, "limit:", limit, "offset:", offset);
    
    // First, clean up individual D-tier cards and group them
    await this.cleanupAndGroupD_tierCards(userId);
    
    // Get all non-refunded cards for the user
    const allCards = await db
      .select()
      .from(userCards)
      .where(and(
        eq(userCards.userId, userId),
        eq(userCards.isRefunded, false)
      ))
      .orderBy(desc(userCards.createdAt));

    // Separate D-tier cards from hit cards
    const dTierCards: UserCard[] = [];
    const hitCards: UserCard[] = [];
    
    for (const card of allCards) {
      if (card.cardTier === 'D') {
        dTierCards.push(card);
      } else {
        hitCards.push(card);
      }
    }

    // Create grouped cards - common cards first, then hit cards
    const groupedCards: UserCard[] = [];
    
    // First, add grouped D-tier cards (common cards)
    const commonCardGroups = new Map<string, UserCard[]>();
    
    for (const card of dTierCards) {
      // If it's already a grouped card, just add it directly
      if (card.id.startsWith('grouped-Common-Cards-D')) {
        groupedCards.push(card);
      } else {
        // Group individual D-tier cards together as "Common Cards"
        if (!commonCardGroups.has('Common Cards')) {
          commonCardGroups.set('Common Cards', []);
        }
        commonCardGroups.get('Common Cards')!.push(card);
      }
    }
    
    // Add grouped common cards first
    for (const [name, cards] of commonCardGroups) {
      const firstCard = cards[0];
      const totalQuantity = cards.reduce((sum, card) => sum + (card.quantity || 1), 0);
      const individualCardIds = cards.map(card => card.id);
      
      groupedCards.push({
        ...firstCard,
        cardName: 'Common Cards', // Override with generic name
        cardImageUrl: '/assets/Commons.png', // Use Commons.png image
        quantity: totalQuantity,
        id: `grouped-Common-Cards-D`, // Unique ID for grouped card
        individualCardIds: individualCardIds // Store individual card IDs for refunding
      } as UserCard & { individualCardIds: string[] });
    }
    
    // Add hit cards (keep them separate, sorted by tier, then by creation date)
    hitCards.sort((a, b) => {
      // Sort by tier priority (SSS > SS > S > A > B > C > D)
      const tierOrder = { 'SSS': 6, 'SS': 5, 'S': 4, 'A': 3, 'B': 2, 'C': 1, 'D': 0 };
      const tierDiff = (tierOrder[b.cardTier as keyof typeof tierOrder] || 0) - (tierOrder[a.cardTier as keyof typeof tierOrder] || 0);
      if (tierDiff !== 0) return tierDiff;
      
      // If same tier, sort by creation date (newest first)
      return new Date(b.createdAt || new Date()).getTime() - new Date(a.createdAt || new Date()).getTime();
    });
    
    groupedCards.push(...hitCards);
    
    // Apply pagination
    const paginatedCards = groupedCards.slice(offset, offset + limit);
    
    console.log("Final getUserCardsGrouped result:", paginatedCards.length, "unique card images");
    console.log("Total unique cards available:", groupedCards.length);
    
    return paginatedCards;
  }

  async getUserCardsCount(userId: string): Promise<number> {
    console.log("getUserCardsCount called for userId:", userId);
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(userCards)
      .where(and(
        eq(userCards.userId, userId),
        eq(userCards.isRefunded, false)
      ));
    
    const count = result[0]?.count || 0;
    console.log("Total user cards count:", count);
    return count;
  }

  // Get count of unique card images (grouped)
  async getUserCardsGroupedCount(userId: string): Promise<number> {
    console.log("getUserCardsGroupedCount called for userId:", userId);
    
    // Get all non-refunded cards for the user
    const allCards = await db
      .select()
      .from(userCards)
      .where(and(
        eq(userCards.userId, userId),
        eq(userCards.isRefunded, false)
      ));

    // Separate D-tier cards from hit cards
    const dTierCards: UserCard[] = [];
    const hitCards: UserCard[] = [];
    
    for (const card of allCards) {
      if (card.cardTier === 'D') {
        dTierCards.push(card);
      } else {
        hitCards.push(card);
      }
    }

    // Count unique card images
    let uniqueCount = 0;
    
    // Count common cards as one group (if any exist)
    if (dTierCards.length > 0) {
      uniqueCount++; // Count common cards as one group
    }
    
    // Count each hit card separately
    uniqueCount += hitCards.length;
    
    console.log("Total unique card images count:", uniqueCount);
    return uniqueCount;
  }

  async addUserCard(cardData: InsertUserCard): Promise<UserCard> {
    const result = await db.insert(userCards).values(cardData).returning();
    return result[0];
  }

  async refundCards(cardIds: string[], userId: string): Promise<void> {
    return await db.transaction(async (tx) => {
      // Get the cards being refunded
      const cardsToRefund = await tx
        .select()
        .from(userCards)
        .where(and(
          inArray(userCards.id, cardIds),
          eq(userCards.userId, userId),
          eq(userCards.isRefunded, false) // Only refund non-refunded cards
        ));

      if (cardsToRefund.length === 0) {
        throw new Error("No valid cards found to refund");
      }

      console.log(`🔄 Refunding ${cardsToRefund.length} cards for user ${userId}`);

      // Calculate total refund amount
      let totalRefund = 0;
      for (const card of cardsToRefund) {
        // For grouped D-tier cards, multiply by quantity
        if (card.id.startsWith('grouped-Common-Cards-D')) {
          totalRefund += parseInt(card.refundCredit.toString()) * (card.quantity || 1);
        } else {
          totalRefund += parseInt(card.refundCredit.toString());
        }
      }

      console.log(`💰 Total refund amount: ${totalRefund} credits`);

      // Add credits back to user
      const user = await tx
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user.length === 0) {
        throw new Error("User not found");
      }

      const currentCredits = parseFloat(user[0].credits || "0");
      const newCredits = currentCredits + totalRefund;

      await tx
        .update(users)
        .set({ credits: newCredits.toFixed(2) })
        .where(eq(users.id, userId));

      console.log(`✅ Updated user credits: ${currentCredits} + ${totalRefund} = ${newCredits}`);

      // Return cards to prize pool based on card source
      for (const card of cardsToRefund) {
        console.log(`🔄 Processing refund for card: ${card.cardName}, source: ${card.cardSource}, packSource: ${card.packSource}`);
        
        // Skip returning D-tier cards to prize pool since they're fixed assets
        if (card.cardTier === 'D' || card.id.startsWith('grouped-Common-Cards-D')) {
          console.log(`ℹ️ Skipping prize pool return for D-tier card (fixed asset): ${card.cardName}`);
          continue;
        }
        
        if (card.cardSource === 'classic') {
          // Return to classic prize pool
          console.log(`📦 Returning classic card "${card.cardName}" to pack "${card.packSource}"`);
          const updateResult = await tx
            .update(classicPrize)
            .set({ quantity: sql`${classicPrize.quantity} + 1` })
            .where(and(
              eq(classicPrize.packId, card.packSource || ''),
              eq(classicPrize.cardName, card.cardName)
            ))
            .returning();
          console.log(`✅ Classic prize pool update result:`, updateResult.length, 'rows affected');
        } else if (card.cardSource === 'special') {
          // Return to special prize pool
          console.log(`📦 Returning special card "${card.cardName}" to pack "${card.packSource}"`);
          const updateResult = await tx
            .update(specialPrize)
            .set({ quantity: sql`${specialPrize.quantity} + 1` })
            .where(and(
              eq(specialPrize.packId, card.packSource || ''),
              eq(specialPrize.cardName, card.cardName)
            ))
            .returning();
          console.log(`✅ Special prize pool update result:`, updateResult.length, 'rows affected');
        } else if (card.cardSource === 'mystery') {
          // Return to mystery prize pool - always return to the base mystery-pokeball pool
          // since all mystery packs use the same shared pool
          console.log(`📦 Returning mystery card "${card.cardName}" to base mystery pool (mystery-pokeball)`);
          
          const updateResult = await tx
            .update(mysteryPrize)
            .set({ quantity: sql`${mysteryPrize.quantity} + 1` })
            .where(and(
              eq(mysteryPrize.packId, 'mystery-pokeball'),
              eq(mysteryPrize.cardName, card.cardName)
            ))
            .returning();
          console.log(`✅ Mystery prize pool update result:`, updateResult.length, 'rows affected');
        } else if (card.cardSource === 'raffle_prize') {
          // Raffle prize cards don't need to be returned to any prize pool
          // They are one-time rewards, just give credits back
          console.log(`🎁 Raffle prize card "${card.cardName}" refunded - no quantity returned to prize pool`);
        } else {
          console.log(`⚠️ Unknown card source "${card.cardSource}" for card "${card.cardName}"`);
        }
      }

      console.log(`🔄 Returned ${cardsToRefund.length} cards to prize pools`);

      // Mark cards as refunded
      await tx
        .update(userCards)
        .set({ isRefunded: true })
        .where(and(
          inArray(userCards.id, cardIds),
          eq(userCards.userId, userId)
        ));

      console.log(`✅ Marked ${cardsToRefund.length} cards as refunded`);

      // Add transaction record
      await tx.insert(transactions).values({
        id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'refund',
        amount: totalRefund.toFixed(2),
        description: `Refunded ${cardsToRefund.length} cards`,
      });

      console.log(`📝 Added transaction record for refund`);
    });
  }

  async refundCardsAsync(cardIds: string[], userId: string): Promise<void> {
    return this.refundCards(cardIds, userId);
  }

  // ============================================================================
  // TRANSACTIONS METHODS
  // ============================================================================

  async addTransaction(transactionData: InsertTransaction): Promise<Transaction> {
    const result = await db.insert(transactions).values(transactionData).returning();
    return result[0];
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  // ============================================================================
  // GLOBAL FEED METHODS
  // ============================================================================

  async addGlobalFeedEntry(feedData: any): Promise<void> {
    console.log("📰 Adding to global feed:", feedData);
    try {
      // Use raw SQL since the Drizzle schema doesn't match the actual database table
      const feedId = `gf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const userId = feedData.userId;
      const cardId = feedData.packId || null;
      const gameType = feedData.packType || 'unknown';
      const cardName = feedData.cardName || feedData.card?.name || 'Unknown Card';
      const cardImageUrl = feedData.imageUrl || feedData.card?.imageUrl || '/card-images/Commons.png';
      const tier = feedData.cardTier || feedData.card?.tier || 'D';
      const createdAt = new Date();
      
      console.log("📰 SQL parameters:", { feedId, userId, cardId, gameType, cardName, cardImageUrl, tier, createdAt });
      
      await db.execute(sql`
        INSERT INTO global_feed (id, user_id, card_id, game_type, card_name, card_image_url, tier, created_at)
        VALUES (${feedId}, ${userId}, ${cardId}, ${gameType}, ${cardName}, ${cardImageUrl}, ${tier}, ${createdAt})
      `);
      console.log("✅ Successfully added to global feed");
    } catch (error) {
      console.error("❌ Failed to add to global feed:", error);
      // Don't throw error - just log it so pack opening doesn't fail
      console.log("⚠️ Continuing without global feed entry");
    }
  }

  async getGlobalFeed(limit: number, minTier: string): Promise<any[]> {
    try {
      console.log("📰 Fetching global feed with limit:", limit, "minTier:", minTier);
      
      // Define tier hierarchy for filtering
      const tierHierarchy = ['D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
      const minTierIndex = tierHierarchy.indexOf(minTier);
      
      if (minTierIndex === -1) {
        console.log("📰 Invalid minTier, defaulting to A tier");
        minTier = 'A';
      }
      
      // Get all tiers from minTier and above
      const allowedTiers = tierHierarchy.slice(minTierIndex);
      console.log("📰 Allowed tiers:", allowedTiers);
      
      // Use raw SQL query with proper tier filtering and limit, joining with users table
      const result = await db.execute(sql`
        SELECT gf.*, u.username 
        FROM global_feed gf
        LEFT JOIN users u ON gf.user_id = u.id
        WHERE gf.tier IN (${sql.join(allowedTiers.map(tier => sql`${tier}`), sql`, `)})
        ORDER BY gf.created_at DESC 
        LIMIT ${limit}
      `);
      
      console.log("📰 Global feed result:", result.rows.length, "entries");
      if (result.rows.length > 0) {
        console.log("📰 Sample row:", result.rows[0]);
      }
      
      // Transform the result to match the expected format
      const transformedResult = result.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        packId: row.card_id, // Map card_id to packId for compatibility
        packType: row.game_type, // Map game_type to packType
        cardName: row.card_name,
        cardTier: row.tier,
        imageUrl: row.card_image_url,
        pulledAt: row.created_at,
        username: row.username // Include username from the join
      }));
      
      return transformedResult;
    } catch (error) {
      console.error("❌ Error in getGlobalFeed:", error);
      throw error;
    }
  }

  // ============================================================================
  // CLASSIC PACK METHODS
  // ============================================================================

  async getClassicPacks(): Promise<any[]> {
    const packs = await db.select().from(classicPack).where(eq(classicPack.isActive, true));
    
    const packsWithCards = await Promise.all(
      packs.map(async (pack) => {
        const cards = await db
        .select()
          .from(classicPrize)
          .where(eq(classicPrize.packId, pack.id));
        return { ...pack, cards };
      })
    );
    
    console.log("Successfully fetched classic packs:", packsWithCards);
    return packsWithCards;
  }

  async getClassicPackById(id: string): Promise<any> {
    const pack = await db.select().from(classicPack).where(eq(classicPack.id, id)).limit(1);
    if (!pack[0]) return null;
    
    const cards = await db
      .select()
      .from(classicPrize)
      .where(eq(classicPrize.packId, id));
    
    // Count how many times this pack has been opened
    const openedCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(userPacks)
      .where(and(
        eq(userPacks.packId, id),
        eq(userPacks.isOpened, true)
      ));
    
    // For classic packs, calculate total from prize pool cards
    const totalCards = cards.reduce((sum, card) => sum + (card.quantity || 0), 0);
    const openedPacks = openedCount[0]?.count || 0;
    const availableCards = Math.max(0, totalCards - openedPacks);
    
    return { 
      ...pack[0], 
      cards,
      totalCards,
      openedPacks,
      availableCards
    };
  }

  async createClassicPack(packData: InsertClassicPack): Promise<ClassicPack> {
    const result = await db.insert(classicPack).values(packData).returning();
    return result[0];
  }

  async updateClassicPack(id: string, packData: Partial<InsertClassicPack>): Promise<ClassicPack> {
    const result = await db.update(classicPack).set(packData).where(eq(classicPack.id, id)).returning();
    return result[0];
  }

  async deleteClassicPack(id: string): Promise<void> {
    await db.delete(classicPack).where(eq(classicPack.id, id));
  }

  async addCardToClassicPack(packId: string, cardId: string, quantity: number): Promise<any> {
    const result = await db
      .insert(classicPrize)
      .values({
        id: `cpc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        packId,
        cardName: cardId,
        cardImageUrl: "",
        cardTier: "D",
        refundCredit: 1,
        quantity,
      })
      .returning();
    return result[0];
  }

  async addCardToClassicPackSimplified(packId: string, cardData: any): Promise<any> {
    const result = await db
      .insert(classicPrize)
      .values({
        id: `cpc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        packId,
        cardName: cardData.name,
        cardImageUrl: cardData.imageUrl,
        cardTier: cardData.tier,
        refundCredit: cardData.refundCredit || 1,
        quantity: cardData.quantity || 1,
      })
      .returning();
    return result[0];
  }

  async removeCardFromClassicPack(packId: string, cardId: string): Promise<void> {
    await db
      .delete(classicPrize)
      .where(and(eq(classicPrize.packId, packId), eq(classicPrize.id, cardId)));
  }

  async updateClassicPackCardQuantity(packId: string, cardId: string, quantity: number): Promise<any> {
    const result = await db
      .update(classicPrize)
      .set({ quantity })
      .where(and(eq(classicPrize.packId, packId), eq(classicPrize.id, cardId)))
      .returning();
    return result[0];
  }

  // ============================================================================
  // SPECIAL PACK METHODS
  // ============================================================================

  async getSpecialPacks(): Promise<any[]> {
    const packs = await db.select().from(specialPack).where(eq(specialPack.isActive, true));
    
    const packsWithCards = await Promise.all(
      packs.map(async (pack) => {
        const cards = await db
          .select()
          .from(specialPrize)
          .where(eq(specialPrize.packId, pack.id));
        return { ...pack, cards };
      })
    );
    
    return packsWithCards;
  }

  async getSpecialPackById(id: string): Promise<any> {
    const pack = await db.select().from(specialPack).where(eq(specialPack.id, id)).limit(1);
    if (!pack[0]) return null;
    
    const cards = await db
      .select()
      .from(specialPrize)
      .where(eq(specialPrize.packId, id));
    
    // Count how many times this pack has been opened
    const openedCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(userPacks)
      .where(and(
        eq(userPacks.packId, id),
        eq(userPacks.isOpened, true)
      ));
    
    const totalCards = pack[0].totalCards || 8;
    const openedPacks = openedCount[0]?.count || 0;
    const availableCards = Math.max(0, totalCards - openedPacks);
    
    return { 
      ...pack[0], 
      cards,
      totalCards,
      openedPacks,
      availableCards
    };
  }

  async createSpecialPack(packData: InsertSpecialPack): Promise<SpecialPack> {
    const result = await db.insert(specialPack).values(packData).returning();
    return result[0];
  }

  async updateSpecialPack(id: string, packData: Partial<InsertSpecialPack>): Promise<SpecialPack> {
    const result = await db.update(specialPack).set(packData).where(eq(specialPack.id, id)).returning();
    return result[0];
  }

  async deleteSpecialPack(id: string): Promise<void> {
    await db.delete(specialPack).where(eq(specialPack.id, id));
  }

  async addCardToSpecialPack(packId: string, cardId: string, quantity: number): Promise<any> {
    const result = await db
      .insert(specialPrize)
      .values({
        id: `spc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        packId,
        cardName: cardId,
        cardImageUrl: "",
        cardTier: "D",
        refundCredit: 1,
        quantity,
      })
      .returning();
    return result[0];
  }

  async addCardToSpecialPackSimplified(packId: string, cardData: any): Promise<any> {
    const result = await db
      .insert(specialPrize)
      .values({
        id: `spc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        packId,
        cardName: cardData.name,
        cardImageUrl: cardData.imageUrl,
        cardTier: cardData.tier,
        refundCredit: cardData.refundCredit || 1,
        quantity: cardData.quantity || 1,
      })
      .returning();
    return result[0];
  }

  async removeCardFromSpecialPack(packId: string, cardId: string): Promise<void> {
    await db
      .delete(specialPrize)
      .where(and(eq(specialPrize.packId, packId), eq(specialPrize.id, cardId)));
  }

  async updateSpecialPackCardQuantity(packId: string, cardId: string, quantity: number): Promise<any> {
    const result = await db
      .update(specialPrize)
      .set({ quantity })
      .where(and(eq(specialPrize.packId, packId), eq(specialPrize.id, cardId)))
      .returning();
    return result[0];
  }

  // ============================================================================
  // MYSTERY PACK METHODS
  // ============================================================================

  async getMysteryPacks(): Promise<any[]> {
    const packs = await db.select().from(mysteryPack).where(eq(mysteryPack.isActive, true));
    
    const packsWithCards = await Promise.all(
      packs.map(async (pack) => {
        const cards = await db
          .select()
          .from(mysteryPrize)
          .where(eq(mysteryPrize.packId, pack.id));
        return { ...pack, cards };
      })
    );
    
    return packsWithCards;
  }

  async getMysteryPackById(id: string): Promise<any> {
    const pack = await db.select().from(mysteryPack).where(eq(mysteryPack.id, id)).limit(1);
    if (!pack[0]) return null;
    
    const cards = await db
      .select()
      .from(mysteryPrize)
      .where(eq(mysteryPrize.packId, id));
    
    return { ...pack[0], cards };
  }

  async createMysteryPack(packData: InsertMysteryPack): Promise<MysteryPack> {
    const result = await db.insert(mysteryPack).values(packData).returning();
    return result[0];
  }

  async updateMysteryPack(id: string, packData: Partial<InsertMysteryPack>): Promise<MysteryPack> {
    const result = await db.update(mysteryPack).set(packData).where(eq(mysteryPack.id, id)).returning();
    return result[0];
  }

  async deleteMysteryPack(id: string): Promise<void> {
    await db.delete(mysteryPack).where(eq(mysteryPack.id, id));
  }

  async addCardToMysteryPack(packId: string, cardId: string, quantity: number): Promise<any> {
    const result = await db
      .insert(mysteryPrize)
      .values({
        id: `mpc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        packId,
        cardName: cardId,
        cardImageUrl: "",
        cardTier: "D",
        refundCredit: 1,
          quantity,
      })
      .returning();
    return result[0];
  }

  async addCardToMysteryPackSimplified(packId: string, cardData: any): Promise<any> {
    const result = await db
      .insert(mysteryPrize)
      .values({
        id: `mpc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        packId,
        cardName: cardData.name,
        cardImageUrl: cardData.imageUrl,
        cardTier: cardData.tier,
        refundCredit: cardData.refundCredit || 1,
        quantity: cardData.quantity || 1,
      })
      .returning();
    return result[0];
  }

  async removeCardFromMysteryPack(packId: string, cardId: string): Promise<void> {
    await db
      .delete(mysteryPrize)
      .where(and(eq(mysteryPrize.packId, packId), eq(mysteryPrize.id, cardId)));
  }

  async updateMysteryPackCardQuantity(packId: string, cardId: string, quantity: number): Promise<any> {
    const result = await db
      .update(mysteryPrize)
      .set({ quantity })
      .where(and(eq(mysteryPrize.packId, packId), eq(mysteryPrize.id, cardId)))
      .returning();
    return result[0];
  }

  // ============================================================================
  // PACK OPENING METHODS
  // ============================================================================

  async openUserPack(packId: string, userId: string): Promise<PackOpenResult> {
    console.log("🔍 Opening user pack:", packId);
    
    // First, get the user pack to determine its type
    const userPackData = await db
      .select()
      .from(userPacks)
      .where(eq(userPacks.id, packId))
      .limit(1);
    
    if (userPackData.length === 0) {
      throw new Error("User pack not found");
    }
    
    const userPack = userPackData[0];
    console.log("🔍 User pack data:", JSON.stringify(userPack, null, 2));
    
    // Mark the pack as opened
    await db.update(userPacks)
      .set({ isOpened: true, openedAt: new Date() })
      .where(eq(userPacks.id, packId));
    
    // Route to appropriate opening logic based on packType
    if (userPack.packType === 'mystery') {
      console.log("✅ This is a mystery pack, using mystery pack opening logic");
      // Get the mystery pack template
      const mysteryPackData = await db
        .select()
        .from(mysteryPack)
        .where(eq(mysteryPack.id, userPack.packId))
        .limit(1);
      
      if (mysteryPackData.length === 0) {
        throw new Error("Mystery pack template not found");
      }
      
      return await this.openMysteryPack(mysteryPackData[0], userId);
    } else if (userPack.packType === 'classic') {
      console.log("✅ This is a classic pack, using classic pack opening logic");
      // Get the classic pack template
      const classicPackData = await db
        .select()
        .from(classicPack)
        .where(eq(classicPack.id, userPack.packId))
        .limit(1);
      
      if (classicPackData.length === 0) {
        throw new Error("Classic pack template not found");
      }
      
      return await this.openClassicPack(classicPackData[0], userId);
    } else if (userPack.packType === 'special') {
      console.log("✅ This is a special pack, using special pack opening logic");
      // Get the special pack template
      const specialPackData = await db
        .select()
        .from(specialPack)
        .where(eq(specialPack.id, userPack.packId))
        .limit(1);
      
      if (specialPackData.length === 0) {
        throw new Error("Special pack template not found");
      }
      
      return await this.openSpecialPack(specialPackData[0], userId);
    } else if (userPack.packType === 'raffle_physical') {
      console.log("✅ This is a raffle physical prize, creating special reward");
      // For raffle physical prizes, create a special reward card
      return await this.createRafflePhysicalReward(userPack, userId);
    }
    
    throw new Error(`Unknown pack type: ${userPack.packType}`);
  }

  private async createRafflePhysicalReward(userPack: any, userId: string): Promise<PackOpenResult> {
    console.log("🎁 Creating raffle physical reward for:", userPack.tier);
    
    // Create a special reward card for the physical prize
    const rewardCard = {
      name: userPack.tier,
      tier: 'SSS', // Physical prizes are the highest tier
      imageUrl: '/assets/classic-image.png', // Use a special image for physical prizes
      refundCredit: 1000, // High refund value for physical prizes
      isHit: true
    };
    
    // Add the reward card to user's vault
    await this.addUserCard({
      id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      cardName: rewardCard.name,
      cardImageUrl: rewardCard.imageUrl,
      cardTier: rewardCard.tier,
      refundCredit: rewardCard.refundCredit,
    });
    
    console.log("✅ Added raffle physical reward to user vault:", rewardCard.name);
    
    return {
      success: true,
      packCards: [rewardCard],
      hitCardPosition: 0,
      packType: 'raffle_physical'
    };
  }

  private async openMysteryPack(mysteryPack: MysteryPack, userId: string): Promise<PackOpenResult> {
    console.log("🎲 Opening mystery pack:", mysteryPack.packType);
    
    return await db.transaction(async (tx) => {
      // Get all cards from the shared pokeball pool (base pool)
      const packCards = await tx
        .select()
        .from(mysteryPrize)
        .where(eq(mysteryPrize.packId, 'mystery-pokeball'));
      
      console.log("🎲 Found pack cards in shared pool:", packCards.length, "(D-tier cards excluded - fixed assets)");
      
      if (packCards.length === 0) {
        throw new Error("No cards found in mystery pack pool");
      }
      
      // Get card details for each pack card (exclude D-tier as they're fixed assets)
      const packCardsWithDetails = packCards
        .filter(pc => pc.cardTier?.trim() !== 'D') // Exclude D-tier cards (fixed assets)
        .map(pc => ({
          name: pc.cardName,
          tier: pc.cardTier,
          quantity: pc.quantity,
          imageUrl: pc.cardImageUrl,
          refundCredit: pc.refundCredit
        }));
      
      // Use fixed D-tier card (unlimited asset - no inventory management needed)
      const fixedCommonCard = {
        name: 'Common Cards',
        tier: 'D',
        quantity: 999999, // Unlimited quantity
        imageUrl: '/assets/Commons.png',
        refundCredit: 1
      };
      console.log("🎲 Using fixed D-tier card (unlimited asset):", fixedCommonCard.name);
      
      // Use odds from database if available, otherwise fallback to default
      let hitCardOdds: Record<string, number> = {
        D: 0.0,
        C: 0.0,
        B: 0.0,
        A: 0.0,
        S: 0.0,
        SS: 0.0,
        SSS: 0.0
      };
      
      // Handle custom odds for specific pack types first (these override database odds)
      if (mysteryPack.packType === 'pokeball' || mysteryPack.packType === 'greatball' || 
          mysteryPack.packType === 'ultraball' || mysteryPack.packType === 'masterball') {
        // Use custom odds for these pack types
        if (mysteryPack.packType === 'pokeball') {
          console.log(`🎲 Using custom pokeball odds (1-1000 system) - Base Odds`);
          hitCardOdds = {
            D: 0.0,    // 0% D (not used for hit card)
            C: 0.848,  // 84.8% C (1-848)
            B: 0.06,   // 6% B (849-908)
            A: 0.045,  // 4.5% A (909-953)
            S: 0.035,  // 3.5% S (954-988)
            SS: 0.01,  // 1% SS (989-998)
            SSS: 0.002 // 0.2% SSS (999-1000)
          };
          console.log(`🎲 Pokeball custom odds:`, hitCardOdds);
        } else if (mysteryPack.packType === 'greatball') {
          console.log(`🎲 Using custom greatball odds (1-1000 system) - Improved Odds`);
          hitCardOdds = {
            D: 0.0,    // 0% D (not used for hit card)
            C: 0.40,   // 40% C (1-400)
            B: 0.30,   // 30% B (401-700)
            A: 0.15,   // 15% A (701-850)
            S: 0.10,   // 10% S (851-950)
            SS: 0.04,  // 4% SS (951-990)
            SSS: 0.01  // 1% SSS (991-1000)
          };
          console.log(`🎲 Greatball custom odds:`, hitCardOdds);
        } else if (mysteryPack.packType === 'ultraball') {
          console.log(`🎲 FORCING custom ultraball odds (1-1000 system) - B+ Guaranteed, Enhanced High Tiers`);
          console.log(`🎲 Database odds before override:`, mysteryPack.odds);
          hitCardOdds = {
            D: 0.0,    // 0% D (not used for hit card)
            C: 0.0,    // 0% C (B+ guaranteed)
            B: 0.45,   // 45% B (551-1000)
            A: 0.25,   // 25% A (301-550)
            S: 0.20,   // 20% S (101-300)
            SS: 0.08,  // 8% SS (21-100)
            SSS: 0.02  // 2% SSS (1-20)
          };
          console.log(`🎲 Ultraball FORCED custom odds:`, hitCardOdds);
        } else if (mysteryPack.packType === 'masterball') {
          console.log(`🎲 Using custom masterball odds (1-1000 system) - A+ Guaranteed`);
          hitCardOdds = {
            D: 0.0,    // 0% D (not used for hit card)
            C: 0.0,    // 0% C (A+ guaranteed)
            B: 0.0,    // 0% B (A+ guaranteed)
            A: 0.50,   // 50% A (1-500)
            S: 0.30,   // 30% S (501-800)
            SS: 0.15,  // 15% SS (801-950)
            SSS: 0.05  // 5% SSS (951-1000)
          };
          console.log(`🎲 Masterball custom odds:`, hitCardOdds);
        }
      } else if (mysteryPack.odds && typeof mysteryPack.odds === 'object') {
        // Use database odds for other pack types
        const odds = mysteryPack.odds as Record<string, number>;
        hitCardOdds = {
          D: odds.D || 0.0,
          C: odds.C || 0.0,
          B: odds.B || 0.0,
          A: odds.A || 0.0,
          S: odds.S || 0.0,
          SS: odds.SS || 0.0,
          SSS: odds.SSS || 0.0
        };
        
        // For other mystery packs, use database odds or fallback
        const totalOdds = Object.values(hitCardOdds).reduce((sum, odd) => sum + odd, 0);
        console.log(`🎲 Original odds for ${mysteryPack.packType}:`, hitCardOdds);
        console.log(`🎲 Total odds: ${totalOdds}`);
        
        // Detect the current range based on total odds and scale to 1-1000
        let currentRange = 1000; // Default assumption
        if (totalOdds <= 0.3) currentRange = 300; // 1-300 system
        else if (totalOdds <= 0.6) currentRange = 600; // 1-600 system
        else if (totalOdds <= 0.8) currentRange = 800; // 1-800 system
        else if (totalOdds < 1.0) currentRange = 1000; // Already close to 1-1000
        
        if (currentRange !== 1000) {
          console.log(`🎲 Detected ${mysteryPack.packType} with 1-${currentRange} odds system, scaling to 1-1000`);
          console.log(`🎲 Scaling factor: ${1000/currentRange}`);
          
          // Scale odds to 1-1000 system
          const scaleFactor = 1000 / currentRange;
          hitCardOdds = {
            D: hitCardOdds.D * scaleFactor,
            C: hitCardOdds.C * scaleFactor,
            B: hitCardOdds.B * scaleFactor,
            A: hitCardOdds.A * scaleFactor,
            S: hitCardOdds.S * scaleFactor,
            SS: hitCardOdds.SS * scaleFactor,
            SSS: hitCardOdds.SSS * scaleFactor
          };
          
          console.log(`🎲 Scaled odds for 1-1000 system:`, hitCardOdds);
        } else {
          console.log(`🎲 ${mysteryPack.packType} already using 1-1000 system`);
        }
        
        console.log(`🎲 Using database odds for ${mysteryPack.packType}:`, hitCardOdds);
      } else {
        // Fallback to default odds if database odds not available
        console.log(`⚠️ No database odds found for ${mysteryPack.packType}, using fallback odds`);
        hitCardOdds = {
          D: 0.0,    // 0% D (not used for hit card)
          C: 0.25,   // 25% C
          B: 0.20,   // 20% B
          A: 0.15,   // 15% A
          S: 0.05,   // 5% S
          SS: 0.02,  // 2% SS
          SSS: 0.01  // 1% SSS
        };
      }
      
      console.log(`🎲 Using ${mysteryPack.packType} odds:`, hitCardOdds);
      
      // NEW SYSTEM: 1-1000 number generator for precise odds
      // Generate random number from 1-1000 (inclusive)
      const { randomBytes } = await import('crypto');
      const hitRandomBytes = randomBytes(4);
      const randomInt = (hitRandomBytes.readUInt32BE(0) % 1000) + 1; // 1-1000
      let selectedHitCard = null;
      
      console.log("🎲 Random number (1-1000):", randomInt);
      console.log("🎲 Timestamp:", Date.now());
      console.log("🎲 User ID:", userId);
      console.log("🎲 Random bytes:", hitRandomBytes.toString('hex'));
      
      console.log("🎲 Current hitCardOdds being used:", hitCardOdds);
      console.log("🎲 Pack type:", mysteryPack.packType);
      
      // Initialize tier ranges based on pack type
      let tierRanges: Record<string, { start: number; end: number }>;
      
      if (mysteryPack.packType === 'ultraball') {
        // Ultraball specific ranges: Your exact ranges
        console.log("🎲 Using ultraball custom ranges");
        tierRanges = {
          C: { start: 0, end: 0 },      // C tier not possible
          SSS: { start: 1, end: 20 },   // 1-20 SSS
          SS: { start: 21, end: 100 },  // 21-100 SS
          S: { start: 101, end: 300 },  // 101-300 S
          A: { start: 301, end: 550 },  // 301-550 A
          B: { start: 551, end: 1000 }  // 551-1000 B
        };
      } else if (hitCardOdds.C === 0) {
        // Handle edge case where C tier is 0% (like masterball B+ guaranteed)
        console.log("🎲 Detected C tier is 0%, recalculating ranges for B+ guaranteed");
        tierRanges = {
          C: { start: 0, end: 0 }, // C tier not possible
          B: { start: 1, end: Math.floor(hitCardOdds.B * 1000) },
          A: { start: Math.floor(hitCardOdds.B * 1000) + 1, end: Math.floor((hitCardOdds.B + hitCardOdds.A) * 1000) },
          S: { start: Math.floor((hitCardOdds.B + hitCardOdds.A) * 1000) + 1, end: Math.floor((hitCardOdds.B + hitCardOdds.A + hitCardOdds.S) * 1000) },
          SS: { start: Math.floor((hitCardOdds.B + hitCardOdds.A + hitCardOdds.S) * 1000) + 1, end: Math.floor((hitCardOdds.B + hitCardOdds.A + hitCardOdds.S + hitCardOdds.SS) * 1000) },
          SSS: { start: Math.floor((hitCardOdds.B + hitCardOdds.A + hitCardOdds.S + hitCardOdds.SS) * 1000) + 1, end: Math.floor((hitCardOdds.B + hitCardOdds.A + hitCardOdds.S + hitCardOdds.SS + hitCardOdds.SSS) * 1000) }
        };
      } else {
        // Default cumulative ranges for other packs
        tierRanges = {
          C: { start: 1, end: Math.floor(hitCardOdds.C * 1000) },
          B: { start: Math.floor(hitCardOdds.C * 1000) + 1, end: Math.floor((hitCardOdds.C + hitCardOdds.B) * 1000) },
          A: { start: Math.floor((hitCardOdds.C + hitCardOdds.B) * 1000) + 1, end: Math.floor((hitCardOdds.C + hitCardOdds.B + hitCardOdds.A) * 1000) },
          S: { start: Math.floor((hitCardOdds.C + hitCardOdds.B + hitCardOdds.A) * 1000) + 1, end: Math.floor((hitCardOdds.C + hitCardOdds.B + hitCardOdds.A + hitCardOdds.S) * 1000) },
          SS: { start: Math.floor((hitCardOdds.C + hitCardOdds.B + hitCardOdds.A + hitCardOdds.S) * 1000) + 1, end: Math.floor((hitCardOdds.C + hitCardOdds.B + hitCardOdds.A + hitCardOdds.S + hitCardOdds.SS) * 1000) },
          SSS: { start: Math.floor((hitCardOdds.C + hitCardOdds.B + hitCardOdds.A + hitCardOdds.S + hitCardOdds.SS) * 1000) + 1, end: Math.floor((hitCardOdds.C + hitCardOdds.B + hitCardOdds.A + hitCardOdds.S + hitCardOdds.SS + hitCardOdds.SSS) * 1000) }
        };
      }
      
      console.log("🎲 Tier ranges:", tierRanges);
      
      // Find which tier the random number falls into
      const hitTiers = mysteryPack.packType === 'ultraball' ? ['C', 'SSS', 'SS', 'S', 'A', 'B'] : ['C', 'B', 'A', 'S', 'SS', 'SSS'];
      let selectedTier = null;
      
      for (const tier of hitTiers) {
        const range = tierRanges[tier];
        console.log(`🎲 Checking tier ${tier}: range=${range.start}-${range.end}, random=${randomInt}, inRange=${randomInt >= range.start && randomInt <= range.end}`);
        
        if (randomInt >= range.start && randomInt <= range.end) {
          selectedTier = tier;
          break;
        }
      }
      
      if (selectedTier) {
        const hitCards = packCardsWithDetails.filter(card => card.tier?.trim() === selectedTier);
        if (hitCards.length > 0) {
          // Use crypto for card selection within tier
          const cardRandomBytes = randomBytes(4);
          const cardRandom = cardRandomBytes.readUInt32BE(0) / 0xffffffff;
          selectedHitCard = hitCards[Math.floor(cardRandom * hitCards.length)];
          console.log(`🎲 Hit card selected from tier ${selectedTier}:`, selectedHitCard);
          console.log(`🎲 Card selection random:`, cardRandom);
        }
      }
      
      // If no hit card selected (shouldn't happen with proper odds), fallback to C tier
      if (!selectedHitCard) {
        const fallbackCards = packCardsWithDetails.filter(card => card.tier?.trim() === 'C');
        if (fallbackCards.length > 0) {
          // Use crypto for fallback card selection
          const fallbackRandomBytes = randomBytes(4);
          const fallbackRandom = fallbackRandomBytes.readUInt32BE(0) / 0xffffffff;
          selectedHitCard = fallbackCards[Math.floor(fallbackRandom * fallbackCards.length)];
          console.log("🎲 Fallback hit card selected (C tier):", selectedHitCard);
          console.log("🎲 Fallback random:", fallbackRandom);
        } else {
          // Ultimate fallback - use common card
          selectedHitCard = fixedCommonCard;
          console.log("🎲 Ultimate fallback - using common card as hit:", selectedHitCard);
        }
      }
      
      // Create the pack result - 7 common cards + 1 hit card
      const selectedCards = [];
      
      // Add 7 common cards (D tier)
      for (let i = 0; i < 7; i++) {
        selectedCards.push({
          id: `card-${Date.now()}-${i}`,
          name: fixedCommonCard.name,
          tier: fixedCommonCard.tier,
          imageUrl: fixedCommonCard.imageUrl,
          marketValue: fixedCommonCard.refundCredit.toString(),
          isHit: false,
          position: i
        });
      }
      
      // Add 1 hit card at position 7
      selectedCards.push({
        id: `card-${Date.now()}-7`,
        name: selectedHitCard.name,
        tier: selectedHitCard.tier,
        imageUrl: selectedHitCard.imageUrl,
        marketValue: selectedHitCard.refundCredit.toString(),
        isHit: true,
        position: 7
      });
      
      // Deduct cards from the shared pokeball pool
      // Note: Common cards (D tier) are unlimited and don't need inventory deduction

      // Deduct 1 hit card
      await tx
        .update(mysteryPrize)
        .set({ quantity: sql`${mysteryPrize.quantity} - 1` })
        .where(and(
          eq(mysteryPrize.packId, 'mystery-pokeball'),
          eq(mysteryPrize.cardName, selectedHitCard.name)
        ));

      // Add cards to user's collection
    for (const card of selectedCards) {
        await tx.insert(userCards).values({
          id: `uc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId,
          cardName: card.name,
          cardImageUrl: card.imageUrl,
          cardTier: card.tier,
          refundCredit: parseInt(card.marketValue),
          quantity: 1,
          isRefunded: false,
          isShipped: false,
          packSource: mysteryPack.id,
          cardSource: 'mystery'
        });
      }

    return {
        success: true,
      packCards: selectedCards,
        hitCardPosition: 7,
        packType: 'mystery'
    };
    });
  }

  private async openClassicPack(classicPack: ClassicPack, userId: string): Promise<PackOpenResult> {
    console.log("🎲 Opening classic pack:", classicPack.id);
    
    return await db.transaction(async (tx) => {
      // Get all cards from the classic pack's prize pool
      const packCards = await tx
        .select()
        .from(classicPrize)
        .where(eq(classicPrize.packId, classicPack.id));
      
      console.log("🎲 Found pack cards in classic pool:", packCards.length, "(D-tier cards excluded - fixed assets)");
      
      if (packCards.length === 0) {
        throw new Error("No cards found in classic pack pool");
      }
      
      // Get card details for each pack card (exclude D-tier as they're fixed assets)
      const packCardsWithDetails = packCards
        .filter(pc => pc.cardTier?.trim() !== 'D') // Exclude D-tier cards (fixed assets)
        .map(pc => ({
          name: pc.cardName,
          tier: pc.cardTier,
          quantity: pc.quantity,
          imageUrl: pc.cardImageUrl,
          refundCredit: pc.refundCredit
        }));
      
      // Use fixed D-tier card (unlimited asset - no inventory management needed)
      const fixedCommonCard = {
        name: 'Common Cards',
        tier: 'D',
        quantity: 999999, // Unlimited quantity
        imageUrl: '/assets/Commons.png',
        refundCredit: 1
      };
      console.log("🎲 Using fixed D-tier card (unlimited asset):", fixedCommonCard.name);
      
      // Use pokeball custom odds (same as mystery pack pokeball)
      console.log(`🎲 Using custom pokeball odds for classic pack (1-1000 system) - Base Odds`);
      const hitCardOdds = {
        D: 0.0,    // 0% D (not used for hit card)
        C: 0.848,  // 84.8% C (1-848)
        B: 0.06,   // 6% B (849-908)
        A: 0.045,  // 4.5% A (909-953)
        S: 0.035,  // 3.5% S (954-988)
        SS: 0.01,  // 1% SS (989-998)
        SSS: 0.002 // 0.2% SSS (999-1000)
      };
      console.log(`🎲 Classic pack pokeball custom odds:`, hitCardOdds);
      
      console.log(`🎲 Using classic pack odds:`, hitCardOdds);
      
      // NEW SYSTEM: 1-1000 number generator for precise odds
      // Generate random number from 1-1000 (inclusive)
      const { randomBytes } = await import('crypto');
      const hitRandomBytes = randomBytes(4);
      const randomInt = (hitRandomBytes.readUInt32BE(0) % 1000) + 1; // 1-1000
      let selectedHitCard = null;
      
      console.log("🎲 Random number (1-1000):", randomInt);
      console.log("🎲 Timestamp:", Date.now());
      console.log("🎲 User ID:", userId);
      console.log("🎲 Random bytes:", hitRandomBytes.toString('hex'));
      
      console.log("🎲 Current hitCardOdds being used:", hitCardOdds);
      console.log("🎲 Pack type: classic");
      
      // Use default cumulative ranges for pokeball odds
      const tierRanges: Record<string, { start: number; end: number }> = {
        C: { start: 1, end: Math.floor(hitCardOdds.C * 1000) },
        B: { start: Math.floor(hitCardOdds.C * 1000) + 1, end: Math.floor((hitCardOdds.C + hitCardOdds.B) * 1000) },
        A: { start: Math.floor((hitCardOdds.C + hitCardOdds.B) * 1000) + 1, end: Math.floor((hitCardOdds.C + hitCardOdds.B + hitCardOdds.A) * 1000) },
        S: { start: Math.floor((hitCardOdds.C + hitCardOdds.B + hitCardOdds.A) * 1000) + 1, end: Math.floor((hitCardOdds.C + hitCardOdds.B + hitCardOdds.A + hitCardOdds.S) * 1000) },
        SS: { start: Math.floor((hitCardOdds.C + hitCardOdds.B + hitCardOdds.A + hitCardOdds.S) * 1000) + 1, end: Math.floor((hitCardOdds.C + hitCardOdds.B + hitCardOdds.A + hitCardOdds.S + hitCardOdds.SS) * 1000) },
        SSS: { start: Math.floor((hitCardOdds.C + hitCardOdds.B + hitCardOdds.A + hitCardOdds.S + hitCardOdds.SS) * 1000) + 1, end: Math.floor((hitCardOdds.C + hitCardOdds.B + hitCardOdds.A + hitCardOdds.S + hitCardOdds.SS + hitCardOdds.SSS) * 1000) }
      };
      
      console.log("🎲 Tier ranges:", tierRanges);
      
      // Find which tier the random number falls into
      const hitTiers = ['C', 'B', 'A', 'S', 'SS', 'SSS'];
      let selectedTier = null;
      
      for (const tier of hitTiers) {
        const range = tierRanges[tier];
        console.log(`🎲 Checking tier ${tier}: range=${range.start}-${range.end}, random=${randomInt}, inRange=${randomInt >= range.start && randomInt <= range.end}`);
        
        if (randomInt >= range.start && randomInt <= range.end) {
          selectedTier = tier;
          break;
        }
      }
      
      if (selectedTier) {
        const hitCards = packCardsWithDetails.filter(card => card.tier?.trim() === selectedTier);
        if (hitCards.length > 0) {
          // Use crypto for card selection within tier
          const cardRandomBytes = randomBytes(4);
          const cardRandom = cardRandomBytes.readUInt32BE(0) / 0xffffffff;
          selectedHitCard = hitCards[Math.floor(cardRandom * hitCards.length)];
          console.log(`🎲 Hit card selected from tier ${selectedTier}:`, selectedHitCard);
          console.log(`🎲 Card selection random:`, cardRandom);
        }
      }
      
      // If no hit card selected (shouldn't happen with proper odds), fallback to C tier
      if (!selectedHitCard) {
        const fallbackCards = packCardsWithDetails.filter(card => card.tier?.trim() === 'C');
        if (fallbackCards.length > 0) {
          // Use crypto for fallback card selection
          const fallbackRandomBytes = randomBytes(4);
          const fallbackRandom = fallbackRandomBytes.readUInt32BE(0) / 0xffffffff;
          selectedHitCard = fallbackCards[Math.floor(fallbackRandom * fallbackCards.length)];
          console.log("🎲 Fallback hit card selected (C tier):", selectedHitCard);
          console.log("🎲 Fallback random:", fallbackRandom);
        } else {
          // Ultimate fallback - use common card
          selectedHitCard = fixedCommonCard;
          console.log("🎲 Ultimate fallback - using common card as hit:", selectedHitCard);
        }
      }
      
      // Create the pack result - 7 common cards + 1 hit card
      const selectedCards = [];
      
      // Add 7 common cards (D tier)
      for (let i = 0; i < 7; i++) {
        selectedCards.push({
          id: `card-${Date.now()}-${i}`,
          name: fixedCommonCard.name,
          tier: fixedCommonCard.tier,
          imageUrl: fixedCommonCard.imageUrl,
          marketValue: fixedCommonCard.refundCredit.toString(),
          isHit: false,
          position: i
        });
      }
      
      // Add 1 hit card at position 7
      selectedCards.push({
        id: `card-${Date.now()}-7`,
        name: selectedHitCard.name,
        tier: selectedHitCard.tier,
        imageUrl: selectedHitCard.imageUrl,
        marketValue: selectedHitCard.refundCredit.toString(),
        isHit: true,
        position: 7
      });
      
      // Deduct cards from the classic pack pool
      // Note: Common cards (D tier) are unlimited and don't need inventory deduction

      // Deduct 1 hit card
      await tx
        .update(classicPrize)
        .set({ quantity: sql`${classicPrize.quantity} - 1` })
        .where(and(
          eq(classicPrize.packId, classicPack.id),
          eq(classicPrize.cardName, selectedHitCard.name)
        ));

      // Add cards to user's collection
      for (const card of selectedCards) {
        await tx.insert(userCards).values({
          id: `uc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId,
          cardName: card.name,
          cardImageUrl: card.imageUrl,
          cardTier: card.tier,
          refundCredit: parseInt(card.marketValue),
          quantity: 1,
          isRefunded: false,
          isShipped: false,
          packSource: classicPack.id,
          cardSource: 'classic'
        });
      }

      return {
        success: true,
        packCards: selectedCards,
        hitCardPosition: 7,
        packType: 'classic'
      };
    });
  }

  private async openSpecialPack(specialPack: SpecialPack, userId: string): Promise<PackOpenResult> {
    console.log("🎲 Opening special pack:", specialPack.id);
    
    return await db.transaction(async (tx) => {
      // Get all cards from the special pack's prize pool
      const packCards = await tx
        .select()
        .from(specialPrize)
        .where(eq(specialPrize.packId, specialPack.id));
      
      console.log("🎲 Found pack cards in special pool:", packCards.length, "(D-tier cards excluded - fixed assets)");
      
      if (packCards.length === 0) {
        throw new Error("No cards found in special pack pool");
      }
      
      // Get card details for each pack card (exclude D-tier as they're fixed assets)
      const packCardsWithDetails = packCards
        .filter(pc => pc.cardTier?.trim() !== 'D') // Exclude D-tier cards (fixed assets)
        .map(pc => ({
          name: pc.cardName,
          tier: pc.cardTier,
          quantity: pc.quantity,
          imageUrl: pc.cardImageUrl,
          refundCredit: pc.refundCredit
        }));
      
      // Use fixed D-tier card (unlimited asset - no inventory management needed)
      const fixedCommonCard = {
        name: 'Common Cards',
        tier: 'D',
        quantity: 999999, // Unlimited quantity
        imageUrl: '/assets/Commons.png',
        refundCredit: 1
      };
      console.log("🎲 Using fixed D-tier card (unlimited asset):", fixedCommonCard.name);
      
      // Use pokeball custom odds (same as mystery pack pokeball)
      console.log(`🎲 Using custom pokeball odds for special pack (1-1000 system) - Base Odds`);
      const hitCardOdds = {
        D: 0.0,    // 0% D (not used for hit card)
        C: 0.848,  // 84.8% C (1-848)
        B: 0.06,   // 6% B (849-908)
        A: 0.045,  // 4.5% A (909-953)
        S: 0.035,  // 3.5% S (954-988)
        SS: 0.01,  // 1% SS (989-998)
        SSS: 0.002 // 0.2% SSS (999-1000)
      };
      console.log(`🎲 Special pack pokeball custom odds:`, hitCardOdds);
      
      console.log(`🎲 Using special pack odds:`, hitCardOdds);
      
      // NEW SYSTEM: 1-1000 number generator for precise odds
      // Generate random number from 1-1000 (inclusive)
      const { randomBytes } = await import('crypto');
      const hitRandomBytes = randomBytes(4);
      const randomInt = (hitRandomBytes.readUInt32BE(0) % 1000) + 1; // 1-1000
      let selectedHitCard = null;
      
      console.log("🎲 Random number (1-1000):", randomInt);
      console.log("🎲 Timestamp:", Date.now());
      console.log("🎲 User ID:", userId);
      console.log("🎲 Random bytes:", hitRandomBytes.toString('hex'));
      
      console.log("🎲 Current hitCardOdds being used:", hitCardOdds);
      console.log("🎲 Pack type: special");
      
      // Use default cumulative ranges for pokeball odds
      const tierRanges: Record<string, { start: number; end: number }> = {
        C: { start: 1, end: Math.floor(hitCardOdds.C * 1000) },
        B: { start: Math.floor(hitCardOdds.C * 1000) + 1, end: Math.floor((hitCardOdds.C + hitCardOdds.B) * 1000) },
        A: { start: Math.floor((hitCardOdds.C + hitCardOdds.B) * 1000) + 1, end: Math.floor((hitCardOdds.C + hitCardOdds.B + hitCardOdds.A) * 1000) },
        S: { start: Math.floor((hitCardOdds.C + hitCardOdds.B + hitCardOdds.A) * 1000) + 1, end: Math.floor((hitCardOdds.C + hitCardOdds.B + hitCardOdds.A + hitCardOdds.S) * 1000) },
        SS: { start: Math.floor((hitCardOdds.C + hitCardOdds.B + hitCardOdds.A + hitCardOdds.S) * 1000) + 1, end: Math.floor((hitCardOdds.C + hitCardOdds.B + hitCardOdds.A + hitCardOdds.S + hitCardOdds.SS) * 1000) },
        SSS: { start: Math.floor((hitCardOdds.C + hitCardOdds.B + hitCardOdds.A + hitCardOdds.S + hitCardOdds.SS) * 1000) + 1, end: Math.floor((hitCardOdds.C + hitCardOdds.B + hitCardOdds.A + hitCardOdds.S + hitCardOdds.SS + hitCardOdds.SSS) * 1000) }
      };
      
      console.log("🎲 Tier ranges:", tierRanges);
      
      // Find which tier the random number falls into
      const hitTiers = ['C', 'B', 'A', 'S', 'SS', 'SSS'];
      let selectedTier = null;
      
      for (const tier of hitTiers) {
        const range = tierRanges[tier];
        console.log(`🎲 Checking tier ${tier}: range=${range.start}-${range.end}, random=${randomInt}, inRange=${randomInt >= range.start && randomInt <= range.end}`);
        
        if (randomInt >= range.start && randomInt <= range.end) {
          selectedTier = tier;
          break;
        }
      }
      
      if (selectedTier) {
        const hitCards = packCardsWithDetails.filter(card => card.tier?.trim() === selectedTier);
        if (hitCards.length > 0) {
          // Use crypto for card selection within tier
          const cardRandomBytes = randomBytes(4);
          const cardRandom = cardRandomBytes.readUInt32BE(0) / 0xffffffff;
          selectedHitCard = hitCards[Math.floor(cardRandom * hitCards.length)];
          console.log(`🎲 Hit card selected from tier ${selectedTier}:`, selectedHitCard);
          console.log(`🎲 Card selection random:`, cardRandom);
        }
      }
      
      // If no hit card selected (shouldn't happen with proper odds), fallback to C tier
      if (!selectedHitCard) {
        const fallbackCards = packCardsWithDetails.filter(card => card.tier?.trim() === 'C');
        if (fallbackCards.length > 0) {
          // Use crypto for fallback card selection
          const fallbackRandomBytes = randomBytes(4);
          const fallbackRandom = fallbackRandomBytes.readUInt32BE(0) / 0xffffffff;
          selectedHitCard = fallbackCards[Math.floor(fallbackRandom * fallbackCards.length)];
          console.log("🎲 Fallback hit card selected (C tier):", selectedHitCard);
          console.log("🎲 Fallback random:", fallbackRandom);
        } else {
          // Ultimate fallback - use common card
          selectedHitCard = fixedCommonCard;
          console.log("🎲 Ultimate fallback - using common card as hit:", selectedHitCard);
        }
      }
      
      // Create the pack result - 7 common cards + 1 hit card
      const selectedCards = [];
      
      // Add 7 common cards (D tier)
      for (let i = 0; i < 7; i++) {
        selectedCards.push({
          id: `card-${Date.now()}-${i}`,
          name: fixedCommonCard.name,
          tier: fixedCommonCard.tier,
          imageUrl: fixedCommonCard.imageUrl,
          marketValue: fixedCommonCard.refundCredit.toString(),
          isHit: false,
          position: i
        });
      }
      
      // Add 1 hit card at position 7
      selectedCards.push({
        id: `card-${Date.now()}-7`,
        name: selectedHitCard.name,
        tier: selectedHitCard.tier,
        imageUrl: selectedHitCard.imageUrl,
        marketValue: selectedHitCard.refundCredit.toString(),
        isHit: true,
        position: 7
      });
      
      // Deduct cards from the special pack pool
      // Note: Common cards (D tier) are unlimited and don't need inventory deduction

      // Deduct 1 hit card
      await tx
        .update(specialPrize)
        .set({ quantity: sql`${specialPrize.quantity} - 1` })
        .where(and(
          eq(specialPrize.packId, specialPack.id),
          eq(specialPrize.cardName, selectedHitCard.name)
        ));

      // Add cards to user's collection
      for (const card of selectedCards) {
        await tx.insert(userCards).values({
          id: `uc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId,
          cardName: card.name,
          cardImageUrl: card.imageUrl,
          cardTier: card.tier,
          refundCredit: parseInt(card.marketValue),
          quantity: 1,
          isRefunded: false,
          isShipped: false,
          packSource: specialPack.id,
          cardSource: 'special'
        });
      }

      return {
        success: true,
        packCards: selectedCards,
        hitCardPosition: 7,
        packType: 'special'
      };
    });
  }

  // ============================================================================
  // PLACEHOLDER METHODS (for compatibility with routes.ts)
  // ============================================================================

  async getInventoryCards(): Promise<any[]> {
      return [];
    }

  async getGameSetting(gameType: string): Promise<any> {
    return null;
  }

  async createGameSession(sessionData: any): Promise<any> {
    return { id: `session-${Date.now()}` };
  }

  async updateGameSession(sessionId: string, result: any, status: string): Promise<void> {
    // Placeholder implementation
  }

  async addNotification(notificationData: any): Promise<void> {
    // Placeholder implementation
  }

  async getSystemStats(): Promise<any> {
    try {
      console.log('🔍 Fetching system stats...');
      
      // Get total users count
      const userCountResult = await db.select({ count: sql<number>`count(*)` }).from(users);
      const totalUsers = userCountResult[0]?.count || 0;
      console.log('👥 User count result:', userCountResult, 'Total users:', totalUsers);

      // Get total revenue from transactions (include raffle entries and purchases)
      const revenueResult = await db.select({ 
        total: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)` 
      }).from(transactions).where(
        sql`${transactions.type} IN ('purchase', 'raffle_entry', 'credit_reload')`
      );
      const totalRevenue = Number(revenueResult[0]?.total || 0);
      console.log('💰 Revenue result:', revenueResult, 'Total revenue:', totalRevenue);

      // Get top spenders (list of top 5 spending users) - include raffle entries and purchases
      const topSpendersResult = await db
        .select({
          userId: transactions.userId,
          totalSpent: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
          email: users.email,
          username: users.username
        })
        .from(transactions)
        .leftJoin(users, eq(transactions.userId, users.id))
        .where(
          sql`${transactions.type} IN ('purchase', 'raffle_entry', 'credit_reload')`
        )
        .groupBy(transactions.userId, users.email, users.username)
        .orderBy(sql`COALESCE(SUM(CAST(amount AS DECIMAL)), 0) DESC`)
        .limit(5);

      const topSpenders = topSpendersResult.map(spender => ({
        totalSpent: Number(spender.totalSpent || 0).toFixed(2),
        email: spender.email || 'Unknown',
        username: spender.username || 'Unknown',
        userId: spender.userId
      }));
      console.log('🏆 Top spenders result:', topSpendersResult, 'Processed:', topSpenders);

      const result = {
        totalUsers,
        totalRevenue: totalRevenue.toFixed(2),
        topSpenders
      };
      console.log('📊 Final stats result:', result);
      return result;
    } catch (error) {
      console.error('Error fetching system stats:', error);
      return {
        totalUsers: 0,
        totalRevenue: "0.00",
        topSpenders: []
      };
    }
  }

  async createInventoryCard(cardData: any): Promise<any> {
    return { id: `inv-${Date.now()}` };
  }

  async updateInventoryCard(id: string, cardData: any): Promise<any> {
    return { id };
  }

  async deleteInventoryCard(id: string): Promise<void> {
    // Placeholder implementation
  }

  async getAllPullRates(): Promise<any[]> {
    return [];
  }

  async getPackPullRates(packType: string): Promise<any[]> {
    return [];
  }

  async setPackPullRates(packType: string, rates: any, userId: string): Promise<void> {
    // Placeholder implementation
  }

  async getVirtualLibraryCards(): Promise<any[]> {
    return [];
  }

  async createVirtualLibraryCard(cardData: any): Promise<any> {
    return { id: `vl-${Date.now()}` };
  }

  async updateVirtualLibraryCard(id: string, cardData: any): Promise<any> {
    return { id };
  }

  async deleteVirtualLibraryCard(id: string): Promise<void> {
    // Placeholder implementation
  }

  async getPackOdds(id: string): Promise<any> {
    return {};
  }

  async getUserNotifications(userId: string): Promise<any[]> {
    return [];
  }

  async markNotificationRead(id: string): Promise<void> {
    // Placeholder implementation
  }

  async getAllSystemSettings(): Promise<SystemSetting[]> {
    return await db.select().from(systemSettings).orderBy(desc(systemSettings.updatedAt));
  }

  async getSystemSetting(key: string): Promise<SystemSetting | null> {
    const result = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
    return result[0] || null;
  }

  async updateSystemSetting(settingKey: string, settingValue: any, userId: string): Promise<SystemSetting> {
    const existing = await this.getSystemSetting(settingKey);
    
    if (existing) {
      // Update existing setting
      const result = await db
        .update(systemSettings)
        .set({ 
          value: settingValue.toString(),
          updatedBy: userId,
          updatedAt: new Date()
        })
        .where(eq(systemSettings.key, settingKey))
        .returning();
      return result[0];
    } else {
      // Create new setting
      const result = await db
        .insert(systemSettings)
        .values({
          id: `setting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          key: settingKey,
          value: settingValue.toString(),
          type: typeof settingValue === 'boolean' ? 'boolean' : 
                typeof settingValue === 'number' ? 'number' : 'string',
          updatedBy: userId
        })
        .returning();
      return result[0];
    }
  }

  async createSystemSetting(settingData: InsertSystemSetting): Promise<SystemSetting> {
    const result = await db.insert(systemSettings).values({
      ...settingData,
      id: `setting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }).returning();
    return result[0];
  }

  // ============================================================================
  // SHIPPING METHODS
  // ============================================================================

  async getUserAddresses(userId: string): Promise<UserAddress[]> {
    return await db.select().from(userAddresses).where(eq(userAddresses.userId, userId)).orderBy(desc(userAddresses.isDefault), desc(userAddresses.createdAt));
  }

  async createUserAddress(addressData: InsertUserAddress): Promise<UserAddress> {
    const result = await db.insert(userAddresses).values({
      ...addressData,
      id: `addr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }).returning();
    return result[0];
  }

  async updateUserAddress(addressId: string, addressData: Partial<InsertUserAddress>): Promise<UserAddress> {
    const result = await db.update(userAddresses)
      .set({ ...addressData, updatedAt: new Date() })
      .where(eq(userAddresses.id, addressId))
      .returning();
    return result[0];
  }

  async deleteUserAddress(addressId: string): Promise<void> {
    await db.delete(userAddresses).where(eq(userAddresses.id, addressId));
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<void> {
    // First, unset all default addresses for this user
    await db.update(userAddresses)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(and(eq(userAddresses.userId, userId), eq(userAddresses.isDefault, true)));
    
    // Then set the new default
    await db.update(userAddresses)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(userAddresses.id, addressId));
  }

  async createShippingRequest(requestData: InsertShippingRequest): Promise<ShippingRequest> {
    return await db.transaction(async (tx) => {
      // Create the shipping request
      const result = await tx.insert(shippingRequests).values({
        ...requestData,
        id: `ship-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }).returning();

      // Remove the shipped cards from user's vault
      if (requestData.items && Array.isArray(requestData.items) && requestData.userId) {
        console.log('📦 Shipping request items:', JSON.stringify(requestData.items, null, 2));
        const cardIds = requestData.items.map((item: any) => item.id).filter(Boolean);
        console.log('🆔 Extracted card IDs:', cardIds);
        
        if (cardIds.length > 0) {
          console.log(`🚚 Removing ${cardIds.length} cards from vault for shipping request ${result[0].id}`);
          
          // First, check if the cards exist in the vault
          const existingCards = await tx
            .select()
            .from(userCards)
            .where(and(
              inArray(userCards.id, cardIds),
              eq(userCards.userId, requestData.userId)
            ));
          
          console.log(`🔍 Found ${existingCards.length} cards in vault to remove:`, existingCards.map(c => c.id));
          
          // Delete the cards from user's vault
          const deleteResult = await tx
            .delete(userCards)
            .where(and(
              inArray(userCards.id, cardIds),
              eq(userCards.userId, requestData.userId)
            ))
            .returning();
          
          console.log(`✅ Successfully removed ${deleteResult.length} cards from vault. Deleted cards:`, deleteResult.map(c => ({ id: c.id, name: c.cardName })));
        } else {
          console.log('⚠️ No valid card IDs found in shipping request items');
        }
      } else {
        console.log('⚠️ No items found in shipping request or items is not an array');
      }

      return result[0];
    });
  }

  async getUserShippingRequests(userId: string): Promise<(ShippingRequest & { address: UserAddress })[]> {
    return await db.select({
      id: shippingRequests.id,
      userId: shippingRequests.userId,
      addressId: shippingRequests.addressId,
      items: shippingRequests.items,
      totalValue: shippingRequests.totalValue,
      status: shippingRequests.status,
      trackingNumber: shippingRequests.trackingNumber,
      notes: shippingRequests.notes,
      createdAt: shippingRequests.createdAt,
      updatedAt: shippingRequests.updatedAt,
      address: {
        id: userAddresses.id,
        userId: userAddresses.userId,
        name: userAddresses.name,
        address: userAddresses.address,
        city: userAddresses.city,
        state: userAddresses.state,
        postalCode: userAddresses.postalCode,
        country: userAddresses.country,
        phone: userAddresses.phone,
        isDefault: userAddresses.isDefault,
        createdAt: userAddresses.createdAt,
        updatedAt: userAddresses.updatedAt,
      }
    })
    .from(shippingRequests)
    .innerJoin(userAddresses, eq(shippingRequests.addressId, userAddresses.id))
    .where(eq(shippingRequests.userId, userId))
    .orderBy(desc(shippingRequests.createdAt));
  }

  async getAllShippingRequests(): Promise<(ShippingRequest & { address: UserAddress; user: Pick<User, 'id' | 'email' | 'username' | 'credits' | 'createdAt' | 'updatedAt'> })[]> {
    return await db.select({
      id: shippingRequests.id,
      userId: shippingRequests.userId,
      addressId: shippingRequests.addressId,
      items: shippingRequests.items,
      totalValue: shippingRequests.totalValue,
      status: shippingRequests.status,
      trackingNumber: shippingRequests.trackingNumber,
      notes: shippingRequests.notes,
      createdAt: shippingRequests.createdAt,
      updatedAt: shippingRequests.updatedAt,
      address: {
        id: userAddresses.id,
        userId: userAddresses.userId,
        name: userAddresses.name,
        address: userAddresses.address,
        city: userAddresses.city,
        state: userAddresses.state,
        postalCode: userAddresses.postalCode,
        country: userAddresses.country,
        phone: userAddresses.phone,
        isDefault: userAddresses.isDefault,
        createdAt: userAddresses.createdAt,
        updatedAt: userAddresses.updatedAt,
      },
      user: {
        id: users.id,
        email: users.email,
        username: users.username,
        credits: users.credits,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      }
    })
    .from(shippingRequests)
    .innerJoin(userAddresses, eq(shippingRequests.addressId, userAddresses.id))
    .innerJoin(users, eq(shippingRequests.userId, users.id))
    .orderBy(desc(shippingRequests.createdAt));
  }

  async updateShippingRequest(requestId: string, updateData: Partial<InsertShippingRequest>): Promise<ShippingRequest> {
    const result = await db.update(shippingRequests)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(shippingRequests.id, requestId))
      .returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();