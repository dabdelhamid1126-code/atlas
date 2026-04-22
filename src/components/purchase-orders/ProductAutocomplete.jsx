import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Search, Plus, X, Check, Loader } from 'lucide-react';
import { toast } from 'sonner';

const guessCategory = (name) => {
  const n = String(name || '').toLowerCase();
  if (n.includes('ipad') || n.includes('tablet')) return 'tablets';
  if (n.includes('iphone') || n.includes('galaxy s') || n.includes('pixel') || n.includes('smartphone')) return 'phones';
  if (n.includes('macbook') || n.includes('laptop') || n.includes('notebook') || n.includes('imac') || n.includes('surface pro')) return 'laptops';
  if (n.includes('airpods') || n.includes('earbuds') || n.includes('headphone') || n.includes('speaker') || n.includes('buds')) return 'audio';
  if (n.includes('apple watch') || n.includes('galaxy watch') || n.includes('fitbit') || n.includes('garmin') || n.includes('smartwatch')) return 'wearables';
  if (n.includes('nintendo') || n.includes('playstation') || n.includes('xbox') || n.includes('switch') || n.includes('ps5')) return 'gaming';
  if (n.includes('airtag') || n.includes('case') || n.includes('cable') || n.includes('charger') || n.includes('fire stick') || n.includes('echo')) return 'accessories';
  return 'other';
};

const CATEGORIES = ['phones','tablets','laptops','gaming','accessories','wearables','audio','other'];

const SOURCE_STYLES = {
  'Best Buy':  { bg:'var(--gold-bg)',    color:'var(--gold)',    border:'var(--gold-border)' },
  'UPCitemdb': { bg:'var(--ocean-bg)',   color:'var(--ocean)',   border:'var(--ocean-bdr)'  },
  'Google':    { bg:'var(--terrain-bg)', color:'var(--terrain)', border:'var(--terrain-bdr)'},
};

function SourceBadge({ source }) {
  const s = SOURCE_STYLES[source] || SOURCE_STYLES['Google'];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'1px 6px', borderRadius:99, fontSize:9, fontWeight:700, letterSpacing:'0.04em', textTransform:'uppercase', background:s.bg, color:s.color, border:`1px solid ${s.border}`, whiteSpace:'nowrap', flexShrink:0 }}>
      {source}
    </span>
  );
}

function ResultThumb({ src, name, size = 36 }) {
  const [err, setErr] = useState(false);
  if (src && !err) return (
    <img src={src} alt={name} onError={() => setErr(true)}
      style={{ width:size, height:size, borderRadius:7, objectFit:'contain', objectPosition:'center', flexShrink:0, padding:2, background:'var(--parch-warm)', border:'1px solid var(--parch-line)' }} />
  );
  return (
    <div style={{ width:size, height:size, borderRadius:7, flexShrink:0, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink-dim)', fontSize:13, fontWeight:600 }}>
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
}

function UPCPickerModal({ upc, results, onSelect, onManual, onClose }) {
  const [selected, setSelected] = useState(0);
  return (
    <div style={{ position:'fixed', inset:0, zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(26,18,10,0.6)', backdropFilter:'blur(4px)' }} />
      <div style={{ position:'relative', width:'100%', maxWidth:500, background:'var(--parch-card)', borderRadius:16, border:'1px solid var(--parch-line)', boxShadow:'0 24px 60px rgba(0,0,0,0.2)', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--parch-line)', display:'flex', alignItems:'flex-start', justifyContent:'space-between', background:'var(--parch-warm)' }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)', fontFamily:'var(--font-serif)' }}>Select the correct product</div>
            <div style={{ fontSize:10, color:'var(--ink-ghost)', marginTop:2 }}>
              UPC <span style={{ fontFamily:'monospace', background:'var(--parch-warm)', padding:'1px 6px', borderRadius:4, border:'1px solid var(--parch-line)' }}>{upc}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--ink-dim)', cursor:'pointer', padding:4 }}><X style={{ width:16, height:16 }} /></button>
        </div>
        <div style={{ padding:'12px 20px', display:'flex', flexDirection:'column', gap:6, maxHeight:'55vh', overflowY:'auto' }}>
          {results.map((r, i) => (
            <div key={i} onClick={() => setSelected(i)}
              style={{ borderRadius:10, padding:'9px 12px', border:'1px solid', borderColor:selected===i?'var(--terrain-bdr)':'var(--parch-line)', background:selected===i?'var(--terrain-bg)':'var(--parch-warm)', display:'flex', alignItems:'center', gap:10, cursor:'pointer', transition:'all 0.12s' }}>
              <div style={{ width:16, height:16, borderRadius:'50%', flexShrink:0, border:selected===i?'none':'1.5px solid var(--parch-line)', background:selected===i?'var(--terrain)':'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {selected===i && <Check style={{ width:10, height:10, color:'white' }} />}
              </div>
              <ResultThumb src={r.image} name={r.title} size={38} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:500, color:'var(--ink)', lineHeight:1.35, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{r.title}</div>
              </div>
              <SourceBadge source={r.source} />
            </div>
          ))}
          <div onClick={onManual} style={{ borderRadius:10, padding:'9px 12px', border:'1px solid var(--crimson-bdr)', background:'var(--crimson-bg)', fontSize:11, color:'var(--crimson)', cursor:'pointer', textAlign:'center' }}>
            None of these — enter manually
          </div>
        </div>
        <div style={{ padding:'12px 20px', borderTop:'1px solid var(--parch-line)', background:'var(--parch-warm)', display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:500, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', color:'var(--ink-faded)', cursor:'pointer' }}>Cancel</button>
          <button onClick={() => onSelect(results[selected])}
            style={{ padding:'6px 16px', borderRadius:8, fontSize:12, fontWeight:700, background:'var(--ink)', border:'none', color:'var(--ne-cream)', cursor:'pointer' }}>
            Use selected →
          </button>
        </div>
      </div>
    </div>
  );
}

function AddToCatalogForm({ initialName, initialUpc, initialImage, onCreated, onCancel }) {
  const queryClient = useQueryClient();
  const [name, setName]         = useState(initialName || '');
  const [upc, setUpc]           = useState(initialUpc || '');
  const [image, setImage]       = useState(initialImage || '');
  const [category, setCategory] = useState(guessCategory(initialName || ''));
  const [saving, setSaving]     = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Product name is required'); return; }
    setSaving(true);
    try {
      const newProduct = await base44.entities.Product.create({ name:name.trim(), upc:upc.trim(), image:image.trim(), category });
      queryClient.invalidateQueries({ queryKey:['products'] });
      toast.success(`"${name}" added to catalog`);
      onCreated(newProduct);
    } catch { toast.error('Failed to create product'); }
    finally { setSaving(false); }
  };

  const inp = { background:'var(--parch-warm)', border:'1px solid var(--parch-line)', borderRadius:7, color:'var(--ink)', padding:'6px 10px', fontSize:12, outline:'none', width:'100%' };
  const lbl = { fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--ink-dim)', display:'block', marginBottom:3, fontFamily:'var(--font-serif)' };

  return (
    <div style={{ background:'var(--terrain-bg)', border:'1px solid var(--terrain-bdr)', borderRadius:10, padding:12, marginTop:6, display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--terrain)', display:'flex', alignItems:'center', gap:6 }}>
        <Plus style={{ width:12, height:12 }} /> Add to product catalog
      </div>
      {image && (
        <div style={{ display:'flex', justifyContent:'center' }}>
          <ResultThumb src={image} name={name} size={56} />
        </div>
      )}
      <div>
        <label style={lbl}>Product Name *</label>
        <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="Product name" />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <div>
          <label style={lbl}>UPC</label>
          <input style={inp} value={upc} onChange={e => setUpc(e.target.value)} placeholder="Barcode" />
        </div>
        <div>
          <label style={lbl}>Category <span style={{ color:'var(--terrain)', fontWeight:400 }}>auto</span></label>
          <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inp, cursor:'pointer' }}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
        <button onClick={onCancel} style={{ padding:'5px 12px', borderRadius:7, fontSize:11, fontWeight:500, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', color:'var(--ink-faded)', cursor:'pointer' }}>Cancel</button>
        <button onClick={handleSave} disabled={saving} style={{ padding:'5px 12px', borderRadius:7, fontSize:11, fontWeight:700, background:'var(--ink)', border:'none', color:'var(--ne-cream)', cursor:'pointer', opacity:saving?0.6:1, display:'flex', alignItems:'center', gap:5 }}>
          {saving ? <><Loader style={{ width:11, height:11, animation:'spin 0.8s linear infinite' }} /> Saving...</> : '+ Add to catalog'}
        </button>
      </div>
    </div>
  );
}

export default function ProductAutocomplete({ products=[], nameValue, upcValue, searchField, onSelect, onChangeName, onChangeUpc, placeholder }) {
  const [open, setOpen]               = useState(false);
  const [activeIdx, setActiveIdx]     = useState(-1);
  const [dropdownPos, setDropdownPos] = useState({ top:0, left:0, width:0 });
  const [lookingUp, setLookingUp]     = useState(false);
  const [pickerResults, setPickerResults] = useState(null);
  const [pickerUPC, setPickerUPC]     = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormData, setAddFormData] = useState({ name:'', upc:'', image:'' });

  const inputRef = useRef(null);
  const listRef  = useRef(null);
  const itemRefs = useRef([]);

  const inputValue   = searchField==='name' ? nameValue : upcValue;
  const handleChange = searchField==='name' ? onChangeName : onChangeUpc;
  const looksLikeUPC = (val) => /^\d{6,}$/.test(String(val||'').trim());

  const filtered = (inputValue?.length>=1
    ? products.filter(p => { const q=inputValue.toLowerCase(); return p.name?.toLowerCase().includes(q)||p.upc?.toLowerCase().includes(q); })
    : []
  ).slice(0,8);

  const updatePos = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownPos({ top:rect.bottom+4, left:rect.left, width:rect.width });
  }, []);

  const openDropdown  = () => { updatePos(); setOpen(true); setActiveIdx(-1); };
  const closeDropdown = () => { setOpen(false); setActiveIdx(-1); };
  const handleSelect  = (p) => { onSelect(p); closeDropdown(); setShowAddForm(false); };

  useEffect(() => {
    const onMouseDown = (e) => { if (!inputRef.current?.contains(e.target)) closeDropdown(); };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => { window.removeEventListener('scroll', updatePos, true); window.removeEventListener('resize', updatePos); };
  }, [open, updatePos]);

  useEffect(() => {
    if (activeIdx>=0 && itemRefs.current[activeIdx]) itemRefs.current[activeIdx].scrollIntoView({ block:'nearest' });
  }, [activeIdx]);

  const handleUPCLookup = async (upc) => {
    setLookingUp(true); closeDropdown();
    try {
      const { data } = await base44.functions.invoke('lookupUPC', { upc });
      const results = data.results || [];
      if (results.length===0) { setAddFormData({ name:'', upc, image:'' }); setShowAddForm(true); toast('No results found — enter product details manually'); }
      else { setPickerUPC(upc); setPickerResults(results); }
    } catch { toast.error('Lookup failed'); setAddFormData({ name:'', upc, image:'' }); setShowAddForm(true); }
    finally { setLookingUp(false); }
  };

  const handlePickerSelect  = (result) => { setPickerResults(null); setAddFormData({ name:result.title, upc:pickerUPC, image:result.image||'' }); setShowAddForm(true); };
  const handleProductCreated = (p) => { setShowAddForm(false); handleSelect(p); };

  const handleKeyDown = (e) => {
    if (!open) { if (e.key==='ArrowDown'&&inputValue?.length>=1) { openDropdown(); return; } return; }
    if (e.key==='ArrowDown')           { e.preventDefault(); setActiveIdx(i=>Math.min(i+1,filtered.length-1)); }
    else if (e.key==='ArrowUp')        { e.preventDefault(); setActiveIdx(i=>Math.max(i-1,-1)); }
    else if (e.key==='Enter')          { e.preventDefault(); if (activeIdx>=0&&filtered[activeIdx]) handleSelect(filtered[activeIdx]); }
    else if (e.key==='Escape'||e.key==='Tab') { closeDropdown(); }
  };

  const dropdown = open && (
    <div style={{ position:'fixed', top:dropdownPos.top, left:dropdownPos.left, width:dropdownPos.width, zIndex:9999, background:'var(--parch-card)', border:'1px solid var(--parch-line)', borderRadius:10, boxShadow:'0 8px 32px rgba(0,0,0,0.12)', maxHeight:280, overflowY:'auto' }} ref={listRef}>
      {filtered.length>0 ? (
        <>
          {filtered.map((p,i) => (
            <div key={p.id} ref={el=>itemRefs.current[i]=el}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(p); }}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', cursor:'pointer', background:activeIdx===i?'var(--gold-bg)':'transparent', borderLeft:activeIdx===i?'2px solid var(--gold)':'2px solid transparent', borderBottom:'1px solid var(--parch-line)', transition:'background 0.1s' }}
              onMouseEnter={()=>setActiveIdx(i)} onMouseLeave={()=>setActiveIdx(-1)}>
              {p.image
                ? <img src={p.image} alt={p.name} style={{ width:32, height:32, borderRadius:7, objectFit:'contain', padding:2, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', flexShrink:0 }} />
                : <div style={{ width:32, height:32, borderRadius:7, flexShrink:0, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink-dim)', fontSize:13, fontWeight:600 }}>{p.name?.charAt(0)?.toUpperCase()||'?'}</div>
              }
              <div style={{ minWidth:0, flex:1 }}>
                <p style={{ color:'var(--ink)', fontWeight:500, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</p>
                {p.upc && <p style={{ color:'var(--ink-ghost)', fontSize:10, marginTop:1 }}>{p.upc}</p>}
              </div>
            </div>
          ))}
          {looksLikeUPC(inputValue) && (
            <div onMouseDown={(e)=>{e.preventDefault();handleUPCLookup(inputValue);closeDropdown();}}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', cursor:'pointer', borderTop:'1px solid var(--parch-line)', background:'var(--terrain-bg)' }}>
              <Search style={{ width:13, height:13, color:'var(--terrain)', flexShrink:0 }} />
              <span style={{ fontSize:12, color:'var(--terrain)', fontWeight:500 }}>Look up UPC "{inputValue}" online</span>
            </div>
          )}
        </>
      ) : (
        <div style={{ padding:'12px 14px' }}>
          <p style={{ color:'var(--ink-ghost)', fontSize:12, marginBottom:8 }}>{inputValue ? `No products found for "${inputValue}"` : 'No products in catalog yet'}</p>
          {looksLikeUPC(inputValue) ? (
            <div onMouseDown={(e)=>{e.preventDefault();handleUPCLookup(inputValue);closeDropdown();}}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 10px', borderRadius:7, background:'var(--terrain-bg)', border:'1px solid var(--terrain-bdr)', cursor:'pointer' }}>
              {lookingUp ? <Loader style={{ width:12, height:12, color:'var(--terrain)', animation:'spin 0.8s linear infinite' }} /> : <Search style={{ width:12, height:12, color:'var(--terrain)' }} />}
              <span style={{ fontSize:12, color:'var(--terrain)', fontWeight:600 }}>Look up UPC online → add to catalog</span>
            </div>
          ) : (
            <div onMouseDown={(e)=>{e.preventDefault();setAddFormData({name:inputValue,upc:'',image:''});setShowAddForm(true);closeDropdown();}}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 10px', borderRadius:7, background:'var(--terrain-bg)', border:'1px solid var(--terrain-bdr)', cursor:'pointer' }}>
              <Plus style={{ width:12, height:12, color:'var(--terrain)' }} />
              <span style={{ fontSize:12, color:'var(--terrain)', fontWeight:600 }}>Add "{inputValue}" to catalog</span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ position:'relative' }}>
        <div style={{ position:'relative' }}>
          {lookingUp
            ? <Loader style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', width:14, height:14, color:'var(--terrain)', pointerEvents:'none', animation:'spin 0.8s linear infinite' }} />
            : <Search style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', width:14, height:14, color:'var(--ink-ghost)', pointerEvents:'none' }} />}
          <Input ref={inputRef} className="pl-8"
            style={{ background:'var(--parch-warm)', color:'var(--ink)', borderColor:'var(--parch-line)' }}
            value={inputValue}
            onChange={(e) => { handleChange(e.target.value); setShowAddForm(false); if (e.target.value.length>=1) openDropdown(); else closeDropdown(); }}
            onFocus={() => { if (inputValue?.length>=1) openDropdown(); }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder||'Search or enter UPC...'} />
        </div>
        {showAddForm && (
          <AddToCatalogForm initialName={addFormData.name} initialUpc={addFormData.upc} initialImage={addFormData.image}
            onCreated={handleProductCreated} onCancel={()=>setShowAddForm(false)} />
        )}
      </div>
      {pickerResults && typeof document!=='undefined' && createPortal(
        <UPCPickerModal upc={pickerUPC} results={pickerResults} onSelect={handlePickerSelect}
          onManual={()=>{setPickerResults(null);setAddFormData({name:'',upc:pickerUPC,image:''});setShowAddForm(true);}}
          onClose={()=>setPickerResults(null)} />, document.body
      )}
      {typeof document!=='undefined' && createPortal(dropdown, document.body)}
    </>
  );
}