// Colored square logos / icons for vendors and buyers
export const VENDOR_PRESETS = [
  { name: 'Walmart', type: 'Online', category: 'Online', color: '#0071CE', initial: 'W' },
  { name: 'Costco', type: 'Wholesale', category: 'Wholesale', color: '#E31837', initial: 'C' },
  { name: "Sam's Club", type: 'Wholesale', category: 'Wholesale', color: '#007DC6', initial: 'S' },
  { name: 'Home Depot', type: 'Retail', category: 'Home Improvement', color: '#F96302', initial: 'HD' },
  { name: "Lowe's", type: 'Retail', category: 'Home Improvement', color: '#004990', initial: 'L' },
  { name: 'Menards', type: 'Retail', category: 'Home Improvement', color: '#2E7D32', initial: 'M' },
  { name: 'Target', type: 'Retail', category: 'Online', color: '#CC0000', initial: 'T' },
  { name: 'Best Buy', type: 'Retail', category: 'Electronics', color: '#0046BE', initial: 'BB' },
  { name: 'Amazon', type: 'Online', category: 'Online', color: '#FF9900', initial: 'A' },
];

export const BUYER_PRESETS = [
  { name: 'CardKangaroo', type: 'wholesale_churning', color: '#1a1a2e', initial: 'CK' },
  { name: 'CardCash', type: 'wholesale_churning', color: '#1565C0', initial: 'CC' },
  { name: 'CardPool', type: 'wholesale_churning', color: '#B71C1C', initial: 'CP' },
  { name: 'Raise', type: 'wholesale_churning', color: '#2E7D32', initial: 'R' },
  { name: 'ClipKard', type: 'wholesale_churning', color: '#424242', initial: 'C' },
  { name: 'GiftDeals', type: 'wholesale_churning', color: '#6A1B9A', initial: 'GD' },
  { name: 'ElectronicsBuyer', type: 'wholesale_churning', color: '#0277BD', initial: 'EB' },
  { name: 'eBay', type: 'marketplace', website: 'https://ebay.com', color: '#E53238', initial: 'eB' },
  { name: 'Amazon', type: 'marketplace', website: 'https://amazon.com', color: '#FF9900', initial: 'A' },
  { name: 'Facebook Marketplace', type: 'marketplace', website: 'https://facebook.com/marketplace', color: '#1877F2', initial: 'FB' },
  { name: 'OfferUp', type: 'marketplace', website: 'https://offerup.com', color: '#0ABAB5', initial: 'OU' },
  { name: 'Mercari', type: 'marketplace', website: 'https://mercari.com', color: '#E02E24', initial: 'MC' },
  { name: 'Poshmark', type: 'marketplace', website: 'https://poshmark.com', color: '#FF3464', initial: 'PM' },
  { name: 'Craigslist', type: 'marketplace', website: 'https://craigslist.org', color: '#6B21A8', initial: 'CL' },
  { name: 'Decluttr', type: 'marketplace', website: 'https://decluttr.com', color: '#06B6D4', initial: 'DC' },
];

export function getVendorColor(name) {
  const preset = VENDOR_PRESETS.find(v => v.name.toLowerCase() === name?.toLowerCase());
  if (preset) return preset.color;
  const colors = ['#7C3AED','#2563EB','#059669','#D97706','#DC2626','#0891B2','#7C3AED','#BE185D'];
  let hash = 0;
  for (let i = 0; i < (name?.length || 0); i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function getBuyerColor(name) {
  const preset = BUYER_PRESETS.find(b => b.name.toLowerCase() === name?.toLowerCase());
  if (preset) return preset.color;
  return getVendorColor(name);
}

export function getInitials(name) {
  if (!name) return '?';
  const preset = [...VENDOR_PRESETS, ...BUYER_PRESETS].find(v => v.name.toLowerCase() === name.toLowerCase());
  if (preset) return preset.initial;
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export function VendorIcon({ name, size = 40 }) {
  const color = getVendorColor(name);
  const initials = getInitials(name);
  return (
    <div style={{ width: size, height: size, background: color, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ color: '#fff', fontWeight: 700, fontSize: size * 0.32, letterSpacing: '-0.5px' }}>{initials}</span>
    </div>
  );
}

export function BuyerIcon({ name, size = 40 }) {
  const color = getBuyerColor(name);
  const initials = getInitials(name);
  return (
    <div style={{ width: size, height: size, background: color, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ color: '#fff', fontWeight: 700, fontSize: size * 0.32, letterSpacing: '-0.5px' }}>{initials}</span>
    </div>
  );
}