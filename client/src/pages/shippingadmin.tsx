import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { NavigationFooter } from "@/components/NavigationFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Truck, 
  Edit, 
  Eye, 
  MapPin,
  Package,
  User,
  Calendar,
  DollarSign,
  FileText,
  ArrowLeft,
  TrendingUp,
  Users,
  Gift,
  Check
} from "lucide-react";

interface ShippingRequest {
  id: string;
  userId: string;
  addressId: string;
  items: any[];
  totalValue: string;
  status: string;
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  address: {
    id: string;
    userId: string;
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
  };
  user: {
    id: string;
    email: string;
    username: string;
    credits: string;
    createdAt: string;
    updatedAt: string;
  };
}

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
    <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border">
      <div className="w-12 h-16 bg-gradient-to-br from-[#7C3AED] to-[#22D3EE] rounded flex items-center justify-center flex-shrink-0 relative overflow-hidden">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xs text-white">Loading...</span>
          </div>
        ) : imageUrl ? (
          <img 
            src={imageUrl} 
            alt={item.name}
            className="w-full h-full object-cover rounded"
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
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate">{item.name}</div>
        <div className="text-sm text-gray-400">
          {item.tier} • Qty: {item.qty}
        </div>
      </div>
    </div>
  );
}

// Grouped Card Component for condensed display
function GroupedCardComponent({ groupedItem }: { groupedItem: any }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCardImage = async () => {
      try {
        // First try to use existing imageUrl or cardImageUrl
        if (groupedItem.firstItem.imageUrl || groupedItem.firstItem.cardImageUrl) {
          setImageUrl(groupedItem.firstItem.imageUrl || groupedItem.firstItem.cardImageUrl);
          setIsLoading(false);
          return;
        }

        // If no image URL, fetch from card pool database
        const response = await apiRequest("GET", `/api/card-image/${encodeURIComponent(groupedItem.name)}`);
        const data = await response.json();
        
        if (data.imageUrl) {
          setImageUrl(data.imageUrl);
        }
      } catch (error) {
        console.error('Error fetching card image:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCardImage();
  }, [groupedItem.name, groupedItem.firstItem.imageUrl, groupedItem.firstItem.cardImageUrl]);

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border">
      <div className="w-12 h-16 bg-gradient-to-br from-[#7C3AED] to-[#22D3EE] rounded flex items-center justify-center flex-shrink-0 relative overflow-hidden">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xs text-white">Loading...</span>
          </div>
        ) : imageUrl ? (
          <img 
            src={imageUrl} 
            alt={groupedItem.name}
            className="w-full h-full object-cover rounded"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling.style.display = 'flex';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xs text-white">No Image</span>
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center hidden">
          <span className="text-xs font-bold text-white">{groupedItem.tier}</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate">{groupedItem.name}</div>
        <div className="text-sm text-gray-400">
          {groupedItem.tier} • Qty: {groupedItem.quantity}
        </div>
      </div>
    </div>
  );
}

export default function ShippingAdmin() {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const { toast } = useToast();
  
  const [shipments, setShipments] = useState<ShippingRequest[]>([]);
  const [isLoadingShipments, setIsLoadingShipments] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [showTrackingDialog, setShowTrackingDialog] = useState(false);
  const [showShipmentDetailsDialog, setShowShipmentDetailsDialog] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<ShippingRequest | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shipmentStatus, setShipmentStatus] = useState("pending");

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      toast({
        title: "Access Denied",
        description: "You need admin privileges to access this page.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
      return;
    }
  }, [isAuthenticated, isAdmin, isLoading, toast]);

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchShipments();
    }
  }, [isAuthenticated, isAdmin]);

  // Fetch all shipping requests
  const fetchShipments = async () => {
    setIsLoadingShipments(true);
    try {
      const response = await apiRequest('GET', '/api/admin/shipping/requests');
      const data = await response.json();
      setShipments(data);
    } catch (error) {
      console.error('Error fetching shipments:', error);
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to fetch shipping requests",
        variant: "destructive",
      });
    } finally {
      setIsLoadingShipments(false);
    }
  };

  // Get shipment status color
  const getShipmentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'shipping': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Open tracking dialog
  const openTrackingDialog = (shipment: ShippingRequest) => {
    setSelectedShipment(shipment);
    setTrackingNumber(shipment.trackingNumber || "");
    setShipmentStatus(shipment.status);
    setShowTrackingDialog(true);
  };

  // Open shipment details dialog
  const openShipmentDetailsDialog = (shipment: ShippingRequest) => {
    setSelectedShipment(shipment);
    setShowShipmentDetailsDialog(true);
  };

  // Update tracking number
  const updateTrackingNumber = async () => {
    if (!selectedShipment) return;
    
    // Validate tracking number is required when marking as shipping
    if (shipmentStatus === 'shipping' && !trackingNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "Tracking number is required when marking shipment as shipping",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await apiRequest('PUT', `/api/admin/shipping/requests/${selectedShipment.id}`, {
        trackingNumber: trackingNumber.trim(),
        status: shipmentStatus
      });
      
      const statusMessages = {
        pending: "Shipment marked as pending",
        shipping: "Shipment marked as shipping with tracking number",
        delivered: "Shipment marked as delivered"
      };
      
      toast({
        title: "Success",
        description: statusMessages[shipmentStatus as keyof typeof statusMessages] || "Status updated successfully",
      });
      
      setShowTrackingDialog(false);
      fetchShipments();
    } catch (error) {
      console.error('Error updating tracking:', error);
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update tracking information",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  const pendingCount = shipments.filter(s => s.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navigation />
      <div className="container mx-auto px-4 pt-20 pb-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] rounded-lg flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold">
                <span className="bg-gradient-to-r from-[#7C3AED] via-[#A855F7] to-[#22D3EE] bg-clip-text text-transparent">
                  Shipping Admin
                </span>
              </h1>
            </div>
            <p className="text-gray-300 text-lg mb-4">Manage shipping requests and track deliveries</p>
            
            {pendingCount > 0 && (
              <div className="inline-flex items-center gap-2 bg-red-900/50 border border-red-500/50 rounded-lg px-4 py-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-300 font-medium">
                  {pendingCount} Pending Request{pendingCount !== 1 ? 's' : ''} Need Attention
                </span>
              </div>
            )}
          </div>

          {/* Shipping Requests with Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-800/50 border border-gray-700">
              <TabsTrigger value="pending" className="flex items-center gap-2 py-3 text-white data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                <Package className="w-4 h-4" />
                <span className="font-medium">Pending</span>
                {pendingCount > 0 && (
                  <Badge className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full min-w-[20px] h-[20px] flex items-center justify-center font-semibold">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2 py-3 text-white data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                <Check className="w-4 h-4" />
                <span className="font-medium">Completed</span>
              </TabsTrigger>
            </TabsList>

            {/* Pending Tab */}
            <TabsContent value="pending" className="space-y-6">
              <Card className="gaming-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl text-white">
                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Package className="w-4 h-4 text-yellow-600" />
                    </div>
                    Pending Shipments
                  </CardTitle>
                  <p className="text-gray-400 ml-11">Orders awaiting processing or in transit</p>
                </CardHeader>
                <CardContent>
                  {isLoadingShipments ? (
                    <div className="text-center py-8">
                      <div className="text-gray-400">Loading shipping requests...</div>
                    </div>
                  ) : shipments.filter(s => s.status === 'pending' || s.status === 'shipping').length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="w-12 h-12 mx-auto mb-4 text-gray-400 opacity-50" />
                      <p className="text-gray-400">No pending shipments</p>
                      <p className="text-sm text-gray-500">All caught up!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {shipments.filter(s => s.status === 'pending' || s.status === 'shipping').map((shipment) => (
                    <Card key={shipment.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg text-white truncate">#{shipment.id.slice(-8)}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <User className="w-4 h-4 flex-shrink-0" />
                              <span className="font-medium truncate">{shipment.user.username}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge className={`${getShipmentStatusColor(shipment.status)} px-2 py-1 text-xs font-medium whitespace-nowrap`}>
                              {shipment.status === 'pending' && 'Pending'}
                              {shipment.status === 'shipping' && 'Shipping'}
                            </Badge>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                onClick={() => openTrackingDialog(shipment)}
                                className="bg-gradient-to-r from-[#7C3AED] to-[#22D3EE] hover:from-[#6D28D9] hover:to-[#0891B2] text-white border-0 p-2 h-8 w-8"
                                title="Update Tracking"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openShipmentDetailsDialog(shipment)}
                                className="p-2 h-8 w-8"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
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
              <Card className="gaming-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl text-white">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    Completed Shipments
                  </CardTitle>
                  <p className="text-gray-400 ml-11">Successfully delivered orders</p>
                </CardHeader>
                <CardContent>
                  {isLoadingShipments ? (
                    <div className="text-center py-8">
                      <div className="text-gray-400">Loading shipping requests...</div>
                    </div>
                  ) : shipments.filter(s => s.status === 'delivered').length === 0 ? (
                    <div className="text-center py-8">
                      <Check className="w-12 h-12 mx-auto mb-4 text-gray-400 opacity-50" />
                      <p className="text-gray-400">No completed shipments</p>
                      <p className="text-sm text-gray-500">Delivered orders will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {shipments.filter(s => s.status === 'delivered').map((shipment) => (
                        <Card key={shipment.id} className="hover:shadow-lg transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg text-white truncate">#{shipment.id.slice(-8)}</h3>
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                  <User className="w-4 h-4 flex-shrink-0" />
                                  <span className="font-medium truncate">{shipment.user.username}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge className="bg-green-500 text-white px-2 py-1 text-xs font-medium whitespace-nowrap">
                                  ✅ Delivered
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openShipmentDetailsDialog(shipment)}
                                  className="p-2 h-8 w-8"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
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
          </Tabs>
        </div>
      </div>

      {/* Tracking Update Dialog */}
      <Dialog open={showTrackingDialog} onOpenChange={setShowTrackingDialog}>
        <DialogContent className="max-w-md bg-gray-900 border border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Update Shipment Status</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update the tracking number and status for this shipment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="status" className="text-white">Status *</Label>
              <select
                id="status"
                value={shipmentStatus}
                onChange={(e) => setShipmentStatus(e.target.value)}
                className="w-full p-2 border border-gray-600 rounded-md bg-gray-800 text-white focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] focus:outline-none"
              >
                <option value="pending">Pending</option>
                <option value="shipping">Shipping</option>
                <option value="delivered">Delivered</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {shipmentStatus === 'shipping' && "Tracking number is required when marking as shipping"}
              </p>
            </div>
            <div>
              <Label htmlFor="trackingNumber" className="text-white">
                Tracking Number {shipmentStatus === 'shipping' && '*'}
              </Label>
              <Input
                id="trackingNumber"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
                className={shipmentStatus === 'shipping' && !trackingNumber.trim() ? 'border-red-500' : ''}
              />
              {shipmentStatus === 'shipping' && !trackingNumber.trim() && (
                <p className="text-xs text-red-500 mt-1">Tracking number is required for shipping status</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTrackingDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={updateTrackingNumber}
              disabled={shipmentStatus === 'shipping' && !trackingNumber.trim()}
            >
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shipment Details Dialog */}
      <Dialog open={showShipmentDetailsDialog} onOpenChange={setShowShipmentDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-gray-900 border border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Shipment Details</DialogTitle>
            <DialogDescription className="text-gray-400">
              Detailed information about this shipping request.
            </DialogDescription>
          </DialogHeader>
          {selectedShipment && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold mb-3 text-white">Customer Information</h4>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Username:</span>
                      <span className="font-medium text-white">{selectedShipment.user.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Email:</span>
                      <span className="font-medium text-white">{selectedShipment.user.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">User ID:</span>
                      <span className="font-mono text-xs text-white">{selectedShipment.user.id}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 text-white">Request Information</h4>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Request ID:</span>
                      <span className="font-mono text-xs text-white">{selectedShipment.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Created:</span>
                      <span className="font-medium text-white">{new Date(selectedShipment.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last Updated:</span>
                      <span className="font-medium text-white">{new Date(selectedShipment.updatedAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <Badge className={`${getShipmentStatusColor(selectedShipment.status)} px-2 py-1 text-xs`}>
                        {selectedShipment.status === 'pending' && 'Pending'}
                        {selectedShipment.status === 'shipping' && 'Shipping'}
                        {selectedShipment.status === 'delivered' && 'Delivered'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3 text-white">Items to Ship</h4>
                <div className="bg-muted/50 p-4 rounded-lg border">
                  {Array.isArray(selectedShipment.items) && selectedShipment.items.length > 0 ? (
                    <div className="space-y-3">
                      {(() => {
                        // Group items by their properties
                        const groupedItems = selectedShipment.items.reduce((groups: any, item: any) => {
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
                          <GroupedCardComponent key={index} groupedItem={groupedItem} />
                        ));
                      })()}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-4">No items data available</p>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3 text-white">Shipping Address</h4>
                <div className="bg-muted/50 p-4 rounded-lg border">
                  <div className="text-sm space-y-1">
                    <div className="font-medium text-white">{selectedShipment.address.name}</div>
                    <div className="text-gray-400">{selectedShipment.address.address}</div>
                    <div className="text-gray-400">{selectedShipment.address.city}, {selectedShipment.address.state} {selectedShipment.address.postalCode}</div>
                    <div className="text-gray-400">{selectedShipment.address.country}</div>
                    {selectedShipment.address.phone && <div className="text-gray-400">Phone: {selectedShipment.address.phone}</div>}
                  </div>
                </div>
              </div>
              
              {selectedShipment.trackingNumber && (
                <div>
                  <h4 className="font-semibold mb-3 text-white">Tracking Information</h4>
                  <div className="bg-muted/50 p-4 rounded-lg border">
                    <div className="text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Tracking Number:</span>
                        <span className="font-mono font-medium text-white bg-gray-800 px-3 py-1 rounded border">
                          {selectedShipment.trackingNumber}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {selectedShipment.notes && (
                <div>
                  <h4 className="font-semibold mb-3 text-white">Notes</h4>
                  <div className="bg-muted/50 p-4 rounded-lg border">
                    <p className="text-sm text-white">{selectedShipment.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShipmentDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
