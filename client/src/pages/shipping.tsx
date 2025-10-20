import { useEffect, useState } from "react";
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
import { 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  Package, 
  Truck,
  Home,
  Star
} from "lucide-react";

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
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500 text-white';
      case 'shipped':
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
  const [activeTab, setActiveTab] = useState("pending");
  
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
    if (isAuthenticated) {
      fetchAddresses();
      fetchShippingRequests();
    }
  }, [isAuthenticated]);

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
      const response = await apiRequest('GET', '/api/shipping/requests');
      const data = await response.json();
      setShippingRequests(data);
    } catch (error) {
      console.error('Error fetching shipping requests:', error);
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
          title: "🎉 Shipping Request Created!",
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Please log in to access shipping</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <span className="bg-gradient-to-r from-[#7C3AED] via-[#A855F7] to-[#22D3EE] bg-clip-text text-transparent">
                <Truck className="w-10 h-10 inline mr-3" />
              Shipping Center
              </span>
            </h1>
            <p className="text-muted-foreground text-lg">Manage your addresses and track your shipments</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Pending
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                Completed
              </TabsTrigger>
              <TabsTrigger value="manage" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Manage Addresses
              </TabsTrigger>
            </TabsList>

            {/* Pending Tab */}
            <TabsContent value="pending" className="space-y-6">
              <Card className="gaming-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Pending Shipments
                  </CardTitle>
                  <p className="text-muted-foreground">Orders currently being processed</p>
                </CardHeader>
                <CardContent>
                  {shippingRequests.filter(req => req.status === 'pending' || req.status === 'shipped').length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">No pending shipments</p>
                      <p className="text-sm text-muted-foreground">Go to your vault to select cards for shipping</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {shippingRequests
                        .filter(req => req.status === 'pending' || req.status === 'shipped')
                        .map((request) => (
                        <Card key={request.id} className="hover:shadow-lg transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <Badge className={`${getStatusColor(request.status)}`}>
                                  {request.status === 'pending' ? '⏳ Pending' : '📦 Shipped'}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  Request #{request.id?.slice(-8) || 'N/A'}
                                </span>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {new Date(request.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-semibold mb-2">Items ({request.items?.length || 0})</h4>
                                <div className="space-y-2">
                                  {request.items?.map((item: any, index: number) => (
                                    <div key={index} className="flex items-center gap-2 text-sm">
                                      <span className="font-medium">{item.name}</span>
                                      <span className="text-muted-foreground">x{item.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="font-semibold mb-2">Shipping Address</h4>
                                <div className="text-sm text-muted-foreground">
                                  <div className="flex items-center gap-2 mb-1">
                                    <MapPin className="w-4 h-4" />
                                    <span>{request.address?.name}</span>
                                  </div>
                                  <div className="ml-6">
                                    <div>{request.address?.address}</div>
                                    <div>{request.address?.city}, {request.address?.state} {request.address?.postalCode}</div>
                                    <div>{request.address?.country}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {request.trackingNumber && (
                              <div className="mt-4 p-3 bg-muted rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Truck className="w-4 h-4" />
                                  <span className="font-medium">Tracking Number:</span>
                                  <span className="font-mono">{request.trackingNumber}</span>
                                </div>
                              </div>
                            )}
                            
                            {request.notes && (
                              <div className="mt-4">
                                <h4 className="font-semibold mb-2">Notes</h4>
                                <p className="text-sm text-muted-foreground">{request.notes}</p>
                              </div>
                            )}
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
              <Card className="gaming-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    Completed Shipments
                  </CardTitle>
                  <p className="text-muted-foreground">Successfully delivered orders</p>
                </CardHeader>
                <CardContent>
                  {shippingRequests.filter(req => req.status === 'delivered').length === 0 ? (
                    <div className="text-center py-8">
                      <Check className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">No completed shipments</p>
                      <p className="text-sm text-muted-foreground">Your delivered orders will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {shippingRequests
                        .filter(req => req.status === 'delivered')
                        .map((request) => (
                        <Card key={request.id} className="hover:shadow-lg transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <Badge className="bg-green-500 text-white">
                                  ✅ Delivered
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  Request #{request.id?.slice(-8) || 'N/A'}
                                </span>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {new Date(request.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-semibold mb-2">Items ({request.items?.length || 0})</h4>
                                <div className="space-y-2">
                                  {request.items?.map((item: any, index: number) => (
                                    <div key={index} className="flex items-center gap-2 text-sm">
                                      <span className="font-medium">{item.name}</span>
                                      <span className="text-muted-foreground">x{item.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="font-semibold mb-2">Shipping Address</h4>
                                <div className="text-sm text-muted-foreground">
                                  <div className="flex items-center gap-2 mb-1">
                                    <MapPin className="w-4 h-4" />
                                    <span>{request.address?.name}</span>
                                  </div>
                                  <div className="ml-6">
                                    <div>{request.address?.address}</div>
                                    <div>{request.address?.city}, {request.address?.state} {request.address?.postalCode}</div>
                                    <div>{request.address?.country}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {request.trackingNumber && (
                              <div className="mt-4 p-3 bg-muted rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Truck className="w-4 h-4" />
                                  <span className="font-medium">Tracking Number:</span>
                                  <span className="font-mono">{request.trackingNumber}</span>
                                </div>
                              </div>
                            )}
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
              <Card className="gaming-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-semibold flex items-center gap-2">
                      <Home className="w-5 h-5" />
                      Your Addresses
                    </CardTitle>
                    <Button 
                      onClick={() => setIsAddingAddress(true)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
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
                      <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <div className="text-muted-foreground mb-4">No addresses saved yet</div>
                      <Button onClick={() => setIsAddingAddress(true)}>
                        Add Your First Address
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {addresses.map((address) => (
                        <Card key={address.id} className="relative">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{address.name}</h3>
                                {address.isDefault && (
                                  <Badge variant="secondary" className="flex items-center gap-1">
                                    <Star className="w-3 h-3" />
                                    Default
                                  </Badge>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => startEditingAddress(address)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteAddress(address.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div>{address.address}</div>
                              <div>{address.city}, {address.state} {address.postalCode}</div>
                              <div>{address.country}</div>
                              {address.phone && <div>Phone: {address.phone}</div>}
                            </div>
                            {!address.isDefault && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-3 w-full"
                                onClick={() => handleSetDefault(address.id)}
                              >
                                <Check className="w-4 h-4 mr-2" />
                                Set as Default
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Add/Edit Address Form */}
              {isAddingAddress && (
                <Card className="gaming-card">
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
                        <Button type="submit">
                          {editingAddress ? 'Update Address' : 'Add Address'}
                        </Button>
                        <Button type="button" variant="outline" onClick={resetAddressForm}>
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
      </div>
      
      {/* Add spacing before footer */}
      <div className="h-20"></div>
      
      <NavigationFooter />
    </div>
  );
}
