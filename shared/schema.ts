import { pgTable, varchar, text, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// CORE USER TABLES
// ============================================================================

export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  username: varchar("username").unique(),
  email: varchar("email").unique(),
  password: varchar("password_hash"), // Map to password_hash column in database
  role: varchar("role", { length: 50 }).default("user").notNull(), // user, admin
  credits: decimal("credits", { precision: 10, scale: 2 }).default("0.00"),
  isActive: boolean("is_active").default(true),
  emailVerified: boolean("email_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// PACK TABLES
// ============================================================================

// Classic Packs
export const classicPack = pgTable("classic_pack", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  price: varchar("price", { length: 20 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Classic Prizes (cards in classic packs)
export const classicPrize = pgTable("classic_prize", {
  id: varchar("id", { length: 255 }).primaryKey(),
  packId: varchar("pack_id", { length: 255 }).notNull().references(() => classicPack.id, { onDelete: "cascade" }),
  cardName: varchar("card_name", { length: 255 }).notNull(),
  cardImageUrl: text("card_image_url").notNull(),
  cardTier: varchar("card_tier", { length: 20 }).notNull().default("D"), // D, C, B, A, S, SS, SSS
  refundCredit: integer("refund_credit").notNull().default(1),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

// Mystery Packs
export const mysteryPack = pgTable("mystery_pack", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  packType: varchar("pack_type", { length: 50 }).notNull().default("pokeball"),
  price: varchar("price", { length: 20 }).notNull(),
  odds: jsonb("odds").default({}),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Mystery Prizes (cards in mystery packs)
export const mysteryPrize = pgTable("mystery_prize", {
  id: varchar("id", { length: 255 }).primaryKey(),
  packId: varchar("pack_id", { length: 255 }).notNull().references(() => mysteryPack.id, { onDelete: "cascade" }),
  cardName: varchar("card_name", { length: 255 }).notNull(),
  cardImageUrl: text("card_image_url").notNull(),
  cardTier: varchar("card_tier", { length: 20 }).notNull().default("D"), // D, C, B, A, S, SS, SSS
  refundCredit: integer("refund_credit").notNull().default(1),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

// Special Packs
export const specialPack = pgTable("special_pack", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  price: varchar("price", { length: 20 }).notNull(),
  totalCards: integer("total_cards").default(8),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Special Prizes (cards in special packs)
export const specialPrize = pgTable("special_prize", {
  id: varchar("id", { length: 255 }).primaryKey(),
  packId: varchar("pack_id", { length: 255 }).notNull().references(() => specialPack.id, { onDelete: "cascade" }),
  cardName: varchar("card_name", { length: 255 }).notNull(),
  cardImageUrl: text("card_image_url").notNull(),
  cardTier: varchar("card_tier", { length: 20 }).notNull().default("D"), // D, C, B, A, S, SS, SSS
  refundCredit: integer("refund_credit").notNull().default(1),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// USER DATA TABLES
// ============================================================================

// User Packs (unopened packs earned from games)
export const userPacks = pgTable("user_packs", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  packId: varchar("pack_id", { length: 255 }).notNull(),
  packType: varchar("pack_type", { length: 50 }).notNull(), // 'mystery', 'special', 'classic'
  tier: varchar("tier", { length: 50 }),
  earnedFrom: varchar("earned_from", { length: 100 }),
  isOpened: boolean("is_opened").default(false),
  earnedAt: timestamp("earned_at").defaultNow(),
  openedAt: timestamp("opened_at"),
});

// User Cards (opened cards in user's vault)
export const userCards = pgTable("user_cards", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  cardName: varchar("card_name", { length: 255 }).notNull(),
  cardImageUrl: text("card_image_url").notNull(),
  cardTier: varchar("card_tier", { length: 20 }).notNull(),
  refundCredit: integer("refund_credit").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  pullValue: decimal("pull_value", { precision: 10, scale: 2 }).default("0.00"),
  packSource: varchar("pack_source", { length: 100 }),
  cardSource: varchar("card_source", { length: 100 }),
  isRefunded: boolean("is_refunded").default(false),
  isShipped: boolean("is_shipped").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Global Feed
export const globalFeed = pgTable("global_feed", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  packId: varchar("pack_id", { length: 256 }), // Can be null for mystery packs
  packType: varchar("pack_type", { length: 256 }).notNull(),
  cardName: varchar("card_name", { length: 256 }).notNull(),
  cardTier: varchar("card_tier", { length: 256 }).notNull(),
  imageUrl: varchar("image_url", { length: 256 }).notNull(),
  pulledAt: timestamp("pulled_at").defaultNow().notNull(),
});

// Transactions
export const transactions = pgTable("transactions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(), // purchase, refund, game_play, etc.
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  packId: varchar("pack_id"),
  packType: varchar("pack_type", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  userPacks: many(userPacks),
  userCards: many(userCards),
  globalFeed: many(globalFeed),
  transactions: many(transactions),
}));

export const classicPackRelations = relations(classicPack, ({ many }) => ({
  prizes: many(classicPrize),
}));

export const classicPrizeRelations = relations(classicPrize, ({ one }) => ({
  pack: one(classicPack, {
    fields: [classicPrize.packId],
    references: [classicPack.id],
  }),
}));

export const mysteryPackRelations = relations(mysteryPack, ({ many }) => ({
  prizes: many(mysteryPrize),
}));

export const mysteryPrizeRelations = relations(mysteryPrize, ({ one }) => ({
  pack: one(mysteryPack, {
    fields: [mysteryPrize.packId],
    references: [mysteryPack.id],
  }),
}));

export const specialPackRelations = relations(specialPack, ({ many }) => ({
  prizes: many(specialPrize),
}));

export const specialPrizeRelations = relations(specialPrize, ({ one }) => ({
  pack: one(specialPack, {
    fields: [specialPrize.packId],
    references: [specialPack.id],
  }),
}));

export const userPacksRelations = relations(userPacks, ({ one }) => ({
  user: one(users, {
    fields: [userPacks.userId],
    references: [users.id],
  }),
}));

export const userCardsRelations = relations(userCards, ({ one }) => ({
  user: one(users, {
    fields: [userCards.userId],
    references: [users.id],
  }),
}));

export const globalFeedRelations = relations(globalFeed, ({ one }) => ({
  user: one(users, {
    fields: [globalFeed.userId],
    references: [users.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

// Auth schemas
export const registrationSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const insertClassicPackSchema = createInsertSchema(classicPack).omit({
  createdAt: true,
});

export const insertClassicPrizeSchema = createInsertSchema(classicPrize).omit({
  createdAt: true,
});

export const insertMysteryPackSchema = createInsertSchema(mysteryPack).omit({
  createdAt: true,
});

export const insertMysteryPrizeSchema = createInsertSchema(mysteryPrize).omit({
  createdAt: true,
});

export const insertSpecialPackSchema = createInsertSchema(specialPack).omit({
  createdAt: true,
});

export const insertSpecialPrizeSchema = createInsertSchema(specialPrize).omit({
  createdAt: true,
});

export const insertUserPackSchema = createInsertSchema(userPacks).omit({
  earnedAt: true,
});

export const insertUserCardSchema = createInsertSchema(userCards).omit({
  createdAt: true,
});

export const insertGlobalFeedSchema = createInsertSchema(globalFeed).omit({
  pulledAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  createdAt: true,
});

// ============================================================================
// TYPES
// ============================================================================

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type ClassicPack = typeof classicPack.$inferSelect;
export type InsertClassicPack = z.infer<typeof insertClassicPackSchema>;
export type ClassicPrize = typeof classicPrize.$inferSelect;
export type InsertClassicPrize = z.infer<typeof insertClassicPrizeSchema>;

export type MysteryPack = typeof mysteryPack.$inferSelect;
export type InsertMysteryPack = z.infer<typeof insertMysteryPackSchema>;
export type MysteryPrize = typeof mysteryPrize.$inferSelect;
export type InsertMysteryPrize = z.infer<typeof insertMysteryPrizeSchema>;

export type SpecialPack = typeof specialPack.$inferSelect;
export type InsertSpecialPack = z.infer<typeof insertSpecialPackSchema>;
export type SpecialPrize = typeof specialPrize.$inferSelect;
export type InsertSpecialPrize = z.infer<typeof insertSpecialPrizeSchema>;

export type UserPack = typeof userPacks.$inferSelect;
export type InsertUserPack = z.infer<typeof insertUserPackSchema>;
export type UserCard = typeof userCards.$inferSelect;
export type InsertUserCard = z.infer<typeof insertUserCardSchema>;

export type GlobalFeed = typeof globalFeed.$inferSelect;
export type InsertGlobalFeed = z.infer<typeof insertGlobalFeedSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

// Extended types for API responses
export type ClassicPackWithPrizes = ClassicPack & { prizes: ClassicPrize[] };
export type MysteryPackWithPrizes = MysteryPack & { prizes: MysteryPrize[] };
export type SpecialPackWithPrizes = SpecialPack & { prizes: SpecialPrize[] };

export type GlobalFeedWithDetails = GlobalFeed & {
  user: Pick<User, 'username'>;
};

// Legacy types for compatibility
export type Card = {
  id: string;
  name: string;
  tier: string;
  imageUrl: string;
  marketValue: string;
  isHit?: boolean;
  position?: number;
};

export type Pack = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price: string;
  isActive: boolean;
  createdAt: Date;
  cards?: any[];
};