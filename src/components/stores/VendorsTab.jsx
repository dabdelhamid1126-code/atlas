import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Zap, Plus, Pencil, Trash2, Store, Check, X } from 'lucide-react';
import { VendorIcon, VENDOR_PRESETS } from './VendorLogos';

const TYPE_COLORS = { Online: '#3B82F6', Wholesale: '#F59E0B', Retail: '#10B981' };

function TypeTag({ type }) {
  const color = TYPE_COLORS[type] || '#6B7280';
  return (
    <span style={{ background: color + '22', color, border: `1px solid ${color}44`, borderRadius: 6, padding: '1px 8px', fontSize: 11, fontWeight: 600 }}>
      {type || 'Unknown'}
    </span>
  );
}

export default function VendorsTab({ vendors }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', type: '', address: '', notes: '' });
  const [quickSearch, setQuickSearch] = useState('');
  const [quickCat, setQuickCat] = useState('All Categories');
  const [selected, setSelected] = useState([]);

  const createMutation = useMutation({ mutationFn: (d) => base44.entities.Vendor.create(d), onSuccess: () => { qc.invalidateQueries(['vendors']); setShowAdd(false); setForm({ name: '', type: '', address: '', notes: '' }); } });
  const updateMutation = useMutation({ mutationFn: ({ id, d }) => base44.entities.Vendor.update(id, d), onSuccess: () => { qc.invalidateQueries(['vendors']); setShowAdd(false); setEditing(null); setForm({ name: '', type: '', address: '', notes: '' }); } });
  const deleteMutation = useMutation({ mutationFn: (id) => base44.entities.Vendor.delete(id), onSuccess: () => qc.invalidateQueries(['vendors']) });

  const openEdit = (v) => { setEditing(v); setForm({ name: v.name, type: v.type || '', address: v.address || '', notes: v.notes || '' }); setShowAdd(true); };
  const openAdd = () => { setEditing(null); setForm({ name: '', type: '', address: '', notes: '' }); setShowAdd(true); };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    if (editing) updateMutation.mutate({ id: editing.id, d: form });
    else createMutation.mutate(form);
  };

  const categories = ['All Categories', ...new Set(VENDOR_PRESETS.map(v => v.category))];
  const filteredPresets = VENDOR_PRESETS.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(quickSearch.toLowerCase());
    const matchCat = quickCat === 'All Categories' || p.category === quickCat;
    return matchSearch && matchCat;
  });

  const togglePreset = (name) => setSelected(s => s.includes(name) ? s.filter(x => x !== name) : [...s, name]);

  const handleQuickAdd = async () => {
    const toAdd = VENDOR_PRESETS.filter(p => selected.includes(p.name));
    for (const p of toAdd) {
      await base44.entities.Vendor.create({ name: p.name, type: p.type });
    }
    qc.invalidateQueries(['vendors']);
    setShowQuick(false);
    setSelected([]);
  };

  const existingNames = vendors.map(v => v.name.toLowerCase());

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-5">
        <Button variant="outline" className="gap-2 border-border bg-secondary text-foreground" onClick={() => { setSelected([]); setQuickSearch(''); setQuickCat('All Categories'); setShowQuick(true); }}>
          <Zap className="h-4 w-4 text-yellow-400" /> Quick Add
        </Button>
        <Button className="gap-2 bg-violet-600 hover:bg-violet-700 text-white" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add Vendor
        </Button>
      </div>

      {/* List */}
      {vendors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center">
            <Store className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-white font-semibold text-lg">No vendors added yet.</p>
          <p className="text-muted-foreground text-sm">Add vendors to track where you buy from.</p>
          <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-2 mt-2" onClick={() => { setSelected([]); setShowQuick(true); }}>
            <Zap className="h-4 w-4 text-yellow-400" /> Quick Add Common Vendors
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {vendors.map(v => (
            <div key={v.id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-secondary/40 transition-colors group">
              <VendorIcon name={v.name} size={42} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white">{v.name}</p>
                <TypeTag type={v.type} />
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={() => openEdit(v)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-300" onClick={() => deleteMutation.mutate(v.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showAdd} onOpenChange={(o) => { if (!o) { setShowAdd(false); setEditing(null); } }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">{editing ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Vendor Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Amazon, Home Depot..." className="bg-secondary border-border text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Type</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger className="bg-secondary border-border text-white">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="Retail">Retail</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="Wholesale">Wholesale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Address</Label>
              <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Optional" className="bg-secondary border-border text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="bg-secondary border-border text-white resize-none" rows={3} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 border-border" onClick={() => { setShowAdd(false); setEditing(null); }}>Cancel</Button>
              <Button className="flex-1 bg-violet-600 hover:bg-violet-700 text-white" onClick={handleSubmit} disabled={!form.name.trim()}>
                {editing ? 'Save Changes' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Add Modal */}
      <Dialog open={showQuick} onOpenChange={setShowQuick}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white">Quick Add Vendors</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <Input value={quickSearch} onChange={e => setQuickSearch(e.target.value)} placeholder="Search vendors..." className="bg-secondary border-border text-white flex-1" />
            <Select value={quickCat} onValueChange={setQuickCat}>
              <SelectTrigger className="bg-secondary border-border text-white w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {selected.length > 0 && (
            <div className="flex items-center justify-between bg-green-900/30 border border-green-500/30 rounded-lg px-3 py-2 text-sm">
              <span className="text-green-400 font-medium">✓ {selected.length} vendor{selected.length > 1 ? 's' : ''} selected</span>
              <button className="text-muted-foreground hover:text-white text-xs underline" onClick={() => setSelected([])}>Clear</button>
            </div>
          )}
          <div className="overflow-y-auto flex-1 space-y-1 pr-1 mt-1">
            {filteredPresets.map(p => {
              const isSelected = selected.includes(p.name);
              const alreadyExists = existingNames.includes(p.name.toLowerCase());
              return (
                <div key={p.name}
                  onClick={() => !alreadyExists && togglePreset(p.name)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors border ${isSelected ? 'bg-green-900/25 border-green-500/30' : 'bg-secondary/40 border-transparent hover:border-border'} ${alreadyExists ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <VendorIcon name={p.name} size={38} />
                  <div className="flex-1">
                    <p className="font-semibold text-white text-sm">{p.name}</p>
                    <p className="text-muted-foreground text-xs">{p.type} · {p.category}</p>
                    {alreadyExists && <p className="text-xs text-yellow-500">Already added</p>}
                  </div>
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-green-500 border-green-500' : 'border-muted-foreground'}`}>
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 pt-3 border-t border-border mt-2">
            <Button variant="outline" className="flex-1 border-border" onClick={() => setShowQuick(false)}>Cancel</Button>
            <Button className="flex-1 bg-violet-600 hover:bg-violet-700 text-white" onClick={handleQuickAdd} disabled={selected.length === 0}>
              Add {selected.length > 0 ? selected.length : ''} Vendor{selected.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}