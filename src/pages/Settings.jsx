import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Target, Settings as SettingsIcon, Upload } from 'lucide-react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const u = await base44.auth.me();
      return u;
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data) => {
      await base44.auth.updateMe(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  const handlePictureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPicture(true);
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      await updateUserMutation.mutateAsync({ profile_picture_url: response.file_url });
    } catch (err) {
      console.error('Failed to upload picture:', err);
    } finally {
      setUploadingPicture(false);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'goals', label: 'Goals', icon: Target },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your profile picture and personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Picture Section */}
            <div className="space-y-4">
              <label className="text-sm font-medium">Profile Picture</label>
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  {user?.profile_picture_url && <AvatarImage src={user.profile_picture_url} />}
                  <AvatarFallback className="bg-gradient-to-br from-purple-600 to-violet-700 text-white text-lg font-semibold">
                    {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploadingPicture}
                    className="relative"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingPicture ? 'Uploading...' : 'Change Picture'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePictureUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </Button>
                  <p className="text-xs text-muted-foreground">JPG, PNG, or GIF (max 5MB)</p>
                </div>
              </div>
            </div>

            {/* User Details (Read-only) */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                <p className="text-foreground mt-1">{user?.full_name || 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-foreground mt-1">{user?.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Role</label>
                <p className="text-foreground mt-1 capitalize">{user?.role || 'user'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goals Tab */}
      {activeTab === 'goals' && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Goal Tracking</CardTitle>
            <CardDescription>Set and manage your financial goals</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Click the button below to configure your goals.</p>
            <a href="/Goals">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                <Target className="h-4 w-4 mr-2" />
                Go to Goals Settings
              </Button>
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}