import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Mail, CheckCircle, XCircle, Loader2, RefreshCw, Wifi, WifiOff,
  Clock, AlertTriangle, BarChart3, Settings, Inbox, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const DEFAULT_SETTINGS = {
  folder: 'INBOX',
  keywords: ['order confirmation', 'order shipped', 'tracking', 'your order'],
  lookback_days: '30',
  retailers_include: [],
  retailers_exclude: [],
};

const KEYWORD_PRESETS = ['order confirmation', 'order shipped', 'tracking number', 'your order', 'shipment notification', 'delivery'];
const RETAILER_PRESETS = ['Amazon', 'Bestbuy', 'Walmart', 'Target', 'Woot', 'Costco', 'eBay'];

export default function EmailSettingsTab({ onSyncNow }) {
  const [connectedEmail, setConnectedEmail] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [stats, setStats] = useState({ total: 0, lastSync: null, lastError: null });
  const [newKeyword, setNewKeyword] = useState('');
  const [newExclude, setNewExclude] = useState('');

  useEffect(() => {
    loadConnectedEmail();
    loadStats();
    const saved = localStorage.getItem('emailImportSettings');
    if (saved) setSettings(JSON.parse(saved));
  }, []);

  const loadConnectedEmail = async () => {
    try {
      const { accessToken } = await base44.asServiceRole?.connectors?.getConnection?.('gmail') || {};
      if (accessToken) {
        // Get Gmail profile
        const res = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          setConnectedEmail(data.emailAddress);
        }
      }
    } catch {
      setConnectedEmail(null);
    }
  };

  const loadStats = async () => {
    try {
      const orders = await base44.entities.PurchaseOrder.filter({ notes: 'Imported from Gmail' });
      const lastSync = localStorage.getItem('lastGmailSync');
      const lastError = localStorage.getItem('lastGmailError');
      setStats({
        total: orders.length,
        lastSync: lastSync ? new Date(lastSync) : null,
        lastError: lastError || null
      });
    } catch {
      // ignore
    }
  };

  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('emailImportSettings', JSON.stringify(newSettings));
    toast.success('Settings saved');
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await base44.functions.invoke('fetchGmailEmails', {});
      const count = res.data?.emails?.length || 0;
      setTestResult({ success: true, message: `Connected! Found ${count} recent order emails.` });
      localStorage.setItem('lastGmailSync', new Date().toISOString());
      loadStats();
    } catch (e) {
      setTestResult({ success: false, message: e.message || 'Connection failed' });
      localStorage.setItem('lastGmailError', e.message || 'Connection failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await onSyncNow?.();
      localStorage.setItem('lastGmailSync', new Date().toISOString());
      localStorage.removeItem('lastGmailError');
      loadStats();
      toast.success('Sync triggered — check Import tab to process emails');
    } catch (e) {
      localStorage.setItem('lastGmailError', e.message);
      toast.error('Sync failed: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

  const addKeyword = (kw) => {
    const word = kw || newKeyword.trim();
    if (!word || settings.keywords.includes(word)) return;
    const updated = { ...settings, keywords: [...settings.keywords, word] };
    saveSettings(updated);
    setNewKeyword('');
  };

  const removeKeyword = (kw) => {
    saveSettings({ ...settings, keywords: settings.keywords.filter(k => k !== kw) });
  };

  const addExclude = () => {
    const r = newExclude.trim();
    if (!r || settings.retailers_exclude.includes(r)) return;
    saveSettings({ ...settings, retailers_exclude: [...settings.retailers_exclude, r] });
    setNewExclude('');
  };

  const removeExclude = (r) => {
    saveSettings({ ...settings, retailers_exclude: settings.retailers_exclude.filter(x => x !== r) });
  };

  const isConnected = !!connectedEmail;

  return (
    <div className="space-y-4 mt-4">
      {/* Connected Account */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            Connected Gmail Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {isConnected ? (
                <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center">
                  <Wifi className="h-4 w-4 text-green-600" />
                </div>
              ) : (
                <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center">
                  <WifiOff className="h-4 w-4 text-slate-400" />
                </div>
              )}
              <div>
                {isConnected ? (
                  <>
                    <p className="font-medium text-slate-900 text-sm">{connectedEmail}</p>
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> Connected
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-slate-500 text-sm">No account connected</p>
                    <p className="text-xs text-slate-400">Connect Gmail to enable auto-import</p>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={handleTestConnection} disabled={testing}>
                {testing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wifi className="h-3 w-3 mr-1" />}
                Test Connection
              </Button>
              <Button size="sm" onClick={handleSyncNow} disabled={syncing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {syncing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                Sync Now
              </Button>
            </div>
          </div>

          {testResult && (
            <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {testResult.success ? <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> : <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
              {testResult.message}
            </div>
          )}

          {stats.lastSync && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              Last synced: {format(stats.lastSync, 'MMM d, yyyy h:mm a')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Filter Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            Email Filter Settings
          </CardTitle>
          <CardDescription className="text-xs">Configure which emails to scan and import</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Folder & Lookback */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Email Folder to Scan</Label>
              <Select value={settings.folder} onValueChange={(v) => saveSettings({ ...settings, folder: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INBOX">Inbox</SelectItem>
                  <SelectItem value="[Gmail]/All Mail">All Mail</SelectItem>
                  <SelectItem value="[Gmail]/Sent Mail">Sent Mail</SelectItem>
                  <SelectItem value="[Gmail]/Spam">Spam</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">How Far Back to Scan</Label>
              <Select value={settings.lookback_days} onValueChange={(v) => saveSettings({ ...settings, lookback_days: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="180">Last 6 months</SelectItem>
                  <SelectItem value="365">Last 1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Keywords */}
          <div className="space-y-2">
            <Label className="text-sm">Search Keywords</Label>
            <p className="text-xs text-slate-500">Emails matching any of these keywords will be shown for import</p>
            <div className="flex flex-wrap gap-2">
              {settings.keywords.map(kw => (
                <Badge key={kw} variant="secondary" className="gap-1 cursor-pointer hover:bg-red-100 hover:text-red-700"
                  onClick={() => removeKeyword(kw)}>
                  {kw} ×
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="Add keyword..."
                className="text-sm"
                onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
              />
              <Button size="sm" variant="outline" onClick={() => addKeyword()}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {KEYWORD_PRESETS.filter(k => !settings.keywords.includes(k)).map(k => (
                <button key={k} onClick={() => addKeyword(k)}
                  className="text-xs text-indigo-600 border border-indigo-200 bg-indigo-50 rounded px-2 py-0.5 hover:bg-indigo-100">
                  + {k}
                </button>
              ))}
            </div>
          </div>

          {/* Excluded Retailers */}
          <div className="space-y-2">
            <Label className="text-sm">Exclude Retailers</Label>
            <p className="text-xs text-slate-500">Emails from these retailers will be hidden</p>
            <div className="flex flex-wrap gap-2">
              {settings.retailers_exclude.map(r => (
                <Badge key={r} variant="destructive" className="gap-1 cursor-pointer"
                  onClick={() => removeExclude(r)}>
                  {r} ×
                </Badge>
              ))}
              {settings.retailers_exclude.length === 0 && (
                <span className="text-xs text-slate-400 italic">None excluded</span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={newExclude}
                onChange={(e) => setNewExclude(e.target.value)}
                placeholder="Retailer to exclude..."
                className="text-sm"
                onKeyDown={(e) => e.key === 'Enter' && addExclude()}
              />
              <Button size="sm" variant="outline" onClick={addExclude}>Add</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Import Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-xs text-slate-500">Orders from Gmail</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-sm font-medium text-slate-900">
                {stats.lastSync ? format(stats.lastSync, 'MMM d, h:mm a') : '—'}
              </p>
              <p className="text-xs text-slate-500">Last Successful Sync</p>
            </div>
            <div className={`rounded-lg p-3 text-center ${stats.lastError ? 'bg-red-50' : 'bg-green-50'}`}>
              {stats.lastError ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-500 mx-auto mb-1" />
                  <p className="text-xs text-red-700 truncate">{stats.lastError}</p>
                  <p className="text-xs text-red-500">Last Error</p>
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
                  <p className="text-xs text-green-700">No errors</p>
                  <p className="text-xs text-green-500">Status</p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}