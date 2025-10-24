import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { NavigationFooter } from "@/components/NavigationFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Calendar
} from "lucide-react";

// Card Image Component that fetches image from card pool database
function CardImageComponent({ item }: { item: any }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCardImage = async () => {
      try {
        // First try to use existing imageUrl or cardImageUrl
        if (item.imageUrl || item.cardImageUrl) {
          setImageUrl(item.imageUrl || item.cardImageUrl);
          setIsLoading(false);
          return;
        }

        // If no image URL, fetch from card pool database
        console.log('Fetching card image for:', item.name);
        const response = await apiRequest("GET", `/api/card-image/${encodeURIComponent(item.name)}`);
        const data = await response.json();
        
        console.log('API response:', data);
        
        if (data.imageUrl) {
          setImageUrl(data.imageUrl);
          console.log('✅ Fetched card image from database:', data.imageUrl, 'for card:', item.name);
        } else {
          console.log('❌ No card image found in database for:', item.name);
        }
      } catch (error) {
        console.error('❌ Error fetching card image:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCardImage();
  }, [item.name, item.imageUrl, item.cardImageUrl]);

  return (
    <div className="w-20 h-24 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center relative flex-shrink-0">
      {isLoading ? (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-xs text-white">Loading...</span>
        </div>
      ) : imageUrl ? (
        <img 
          src={imageUrl} 
          alt={item.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            console.log('❌ Image failed to load:', imageUrl);
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling.style.display = 'flex';
          }}
          onLoad={() => {
            console.log('✅ Image loaded successfully:', imageUrl);
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-xs text-white">No Image</span>
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center hidden">
        <span className="text-xs font-bold text-white">{item.tier}</span>
      </div>
    </div>
  );
}

interface UserAddress {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ShippingRequest {
  id: string;
  items: any[];
  totalValue: string;
  status: string;
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
  address: UserAddress;
}

export default function Shipping() {
  console.log('🔍 Shipping component rendering...');
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  
  console.log('🔍 Auth state:', { isAuthenticated, isLoading });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500 text-white';
      case 'shipping':
        return 'bg-blue-500 text-white';
      case 'delivered':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };
  
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [shippingRequests, setShippingRequests] = useState<ShippingRequest[]>([]);
  
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const hasFetchedDataRef = useRef(false);
  const [activeTab, setActiveTab] = useState("pending");
  
  // Detail modal state
  const [selectedRequest, setSelectedRequest] = useState<ShippingRequest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Address form state
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [addressForm, setAddressForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "Malaysia",
    phone: "",
    isDefault: false
  });

  // Shipping request form state
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [requestItems, setRequestItems] = useState<any[]>([]);
  const [requestNotes, setRequestNotes] = useState("");

  // Check for selected cards from vault on component mount
  useEffect(() => {
    const selectedCardsData = sessionStorage.getItem('selectedCardsForShipping');
    if (selectedCardsData) {
      try {
        const cards = JSON.parse(selectedCardsData);
        setRequestItems(cards);
        setActiveTab("requests");
        setIsCreatingRequest(true);
        // Clear the session storage after using it
        sessionStorage.removeItem('selectedCardsForShipping');
        
        toast({
          title: "Cards Selected",
          description: `${cards.length} cards ready to ship. Please select an address.`,
        });
      } catch (error) {
        console.error("Error parsing selected cards:", error);
        sessionStorage.removeItem('selectedCardsForShipping');
      }
    }
  }, [toast]);

  useEffect(() => {
    console.log('🔍 Shipping useEffect triggered:', { isAuthenticated, isLoading, hasFetchedData: hasFetchedDataRef.current });
    if (isAuthenticated && !isLoading && !hasFetchedDataRef.current) {
      console.log('🔍 User is authenticated and not loading, fetching data...');
      hasFetchedDataRef.current = true;
      fetchAddresses();
      fetchShippingRequests();
    } else if (!isAuthenticated) {
      console.log('🔍 User not authenticated, clearing state...');
      setShippingRequests([]);
      setAddresses([]);
      hasFetchedDataRef.current = false;
    }
  }, [isAuthenticated, isLoading]); // Only run when auth state changes

  const fetchAddresses = async () => {
    setIsLoadingAddresses(true);
    try {
      const response = await apiRequest('GET', '/api/shipping/addresses');
      const data = await response.json();
      setAddresses(data);
    } catch (error) {
      console.error('Error fetching addresses:', error);
      toast({
        title: "Error",
        description: "Failed to fetch addresses",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const fetchShippingRequests = async () => {
    setIsLoadingRequests(true);
    try {
      console.log('🔍 Fetching shipping requests...');
      
      // Test direct fetch first
      console.log('🔍 Testing direct fetch...');
      const token = localStorage.getItem('authToken');
      const directResponse = await fetch('/api/shipping/requests', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('🔍 Direct fetch response:', directResponse.status, directResponse.ok);
      
      const response = await apiRequest('GET', '/api/shipping/requests', undefined, { timeout: 30000 });
      console.log('🔍 Response status:', response.status, response.ok);
      
      if (!response.ok) {
        console.error('❌ API request failed:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📦 Shipping requests response:', data);
      console.log('📦 Response type:', typeof data);
      console.log('📦 Is array:', Array.isArray(data));
      console.log('📦 Number of requests:', Array.isArray(data) ? data.length : 'Not an array');
      if (Array.isArray(data) && data.length > 0) {
        console.log('📦 First request:', data[0]);
        console.log('📦 Request statuses:', data.map(r => r.status));
      }
      console.log('📦 Setting shipping requests state...');
      setShippingRequests(data);
      console.log('📦 Shipping requests state updated with:', data);
    } catch (error) {
      console.error('❌ Error fetching shipping requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch shipping requests",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAddress) {
        await apiRequest('PUT', `/api/shipping/addresses/${editingAddress.id}`, addressForm);
        toast({
          title: "Success",
          description: "Address updated successfully",
        });
      } else {
        await apiRequest('POST', '/api/shipping/addresses', addressForm);
        toast({
          title: "Success",
          description: "Address added successfully",
        });
      }
      
      fetchAddresses();
      resetAddressForm();
    } catch (error) {
      console.error('Error saving address:', error);
      toast({
        title: "Error",
        description: "Failed to save address",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    
    try {
      await apiRequest('DELETE', `/api/shipping/addresses/${addressId}`);
      toast({
        title: "Success",
        description: "Address deleted successfully",
      });
      fetchAddresses();
    } catch (error) {
      console.error('Error deleting address:', error);
      toast({
        title: "Error",
        description: "Failed to delete address",
        variant: "destructive",
      });
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      await apiRequest('PUT', `/api/shipping/addresses/${addressId}/default`);
      toast({
        title: "Success",
        description: "Default address updated",
      });
      fetchAddresses();
    } catch (error) {
      console.error('Error setting default address:', error);
      toast({
        title: "Error",
        description: "Failed to set default address",
        variant: "destructive",
      });
    }
  };

  const resetAddressForm = () => {
    setAddressForm({
      name: "",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      country: "Malaysia",
      phone: "",
      isDefault: false
    });
    setIsAddingAddress(false);
    setEditingAddress(null);
  };

  const startEditingAddress = (address: UserAddress) => {
    setAddressForm({
      name: address.name,
      address: address.address,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone || "",
      isDefault: address.isDefault
    });
    setEditingAddress(address);
    setIsAddingAddress(true);
  };

  const openDetailModal = (request: ShippingRequest) => {
    setSelectedRequest(request);
    setIsDetailModalOpen(true);
  };


  const createShippingRequest = async () => {
    if (!selectedAddress) {
      toast({
        title: "No address selected",
        description: "Please select a shipping address.",
        variant: "destructive",
      });
      return;
    }

    if (requestItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select items to ship.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Calculate total value (using refund credit as value)
      const totalValue = requestItems.reduce((total, item) => {
        return total + (parseFloat(item.credit?.toString() || '0') * item.qty);
      }, 0);

      const response = await apiRequest('POST', '/api/shipping/requests', {
        addressId: selectedAddress,
        items: requestItems,
        totalValue: totalValue,
        notes: requestNotes
      });

      if (response.ok) {
        const responseData = await response.json();
        toast({
          title: "Shipping Request Created!",
          description: `Your request #${responseData.id?.slice(-8) || 'N/A'} has been submitted successfully. We'll process it within 1-2 business days.`,
        });
        
        // Reset form
        setRequestItems([]);
        setSelectedAddress("");
        setRequestNotes("");
        setIsCreatingRequest(false);
        
        // Refresh shipping requests
        fetchShippingRequests();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to create shipping request",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating shipping request:', error);
      toast({
        title: "Error",
        description: "Failed to create shipping request",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mb-4"></div>
        <p className="text-white text-lg font-medium">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 font-bold text-yellow-500">🔒</div>
          <h1 className="text-2xl font-bold mb-2 text-white">Authentication Required</h1>
          <p className="text-gray-300 text-lg">Please log in to access shipping</p>
        </div>
      </div>
    );
  }

  // Debug: Show component is rendering
  console.log('🔍 Shipping component fully rendered, auth state:', { isAuthenticated, isLoading });

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Navigation />

      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Main background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('data:image/svg+xml;base64,${btoa(`
              <svg width="1920" height="1080" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="bg" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="#1e1b4b" stop-opacity="1"/>
                    <stop offset="100%" stop-color="#312e81" stop-opacity="1"/>
                  </radialGradient>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#4c1d95" stroke-width="0.5" opacity="0.3"/>
                  </pattern>
                </defs>
                <rect width="1920" height="1080" fill="url(#bg)"/>
                <rect width="1920" height="1080" fill="url(#grid)"/>
                <circle cx="200" cy="200" r="100" fill="#7c3aed" opacity="0.1"/>
                <circle cx="1720" cy="880" r="150" fill="#a855f7" opacity="0.1"/>
                <circle cx="960" cy="540" r="200" fill="#c084fc" opacity="0.05"/>
              </svg>
            `)}')`
          }}
        />
        
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/40"></div>
        
        {/* Additional floating particles */}
        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-cyan-400/60 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            ></div>
          ))}
        </div>
      </div>

      <main className="pt-16 pb-16 relative z-10">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
          {/* Header */}
          <div className="py-6 text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-[#7C3AED] via-[#A855F7] to-[#22D3EE] bg-clip-text text-transparent">
                SHIPPING CENTER
              </span>
            </h1>
            <p className="text-base text-[#E5E7EB] max-w-3xl mx-auto">
              Manage your addresses and track your shipments
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8 bg-[#26263A]/50 border-[#26263A]">
              <TabsTrigger 
                value="pending" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#7C3AED] data-[state=active]:to-[#22D3EE] data-[state=active]:text-white data-[state=active]:border-0"
              >
                Pending
              </TabsTrigger>
              <TabsTrigger 
                value="completed" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#7C3AED] data-[state=active]:to-[#22D3EE] data-[state=active]:text-white data-[state=active]:border-0"
              >
                Completed
              </TabsTrigger>
              <TabsTrigger 
                value="manage" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#7C3AED] data-[state=active]:to-[#22D3EE] data-[state=active]:text-white data-[state=active]:border-0"
              >
                Addresses
              </TabsTrigger>
            </TabsList>

            {/* Pending Tab */}
            <TabsContent value="pending" className="space-y-6">
              <Card className="bg-gray-800 border border-gray-600 shadow-lg">
                <CardHeader>
                  <CardTitle>Pending Shipments</CardTitle>
                  <p className="text-muted-foreground">Orders currently being processed</p>
                </CardHeader>
                <CardContent>
                  
                  {(() => {
                    const pendingRequests = shippingRequests.filter(req => req.status === 'pending' || req.status === 'shipping');
                    console.log('🔍 Rendering pending shipments:', {
                      totalRequests: shippingRequests.length,
                      pendingCount: pendingRequests.length,
                      allStatuses: shippingRequests.map(r => r.status),
                      pendingStatuses: pendingRequests.map(r => r.status)
                    });
                    return null;
                  })()}
                  
                  {shippingRequests.filter(req => req.status === 'pending' || req.status === 'shipping').length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No pending shipments</p>
                      <p className="text-sm text-muted-foreground">Go to your vault to select cards for shipping</p>
                      <div className="mt-2 text-xs text-gray-500">
                        Debug: Total requests: {shippingRequests.length}, Statuses: {shippingRequests.map(r => r.status).join(', ')}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {shippingRequests
                        .filter(req => req.status === 'pending' || req.status === 'shipping')
                        .map((request) => (
                        <Card key={request.id} className="bg-gray-800 border border-gray-600 shadow-lg hover:glow-effect transition-all">
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              {/* Header Row */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Badge className={`${getStatusColor(request.status)} px-3 py-1`}>
                                    {request.status === 'pending' ? 'Processing' : 'Shipping'}
                                  </Badge>
                                  <div className="text-sm text-muted-foreground">
                                    Request #{request.id?.slice(-8) || 'N/A'}
                                  </div>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {new Date(request.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                              
                              {/* Content Row */}
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <div className="text-sm font-medium">
                                    {request.items?.length || 0} items
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {request.address?.name} • {request.address?.city}, {request.address?.state}
                                  </div>
                                  {request.status === 'shipping' && request.trackingNumber && (
                                    <div 
                                      className="text-xs text-blue-400 font-medium cursor-pointer hover:text-blue-300 transition-colors"
                                      onClick={() => {
                                        navigator.clipboard.writeText(request.trackingNumber);
                                        // You could add a toast notification here if needed
                                      }}
                                      title="Click to copy tracking number"
                                    >
                                      <div>Tracking</div>
                                      <div>{request.trackingNumber}</div>
                                    </div>
                                  )}
                                </div>
                                <Button 
                                  size="sm"
                                  onClick={() => openDetailModal(request)}
                                  className="bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] hover:from-[#6D28D9] hover:to-[#0891B2] text-white border-0"
                                >
                                  View Details
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Completed Tab */}
            <TabsContent value="completed" className="space-y-6">
              <Card className="bg-gray-800 border border-gray-600 shadow-lg">
                <CardHeader>
                  <CardTitle>Completed Shipments</CardTitle>
                  <p className="text-muted-foreground">Successfully delivered orders</p>
                </CardHeader>
                <CardContent>
                  {shippingRequests.filter(req => req.status === 'delivered').length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No completed shipments</p>
                      <p className="text-sm text-muted-foreground">Your delivered orders will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {shippingRequests
                        .filter(req => req.status === 'delivered')
                        .map((request) => (
                        <Card key={request.id} className="bg-gray-800 border border-gray-600 shadow-lg hover:glow-effect transition-all">
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              {/* Header Row */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Badge className="bg-green-500 text-white px-3 py-1">
                                    Delivered
                                  </Badge>
                                  <div className="text-sm text-muted-foreground">
                                    Request #{request.id?.slice(-8) || 'N/A'}
                                  </div>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {new Date(request.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                              
                              {/* Content Row */}
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <div className="text-sm font-medium">
                                    {request.items?.length || 0} items
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {request.address?.name} • {request.address?.city}, {request.address?.state}
                                  </div>
                                </div>
                                <Button 
                                  size="sm"
                                  onClick={() => openDetailModal(request)}
                                  className="bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] hover:from-[#6D28D9] hover:to-[#0891B2] text-white border-0"
                                >
                                  View Details
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Manage Addresses Tab */}
            <TabsContent value="manage" className="space-y-6">
              <Card className="bg-gray-800 border border-gray-600 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-semibold">Your Addresses</CardTitle>
                    <Button 
                      onClick={() => setIsAddingAddress(true)}
                      className="bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] hover:from-[#6D28D9] hover:to-[#0891B2] text-white border-0"
                    >
                      Add Address
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingAddresses ? (
                    <div className="text-center py-8">
                      <div className="text-muted-foreground">Loading addresses...</div>
                    </div>
                  ) : addresses.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-muted-foreground mb-4">No addresses saved yet</div>
                      <Button 
                        onClick={() => setIsAddingAddress(true)}
                        className="bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] hover:from-[#6D28D9] hover:to-[#0891B2] text-white border-0"
                      >
                        Add Your First Address
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {addresses.map((address) => (
                        <Card key={address.id} className="bg-gray-800 border border-gray-600 shadow-lg hover:glow-effect transition-all">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div>
                                  <div className="font-semibold flex items-center gap-2">
                                    {address.name}
                                    {address.isDefault && (
                                      <Badge variant="secondary" className="text-xs">
                                        Default
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {address.city}, {address.state} • {address.country}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {!address.isDefault && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleSetDefault(address.id)}
                                    className="text-xs bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] hover:from-[#6D28D9] hover:to-[#0891B2] text-white border-0"
                                  >
                                    Set Default
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => startEditingAddress(address)}
                                  className="text-xs"
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteAddress(address.id)}
                                  className="text-xs text-red-400 hover:text-red-300"
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Add/Edit Address Form */}
              {isAddingAddress && (
                <Card className="bg-gray-800 border border-gray-600 shadow-lg">
                  <CardHeader>
                    <CardTitle>
                      {editingAddress ? 'Edit Address' : 'Add New Address'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddressSubmit} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            value={addressForm.name}
                            onChange={(e) => setAddressForm({...addressForm, name: e.target.value})}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            value={addressForm.phone}
                            onChange={(e) => setAddressForm({...addressForm, phone: e.target.value})}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="address">Street Address</Label>
                        <Input
                          id="address"
                          value={addressForm.address}
                          onChange={(e) => setAddressForm({...addressForm, address: e.target.value})}
                          required
                        />
                      </div>
                      
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            value={addressForm.city}
                            onChange={(e) => setAddressForm({...addressForm, city: e.target.value})}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="state">State</Label>
                          <Input
                            id="state"
                            value={addressForm.state}
                            onChange={(e) => setAddressForm({...addressForm, state: e.target.value})}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="postalCode">Postal Code</Label>
                          <Input
                            id="postalCode"
                            value={addressForm.postalCode}
                            onChange={(e) => setAddressForm({...addressForm, postalCode: e.target.value})}
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="country">Country</Label>
                        <Input
                          id="country"
                          value={addressForm.country}
                          onChange={(e) => setAddressForm({...addressForm, country: e.target.value})}
                          required
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isDefault"
                          checked={addressForm.isDefault}
                          onChange={(e) => setAddressForm({...addressForm, isDefault: e.target.checked})}
                          className="rounded"
                        />
                        <Label htmlFor="isDefault">Set as default address</Label>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          type="submit"
                          className="bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] hover:from-[#6D28D9] hover:to-[#0891B2] text-white border-0"
                        >
                          {editingAddress ? 'Update Address' : 'Add Address'}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={resetAddressForm}
                          className="border-[#26263A] text-[#E5E7EB] hover:bg-[#26263A]"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

          </Tabs>
        </div>
      </main>
      
      {/* Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-gray-700">
            <DialogTitle className="text-xl font-semibold">Shipping Request Details</DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6 pt-4">
              {/* Status and Basic Info */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Badge className={`${getStatusColor(selectedRequest.status)} px-3 py-1 text-sm`}>
                      {selectedRequest.status === 'pending' ? 'Processing' : 
                       selectedRequest.status === 'shipping' ? 'Shipping' : 'Delivered'}
                    </Badge>
                    <div>
                      <div className="font-semibold text-white">Request #{selectedRequest.id?.slice(-8) || 'N/A'}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(selectedRequest.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="font-semibold mb-4 text-lg text-white">
                  Items ({selectedRequest.items?.length || 0})
                </h3>
                <div className="grid gap-3">
                  {(() => {
                    // Group items by their properties
                    const groupedItems = (selectedRequest.items || []).reduce((groups: any, item: any) => {
                      const key = `${item.name || item.card?.name || 'Unknown'}-${item.tier || item.card?.tier || 'Unknown'}`;
                      if (!groups[key]) {
                        groups[key] = {
                          name: item.name || item.card?.name || 'Unknown Card',
                          tier: item.tier || item.card?.tier,
                          quantity: 0,
                          firstItem: item
                        };
                      }
                      groups[key].quantity += (item.quantity || item.qty || 1);
                      return groups;
                    }, {});

                    return Object.values(groupedItems).map((groupedItem: any, index: number) => (
                      <Card key={index} className="bg-gray-800/30 border-gray-700">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            {/* Card Image */}
                            <div className="relative">
                              <CardImageComponent item={groupedItem.firstItem} />
                              {/* Tier Badge */}
                              {groupedItem.tier && (
                                <div className="absolute top-1 right-1">
                                  <Badge className="bg-gray-600 text-white ring-1 ring-white/40 shadow-md shadow-black/30 px-1.5 py-0.5 rounded-full text-xs font-bold">
                                    {groupedItem.tier}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            
                            {/* Card Info */}
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-white text-lg mb-1">
                                {groupedItem.name}
                              </div>
                              {groupedItem.tier && (
                                <div className="text-sm text-muted-foreground">
                                  Tier: <span className="text-white font-medium">{groupedItem.tier}</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Quantity Badge */}
                            <Badge variant="outline" className="flex-shrink-0 bg-gray-700 border-gray-600 text-white">
                              {groupedItem.quantity}x
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ));
                  })()}
                </div>
              </div>

              {/* Shipping Address */}
              <div>
                <h3 className="font-semibold mb-4 text-lg text-white">
                  Shipping Address
                </h3>
                <Card className="bg-gray-800/30 border-gray-700">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="font-semibold text-white text-lg">{selectedRequest.address?.name}</div>
                      <div className="text-sm text-muted-foreground">{selectedRequest.address?.address}</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedRequest.address?.city}, {selectedRequest.address?.state} {selectedRequest.address?.postalCode}
                      </div>
                      <div className="text-sm text-muted-foreground">{selectedRequest.address?.country}</div>
                      {selectedRequest.address?.phone && (
                        <div className="text-sm text-muted-foreground">
                          Phone: <span className="text-white font-medium">{selectedRequest.address.phone}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tracking Information */}
              {selectedRequest.trackingNumber && (
                <div>
                  <h3 className="font-semibold mb-4 text-lg text-white">
                    Tracking Information
                  </h3>
                  <Card className="bg-gray-800/30 border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-white">Tracking Number:</span>
                        <span className="font-mono bg-gray-700 text-white px-3 py-2 rounded border border-gray-600">
                          {selectedRequest.trackingNumber}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Notes */}
              {selectedRequest.notes && (
                <div>
                  <h3 className="font-semibold mb-4 text-lg text-white">Notes</h3>
                  <Card className="bg-gray-800/30 border-gray-700">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground leading-relaxed">{selectedRequest.notes}</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <NavigationFooter />
    </div>
  );
}





