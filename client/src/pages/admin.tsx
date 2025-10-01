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
  Eye
} from "lucide-react";

export default function Admin() {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const queryClient = useQueryClient();
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
  const [mysterySearchQuery, setMysterySearchQuery] = useState("");
  const [mysteryPackCards, setMysteryPackCards] = useState<Array<{
    id: string;
    packId: string;
    cardId: string;
    quantity: number;
    createdAt: string;
    card: {
      id: string;
      name: string;
      imageUrl: string;
      credits: number;
      createdAt: string;
      updatedAt: string;
    };
  }>>([]);
  const [mysteryPacks, setMysteryPacks] = useState<Array<{
    id: string;
    name: string;
    description: string;
    imageUrl?: string;
    subtype: string;
    price?: string;
    totalPacks?: number;
    odds?: any;
    isActive: boolean;
    createdAt: string;
  }>>([]);
  const [selectedMysteryPack, setSelectedMysteryPack] = useState<string>('');
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
  const [inventoryCards, setInventoryCards] = useState<Array<{
    id: string;
    name: string;
    imageUrl: string;
    credits: number;
    tier: string;
  }>>([]);
  const [showAddCardForm, setShowAddCardForm] = useState(false);
  const [editingCard, setEditingCard] = useState<{ id: string; name: string; imageUrl: string; credits: number; tier: string; } | null>(null);
  const [editForm, setEditForm] = useState({ name: '', imageUrl: '', credits: '', tier: 'D' });
  const [searchQuery, setSearchQuery] = useState('');
  const [newCard, setNewCard] = useState({
    name: '',
    imageUrl: '',
    credits: '',
    tier: 'D'
  });
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);



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
      const response = await apiRequest('GET', '/api/admin/inventory');
      
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
          const pokeballPack = packs.find((pack: any) => pack.subtype === 'pokeball') || packs[0];
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

  // Load inventory when switching to inventory tab
  useEffect(() => {
    if (activeTab === 'inventory') {
      fetchInventoryCards();
    }
  }, [activeTab]);

  // Load inventory when Edit Prize dialog opens
  useEffect(() => {
    if (showEditContentDialog) {
      console.log('Loading inventory for Edit Prize dialog...');
      fetchInventoryCards();
    }
  }, [showEditContentDialog]);

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

  // Load inventory when switching to mystery add section
  useEffect(() => {
    if (activeTab === 'manage' && manageSection === 'mystery' && mysterySection === 'add') {
      fetchInventoryCards();
    }
  }, [activeTab, manageSection, mysterySection]);

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
      
      const pokeballPack = mysteryPacks.find(pack => pack.subtype === 'pokeball') || mysteryPacks[0];
      console.log('Fetching cards for mystery pack pool:', pokeballPack.id);
      
      const response = await apiRequest('GET', `/api/admin/mystery-packs/${pokeballPack.id}`);
      if (response.ok) {
        const packData = await response.json();
        console.log('Fetched mystery pack cards:', packData.cards);
        console.log('Setting mystery pack cards state with:', packData.cards || []);
        setMysteryPackCards(packData.cards || []);
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
          credits: credits,
          tier: newCard.tier
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
          setNewCard({ name: '', imageUrl: '', credits: '', tier: 'D' });
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
    // Check if card is used in any packs
    const usedInSpecialPacks = specialPools.some(pool => 
      pool.cards && pool.cards.some(packCard => (packCard as any).card?.id === cardId)
    );
    const usedInMysteryPacks = mysteryPackCards.some(packCard => (packCard as any).card?.id === cardId);
    
    let warningMessage = `Are you sure you want to remove "${cardName}" from inventory?`;
    
    if (usedInSpecialPacks || usedInMysteryPacks) {
      warningMessage += `\n\n⚠️ This card is currently used in pack pools and will be automatically removed from:`;
      if (usedInSpecialPacks) {
        const packNames = specialPools
          .filter(pool => pool.cards && pool.cards.some(packCard => (packCard as any).card?.id === cardId))
          .map(pool => pool.name)
          .join(', ');
        warningMessage += `\n• Special Packs: ${packNames}`;
      }
      if (usedInMysteryPacks) {
        warningMessage += `\n• Mystery Pack Pool`;
      }
      warningMessage += `\n\nThis action cannot be undone.`;
    }

    if (confirm(warningMessage)) {
      try {
        const response = await apiRequest('DELETE', `/api/admin/inventory/${cardId}`);

        if (response.ok) {
          // Refresh inventory
          await fetchInventoryCards();
          
          // Also refresh pack data to reflect the removal
          await fetchSpecialPacks();
          await fetchMysteryPacks();
          
          let successMessage = `"${cardName}" has been removed from inventory`;
          if (usedInSpecialPacks || usedInMysteryPacks) {
            successMessage += ` and all pack pools`;
          }
          successMessage += ` successfully!`;
          
          alert(successMessage);
        } else {
          alert('Failed to remove card. Please try again.');
        }
      } catch (error: any) {
        console.error('Error removing card:', error);
        alert('Failed to remove card. Please try again.');
      }
    }
  };

  const handleEditCard = (card: { id: string; name: string; imageUrl: string; credits: number; tier: string; }) => {
    setEditingCard(card);
    setEditForm({
      name: card.name,
      imageUrl: card.imageUrl,
      credits: card.credits.toString(),
      tier: card.tier || 'D'
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
          credits: credits,
          tier: editForm.tier
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
          setEditForm({ name: '', imageUrl: '', credits: '', tier: 'D' });
          
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
    setEditForm({ name: '', imageUrl: '', credits: '', tier: 'D' });
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

  // Add card to mystery pack (always uses the first pack - pokeball)
  const handleAddToMysteryPack = async (card: { id: string; name: string; imageUrl: string; credits: number; }) => {
    if (mysteryPacks.length === 0) {
      alert('No mystery packs available. Please try again later.');
      return;
    }

    // Always use the first mystery pack (pokeball) for the shared card pool
    const pokeballPack = mysteryPacks.find(pack => pack.subtype === 'pokeball') || mysteryPacks[0];
    
    try {
      console.log('Adding card to mystery pack pool:', { packId: pokeballPack.id, cardId: card.id });
      
      const response = await apiRequest('POST', `/api/admin/mystery-packs/${pokeballPack.id}/cards`, {
        cardId: card.id,
        quantity: 1
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Successfully added card to mystery pack pool:', result);
        alert(`${card.name} added to mystery pack pool!`);
        
        // Refresh the mystery pack cards display
        console.log('Calling fetchMysteryPackCards to refresh UI after adding...');
        await fetchMysteryPackCards();
        console.log('fetchMysteryPackCards completed after adding');
        
        // Force a re-render by updating a dummy state
        console.log('Forcing re-render after adding...');
        setMysteryPackCards(prev => [...prev]);
        console.log('Re-render forced after adding');
      } else {
        const errorText = await response.text();
        console.error('Failed to add card to mystery pack pool:', errorText);
        alert('Failed to add card to mystery pack pool. Please try again.');
      }
    } catch (error) {
      console.error('Error adding card to mystery pack pool:', error);
      alert('Error adding card to mystery pack pool. Please try again.');
    }
  };

  // Handle removing card from mystery pack
  const handleRemoveFromMysteryPack = async (mysteryPackCardId: string, cardName: string) => {
    console.log('Remove button clicked!', { mysteryPackCardId, cardName });
    
    if (mysteryPacks.length === 0) {
      alert('No mystery packs available. Please try again later.');
      return;
    }

    // Always use the first mystery pack (pokeball) for the shared card pool
    const pokeballPack = mysteryPacks.find(pack => pack.subtype === 'pokeball') || mysteryPacks[0];
    
    // Find the card to get the actual cardId
    const cardToRemove = mysteryPackCards.find(card => card.id === mysteryPackCardId);
    console.log('Card to remove:', cardToRemove);
    
    if (!cardToRemove) {
      alert('Card not found in mystery pack pool.');
      return;
    }
    
    try {
      console.log('Removing card from mystery pack pool:', { packId: pokeballPack.id, cardId: cardToRemove.cardId });
      
      const response = await apiRequest('DELETE', `/api/admin/mystery-packs/${pokeballPack.id}/cards/${cardToRemove.cardId}`);

      if (response.ok) {
        console.log('Successfully removed card from mystery pack pool');
        alert(`${cardName} removed from mystery pack pool!`);
        
        // Refresh the mystery pack cards display
        console.log('Calling fetchMysteryPackCards to refresh UI after direct removal...');
        await fetchMysteryPackCards();
        console.log('fetchMysteryPackCards completed after direct removal');
        
        // Force a re-render by updating a dummy state
        console.log('Forcing re-render after direct removal...');
        setMysteryPackCards(prev => [...prev]);
        console.log('Re-render forced after direct removal');
      } else {
        const errorText = await response.text();
        console.error('Failed to remove card from mystery pack pool:', errorText);
        alert('Failed to remove card from mystery pack pool. Please try again.');
      }
        } catch (error) {
      console.error('Error removing card from mystery pack pool:', error);
      alert('Error removing card from mystery pack pool. Please try again.');
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

  // Save quantity changes for Mystery Packs
  const handleSaveQuantity = async (cardId: string) => {
    const newQuantity = editingQuantity[cardId];
    if (newQuantity === undefined || newQuantity < 0) return;

    if (mysteryPacks.length === 0) {
      alert('No mystery packs available. Please try again later.');
      return;
    }

    // Always use the first mystery pack (pokeball) for the shared card pool
    const pokeballPack = mysteryPacks.find(pack => pack.subtype === 'pokeball') || mysteryPacks[0];
    
    // Debug logging
    console.log('handleSaveQuantity (Mystery) called with cardId:', cardId);
    console.log('mysteryPackCards:', mysteryPackCards);
    console.log('Looking for card with id:', cardId);
    
    // Find the card to get the actual cardId
    const cardToUpdate = mysteryPackCards.find(card => card.id === cardId);
    console.log('Found cardToUpdate:', cardToUpdate);
    
    if (!cardToUpdate) {
      alert('Card not found in mystery pack pool.');
      return;
    }

    try {
      if (newQuantity === 0) {
        // Remove card if quantity is 0
        console.log('Removing card from mystery pack pool:', { packId: pokeballPack.id, cardId: cardToUpdate.cardId });
        
        const response = await apiRequest('DELETE', `/api/admin/mystery-packs/${pokeballPack.id}/cards/${cardToUpdate.cardId}`);

        if (response.ok) {
          console.log('Successfully removed card from mystery pack pool');
          alert('Card removed from mystery pack!');
          
          // Refresh the mystery pack cards display
          console.log('Calling fetchMysteryPackCards to refresh UI after removal...');
          await fetchMysteryPackCards();
          console.log('fetchMysteryPackCards completed after removal');
          
          // Force a re-render by updating a dummy state
          console.log('Forcing re-render after removal...');
          setMysteryPackCards(prev => [...prev]);
          console.log('Re-render forced after removal');
        } else {
          const errorText = await response.text();
          console.error('Failed to remove card from mystery pack pool:', errorText);
          alert('Failed to remove card from mystery pack pool. Please try again.');
        }
      } else {
        // Update quantity
        console.log('Updating card quantity in mystery pack pool:', { packId: pokeballPack.id, cardId: cardToUpdate.cardId, quantity: newQuantity });
        
        const response = await apiRequest('PATCH', `/api/admin/mystery-packs/${pokeballPack.id}/cards/${cardToUpdate.cardId}`, {
          quantity: newQuantity
        });

        if (response.ok) {
          console.log('Successfully updated card quantity in mystery pack pool');
          alert('Quantity updated!');
          
          // Refresh the mystery pack cards display
          console.log('Calling fetchMysteryPackCards to refresh UI...');
          await fetchMysteryPackCards();
          console.log('fetchMysteryPackCards completed');
          
          // Force a re-render by updating a dummy state
          console.log('Forcing re-render...');
          setMysteryPackCards(prev => [...prev]);
          console.log('Re-render forced');
        } else {
          const errorText = await response.text();
          console.error('Failed to update card quantity in mystery pack pool:', errorText);
          alert('Failed to update card quantity. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error updating mystery pack card:', error);
      alert('Error updating card. Please try again.');
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

  // Classic Pool Management
  const handleAddClassicPool = async () => {
    if (newPool.name.trim() && newPool.description.trim() && newPool.image.trim() && newPool.price.trim()) {
      try {
        const response = await fetch('http://localhost:3000/api/admin/classic-packs', {
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
        const response = await fetch(`http://localhost:3000/api/admin/classic-packs/${poolId}`, {
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

  // Edit Content Functions
  const handleEditContent = async (pool: any) => {
    console.log('handleEditContent called with pool:', pool);
    
    // Set the editing pool directly from the pool data we already have
    setEditingContentPool({
      id: pool.id,
      name: pool.name,
      cards: (pool.cards || []).map((card: any) => ({
        id: card.id,
        name: card.card?.name || card.name,
        imageUrl: card.card?.imageUrl || card.imageUrl,
        credits: card.card?.credits || card.credits,
        quantity: card.quantity
      }))
    });
    
    console.log('Setting showEditContentDialog to true');
    setShowEditContentDialog(true);
  };

  // Save quantity changes for Special Packs and Classic Packs
  const handleSaveQuantitySpecial = async (cardId: string) => {
    const newQuantity = editingQuantity[cardId];
    if (newQuantity === undefined || newQuantity < 0) return;

    if (!editingContentPool) {
      alert('No pack selected for editing.');
      return;
    }

    // Determine if this is a classic pack or special pack based on the pack ID
    const isClassicPack = classicPools.some(pool => pool.id === editingContentPool.id);
    const apiEndpoint = isClassicPack ? 'classic-packs' : 'special-packs';

    // Debug logging
    console.log('handleSaveQuantitySpecial called with cardId:', cardId);
    console.log('editingContentPool.cards:', editingContentPool.cards);
    console.log('Looking for card with id:', cardId);
    
    // Find the card to get the actual cardId
    const cardToUpdate = editingContentPool.cards.find(card => card.id === cardId);
    console.log('Found cardToUpdate:', cardToUpdate);
    
    if (!cardToUpdate) {
      alert(`Card not found in ${isClassicPack ? 'classic' : 'special'} pack pool.`);
      return;
    }

    try {
      if (newQuantity === 0) {
        // Remove card if quantity is 0
        console.log(`Removing card from ${isClassicPack ? 'classic' : 'special'} pack:`, { packId: editingContentPool.id, specialPackCardId: cardId });
        
        const response = await fetch(`http://localhost:3000/api/admin/${apiEndpoint}/${editingContentPool.id}/cards/${cardId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          console.log(`Successfully removed card from ${isClassicPack ? 'classic' : 'special'} pack`);
          alert(`Card removed from ${isClassicPack ? 'classic' : 'special'} pack!`);
          
          // Refresh the pack data
          const updatedPack = await fetch(`http://localhost:3000/api/admin/${apiEndpoint}/${editingContentPool.id}`);
          if (updatedPack.ok) {
            const packData = await updatedPack.json();
            setEditingContentPool(packData);
            if (isClassicPack) {
              setClassicPools(prev => prev.map(pack => 
                pack.id === editingContentPool.id ? packData : pack
              ));
            } else {
              setSpecialPools(prev => prev.map(pack => 
                pack.id === editingContentPool.id ? packData : pack
              ));
            }
          }
        } else {
          const errorText = await response.text();
          console.error(`Failed to remove card from ${isClassicPack ? 'classic' : 'special'} pack:`, errorText);
          alert(`Failed to remove card from ${isClassicPack ? 'classic' : 'special'} pack. Please try again.`);
        }
      } else {
        // Update quantity
        console.log(`Updating card quantity in ${isClassicPack ? 'classic' : 'special'} pack:`, { packId: editingContentPool.id, specialPackCardId: cardId, quantity: newQuantity });
        
        const response = await apiRequest('PATCH', `/api/admin/${apiEndpoint}/${editingContentPool.id}/cards/${cardId}`, {
          quantity: newQuantity
        });

        if (response.ok) {
          console.log(`Successfully updated card quantity in ${isClassicPack ? 'classic' : 'special'} pack`);
          alert('Card quantity updated successfully!');
          
          // Refresh the pack data
          const updatedPack = await apiRequest('GET', `/api/admin/${apiEndpoint}/${editingContentPool.id}`);
          if (updatedPack.ok) {
            const packData = await updatedPack.json();
            setEditingContentPool(packData);
            if (isClassicPack) {
              setClassicPools(prev => prev.map(pack => 
                pack.id === editingContentPool.id ? packData : pack
              ));
            } else {
              setSpecialPools(prev => prev.map(pack => 
                pack.id === editingContentPool.id ? packData : pack
              ));
            }
          }
        } else {
          const errorText = await response.text();
          console.error(`Failed to update card quantity in ${isClassicPack ? 'classic' : 'special'} pack:`, errorText);
          alert('Failed to update card quantity. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error updating special pack card quantity:', error);
      alert('An error occurred while updating the card quantity. Please try again.');
    }
  };

  const handleAddCardToContent = async (card: any) => {
    if (!editingContentPool) return;

    // Determine if this is a classic pack or special pack based on the pack ID
    const isClassicPack = classicPools.some(pool => pool.id === editingContentPool.id);
    const apiEndpoint = isClassicPack ? 'classic-packs' : 'special-packs';

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
          name: card.card?.name || card.name,
          imageUrl: card.card?.imageUrl || card.imageUrl,
          credits: card.card?.credits || card.credits,
          quantity: card.quantity
        }));
        
        setEditingContentPool(prev => prev ? {
          ...prev,
          cards: normalizedCards
        } : null);
        
        // Update the appropriate pools state
        if (isClassicPack) {
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
        alert(`${card.name} added to pack successfully!`);
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

    // Determine if this is a classic pack or special pack based on the pack ID
    const isClassicPack = classicPools.some(pool => pool.id === editingContentPool.id);
    const apiEndpoint = isClassicPack ? 'classic-packs' : 'special-packs';

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
        
        // Update the appropriate pools state
        if (isClassicPack) {
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
        const updatedPool = await fetch(`http://localhost:3000/api/admin/${apiEndpoint}/${editingContentPool.id}`).then(res => res.json());
        console.log('Updated pool data:', updatedPool);
        console.log('Updated pool cards:', updatedPool.cards);
        
        const normalizedCards = (updatedPool.cards || []).map((card: any) => ({
          id: card.id,
          name: card.card?.name || card.name,
          imageUrl: card.card?.imageUrl || card.imageUrl,
          credits: card.card?.credits || card.credits,
          quantity: card.quantity
        }));
        
        // Always update with the server data to ensure consistency
        setEditingContentPool(prev => prev ? {
          ...prev,
          cards: normalizedCards
        } : null);
        
        setSpecialPools(prev => prev.map(pool => 
          pool.id === editingContentPool.id 
            ? { ...pool, cards: normalizedCards }
            : pool
        ));
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

    try {
      const response = await fetch(`http://localhost:3000/api/admin/special-packs/${editingContentPool.id}/cards/${cardId}`, {
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
        const updatedPool = await fetch(`http://localhost:3000/api/admin/special-packs/${editingContentPool.id}`).then(res => res.json());
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
  };

  // Classic Pack Card Management Functions
  const handleViewClassicPrize = (pool: any) => {
    setViewingPrizePool({
      id: pool.id,
      name: pool.name,
      cards: (pool.cards || []).map((card: any) => ({
        id: card.id,
        name: card.card?.name || card.name,
        imageUrl: card.card?.imageUrl || card.imageUrl,
        credits: card.card?.credits || card.credits,
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
        name: card.card?.name || card.name,
        imageUrl: card.card?.imageUrl || card.imageUrl,
        credits: card.card?.credits || card.credits,
        quantity: card.quantity
      }))
    });
    setContentSearchQuery('');
    setShowEditContentDialog(true);
  };

  const handleAddCardToClassicContent = async (card: any) => {
    if (!editingContentPool) return;

    try {
      const response = await fetch(`http://localhost:3000/api/admin/classic-packs/${editingContentPool.id}/cards`, {
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
      const updatedPack = await fetch(`http://localhost:3000/api/admin/classic-packs/${editingContentPool.id}`);
      const packData = await updatedPack.json();
      
      // Update the editing content pool with fresh data
      setEditingContentPool({
        id: packData.id,
        name: packData.name,
        cards: (packData.cards || []).map((card: any) => ({
          id: card.id,
          name: card.card?.name || card.name,
          imageUrl: card.card?.imageUrl || card.imageUrl,
          credits: card.card?.credits || card.credits,
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
      const response = await fetch(`http://localhost:3000/api/admin/classic-packs/${editingContentPool.id}/cards/${cardId}`, {
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
      const updatedPack = await fetch(`http://localhost:3000/api/admin/classic-packs/${editingContentPool.id}`);
      const packData = await updatedPack.json();
      
      // Update the editing content pool with fresh data
      setEditingContentPool({
        id: packData.id,
        name: packData.name,
        cards: (packData.cards || []).map((card: any) => ({
          id: card.id,
          name: card.card?.name || card.name,
          imageUrl: card.card?.imageUrl || card.imageUrl,
          credits: card.card?.credits || card.credits,
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
        name: card.card?.name || card.name,
        imageUrl: card.card?.imageUrl || card.imageUrl,
        credits: card.card?.credits || card.credits,
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
      const response = await apiRequest('GET', '/api/admin/special-packs');
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

            {/* User Tab */}
            <TabsContent value="user">
              <Card className="gaming-card">
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
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
                  <div className="space-y-6">
                    {/* Classic Pack Navigation */}
                    <div className="flex gap-2">
                      <Button
                        variant={classicSection === "view" ? "default" : "outline"}
                        onClick={() => setClassicSection("view")}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button
                        variant={classicSection === "add" ? "default" : "outline"}
                        onClick={() => setClassicSection("add")}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add
                      </Button>
                    </div>

                    {/* View Classic Packs */}
                    {classicSection === "view" && (
                      <Card className="gaming-card">
                        <CardHeader>
                          <CardTitle>Classic Packs</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {classicPools.length === 0 ? (
                            <div className="text-center py-8">
                              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                              <h3 className="text-lg font-medium mb-2">No Classic Packs</h3>
                              <p className="text-muted-foreground">
                                Create your first classic pack to get started
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {classicPools.map((pool) => (
                                <Card key={pool.id} className="gaming-card">
                                  <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                      <img
                                        src={pool.imageUrl || pool.image}
                                        alt={pool.name}
                                        className="w-16 h-16 object-cover rounded-lg"
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
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
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
                                        onClick={() => handleEditClassicPool(pool)}
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                      >
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit Content
                                      </Button>
                                      <Button
                                        onClick={() => handleEditClassicContent(pool)}
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                      >
                                        <Package className="w-4 h-4 mr-2" />
                                        Edit Prize
                                      </Button>
                                      <Button
                                        onClick={() => handleDeleteClassicPool(pool.id)}
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-red-600 hover:text-red-700"
                                      >
                                        <X className="w-4 h-4 mr-2" />
                                        Remove Content
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Add Classic Pack */}
                    {classicSection === "add" && (
                      <Card className="gaming-card">
                        <CardHeader>
                          <CardTitle>Add Classic Pack</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="classicPackName">Pack Name</Label>
                                <Input
                                  id="classicPackName"
                                  value={newPool.name}
                                  onChange={(e) => setNewPool({ ...newPool, name: e.target.value })}
                                  placeholder="Enter pack name"
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="classicPackImage">Image URL</Label>
                                <Input
                                  id="classicPackImage"
                                  value={newPool.image}
                                  onChange={(e) => setNewPool({ ...newPool, image: e.target.value })}
                                  placeholder="Enter image URL"
                                  required
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="classicPackDescription">Description</Label>
                              <Input
                                id="classicPackDescription"
                                value={newPool.description}
                                onChange={(e) => setNewPool({ ...newPool, description: e.target.value })}
                                placeholder="Enter pack description"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="classicPackPrice">Price</Label>
                              <Input
                                id="classicPackPrice"
                                type="number"
                                value={newPool.price}
                                onChange={(e) => setNewPool({ ...newPool, price: e.target.value })}
                                placeholder="Enter price"
                                required
                              />
                            </div>
                            <Button 
                              onClick={handleAddClassicPool}
                              className="mt-4"
                              disabled={!newPool.name.trim() || !newPool.image.trim() || !newPool.price.trim() || !newPool.description.trim()}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Create Classic Pack
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                  </div>
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
                        View Prize
                      </Button>
                      <Button
                        variant={mysterySection === "edit" ? "default" : "outline"}
                        onClick={() => setMysterySection("edit")}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Prize
                      </Button>
                      <Button
                        variant={mysterySection === "add" ? "default" : "outline"}
                        onClick={() => setMysterySection("add")}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add
                      </Button>
                    </div>

                    {/* View Prize Tab */}
                    {mysterySection === "view" && (
                      <Card className="gaming-card">
                        <CardHeader>
                          <CardTitle>Mystery Pack Prize Pool</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {mysteryPackCards.length === 0 ? (
                            <div className="text-center py-8">
                              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                              <h3 className="text-lg font-medium mb-2">No cards in mystery pack prize pool</h3>
                              <p className="text-muted-foreground">
                                Add cards from inventory to build your mystery pack prize pool
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex justify-between items-center mb-4">
                                <p className="text-sm text-muted-foreground">
                                  {mysteryPackCards.length} card(s) in mystery pack prize pool
                                </p>
                              </div>
                              {mysteryPackCards.map((card) => (
                                <div key={card.id} className="flex items-center gap-4 p-4 border rounded-lg">
                                  <img
                                    src={card.card.imageUrl}
                                    alt={card.card.name}
                                    className="w-16 h-16 object-cover rounded"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = '/assets/random-common-card.png';
                                    }}
                                  />
                                  <div className="flex-1">
                                    <h4 className="font-medium">{card.card.name}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      Credits: {card.card.credits} | Quantity: {card.quantity}
                                    </p>
                              </div>
                              </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Edit Prize Tab */}
                    {mysterySection === "edit" && (
                      <Card className="gaming-card">
                        <CardHeader>
                          <CardTitle>Edit Mystery Pack Prize Cards</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {mysteryPackCards.length === 0 ? (
                            <div className="text-center py-8">
                              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                              <h3 className="text-lg font-medium mb-2">No cards in mystery pack prize pool</h3>
                              <p className="text-muted-foreground">
                                Add cards from inventory to build your mystery pack prize pool
                              </p>
                                    </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex justify-between items-center mb-4">
                                <p className="text-sm text-muted-foreground">
                                  {mysteryPackCards.length} card(s) in mystery pack prize pool
                                </p>
                                    </div>
                              {mysteryPackCards.map((card) => (
                                <div key={card.id} className="flex items-center gap-4 p-4 border rounded-lg">
                                  <img
                                    src={card.card.imageUrl}
                                    alt={card.card.name}
                                    className="w-16 h-16 object-cover rounded"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = '/assets/random-common-card.png';
                                    }}
                                  />
                                  <div className="flex-1">
                                    <h4 className="font-medium">{card.card.name}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      Credits: {card.card.credits}
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
                                      console.log('Remove button clicked for card:', card);
                                      handleRemoveFromMysteryPack(card.id, card.card.name);
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
                          <CardTitle>Add Cards to Mystery Pack Pool</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="mb-4 p-4 bg-muted rounded-lg">
                            <h4 className="font-medium mb-2">Shared Card Pool</h4>
                            <p className="text-sm text-muted-foreground">
                              Cards added here will be available in all mystery pack types (Pokeball, Greatball, Ultraball, Masterball). 
                              The difference between pack types is only the odds of pulling different rarity tiers.
                            </p>
                                            </div>
                          
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
                    <div className="mb-6">
                      <div className="relative max-w-md">
                        <Input
                          type="text"
                          placeholder="Search cards by name..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-10"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                              </div>
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                              </div>
                      {searchQuery && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Showing {filteredCards.length} of {inventoryCards.length} cards
                        </p>
                      )}
                      {/* Usage Legend */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                          <span>Used in pack pools</span>
                        </div>
                        <div className="text-gray-400">•</div>
                        <span>Removing cards from inventory will also remove them from all pack pools</span>
                      </div>
                    </div>

                    {/* Loading State */}
                    {isLoadingInventory && (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-2 text-muted-foreground">Loading inventory...</p>
                                </div>
                              )}

                    {/* Card List - Grid View */}
                    {!isLoadingInventory && (
                      <div className="space-y-2">
                        {filteredCards.map((card) => (
                          <Card key={card.id} className="gaming-card hover:shadow-lg transition-shadow">
                            <CardContent className="p-3">
                              <div className="flex items-center space-x-4">
                                {/* Card Image - Small */}
                                <div className="flex-shrink-0">
                                  <img
                                    src={card.imageUrl}
                                    alt={card.name}
                                    className="w-16 h-16 object-cover rounded-lg"
                                    onError={(e) => {
                                      e.currentTarget.src = '/assets/random-common-card.png';
                                    }}
                                  />
                            </div>

                                {/* Card Details - Compact */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-lg truncate">{card.name}</h3>
                                    {/* Usage indicator */}
                                    {(() => {
                                      const usedInSpecialPacks = specialPools.some(pool => 
                                        pool.cards && pool.cards.some(packCard => (packCard as any).card?.id === card.id)
                                      );
                                      const usedInMysteryPacks = mysteryPackCards.some(packCard => (packCard as any).card?.id === card.id);
                                      
                                      if (usedInSpecialPacks || usedInMysteryPacks) {
                                        return (
                                          <div className="flex items-center gap-1 ml-2">
                                            <div className="w-2 h-2 bg-orange-400 rounded-full" title="Used in pack pools"></div>
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </div>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className={`px-2 py-1 text-xs font-bold rounded border ${
                                      card.tier === 'D' ? 'bg-gray-600 text-white border-gray-700' :
                                      card.tier === 'C' ? 'bg-green-600 text-white border-green-700' :
                                      card.tier === 'B' ? 'bg-blue-600 text-white border-blue-700' :
                                      card.tier === 'A' ? 'bg-purple-600 text-white border-purple-700' :
                                      card.tier === 'S' ? 'bg-orange-600 text-white border-orange-700' :
                                      card.tier === 'SS' ? 'bg-red-600 text-white border-red-700' :
                                      'bg-yellow-600 text-white border-yellow-700'
                                    }`}>
                                      {card.tier || 'D'}
                                    </span>
                                    <p className="text-sm text-blue-600 font-medium">
                                      {card.credits} Credits
                                    </p>
                                  </div>
                                </div>

                                {/* Action Buttons - Compact */}
                                <div className="flex gap-2 flex-shrink-0">
                            <Button
                                    variant="outline"
                              size="sm"
                                    onClick={() => handleEditCard(card)}
                                    className="px-3"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRemoveCard(card.id, card.name)}
                                    className="px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <X className="w-4 h-4" />
                            </Button>
                          </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                    {/* Empty State */}
                    {!isLoadingInventory && inventoryCards.length === 0 && (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Package className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Cards in Inventory</h3>
                        <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                          Start building your card collection by adding your first card to the inventory.
                        </p>
                        <Button onClick={() => setShowAddCardForm(true)} className="mx-auto">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Your First Card
                        </Button>
                      </div>
                    )}

                    {/* No Search Results */}
                    {!isLoadingInventory && inventoryCards.length > 0 && filteredCards.length === 0 && (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Cards Found</h3>
                        <p className="text-gray-500 mb-4 max-w-sm mx-auto">
                          No cards match your search for "{searchQuery}". Try adjusting your search terms.
                        </p>
                        <Button 
                          variant="outline" 
                          onClick={() => setSearchQuery('')}
                          className="mx-auto"
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
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Add New Card</DialogTitle>
                <DialogDescription>
                  Add a new card to the inventory with tier and credit information.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="cardName" className="text-sm font-medium">Card Name</Label>
                  <Input
                    id="cardName"
                    value={newCard.name}
                    onChange={(e) => handleNewCardChange('name', e.target.value)}
                    placeholder="Enter card name"
                    className="w-full"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="imageUrl" className="text-sm font-medium">Image URL</Label>
                  <Input
                    id="imageUrl"
                    type="url"
                    value={newCard.imageUrl}
                    onChange={(e) => handleNewCardChange('imageUrl', e.target.value)}
                    placeholder="https://example.com/card-image.jpg"
                    className="w-full"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="credits" className="text-sm font-medium">Credits</Label>
                  <Input
                      id="credits"
                      type="number"
                      min="0"
                      value={newCard.credits}
                      onChange={(e) => handleNewCardChange('credits', e.target.value)}
                      placeholder="Enter credit amount"
                      className="w-full"
                      required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="tier" className="text-sm font-medium">Tier</Label>
                    <select
                      id="tier"
                      value={newCard.tier}
                      onChange={(e) => handleNewCardChange('tier', e.target.value)}
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
              </div>
              <DialogFooter className="gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAddCardForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={handleAddCard} className="flex-1">
                  Add Card
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Card Dialog */}
          <Dialog open={editingCard !== null} onOpenChange={() => setEditingCard(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Edit Card</DialogTitle>
                <DialogDescription>
                  Update the card details and tier information.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="editCardName" className="text-sm font-medium">Card Name</Label>
                  <Input
                    id="editCardName"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Enter card name"
                    className="w-full"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="editImageUrl" className="text-sm font-medium">Image URL</Label>
                  <Input
                    id="editImageUrl"
                    type="url"
                    value={editForm.imageUrl}
                    onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                    placeholder="https://example.com/card-image.jpg"
                    className="w-full"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="editCredits" className="text-sm font-medium">Credits</Label>
                  <Input
                      id="editCredits"
                    type="number"
                    min="0"
                      value={editForm.credits}
                      onChange={(e) => setEditForm({ ...editForm, credits: e.target.value })}
                      placeholder="Enter credit amount"
                      className="w-full"
                      required
                    />
                </div>

                  <div className="space-y-2">
                    <Label htmlFor="editTier" className="text-sm font-medium">Tier</Label>
                    <select
                      id="editTier"
                      value={editForm.tier}
                      onChange={(e) => setEditForm({ ...editForm, tier: e.target.value })}
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
              </div>
              <DialogFooter className="gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleCancelEdit}
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
                {/* Search Inventory */}
              <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Add Prize Cards from Inventory</h3>
                  <Input
                    placeholder="Search inventory cards..."
                    value={contentSearchQuery}
                    onChange={(e) => setContentSearchQuery(e.target.value)}
                    className="w-full"
                  />
                  
                  {/* Filtered Inventory Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-60 overflow-y-auto">
                    {(() => {
                      const filteredCards = inventoryCards.filter(card => 
                        card.name.toLowerCase().includes(contentSearchQuery.toLowerCase())
                      );
                      console.log('Edit Prize Dialog - Inventory cards:', inventoryCards.length);
                      console.log('Edit Prize Dialog - Search query:', contentSearchQuery);
                      console.log('Edit Prize Dialog - Filtered cards:', filteredCards.length);
                      
                      if (isLoadingInventory) {
                        return <p className="text-muted-foreground text-center py-8">Loading inventory cards...</p>;
                      }
                      
                      if (inventoryCards.length === 0) {
                        return <p className="text-muted-foreground text-center py-8">No cards in inventory yet.</p>;
                      }
                      
                      if (filteredCards.length === 0) {
                        return <p className="text-muted-foreground text-center py-8">No cards found matching "{contentSearchQuery}".</p>;
                      }
                      
                      return filteredCards.map((card: any) => (
                        <div key={card.id} className="flex items-center gap-3 p-3 border rounded-lg">
                          <img
                            src={card.imageUrl}
                            alt={card.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{card.name}</p>
                            <p className="text-xs text-muted-foreground">{card.credits} credits</p>
                            </div>
                          <Button
                            onClick={() => handleAddCardToContent(card)}
                            size="sm"
                            variant="outline"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                              </div>
                      ));
                    })()}
                            </div>
                          </div>
                          
                {/* Current Prize Cards */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Current Prize Cards ({editingContentPool.cards.length})</h3>
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
                              {editingQuantity[card.id] !== undefined ? (
                                <>
                                  <Input
                                    type="number"
                                    value={editingQuantity[card.id]}
                                    onChange={(e) => setEditingQuantity({ ...editingQuantity, [card.id]: parseInt(e.target.value) })}
                                    className="w-16 h-6 text-xs"
                                    min="0"
                                  />
                                  <Button onClick={() => handleSaveQuantitySpecial(card.id)} size="sm" className="h-6 px-2 text-xs">Save</Button>
                                  <Button onClick={() => setEditingQuantity(prev => { const newState = { ...prev }; delete newState[card.id]; return newState; })} variant="outline" size="sm" className="h-6 px-2 text-xs">Cancel</Button>
                                </>
                              ) : (
                                <>
                                  <p className="text-xs text-muted-foreground">Qty: {card.quantity}</p>
                                  <Button onClick={() => setEditingQuantity({ ...editingQuantity, [card.id]: card.quantity })} variant="outline" size="sm" className="h-6 px-2 text-xs">Edit</Button>
                                </>
                            )}
                          </div>
                          </div>
                          <Button
                            onClick={() => handleRemoveCardFromContent(card.id)}
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 h-6 px-2"
                          >
                            <X className="w-3 h-3" />
                          </Button>
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