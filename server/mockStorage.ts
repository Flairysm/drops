// Mock storage system for testing without database
export class MockStorage {
  private users: any[] = [];
  private packs: any[] = [];
  private cards: any[] = [];

  constructor() {
    console.log('🔄 Initializing mock storage system');
    this.initializeMockData();
  }

  private initializeMockData() {
    // Initialize with some mock data
    this.users = [
      {
        id: 'mock-user-1',
        username: 'testuser',
        email: 'test@example.com',
        credits: '1000',
        isActive: true,
        role: 'user'
      },
      {
        id: 'mock-admin-1',
        username: 'admin',
        email: 'admin@example.com',
        credits: '10000',
        isActive: true,
        role: 'admin'
      }
    ];

    this.packs = [
      {
        id: 'mock-pack-1',
        name: 'Mystery Pack',
        packType: 'pokeball',
        price: 100,
        isActive: true
      }
    ];

    this.cards = [
      {
        id: 'mock-card-1',
        name: 'Pikachu',
        imageUrl: '/assets/pika.png',
        tier: 'S',
        packId: 'mock-pack-1'
      }
    ];
  }

  // User methods
  async getUser(userId: string): Promise<any | null> {
    console.log('🔄 Mock: Getting user:', userId);
    return this.users.find(u => u.id === userId) || null;
  }

  async getUserByEmail(email: string): Promise<any | null> {
    console.log('🔄 Mock: Getting user by email:', email);
    return this.users.find(u => u.email === email) || null;
  }

  async createUser(userData: any): Promise<any> {
    console.log('🔄 Mock: Creating user:', userData.username);
    const newUser = {
      id: userData.id || `mock-user-${Date.now()}`,
      ...userData
    };
    this.users.push(newUser);
    return newUser;
  }

  async setUserCredits(userId: string, credits: number): Promise<void> {
    console.log('🔄 Mock: Setting user credits:', { userId, credits });
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.credits = credits.toString();
    }
  }

  // Pack methods
  async getAvailablePacks(): Promise<any[]> {
    console.log('🔄 Mock: Getting available packs');
    return this.packs.filter(p => p.isActive);
  }

  async getMysteryPacks(): Promise<any[]> {
    console.log('🔄 Mock: Getting mystery packs');
    return this.packs.filter(p => p.packType && p.isActive);
  }

  async getClassicPacks(): Promise<any[]> {
    console.log('🔄 Mock: Getting classic packs');
    return this.packs.filter(p => p.packType === 'classic' && p.isActive);
  }

  async getSpecialPacks(): Promise<any[]> {
    console.log('🔄 Mock: Getting special packs');
    return this.packs.filter(p => p.packType === 'special' && p.isActive);
  }

  // Card methods
  async getMysteryPackCards(packId: string): Promise<any[]> {
    console.log('🔄 Mock: Getting mystery pack cards for pack:', packId);
    return this.cards.filter(c => c.packId === packId);
  }

  async addCardToMysteryPack(packId: string, cardData: any): Promise<any> {
    console.log('🔄 Mock: Adding card to mystery pack:', { packId, cardData });
    const newCard = {
      id: `mock-card-${Date.now()}`,
      packId,
      ...cardData
    };
    this.cards.push(newCard);
    return newCard;
  }

  async updateMysteryPackCard(packId: string, cardId: string, updates: any): Promise<any> {
    console.log('🔄 Mock: Updating mystery pack card:', { packId, cardId, updates });
    const card = this.cards.find(c => c.id === cardId && c.packId === packId);
    if (card) {
      Object.assign(card, updates);
      return card;
    }
    return null;
  }

  // Pack opening methods
  async openMysteryPack(userId: string, packId: string): Promise<any> {
    console.log('🔄 Mock: Opening mystery pack:', { userId, packId });
    
    // Mock pack opening result
    const mockResult = {
      success: true,
      cards: [
        {
          id: `mock-pull-${Date.now()}`,
          name: 'Mock Card',
          imageUrl: '/assets/pika.png',
          tier: 'C',
          quantity: 1
        }
      ],
      creditsSpent: 100,
      creditsRemaining: 900
    };

    // Update user credits
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.credits = (parseInt(user.credits) - 100).toString();
    }

    return mockResult;
  }

  // Health check
  isDatabaseAvailable(): boolean {
    return true; // Mock system is always available
  }

  // Admin methods
  async getAllUsers(): Promise<any[]> {
    console.log('🔄 Mock: Getting all users');
    return this.users;
  }

  async getAdminStats(): Promise<any> {
    console.log('🔄 Mock: Getting admin stats');
    return {
      totalUsers: this.users.length,
      totalPacks: this.packs.length,
      totalCards: this.cards.length,
      activeUsers: this.users.filter(u => u.isActive).length
    };
  }
}

// Export singleton instance
export const mockStorage = new MockStorage();
