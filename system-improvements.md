# System Optimization Recommendations

## 1. Database Architecture Improvements

### A. Unified Pack System
**Current Issue**: 3 separate pack types (Mystery, Classic, Special) with different logic
**Solution**: Create a unified pack system with a single `packs` table and `pack_cards` table

```sql
-- Unified packs table
CREATE TABLE packs (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'mystery', 'classic', 'special'
  subtype VARCHAR(50), -- 'pokeball', 'greatball', etc. for mystery packs
  price DECIMAL(10,2) NOT NULL,
  odds JSONB, -- Store odds as JSON for each pack type
  prize_pool_id UUID, -- Reference to shared prize pool (for mystery packs)
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Unified pack cards table
CREATE TABLE pack_cards (
  id UUID PRIMARY KEY,
  pack_id UUID REFERENCES packs(id) ON DELETE CASCADE,
  card_id VARCHAR(255) REFERENCES inventory(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### B. Optimized Pack Opening Logic
**Current Issue**: Multiple database queries and complex conditional logic
**Solution**: Single optimized pack opening function

```typescript
async openPack(packId: string, userId: string): Promise<PackOpenResult> {
  return await db.transaction(async (tx) => {
    // Single query to get pack with all necessary data
    const pack = await tx
      .select({
        pack: packs,
        cards: {
          id: packCards.id,
          cardId: packCards.cardId,
          quantity: packCards.quantity,
          card: inventory
        }
      })
      .from(packs)
      .leftJoin(packCards, eq(packs.id, packCards.packId))
      .leftJoin(inventory, eq(packCards.cardId, inventory.id))
      .where(eq(packs.id, packId))
      .for('update');

    // Single optimized card selection logic
    const selectedCards = this.selectCardsOptimized(pack, pack.odds);
    
    // Bulk operations for quantity updates and user card additions
    await this.bulkUpdateQuantities(tx, selectedCards);
    await this.bulkAddUserCards(tx, userId, selectedCards);
    
    return { packCards: selectedCards, hitCardPosition: 7 };
  });
}
```

## 2. Performance Optimizations

### A. Database Indexing
```sql
-- Critical indexes for performance
CREATE INDEX CONCURRENTLY idx_user_cards_user_id_refunded ON user_cards(user_id, is_refunded, is_shipped);
CREATE INDEX CONCURRENTLY idx_pack_cards_pack_id ON pack_cards(pack_id);
CREATE INDEX CONCURRENTLY idx_inventory_tier ON inventory(tier);
CREATE INDEX CONCURRENTLY idx_global_feed_created_at ON global_feed(created_at DESC);
CREATE INDEX CONCURRENTLY idx_user_packs_user_id_opened ON user_packs(user_id, is_opened);
```

### B. Query Optimization
**Current Issue**: N+1 queries in getUserCards
**Solution**: Single JOIN query

```typescript
async getUserCards(userId: string): Promise<UserCardWithCard[]> {
  return await db
    .select({
      userCard: userCards,
      card: inventory
    })
    .from(userCards)
    .innerJoin(inventory, eq(userCards.cardId, inventory.id))
    .where(and(
      eq(userCards.userId, userId),
      eq(userCards.isRefunded, false),
      eq(userCards.isShipped, false)
    ))
    .orderBy(desc(userCards.pulledAt));
}
```

### C. Caching Strategy
```typescript
// Redis cache for frequently accessed data
class CacheService {
  async getPackData(packId: string): Promise<PackData | null> {
    const cached = await redis.get(`pack:${packId}`);
    if (cached) return JSON.parse(cached);
    
    const packData = await this.fetchPackData(packId);
    await redis.setex(`pack:${packId}`, 300, JSON.stringify(packData)); // 5min cache
    return packData;
  }
  
  async getInventoryCards(): Promise<InventoryCard[]> {
    const cached = await redis.get('inventory:all');
    if (cached) return JSON.parse(cached);
    
    const cards = await this.fetchInventoryCards();
    await redis.setex('inventory:all', 600, JSON.stringify(cards)); // 10min cache
    return cards;
  }
}
```

## 3. Frontend Optimizations

### A. Optimistic UI Updates
```typescript
// Immediate UI feedback for pack opening
const openPackMutation = useMutation({
  mutationFn: openPack,
  onMutate: async (packId) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['user-cards']);
    
    // Snapshot previous value
    const previousCards = queryClient.getQueryData(['user-cards']);
    
    // Optimistically update
    queryClient.setQueryData(['user-cards'], (old: any) => ({
      ...old,
      // Add optimistic cards
    }));
    
    return { previousCards };
  },
  onError: (err, packId, context) => {
    // Rollback on error
    queryClient.setQueryData(['user-cards'], context?.previousCards);
  },
  onSettled: () => {
    // Always refetch after error or success
    queryClient.invalidateQueries(['user-cards']);
  },
});
```

### B. Virtual Scrolling for Large Lists
```typescript
// For vault with many cards
import { FixedSizeList as List } from 'react-window';

const VirtualizedVault = ({ cards }: { cards: UserCard[] }) => (
  <List
    height={600}
    itemCount={cards.length}
    itemSize={120}
    itemData={cards}
  >
    {({ index, style, data }) => (
      <div style={style}>
        <CardDisplay card={data[index]} />
      </div>
    )}
  </List>
);
```

## 4. System Architecture Improvements

### A. Event-Driven Architecture
```typescript
// Event system for pack openings
class PackEventService {
  async openPack(packId: string, userId: string) {
    const result = await this.packService.openPack(packId, userId);
    
    // Emit events for different systems
    this.eventBus.emit('pack.opened', {
      userId,
      packId,
      cards: result.packCards,
      timestamp: new Date()
    });
    
    this.eventBus.emit('inventory.updated', {
      cardIds: result.packCards.map(c => c.id),
      quantities: result.packCards.map(c => c.quantity)
    });
    
    return result;
  }
}

// Event handlers
eventBus.on('pack.opened', async (event) => {
  // Update global feed
  await globalFeedService.addEntry(event);
  
  // Update analytics
  await analyticsService.trackPackOpening(event);
  
  // Send notifications
  await notificationService.notifyPackOpening(event);
});
```

### B. Background Job Processing
```typescript
// Queue system for heavy operations
class JobQueue {
  async processRefund(userId: string, cardIds: string[]) {
    // Add to queue instead of processing immediately
    await this.queue.add('process-refund', {
      userId,
      cardIds,
      timestamp: new Date()
    });
  }
  
  async processBulkOperations(operations: BulkOperation[]) {
    // Process in background
    await this.queue.add('bulk-operations', {
      operations,
      batchSize: 100
    });
  }
}
```

## 5. Monitoring and Analytics

### A. Performance Monitoring
```typescript
class PerformanceMonitor {
  async trackPackOpening(packId: string, duration: number) {
    await this.metrics.record('pack.opening.duration', duration, {
      packId,
      timestamp: new Date()
    });
  }
  
  async trackDatabaseQuery(query: string, duration: number) {
    if (duration > 1000) { // Log slow queries
      await this.logger.warn('Slow query detected', {
        query: query.substring(0, 100),
        duration
      });
    }
  }
}
```

### B. Real-time Analytics
```typescript
// WebSocket for real-time updates
class RealtimeService {
  async broadcastPackOpening(userId: string, packResult: PackOpenResult) {
    // Broadcast to all connected clients
    this.io.emit('pack-opened', {
      userId,
      cards: packResult.packCards,
      timestamp: new Date()
    });
  }
  
  async broadcastGlobalFeed(entry: GlobalFeedEntry) {
    this.io.emit('global-feed-update', entry);
  }
}
```

## 6. Security Improvements

### A. Rate Limiting
```typescript
// Rate limiting for pack openings
const packOpeningLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 pack openings per minute per user
  keyGenerator: (req) => req.user.id,
  message: 'Too many pack openings, please slow down'
});

app.post('/api/packs/open/:packId', packOpeningLimiter, openPackHandler);
```

### B. Input Validation
```typescript
// Comprehensive validation schemas
const packOpeningSchema = z.object({
  packId: z.string().uuid(),
  userId: z.string().uuid()
});

const cardSelectionSchema = z.object({
  cardId: z.string().uuid(),
  quantity: z.number().min(1).max(100),
  tier: z.enum(['D', 'C', 'B', 'A', 'S', 'SS', 'SSS'])
});
```

## 7. Testing Strategy

### A. Unit Tests
```typescript
describe('Pack Opening Service', () => {
  it('should select cards based on odds correctly', async () => {
    const mockPack = { odds: { D: 0.8, A: 0.2 } };
    const result = await packService.selectCards(mockPack);
    expect(result).toHaveLength(8);
    expect(result.filter(c => c.tier === 'D')).toHaveLength(7);
    expect(result.filter(c => c.tier === 'A')).toHaveLength(1);
  });
});
```

### B. Integration Tests
```typescript
describe('Pack Opening API', () => {
  it('should open pack and update user vault', async () => {
    const response = await request(app)
      .post('/api/packs/open/test-pack-id')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.packCards).toHaveLength(8);
  });
});
```

## Implementation Priority

1. **High Priority**: Database indexing and query optimization
2. **Medium Priority**: Unified pack system and caching
3. **Low Priority**: Event-driven architecture and advanced monitoring

These improvements will significantly enhance performance, maintainability, and user experience.
