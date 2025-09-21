import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Package, 
  Settings, 
  TrendingUp, 
  Edit,
  Ban,
  Coins,
  History,
  Plus,
  X,
  Eye
} from "lucide-react";

export default function Admin() {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [creditAmount, setCreditAmount] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [manageSection, setManageSection] = useState<"classic" | "special" | "mystery">("classic");
  const [mysterySection, setMysterySection] = useState<"view" | "edit" | "add">("view");
  const [mysterySearchQuery, setMysterySearchQuery] = useState("");
  const [mysteryPackCards, setMysteryPackCards] = useState<Array<{
    id: string;
    name: string;
    imageUrl: string;
    credits: number;
    quantity: number;
  }>>([]);
  const [editingQuantity, setEditingQuantity] = useState<{ [key: string]: number }>({});
  const [specialPools, setSpecialPools] = useState<Array<{
    id: string;
    name: string;
    description: string;
    image?: string;
    imageUrl?: string;
    price: number | string;
    totalCards?: number;
    totalPacks?: number;
    cards?: Array<{
      id: string;
      name: string;
      imageUrl: string;
      credits: number;
      quantity: number;
    }>;
  }>>([]);
  const [showAddPoolDialog, setShowAddPoolDialog] = useState(false);
  const [showEditPoolDialog, setShowEditPoolDialog] = useState(false);
  const [editingPool, setEditingPool] = useState<{
    id: string;
    name: string;
    description: string;
    image: string;
    price: number;
    totalCards: number;
  } | null>(null);
  const [newPool, setNewPool] = useState({ 
    name: '', 
    description: '', 
    image: '', 
    price: '', 
    totalCards: '' 
  });
  const [inventoryCards, setInventoryCards] = useState<Array<{
    id: string;
    name: string;
    imageUrl: string;
    credits: number;
  }>>([]);
  const [showAddCardForm, setShowAddCardForm] = useState(false);
  const [editingCard, setEditingCard] = useState<{ id: string; name: string; imageUrl: string; credits: number; } | null>(null);
  const [editForm, setEditForm] = useState({ name: '', imageUrl: '', credits: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [newCard, setNewCard] = useState({
    name: '',
    imageUrl: '',
    credits: ''
  });
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);


  // Mock user data - replace with real data later
  const mockUsers = [
    { id: 1, email: "user1@example.com", credits: 150, totalSpent: 25.50, isBanned: false, joinDate: "2024-01-15" },
    { id: 2, email: "user2@example.com", credits: 75, totalSpent: 45.00, isBanned: false, joinDate: "2024-02-20" },
    { id: 3, email: "user3@example.com", credits: 0, totalSpent: 12.75, isBanned: true, joinDate: "2024-01-30" },
    { id: 4, email: "user4@example.com", credits: 200, totalSpent: 67.25, isBanned: false, joinDate: "2024-03-10" },
  ];

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setCreditAmount(user.credits);
    setShowUserDialog(true);
  };

  const handleBanUser = () => {
    if (selectedUser) {
      // Ban user logic here
      setShowUserDialog(false);
    }
  };

  const handleUpdateCredits = () => {
    if (selectedUser) {
      // Update credits logic here
      setShowUserDialog(false);
    }
  };

  const handleViewTransactions = () => {
    setShowTransactionDialog(true);
  };

  const handleNewCardChange = (field: string, value: string) => {
    setNewCard(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Fetch inventory cards from API
  const fetchInventoryCards = async () => {
    try {
      setIsLoadingInventory(true);
      const response = await fetch('http://localhost:3000/api/admin/inventory');
      
      if (response.ok) {
        const cards = await response.json();
        setInventoryCards(cards);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch inventory cards:', errorText);
      }
    } catch (error: any) {
      console.error('Error fetching inventory cards:', error);
    } finally {
      setIsLoadingInventory(false);
    }
  };

  // Load inventory when switching to inventory tab
  useEffect(() => {
    if (activeTab === 'inventory') {
      fetchInventoryCards();
    }
  }, [activeTab]);

  // Load special packs when manage tab is active
  useEffect(() => {
    if (activeTab === 'manage') {
      fetchSpecialPacks();
    }
  }, [activeTab]);

  // Load inventory when switching to mystery add section
  useEffect(() => {
    if (activeTab === 'manage' && manageSection === 'mystery' && mysterySection === 'add') {
      fetchInventoryCards();
    }
  }, [activeTab, manageSection, mysterySection]);

  const handleAddCard = async () => {
    if (newCard.name.trim() && newCard.imageUrl.trim() && newCard.credits.trim()) {
      const credits = parseInt(newCard.credits);
      
      // Validate credits is a positive number
      if (isNaN(credits) || credits <= 0) {
        alert('Please enter a valid credit amount (positive number)');
        return;
      }

      try {
        const cardData = {
          id: `${newCard.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
          name: newCard.name.trim(),
          imageUrl: newCard.imageUrl.trim(),
          credits: credits
        };


        const response = await fetch('http://localhost:3000/api/admin/inventory', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(cardData),
        });


        if (response.ok) {
          const result = await response.json();
          
          // Refresh inventory
          await fetchInventoryCards();
          
          // Reset form and close dialog
          setNewCard({ name: '', imageUrl: '', credits: '' });
          setShowAddCardForm(false);
          
          // Show success message
          alert('Card added successfully!');
        } else {
          const errorText = await response.text();
          console.error('API Error:', errorText);
          alert(`Failed to add card: ${errorText}`);
        }
      } catch (error: any) {
        console.error('Error adding card:', error);
        alert(`Failed to add card: ${error.message}`);
      }
    } else {
      alert('Please fill in all fields');
    }
  };

  const handleRemoveCard = async (cardId: string, cardName: string) => {
    if (confirm(`Are you sure you want to remove ${cardName}?`)) {
      try {
        const response = await fetch(`http://localhost:3000/api/admin/inventory/${cardId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          // Refresh inventory
          await fetchInventoryCards();
          alert('Card removed successfully!');
    } else {
          alert('Failed to remove card. Please try again.');
        }
        } catch (error: any) {
        console.error('Error removing card:', error);
        alert('Failed to remove card. Please try again.');
        }
      }
  };

  const handleEditCard = (card: { id: string; name: string; imageUrl: string; credits: number; }) => {
    setEditingCard(card);
    setEditForm({
      name: card.name,
      imageUrl: card.imageUrl,
      credits: card.credits.toString()
    });
  };

  const handleUpdateCard = async () => {
    if (!editingCard) return;

    if (editForm.name.trim() && editForm.imageUrl.trim() && editForm.credits.trim()) {
      const credits = parseInt(editForm.credits);
      
      // Validate credits is a positive number
      if (isNaN(credits) || credits <= 0) {
        alert('Please enter a valid credit amount (positive number)');
        return;
      }

      try {
        const cardData = {
          name: editForm.name.trim(),
          imageUrl: editForm.imageUrl.trim(),
          credits: credits
        };


        const response = await fetch(`http://localhost:3000/api/admin/inventory/${editingCard.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(cardData),
        });


        if (response.ok) {
          const result = await response.json();
          
          // Refresh inventory
          await fetchInventoryCards();
          
          // Reset form and close edit mode
          setEditingCard(null);
          setEditForm({ name: '', imageUrl: '', credits: '' });
          
          // Show success message
          alert('Card updated successfully!');
        } else {
          const errorText = await response.text();
          console.error('API Error:', errorText);
          alert(`Failed to update card: ${errorText}`);
        }
      } catch (error: any) {
        console.error('Error updating card:', error);
        alert(`Failed to update card: ${error.message}`);
      }
    } else {
      alert('Please fill in all fields');
    }
  };

  const handleCancelEdit = () => {
    setEditingCard(null);
    setEditForm({ name: '', imageUrl: '', credits: '' });
  };

  // Filter cards based on search query
  const filteredCards = inventoryCards.filter(card => 
    card.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter cards for mystery pack search
  const mysteryFilteredCards = inventoryCards.filter(card => 
    card.name.toLowerCase().includes(mysterySearchQuery.toLowerCase()) ||
    card.id.toLowerCase().includes(mysterySearchQuery.toLowerCase())
  );

  // Debug logging

  // Add card to mystery pack
  const handleAddToMysteryPack = (card: { id: string; name: string; imageUrl: string; credits: number; }) => {
    // Check if card is already in mystery pack
    const existingCard = mysteryPackCards.find(mysteryCard => mysteryCard.id === card.id);
    
    if (existingCard) {
      // If card exists, increase quantity
      setMysteryPackCards(prev => prev.map(mysteryCard => 
        mysteryCard.id === card.id 
          ? { ...mysteryCard, quantity: mysteryCard.quantity + 1 }
          : mysteryCard
      ));
      alert(`${card.name} quantity increased!`);
    } else {
      // Add new card to mystery pack with quantity 1
      setMysteryPackCards(prev => [...prev, { ...card, quantity: 1 }]);
      alert(`${card.name} added to mystery pack!`);
    }
  };

  // Handle quantity editing
  const handleQuantityChange = (cardId: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    setEditingQuantity(prev => ({
      ...prev,
      [cardId]: newQuantity
    }));
  };

  // Save quantity changes
  const handleSaveQuantity = (cardId: string) => {
    const newQuantity = editingQuantity[cardId];
    if (newQuantity === undefined || newQuantity < 0) return;

    if (newQuantity === 0) {
      // Remove card if quantity is 0
      setMysteryPackCards(prev => prev.filter(card => card.id !== cardId));
      alert('Card removed from mystery pack!');
    } else {
      // Update quantity
      setMysteryPackCards(prev => prev.map(card => 
        card.id === cardId 
          ? { ...card, quantity: newQuantity }
          : card
      ));
      alert('Quantity updated!');
    }

    // Clear editing state
    setEditingQuantity(prev => {
      const newState = { ...prev };
      delete newState[cardId];
      return newState;
    });
  };

  // Cancel quantity editing
  const handleCancelQuantity = (cardId: string) => {
    setEditingQuantity(prev => {
      const newState = { ...prev };
      delete newState[cardId];
      return newState;
    });
  };

  // Special Pool Management
  const handleAddPool = async () => {
    if (newPool.name.trim() && newPool.description.trim() && newPool.image.trim() && newPool.price.trim() && newPool.totalCards.trim()) {
      try {
        const response = await fetch('http://localhost:3000/api/admin/special-packs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: newPool.name.trim(),
            description: newPool.description.trim(),
            image: newPool.image.trim(),
            price: parseFloat(newPool.price),
            totalCards: parseInt(newPool.totalCards)
          }),
        });

        if (response.ok) {
          const newPack = await response.json();
          setSpecialPools(prev => [...prev, { ...newPack, cards: [] }]);
          setNewPool({ name: '', description: '', image: '', price: '', totalCards: '' });
          setShowAddPoolDialog(false);
          alert('Special pack created successfully!');
        } else {
          const error = await response.json();
          alert(`Failed to create special pack: ${error.error}`);
        }
      } catch (error: any) {
        console.error('Error creating special pack:', error);
        alert('Failed to create special pack. Please try again.');
      }
    } else {
      alert('Please fill in all fields');
    }
  };

  const handleRemovePool = async (poolId: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/admin/special-packs/${poolId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSpecialPools(prev => prev.filter(pool => pool.id !== poolId));
        alert('Special pack removed successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to remove special pack: ${error.error}`);
      }
    } catch (error: any) {
      console.error('Error removing special pack:', error);
      alert('Failed to remove special pack. Please try again.');
    }
  };

  const handleEditPool = (pool: any) => {
    setEditingPool({
      id: pool.id,
      name: pool.name,
      description: pool.description,
      image: pool.imageUrl || pool.image,
      price: pool.price,
      totalCards: pool.totalCards
    });
    setShowEditPoolDialog(true);
  };

  const handleUpdatePool = async () => {
    if (editingPool && editingPool.name.trim() && editingPool.description.trim() && editingPool.image.trim()) {
      try {
        const response = await fetch(`http://localhost:3000/api/admin/special-packs/${editingPool.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: editingPool.name.trim(),
            description: editingPool.description.trim(),
            image: editingPool.image.trim(),
            price: editingPool.price,
            totalCards: editingPool.totalCards
          }),
        });

        if (response.ok) {
          const updatedPack = await response.json();
          setSpecialPools(prev => prev.map(pool => 
            pool.id === editingPool.id 
              ? { ...pool, ...updatedPack }
              : pool
          ));
          setShowEditPoolDialog(false);
          setEditingPool(null);
          alert('Special pack updated successfully!');
        } else {
          const error = await response.json();
          alert(`Failed to update special pack: ${error.error}`);
        }
      } catch (error: any) {
        console.error('Error updating special pack:', error);
        alert('Failed to update special pack. Please try again.');
      }
    } else {
      alert('Please fill in all required fields');
    }
  };

  const handleCancelEditPool = () => {
    setShowEditPoolDialog(false);
    setEditingPool(null);
  };

  // Fetch special packs from API
  const fetchSpecialPacks = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/admin/special-packs');
      if (response.ok) {
        const packs = await response.json();
        setSpecialPools(packs);
      } else {
        console.error('Failed to fetch special packs');
      }
    } catch (error: any) {
      console.error('Error fetching special packs:', error);
    }
  };

  const handleAddCardToPool = (poolId: string, card: { id: string; name: string; imageUrl: string; credits: number; }) => {
    setSpecialPools(prev => prev.map(pool => {
      if (pool.id === poolId) {
        const existingCard = pool.cards?.find(c => c.id === card.id);
        if (existingCard) {
          return {
            ...pool,
            cards: (pool.cards || []).map(c => 
              c.id === card.id 
                ? { ...c, quantity: c.quantity + 1 }
                : c
            )
          };
        } else {
          return {
            ...pool,
            cards: [...(pool.cards || []), { ...card, quantity: 1 }]
          };
        }
      }
      return pool;
    }));
    alert(`${card.name} added to pool!`);
  };

  const handleRemoveCardFromPool = (poolId: string, cardId: string) => {
    setSpecialPools(prev => prev.map(pool => {
      if (pool.id === poolId) {
        return {
          ...pool,
          cards: (pool.cards || []).filter(card => card.id !== cardId)
        };
      }
      return pool;
    }));
    alert('Card removed from pool!');
  };


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Admin Access Required</h1>
          <p className="text-muted-foreground">Please log in to access the admin panel.</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access the admin panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold font-gaming mb-8 text-center">Admin Dashboard</h1>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-5xl mx-auto grid-cols-5 mb-8">
              <TabsTrigger value="overview" data-testid="tab-overview">
                <TrendingUp className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="user" data-testid="tab-user">
                <Users className="w-4 h-4 mr-2" />
                User
              </TabsTrigger>
              <TabsTrigger value="manage" data-testid="tab-manage">
                <Package className="w-4 h-4 mr-2" />
                Manage
              </TabsTrigger>
              <TabsTrigger value="inventory" data-testid="tab-inventory">
                <Package className="w-4 h-4 mr-2" />
                Inventory
              </TabsTrigger>
              <TabsTrigger value="settings" data-testid="tab-settings">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <Card className="gaming-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">0</div>
                  </CardContent>
                </Card>

                <Card className="gaming-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">RM 0.00</div>
                  </CardContent>
                </Card>

                <Card className="gaming-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Top Spender</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">RM 0.00</div>
                    <p className="text-xs text-muted-foreground">user@example.com</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <Card className="gaming-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Recent SS Card</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">Card Name</div>
                    <p className="text-xs text-muted-foreground">Pulled by user@example.com</p>
                  </CardContent>
                </Card>

                <Card className="gaming-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Recent SSS Card</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">Card Name</div>
                    <p className="text-xs text-muted-foreground">Pulled by user@example.com</p>
                  </CardContent>
                </Card>

                <Card className="gaming-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Daily P&L</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">+RM 0.00</div>
                    <p className="text-xs text-muted-foreground">Today</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="gaming-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Monthly P&L</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">+RM 0.00</div>
                    <p className="text-xs text-muted-foreground">This Month</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* User Tab */}
            <TabsContent value="user">
              <Card className="gaming-card">
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                    {mockUsers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                              <Users className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-semibold">{user.email}</div>
                              <div className="text-sm text-muted-foreground">
                                Credits: {user.credits} • Spent: RM {user.totalSpent}
                              </div>
                            <div className="text-xs text-muted-foreground">
                              Joined: {user.joinDate}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {user.isBanned && (
                              <Badge variant="destructive">Banned</Badge>
                            )}
                            
                            <Button
                              variant="outline"
                              size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                            </Button>
                          </div>
                        </div>
                    ))}
                    </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Manage Tab */}
            <TabsContent value="manage">
              <div className="space-y-6">
                {/* Section Selector */}
                <div className="flex gap-4 mb-6">
                  <Button
                    variant={manageSection === "classic" ? "default" : "outline"}
                    onClick={() => setManageSection("classic")}
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Classic
                  </Button>
                  <Button
                    variant={manageSection === "special" ? "default" : "outline"}
                    onClick={() => setManageSection("special")}
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Special
                  </Button>
                  <Button
                    variant={manageSection === "mystery" ? "default" : "outline"}
                    onClick={() => setManageSection("mystery")}
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Mystery
                  </Button>
                </div>

                {/* Classic Pack Section */}
                {manageSection === "classic" && (
                      <Card className="gaming-card">
                        <CardHeader>
                      <CardTitle>Classic Pack Management</CardTitle>
                        </CardHeader>
                        <CardContent>
                      <div className="text-center py-8">
                        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">Classic Pack</h3>
                        <p className="text-muted-foreground">
                          Manage classic card packs and their contents
                        </p>
                            </div>
                        </CardContent>
                      </Card>
                )}

                {/* Special Pack Section */}
                {manageSection === "special" && (
                  <div className="space-y-6">
                    {/* Special Packs Display */}
                    <Card className="gaming-card">
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle>Special Packs</CardTitle>
                          <Button onClick={() => setShowAddPoolDialog(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Content
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {specialPools.length === 0 ? (
                          <div className="text-center py-8">
                            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">No special packs created</h3>
                            <p className="text-muted-foreground">
                              Click "Add Content" to create your first special pack
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {specialPools.map((pool) => (
                              <div key={pool.id} className="border rounded-lg p-4">
                                <div className="space-y-4">
                                  {/* Pack Header */}
                                  <div className="flex gap-4">
                                    <img
                                      src={pool.imageUrl || pool.image}
                                      alt={pool.name}
                                      className="w-20 h-20 object-cover rounded flex-shrink-0"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/assets/random-common-card.png';
                                      }}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium text-lg mb-1">{pool.name}</h4>
                                      <p className="text-sm text-muted-foreground mb-2">{pool.description}</p>
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
                                        <div>Price: ${pool.price}</div>
                                        <div>Total Cards: {pool.totalPacks || pool.totalCards || 0}</div>
                                        <div>Cards Added: {pool.cards?.length || 0}</div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Action Buttons */}
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <Button
                                      onClick={() => {
                                        // TODO: View prize functionality
                                        alert('View prize functionality coming soon');
                                      }}
                                      variant="outline"
                                      size="sm"
                                      className="w-full"
                                    >
                                      <Eye className="w-4 h-4 mr-2" />
                                      View Prize
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        // TODO: Edit prize functionality
                                        alert('Edit prize functionality coming soon');
                                      }}
                                      variant="outline"
                                      size="sm"
                                      className="w-full"
                                    >
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit Prize
                                    </Button>
                                    <Button
                                      onClick={() => handleEditPool(pool)}
                                      variant="outline"
                                      size="sm"
                                      className="w-full"
                                    >
                                      <Package className="w-4 h-4 mr-2" />
                                      Edit Content
                                    </Button>
                                    <Button
                                      onClick={() => handleRemovePool(pool.id)}
                                      variant="outline"
                                      size="sm"
                                      className="w-full"
                                    >
                                      <X className="w-4 h-4 mr-2" />
                                      Remove
                                    </Button>
                                  </div>
                                </div>
                                
                                {(pool.cards?.length || 0) > 0 && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {(pool.cards || []).map((card) => (
                                      <div key={card.id} className="flex items-center gap-3 p-3 border rounded">
                                        <img
                                          src={card.imageUrl}
                                          alt={card.name}
                                          className="w-12 h-12 object-cover rounded"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).src = '/assets/random-common-card.png';
                                          }}
                                        />
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium text-sm truncate">{card.name}</p>
                                          <p className="text-xs text-muted-foreground">
                                            Credits: {card.credits} | Qty: {card.quantity}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Mystery Pack Section */}
                {manageSection === "mystery" && (
                  <div className="space-y-6">
                    {/* Mystery Pack Sub-navigation */}
                    <div className="flex gap-2">
                      <Button
                        variant={mysterySection === "view" ? "default" : "outline"}
                        onClick={() => setMysterySection("view")}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button
                        variant={mysterySection === "edit" ? "default" : "outline"}
                        onClick={() => setMysterySection("edit")}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant={mysterySection === "add" ? "default" : "outline"}
                        onClick={() => setMysterySection("add")}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add
                      </Button>
                    </div>

                    {/* View Tab */}
                    {mysterySection === "view" && (
                      <Card className="gaming-card">
                        <CardHeader>
                          <CardTitle>View Mystery Pack</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {mysteryPackCards.length === 0 ? (
                            <div className="text-center py-8">
                              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                              <h3 className="text-lg font-medium mb-2">No cards in mystery pack</h3>
                              <p className="text-muted-foreground">
                                Add cards from inventory to build your mystery pack
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex justify-between items-center mb-4">
                                <p className="text-sm text-muted-foreground">
                                  {mysteryPackCards.length} card(s) in mystery pack
                                </p>
                              </div>
                              {mysteryPackCards.map((card) => (
                                <div key={card.id} className="flex items-center gap-4 p-4 border rounded-lg">
                                  <img
                                    src={card.imageUrl}
                                    alt={card.name}
                                    className="w-16 h-16 object-cover rounded"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = '/assets/random-common-card.png';
                                    }}
                                  />
                                  <div className="flex-1">
                                    <h4 className="font-medium">{card.name}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      Credits: {card.credits} | Quantity: {card.quantity}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Edit Tab */}
                    {mysterySection === "edit" && (
                      <Card className="gaming-card">
                        <CardHeader>
                          <CardTitle>Edit Mystery Pack</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {mysteryPackCards.length === 0 ? (
                            <div className="text-center py-8">
                              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                              <h3 className="text-lg font-medium mb-2">No cards in mystery pack</h3>
                              <p className="text-muted-foreground">
                                Add cards from inventory to build your mystery pack
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex justify-between items-center mb-4">
                                <p className="text-sm text-muted-foreground">
                                  {mysteryPackCards.length} card(s) in mystery pack
                                </p>
                              </div>
                              {mysteryPackCards.map((card) => (
                                <div key={card.id} className="flex items-center gap-4 p-4 border rounded-lg">
                                  <img
                                    src={card.imageUrl}
                                    alt={card.name}
                                    className="w-16 h-16 object-cover rounded"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = '/assets/random-common-card.png';
                                    }}
                                  />
                                  <div className="flex-1">
                                    <h4 className="font-medium">{card.name}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      Credits: {card.credits}
                                    </p>
                                    {editingQuantity[card.id] !== undefined ? (
                                      <div className="flex items-center gap-2 mt-2">
                                        <Input
                                          type="number"
                                          min="0"
                                          value={editingQuantity[card.id]}
                                          onChange={(e) => handleQuantityChange(card.id, parseInt(e.target.value) || 0)}
                                          className="w-20 h-8"
                                        />
                                        <Button
                                          onClick={() => handleSaveQuantity(card.id)}
                                          size="sm"
                                          className="h-8"
                                        >
                                          Save
                                        </Button>
                                        <Button
                                          onClick={() => handleCancelQuantity(card.id)}
                                          variant="outline"
                                          size="sm"
                                          className="h-8"
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 mt-2">
                                        <span className="text-sm text-muted-foreground">
                                          Quantity: {card.quantity}
                                        </span>
                                        <Button
                                          onClick={() => setEditingQuantity(prev => ({ ...prev, [card.id]: card.quantity }))}
                                          variant="outline"
                                          size="sm"
                                          className="h-8"
                                        >
                                          <Edit className="w-3 h-3 mr-1" />
                                          Edit
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    onClick={() => {
                                      setMysteryPackCards(prev => prev.filter(c => c.id !== card.id));
                                      alert(`${card.name} removed from mystery pack!`);
                                    }}
                                    variant="outline"
                                    size="sm"
                                  >
                                    <X className="w-4 h-4 mr-2" />
                                    Remove
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Add Tab */}
                    {mysterySection === "add" && (
                      <Card className="gaming-card">
                        <CardHeader>
                          <CardTitle>Add Cards to Mystery Pack</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {/* Search Bar */}
                          <div className="mb-6">
                            <Input
                              type="text"
                              placeholder="Search cards from inventory..."
                              value={mysterySearchQuery}
                              onChange={(e) => setMysterySearchQuery(e.target.value)}
                              className="w-full"
                            />
                            {mysterySearchQuery && (
                              <p className="text-sm text-muted-foreground mt-2">
                                Showing {mysteryFilteredCards.length} of {inventoryCards.length} cards
                              </p>
                            )}
                          </div>

                          {/* Cards List */}
                          <div className="space-y-3">
                            {mysteryFilteredCards.length === 0 ? (
                              <div className="text-center py-8">
                                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-medium mb-2">
                                  {mysterySearchQuery ? "No cards found" : "No cards in inventory"}
                                </h3>
                                <p className="text-muted-foreground">
                                  {mysterySearchQuery 
                                    ? "Try adjusting your search terms"
                                    : "Add some cards to inventory first"
                                  }
                                </p>
                              </div>
                            ) : (
                              mysteryFilteredCards.map((card) => (
                                <div key={card.id} className="flex items-center gap-4 p-4 border rounded-lg">
                                  <img
                                    src={card.imageUrl}
                                    alt={card.name}
                                    className="w-16 h-16 object-cover rounded"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = '/assets/random-common-card.png';
                                    }}
                                  />
                                  <div className="flex-1">
                                    <h4 className="font-medium">{card.name}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      Credits: {card.credits}
                                    </p>
                                  </div>
                                  <Button
                                    onClick={() => handleAddToMysteryPack(card)}
                                    size="sm"
                                  >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add
                                  </Button>
                                </div>
                              ))
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
                              </div>
            </TabsContent>

            {/* Inventory Tab */}
            <TabsContent value="inventory">
                      <Card className="gaming-card">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Card Inventory
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                  <div className="space-y-3">
                    {/* Search Bar */}
                    <div className="mb-4">
                      <Input
                        type="text"
                        placeholder="Search cards by name or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full"
                      />
                      {searchQuery && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Showing {filteredCards.length} of {inventoryCards.length} cards
                        </p>
                      )}
                    </div>

                    {/* Loading State */}
                    {isLoadingInventory && (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-2 text-muted-foreground">Loading inventory...</p>
                            </div>
                    )}

                    {/* Card List - Row View */}
                    {!isLoadingInventory && filteredCards.map((card) => (
                      <Card key={card.id} className="gaming-card">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            {/* Card Image */}
                            <div className="w-20 h-28 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                              <img
                                src={card.imageUrl}
                                alt={card.name}
                                className="w-full h-full object-cover rounded"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                              </div>

                            {/* Card Details */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg mb-1">{card.name}</h3>
                              <p className="text-sm text-blue-600 font-medium">
                                {card.credits} Credits
                              </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 flex-shrink-0">
                            <Button 
                                variant="outline"
                                      size="sm"
                                      onClick={() => handleEditCard(card)}
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Edit
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                onClick={() => handleRemoveCard(card.id, card.name)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                <X className="w-4 h-4 mr-1" />
                                Remove
                                    </Button>
                                  </div>
                                </div>
                        </CardContent>
                      </Card>
                    ))}
                    {/* Empty State */}
                    {!isLoadingInventory && inventoryCards.length === 0 && (
                      <div className="text-center py-8">
                        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Cards in Inventory</h3>
                        <p className="text-muted-foreground">
                          Add your first card to get started
                        </p>
                      </div>
                    )}

                    {/* No Search Results */}
                    {!isLoadingInventory && inventoryCards.length > 0 && filteredCards.length === 0 && (
                      <div className="text-center py-8">
                        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Cards Found</h3>
                        <p className="text-muted-foreground">
                          No cards match your search "{searchQuery}"
                        </p>
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          onClick={() => setSearchQuery('')}
                        >
                          Clear Search
                        </Button>
                      </div>
                    )}
                          </div>
                        </CardContent>
                      </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
                <Card className="gaming-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      System Settings
                    </CardTitle>
                  </CardHeader>
                <CardContent>
                      <div className="text-center py-8">
                        <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">System Settings</h3>
                      </div>
                  </CardContent>
                </Card>
            </TabsContent>
          </Tabs>

          {/* User Action Dialog */}
          <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>User Actions</DialogTitle>
                <DialogDescription>
                  Manage user: {selectedUser?.email}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                      <Button
                        variant="outline"
                    onClick={handleViewTransactions}
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                  >
                    <History className="w-6 h-6" />
                    <span>View Transactions</span>
                      </Button>

                      <Button
                        variant="outline"
                    onClick={handleBanUser}
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                >
                    <Ban className="w-6 h-6" />
                    <span>{selectedUser?.isBanned ? 'Unban User' : 'Ban User'}</span>
                      </Button>
                        </div>

                <div className="space-y-2">
                  <Label htmlFor="credits">Edit Credits</Label>
                <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      Current Credits: <span className="font-semibold">{selectedUser?.credits}</span>
                </div>
                    <div className="flex space-x-2">
                  <Input
                    id="credits"
                    type="number"
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(Number(e.target.value))}
                        placeholder="Enter new credit amount"
                    min="0"
                      />
                      <Button onClick={handleUpdateCredits}>
                        <Coins className="w-4 h-4 mr-1" />
                        Update
                  </Button>
                </div>
                    <div className="text-xs text-muted-foreground">
                      Change: {creditAmount - (selectedUser?.credits || 0)} credits
                      </div>
                      </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowUserDialog(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Transaction History Dialog */}
          <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Transaction History</DialogTitle>
                <DialogDescription>
                  Transaction history for {selectedUser?.email}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                    <div className="text-center py-8">
                  <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Transaction History</h3>
                  <p className="text-muted-foreground">
                    Transaction data will be loaded here.
                  </p>
                  </div>
                </div>

                <DialogFooter>
                <Button variant="outline" onClick={() => setShowTransactionDialog(false)}>
                  Close
                  </Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Floating Add Card Button - Only show on Inventory tab */}
          {activeTab === 'inventory' && (
            <Button
              className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 gaming-button"
              onClick={() => setShowAddCardForm(true)}
            >
              <Plus className="w-6 h-6" />
            </Button>
          )}

          {/* Add Card Dialog */}
          <Dialog open={showAddCardForm} onOpenChange={setShowAddCardForm}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Card</DialogTitle>
                <DialogDescription>
                  Add a new card to the inventory.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cardName">Card Name</Label>
                  <Input
                    id="cardName"
                    value={newCard.name}
                    onChange={(e) => handleNewCardChange('name', e.target.value)}
                    placeholder="Enter card name"
                    required
                  />
                            </div>
                
                            <div>
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input
                    id="imageUrl"
                    type="url"
                    value={newCard.imageUrl}
                    onChange={(e) => handleNewCardChange('imageUrl', e.target.value)}
                    placeholder="https://example.com/card-image.jpg"
                    required
                  />
                          </div>
                          
                <div>
                  <Label htmlFor="credits">Credits</Label>
                  <Input
                    id="credits"
                    type="number"
                    min="0"
                    value={newCard.credits}
                    onChange={(e) => handleNewCardChange('credits', e.target.value)}
                    placeholder="Enter credit amount"
                    required
                  />
                            </div>
                              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowAddCardForm(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddCard}>
                  Add Card
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Card Dialog */}
          <Dialog open={editingCard !== null} onOpenChange={() => setEditingCard(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Card</DialogTitle>
                <DialogDescription>
                  Update the card details.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="editCardName">Card Name</Label>
                  <Input
                    id="editCardName"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Enter card name"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="editImageUrl">Image URL</Label>
                  <Input
                    id="editImageUrl"
                    type="url"
                    value={editForm.imageUrl}
                    onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                    placeholder="https://example.com/card-image.jpg"
                    required
                  />
                </div>
                          
                <div>
                  <Label htmlFor="editCredits">Credits</Label>
                  <Input
                    id="editCredits"
                    type="number"
                    min="0"
                    value={editForm.credits}
                    onChange={(e) => setEditForm({ ...editForm, credits: e.target.value })}
                    placeholder="Enter credit amount"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdateCard}>
                  Update Card
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        {/* Add Content Dialog */}
        <Dialog open={showAddPoolDialog} onOpenChange={setShowAddPoolDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Content to Special Packs</DialogTitle>
              <DialogDescription>
                Create new special packs and add cards to them.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Create New Pack Section */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-4">Create New Special Pack</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="poolName">Pack Name</Label>
                    <Input
                      id="poolName"
                      value={newPool.name}
                      onChange={(e) => setNewPool({ ...newPool, name: e.target.value })}
                      placeholder="Enter pack name"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="poolImage">Pack Image URL</Label>
                    <Input
                      id="poolImage"
                      value={newPool.image}
                      onChange={(e) => setNewPool({ ...newPool, image: e.target.value })}
                      placeholder="https://example.com/pack-image.jpg"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="poolPrice">Price ($)</Label>
                    <Input
                      id="poolPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newPool.price}
                      onChange={(e) => setNewPool({ ...newPool, price: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="poolTotalCards">Total Cards</Label>
                    <Input
                      id="poolTotalCards"
                      type="number"
                      min="1"
                      value={newPool.totalCards}
                      onChange={(e) => setNewPool({ ...newPool, totalCards: e.target.value })}
                      placeholder="10"
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="poolDescription">Description</Label>
                    <Input
                      id="poolDescription"
                      value={newPool.description}
                      onChange={(e) => setNewPool({ ...newPool, description: e.target.value })}
                      placeholder="Enter pack description"
                      required
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleAddPool}
                  className="mt-4"
                  disabled={!newPool.name.trim() || !newPool.image.trim() || !newPool.price.trim() || !newPool.totalCards.trim() || !newPool.description.trim()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Pack
                </Button>
              </div>

              {/* Add Cards to Existing Packs */}
              {specialPools.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium">Add Cards to Existing Packs</h3>
                  
                  {specialPools.map((pool) => (
                    <div key={pool.id} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">{pool.name}</h4>
                      <p className="text-sm text-muted-foreground mb-3">{pool.description}</p>
                      
                      {/* Show available cards from inventory */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {inventoryCards.slice(0, 9).map((card) => (
                          <div key={card.id} className="flex items-center gap-3 p-3 border rounded">
                            <img
                              src={card.imageUrl}
                              alt={card.name}
                              className="w-12 h-12 object-cover rounded"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/assets/random-common-card.png';
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{card.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Credits: {card.credits}
                              </p>
                            </div>
                            <Button
                              onClick={() => handleAddCardToPool(pool.id, card)}
                              size="sm"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddPoolDialog(false);
                  setNewPool({ name: '', description: '', image: '', price: '', totalCards: '' });
                }}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Pool Dialog */}
        <Dialog open={showEditPoolDialog} onOpenChange={setShowEditPoolDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Special Pack</DialogTitle>
              <DialogDescription>
                Update the pack details and settings.
              </DialogDescription>
            </DialogHeader>
            
            {editingPool && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editPoolName">Pack Name</Label>
                    <Input
                      id="editPoolName"
                      value={editingPool.name}
                      onChange={(e) => setEditingPool({ ...editingPool, name: e.target.value })}
                      placeholder="Enter pack name"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="editPoolImage">Pack Image URL</Label>
                    <Input
                      id="editPoolImage"
                      value={editingPool.image}
                      onChange={(e) => setEditingPool({ ...editingPool, image: e.target.value })}
                      placeholder="https://example.com/pack-image.jpg"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="editPoolPrice">Price ($)</Label>
                    <Input
                      id="editPoolPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingPool.price}
                      onChange={(e) => setEditingPool({ ...editingPool, price: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="editPoolTotalCards">Total Cards</Label>
                    <Input
                      id="editPoolTotalCards"
                      type="number"
                      min="1"
                      value={editingPool.totalCards}
                      onChange={(e) => setEditingPool({ ...editingPool, totalCards: parseInt(e.target.value) || 1 })}
                      placeholder="10"
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="editPoolDescription">Description</Label>
                    <Input
                      id="editPoolDescription"
                      value={editingPool.description}
                      onChange={(e) => setEditingPool({ ...editingPool, description: e.target.value })}
                      placeholder="Enter pack description"
                      required
                    />
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={handleCancelEditPool}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdatePool}
                disabled={!editingPool?.name.trim() || !editingPool?.image.trim() || !editingPool?.description.trim()}
              >
                Update Pack
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        </div>
      </div>
    </div>
  );
}