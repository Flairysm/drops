import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import { User, Mail, Calendar, CreditCard, Settings, Shield, Eye, EyeOff, Home, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { Navigation } from '../components/Navigation';
import { NavigationFooter } from '../components/NavigationFooter';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  credits: string;
  createdAt: string;
  lastLogin?: string;
}

interface ProfileUpdateData {
  username?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

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
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user) {
      setProfile({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        credits: user.credits,
        createdAt: user.createdAt || new Date().toISOString(),
        lastLogin: user.lastLogin
      });
      setProfileData({
        username: user.username,
        email: user.email,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
    setLoading(false);
  }, [user]);

  const handleInputChange = (field: keyof ProfileUpdateData, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: profileData.username,
          email: profileData.email
        }),
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
          title: "Update Failed",
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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (profileData.newPassword !== profileData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirm password do not match",
        variant: "destructive",
      });
      return;
    }

    if (profileData.newPassword && profileData.newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);

    try {
      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: profileData.currentPassword,
          newPassword: profileData.newPassword
        }),
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-red-500 hover:bg-red-600';
      case 'moderator':
        return 'bg-blue-500 hover:bg-blue-600';
      default:
        return 'bg-green-500 hover:bg-green-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B0B12] via-[#151521] to-[#0B0B12] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#22D3EE] mx-auto mb-4"></div>
          <div className="text-[#E5E7EB] text-xl font-medium">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B0B12] via-[#151521] to-[#0B0B12] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 font-bold text-[#FF5964]">!</div>
          <div className="text-[#E5E7EB] text-xl font-medium">Profile not found</div>
          <Link href="/home">
            <Button className="mt-4 bg-gradient-to-r from-[#22D3EE] to-[#00E6A8] hover:from-[#00E6A8] hover:to-[#22D3EE] text-[#0B0B12] font-semibold">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0B12] via-[#151521] to-[#0B0B12]">
      <Navigation />
      
      <div className="pt-20 pb-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header with Back Button */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-6">
              <Link href="/home">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="group flex items-center text-[#E5E7EB] hover:text-[#22D3EE] hover:bg-[#151521]/50 p-3 rounded-2xl transition-all duration-300 border border-transparent hover:border-[#26263A]/50"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-[#7C3AED] to-[#22D3EE] rounded-full flex items-center justify-center shadow-[0_0_12px_rgba(124,58,237,0.3)] group-hover:shadow-[0_0_16px_rgba(124,58,237,0.5)] transition-all duration-300">
                    <ArrowLeft className="w-4 h-4 text-white" />
                  </div>
                  <span className="ml-2 font-medium">Back to Home</span>
                </Button>
              </Link>
            </div>
            
            <div className="text-center">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-[#22D3EE] via-[#00E6A8] to-[#22D3EE] bg-clip-text text-transparent mb-4 tracking-wide">
                Profile Settings
              </h1>
              <p className="text-[#9CA3AF] text-lg">Manage your account settings and preferences</p>
            </div>
          </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-[#151521]/95 backdrop-blur-xl border border-[#26263A]/50 rounded-2xl p-1 shadow-2xl">
            <TabsTrigger 
              value="profile" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#22D3EE] data-[state=active]:to-[#00E6A8] data-[state=active]:text-[#0B0B12] text-[#E5E7EB] hover:text-[#22D3EE] transition-all duration-300 rounded-xl font-medium"
            >
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#22D3EE] data-[state=active]:to-[#00E6A8] data-[state=active]:text-[#0B0B12] text-[#E5E7EB] hover:text-[#22D3EE] transition-all duration-300 rounded-xl font-medium"
            >
              <Shield className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger 
              value="account" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#22D3EE] data-[state=active]:to-[#00E6A8] data-[state=active]:text-[#0B0B12] text-[#E5E7EB] hover:text-[#22D3EE] transition-all duration-300 rounded-xl font-medium"
            >
              <Settings className="w-4 h-4 mr-2" />
              Account
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="bg-[#151521]/95 backdrop-blur-xl border border-[#26263A]/50 rounded-2xl shadow-2xl">
              <CardHeader>
                <CardTitle className="text-[#E5E7EB] flex items-center text-xl">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#7C3AED] to-[#22D3EE] rounded-lg flex items-center justify-center shadow-[0_0_12px_rgba(124,58,237,0.3)] mr-3">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  Profile Information
                </CardTitle>
                <CardDescription className="text-[#9CA3AF]">
                  Update your personal information
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
                      <Label htmlFor="email" className="text-[#E5E7EB] font-medium">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="bg-[#0B0B12]/50 border-[#26263A] text-[#E5E7EB] focus:border-[#22D3EE] focus:ring-[#22D3EE]/20 rounded-xl"
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={updating}
                    className="w-full bg-gradient-to-r from-[#22D3EE] to-[#00E6A8] hover:from-[#00E6A8] hover:to-[#22D3EE] text-[#0B0B12] font-semibold py-3 rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] transition-all duration-300 hover:scale-105"
                  >
                    {updating ? 'Updating...' : 'Update Profile'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card className="bg-[#151521]/95 backdrop-blur-xl border border-[#26263A]/50 rounded-2xl shadow-2xl">
              <CardHeader>
                <CardTitle className="text-[#E5E7EB] flex items-center text-xl">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#FF5964] to-[#FF8A80] rounded-lg flex items-center justify-center shadow-[0_0_12px_rgba(255,89,100,0.3)] mr-3">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  Change Password
                </CardTitle>
                <CardDescription className="text-[#9CA3AF]">
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="text-[#E5E7EB] font-medium">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showPassword ? "text" : "password"}
                        value={profileData.currentPassword}
                        onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                        className="bg-[#0B0B12]/50 border-[#26263A] text-[#E5E7EB] focus:border-[#22D3EE] focus:ring-[#22D3EE]/20 rounded-xl pr-10"
                        placeholder="Enter current password"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-[#9CA3AF]" />
                        ) : (
                          <Eye className="h-4 w-4 text-[#9CA3AF]" />
                        )}
                      </Button>
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
                        placeholder="Enter new password"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4 text-[#9CA3AF]" />
                        ) : (
                          <Eye className="h-4 w-4 text-[#9CA3AF]" />
                        )}
                      </Button>
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
                        placeholder="Confirm new password"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-[#9CA3AF]" />
                        ) : (
                          <Eye className="h-4 w-4 text-[#9CA3AF]" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={updating}
                    className="w-full bg-gradient-to-r from-[#FF5964] to-[#FF8A80] hover:from-[#FF8A80] hover:to-[#FF5964] text-white font-semibold py-3 rounded-xl shadow-[0_0_20px_rgba(255,89,100,0.4)] hover:shadow-[0_0_30px_rgba(255,89,100,0.6)] transition-all duration-300 hover:scale-105"
                  >
                    {updating ? 'Updating...' : 'Change Password'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6">
            <Card className="bg-[#151521]/95 backdrop-blur-xl border border-[#26263A]/50 rounded-2xl shadow-2xl">
              <CardHeader>
                <CardTitle className="text-[#E5E7EB] flex items-center text-xl">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#7C3AED] to-[#A855F7] rounded-lg flex items-center justify-center shadow-[0_0_12px_rgba(124,58,237,0.3)] mr-3">
                    <Settings className="w-4 h-4 text-white" />
                  </div>
                  Account Information
                </CardTitle>
                <CardDescription className="text-[#9CA3AF]">
                  View your account details and statistics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-3 bg-[#0B0B12]/30 rounded-xl border border-[#26263A]/30">
                      <div className="w-8 h-8 bg-gradient-to-br from-[#7C3AED] to-[#22D3EE] rounded-lg flex items-center justify-center shadow-[0_0_8px_rgba(124,58,237,0.3)]">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-[#9CA3AF]">Username</p>
                        <p className="text-[#E5E7EB] font-medium">{profile.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-[#0B0B12]/30 rounded-xl border border-[#26263A]/30">
                      <div className="w-8 h-8 bg-gradient-to-br from-[#22D3EE] to-[#00E6A8] rounded-lg flex items-center justify-center shadow-[0_0_8px_rgba(34,211,238,0.3)]">
                        <Mail className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-[#9CA3AF]">Email</p>
                        <p className="text-[#E5E7EB] font-medium">{profile.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-[#0B0B12]/30 rounded-xl border border-[#26263A]/30">
                      <div className="w-8 h-8 bg-gradient-to-br from-[#FF5964] to-[#FF8A80] rounded-lg flex items-center justify-center shadow-[0_0_8px_rgba(255,89,100,0.3)]">
                        <Shield className="w-4 h-4 text-white" />
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
          </TabsContent>
        </Tabs>
        </div>
      </div>
      
      <NavigationFooter />
    </div>
  );
}
