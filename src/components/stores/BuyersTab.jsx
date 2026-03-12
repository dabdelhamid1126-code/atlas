import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Zap, Plus, Pencil, Trash2, ShoppingCart, Tag, Globe, Check, SlidersHorizontal } from 'lucide-react';
import { BuyerIcon, BUYER_PRESETS } from './VendorLogos';

const TYPE_LABELS = { wholesale_churning: 'Wholesale / Churn', marketplace: 'Marketplace' };
const TYPE_COLORS = { wholesale_churning: '#F59E0B', marketplace: '#3B82F6' };

export default function BuyersTab({ buyers }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [quickSearch, setQuickSearch] = useState('');
  const [quickType, setQuickType] = useState('all');
  const [selected, setSelected] = useState([]);
  const [form, setForm] = useState({ name: '', type: 'wholesale_churning', contact_info: '', website: '', notes: '' });

  const createMutation = useMutation({ mutationFn: (d) => base44.entities.Buyer.create(d), onSuccess: () => { qc.invalidateQueries(['buyers']); setShowAdd(false); resetForm(); } });
  const updateMutation = useMutation({ mutationFn: ({ id, d }) => base44.entities.Buyer.update(id, d), onSuccess: () => { qc.invalidateQueries(['buyers']); setShowAdd(false); setEditing(null); resetForm(); } });
  const deleteMutation = useMutation({ mutationFn: (id) => base44.entities.Buyer.delete(id), onSuccess: () => qc.invalidateQueries(['buyers']) });

  const resetForm = () => setForm({ name: '', type: 'wholesale_churning', contact_info: '', website: '', notes: '' });

  const openEdit = (b) => { setEditing(b); setForm({ name: b.name, type: b.type || 'wholesale_churning', contact_info: b.contact_info || '', website: b.website || '', notes: b.notes || '' }); setShowAdd(true); };
  const openAdd = () => { setEditing(null); resetForm(); setShowAdd(true); };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    if (editing) updateMutation.mutate({ id: editing.id, d: form });
    else createMutation.mutate(form);
  };

  const filtered = filterType === 'all' ? buyers : buyers.filter(b => b.type === filterType);
  const wholesale = filtered.filter(b => b.type === 'wholesale_churning');
  const marketplace = filtered.filter(b => b.type === 'marketplace');

  const filteredPresets = BUYER_PRESETS.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(quickSearch.toLowerCase());
    const matchType = quickType === 'all' || p.type === quickType;
    return matchSearch && matchType;
  });

  const existingNames = buyers.map(b => b.name.toLowerCase());
  const togglePreset = (name) => setSelected(s => s.includes(name) ? s.filter(x => x !== name) : [...s, name]);

  const handleQuickAdd = async () => {
    const toAdd = BUYER_PRESETS.filter(p => selected.includes(p.name));
    for (const p of toAdd) {
      await base44.entities.Buyer.create({ name: p.name, type: p.type, website: p.website || '' });
    }
    qc.invalidateQueries(['buyers']);
    setShowQuick(false);
    setSelected([]);
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 bg-secondary text-sm text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" />
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-transparent text-foreground text-sm focus:outline-none">
            <option value="all">All Buyer Types</option>
            <option value="wholesale_churning">Wholesale / Churning</option>
            <option value="marketplace">Marketplace</option>
          </select>
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} buyer{filtered.length !== 1 ? 's' : ''} — where you sell to</span>
        <div className="flex-1" />
        <Button variant="outline" className="gap-2 border-border bg-secondary text-foreground" onClick={() => { setSelected([]); setQuickSearch(''); setQuickType('all'); setShowQuick(true); }}>
          <Zap className="h-4 w-4 text-yellow-400" /> Quick Add
        </Button>
        <Button className="gap-2 bg-violet-600 hover:bg-violet-700 text-white" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Custom
        </Button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center">
            <ShoppingCart className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-white font-semibold text-lg">No buyers added yet.</p>
          <p className="text-muted-foreground text-sm">Quick Add popular buyers or create custom ones.</p>
          <Button className="bg-violet-600 hover:bg-violet-700 text-white gap-2 mt-2" onClick={() => { setSelected([]); setShowQuick(true); }}>
            <Zap className="h-4 w-4 text-yellow-400" /> Quick Add Buyers
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {wholesale.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Tag className="h-4 w-4 text-amber-400" />
                <span className="font-semibold text-white text-sm">Wholesale / Churning Platforms</span>
                <span className="text-muted-foreground text-sm">({wholesale.length})</span>
              </div>
              <div className="space-y-2">
                {wholesale.map(b => (
                  <BuyerCard key={b.id} buyer={b} onEdit={openEdit} onDelete={id => deleteMutation.mutate(id)} />
                ))}
              </div>
            </div>
          )}
          {marketplace.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Globe className="h-4 w-4 text-blue-400" />
                <span className="font-semibold text-white text-sm">Marketplaces</span>
                <span className="text-muted-foreground text-sm">({marketplace.length})</span>
              </div>
              <div className="space-y-2">
                {marketplace.map(b => (
                  <BuyerCard key={b.id} buyer={b} onEdit={openEdit} onDelete={id => deleteMutation.mutate(id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showAdd} onOpenChange={(o) => { if (!o) { setShowAdd(false); setEditing(null); } }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">{editing ? 'Edit Buyer' : 'Add Buyer'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Buyer / Platform Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. ElectronicBuyer, Amazon FBA, eBay..." className="bg-secondary border-border text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Type *</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger className="bg-secondary border-border text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="wholesale_churning">Wholesale / Churning Platform</SelectItem>
                  <SelectItem value="marketplace">Marketplace (Amazon, eBay, etc.)</SelectItem>
                </SelectContent>
              </Select>
              {form.type === 'wholesale_churning' && (
                <p className="text-xs text-muted-foreground mt-1">A churning/wholesale buyer — items go through: purchased → scanned in → paid out</p>
              )}
              {form.type === 'marketplace' && (
                <p className="text-xs text-muted-foreground mt-1">A marketplace where you list and sell items directly to consumers</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Contact Info</Label>
              <Input value={form.contact_info} onChange={e => setForm({ ...form, contact_info: e.target.value })} placeholder="Email or phone (optional)" className="bg-secondary border-border text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Website</Label>
              <Input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://..." className="bg-secondary border-border text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="bg-secondary border-border text-white resize-none" rows={2} />
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
            <DialogTitle className="text-white">Quick Add Buyers</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <Input value={quickSearch} onChange={e => setQuickSearch(e.target.value)} placeholder="Search buyers..." className="bg-secondary border-border text-white flex-1" />
            <Select value={quickType} onValueChange={setQuickType}>
              <SelectTrigger className="bg-secondary border-border text-white w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="wholesale_churning">Wholesale / Churning</SelectItem>
                <SelectItem value="marketplace">Marketplace</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {selected.length > 0 && (
            <div className="flex items-center justify-between bg-green-900/30 border border-green-500/30 rounded-lg px-3 py-2 text-sm">
              <span className="text-green-400 font-medium">✓ {selected.length} buyer{selected.length > 1 ? 's' : ''} selected</span>
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
                  <BuyerIcon name={p.name} size={38} />
                  <div className="flex-1">
                    <p className="font-semibold text-white text-sm">{p.name}</p>
                    <p className="text-muted-foreground text-xs">{TYPE_LABELS[p.type]}{p.website ? ` · ${p.website}` : ''}</p>
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
              Add {selected.length > 0 ? selected.length : ''} Buyer{selected.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BuyerCard({ buyer, onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-secondary/40 transition-colors group">
      <BuyerIcon name={buyer.name} size={42} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white">{buyer.name}</p>
        {buyer.website && (
          <a href={buyer.website} target="_blank" rel="noreferrer" className="text-xs text-violet-400 hover:underline truncate block">{buyer.website}</a>
        )}
        <div className="mt-1">
          <TypeTag type={buyer.type} />
        </div>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={() => onEdit(buyer)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-300" onClick={() => onDelete(buyer.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function TypeTag({ type }) {
  const label = TYPE_LABELS[type] || type;
  const color = TYPE_COLORS[type] || '#6B7280';
  return (
    <span style={{ background: color + '22', color, border: `1px solid ${color}44`, borderRadius: 6, padding: '1px 8px', fontSize: 11, fontWeight: 600 }}>
      {label}
    </span>
  );
}