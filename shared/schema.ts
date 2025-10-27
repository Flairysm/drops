import { pgTable, varchar, text, integer, boolean, timestamp, decimal, jsonb, serial } from "drizzle-orm/pg-core";
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
  phone: varchar("phone", { length: 20 }),
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
  metadata: jsonb("metadata"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// METRICS AND AUDIT TABLES
// ============================================================================

// Audit Logs
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  resourceType: varchar("resource_type", { length: 50 }),
  resourceId: varchar("resource_id", { length: 255 }),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  metadata: jsonb("metadata"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Business Metrics
export const businessMetrics = pgTable("business_metrics", {
  id: varchar("id", { length: 255 }).primaryKey(),
  metricType: varchar("metric_type", { length: 100 }).notNull(),
  metricDate: varchar("metric_date", { length: 10 }).notNull(), // YYYY-MM-DD format
  metricValue: decimal("metric_value", { precision: 15, scale: 2 }).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User Metrics
export const userMetrics = pgTable("user_metrics", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  metricType: varchar("metric_type", { length: 100 }).notNull(),
  metricValue: decimal("metric_value", { precision: 15, scale: 2 }).notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Pack Analytics
export const packAnalytics = pgTable("pack_analytics", {
  id: varchar("id", { length: 255 }).primaryKey(),
  packType: varchar("pack_type", { length: 50 }).notNull(),
  packId: varchar("pack_id", { length: 255 }),
  action: varchar("action", { length: 50 }).notNull(),
  userId: varchar("user_id").references(() => users.id),
  creditsSpent: decimal("credits_spent", { precision: 10, scale: 2 }),
  cardsReceived: jsonb("cards_received"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Game Analytics
export const gameAnalytics = pgTable("game_analytics", {
  id: varchar("id", { length: 255 }).primaryKey(),
  gameType: varchar("game_type", { length: 50 }).notNull(),
  userId: varchar("user_id").references(() => users.id),
  betAmount: decimal("bet_amount", { precision: 10, scale: 2 }).notNull(),
  winAmount: decimal("win_amount", { precision: 10, scale: 2 }).default("0.00"),
  cardsWon: jsonb("cards_won"),
  sessionId: varchar("session_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================================
// SYSTEM SETTINGS TABLES
// ============================================================================

// System Settings
export const systemSettings = pgTable("system_settings", {
  id: varchar("id", { length: 255 }).primaryKey(),
  key: varchar("key", { length: 255 }).unique().notNull(),
  value: text("value").notNull(),
  type: varchar("type", { length: 50 }).default("string"), // string, number, boolean, json
  description: text("description"),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// SHIPPING TABLES
// ============================================================================

// User Addresses
export const userAddresses = pgTable("user_addresses", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  postalCode: varchar("postal_code", { length: 20 }).notNull(),
  country: varchar("country", { length: 100 }).default("US"),
  phone: varchar("phone", { length: 20 }),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Shipping Requests
export const shippingRequests = pgTable("shipping_requests", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  addressId: varchar("address_id").references(() => userAddresses.id),
  items: jsonb("items").notNull(), // Array of card objects
  totalValue: decimal("total_value", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).default("pending"), // pending, shipped, delivered, cancelled
  trackingNumber: varchar("tracking_number", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// RAFFLE TABLES (Clean Architecture)
// ============================================================================

// Raffles - Clean table without legacy fields
export const raffles = pgTable("raffles", {
  id: varchar("id", { length: 255 }).primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  totalSlots: integer("total_slots").notNull(),
  pricePerSlot: decimal("price_per_slot", { precision: 10, scale: 2 }).notNull(),
  filledSlots: integer("filled_slots").default(0),
  maxWinners: integer("max_winners").default(1),
  status: varchar("status", { length: 20 }).default("active"), // 'active', 'filled', 'completed', 'cancelled'
  isActive: boolean("is_active").default(true),
  autoDraw: boolean("auto_draw").default(true),
  drawnAt: timestamp("drawn_at"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
});

// Raffle Prizes - Separate table for multiple prizes
export const rafflePrizes = pgTable("raffle_prizes", {
  id: serial("id").primaryKey(),
  raffleId: varchar("raffle_id", { length: 255 }).notNull().references(() => raffles.id, { onDelete: "cascade" }),
  position: integer("position").notNull(), // 1st, 2nd, 3rd place, etc.
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'pack', 'card', 'credits', 'physical'
  value: varchar("value", { length: 255 }), // Prize value (can be empty for some types)
  imageUrl: text("image_url"), // Prize image URL
  createdAt: timestamp("created_at").defaultNow(),
});

// Raffle Entries
export const raffleEntries = pgTable("raffle_entries", {
  id: serial("id").primaryKey(),
  raffleId: varchar("raffle_id", { length: 255 }).notNull().references(() => raffles.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id),
  slots: integer("slots").notNull(), // Number of slots purchased
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull(), // Total credits spent
  entryDate: timestamp("entry_date").defaultNow(),
});

// Raffle Winners
export const raffleWinners = pgTable("raffle_winners", {
  id: serial("id").primaryKey(),
  raffleId: varchar("raffle_id", { length: 255 }).notNull().references(() => raffles.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id),
  prizePosition: integer("prize_position").notNull(), // 1st, 2nd, 3rd place, etc.
  prizeId: integer("prize_id").references(() => rafflePrizes.id),
  wonAt: timestamp("won_at").defaultNow(),
});

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  userPacks: many(userPacks),
  userCards: many(userCards),
  globalFeed: many(globalFeed),
  transactions: many(transactions),
  createdRaffles: many(raffles),
  raffleEntries: many(raffleEntries),
  raffleWins: many(raffleWinners),
  addresses: many(userAddresses),
  shippingRequests: many(shippingRequests),
  updatedSettings: many(systemSettings),
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

export const rafflesRelations = relations(raffles, ({ one, many }) => ({
  creator: one(users, {
    fields: [raffles.createdBy],
    references: [users.id],
  }),
  prizes: many(rafflePrizes),
  entries: many(raffleEntries),
  winners: many(raffleWinners),
}));

export const rafflePrizesRelations = relations(rafflePrizes, ({ one, many }) => ({
  raffle: one(raffles, {
    fields: [rafflePrizes.raffleId],
    references: [raffles.id],
  }),
  winners: many(raffleWinners),
}));

export const raffleEntriesRelations = relations(raffleEntries, ({ one }) => ({
  raffle: one(raffles, {
    fields: [raffleEntries.raffleId],
    references: [raffles.id],
  }),
  user: one(users, {
    fields: [raffleEntries.userId],
    references: [users.id],
  }),
}));

export const raffleWinnersRelations = relations(raffleWinners, ({ one }) => ({
  raffle: one(raffles, {
    fields: [raffleWinners.raffleId],
    references: [raffles.id],
  }),
  user: one(users, {
    fields: [raffleWinners.userId],
    references: [users.id],
  }),
  prize: one(rafflePrizes, {
    fields: [raffleWinners.prizeId],
    references: [rafflePrizes.id],
  }),
}));

export const systemSettingsRelations = relations(systemSettings, ({ one }) => ({
  updatedBy: one(users, {
    fields: [systemSettings.updatedBy],
    references: [users.id],
  }),
}));

export const userAddressesRelations = relations(userAddresses, ({ one, many }) => ({
  user: one(users, {
    fields: [userAddresses.userId],
    references: [users.id],
  }),
  shippingRequests: many(shippingRequests),
}));

export const shippingRequestsRelations = relations(shippingRequests, ({ one }) => ({
  user: one(users, {
    fields: [shippingRequests.userId],
    references: [users.id],
  }),
  address: one(userAddresses, {
    fields: [shippingRequests.addressId],
    references: [userAddresses.id],
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

export const insertRaffleSchema = createInsertSchema(raffles).omit({
  createdAt: true,
  drawnAt: true,
});

export const insertRafflePrizeSchema = createInsertSchema(rafflePrizes).omit({
  id: true,
  createdAt: true,
});

export const insertRaffleEntrySchema = createInsertSchema(raffleEntries).omit({
  id: true,
  entryDate: true,
});

export const insertRaffleWinnerSchema = createInsertSchema(raffleWinners).omit({
  id: true,
  wonAt: true,
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserAddressSchema = createInsertSchema(userAddresses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertShippingRequestSchema = createInsertSchema(shippingRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Metrics and Audit schemas
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertBusinessMetricsSchema = createInsertSchema(businessMetrics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserMetricsSchema = createInsertSchema(userMetrics).omit({
  id: true,
  lastUpdated: true,
  createdAt: true,
});

export const insertPackAnalyticsSchema = createInsertSchema(packAnalytics).omit({
  id: true,
  createdAt: true,
});

export const insertGameAnalyticsSchema = createInsertSchema(gameAnalytics).omit({
  id: true,
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

export type Raffle = typeof raffles.$inferSelect;
export type InsertRaffle = z.infer<typeof insertRaffleSchema>;
export type RafflePrize = typeof rafflePrizes.$inferSelect;
export type InsertRafflePrize = z.infer<typeof insertRafflePrizeSchema>;
export type RaffleEntry = typeof raffleEntries.$inferSelect;
export type InsertRaffleEntry = z.infer<typeof insertRaffleEntrySchema>;
export type RaffleWinner = typeof raffleWinners.$inferSelect;
export type InsertRaffleWinner = z.infer<typeof insertRaffleWinnerSchema>;

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type UserAddress = typeof userAddresses.$inferSelect;
export type InsertUserAddress = z.infer<typeof insertUserAddressSchema>;
export type ShippingRequest = typeof shippingRequests.$inferSelect;
export type InsertShippingRequest = z.infer<typeof insertShippingRequestSchema>;

// Metrics and Audit types
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type BusinessMetrics = typeof businessMetrics.$inferSelect;
export type InsertBusinessMetrics = z.infer<typeof insertBusinessMetricsSchema>;
export type UserMetrics = typeof userMetrics.$inferSelect;
export type InsertUserMetrics = z.infer<typeof insertUserMetricsSchema>;
export type PackAnalytics = typeof packAnalytics.$inferSelect;
export type InsertPackAnalytics = z.infer<typeof insertPackAnalyticsSchema>;
export type GameAnalytics = typeof gameAnalytics.$inferSelect;
export type InsertGameAnalytics = z.infer<typeof insertGameAnalyticsSchema>;

// Extended types for API responses
export type ClassicPackWithPrizes = ClassicPack & { prizes: ClassicPrize[] };
export type MysteryPackWithPrizes = MysteryPack & { prizes: MysteryPrize[] };
export type SpecialPackWithPrizes = SpecialPack & { prizes: SpecialPrize[] };

export type RaffleWithDetails = Raffle & {
  prizes: RafflePrize[];
  entries: (RaffleEntry & { user: Pick<User, 'username'> })[];
  winners: (RaffleWinner & { user: Pick<User, 'username'> })[];
  creator: Pick<User, 'username'>;
};

export type RaffleEntryWithDetails = RaffleEntry & {
  user: Pick<User, 'username'>;
  raffle: Pick<Raffle, 'title' | 'imageUrl'>;
};

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