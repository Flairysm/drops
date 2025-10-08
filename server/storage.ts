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

  async getUserCards(userId: string): Promise<UserCard[]> {
    console.log("getUserCards called for userId:", userId);
    const result = await db
      .select()
      .from(userCards)
      .where(and(
        eq(userCards.userId, userId),
        eq(userCards.isRefunded, false) // Only return non-refunded cards
      ))
      .orderBy(desc(userCards.createdAt));

    console.log("Final getUserCards result:", result.length, "cards");
    return result;
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
        totalRefund += parseInt(card.refundCredit.toString());
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
        if (card.cardSource === 'classic') {
          // Return to classic prize pool
          await tx
            .update(classicPrize)
            .set({ quantity: sql`${classicPrize.quantity} + 1` })
            .where(and(
              eq(classicPrize.packId, card.packSource || ''),
              eq(classicPrize.cardName, card.cardName)
            ));
        } else if (card.cardSource === 'special') {
          // Return to special prize pool
          await tx
            .update(specialPrize)
            .set({ quantity: sql`${specialPrize.quantity} + 1` })
            .where(and(
              eq(specialPrize.packId, card.packSource || ''),
              eq(specialPrize.cardName, card.cardName)
            ));
        } else if (card.cardSource === 'mystery') {
          // Return to mystery prize pool
          await tx
            .update(mysteryPrize)
            .set({ quantity: sql`${mysteryPrize.quantity} + 1` })
            .where(and(
              eq(mysteryPrize.packId, card.packSource || ''),
              eq(mysteryPrize.cardName, card.cardName)
            ));
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
      await db.execute(sql`
        INSERT INTO global_feed (id, user_id, card_id, game_type, card_name, card_image_url, tier, created_at)
        VALUES (
          ${`gf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`},
          ${feedData.userId},
          ${feedData.packId || null},
          ${feedData.packType || 'unknown'},
          ${feedData.cardName || feedData.card?.name || 'Unknown Card'},
          ${feedData.imageUrl || feedData.card?.imageUrl || '/card-images/Commons.png'},
          ${feedData.cardTier || feedData.card?.tier || 'D'},
          ${new Date()}
        )
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
      
      // Use raw SQL query with proper tier filtering and limit
      const result = await db.execute(sql`
        SELECT * FROM global_feed 
        WHERE tier = ANY(${allowedTiers})
        ORDER BY created_at DESC 
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
        pulledAt: row.created_at
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
    
    return { ...pack[0], cards };
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
    
    return { ...pack[0], cards };
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
    }
    
    throw new Error(`Unknown pack type: ${userPack.packType}`);
  }

  private async openMysteryPack(mysteryPack: MysteryPack, userId: string): Promise<PackOpenResult> {
    console.log("🎲 Opening mystery pack:", mysteryPack.packType);
    
    return await db.transaction(async (tx) => {
      // Get all cards from the shared pokeball pool (base pool)
      const packCards = await tx
        .select()
        .from(mysteryPrize)
        .where(eq(mysteryPrize.packId, 'mystery-pokeball'));
      
      console.log("🎲 Found pack cards in shared pool:", packCards.length);
      
      if (packCards.length === 0) {
        throw new Error("No cards found in mystery pack pool");
      }
      
      // Get card details for each pack card
      const packCardsWithDetails = packCards.map(pc => ({
        name: pc.cardName,
        tier: pc.cardTier,
        quantity: pc.quantity,
        imageUrl: pc.cardImageUrl,
        refundCredit: pc.refundCredit
      }));
      
      // Filter common cards (D tier) for the first 7 cards
      const commonCards = packCardsWithDetails.filter(card => card.tier?.trim() === 'D');
      console.log("🎲 Common cards found:", commonCards.length);
      
      if (commonCards.length === 0) {
        throw new Error("No common cards found in mystery pack pool");
      }
      
      // Select a random common card for the first 7 cards
      const selectedCommonCard = commonCards[Math.floor(Math.random() * commonCards.length)];
      
      // Define base odds (for pokeball)
      const baseOdds: Record<string, number> = {
        D: 0.0,    // 0% D (not used for hit card)
        C: 0.848,  // 84.8% C
        B: 0.06,   // 6% B
        A: 0.045,  // 4.5% A
        S: 0.035,  // 3.5% S
        SS: 0.01,  // 1% SS
        SSS: 0.002 // 0.2% SSS
      };
      
      // Define pack-specific odds based on pack type
      let hitCardOdds: Record<string, number>;
      switch (mysteryPack.packType) {
        case 'pokeball':
          hitCardOdds = baseOdds;
          break;
        case 'greatball':
          hitCardOdds = {
            D: 0.0,    // 0% D
            C: 0.40,   // 40% C
            B: 0.30,   // 30% B
            A: 0.15,   // 15% A
            S: 0.10,   // 10% S
            SS: 0.04,  // 4% SS
            SSS: 0.01  // 1% SSS
          };
          break;
        case 'ultraball':
          // Ultraball guarantees B or above
          hitCardOdds = {
            D: 0.0,    // 0% D
            C: 0.0,    // 0% C
            B: 0.60,   // 60% B
            A: 0.25,   // 25% A
            S: 0.10,   // 10% S
            SS: 0.04,  // 4% SS
            SSS: 0.01  // 1% SSS
          };
          break;
        case 'masterball':
          // Masterball guarantees A or above
          hitCardOdds = {
            D: 0.0,    // 0% D
            C: 0.0,    // 0% C
            B: 0.0,    // 0% B
            A: 0.50,   // 50% A
            S: 0.30,   // 30% S
            SS: 0.15,  // 15% SS
            SSS: 0.05  // 5% SSS
          };
          break;
        default:
          hitCardOdds = baseOdds;
      }
      
      console.log(`🎲 Using ${mysteryPack.packType} odds:`, hitCardOdds);
      
      // Select hit card based on odds
      const random = Math.random();
      let selectedHitCard = null;
      
      console.log("🎲 Random number for hit selection:", random);
      
      // Calculate cumulative odds for hit card selection
      const hitTiers = ['SSS', 'SS', 'S', 'A', 'B', 'C'];
      let cumulativeOdds = 0;
      
      for (const tier of hitTiers) {
        cumulativeOdds += hitCardOdds[tier];
        console.log(`🎲 Checking tier ${tier}: odds=${hitCardOdds[tier]}, cumulative=${cumulativeOdds}, random=${random}, selected=${random < cumulativeOdds}`);
        if (random < cumulativeOdds) {
          const hitCards = packCardsWithDetails.filter(card => card.tier?.trim() === tier);
          if (hitCards.length > 0) {
            selectedHitCard = hitCards[Math.floor(Math.random() * hitCards.length)];
            console.log(`🎲 Hit card selected from tier ${tier}:`, selectedHitCard);
            break;
          }
        }
      }
      
      // If no hit card selected (shouldn't happen with proper odds), fallback to C tier
      if (!selectedHitCard) {
        const fallbackCards = packCardsWithDetails.filter(card => card.tier?.trim() === 'C');
        if (fallbackCards.length > 0) {
          selectedHitCard = fallbackCards[Math.floor(Math.random() * fallbackCards.length)];
          console.log("🎲 Fallback hit card selected (C tier):", selectedHitCard);
        } else {
          // Ultimate fallback - use common card
          selectedHitCard = selectedCommonCard;
          console.log("🎲 Ultimate fallback - using common card as hit:", selectedHitCard);
        }
      }
      
      // Create the pack result - 7 common cards + 1 hit card
      const selectedCards = [];
      
      // Add 7 common cards (D tier)
      for (let i = 0; i < 7; i++) {
        selectedCards.push({
          id: `card-${Date.now()}-${i}`,
          name: selectedCommonCard.name,
          tier: selectedCommonCard.tier,
          imageUrl: selectedCommonCard.imageUrl,
          marketValue: selectedCommonCard.refundCredit.toString(),
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
      // Deduct 7 common cards
      await tx
        .update(mysteryPrize)
        .set({ quantity: sql`${mysteryPrize.quantity} - 7` })
        .where(and(
          eq(mysteryPrize.packId, 'mystery-pokeball'),
          eq(mysteryPrize.cardName, selectedCommonCard.name)
        ));

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
    return await db.transaction(async (tx) => {
      // Get all cards from the classic pack's prize pool
      const prizePoolCards = await tx
          .select()
        .from(classicPrize)
        .where(eq(classicPrize.packId, classicPack.id));
      
      if (prizePoolCards.length === 0) {
        throw new Error("No cards found in classic pack prize pool");
      }
      
      // Separate D-tier cards from other tiers
      const dTierCards = prizePoolCards.filter(card => card.cardTier === 'D');
      const hitTierCards = prizePoolCards.filter(card => card.cardTier !== 'D');
      
      if (dTierCards.length === 0) {
        throw new Error("No D-tier cards found in classic pack prize pool");
      }
      
      if (hitTierCards.length === 0) {
        throw new Error("No hit cards (non-D tier) found in classic pack prize pool");
      }
      
      const selectedCards = [];
      
      // Select 7 guaranteed D-tier cards
      for (let i = 0; i < 7; i++) {
        const randomDCard = dTierCards[Math.floor(Math.random() * dTierCards.length)];
        selectedCards.push({
          id: `cpc-${Date.now()}-${i}`,
          name: randomDCard.cardName,
          tier: randomDCard.cardTier,
          imageUrl: randomDCard.cardImageUrl,
          marketValue: randomDCard.refundCredit.toString(),
          isHit: false,
          position: i
        });
        
        // Deduct the D-tier card from the prize pool
        await tx
          .update(classicPrize)
          .set({ quantity: sql`${classicPrize.quantity} - 1` })
          .where(and(
            eq(classicPrize.packId, classicPack.id),
            eq(classicPrize.cardName, randomDCard.cardName)
          ));
      }
      
      // Select 1 hit card with weighted odds (non-D tier)
      // Using array to ensure proper order
      const hitCardOdds = [
        { tier: 'C', odds: 0.50 },   // 50% chance
        { tier: 'B', odds: 0.30 },   // 30% chance  
        { tier: 'A', odds: 0.15 },   // 15% chance
        { tier: 'S', odds: 0.04 },   // 4% chance
        { tier: 'SS', odds: 0.008 }, // 0.8% chance
        { tier: 'SSS', odds: 0.002 } // 0.2% chance
      ];
      
      const random = Math.random();
      console.log(`🎲 Classic pack hit card selection - Random number: ${random}`);
      let selectedTier = 'C'; // Default fallback
      let cumulativeOdds = 0;
      
      for (const { tier, odds } of hitCardOdds) {
        cumulativeOdds += odds;
        console.log(`🎲 Checking tier ${tier}: odds=${odds}, cumulative=${cumulativeOdds}, random=${random}, selected=${random < cumulativeOdds}`);
        if (random < cumulativeOdds) {
          selectedTier = tier;
          break;
        }
      }
      
      console.log(`🎲 Selected tier: ${selectedTier}`);
      
      // Find cards of the selected tier
      const tierCards = hitTierCards.filter(card => card.cardTier === selectedTier);
      console.log(`🎲 Available cards for tier ${selectedTier}: ${tierCards.length}`);
      
      const randomHitCard = tierCards.length > 0 
        ? tierCards[Math.floor(Math.random() * tierCards.length)]
        : hitTierCards[Math.floor(Math.random() * hitTierCards.length)]; // Fallback to any hit card
      
      console.log(`🎲 Final hit card selected: ${randomHitCard.cardName} (${randomHitCard.cardTier})`);
      
      selectedCards.push({
        id: `cpc-${Date.now()}-7`,
        name: randomHitCard.cardName,
        tier: randomHitCard.cardTier,
        imageUrl: randomHitCard.cardImageUrl,
        marketValue: randomHitCard.refundCredit.toString(),
        isHit: true, // This is the hit card
        position: 7
      });
      
      // Deduct the hit card from the prize pool
      await tx
        .update(classicPrize)
        .set({ quantity: sql`${classicPrize.quantity} - 1` })
        .where(and(
          eq(classicPrize.packId, classicPack.id),
          eq(classicPrize.cardName, randomHitCard.cardName)
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
    return await db.transaction(async (tx) => {
      // Get all cards from the special pack's prize pool
      const prizePoolCards = await tx
        .select()
        .from(specialPrize)
        .where(eq(specialPrize.packId, specialPack.id));
      
      if (prizePoolCards.length === 0) {
        throw new Error("No cards found in special pack prize pool");
      }
      
      // Select 8 random cards from the prize pool
      const selectedCards = [];
      for (let i = 0; i < 8; i++) {
        const randomCard = prizePoolCards[Math.floor(Math.random() * prizePoolCards.length)];
        selectedCards.push({
          id: `spc-${Date.now()}-${i}`,
          name: randomCard.cardName,
          tier: randomCard.cardTier,
          imageUrl: randomCard.cardImageUrl,
          marketValue: randomCard.refundCredit.toString(),
          isHit: i === 7, // Last card is always the hit
          position: i
        });
        
        // Deduct the card from the prize pool
        await tx
          .update(specialPrize)
          .set({ quantity: sql`${specialPrize.quantity} - 1` })
          .where(and(
            eq(specialPrize.packId, specialPack.id),
            eq(specialPrize.cardName, randomCard.cardName)
          ));
      }
      
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
    return {
      totalUsers: 0,
      totalRevenue: "0.00",
      totalPacksOpened: 0,
      totalCardsPulled: 0
    };
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

  async getAllSystemSettings(): Promise<any[]> {
    return [];
  }

  async updateSystemSetting(settingKey: string, settingValue: any, userId: string): Promise<any> {
    return { key: settingKey, value: settingValue };
  }

  async createShippingRequest(requestData: any): Promise<any> {
    return { id: `shipping-${Date.now()}` };
  }
}

export const storage = new DatabaseStorage();