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
import { ImageUpload } from "@/components/ImageUpload";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
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
  Eye,
  Save,
  RefreshCw,
  Search,
  Filter,
  Gift,
  Trophy
} from "lucide-react";

export default function Admin() {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Helper function for authenticated requests
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('authToken');
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      credentials: 'include',
    });
  };
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [creditAmount, setCreditAmount] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Raffle state
  const [raffles, setRaffles] = useState<any[]>([]);
  const [showRaffleDialog, setShowRaffleDialog] = useState(false);
  const [editingRaffle, setEditingRaffle] = useState<any>(null);
  const [raffleForm, setRaffleForm] = useState({
    title: '',
    description: '',
    prizeImageUrl: '',
    totalSlots: '',
    pricePerSlot: '',
    maxWinners: '1'
  });
  const [raffleImageFile, setRaffleImageFile] = useState<File | null>(null);
  const [isUploadingRaffleImage, setIsUploadingRaffleImage] = useState(false);
  const [raffleImageMode, setRaffleImageMode] = useState<'upload' | 'url'>('upload');
  const [showPrizeEditDialog, setShowPrizeEditDialog] = useState(false);
  const [prizeEditForm, setPrizeEditForm] = useState({
    prizes: [
      { position: 1, name: '', type: 'pack', value: '', imageUrl: '' }
    ]
  });
  const [adminStats, setAdminStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [systemSettings, setSystemSettings] = useState<any[]>([]);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [manageSection, setManageSection] = useState<"classic" | "special" | "mystery">("classic");
  const [mysterySection, setMysterySection] = useState<"view" | "edit" | "add">("view");
  const [mysteryPackCards, setMysteryPackCards] = useState<Array<{
    id: string;
    packId: string;
    cardName: string;
    cardImageUrl: string;
    cardTier: string;
    refundCredit: number;
    quantity: number;
    cardSource: string;
    createdAt: string;
  }>>([]);
  const [mysteryPacks, setMysteryPacks] = useState<Array<{
    id: string;
    name: string;
    description: string;
    imageUrl?: string;
    packType: string;
    price?: string;
    totalPacks?: number;
    odds?: any;
    isActive: boolean;
    createdAt: string;
  }>>([]);
  const [selectedMysteryPack, setSelectedMysteryPack] = useState<string>('');
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

  // Classic Pack States
  const [classicSection, setClassicSection] = useState<"view" | "add">("view");
  const [classicPools, setClassicPools] = useState<Array<{
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
  const [showAddClassicDialog, setShowAddClassicDialog] = useState(false);
  const [showEditPoolDialog, setShowEditPoolDialog] = useState(false);
  const [editingPool, setEditingPool] = useState<{
    id: string;
    name: string;
    description: string;
    image: string;
    price: number;
    totalCards: number;
  } | null>(null);
  
  // Edit Content Dialog State
  const [showEditContentDialog, setShowEditContentDialog] = useState(false);
  const [editingContentPool, setEditingContentPool] = useState<{
    id: string;
    name: string;
    cards: Array<{ id: string; name: string; imageUrl: string; credits: number; quantity: number }>;
  } | null>(null);
  const [contentSearchQuery, setContentSearchQuery] = useState('');
  
  // Add Card Dialog State
  const [showAddCardDialog, setShowAddCardDialog] = useState(false);
  const [newCard, setNewCard] = useState({
    name: '',
    imageUrl: '',
    tier: 'D',
    refundCredit: '',
    quantity: ''
  });
  
  // Edit Card Dialog State
  const [showEditCardDialog, setShowEditCardDialog] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [editCardForm, setEditCardForm] = useState({
    name: '',
    imageUrl: '',
    tier: 'D',
    refundCredit: '',
    quantity: ''
  });

  // Mystery Pack Edit Card Dialog State
  const [showMysteryEditCardDialog, setShowMysteryEditCardDialog] = useState(false);
  const [editingMysteryCard, setEditingMysteryCard] = useState<any>(null);
  const [mysteryEditCardForm, setMysteryEditCardForm] = useState({
    name: '',
    imageUrl: '',
    tier: 'D',
    refundCredit: '',
    quantity: ''
  });

  // Edit Prize Dialog Search and Filter State
  const [editPrizeSearchTerm, setEditPrizeSearchTerm] = useState('');
  const [editPrizeTierFilter, setEditPrizeTierFilter] = useState('all');

  // Filter cards for edit prize dialog based on search and tier
  const filterCardsForEditPrize = (cards: any[]) => {
    if (!cards) return [];
    return cards.filter((card: any) => {
      const cardName = card.name || card.cardName || '';
      const cardTier = card.tier || card.cardTier || '';
      const matchesSearch = cardName.toLowerCase().includes(editPrizeSearchTerm.toLowerCase());
      const matchesTier = editPrizeTierFilter === 'all' || cardTier === editPrizeTierFilter;
      return matchesSearch && matchesTier;
    });
  };
  
  // View Prize Dialog State
  const [showViewPrizeDialog, setShowViewPrizeDialog] = useState(false);
  const [viewingPrizePool, setViewingPrizePool] = useState<{
    id: string;
    name: string;
    cards: Array<{ id: string; name: string; imageUrl: string; credits: number; quantity: number }>;
  } | null>(null);
  const [newPool, setNewPool] = useState({ 
    name: '', 
    description: '', 
    image: '', 
    price: '', 
    totalCards: '' 
  });



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

  const handleUpdateCredits = async () => {
    if (selectedUser) {
      try {
        const response = await apiRequest('POST', '/api/user/update-credits', {
          credits: creditAmount.toString()
        });
        
        if (response.ok) {
          // Refresh user data to show updated credits immediately
          await refreshUserData(selectedUser.id);
      setShowUserDialog(false);
          // Refresh the users list
          fetchUsers();
        } else {
          console.error('Failed to update credits');
        }
      } catch (error) {
        console.error('Error updating credits:', error);
      }
    }
  };

  // Function to refresh user data (useful when credits are updated directly in database)
  const refreshUserData = async (userId: string) => {
    try {
      const response = await apiRequest('POST', `/api/admin/refresh-user/${userId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('User data refreshed:', data);
        // Update the user in the local state
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === userId ? { ...user, credits: data.user.credits } : user
          )
        );
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  // Fetch admin statistics
  const fetchAdminStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await apiRequest('GET', '/api/admin/stats');
      const stats = await response.json();
      setAdminStats(stats);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await apiRequest('GET', '/api/admin/users');
      const usersData = await response.json();
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Fetch system settings
  const fetchSystemSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const response = await apiRequest('GET', '/api/admin/system-settings');
      const settingsData = await response.json();
      setSystemSettings(settingsData);
    } catch (error) {
      console.error('Error fetching system settings:', error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  // Update system setting
  const updateSystemSetting = async (settingKey: string, settingValue: boolean) => {
    try {
      const response = await apiRequest('POST', `/api/admin/system-settings/${settingKey}`, { settingValue });
      if (response.ok) {
        // Refresh settings after update
        fetchSystemSettings();
      } else {
        console.error('Failed to update system setting');
      }
    } catch (error) {
      console.error('Error updating system setting:', error);
    }
  };

  const handleViewTransactions = () => {
    setShowTransactionDialog(true);
  };




  // Fetch mystery packs from API
  const fetchMysteryPacks = async () => {
    try {
      console.log('Fetching mystery packs...');
      // Add cache-busting parameter to ensure fresh data
      const timestamp = Date.now();
      const response = await apiRequest('GET', `/api/admin/mystery-packs?_t=${timestamp}`);
      console.log('Mystery packs fetch response status:', response.status);
      
      if (response.ok) {
        const packs = await response.json();
        console.log('🔄 Fetched fresh mystery packs:', packs);
        setMysteryPacks(packs);
        // Auto-select the first pack if none is selected
        if (packs.length > 0 && !selectedMysteryPack) {
          setSelectedMysteryPack(packs[0].id);
        }
        
        // Load mystery pack cards immediately after loading mystery packs
        if (packs.length > 0) {
          const pokeballPack = packs.find((pack: any) => pack.packType === 'pokeball') || packs[0];
          console.log('Auto-loading mystery pack cards for:', pokeballPack.id);
          const cardResponse = await apiRequest('GET', `/api/admin/mystery-packs/${pokeballPack.id}`);
          if (cardResponse.ok) {
            const packData = await cardResponse.json();
            console.log('Auto-loaded mystery pack cards:', packData.cards);
            setMysteryPackCards(packData.cards || []);
          }
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch mystery packs:', errorText);
      }
    } catch (error: any) {
      console.error('Error fetching mystery packs:', error);
    }
  };



  // Load special packs when manage tab is active
  useEffect(() => {
    if (activeTab === 'manage') {
      fetchSpecialPacks();
      fetchClassicPacks();
    } else if (activeTab === 'overview') {
      fetchAdminStats();
    } else if (activeTab === 'user') {
      fetchUsers();
    } else if (activeTab === 'settings') {
      fetchSystemSettings();
    } else if (activeTab === 'raffles') {
      fetchRaffles();
    }
  }, [activeTab]);

  // Auto-refresh pack data every 30 seconds when on manage tab (reduced frequency)
  useEffect(() => {
    if (activeTab === 'manage') {
      const interval = setInterval(() => {
        console.log('🔄 Auto-refreshing pack data...');
        fetchSpecialPacks();
        fetchClassicPacks();
        fetchMysteryPacks();
      }, 30000); // Refresh every 30 seconds instead of 5

      return () => clearInterval(interval);
    }
  }, [activeTab]);


  // Load mystery packs when component mounts or when switching to mystery section
  useEffect(() => {
    if (activeTab === 'manage' && manageSection === 'mystery') {
      console.log('Loading mystery packs...');
      fetchMysteryPacks();
    }
  }, [activeTab, manageSection]);

  // Fetch mystery pack cards (from pokeball pack as the shared pool)
  const fetchMysteryPackCards = async () => {
    try {
      if (mysteryPacks.length === 0) return;
      
      const pokeballPack = mysteryPacks.find(pack => pack.packType === 'pokeball') || mysteryPacks[0];
      
      // Add cache-busting parameter to ensure fresh data
      const timestamp = Date.now();
      const response = await apiRequest('GET', `/api/admin/mystery-packs/${pokeballPack.id}?_t=${timestamp}`);
      if (response.ok) {
        const packData = await response.json();
        console.log('🔄 Fetched fresh mystery pack cards:', packData.cards?.length || 0, 'cards');
        
        // Force a complete state reset to ensure re-render
        setMysteryPackCards([]);
        setTimeout(() => {
          setMysteryPackCards(packData.cards || []);
        }, 0);
      } else {
        console.error('Failed to fetch mystery pack cards');
      }
      } catch (error) {
      console.error('Error fetching mystery pack cards:', error);
    }
  };

  // Load mystery pack cards when switching to view or edit tab
  useEffect(() => {
    if (activeTab === 'manage' && manageSection === 'mystery' && (mysterySection === 'view' || mysterySection === 'edit') && mysteryPacks.length > 0) {
      fetchMysteryPackCards();
    }
  }, [activeTab, manageSection, mysterySection, mysteryPacks]);







  // Debug logging

  // Add card to mystery pack (always uses the first pack - pokeball)






  // Special Pool Management
  const handleAddPool = async () => {
    console.log('🔄 Creating special pack with data:', newPool);
    if (newPool.name.trim() && newPool.description.trim() && newPool.image.trim() && newPool.price.trim() && newPool.totalCards.trim()) {
      try {
        const response = await apiRequest('POST', '/api/admin/special-packs', {
          name: newPool.name.trim(),
          description: newPool.description.trim(),
          image: newPool.image.trim(),
          price: parseFloat(newPool.price),
          totalCards: parseInt(newPool.totalCards)
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
      const response = await authenticatedFetch(`http://localhost:3000/api/admin/special-packs/${poolId}`, {
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

  const handleEditContent = (pool: any) => {
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
        console.log('🔄 Updating special pack:', editingPool);
        
        const response = await apiRequest('PUT', `/api/admin/special-packs/${editingPool.id}`, {
          name: editingPool.name.trim(),
          description: editingPool.description.trim(),
          image: editingPool.image.trim(),
          price: editingPool.price,
          totalCards: editingPool.totalCards
        });

        const updatedPack = await response.json();
        console.log('✅ Special pack updated successfully:', updatedPack);
        
        setSpecialPools(prev => prev.map(pool => 
          pool.id === editingPool.id 
            ? { ...pool, ...updatedPack }
            : pool
        ));
        setShowEditPoolDialog(false);
        setEditingPool(null);
        alert('Special pack updated successfully!');
      } catch (error: any) {
        console.error('❌ Error updating special pack:', error);
        alert(`Failed to update special pack: ${error.message || 'Please try again.'}`);
      }
    } else {
      alert('Please fill in all required fields');
    }
  };

  const handleCancelEditPool = () => {
    setShowEditPoolDialog(false);
    setEditingPool(null);
  };

  // Classic Pool Management
  const handleAddClassicPool = async () => {
    console.log('🔄 Creating classic pack with data:', newPool);
    if (newPool.name.trim() && newPool.description.trim() && newPool.image.trim() && newPool.price.trim()) {
      try {
        const response = await authenticatedFetch('http://localhost:3000/api/admin/classic-packs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: newPool.name.trim(),
            description: newPool.description.trim(),
            image: newPool.image.trim(),
            price: parseFloat(newPool.price)
          }),
        });

        if (response.ok) {
          const newPack = await response.json();
          setClassicPools(prev => [...prev, newPack]);
          setNewPool({ name: '', description: '', image: '', price: '', totalCards: '' });
          setShowAddPoolDialog(false);
          alert('Classic pack created successfully!');
        } else {
          const errorData = await response.json();
          alert(`Failed to create classic pack: ${errorData.error || 'Unknown error'}`);
        }
      } catch (error: any) {
        console.error('Error creating classic pack:', error);
        alert('Failed to create classic pack. Please try again.');
      }
    } else {
      alert('Please fill in all required fields');
    }
  };

  const handleEditClassicPool = (pool: any) => {
    // Map the pool properties to match the editingPool structure
    setEditingPool({
      id: pool.id,
      name: pool.name,
      description: pool.description,
      image: pool.imageUrl || pool.image, // Handle both imageUrl and image properties
      price: parseFloat(pool.price),
      totalCards: pool.totalCards || 0
    });
    setShowEditPoolDialog(true);
  };

  const handleUpdateClassicPool = async () => {
    if (editingPool && editingPool.name.trim() && editingPool.description.trim() && editingPool.image.trim() && editingPool.price) {
      try {
        const response = await apiRequest('PUT', `/api/admin/classic-packs/${editingPool.id}`, {
          name: editingPool.name.trim(),
          description: editingPool.description.trim(),
          image: editingPool.image.trim(),
          price: parseFloat(editingPool.price.toString())
        });

        if (response.ok) {
          const updatedPack = await response.json();
          setClassicPools(prev => prev.map(pool => pool.id === editingPool.id ? updatedPack : pool));
          setShowEditPoolDialog(false);
          setEditingPool(null);
          alert('Classic pack updated successfully!');
        } else {
          const errorData = await response.json();
          alert(`Failed to update classic pack: ${errorData.error || 'Unknown error'}`);
        }
      } catch (error: any) {
        console.error('Error updating classic pack:', error);
        alert('Failed to update classic pack. Please try again.');
      }
    } else {
      alert('Please fill in all required fields');
    }
  };

  const handleDeleteClassicPool = async (poolId: string) => {
    if (confirm('Are you sure you want to delete this classic pack? This action cannot be undone.')) {
      try {
        const response = await authenticatedFetch(`http://localhost:3000/api/admin/classic-packs/${poolId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setClassicPools(prev => prev.filter(pool => pool.id !== poolId));
          alert('Classic pack deleted successfully!');
        } else {
          const errorData = await response.json();
          alert(`Failed to delete classic pack: ${errorData.error || 'Unknown error'}`);
        }
      } catch (error: any) {
        console.error('Error deleting classic pack:', error);
        alert('Failed to delete classic pack. Please try again.');
      }
    }
  };

  // Edit Prize Functions
  const handleEditPrize = async (pool: any) => {
    console.log('handleEditPrize called with pool:', pool);
    
    // Set the editing pool directly from the pool data we already have
    setEditingContentPool({
      id: pool.id,
      name: pool.name,
      cards: (pool.cards || []).map((card: any) => ({
        id: card.id,
        name: card.cardName || card.name,
        imageUrl: card.cardImageUrl || card.imageUrl,
        credits: card.refundCredit || card.credits,
        quantity: card.quantity
      }))
    });
    
    console.log('Setting showEditContentDialog to true');
    setShowEditContentDialog(true);
  };


  const handleAddCardToContent = async (card: any) => {
    if (!editingContentPool) return;

    // Determine the correct API endpoint based on pack type
    const apiEndpoint = editingContentPool.id.startsWith('cp-') ? 'classic-packs' : 'special-packs';

    try {
      const response = await apiRequest('POST', `/api/admin/${apiEndpoint}/${editingContentPool.id}/cards`, {
        cardId: card.id,
        quantity: 1
      });

      if (response.ok) {
        // Refresh the editing pool data with cache-busting
        const timestamp = Date.now();
        const updatedPoolResponse = await apiRequest('GET', `/api/admin/${apiEndpoint}/${editingContentPool.id}?_t=${timestamp}`);
        const updatedPool = await updatedPoolResponse.json();
        const normalizedCards = (updatedPool.cards || []).map((card: any) => ({
          id: card.id,
          name: card.name,
          imageUrl: card.imageUrl,
          credits: card.refundCredit || card.credits,
          quantity: card.quantity
        }));
        
        setEditingContentPool(prev => prev ? {
          ...prev,
          cards: normalizedCards
        } : null);
        
        // Update the appropriate pack state based on pack type with fresh data
        if (editingContentPool.id.startsWith('cp-')) {
          await fetchClassicPacks();
        } else {
          await fetchSpecialPacks();
        }
        
        // Show success message
        alert(`${card.cardName || card.name} added to pack successfully!`);
      } else {
        const errorText = await response.text();
        console.error('Failed to add card to pack:', errorText);
        alert('Failed to add card to pack. Please try again.');
      }
    } catch (error) {
      console.error('Error adding card to pack:', error);
      alert('Failed to add card to pack. Please try again.');
    }
  };

  const handleRemoveCardFromContent = async (cardId: string) => {
    if (!editingContentPool) return;

    // Determine the correct API endpoint based on pack type
    const apiEndpoint = editingContentPool.id.startsWith('cp-') ? 'classic-packs' : 'special-packs';

    console.log('Removing card with ID:', cardId);
    console.log('Current editingContentPool.cards:', editingContentPool.cards);

    try {
      const response = await apiRequest('DELETE', `/api/admin/${apiEndpoint}/${editingContentPool.id}/cards/${cardId}`);

      if (response.ok) {
        // Show success message first
        alert('Card removed from pack successfully!');
        
        // Immediately update the local state to remove the card
        setEditingContentPool(prev => prev ? {
          ...prev,
          cards: prev.cards.filter(card => card.id !== cardId)
        } : null);
        
        // Update the appropriate pack state based on pack type
        if (editingContentPool.id.startsWith('cp-')) {
          setClassicPools(prev => prev.map(pool => 
            pool.id === editingContentPool.id 
              ? { ...pool, cards: (pool.cards || []).filter(card => card.id !== cardId) }
              : pool
          ));
        } else {
          setSpecialPools(prev => prev.map(pool => 
            pool.id === editingContentPool.id 
              ? { ...pool, cards: (pool.cards || []).filter(card => card.id !== cardId) }
              : pool
          ));
        }
        
        // Then refresh from server to ensure consistency with cache-busting
        const timestamp = Date.now();
        const updatedPool = await authenticatedFetch(`http://localhost:3000/api/admin/${apiEndpoint}/${editingContentPool.id}?_t=${timestamp}`).then(res => res.json());
        console.log('Updated pool data:', updatedPool);
        console.log('Updated pool cards:', updatedPool.cards);
        
        const normalizedCards = (updatedPool.cards || []).map((card: any) => ({
          id: card.id,
          name: card.name,
          imageUrl: card.imageUrl,
          credits: card.refundCredit || card.credits,
          quantity: card.quantity
        }));
        
        // Always update with the server data to ensure consistency
        setEditingContentPool(prev => prev ? {
          ...prev,
          cards: normalizedCards
        } : null);
        
        // Update the appropriate pack state with server data
        if (editingContentPool.id.startsWith('cp-')) {
          setClassicPools(prev => prev.map(pool => 
            pool.id === editingContentPool.id 
              ? { ...pool, cards: normalizedCards }
              : pool
          ));
        } else {
          setSpecialPools(prev => prev.map(pool => 
            pool.id === editingContentPool.id 
              ? { ...pool, cards: normalizedCards }
              : pool
          ));
        }
      } else {
        alert('Failed to remove card from pack');
      }
    } catch (error) {
      console.error('Error removing card from pack:', error);
      alert('Failed to remove card from pack');
    }
  };

  const handleUpdateCardQuantity = async (cardId: string, newQuantity: number) => {
    if (!editingContentPool || newQuantity < 1) return;

    // Determine the correct API endpoint based on pack type
    const apiEndpoint = editingContentPool.id.startsWith('cp-') ? 'classic-packs' : 'special-packs';

    try {
      const response = await authenticatedFetch(`http://localhost:3000/api/admin/${apiEndpoint}/${editingContentPool.id}/cards/${cardId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity: newQuantity
        }),
      });

      if (response.ok) {
        // Refresh the editing pool data with cache-busting
        const timestamp = Date.now();
        const updatedPool = await authenticatedFetch(`http://localhost:3000/api/admin/${apiEndpoint}/${editingContentPool.id}?_t=${timestamp}`).then(res => res.json());
        setEditingContentPool(prev => prev ? {
          ...prev,
          cards: updatedPool.cards || []
        } : null);
        
        // Also update the main pack state based on pack type
        if (editingContentPool.id.startsWith('cp-')) {
          await fetchClassicPacks();
        } else {
          await fetchSpecialPacks();
        }
      } else {
        alert('Failed to update card quantity');
      }
    } catch (error) {
      console.error('Error updating card quantity:', error);
      alert('Failed to update card quantity');
    }
  };

  const handleCancelEditContent = () => {
    setEditingContentPool(null);
    setContentSearchQuery('');
    setShowEditContentDialog(false);
    
    // Refresh pack data to reflect any changes made in the edit content dialog
    fetchSpecialPacks();
    fetchClassicPacks();
  };

  // Add Card Functions
  const handleAddCard = async () => {
    if (!editingContentPool) return;

    // Determine the correct API endpoint based on pack type
    const apiEndpoint = editingContentPool.id.startsWith('cp-') ? 'classic-packs' : 'special-packs';

    try {
      const response = await apiRequest('POST', `/api/admin/${apiEndpoint}/${editingContentPool.id}/cards`, {
        cardName: newCard.name,
        cardImageUrl: newCard.imageUrl,
        cardTier: newCard.tier,
        refundCredit: parseInt(newCard.refundCredit) || 0,
        quantity: parseInt(newCard.quantity) || 1
      });

      if (response.ok) {
        // Refresh the editing pool data with cache-busting
        const timestamp = Date.now();
        const updatedPoolResponse = await apiRequest('GET', `/api/admin/${apiEndpoint}/${editingContentPool.id}?_t=${timestamp}`);
        const updatedPool = await updatedPoolResponse.json();
        const normalizedCards = (updatedPool.cards || []).map((card: any) => ({
          id: card.id,
          name: card.name,
          imageUrl: card.imageUrl,
          credits: card.refundCredit || card.credits,
          quantity: card.quantity
        }));
        
        setEditingContentPool(prev => prev ? {
          ...prev,
          cards: normalizedCards
        } : null);

        // Reset form
        setNewCard({ name: '', imageUrl: '', tier: 'D', refundCredit: '', quantity: '' });
        setShowAddCardDialog(false);
        
        // Refresh main pack lists to reflect the change with cache-busting
        await Promise.all([
          fetchSpecialPacks(),
          fetchClassicPacks()
        ]);
        
        alert('Card added successfully!');
      } else {
        const errorText = await response.text();
        alert(`Failed to add card: ${errorText}`);
      }
    } catch (error) {
      console.error('Error adding card:', error);
      alert('An error occurred while adding the card. Please try again.');
    }
  };

  // Edit Card Functions
  const handleEditCard = (card: any) => {
    setEditingCard(card);
    setEditCardForm({
      name: card.cardName || card.name,
      imageUrl: card.cardImageUrl || card.imageUrl,
      tier: card.cardTier || card.tier || 'D',
      refundCredit: (card.refundCredit || card.credits).toString(),
      quantity: card.quantity.toString()
    });
    setShowEditCardDialog(true);
  };

  const handleUpdateCard = async () => {
    if (!editingCard || !editingContentPool) return;

    // Determine the correct API endpoint based on pack type
    const apiEndpoint = editingContentPool.id.startsWith('cp-') ? 'classic-packs' : 'special-packs';

    try {
      const response = await apiRequest('PATCH', `/api/admin/${apiEndpoint}/${editingContentPool.id}/cards/${editingCard.id}`, {
        cardName: editCardForm.name,
        cardImageUrl: editCardForm.imageUrl,
        cardTier: editCardForm.tier,
        refundCredit: parseInt(editCardForm.refundCredit) || 0,
        quantity: parseInt(editCardForm.quantity) || 1
      });

      if (response.ok) {
        // Refresh the editing pool data with cache-busting
        const timestamp = Date.now();
        const updatedPoolResponse = await apiRequest('GET', `/api/admin/${apiEndpoint}/${editingContentPool.id}?_t=${timestamp}`);
        const updatedPool = await updatedPoolResponse.json();
        const normalizedCards = (updatedPool.cards || []).map((card: any) => ({
          id: card.id,
          name: card.name,
          imageUrl: card.imageUrl,
          credits: card.refundCredit || card.credits,
          quantity: card.quantity
        }));
        
        setEditingContentPool(prev => prev ? {
          ...prev,
          cards: normalizedCards
        } : null);

        // Also update the main pack state based on pack type
        if (editingContentPool.id.startsWith('cp-')) {
          await fetchClassicPacks();
        } else {
          await fetchSpecialPacks();
        }

        // Reset form
        setEditingCard(null);
        setShowEditCardDialog(false);
        
        alert('Card updated successfully!');
      } else {
        const errorText = await response.text();
        alert(`Failed to update card: ${errorText}`);
      }
    } catch (error) {
      console.error('Error updating card:', error);
      alert('An error occurred while updating the card. Please try again.');
    }
  };

  // Classic Pack Card Management Functions
  const handleEditClassicPrize = async (pool: any) => {
    console.log('handleEditClassicPrize called with pool:', pool);
    
    // Set the editing pool directly from the pool data we already have
    setEditingContentPool({
      id: pool.id,
      name: pool.name,
      cards: (pool.cards || []).map((card: any) => ({
        id: card.id,
        name: card.cardName || card.name,
        imageUrl: card.cardImageUrl || card.imageUrl,
        credits: card.refundCredit || card.credits,
        quantity: card.quantity
      }))
    });
    
    console.log('Setting showEditContentDialog to true');
    setShowEditContentDialog(true);
  };

  const handleViewClassicPrize = (pool: any) => {
    setViewingPrizePool({
      id: pool.id,
      name: pool.name,
      cards: (pool.cards || []).map((card: any) => ({
        id: card.id,
        name: card.cardName || card.name,
        imageUrl: card.cardImageUrl || card.imageUrl,
        credits: card.refundCredit || card.credits,
        quantity: card.quantity
      }))
    });
    setShowViewPrizeDialog(true);
  };

  const handleEditClassicContent = (pool: any) => {
    setEditingContentPool({
      id: pool.id,
      name: pool.name,
      cards: (pool.cards || []).map((card: any) => ({
        id: card.id,
        name: card.cardName || card.name,
        imageUrl: card.cardImageUrl || card.imageUrl,
        credits: card.refundCredit || card.credits,
        quantity: card.quantity
      }))
    });
    setContentSearchQuery('');
    setShowEditContentDialog(true);
  };

  const handleAddCardToClassicContent = async (card: any) => {
    if (!editingContentPool) return;

    try {
      const response = await authenticatedFetch(`http://localhost:3000/api/admin/classic-packs/${editingContentPool.id}/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardId: card.id,
          quantity: 1
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add card to pack');
      }

      // Refresh the pack data
      const updatedPack = await authenticatedFetch(`http://localhost:3000/api/admin/classic-packs/${editingContentPool.id}`);
      const packData = await updatedPack.json();
      
      // Update the editing content pool with fresh data
      setEditingContentPool({
        id: packData.id,
        name: packData.name,
        cards: (packData.cards || []).map((card: any) => ({
          id: card.id,
          name: card.name,
          imageUrl: card.imageUrl,
          credits: card.refundCredit || card.credits,
          quantity: card.quantity
        }))
      });

      // Refresh the classic pools list
      fetchClassicPacks();
      
      alert('Card added to pack successfully!');
    } catch (error) {
      console.error('Error adding card to classic pack:', error);
      alert('Failed to add card to pack. Please try again.');
    }
  };

  const handleRemoveCardFromClassicContent = async (cardId: string) => {
    if (!editingContentPool) return;

    try {
      const response = await apiRequest('DELETE', `/api/admin/classic-packs/${editingContentPool.id}/cards/${cardId}`);

      if (!response.ok) {
        throw new Error('Failed to remove card from pack');
      }

      // Optimistically update the UI
      setEditingContentPool(prev => {
        if (!prev) return null;
        return {
          ...prev,
          cards: prev.cards.filter(card => card.id !== cardId)
        };
      });

      // Refresh the classic pools list
      fetchClassicPacks();
      
      alert('Card removed from pack successfully!');
    } catch (error) {
      console.error('Error removing card from classic pack:', error);
      alert('Failed to remove card from pack. Please try again.');
    }
  };

  const handleSaveClassicQuantity = async (cardId: string, newQuantity: number) => {
    if (!editingContentPool) return;

    try {
      const response = await authenticatedFetch(`http://localhost:3000/api/admin/classic-packs/${editingContentPool.id}/cards/${cardId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity: newQuantity })
      });

      if (!response.ok) {
        throw new Error('Failed to update card quantity');
      }

      // Refresh the pack data
      const updatedPack = await authenticatedFetch(`http://localhost:3000/api/admin/classic-packs/${editingContentPool.id}`);
      const packData = await updatedPack.json();
      
      // Update the editing content pool with fresh data
      setEditingContentPool({
        id: packData.id,
        name: packData.name,
        cards: (packData.cards || []).map((card: any) => ({
          id: card.id,
          name: card.name,
          imageUrl: card.imageUrl,
          credits: card.refundCredit || card.credits,
          quantity: card.quantity
        }))
      });

      // Refresh the classic pools list
      fetchClassicPacks();
      
      alert('Quantity updated successfully!');
    } catch (error) {
      console.error('Error updating classic pack card quantity:', error);
      alert('Failed to update quantity. Please try again.');
    }
  };

  // View Prize Functions
  const handleViewPrize = (pool: any) => {
    setViewingPrizePool({
      id: pool.id,
      name: pool.name,
      cards: (pool.cards || []).map((card: any) => ({
        id: card.id,
        name: card.cardName || card.name,
        imageUrl: card.cardImageUrl || card.imageUrl,
        credits: card.refundCredit || card.credits,
        quantity: card.quantity
      }))
    });
    setShowViewPrizeDialog(true);
  };

  const handleCancelViewPrize = () => {
    setViewingPrizePool(null);
    setShowViewPrizeDialog(false);
  };

  // Fetch special packs from API
  const fetchSpecialPacks = async () => {
    try {
      console.log('🔄 Fetching special packs...');
      // Add cache-busting parameter to ensure fresh data
      const timestamp = Date.now();
      const response = await apiRequest('GET', `/api/admin/special-packs?_t=${timestamp}`);
      if (response.ok) {
        const packs = await response.json();
        console.log('✅ Special packs fetched:', packs);
        setSpecialPools(packs);
    } else {
        console.error('❌ Failed to fetch special packs');
      }
    } catch (error: any) {
      console.error('❌ Error fetching special packs:', error);
    }
  };

  // Manual refresh function for all pack data
  const refreshAllPackData = async () => {
    console.log('🔄 Manually refreshing all pack data...');
    await Promise.all([
      fetchSpecialPacks(),
      fetchClassicPacks(),
      fetchMysteryPacks()
    ]);
    console.log('✅ All pack data refreshed');
  };

  // Fetch classic packs from API
  const fetchClassicPacks = async () => {
    try {
      // Add cache-busting parameter to ensure fresh data
      const timestamp = Date.now();
      const response = await apiRequest('GET', `/api/admin/classic-packs?_t=${timestamp}`);
      if (response.ok) {
        const packs = await response.json();
        console.log('🔄 Fetched fresh classic packs:', packs);
        setClassicPools(packs);
      } else {
        console.error('Failed to fetch classic packs');
      }
    } catch (error: any) {
      console.error('Error fetching classic packs:', error);
    }
  };

  // Raffle management functions
  const fetchRaffles = async () => {
    try {
      const response = await apiRequest("GET", "/api/admin/raffles");
      console.log('🔍 Admin fetchRaffles response:', response);
      const data = await response.json();
      console.log('🔍 Admin fetchRaffles parsed data:', data);
      if (data.success) {
        console.log('🔍 Admin setting raffles:', data.raffles);
        setRaffles(data.raffles);
      }
    } catch (error) {
      console.error('Error fetching raffles:', error);
    }
  };

  const handleRaffleImageUpload = async (file: File) => {
    setIsUploadingRaffleImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        setRaffleForm({...raffleForm, prizeImageUrl: result.url});
        setRaffleImageFile(file);
      } else {
        console.error('Image upload failed');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setIsUploadingRaffleImage(false);
    }
  };

  const handleCreateRaffle = async () => {
    try {
      // Create default prize for the raffle
      const defaultPrize = {
        position: 1,
        name: 'Mystery Prize',
        type: 'pack',
        value: '0'
      };

      const raffleData = {
        ...raffleForm,
        imageUrl: raffleForm.prizeImageUrl, // Map to new field name
        prizes: [defaultPrize], // Use new prizes array
        autoDraw: true // Default to auto-draw
      };
      
      const response = await apiRequest("POST", "/api/admin/raffles", raffleData);
      const data = await response.json();
      if (data.success) {
        toast({
          title: "Raffle Created Successfully!",
          description: `"${raffleForm.title}" has been created and is now active.`,
          variant: "default",
        });
        setShowRaffleDialog(false);
        setRaffleForm({
          title: '',
          description: '',
          prizeImageUrl: '',
          totalSlots: '',
          pricePerSlot: '',
          maxWinners: '1'
        });
        setRaffleImageFile(null);
        setRaffleImageMode('upload');
        fetchRaffles();
      }
    } catch (error) {
      console.error('Error creating raffle:', error);
      toast({
        title: "Failed to Create Raffle",
        description: "An error occurred while creating the raffle. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditRaffle = (raffle: any) => {
    setEditingRaffle(raffle);
    setRaffleForm({
      title: raffle.title,
      description: raffle.description || '',
      prizeImageUrl: raffle.imageUrl || '', // Map from new field name
      totalSlots: raffle.totalSlots.toString(),
      pricePerSlot: raffle.pricePerSlot,
      maxWinners: raffle.maxWinners.toString()
    });
    setShowRaffleDialog(true);
  };

  const handleUpdateRaffle = async () => {
    try {
      const updateData = {
        ...raffleForm,
        imageUrl: raffleForm.prizeImageUrl // Map to new field name
      };
      
      const response = await apiRequest("PUT", `/api/admin/raffles/${editingRaffle.id}`, updateData);
      const data = await response.json();
      if (data.success) {
        toast({
          title: "Raffle Updated Successfully!",
          description: `"${raffleForm.title}" has been updated.`,
          variant: "default",
        });
        setShowRaffleDialog(false);
        setEditingRaffle(null);
        setRaffleForm({
          title: '',
          description: '',
          prizeImageUrl: '',
          totalSlots: '',
          pricePerSlot: '',
          maxWinners: '1'
        });
        setRaffleImageFile(null);
        setRaffleImageMode('upload');
        fetchRaffles();
      }
    } catch (error) {
      console.error('Error updating raffle:', error);
      toast({
        title: "Failed to Update Raffle",
        description: "An error occurred while updating the raffle. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRaffle = async (raffleId: string) => {
    if (window.confirm('Are you sure you want to delete this raffle?')) {
      try {
        const response = await apiRequest("DELETE", `/api/admin/raffles/${raffleId}`);
        const data = await response.json();
        if (data.success) {
          toast({
            title: "Raffle Deleted Successfully!",
            description: "The raffle has been removed from the system.",
            variant: "default",
          });
          fetchRaffles();
        }
      } catch (error) {
        console.error('Error deleting raffle:', error);
        toast({
          title: "Failed to Delete Raffle",
          description: "An error occurred while deleting the raffle. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDrawWinners = async (raffleId: string) => {
    if (window.confirm('Are you sure you want to draw winners for this raffle?')) {
      try {
        const response = await apiRequest("POST", `/api/admin/raffles/${raffleId}/draw`);
        const data = await response.json();
        if (data.success) {
          toast({
            title: "Winners Drawn Successfully!",
            description: "The raffle winners have been selected and prizes have been distributed.",
            variant: "default",
          });
          fetchRaffles();
        }
      } catch (error) {
        console.error('Error drawing winners:', error);
        toast({
          title: "Failed to Draw Winners",
          description: "An error occurred while drawing winners. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleViewRaffle = (raffleId: string) => {
    // TODO: Implement raffle details view
    console.log('View raffle:', raffleId);
  };

  const handleEditRafflePrize = (raffle: any) => {
    setEditingRaffle(raffle);
    
    // Parse existing prizes or create default structure
    let prizes = [];
    if (raffle.prizes && Array.isArray(raffle.prizes)) {
      prizes = raffle.prizes;
    } else {
      // Legacy single prize format
      prizes = [{
        position: 1,
        name: raffle.prizeName || '',
        type: raffle.prizeType || 'pack',
        value: raffle.prizeValue || '',
        imageUrl: raffle.prizeImageUrl || ''
      }];
    }
    
    setPrizeEditForm({ prizes });
    setShowPrizeEditDialog(true);
  };

  // Helper functions for managing prizes
  const addPrize = () => {
    const newPosition = prizeEditForm.prizes.length + 1;
    setPrizeEditForm({
      prizes: [...prizeEditForm.prizes, { position: newPosition, name: '', type: 'pack', value: '', imageUrl: '' }]
    });
  };

  const removePrize = (index: number) => {
    if (prizeEditForm.prizes.length > 1) {
      const updatedPrizes = prizeEditForm.prizes.filter((_, i) => i !== index);
      // Reorder positions
      const reorderedPrizes = updatedPrizes.map((prize, i) => ({ ...prize, position: i + 1 }));
      setPrizeEditForm({ prizes: reorderedPrizes });
    }
  };

  const updatePrize = (index: number, field: string, value: string) => {
    const updatedPrizes = [...prizeEditForm.prizes];
    updatedPrizes[index] = { ...updatedPrizes[index], [field]: value };
    setPrizeEditForm({ prizes: updatedPrizes });
  };

  const handleUpdatePrize = async () => {
    try {
      console.log('🔍 Full prizeEditForm:', prizeEditForm);
      console.log('🔍 PrizeEditForm.prizes:', prizeEditForm.prizes);
      console.log('🔍 First prize object:', prizeEditForm.prizes[0]);
      console.log('🔍 First prize imageUrl:', prizeEditForm.prizes[0]?.imageUrl);
      console.log('🔍 Sending prize update data:', { prizes: prizeEditForm.prizes });
      const response = await apiRequest("PUT", `/api/admin/raffles/${editingRaffle.id}`, { prizes: prizeEditForm.prizes });
      const data = await response.json();
      if (data.success) {
        toast({
          title: "Prize Updated Successfully!",
          description: `The prize details for "${editingRaffle.title}" have been updated.`,
          variant: "default",
        });
        setShowPrizeEditDialog(false);
        setEditingRaffle(null);
        setPrizeEditForm({
          prizes: [{ position: 1, name: '', type: 'pack', value: '', imageUrl: '' }]
        });
        fetchRaffles();
      }
    } catch (error) {
      console.error('Error updating prize:', error);
      toast({
        title: "Failed to Update Prize",
        description: "An error occurred while updating the prize details. Please try again.",
        variant: "destructive",
      });
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

  // Mystery Pack Card Management Functions
  const handleAddCardToMysteryPack = async () => {
    if (!newCard.name || !newCard.imageUrl || !newCard.tier || !newCard.refundCredit) {
      alert('Please fill in all card details');
      return;
    }

    try {
      const pokeballPack = mysteryPacks.find(pack => pack.packType === 'pokeball') || mysteryPacks[0];
      if (!pokeballPack) {
        alert('No mystery pack found');
        return;
      }

      const response = await apiRequest('POST', `/api/admin/mystery-packs/${pokeballPack.id}/cards`, {
        cardName: newCard.name,
        cardImageUrl: newCard.imageUrl,
        cardTier: newCard.tier,
        refundCredit: parseInt(newCard.refundCredit) || 0,
        quantity: parseInt(newCard.quantity) || 1
      });

      if (response.ok) {
        // Reset form
        setNewCard({ name: '', imageUrl: '', tier: 'D', refundCredit: '', quantity: '1' });
        setShowAddCardDialog(false);
        
        // Refresh mystery pack cards
        fetchMysteryPackCards();
        alert('Card added to mystery pack successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to add card: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error adding card to mystery pack:', error);
      alert('Failed to add card to mystery pack. Please try again.');
    }
  };

  const handleRemoveCardFromMysteryPack = async (cardId: string) => {
    try {
      const pokeballPack = mysteryPacks.find(pack => pack.packType === 'pokeball') || mysteryPacks[0];
      if (!pokeballPack) {
        alert('No mystery pack found');
        return;
      }

      const response = await apiRequest('DELETE', `/api/admin/mystery-packs/${pokeballPack.id}/cards/${cardId}`);

      if (response.ok) {
        // Optimistically update the UI
        setMysteryPackCards(prev => prev.filter(card => card.id !== cardId));
        alert('Card removed from mystery pack successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to remove card: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error removing card from mystery pack:', error);
      alert('Failed to remove card from mystery pack. Please try again.');
    }
  };

  const handleUpdateMysteryPackCardQuantity = async (cardId: string, newQuantity: number) => {
    try {
      const pokeballPack = mysteryPacks.find(pack => pack.packType === 'pokeball') || mysteryPacks[0];
      if (!pokeballPack) {
        alert('No mystery pack found');
        return;
      }

      const response = await apiRequest('PATCH', `/api/admin/mystery-packs/${pokeballPack.id}/cards/${cardId}`, {
        quantity: newQuantity
      });

      if (response.ok) {
        // Optimistically update the UI
        setMysteryPackCards(prev => prev.map(card => 
          card.id === cardId ? { ...card, quantity: newQuantity } : card
        ));
        alert('Card quantity updated successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to update quantity: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error updating mystery pack card quantity:', error);
      alert('Failed to update card quantity. Please try again.');
    }
  };

  // Mystery Pack Edit Card Functions
  const handleEditMysteryCard = (card: any) => {
    setEditingMysteryCard(card);
    setMysteryEditCardForm({
      name: card.cardName,
      imageUrl: card.cardImageUrl,
      tier: card.cardTier,
      refundCredit: card.refundCredit.toString(),
      quantity: card.quantity.toString()
    });
    setShowMysteryEditCardDialog(true);
  };

  const handleUpdateMysteryCard = async () => {
    if (!editingMysteryCard) return;

    try {
      const pokeballPack = mysteryPacks.find(pack => pack.packType === 'pokeball') || mysteryPacks[0];
      if (!pokeballPack) {
        alert('No mystery pack found');
        return;
      }

      const response = await apiRequest('PATCH', `/api/admin/mystery-packs/${pokeballPack.id}/cards/${editingMysteryCard.id}`, {
        cardName: mysteryEditCardForm.name,
        cardImageUrl: mysteryEditCardForm.imageUrl,
        cardTier: mysteryEditCardForm.tier,
        refundCredit: parseInt(mysteryEditCardForm.refundCredit) || 0,
        quantity: parseInt(mysteryEditCardForm.quantity) || 1
      });

      if (response.ok) {
        // Refresh mystery pack cards
        fetchMysteryPackCards();
        setShowMysteryEditCardDialog(false);
        alert('Card updated successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to update card: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error updating mystery pack card:', error);
      alert('Failed to update card. Please try again.');
    }
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
          <div className="flex items-center justify-center gap-4 mb-8">
            <h1 className="text-3xl font-bold font-gaming">Admin Dashboard</h1>
            <Button 
              onClick={refreshAllPackData}
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Data
            </Button>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-6xl mx-auto grid-cols-5 mb-8">
              <TabsTrigger value="overview" data-testid="tab-overview">
                <TrendingUp className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="users" data-testid="tab-users">
                <Users className="w-4 h-4 mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger value="manage" data-testid="tab-manage">
                <Package className="w-4 h-4 mr-2" />
                Manage
              </TabsTrigger>
              <TabsTrigger value="raffles" data-testid="tab-raffles">
                <Gift className="w-4 h-4 mr-2" />
                Raffles
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
                    <div className="text-2xl font-bold">
                      {isLoadingStats ? '...' : (adminStats?.totalUsers || 0)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="gaming-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      RM {isLoadingStats ? '...' : (adminStats?.totalRevenue || '0.00')}
                    </div>
                  </CardContent>
                </Card>

                <Card className="gaming-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Top Spender</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      RM {isLoadingStats ? '...' : (adminStats?.topSpender?.totalSpent || '0.00')}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isLoadingStats ? '...' : (adminStats?.topSpender?.email || 'No data')}
                    </p>
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
                    <div className="text-2xl font-bold">
                      {isLoadingStats ? '...' : (adminStats?.recentSS?.cardName || 'No SS cards')}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isLoadingStats ? '...' : (adminStats?.recentSS?.pulledBy || 'No data')}
                    </p>
                  </CardContent>
                </Card>

                <Card className="gaming-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Recent SSS Card</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {isLoadingStats ? '...' : (adminStats?.recentSSS?.cardName || 'No SSS cards')}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isLoadingStats ? '...' : (adminStats?.recentSSS?.pulledBy || 'No data')}
                    </p>
                  </CardContent>
                </Card>

                <Card className="gaming-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Daily P&L</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {isLoadingStats ? '...' : `+RM ${adminStats?.dailyPL || '0.00'}`}
                    </div>
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
                    <div className="text-2xl font-bold text-green-600">
                      {isLoadingStats ? '...' : `+RM ${adminStats?.monthlyPL || '0.00'}`}
                    </div>
                    <p className="text-xs text-muted-foreground">This Month</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users">
              <Card className="gaming-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                  <CardTitle>User Management</CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={fetchUsers}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Refresh Users
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                    {isLoadingUsers ? (
                      <div className="text-center py-8">
                        <div className="text-muted-foreground">Loading users...</div>
                      </div>
                    ) : (
                    <div className="space-y-4">
                    {users.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                              <Users className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-semibold">{user.email || user.username}</div>
                              <div className="text-sm text-muted-foreground">
                                Credits: {user.credits} • Spent: RM {user.totalSpent || '0.00'}
                              </div>
                            <div className="text-xs text-muted-foreground">
                              Joined: {new Date(user.createdAt).toLocaleDateString()}
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
                              onClick={() => refreshUserData(user.id)}
                              title="Refresh user data (useful when credits are updated directly in database)"
                            >
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Refresh
                            </Button>
                            
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
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Manage Tab */}
            <TabsContent value="manage">
              <Tabs value={manageSection} onValueChange={(value) => setManageSection(value as "classic" | "special" | "mystery")} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="classic">
                    <Package className="w-4 h-4 mr-2" />
                    Classic
                  </TabsTrigger>
                  <TabsTrigger value="special">
                    <Package className="w-4 h-4 mr-2" />
                    Special
                  </TabsTrigger>
                  <TabsTrigger value="mystery">
                    <Package className="w-4 h-4 mr-2" />
                    Mystery
                  </TabsTrigger>
                </TabsList>

                {/* Classic Pack Section */}
                <TabsContent value="classic">
                  <div className="space-y-6">
                    {/* Classic Packs Display */}
                    <Card className="gaming-card">
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle>Classic Packs</CardTitle>
                          <Button onClick={() => setShowAddClassicDialog(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add
                      </Button>
                    </div>
                        </CardHeader>
                        <CardContent>

                          {classicPools.length === 0 ? (
                            <div className="text-center py-8">
                              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">No classic packs created</h3>
                              <p className="text-muted-foreground">
                              Click "Add" to create your first classic pack
                              </p>
                            </div>
                          ) : (
                          <div className="space-y-4">
                              {classicPools.map((pool) => {
                                const filteredCards = pool.cards || [];
                                return (
                              <div key={pool.id} className="border rounded-lg p-4">
                                <div className="space-y-4">
                                  {/* Pack Header */}
                                  <div className="flex gap-4">
                                      <img
                                        src={pool.imageUrl || pool.image}
                                        alt={pool.name}
                                      className="w-20 h-20 object-cover rounded flex-shrink-0"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
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
                                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                      <Button
                                      onClick={() => handleEditClassicPrize(pool)}
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                      >
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit Prize
                                      </Button>
                                      <Button
                                      onClick={() => handleViewClassicPrize(pool)}
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                      >
                                      <Eye className="w-4 h-4 mr-2" />
                                      View Prize
                                      </Button>
                                      <Button
                                        onClick={() => handleEditClassicContent(pool)}
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                      >
                                        <Package className="w-4 h-4 mr-2" />
                                      Edit Content
                                      </Button>
                                      <Button
                                        onClick={() => handleDeleteClassicPool(pool.id)}
                                        variant="outline"
                                        size="sm"
                                      className="w-full"
                                      >
                                        <X className="w-4 h-4 mr-2" />
                                        Remove Content
                                      </Button>
                              </div>
                                </div>
                              </div>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                              </div>
                </TabsContent>

                {/* Special Pack Section */}
                <TabsContent value="special">
                  <div className="space-y-6">
                    {/* Special Packs Display */}
                      <Card className="gaming-card">
                        <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle>Special Packs</CardTitle>
                          <Button onClick={() => setShowAddPoolDialog(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add
                          </Button>
                          </div>
                        </CardHeader>
                        <CardContent>

                        {specialPools.length === 0 ? (
                          <div className="text-center py-8">
                            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">No special packs created</h3>
                            <p className="text-muted-foreground">
                              Click "Add" to create your first special pack
                            </p>
                                  </div>
                          ) : (
                          <div className="space-y-4">
                              {specialPools.map((pool) => {
                                const filteredCards = pool.cards || [];
                                return (
                              <div key={pool.id} className="border rounded-lg p-4">
                                <div className="space-y-4">
                                  {/* Pack Header */}
                                  <div className="flex gap-4">
                                    <img
                                      src={pool.imageUrl || pool.image}
                                      alt={pool.name}
                                      className="w-20 h-20 object-cover rounded flex-shrink-0"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                      }}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium text-lg mb-1">{pool.name}</h4>
                                      <p className="text-sm text-muted-foreground mb-2">{pool.description}</p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                                        <div>Price: ${pool.price}</div>
                                        <div>Cards Added: {pool.cards?.length || 0}</div>
                                    </div>
                                  </div>
                                </div>
                                  
                                  {/* Action Buttons */}
                                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                  <Button
                                      onClick={() => handleEditPrize(pool)}
                                      variant="outline"
                                    size="sm"
                                      className="w-full"
                                    >
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit Prize
                                    </Button>
                                    <Button
                                      onClick={() => handleViewPrize(pool)}
                                    variant="outline"
                                      size="sm"
                                      className="w-full"
                                  >
                                      <Eye className="w-4 h-4 mr-2" />
                                      View Prize
                                  </Button>
                                  <Button
                                      onClick={() => handleEditContent(pool)}
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
                                      Remove Content
                                  </Button>
                                </div>
                              </div>
                                
                          </div>
                                );
                              })}
                          </div>
                        )}
                        </CardContent>
                      </Card>
                  </div>
                </TabsContent>

                {/* Mystery Pack Section */}
                <TabsContent value="mystery">
                  <div className="space-y-6">
                    {/* Mystery Pack Management */}
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold">Mystery Pack Management</h2>
                    </div>

                    {/* Mystery Pack Cards */}
                      <Card className="gaming-card">
                        <CardHeader>
                          <CardTitle>Mystery Pack Prize Pool</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {mysteryPackCards.length === 0 ? (
                            <div className="text-center py-8">
                              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                              <h3 className="text-lg font-medium mb-2">No cards in mystery pack prize pool</h3>
                              <p className="text-muted-foreground mb-4">
                                Add cards from inventory to build your mystery pack prize pool
                              </p>
                              <Button 
                                onClick={() => setShowAddCardDialog(true)}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add First Card
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="space-y-4">
                                {/* Header Section */}
                                <div className="flex justify-between items-center p-4 bg-gray-800 rounded-lg border border-gray-700">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-600 rounded-lg">
                                      <Package className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                      <h3 className="font-semibold text-white">Mystery Pack Cards</h3>
                                      <p className="text-sm text-gray-300">
                                        {mysteryPackCards.length} card{mysteryPackCards.length !== 1 ? 's' : ''} total
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    onClick={() => setShowAddCardDialog(true)}
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Card
                                  </Button>
                                </div>

                              </div>
                              
                              {/* Cards List */}
                              {mysteryPackCards.length === 0 ? (
                                <div className="text-center py-8">
                                  <Package className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                                  <h3 className="text-lg font-medium text-gray-300 mb-2">No cards in mystery pack</h3>
                                  <p className="text-gray-500 mb-4">Add cards from inventory to build your mystery pack prize pool</p>
                                  {mysteryPackCards.length === 0 && (
                                    <Button
                                      onClick={() => setShowAddCardDialog(true)}
                                      className="bg-blue-600 hover:bg-blue-700"
                                    >
                                      <Plus className="w-4 h-4 mr-2" />
                                      Add First Card
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                mysteryPackCards.map((card) => (
                                <div key={card.id} className="bg-gray-900 border border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                                  <div className="flex items-start gap-4">
                                    {/* Card Image */}
                                    <div className="flex-shrink-0">
                                      <img
                                        src={card.cardImageUrl}
                                        alt={card.cardName}
                                        className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                        }}
                                      />
                                    </div>
                                    
                                    {/* Card Information */}
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-lg font-semibold text-white mb-2 truncate">
                                        {card.cardName}
                                      </h4>
                                      
                                      <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div className="flex flex-col">
                                          <span className="text-gray-400 font-medium">Tier</span>
                                          <Badge 
                                            variant="secondary" 
                                            className={`w-fit ${
                                              card.cardTier === 'D' ? 'bg-gray-100 text-gray-800' :
                                              card.cardTier === 'C' ? 'bg-blue-100 text-blue-800' :
                                              card.cardTier === 'B' ? 'bg-green-100 text-green-800' :
                                              card.cardTier === 'A' ? 'bg-yellow-100 text-yellow-800' :
                                              card.cardTier === 'S' ? 'bg-orange-100 text-orange-800' :
                                              card.cardTier === 'SS' ? 'bg-purple-100 text-purple-800' :
                                              'bg-red-100 text-red-800'
                                            }`}
                                          >
                                            {card.cardTier}
                                          </Badge>
                                        </div>
                                        
                                        <div className="flex flex-col">
                                          <span className="text-gray-400 font-medium">Credits</span>
                                          <span className="text-white font-semibold">{card.refundCredit}</span>
                                        </div>
                                        
                                        <div className="flex flex-col">
                                          <span className="text-gray-400 font-medium">Quantity</span>
                                          <span className="text-white font-semibold">{card.quantity}</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    <div className="flex flex-col gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEditMysteryCard(card)}
                                        className="p-2 h-8 w-8"
                                        title="Edit card"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          if (confirm(`Are you sure you want to remove ${card.cardName} from the mystery pack?`)) {
                                            handleRemoveCardFromMysteryPack(card.id);
                                          }
                                        }}
                                        className="p-2 h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                        title="Remove card"
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))
                              )}
                                </div>
                          )}
                        </CardContent>
                      </Card>

              </div>
            </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Raffles Tab */}
            <TabsContent value="raffles">
              <div className="space-y-6">
                {/* Raffle Management Header */}
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Raffle Management</h2>
                    <p className="text-gray-400">Create and manage raffles for your community</p>
                  </div>
                  <Button
                    onClick={() => setShowRaffleDialog(true)}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Raffle
                  </Button>
                </div>

                {/* Active Raffles */}
                <Card className="gaming-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gift className="w-5 h-5" />
                      Active Raffles
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {(() => {
                        console.log('🔍 Admin current raffles state:', raffles);
                        console.log('🔍 Admin raffles length:', raffles.length);
                        return raffles.length === 0;
                      })() ? (
                        <div className="text-center py-8 text-gray-400">
                          <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No active raffles found</p>
                          <p className="text-sm">Create your first raffle to get started</p>
                        </div>
                      ) : (
                        <div className="grid gap-4">
                          {raffles.map((raffle) => (
                            <div key={raffle.id} className="border border-gray-600 rounded-lg p-4 bg-gray-800/50 raffle-card">
                              <div className="flex justify-between items-start mb-3 gap-4">
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-lg font-semibold text-white text-wrap-safe">{raffle.title}</h3>
                                  <p className="text-gray-400 text-sm text-wrap-safe">{raffle.description}</p>
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                  <Badge variant={raffle.status === 'active' ? 'default' : 'secondary'}>
                                    {raffle.status}
                                  </Badge>
                                  {raffle.autoDraw && (
                                    <Badge variant="outline">Auto Draw</Badge>
                                  )}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                                <div className="min-w-0">
                                  <p className="text-gray-400 text-sm">Prize</p>
                                  <p className="text-white font-medium text-wrap-safe">
                                    {raffle.prizes && raffle.prizes.length > 0 ? raffle.prizes[0].name : (raffle.prizeName || 'No Prize')}
                                  </p>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-gray-400 text-sm">Slots</p>
                                  <p className="text-white font-medium">{raffle.filledSlots}/{raffle.totalSlots}</p>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-gray-400 text-sm">Price per Slot</p>
                                  <p className="text-white font-medium">{raffle.pricePerSlot} credits</p>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-gray-400 text-sm">Max Winners</p>
                                  <p className="text-white font-medium">{raffle.maxWinners}</p>
                                </div>
                              </div>

                              {/* Winner Information for Completed Raffles */}
                              {raffle.status === 'completed' && raffle.winners && raffle.winners.length > 0 && (
                                <div className="border-t border-gray-600 pt-3 mb-3">
                                  <h4 className="text-white font-semibold mb-2 flex items-center">
                                    <Trophy className="w-4 h-4 text-yellow-400 mr-2" />
                                    Winners
                                  </h4>
                                  <div className="space-y-2">
                                    {raffle.winners.map((winner: any, index: number) => (
                                      <div key={winner.id} className="flex items-center justify-between bg-gray-700/50 rounded-lg p-3">
                                        <div className="flex items-center space-x-3">
                                          <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-black font-bold text-sm">
                                            {winner.prizePosition === 1 ? '1st' : winner.prizePosition === 2 ? '2nd' : winner.prizePosition === 3 ? '3rd' : `${winner.prizePosition}th`}
                                          </div>
                                          {winner.prizeImageUrl && (
                                            <img
                                              src={winner.prizeImageUrl}
                                              alt={winner.prizeName}
                                              className="w-12 h-16 object-cover rounded border border-gray-600"
                                              onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                              }}
                                            />
                                          )}
                                          <div>
                                            <p className="text-white font-medium">{winner.winnerUsername}</p>
                                            <p className="text-gray-400 text-sm">Won: {winner.prizeName}</p>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-gray-400 text-xs">
                                            {new Date(winner.wonAt).toLocaleString()}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="flex justify-between items-center">
                                <div className="text-sm text-gray-400">
                                  Created: {new Date(raffle.createdAt).toLocaleDateString()}
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditRaffle(raffle)}
                                    title="Edit Content"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditRafflePrize(raffle)}
                                    className="text-yellow-400 border-yellow-400 hover:bg-yellow-400/10"
                                    title="Edit Prize"
                                  >
                                    <Gift className="w-4 h-4" />
                                  </Button>
                                  {raffle.status === 'active' && raffle.filledSlots >= raffle.totalSlots && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDrawWinners(raffle.id)}
                                      className="text-green-400 border-green-400 hover:bg-green-400/10"
                                      title="Draw Winners"
                                    >
                                      <Trophy className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteRaffle(raffle.id)}
                                    title="Remove Content"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
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
                    {isLoadingSettings ? (
                      <div className="text-center py-8">
                        <div className="text-muted-foreground">Loading settings...</div>
                      </div>
                    ) : systemSettings.length === 0 ? (
                      <div className="text-center py-8">
                        <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No System Settings</h3>
                        <p className="text-muted-foreground">No system settings configured yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {systemSettings.map((setting) => (
                          <div key={setting.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                            <div className="flex-1">
                              <div className="font-medium">{setting.settingKey}</div>
                        <div className="text-sm text-muted-foreground">
                                {setting.description || 'No description available'}
                        </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Last updated: {new Date(setting.updatedAt).toLocaleString()}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">
                                {setting.settingValue ? 'Enabled' : 'Disabled'}
                              </span>
                      <Button
                                variant={setting.settingValue ? "destructive" : "default"}
                                size="sm"
                                onClick={() => updateSystemSetting(setting.settingKey, !setting.settingValue)}
                              >
                                {setting.settingValue ? 'Disable' : 'Enable'}
                      </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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


        {/* Add Content Dialog */}
        <Dialog open={showAddPoolDialog} onOpenChange={setShowAddPoolDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
              <DialogTitle>Create New Special Pack</DialogTitle>
                <DialogDescription>
                Fill in the pack information to create a new special pack. You can add cards to the prize pool after creation.
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

                <ImageUpload
                    value={newPool.image}
                    onChange={(value) => {
                      console.log('🖼️ ImageUpload onChange called with:', value);
                      setNewPool({ ...newPool, image: value });
                    }}
                    placeholder="https://example.com/pack-image.jpg"
                    label="Pack Image URL"
                    id="poolImage"
                  required
                />

                  <div>
                    <Label htmlFor="poolPrice">Price ($)</Label>
                  <Input
                      id="poolPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newPool.price === '0' ? '' : newPool.price}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNewPool({ ...newPool, price: value === '' ? '0' : value });
                      }}
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
                      onChange={(e) => {
                        const value = e.target.value;
                        setNewPool({ ...newPool, totalCards: value });
                      }}
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
                  onClick={() => {
                    console.log('🔄 Special pack button clicked, current form state:', newPool);
                    handleAddPool();
                  }}
                  className="mt-4"
                  disabled={(() => {
                    const isValid = !newPool.name.trim() || !newPool.image.trim() || !newPool.price.trim() || !newPool.totalCards.trim() || !newPool.description.trim();
                    console.log('🔄 Special pack form validation:', {
                      name: !!newPool.name.trim(),
                      image: !!newPool.image.trim(),
                      price: !!newPool.price.trim(),
                      totalCards: !!newPool.totalCards.trim(),
                      description: !!newPool.description.trim(),
                      isValid: !isValid
                    });
                    return isValid;
                  })()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Pack
                </Button>
                  </div>

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

        {/* Add Classic Pack Dialog */}
        <Dialog open={showAddClassicDialog} onOpenChange={setShowAddClassicDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
              <DialogTitle>Create New Classic Pack</DialogTitle>
              <DialogDescription>
                Fill in the pack information to create a new classic pack. You can add cards to the prize pool after creation.
              </DialogDescription>
              </DialogHeader>
              
            <div className="space-y-6">
              {/* Create New Classic Pack Section */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-4">Create New Classic Pack</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="classicPoolName">Pack Name</Label>
                    <Input
                      id="classicPoolName"
                      value={newPool.name}
                      onChange={(e) => setNewPool({ ...newPool, name: e.target.value })}
                      placeholder="Enter pack name"
                      required
                    />
                </div>
                
                  <ImageUpload
                    value={newPool.image}
                    onChange={(value) => {
                      console.log('🖼️ Classic ImageUpload onChange called with:', value);
                      setNewPool({ ...newPool, image: value });
                    }}
                    placeholder="https://example.com/pack-image.jpg"
                    label="Pack Image URL"
                    id="classicPoolImage"
                    required
                  />
                  
                  <div>
                    <Label htmlFor="classicPoolPrice">Price ($)</Label>
                    <Input
                      id="classicPoolPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newPool.price === '0' ? '' : newPool.price}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNewPool({ ...newPool, price: value === '' ? '0' : value });
                      }}
                      placeholder="0.00"
                      required
                    />
                      </div>
                  
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="classicPoolDescription">Description</Label>
                    <Input
                      id="classicPoolDescription"
                      value={newPool.description}
                      onChange={(e) => setNewPool({ ...newPool, description: e.target.value })}
                      placeholder="Enter pack description"
                      required
                    />
                </div>
                </div>
                <Button 
                  onClick={() => {
                    console.log('🔄 Classic pack button clicked, current form state:', newPool);
                    handleAddClassicPool();
                  }}
                  className="mt-4"
                  disabled={(() => {
                    const isValid = !newPool.name.trim() || !newPool.image.trim() || !newPool.price.trim() || !newPool.description.trim();
                    console.log('🔄 Classic pack form validation:', {
                      name: !!newPool.name.trim(),
                      image: !!newPool.image.trim(),
                      price: !!newPool.price.trim(),
                      description: !!newPool.description.trim(),
                      isValid: !isValid
                    });
                    return isValid;
                  })()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Classic Pack
                </Button>
              </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                  setShowAddClassicDialog(false);
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
              <DialogTitle>
                {classicPools.some(pool => pool.id === editingPool?.id) ? 'Edit Classic Pack' : 'Edit Special Pack'}
              </DialogTitle>
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

                  <ImageUpload
                  value={editingPool.image}
                  onChange={(value) => setEditingPool({ ...editingPool, image: value })}
                  placeholder="https://example.com/pack-image.jpg"
                  label="Pack Image URL"
                  id="editPoolImage"
                  required
                />

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
                  
                  {/* Only show Total Cards for Special Packs */}
                  {!classicPools.some(pool => pool.id === editingPool.id) && (
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
                  )}
                  
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
                onClick={classicPools.some(pool => pool.id === editingPool?.id) ? handleUpdateClassicPool : handleUpdatePool}
                disabled={!editingPool?.name?.trim() || !editingPool?.image?.trim() || !editingPool?.description?.trim()}
                  >
                Update Pack
                  </Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>

        {/* Edit Prize Dialog */}
        <Dialog open={showEditContentDialog} onOpenChange={(open) => {
          if (!open) {
            handleCancelEditContent();
          }
        }}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
              <DialogTitle>Edit Pack Prizes - {editingContentPool?.name}</DialogTitle>
                <DialogDescription>
                Add or remove prize cards from this special pack and set their quantities.
                </DialogDescription>
              </DialogHeader>
              
            {editingContentPool && (
              <div className="space-y-6">
                {/* Add Card Section */}
              <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Add Prize Cards</h3>
                    <Button onClick={() => setShowAddCardDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Card
                    </Button>
                  </div>
                    <p className="text-sm text-muted-foreground">
                    Add new cards to this pack with all required information including name, image, tier, refund credit, and quantity.
                  </p>
                          </div>
                          
                {/* Current Prize Cards */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Current Prize Cards ({editingContentPool.cards.length})</h3>
                  </div>
                  
                  {/* Search and Filter Controls */}
                  <div className="flex gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search cards by name..."
                        value={editPrizeSearchTerm}
                        onChange={(e) => setEditPrizeSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-400" />
                      <select
                        className="flex h-10 w-40 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={editPrizeTierFilter}
                        onChange={(e) => setEditPrizeTierFilter(e.target.value)}
                      >
                        <option value="all">All Tiers</option>
                        <option value="D">D (Common)</option>
                        <option value="C">C (Uncommon)</option>
                        <option value="B">B (Rare)</option>
                        <option value="A">A (Super Rare)</option>
                        <option value="S">S (Ultra Rare)</option>
                        <option value="SS">SS (Secret Rare)</option>
                        <option value="SSS">SSS (Ultimate Rare)</option>
                      </select>
                    </div>
                    {(editPrizeSearchTerm || editPrizeTierFilter !== 'all') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditPrizeSearchTerm('');
                          setEditPrizeTierFilter('all');
                        }}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  {editingContentPool.cards.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No prize cards in this pack yet.</p>
                  ) : (() => {
                    const filteredCards = filterCardsForEditPrize(editingContentPool.cards);
                    return filteredCards.length === 0 ? (
                      <div className="text-center py-8">
                        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No cards match your search</h3>
                        <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-60 overflow-y-auto">
                        {filteredCards.map((card: any) => (
                        <div key={card.id} className="flex items-center gap-3 p-3 border rounded-lg">
                          <img
                            src={card.imageUrl}
                            alt={card.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{card.name}</p>
                            <p className="text-xs text-muted-foreground">{card.credits} credits</p>
                            <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs text-muted-foreground">Qty: {card.quantity}</p>
                          </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleEditCard(card)}
                              size="sm"
                              variant="outline"
                              className="h-6 px-2"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          <Button
                            onClick={() => handleRemoveCardFromContent(card.id)}
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 h-6 px-2"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                          </div>
                        </div>
                        ))}
                      </div>
                    );
                  })()}
                    </div>

              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={handleCancelEditContent}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Card Dialog */}
        <Dialog open={showAddCardDialog} onOpenChange={setShowAddCardDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Add New Card</DialogTitle>
              <DialogDescription>
                Add a new card to the pack with all required information.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="cardName" className="text-sm font-medium">Card Name</Label>
                <Input
                  id="cardName"
                  value={newCard.name}
                  onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                  placeholder="Enter card name"
                  className="w-full"
                  required
                />
              </div>

              <ImageUpload
                value={newCard.imageUrl}
                onChange={(value) => setNewCard({ ...newCard, imageUrl: value })}
                placeholder="https://example.com/card-image.jpg"
                label="Image URL"
                id="imageUrl"
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="refundCredit" className="text-sm font-medium">Refund Credit</Label>
                  <Input
                    id="refundCredit"
                    type="number"
                    min="0"
                    value={newCard.refundCredit}
                    onChange={(e) => {
                      setNewCard({ ...newCard, refundCredit: e.target.value });
                    }}
                    placeholder="Enter refund credit"
                    className="w-full"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tier" className="text-sm font-medium">Tier</Label>
                  <select
                    id="tier"
                    value={newCard.tier}
                    onChange={(e) => setNewCard({ ...newCard, tier: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900"
                    required
                  >
                    <option value="D">D</option>
                    <option value="C">C</option>
                    <option value="B">B</option>
                    <option value="A">A</option>
                    <option value="S">S</option>
                    <option value="SS">SS</option>
                    <option value="SSS">SSS</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-sm font-medium">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={newCard.quantity}
                  onChange={(e) => {
                    setNewCard({ ...newCard, quantity: e.target.value });
                  }}
                  placeholder="Enter quantity"
                  className="w-full"
                  required
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddCardDialog(false);
                  setNewCard({ name: '', imageUrl: '', tier: 'D', refundCredit: '', quantity: '' });
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (activeTab === 'manage' && manageSection === 'mystery') {
                    handleAddCardToMysteryPack();
                  } else {
                    handleAddCard();
                  }
                }} 
                className="flex-1"
              >
                Add Card
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Card Dialog */}
        <Dialog open={showEditCardDialog} onOpenChange={setShowEditCardDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Edit Card</DialogTitle>
              <DialogDescription>
                Update the card details and information.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="editCardName" className="text-sm font-medium">Card Name</Label>
                <Input
                  id="editCardName"
                  value={editCardForm.name}
                  onChange={(e) => setEditCardForm({ ...editCardForm, name: e.target.value })}
                  placeholder="Enter card name"
                  className="w-full"
                  required
                />
              </div>
              
              <ImageUpload
                value={editCardForm.imageUrl}
                onChange={(value) => setEditCardForm({ ...editCardForm, imageUrl: value })}
                placeholder="https://example.com/card-image.jpg"
                label="Image URL"
                id="editImageUrl"
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editRefundCredit" className="text-sm font-medium">Refund Credit</Label>
                  <Input
                    id="editRefundCredit"
                    type="number"
                    min="0"
                    value={editCardForm.refundCredit}
                    onChange={(e) => {
                      setEditCardForm({ ...editCardForm, refundCredit: e.target.value });
                    }}
                    placeholder="Enter refund credit"
                    className="w-full"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editTier" className="text-sm font-medium">Tier</Label>
                  <select
                    id="editTier"
                    value={editCardForm.tier}
                    onChange={(e) => setEditCardForm({ ...editCardForm, tier: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900"
                    required
                  >
                    <option value="D">D</option>
                    <option value="C">C</option>
                    <option value="B">B</option>
                    <option value="A">A</option>
                    <option value="S">S</option>
                    <option value="SS">SS</option>
                    <option value="SSS">SSS</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editQuantity" className="text-sm font-medium">Quantity</Label>
                <Input
                  id="editQuantity"
                  type="number"
                  min="1"
                  value={editCardForm.quantity}
                  onChange={(e) => {
                    setEditCardForm({ ...editCardForm, quantity: e.target.value });
                  }}
                  placeholder="Enter quantity"
                  className="w-full"
                  required
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowEditCardDialog(false);
                  setEditingCard(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateCard} className="flex-1">
                Update Card
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Mystery Pack Edit Card Dialog */}
        <Dialog open={showMysteryEditCardDialog} onOpenChange={setShowMysteryEditCardDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Edit Mystery Pack Card</DialogTitle>
              <DialogDescription>
                Update the card details and information in the mystery pack.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="mysteryEditCardName" className="text-sm font-medium">Card Name</Label>
                <Input
                  id="mysteryEditCardName"
                  value={mysteryEditCardForm.name}
                  onChange={(e) => setMysteryEditCardForm({ ...mysteryEditCardForm, name: e.target.value })}
                  placeholder="Enter card name"
                  className="w-full"
                  required
                />
              </div>
              
              <ImageUpload
                value={mysteryEditCardForm.imageUrl}
                onChange={(value) => setMysteryEditCardForm({ ...mysteryEditCardForm, imageUrl: value })}
                placeholder="https://example.com/card-image.jpg"
                label="Image URL"
                id="mysteryEditImageUrl"
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mysteryEditRefundCredit" className="text-sm font-medium">Refund Credit</Label>
                  <Input
                    id="mysteryEditRefundCredit"
                    type="number"
                    min="0"
                    value={mysteryEditCardForm.refundCredit}
                    onChange={(e) => {
                      setMysteryEditCardForm({ ...mysteryEditCardForm, refundCredit: e.target.value });
                    }}
                    placeholder="Enter refund credit"
                    className="w-full"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mysteryEditTier" className="text-sm font-medium">Tier</Label>
                  <select
                    id="mysteryEditTier"
                    value={mysteryEditCardForm.tier}
                    onChange={(e) => setMysteryEditCardForm({ ...mysteryEditCardForm, tier: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900"
                    required
                  >
                    <option value="D">D</option>
                    <option value="C">C</option>
                    <option value="B">B</option>
                    <option value="A">A</option>
                    <option value="S">S</option>
                    <option value="SS">SS</option>
                    <option value="SSS">SSS</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mysteryEditQuantity" className="text-sm font-medium">Quantity</Label>
                <Input
                  id="mysteryEditQuantity"
                  type="number"
                  min="1"
                  value={mysteryEditCardForm.quantity}
                  onChange={(e) => {
                    setMysteryEditCardForm({ ...mysteryEditCardForm, quantity: e.target.value });
                  }}
                  placeholder="Enter quantity"
                  className="w-full"
                  required
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowMysteryEditCardDialog(false);
                  setEditingMysteryCard(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateMysteryCard} className="flex-1">
                Update Card
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Prize Dialog */}
        <Dialog open={showViewPrizeDialog} onOpenChange={(open) => {
          if (!open) {
            handleCancelViewPrize();
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>View Pack Prizes - {viewingPrizePool?.name}</DialogTitle>
              <DialogDescription>
                View all prize cards currently in this special pack.
              </DialogDescription>
            </DialogHeader>
            
            {viewingPrizePool && (
              <div className="space-y-6">
                {/* Current Prize Cards */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Prize Cards ({viewingPrizePool.cards.length})</h3>
                  {viewingPrizePool.cards.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No prize cards in this pack yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {viewingPrizePool.cards.map((card) => (
                        <div key={card.id} className="flex items-center gap-3 p-3 border rounded-lg">
                          <img
                            src={card.imageUrl}
                            alt={card.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{card.name}</p>
                            <p className="text-xs text-muted-foreground">{card.credits} credits</p>
                            <p className="text-xs text-muted-foreground">Quantity: {card.quantity}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
              </div>
            )}

              <DialogFooter>
              <Button variant="outline" onClick={handleCancelViewPrize}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        {/* Raffle Dialog */}
        <Dialog open={showRaffleDialog} onOpenChange={setShowRaffleDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingRaffle ? 'Edit Raffle' : 'Create New Raffle'}
              </DialogTitle>
              <DialogDescription>
                {editingRaffle ? 'Update raffle details' : 'Set up a new raffle for your community'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={raffleForm.title}
                  onChange={(e) => setRaffleForm({...raffleForm, title: e.target.value})}
                  placeholder="Raffle title"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={raffleForm.description}
                  onChange={(e) => setRaffleForm({...raffleForm, description: e.target.value})}
                  placeholder="Raffle description"
                />
              </div>

              <div>
                <Label htmlFor="prizeImage">Prize Image</Label>
                <div className="space-y-3">
                  {/* Mode Selection */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={raffleImageMode === 'upload' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRaffleImageMode('upload')}
                      className="text-xs"
                    >
                      Upload File
                    </Button>
                    <Button
                      type="button"
                      variant={raffleImageMode === 'url' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRaffleImageMode('url')}
                      className="text-xs"
                    >
                      Use URL
                    </Button>
                  </div>

                  {/* Upload Mode */}
                  {raffleImageMode === 'upload' && (
                    <div>
                      <input
                        type="file"
                        id="prizeImage"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleRaffleImageUpload(file);
                          }
                        }}
                        className="w-full p-2 border border-gray-600 rounded-md bg-gray-800 text-white"
                      />
                      {isUploadingRaffleImage && (
                        <p className="text-sm text-gray-400 mt-1">Uploading image...</p>
                      )}
                    </div>
                  )}

                  {/* URL Mode */}
                  {raffleImageMode === 'url' && (
                    <div>
                      <Input
                        id="prizeImageUrl"
                        value={raffleForm.prizeImageUrl}
                        onChange={(e) => setRaffleForm({...raffleForm, prizeImageUrl: e.target.value})}
                        placeholder="Enter image URL"
                      />
                    </div>
                  )}

                  {/* Image Preview */}
                  {raffleForm.prizeImageUrl && (
                    <div className="mt-2">
                      <img 
                        src={raffleForm.prizeImageUrl} 
                        alt="Prize preview" 
                        className="w-20 h-20 object-cover rounded border border-gray-600"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="totalSlots">Total Slots *</Label>
                  <Input
                    id="totalSlots"
                    type="number"
                    value={raffleForm.totalSlots}
                    onChange={(e) => setRaffleForm({...raffleForm, totalSlots: e.target.value})}
                    placeholder="100"
                  />
                </div>
                <div>
                  <Label htmlFor="pricePerSlot">Price per Slot *</Label>
                  <Input
                    id="pricePerSlot"
                    type="number"
                    value={raffleForm.pricePerSlot}
                    onChange={(e) => setRaffleForm({...raffleForm, pricePerSlot: e.target.value})}
                    placeholder="100"
                  />
                </div>
                <div>
                  <Label htmlFor="maxWinners">Max Winners</Label>
                  <Input
                    id="maxWinners"
                    type="number"
                    value={raffleForm.maxWinners}
                    onChange={(e) => setRaffleForm({...raffleForm, maxWinners: e.target.value})}
                    placeholder="1"
                  />
                </div>
              </div>

              {!editingRaffle && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-sm text-blue-300">
                    💡 <strong>Note:</strong> After creating the raffle, you can edit the prize details (name, type, value) by clicking the edit button on the raffle card.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowRaffleDialog(false);
                setEditingRaffle(null);
                setRaffleForm({
                  title: '',
                  description: '',
                  prizeImageUrl: '',
                  totalSlots: '',
                  pricePerSlot: '',
                  maxWinners: '1'
                });
              }}>
                Cancel
              </Button>
              <Button 
                onClick={editingRaffle ? handleUpdateRaffle : handleCreateRaffle}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {editingRaffle ? 'Update Raffle' : 'Create Raffle'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Prize Edit Dialog */}
        <Dialog open={showPrizeEditDialog} onOpenChange={setShowPrizeEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Prize Details</DialogTitle>
              <DialogDescription>
                Set up prizes for different winner positions for "{editingRaffle?.title}"
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {prizeEditForm.prizes.map((prize, index) => (
                <div key={index} className="border border-gray-600 rounded-lg p-4 bg-gray-800/50">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-white">
                      {index === 0 ? '1st Place Prize' : 
                       index === 1 ? '2nd Place Prize' : 
                       index === 2 ? '3rd Place Prize' : 
                       `${index + 1}th Place Prize`}
                    </h3>
                    {prizeEditForm.prizes.length > 1 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removePrize(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor={`prizeName-${index}`}>Prize Name *</Label>
                      <Input
                        id={`prizeName-${index}`}
                        value={prize.name}
                        onChange={(e) => updatePrize(index, 'name', e.target.value)}
                        placeholder="e.g., Masterball Pack"
                      />
                    </div>

                    <div>
                      <Label htmlFor={`prizeType-${index}`}>Prize Type *</Label>
                      <select
                        id={`prizeType-${index}`}
                        value={prize.type}
                        onChange={(e) => updatePrize(index, 'type', e.target.value)}
                        className="w-full p-2 border border-gray-600 rounded-md bg-gray-800 text-white"
                      >
                        <option value="pack">Pack</option>
                        <option value="card">Card</option>
                        <option value="credits">Credits</option>
                        <option value="physical">Physical Item</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor={`prizeValue-${index}`}>Prize Value</Label>
                      <Input
                        id={`prizeValue-${index}`}
                        type="number"
                        value={prize.value}
                        onChange={(e) => updatePrize(index, 'value', e.target.value)}
                        placeholder="Prize value (if applicable)"
                      />
                    </div>
                  </div>

                  {/* Prize Image URL */}
                  <div className="mt-4">
                    <Label htmlFor={`prizeImageUrl-${index}`}>Prize Image URL</Label>
                    <Input
                      id={`prizeImageUrl-${index}`}
                      value={prize.imageUrl || ''}
                      onChange={(e) => updatePrize(index, 'imageUrl', e.target.value)}
                      placeholder="https://example.com/prize-image.jpg"
                    />
                    {prize.imageUrl && (
                      <div className="mt-2">
                        <img 
                          src={prize.imageUrl} 
                          alt={`${prize.name} preview`}
                          className="w-24 h-32 object-cover rounded border border-gray-600"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={addPrize}
                  className="border-dashed border-2 border-gray-500 hover:border-gray-400 text-gray-400 hover:text-gray-300"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Prize
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowPrizeEditDialog(false);
                setEditingRaffle(null);
                setPrizeEditForm({
                  prizes: [{ position: 1, name: '', type: 'pack', value: '', imageUrl: '' }]
                });
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdatePrize}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
              >
                Update Prize
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        </div>
      </div>
    </div>
  );
}