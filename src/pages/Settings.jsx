import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Target, Settings as SettingsIcon, Upload, Database, Mail, Bell, Palette, Shield } from 'lucide-react';
import Goals from './Goals';

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
    { id: 'data', label: 'Data', icon: Database },
    { id: 'email', label: 'Email Setup', icon: Mail },
    { id: 'notifications', label: 'Notifications', icon: Bell, soon: true },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6">
        <h1 className="text-4xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account preferences</p>
      </div>

      {/* Main Content */}
      <div className="flex">
        {/* Left Sidebar */}
        <div className="w-56 bg-white border-r border-slate-200 p-6">
          <nav className="space-y-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => !tab.soon && setActiveTab(tab.id)}
                  disabled={tab.soon}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
                    isActive
                      ? 'bg-purple-50 text-purple-900 border-l-4 border-purple-600'
                      : tab.soon
                      ? 'text-slate-400 cursor-not-allowed'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-purple-600' : tab.soon ? 'text-slate-300' : 'text-slate-400'}`} />
                  <span className="flex-1">{tab.label}</span>
                  {tab.soon && <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">soon</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 p-8">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-lg border border-slate-200 p-8 space-y-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Profile Information</h2>
                <p className="text-slate-500 text-sm mt-1">Update your profile picture and personal details</p>
              </div>

              {/* Profile Picture Section */}
              <div className="space-y-4">
                <label className="text-sm font-medium text-slate-700">Profile Picture</label>
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
                    <p className="text-xs text-slate-500">JPG, PNG, or GIF (max 5MB)</p>
                  </div>
                </div>
              </div>

              {/* User Details (Read-only) */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Full Name</label>
                  <p className="text-slate-900 mt-1 font-medium">{user?.full_name || 'Not set'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Email</label>
                  <p className="text-slate-900 mt-1 font-medium">{user?.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Role</label>
                  <p className="text-slate-900 mt-1 font-medium capitalize">{user?.role || 'user'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Goals Tab */}
          {activeTab === 'goals' && (
            <div className="bg-white rounded-lg border border-slate-200 p-8">
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  <h2 className="text-2xl font-bold text-slate-900">Goal Tracking</h2>
                </div>
                <p className="text-slate-600 text-sm">Set profit, revenue, cashback, or volume targets. Active goals appear on your Dashboard.</p>
              </div>

              <Goals isEmbedded={true} />
            </div>
          )}

          {/* Data Tab */}
          {activeTab === 'data' && (
            <div className="bg-white rounded-lg border border-slate-200 p-8">
              <h2 className="text-xl font-bold text-slate-900">Data Management</h2>
              <p className="text-slate-500 text-sm mt-1">Export, import, or manage your data</p>
              <p className="text-slate-600 mt-6">Data management features coming soon.</p>
            </div>
          )}

          {/* Email Setup Tab */}
          {activeTab === 'email' && (
            <div className="bg-white rounded-lg border border-slate-200 p-8">
              <h2 className="text-xl font-bold text-slate-900">Email Setup</h2>
              <p className="text-slate-500 text-sm mt-1">Configure email integrations and notifications</p>
              <p className="text-slate-600 mt-6">Email setup features coming soon.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}