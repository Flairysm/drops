import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import { User, Mail, Calendar, CreditCard, Settings, Shield, Eye, EyeOff, Home, ArrowLeft, ChevronDown } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Link } from 'wouter';
import { Navigation } from '../components/Navigation';
import { NavigationFooter } from '../components/NavigationFooter';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  phone?: string;
  role: string;
  credits: string;
  createdAt: string;
  lastLogin?: string;
}

interface ProfileUpdateData {
  username?: string;
  phone?: string;
  countryCode?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

// Malaysia only
const countryCodes = [
  { code: '+60', country: 'Malaysia', flag: '🇲🇾' }
];

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [profileData, setProfileData] = useState<ProfileUpdateData>({
    username: '',
    phone: '',
    countryCode: '+60', // Default to Malaysia
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleInputChange = (field: keyof ProfileUpdateData, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  useEffect(() => {
    if (user) {
      setProfile({
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone || '', // Ensure phone is set
        role: user.role,
        credits: user.credits,
        createdAt: user.createdAt || new Date().toISOString(),
        lastLogin: user.lastLogin
      });
      // Parse phone number to extract country code and number
      const phone = user.phone || '';
      let countryCode = '+60'; // Default to Malaysia
      let phoneNumber = '';

      if (phone) {
        const match = phone.match(/^(\+\d{1,4})(.*)$/);
        if (match) {
          countryCode = match[1];
          phoneNumber = match[2];
        } else {
          phoneNumber = phone;
        }
      }

      setProfileData({
        username: user.username,
        phone: phoneNumber,
        countryCode: countryCode,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
    setLoading(false);
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);

    try {
      const response = await apiRequest('PUT', '/api/user/profile', {
        username: profileData.username,
        phone: profileData.countryCode + profileData.phone
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully.",
        });
        await refreshUser();
      } else {
        toast({
          title: "Profile Update Failed",
          description: data.error || "Failed to update profile",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while updating your profile",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (profileData.newPassword !== profileData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirm password do not match.",
        variant: "destructive",
      });
      return;
    }

    if (profileData.newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      const response = await apiRequest('PUT', '/api/user/password', {
        currentPassword: profileData.currentPassword,
        newPassword: profileData.newPassword
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Password Updated",
          description: "Your password has been updated successfully.",
        });
        setProfileData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        toast({
          title: "Password Update Failed",
          description: data.error || "Failed to update password",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while updating your password",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-gradient-to-r from-red-500 to-red-600';
      case 'user':
        return 'bg-gradient-to-r from-blue-500 to-blue-600';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B0B12] via-[#1A1A2E] to-[#16213E] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#22D3EE] mx-auto mb-4"></div>
          <p className="text-[#E5E7EB]">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B0B12] via-[#1A1A2E] to-[#16213E] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#E5E7EB]">Profile not found</p>
          <Link href="/">
            <Button className="mt-4 bg-gradient-to-r from-[#00E6A8] to-[#22D3EE] hover:from-[#00D4A3] hover:to-[#1BC5D9] text-white border-0 shadow-lg">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0B12] via-[#1A1A2E] to-[#16213E]">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-4 mb-8">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#26263A]/50">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-[#E5E7EB]">Profile Settings</h1>
              <p className="text-[#9CA3AF]">Manage your account settings and preferences</p>
            </div>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-[#0B0B12]/50 border border-[#26263A]">
              <TabsTrigger value="profile" className="data-[state=active]:bg-[#22D3EE] data-[state=active]:text-white">
                <User className="w-4 h-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="security" className="data-[state=active]:bg-[#22D3EE] data-[state=active]:text-white">
                <Shield className="w-4 h-4 mr-2" />
                Security
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              <Card className="bg-[#0B0B12]/50 border border-[#26263A] backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-[#E5E7EB] flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-[#22D3EE]" />
                    Profile Information
                  </CardTitle>
                  <CardDescription className="text-[#9CA3AF]">
                    Update your personal information and contact details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-[#E5E7EB] font-medium">Username</Label>
                        <Input
                          id="username"
                          type="text"
                          value={profileData.username}
                          onChange={(e) => handleInputChange('username', e.target.value)}
                          className="bg-[#0B0B12]/50 border-[#26263A] text-[#E5E7EB] focus:border-[#22D3EE] focus:ring-[#22D3EE]/20 rounded-xl"
                          placeholder="Enter your username"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-[#E5E7EB] font-medium">Phone Number</Label>
                        <div className="flex space-x-2">
                          <div className="relative">
                            <select
                              value={profileData.countryCode}
                              onChange={(e) => handleInputChange('countryCode', e.target.value)}
                              className="bg-[#0B0B12]/50 border border-[#26263A] text-[#E5E7EB] focus:border-[#22D3EE] focus:ring-[#22D3EE]/20 rounded-xl px-3 py-2 pr-8 appearance-none cursor-pointer min-w-[120px]"
                            >
                              {countryCodes.map((country) => (
                                <option key={country.code} value={country.code} className="bg-[#0B0B12] text-[#E5E7EB]">
                                  {country.flag} {country.code}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                          </div>
                          <Input
                            id="phone"
                            type="tel"
                            value={profileData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            className="bg-[#0B0B12]/50 border-[#26263A] text-[#E5E7EB] focus:border-[#22D3EE] focus:ring-[#22D3EE]/20 rounded-xl flex-1"
                            placeholder="Enter your phone number"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Email field - read-only */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-[#E5E7EB] font-medium">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile?.email || ''}
                        className="bg-[#0B0B12]/30 border-[#26263A] text-[#9CA3AF] rounded-xl cursor-not-allowed"
                        placeholder="Email address"
                        disabled
                        readOnly
                      />
                      <p className="text-xs text-[#9CA3AF]">Email address cannot be changed</p>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={updating}
                        className="bg-gradient-to-r from-[#00E6A8] to-[#22D3EE] hover:from-[#00D4A3] hover:to-[#1BC5D9] text-white border-0 shadow-lg px-8"
                      >
                        {updating ? 'Updating...' : 'Update Profile'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <Card className="bg-[#0B0B12]/50 border border-[#26263A] backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-[#E5E7EB] flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-[#22D3EE]" />
                    Change Password
                  </CardTitle>
                  <CardDescription className="text-[#9CA3AF]">
                    Update your password to keep your account secure
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleChangePassword} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword" className="text-[#E5E7EB] font-medium">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showPassword ? "text" : "password"}
                          value={profileData.currentPassword}
                          onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                          className="bg-[#0B0B12]/50 border-[#26263A] text-[#E5E7EB] focus:border-[#22D3EE] focus:ring-[#22D3EE]/20 rounded-xl pr-10"
                          placeholder="Enter your current password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF] hover:text-[#E5E7EB]"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="text-[#E5E7EB] font-medium">New Password</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          value={profileData.newPassword}
                          onChange={(e) => handleInputChange('newPassword', e.target.value)}
                          className="bg-[#0B0B12]/50 border-[#26263A] text-[#E5E7EB] focus:border-[#22D3EE] focus:ring-[#22D3EE]/20 rounded-xl pr-10"
                          placeholder="Enter your new password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF] hover:text-[#E5E7EB]"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-[#E5E7EB] font-medium">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={profileData.confirmPassword}
                          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                          className="bg-[#0B0B12]/50 border-[#26263A] text-[#E5E7EB] focus:border-[#22D3EE] focus:ring-[#22D3EE]/20 rounded-xl pr-10"
                          placeholder="Confirm your new password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#9CA3AF] hover:text-[#E5E7EB]"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={updating}
                        className="bg-gradient-to-r from-[#00E6A8] to-[#22D3EE] hover:from-[#00D4A3] hover:to-[#1BC5D9] text-white border-0 shadow-lg px-8"
                      >
                        {updating ? 'Updating...' : 'Update Password'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Profile Overview Card */}
          <Card className="mt-8 bg-[#0B0B12]/50 border border-[#26263A] backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-[#E5E7EB] flex items-center">
                <User className="w-5 h-5 mr-2 text-[#22D3EE]" />
                Profile Overview
              </CardTitle>
              <CardDescription className="text-[#9CA3AF]">
                Your account information and statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-[#0B0B12]/30 rounded-xl border border-[#26263A]/30">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#22D3EE] to-[#00E6A8] rounded-lg flex items-center justify-center shadow-[0_0_8px_rgba(34,211,238,0.3)]">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-[#9CA3AF]">Username</p>
                      <p className="text-[#E5E7EB] font-medium">{profile.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-[#0B0B12]/30 rounded-xl border border-[#26263A]/30">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#A855F7] to-[#7C3AED] rounded-lg flex items-center justify-center shadow-[0_0_8px_rgba(168,85,247,0.3)]">
                      <Mail className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-[#9CA3AF]">Email</p>
                      <p className="text-[#E5E7EB] font-medium">{profile.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-[#0B0B12]/30 rounded-xl border border-[#26263A]/30">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#F59E0B] to-[#D97706] rounded-lg flex items-center justify-center shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-[#9CA3AF]">Role</p>
                      <Badge className={`${getRoleBadgeColor(profile.role)} text-white shadow-lg`}>
                        {profile.role}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-[#0B0B12]/30 rounded-xl border border-[#26263A]/30">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#00E6A8] to-[#22D3EE] rounded-lg flex items-center justify-center shadow-[0_0_8px_rgba(0,230,168,0.3)]">
                      <CreditCard className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-[#9CA3AF]">Credits</p>
                      <p className="text-[#E5E7EB] font-medium">{parseFloat(profile.credits).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-[#0B0B12]/30 rounded-xl border border-[#26263A]/30">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#A855F7] to-[#7C3AED] rounded-lg flex items-center justify-center shadow-[0_0_8px_rgba(168,85,247,0.3)]">
                      <Calendar className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-[#9CA3AF]">Member Since</p>
                      <p className="text-[#E5E7EB] font-medium">{formatDate(profile.createdAt)}</p>
                    </div>
                  </div>
                  {profile.lastLogin && (
                    <div className="flex items-center space-x-3 p-3 bg-[#0B0B12]/30 rounded-xl border border-[#26263A]/30">
                      <div className="w-8 h-8 bg-gradient-to-br from-[#7C3AED] to-[#A855F7] rounded-lg flex items-center justify-center shadow-[0_0_8px_rgba(124,58,237,0.3)]">
                        <Calendar className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-[#9CA3AF]">Last Login</p>
                        <p className="text-[#E5E7EB] font-medium">{formatDate(profile.lastLogin)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <NavigationFooter />
    </div>
  );
}
