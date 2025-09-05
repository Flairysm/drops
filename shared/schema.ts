import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  integer,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique(),
  email: varchar("email").unique(),
  password: varchar("password"), // Hashed password
  phoneNumber: varchar("phone_number"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 20 }).default("user").notNull(), // user, admin
  credits: decimal("credits", { precision: 10, scale: 2 }).default("0.00"),
  totalSpent: decimal("total_spent", { precision: 10, scale: 2 }).default("0.00"),
  isBanned: boolean("is_banned").default(false),
  isSuspended: boolean("is_suspended").default(false),
  isEmailVerified: boolean("is_email_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email verification tokens table
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email").notNull(),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Card definitions
export const cards = pgTable("cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  tier: varchar("tier", { length: 10 }).notNull(), // D, C, B, A, S, SS, SSS
  packType: varchar("pack_type", { length: 50 }).default("BNW").notNull(), // BNW, XY, etc.
  imageUrl: varchar("image_url"),
  marketValue: decimal("market_value", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Pack definitions
export const packs = pgTable("packs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // BNW, XY, etc.
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Pack odds configuration
export const packOdds = pgTable("pack_odds", {
  id: uuid("id").primaryKey().defaultRandom(),
  packId: uuid("pack_id").references(() => packs.id),
  tier: varchar("tier", { length: 10 }).notNull(),
  probability: decimal("probability", { precision: 5, scale: 4 }).notNull(), // e.g., 0.6500 for 65%
  createdAt: timestamp("created_at").defaultNow(),
});

// Virtual library - separate card inventory for virtual packs only
export const virtualLibrary = pgTable("virtual_library", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  tier: varchar("tier", { length: 10 }).notNull(),
  imageUrl: varchar("image_url"),
  marketValue: decimal("market_value", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  stock: integer("stock").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Virtual themed pack definitions (separate from mystery tier packs)
export const virtualPacks = pgTable("virtual_packs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(), // "Black Bolt", "Destined Rivals"
  description: text("description"),
  imageUrl: varchar("image_url"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  cardCount: integer("card_count").default(10).notNull(), // Number of cards per pack
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Virtual pack card pools - defines which cards can appear in each themed pack
export const virtualPackCards = pgTable("virtual_pack_cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  virtualPackId: uuid("virtual_pack_id").references(() => virtualPacks.id),
  cardId: uuid("card_id").references(() => cards.id),
  weight: integer("weight").default(1).notNull(), // Relative probability weight
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Game settings for configurable prices and options
export const gameSettings = pgTable("game_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameType: varchar("game_type", { length: 50 }).notNull().unique(), // 'plinko', 'wheel', 'pack'
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id),
});

// System settings for administrative controls
export const systemSettings = pgTable("system_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  settingKey: varchar("setting_key", { length: 100 }).notNull().unique(), // 'maintenance_mode', 'new_registrations', etc
  settingValue: boolean("setting_value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id),
});

// Pull rate configuration for pack tiers
export const pullRates = pgTable("pull_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  packType: varchar("pack_type", { length: 50 }).notNull(), // 'pokeball', 'greatball', 'ultraball', 'masterball'
  cardTier: varchar("card_tier", { length: 20 }).notNull(), // 'common', 'uncommon', 'rare', 'superrare', 'legendary'
  probability: integer("probability").notNull(), // percentage 0-100 (e.g., 60 for 60%)
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id),
});

// Virtual pack pull rates (tier-based odds for themed packs)
export const virtualPackPullRates = pgTable("virtual_pack_pull_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  virtualPackId: uuid("virtual_pack_id").references(() => virtualPacks.id),
  cardTier: varchar("card_tier", { length: 20 }).notNull(), // 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'
  probability: integer("probability").notNull(), // percentage 0-100 (e.g., 60 for 60%)
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id),
});

// User card vault
export const userCards = pgTable("user_cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id),
  cardId: uuid("card_id").references(() => cards.id),
  pullValue: decimal("pull_value", { precision: 10, scale: 2 }).notNull(), // Locked market value at pull time
  quantity: integer("quantity").default(1).notNull(), // Number of copies of this card
  pulledAt: timestamp("pulled_at").defaultNow(),
  isRefunded: boolean("is_refunded").default(false),
  isShipped: boolean("is_shipped").default(false),
});

// User packs earned from games (unopened)
export const userPacks = pgTable("user_packs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id),
  packId: uuid("pack_id").references(() => packs.id),
  tier: varchar("tier", { length: 10 }).notNull(), // The tier earned from Plinko
  earnedFrom: varchar("earned_from", { length: 50 }).notNull(), // plinko, wheel, etc.
  isOpened: boolean("is_opened").default(false),
  earnedAt: timestamp("earned_at").defaultNow(),
  openedAt: timestamp("opened_at"),
});

// Global feed entries
export const globalFeed = pgTable("global_feed", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id),
  cardId: uuid("card_id").references(() => cards.id),
  tier: varchar("tier", { length: 10 }).notNull(),
  gameType: varchar("game_type", { length: 50 }).notNull(), // plinko, wheel, pack
  createdAt: timestamp("created_at").defaultNow(),
});

// Transaction history
export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(), // purchase, refund, game_play, etc.
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("completed"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Gameplay sessions (for crash recovery)
export const gameSessions = pgTable("game_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id),
  gameType: varchar("game_type", { length: 50 }).notNull(),
  gameData: jsonb("game_data"), // Store game state
  result: jsonb("result"), // Store final result when completed
  status: varchar("status", { length: 20 }).default("in_progress"), // in_progress, completed, failed
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Shipping requests
export const shippingRequests = pgTable("shipping_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id),
  cardIds: jsonb("card_ids").notNull(), // Array of user_card IDs
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).notNull(),
  region: varchar("region", { length: 20 }).notNull(), // west, east
  address: text("address").notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  trackingNumber: varchar("tracking_number"),
  createdAt: timestamp("created_at").defaultNow(),
  shippedAt: timestamp("shipped_at"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  userCards: many(userCards),
  userPacks: many(userPacks),
  transactions: many(transactions),
  gameSessions: many(gameSessions),
  notifications: many(notifications),
  globalFeedEntries: many(globalFeed),
  shippingRequests: many(shippingRequests),
}));

export const cardsRelations = relations(cards, ({ many }) => ({
  userCards: many(userCards),
  globalFeedEntries: many(globalFeed),
}));

export const packsRelations = relations(packs, ({ many }) => ({
  packOdds: many(packOdds),
  userPacks: many(userPacks),
}));

export const userCardsRelations = relations(userCards, ({ one }) => ({
  user: one(users, {
    fields: [userCards.userId],
    references: [users.id],
  }),
  card: one(cards, {
    fields: [userCards.cardId],
    references: [cards.id],
  }),
}));

export const globalFeedRelations = relations(globalFeed, ({ one }) => ({
  user: one(users, {
    fields: [globalFeed.userId],
    references: [users.id],
  }),
  card: one(cards, {
    fields: [globalFeed.cardId],
    references: [cards.id],
  }),
}));

export const userPacksRelations = relations(userPacks, ({ one }) => ({
  user: one(users, {
    fields: [userPacks.userId],
    references: [users.id],
  }),
  pack: one(packs, {
    fields: [userPacks.packId],
    references: [packs.id],
  }),
}));

export const packOddsRelations = relations(packOdds, ({ one }) => ({
  pack: one(packs, {
    fields: [packOdds.packId],
    references: [packs.id],
  }),
}));

export const virtualLibraryRelations = relations(virtualLibrary, ({ many }) => ({
  virtualPackCards: many(virtualPackCards),
}));

export const virtualPacksRelations = relations(virtualPacks, ({ many }) => ({
  virtualPackCards: many(virtualPackCards),
  virtualPackPullRates: many(virtualPackPullRates),
}));

export const virtualPackCardsRelations = relations(virtualPackCards, ({ one }) => ({
  virtualPack: one(virtualPacks, {
    fields: [virtualPackCards.virtualPackId],
    references: [virtualPacks.id],
  }),
  card: one(cards, {
    fields: [virtualPackCards.cardId],
    references: [cards.id],
  }),
}));

export const virtualPackPullRatesRelations = relations(virtualPackPullRates, ({ one }) => ({
  virtualPack: one(virtualPacks, {
    fields: [virtualPackPullRates.virtualPackId],
    references: [virtualPacks.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Registration schema with validation
export const registrationSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username must be at most 20 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phoneNumber: z.string().min(1, "Phone number is required"),
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

// Email verification schemas
export const emailVerificationSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const verifyEmailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  token: z.string().min(1, "Verification token is required"),
});

export const insertCardSchema = createInsertSchema(cards).omit({
  id: true,
  createdAt: true,
}).partial({
  packType: true,  // Make packType optional since it has a default value
});

export const insertPackSchema = createInsertSchema(packs).omit({
  id: true,
  createdAt: true,
});

export const insertUserCardSchema = createInsertSchema(userCards).omit({
  id: true,
  pulledAt: true,
});

export const insertUserPackSchema = createInsertSchema(userPacks).omit({
  id: true,
  earnedAt: true,
  openedAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertGameSessionSchema = createInsertSchema(gameSessions).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertShippingRequestSchema = createInsertSchema(shippingRequests).omit({
  id: true,
  createdAt: true,
});

export const insertGameSettingSchema = createInsertSchema(gameSettings).omit({
  id: true,
});

export const insertPullRateSchema = createInsertSchema(pullRates).omit({
  id: true,
  updatedAt: true,
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertVirtualPackSchema = createInsertSchema(virtualPacks).omit({
  id: true,
  createdAt: true,
});

export const insertVirtualPackCardSchema = createInsertSchema(virtualPackCards).omit({
  id: true,
  createdAt: true,
});

export const insertVirtualPackPullRateSchema = createInsertSchema(virtualPackPullRates).omit({
  id: true,
  updatedAt: true,
});

export const insertVirtualLibrarySchema = createInsertSchema(virtualLibrary).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type Pack = typeof packs.$inferSelect;
export type PackOdds = typeof packOdds.$inferSelect;
export type VirtualPack = typeof virtualPacks.$inferSelect;
export type VirtualPackCard = typeof virtualPackCards.$inferSelect;
export type VirtualPackPullRate = typeof virtualPackPullRates.$inferSelect;
export type VirtualLibraryCard = typeof virtualLibrary.$inferSelect;
export type UserCard = typeof userCards.$inferSelect;
export type UserPack = typeof userPacks.$inferSelect;
export type GlobalFeed = typeof globalFeed.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type GameSession = typeof gameSessions.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type ShippingRequest = typeof shippingRequests.$inferSelect;
export type PullRate = typeof pullRates.$inferSelect;

export type InsertCard = z.infer<typeof insertCardSchema>;
export type InsertPack = z.infer<typeof insertPackSchema>;
export type InsertVirtualPack = z.infer<typeof insertVirtualPackSchema>;
export type InsertVirtualPackCard = z.infer<typeof insertVirtualPackCardSchema>;
export type InsertVirtualPackPullRate = z.infer<typeof insertVirtualPackPullRateSchema>;
export type InsertVirtualLibraryCard = z.infer<typeof insertVirtualLibrarySchema>;
export type InsertUserCard = z.infer<typeof insertUserCardSchema>;
export type InsertUserPack = z.infer<typeof insertUserPackSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertGameSession = z.infer<typeof insertGameSessionSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertShippingRequest = z.infer<typeof insertShippingRequestSchema>;

// Game settings types
export type GameSetting = typeof gameSettings.$inferSelect;
export type InsertGameSetting = typeof gameSettings.$inferInsert;

// System settings types
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;

// Extended types for API responses
export type UserCardWithCard = UserCard & { card: Card };
export type GlobalFeedWithDetails = GlobalFeed & { user: Pick<User, 'username'>, card: Card };
export type GameResult = {
  cardId: string;
  tier: string;
  gameType: string;
};

export type VirtualPackOpenResult = {
  cards: UserCardWithCard[];
  packName: string;
};
