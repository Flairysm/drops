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
  RefreshCw
} from "lucide-react";

export default function Admin() {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const queryClient = useQueryClient();

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
          amount: creditAmount.toString()
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
      const response = await apiRequest('GET', '/api/admin/mystery-packs');
      console.log('Mystery packs fetch response status:', response.status);
      
      if (response.ok) {
        const packs = await response.json();
        console.log('Fetched mystery packs:', packs);
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
    }
  }, [activeTab]);

  // Auto-refresh pack data every 5 seconds when on manage tab
  useEffect(() => {
    if (activeTab === 'manage') {
      const interval = setInterval(() => {
        console.log('🔄 Auto-refreshing pack data...');
        fetchSpecialPacks();
        fetchClassicPacks();
        fetchMysteryPacks();
      }, 5000); // Refresh every 5 seconds

      return () => clearInterval(interval);
    }
  }, [activeTab]);


  // Load mystery packs when component mounts
  useEffect(() => {
    console.log('Loading mystery packs...');
    fetchMysteryPacks();
  }, []);

  // Load mystery packs when switching to mystery section
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
      console.log('Fetching cards for mystery pack pool:', pokeballPack.id);
      
      const response = await apiRequest('GET', `/api/admin/mystery-packs/${pokeballPack.id}`);
      if (response.ok) {
        const packData = await response.json();
        console.log('Fetched mystery pack cards:', packData.cards);
        console.log('Setting mystery pack cards state with:', packData.cards || []);
        
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
      console.log('Loading mystery pack cards for', mysterySection, '...');
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
        // Refresh the editing pool data
        const updatedPoolResponse = await apiRequest('GET', `/api/admin/${apiEndpoint}/${editingContentPool.id}`);
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
        
        // Update the appropriate pack state based on pack type
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
        
        // Then refresh from server to ensure consistency
        const updatedPool = await authenticatedFetch(`http://localhost:3000/api/admin/${apiEndpoint}/${editingContentPool.id}`).then(res => res.json());
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
        // Refresh the editing pool data
        const updatedPool = await authenticatedFetch(`http://localhost:3000/api/admin/${apiEndpoint}/${editingContentPool.id}`).then(res => res.json());
        setEditingContentPool(prev => prev ? {
          ...prev,
          cards: updatedPool.cards || []
        } : null);
        
        // Also update the main specialPools state
        setSpecialPools(prev => prev.map(pool => 
          pool.id === editingContentPool.id 
            ? { ...pool, cards: updatedPool.cards || [] }
            : pool
        ));
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
        // Refresh the editing pool data
        const updatedPoolResponse = await apiRequest('GET', `/api/admin/${apiEndpoint}/${editingContentPool.id}`);
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
        
        // Refresh main pack lists to reflect the change
        fetchSpecialPacks();
        fetchClassicPacks();
        
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
        // Refresh the editing pool data
        const updatedPoolResponse = await apiRequest('GET', `/api/admin/${apiEndpoint}/${editingContentPool.id}`);
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
      const response = await apiRequest('GET', '/api/admin/special-packs');
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
      const response = await apiRequest('GET', '/api/admin/classic-packs');
      if (response.ok) {
        const packs = await response.json();
        setClassicPools(packs);
      } else {
        console.error('Failed to fetch classic packs');
      }
    } catch (error: any) {
      console.error('Error fetching classic packs:', error);
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
            <TabsList className="grid w-full max-w-5xl mx-auto grid-cols-4 mb-8">
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
                              {classicPools.map((pool) => (
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
                              ))}
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
                            ))}
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
                      <Button onClick={() => {/* TODO: Add new card functionality */}}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Card
                      </Button>
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
                            <div className="space-y-3">
                              <div className="flex justify-between items-center mb-4">
                                <p className="text-sm text-muted-foreground">
                                  {mysteryPackCards.length} card(s) in mystery pack prize pool
                                </p>
                                  <Button
                                  onClick={() => setShowAddCardDialog(true)}
                                    size="sm"
                                  className="bg-blue-600 hover:bg-blue-700"
                                  >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add Card
                                  </Button>
                                    </div>
                              {mysteryPackCards.map((card) => (
                                <div key={card.id} className="flex items-center gap-4 p-4 border rounded-lg">
                                  <img
                                    src={card.cardImageUrl}
                                    alt={card.cardName}
                                    className="w-16 h-16 object-cover rounded"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                    }}
                                  />
                                  <div className="flex-1">
                                    <h4 className="font-medium">{card.cardName}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      Credits: {card.refundCredit} | Quantity: {card.quantity}
                                    </p>
                                      </div>
                                  <div className="flex gap-2">
                                        <Button
                                      variant="outline"
                                          size="sm"
                                      onClick={() => {
                                        const newQuantity = prompt(`Enter new quantity for ${card.cardName}:`, card.quantity.toString());
                                        if (newQuantity && !isNaN(parseInt(newQuantity))) {
                                          handleUpdateMysteryPackCardQuantity(card.id, parseInt(newQuantity));
                                        }
                                      }}
                                    >
                                      <Edit className="w-4 h-4 mr-2" />
                                          Edit
                                    </Button>
                                    <Button
                                    variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        if (confirm(`Are you sure you want to remove ${card.cardName} from the mystery pack?`)) {
                                          handleRemoveCardFromMysteryPack(card.id);
                                        }
                                      }}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                    <X className="w-4 h-4 mr-2" />
                                    Remove
                                    </Button>
                                  </div>
                                  </div>
                              ))}
                                </div>
                          )}
                        </CardContent>
                      </Card>

              </div>
            </TabsContent>
              </Tabs>
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
                  {editingContentPool.cards.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No prize cards in this pack yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-60 overflow-y-auto">
                      {editingContentPool.cards.map((card: any) => (
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
                  )}
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

        </div>
      </div>
    </div>
  );
}