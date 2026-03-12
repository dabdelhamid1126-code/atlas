import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, User, Star, SlidersHorizontal } from 'lucide-react';
import { VendorIcon } from './VendorLogos';

export default function AccountsTab({ accounts, vendors }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterVendor, setFilterVendor] = useState('all');
  const [form, setForm] = useState({ vendor_id: '', vendor_name: '', account_name: '', email: '', username: '', status: 'active', notes: '', ya_cashback: '' });

  const createMutation = useMutation({ mutationFn: (d) => base44.entities.Account.create(d), onSuccess: () => { qc.invalidateQueries(['accounts']); setShowAdd(false); resetForm(); } });
  const updateMutation = useMutation({ mutationFn: ({ id, d }) => base44.entities.Account.update(id, d), onSuccess: () => { qc.invalidateQueries(['accounts']); setShowAdd(false); setEditing(null); resetForm(); } });
  const deleteMutation = useMutation({ mutationFn: (id) => base44.entities.Account.delete(id), onSuccess: () => qc.invalidateQueries(['accounts']) });

  const resetForm = () => setForm({ vendor_id: '', vendor_name: '', account_name: '', email: '', username: '', status: 'active', notes: '', ya_cashback: '' });

  const openEdit = (a) => {
    setEditing(a);
    setForm({ vendor_id: a.vendor_id || '', vendor_name: a.vendor_name || '', account_name: a.account_name || '', email: a.email || '', username: a.username || '', status: a.status || 'active', notes: a.notes || '', ya_cashback: a.ya_cashback || '' });
    setShowAdd(true);
  };

  const openAdd = () => { setEditing(null); resetForm(); setShowAdd(true); };

  const handleVendorSelect = (vid) => {
    const v = vendors.find(v => v.id === vid);
    setForm({ ...form, vendor_id: vid, vendor_name: v?.name || '' });
  };

  const handleSubmit = () => {
    if (!form.account_name.trim() || !form.vendor_id) return;
    if (editing) updateMutation.mutate({ id: editing.id, d: form });
    else createMutation.mutate(form);
  };

  const filtered = filterVendor === 'all' ? accounts : accounts.filter(a => a.vendor_id === filterVendor);

  // Group by vendor
  const groups = vendors.reduce((acc, v) => {
    const accs = filtered.filter(a => a.vendor_id === v.id);
    if (accs.length > 0) acc.push({ vendor: v, items: accs });
    return acc;
  }, []);
  // Accounts with no matching vendor
  const orphans = filtered.filter(a => !vendors.find(v => v.id === a.vendor_id));
  if (orphans.length > 0) groups.push({ vendor: { id: 'unknown', name: 'Other' }, items: orphans });

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 bg-secondary text-sm text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" />
          <select value={filterVendor} onChange={e => setFilterVendor(e.target.value)} className="bg-transparent text-foreground text-sm focus:outline-none">
            <option value="all">All Vendors</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} account{filtered.length !== 1 ? 's' : ''}</span>
        <div className="flex-1" />
        <Button className="gap-2 bg-violet-600 hover:bg-violet-700 text-white" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add Account
        </Button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-white font-semibold text-lg">No accounts yet.</p>
          <p className="text-muted-foreground text-sm">Add your platform accounts linked to each vendor.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ vendor, items }) => (
            <div key={vendor.id}>
              <div className="flex items-center gap-2 mb-3">
                <VendorIcon name={vendor.name} size={28} />
                <span className="font-semibold text-white text-sm">{vendor.name}</span>
                <span className="text-muted-foreground text-sm">({items.length})</span>
              </div>
              <div className="space-y-2 pl-1">
                {items.map(a => (
                  <div key={a.id} className="p-4 rounded-xl border border-border bg-card group relative">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white">{a.account_name}</p>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/30 text-green-400 border border-green-500/20 capitalize">{a.status || 'active'}</span>
                        </div>
                        {a.username && <p className="text-muted-foreground text-xs">@{a.username}</p>}
                        {a.email && <p className="text-muted-foreground text-xs">{a.email}</p>}
                        {a.ya_cashback && (
                          <div className="mt-2 flex items-center gap-2 bg-amber-900/20 border border-amber-500/25 rounded-lg px-3 py-1.5">
                            <Star className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                            <span className="text-amber-300 text-xs font-medium">{a.ya_cashback}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={() => openEdit(a)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-300" onClick={() => deleteMutation.mutate(a.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showAdd} onOpenChange={(o) => { if (!o) { setShowAdd(false); setEditing(null); } }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">{editing ? 'Edit Account' : 'Add Account'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Vendor *</Label>
              <Select value={form.vendor_id} onValueChange={handleVendorSelect}>
                <SelectTrigger className="bg-secondary border-border text-white">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Account Name *</Label>
              <Input value={form.account_name} onChange={e => setForm({ ...form, account_name: e.target.value })} placeholder="e.g. Main Account, Business..." className="bg-secondary border-border text-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Email</Label>
                <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="login@email.com" className="bg-secondary border-border text-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Username</Label>
                <Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="Platform username" className="bg-secondary border-border text-white" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger className="bg-secondary border-border text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Young Adult Cashback (optional)</Label>
              <Input value={form.ya_cashback} onChange={e => setForm({ ...form, ya_cashback: e.target.value })} placeholder="e.g. 6% back on Amazon" className="bg-secondary border-border text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="bg-secondary border-border text-white resize-none" rows={2} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 border-border" onClick={() => { setShowAdd(false); setEditing(null); }}>Cancel</Button>
              <Button className="flex-1 bg-violet-600 hover:bg-violet-700 text-white" onClick={handleSubmit} disabled={!form.account_name.trim() || !form.vendor_id}>
                {editing ? 'Save Changes' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}