import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Package, ScanBarcode, Plus, Check, AlertTriangle,
  ChevronDown, ChevronUp, Trash2, X, BoxSelect, History,
} from 'lucide-react';
import { toast } from 'sonner';

const today = () => format(new Date(), 'yyyy-MM-dd');

const CONDITION_STYLES = {
  good:    { bg: 'var(--terrain-bg)',  color: 'var(--terrain2)',  border: 'var(--terrain-bdr)',  label: 'Good'    },
  damaged: { bg: 'var(--crimson-bg)',  color: 'var(--crimson2)',  border: 'var(--crimson-bdr)',  label: 'Damaged' },
  missing: { bg: 'var(--gold-bg)',     color: 'var(--gold2)',     border: 'var(--gold-bdr)',     label: 'Missing' },
};

function ConditionBadge({ condition }) {
  const s = CONDITION_STYLES[condition] || CONDITION_STYLES.good;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: s.bg, color: s.color, border: `1px solid ${s.border}`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {s.label}
    </span>
  );
}

function ConditionPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {['good', 'damaged', 'missing'].map(c => {
        const s = CONDITION_STYLES[c];
        const active = value === c;
        return (
          <button key={c} onClick={() => onChange(c)}
            style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${active ? s.border : 'var(--parch-line)'}`, background: active ? s.bg : 'var(--parch-warm)', color: active ? s.color : 'var(--ink-faded)', transition: 'all 0.12s' }}>
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Item editor row ──────────────────────────────────────────────────────

function ItemRow({ item, onChange, onRemove }) {
  return (
    <div style={{ background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', borderRadius: 10, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faded)', display: 'block', marginBottom: 3 }}>Item Name *</label>
          <input value={item.name} onChange={e => onChange('name', e.target.value)} placeholder="e.g. iPhone 15 Pro"
            style={{ width: '100%', height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid var(--parch-line)', background: 'var(--parch-card)', color: 'var(--ink)', fontSize: 13, outline: 'none' }} />
        </div>
        <div style={{ width: 110 }}>
          <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faded)', display: 'block', marginBottom: 3 }}>SKU / Barcode</label>
          <input value={item.sku} onChange={e => onChange('sku', e.target.value)} placeholder="Optional"
            style={{ width: '100%', height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid var(--parch-line)', background: 'var(--parch-card)', color: 'var(--ink)', fontSize: 12, outline: 'none', fontFamily: 'var(--font-mono)' }} />
        </div>
        <div style={{ width: 64 }}>
          <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faded)', display: 'block', marginBottom: 3 }}>Qty</label>
          <input type="number" min="1" value={item.quantity} onChange={e => onChange('quantity', parseInt(e.target.value) || 1)}
            style={{ width: '100%', height: 34, padding: '0 8px', borderRadius: 8, border: '1px solid var(--parch-line)', background: 'var(--parch-card)', color: 'var(--ink)', fontSize: 13, outline: 'none', textAlign: 'center' }} />
        </div>
        <div style={{ width: 90 }}>
          <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faded)', display: 'block', marginBottom: 3 }}>Cost/Unit ($)</label>
          <input type="number" step="0.01" min="0" value={item.cost_per_unit} onChange={e => onChange('cost_per_unit', e.target.value)}
            placeholder="0.00"
            style={{ width: '100%', height: 34, padding: '0 8px', borderRadius: 8, border: '1px solid var(--parch-line)', background: 'var(--parch-card)', color: 'var(--ink)', fontSize: 13, outline: 'none' }} />
        </div>
        <button onClick={onRemove} style={{ marginTop: 18, width: 28, height: 28, borderRadius: 7, background: 'var(--crimson-bg)', border: '1px solid var(--crimson-bdr)', color: 'var(--crimson)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <X style={{ width: 12, height: 12 }} />
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div>
          <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faded)', display: 'block', marginBottom: 4 }}>Condition</label>
          <ConditionPicker value={item.condition} onChange={v => onChange('condition', v)} />
        </div>
        {item.condition !== 'good' && (
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faded)', display: 'block', marginBottom: 3 }}>Damage Notes</label>
            <input value={item.notes} onChange={e => onChange('notes', e.target.value)} placeholder="e.g. box dented, missing charger..."
              style={{ width: '100%', height: 30, padding: '0 10px', borderRadius: 7, border: '1px solid var(--parch-line)', background: 'var(--parch-card)', color: 'var(--ink)', fontSize: 12, outline: 'none' }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shipment history card ────────────────────────────────────────────────

function ShipmentCard({ shipment, items }) {
  const [open, setOpen] = useState(false);
  const shipItems = items.filter(i => i.shipment_id === shipment.id);
  const condS = CONDITION_STYLES[shipment.box_condition] || CONDITION_STYLES.good;
  const damageItems = shipItems.filter(i => i.condition !== 'good');

  return (
    <div style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: condS.bg, border: `1px solid ${condS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Package style={{ width: 18, height: 18, color: condS.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{shipment.box_code}</span>
            <ConditionBadge condition={shipment.box_condition} />
            {damageItems.length > 0 && (
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'var(--crimson-bg)', color: 'var(--crimson)', border: '1px solid var(--crimson-bdr)' }}>
                {damageItems.length} issue{damageItems.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-faded)' }}>
            {shipment.supplier && <span>{shipment.supplier} · </span>}
            {shipItems.length} item{shipItems.length !== 1 ? 's' : ''}
            {shipment.received_date && <span> · {format(new Date(shipment.received_date + 'T12:00:00'), 'MMM d, yyyy')}</span>}
          </div>
        </div>
        {open ? <ChevronUp style={{ width: 15, height: 15, color: 'var(--ink-ghost)', flexShrink: 0 }} /> : <ChevronDown style={{ width: 15, height: 15, color: 'var(--ink-ghost)', flexShrink: 0 }} />}
      </div>

      {open && (
        <div style={{ borderTop: '1px solid var(--parch-line)', padding: '10px 14px' }}>
          {shipment.box_notes && (
            <p style={{ fontSize: 11, color: 'var(--ink-dim)', marginBottom: 10, padding: '8px 10px', background: 'var(--parch-warm)', borderRadius: 8 }}>{shipment.box_notes}</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {shipItems.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--parch-warm)', borderRadius: 8 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{item.name}</span>
                  {item.sku && <span style={{ fontSize: 10, color: 'var(--ink-ghost)', marginLeft: 6, fontFamily: 'var(--font-mono)' }}>{item.sku}</span>}
                  {item.notes && <p style={{ fontSize: 10, color: 'var(--ink-dim)', marginTop: 2 }}>{item.notes}</p>}
                </div>
                <span style={{ fontSize: 11, color: 'var(--ink-faded)', fontFamily: 'var(--font-mono)' }}>×{item.quantity}</span>
                {item.cost_per_unit > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>${parseFloat(item.cost_per_unit).toFixed(2)}</span>}
                <ConditionBadge condition={item.condition} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────

const newItem = () => ({ id: crypto.randomUUID(), name: '', sku: '', quantity: 1, cost_per_unit: '', condition: 'good', notes: '' });

export default function PackageReceiving() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('receive');
  const [boxCode, setBoxCode] = useState('');
  const [supplier, setSupplier] = useState('');
  const [boxCondition, setBoxCondition] = useState('good');
  const [boxNotes, setBoxNotes] = useState('');
  const [receivedDate, setReceivedDate] = useState(today());
  const [items, setItems] = useState([newItem()]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const boxCodeRef = useRef(null);

  const { data: shipments = [] } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => base44.entities.ShipmentReceiving.list('-received_date', 50),
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ['receivedItems'],
    queryFn: () => base44.entities.ReceivedItem.list('-created_date', 200),
  });

  const addItem = () => setItems(prev => [...prev, newItem()]);
  const removeItem = id => setItems(prev => prev.filter(i => i.id !== id));
  const updateItem = (id, key, val) => setItems(prev => prev.map(i => i.id === id ? { ...i, [key]: val } : i));

  const reset = () => {
    setBoxCode(''); setSupplier(''); setBoxCondition('good'); setBoxNotes('');
    setReceivedDate(today()); setItems([newItem()]); setDone(false);
    setTimeout(() => boxCodeRef.current?.focus(), 100);
  };

  const handleSave = async () => {
    if (!boxCode.trim()) { toast.error('Box code is required'); return; }
    if (!items.some(i => i.name.trim())) { toast.error('Add at least one item'); return; }
    setSaving(true);
    try {
      const validItems = items.filter(i => i.name.trim());
      const damageCount = validItems.filter(i => i.condition !== 'good').length;

      const shipment = await base44.entities.ShipmentReceiving.create({
        box_code: boxCode.trim(),
        supplier: supplier.trim() || null,
        box_condition: boxCondition,
        box_notes: boxNotes.trim() || null,
        item_count: validItems.reduce((s, i) => s + (parseInt(i.quantity) || 1), 0),
        damage_count: damageCount,
        received_date: receivedDate,
      });

      await Promise.all(validItems.map(item =>
        base44.entities.ReceivedItem.create({
          shipment_id: shipment.id,
          box_code: boxCode.trim(),
          sku: item.sku.trim() || null,
          name: item.name.trim(),
          condition: item.condition,
          notes: item.notes.trim() || null,
          quantity: parseInt(item.quantity) || 1,
          cost_per_unit: item.cost_per_unit ? parseFloat(item.cost_per_unit) : null,
        })
      ));

      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['receivedItems'] });
      toast.success(`Shipment ${boxCode} saved — ${validItems.length} item${validItems.length !== 1 ? 's' : ''} received`);
      setDone(true);
      setTimeout(reset, 2500);
    } catch (err) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const totalItems = items.reduce((s, i) => s + (parseInt(i.quantity) || 1), 0);
  const issueCount = items.filter(i => i.condition !== 'good').length;
  const totalCost  = items.reduce((s, i) => s + (parseFloat(i.cost_per_unit) || 0) * (parseInt(i.quantity) || 1), 0);

  return (
    <div style={{ paddingBottom: 40 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title">Package Receiving</h1>
        <p className="page-subtitle">Scan, inspect, and log incoming shipments</p>
      </div>

      {/* Tab bar */}
      <div className="tab-bar" style={{ marginBottom: 20, width: 'fit-content' }}>
        {[
          { key: 'receive', label: 'Receive Package', icon: BoxSelect },
          { key: 'history', label: `History (${shipments.length})`, icon: History },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`tab-btn${tab === t.key ? ' active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <t.icon style={{ width: 13, height: 13 }} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── RECEIVE TAB ── */}
      {tab === 'receive' && (
        <div style={{ maxWidth: 800 }}>
          {done ? (
            <div style={{ background: 'var(--terrain-bg)', border: '1px solid var(--terrain-bdr)', borderRadius: 16, padding: 40, textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--terrain)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Check style={{ width: 28, height: 28, color: '#fff' }} />
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 700, color: 'var(--terrain2)', marginBottom: 8 }}>Shipment Saved!</h2>
              <p style={{ fontSize: 13, color: 'var(--ink-dim)' }}>Ready for next package...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Box info */}
              <div style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 14, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <ScanBarcode style={{ width: 16, height: 16, color: 'var(--gold)' }} />
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink)', margin: 0 }}>Box / Shipment Info</h2>
                </div>
                <div className="grid-2col" style={{ marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faded)', display: 'block', marginBottom: 4 }}>Box Code / Tracking # *</label>
                    <input ref={boxCodeRef} value={boxCode} onChange={e => setBoxCode(e.target.value)} placeholder="Scan or type barcode..."
                      autoFocus
                      style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 9, border: '2px solid var(--gold-bdr)', background: 'var(--parch-warm)', color: 'var(--ink)', fontSize: 14, outline: 'none', fontFamily: 'var(--font-mono)', fontWeight: 700 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faded)', display: 'block', marginBottom: 4 }}>Supplier</label>
                    <input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="e.g. Amazon, Best Buy..."
                      style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 9, border: '1px solid var(--parch-line)', background: 'var(--parch-warm)', color: 'var(--ink)', fontSize: 13, outline: 'none' }} />
                  </div>
                </div>
                <div className="grid-2col" style={{ marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faded)', display: 'block', marginBottom: 4 }}>Received Date</label>
                    <input type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)}
                      style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 9, border: '1px solid var(--parch-line)', background: 'var(--parch-warm)', color: 'var(--ink)', fontSize: 13, outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faded)', display: 'block', marginBottom: 4 }}>Box Condition</label>
                    <ConditionPicker value={boxCondition} onChange={setBoxCondition} />
                  </div>
                </div>
                {boxCondition !== 'good' && (
                  <div>
                    <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faded)', display: 'block', marginBottom: 4 }}>Box Notes</label>
                    <input value={boxNotes} onChange={e => setBoxNotes(e.target.value)} placeholder="Describe the box condition..."
                      style={{ width: '100%', height: 34, padding: '0 12px', borderRadius: 9, border: '1px solid var(--parch-line)', background: 'var(--parch-warm)', color: 'var(--ink)', fontSize: 13, outline: 'none' }} />
                  </div>
                )}
              </div>

              {/* Items */}
              <div style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 14, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Package style={{ width: 16, height: 16, color: 'var(--ocean2)' }} />
                    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink)', margin: 0 }}>Items</h2>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'var(--ocean-bg)', color: 'var(--ocean2)', border: '1px solid var(--ocean-bdr)', fontWeight: 700 }}>{items.length}</span>
                  </div>
                  <button onClick={addItem}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', color: 'var(--ink-dim)', cursor: 'pointer' }}>
                    <Plus style={{ width: 12, height: 12 }} /> Add Item
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map(item => (
                    <ItemRow key={item.id} item={item} onChange={(k, v) => updateItem(item.id, k, v)} onRemove={() => removeItem(item.id)} />
                  ))}
                </div>
              </div>

              {/* Summary + Save */}
              <div style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Items', value: totalItems, color: 'var(--ocean2)' },
                    { label: 'Issues', value: issueCount, color: issueCount > 0 ? 'var(--crimson2)' : 'var(--terrain2)' },
                    { label: 'Total Cost', value: totalCost > 0 ? `$${totalCost.toFixed(2)}` : '—', color: 'var(--gold)' },
                  ].map(s => (
                    <div key={s.label}>
                      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faded)', marginBottom: 2 }}>{s.label}</p>
                      <p style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={reset}
                    style={{ padding: '9px 16px', borderRadius: 9, fontSize: 12, fontWeight: 600, background: 'none', border: '1px solid var(--parch-line)', color: 'var(--ink-faded)', cursor: 'pointer' }}>
                    Reset
                  </button>
                  <button onClick={handleSave} disabled={saving || !boxCode.trim()}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 22px', borderRadius: 9, fontSize: 13, fontWeight: 700, background: saving || !boxCode.trim() ? 'var(--parch-warm)' : 'var(--ink)', border: 'none', color: saving || !boxCode.trim() ? 'var(--ink-ghost)' : 'var(--ne-cream)', cursor: saving || !boxCode.trim() ? 'not-allowed' : 'pointer' }}>
                    {saving
                      ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--ink-ghost)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} /> Saving...</>
                      : <><Check style={{ width: 14, height: 14 }} /> Save Shipment</>
                    }
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === 'history' && (
        <div style={{ maxWidth: 800 }}>
          {/* Stats row */}
          {shipments.length > 0 && (
            <div className="grid-kpi" style={{ marginBottom: 16 }}>
              {[
                { label: 'Total Shipments', value: shipments.length, color: 'var(--gold)' },
                { label: 'Total Items', value: allItems.reduce((s, i) => s + (i.quantity || 1), 0), color: 'var(--ocean2)' },
                { label: 'Issues Found', value: allItems.filter(i => i.condition !== 'good').length, color: 'var(--crimson2)' },
                { label: 'Total Cost', value: `$${allItems.reduce((s, i) => s + (parseFloat(i.cost_per_unit) || 0) * (i.quantity || 1), 0).toFixed(0)}`, color: 'var(--terrain2)' },
              ].map(s => (
                <div key={s.label} className="kpi-card fade-up" style={{ borderTopColor: s.color }}>
                  <div className="kpi-label">{s.label}</div>
                  <div className="kpi-value" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}

          {shipments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 14 }}>
              <Package style={{ width: 36, height: 36, color: 'var(--ink-ghost)', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>No shipments yet</p>
              <p style={{ fontSize: 12, color: 'var(--ink-dim)' }}>Receive your first package to see history here</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {shipments.map(s => (
                <ShipmentCard key={s.id} shipment={s} items={allItems} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}