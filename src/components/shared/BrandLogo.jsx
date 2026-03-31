import React, { useState } from 'react';

// ── YOUR BRANDFETCH CLIENT ID ─────────────────────────────────────────────
const BRANDFETCH_CLIENT_ID = '1idzVIG0BYPKsFIDJDI';

// ── Domain maps ───────────────────────────────────────────────────────────

const RETAILER_DOMAINS = {
  'Amazon':               'amazon.com',
  'Best Buy':             'bestbuy.com',
  'Walmart':              'walmart.com',
  'Target':               'target.com',
  'Costco':               'costco.com',
  "Sam's Club":           'samsclub.com',
  'eBay':                 'ebay.com',
  'Woot':                 'woot.com',
  'Apple':                'apple.com',
  'Home Depot':           'homedepot.com',
  'Staples':              'staples.com',
  'Newegg':               'newegg.com',
  'B&H Photo':            'bhphotovideo.com',
  'Adorama':              'adorama.com',
  'Nike':                 'nike.com',
  'Adidas':               'adidas.com',
  'Mercari':              'mercari.com',
  'OfferUp':              'offerup.com',
  'Facebook Marketplace': 'facebook.com',
  'Craigslist':           'craigslist.org',
};

const CARD_DOMAINS = {
  'American Express':          'americanexpress.com',
  'Amex':                      'americanexpress.com',
  'Amex Blue Business Plus':   'americanexpress.com',
  'Amex Business Gold':        'americanexpress.com',
  'Amex Platinum':             'americanexpress.com',
  'Amex Gold':                 'americanexpress.com',
  'Amex Blue Cash Everyday':   'americanexpress.com',
  'Amex Blue Cash Preferred':  'americanexpress.com',
  'Chase':                     'chase.com',
  'Chase Freedom':             'chase.com',
  'Chase Freedom Flex':        'chase.com',
  'Chase Freedom Unlimited':   'chase.com',
  'Chase Sapphire':            'chase.com',
  'Chase Ink Business Cash':   'chase.com',
  'Chase Ink Business Unlimited': 'chase.com',
  'Chase Ink Business Preferred': 'chase.com',
  'Chase Amazon Prime Visa':   'chase.com',
  'Citi':                      'citi.com',
  'Citi Custom Cash':          'citi.com',
  'Citi Double Cash':          'citi.com',
  'Capital One':               'capitalone.com',
  'Capital One Spark':         'capitalone.com',
  'Capital One Venture':       'capitalone.com',
  'Discover':                  'discover.com',
  'Wells Fargo':               'wellsfargo.com',
  'Bank of America':           'bankofamerica.com',
  'BofA':                      'bankofamerica.com',
  'Robinhood':                 'robinhood.com',
  'Apple Card':                'apple.com',
  'Bilt':                      'biltrewards.com',
  'Barclays':                  'barclays.com',
  'US Bank':                   'usbank.com',
};

// ── Fallback colors ───────────────────────────────────────────────────────

const BRAND_COLORS = {
  'Amazon':           { bg: '#FF9900', text: '#fff' },
  'Best Buy':         { bg: '#0046BE', text: '#fff' },
  'Walmart':          { bg: '#0071CE', text: '#fff' },
  'Target':           { bg: '#CC0000', text: '#fff' },
  'Costco':           { bg: '#005DAA', text: '#fff' },
  "Sam's Club":       { bg: '#0067A0', text: '#fff' },
  'eBay':             { bg: '#E53238', text: '#fff' },
  'Apple':            { bg: '#555555', text: '#fff' },
  'Woot':             { bg: '#00AEEF', text: '#fff' },
  'Home Depot':       { bg: '#F96302', text: '#fff' },
  'Chase':            { bg: '#117ACA', text: '#fff' },
  'Amex':             { bg: '#016FD0', text: '#fff' },
  'American Express': { bg: '#016FD0', text: '#fff' },
  'Citi':             { bg: '#003B8E', text: '#fff' },
  'Capital One':      { bg: '#D03027', text: '#fff' },
  'Discover':         { bg: '#FF6600', text: '#fff' },
  'Robinhood':        { bg: '#00C805', text: '#fff' },
  'Wells Fargo':      { bg: '#D71E28', text: '#fff' },
  'Bank of America':  { bg: '#E31837', text: '#fff' },
};

const DEFAULT_COLORS = [
  { bg: '#7C3AED', text: '#fff' },
  { bg: '#2563EB', text: '#fff' },
  { bg: '#D97706', text: '#fff' },
  { bg: '#059669', text: '#fff' },
  { bg: '#DC2626', text: '#fff' },
  { bg: '#0891B2', text: '#fff' },
];

function getFallbackColor(name) {
  if (BRAND_COLORS[name]) return BRAND_COLORS[name];
  const lower = (name || '').toLowerCase();
  for (const [key, val] of Object.entries(BRAND_COLORS)) {
    if (lower.includes(key.toLowerCase())) return val;
  }
  const idx = (name?.charCodeAt(0) || 0) % DEFAULT_COLORS.length;
  return DEFAULT_COLORS[idx];
}

function getInitials(name) {
  return (name || '?')
    .replace(/[^A-Za-z\s&]/g, '')
    .trim()
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getBrandfetchUrl(domain) {
  if (!domain) return null;
  return `https://cdn.brandfetch.io/domain/${domain}?c=${BRANDFETCH_CLIENT_ID}`;
}

function getCardDomain(cardName) {
  if (!cardName) return null;
  if (CARD_DOMAINS[cardName]) return CARD_DOMAINS[cardName];
  const lower = cardName.toLowerCase();
  if (lower.includes('amex') || lower.includes('american express')) return 'americanexpress.com';
  if (lower.includes('chase'))        return 'chase.com';
  if (lower.includes('citi'))         return 'citi.com';
  if (lower.includes('capital one'))  return 'capitalone.com';
  if (lower.includes('discover'))     return 'discover.com';
  if (lower.includes('wells'))        return 'wellsfargo.com';
  if (lower.includes('bank of america') || lower.includes('bofa')) return 'bankofamerica.com';
  if (lower.includes('robinhood'))    return 'robinhood.com';
  if (lower.includes('apple'))        return 'apple.com';
  if (lower.includes('bilt'))         return 'biltrewards.com';
  if (lower.includes('barclays'))     return 'barclays.com';
  if (lower.includes('us bank'))      return 'usbank.com';
  return null;
}

// ── Core logo component ───────────────────────────────────────────────────

function LogoBox({ domain, name, size = 36, className = '' }) {
  const [err, setErr] = useState(false);
  const src      = getBrandfetchUrl(domain);
  const fallback = getFallbackColor(name);
  const initials = getInitials(name);
  const radius   = Math.round(size * 0.22);
  const fontSize = size < 28 ? 9 : size < 40 ? 11 : 13;

  const base = {
    width:          size,
    height:         size,
    minWidth:       size,
    borderRadius:   radius,
    flexShrink:     0,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    overflow:       'hidden',
  };

  if (!src || err) {
    return (
      <div style={{ ...base, background: fallback.bg }} className={className}>
        <span style={{ fontSize, fontWeight: 700, color: fallback.text, lineHeight: 1 }}>
          {initials}
        </span>
      </div>
    );
  }

  return (
    <div style={{ ...base }} className={className}>
      <img
        src={src}
        alt={name}
        style={{
          width:     '100%',
          height:    '100%',
          objectFit: 'cover',
          display:   'block',
        }}
        onError={() => setErr(true)}
      />
    </div>
  );
}

// ── RetailerLogo ──────────────────────────────────────────────────────────

export default function RetailerLogo({ retailer, size = 36, className = '' }) {
  let domain = RETAILER_DOMAINS[retailer];
  if (!domain && retailer) {
    // Case-insensitive fallback
    const lower = retailer.toLowerCase();
    for (const [key, val] of Object.entries(RETAILER_DOMAINS)) {
      if (key.toLowerCase() === lower) {
        domain = val;
        break;
      }
    }
  }
  return <LogoBox domain={domain} name={retailer} size={size} className={className} />;
}

// ── CardLogo ──────────────────────────────────────────────────────────────

export function CardLogo({ cardName, size = 36, className = '' }) {
  const domain = getCardDomain(cardName);
  return <LogoBox domain={domain} name={cardName} size={size} className={className} />;
}

export { RETAILER_DOMAINS, CARD_DOMAINS, getBrandfetchUrl, getCardDomain };