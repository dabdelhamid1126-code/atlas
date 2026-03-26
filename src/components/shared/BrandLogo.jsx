import React, { useState } from 'react';

const BRANDFETCH_CLIENT_ID = '1idzVIG0BYPKsFIDJDI';

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
  'Amex':                     'americanexpress.com',
  'American Express':         'americanexpress.com',
  'Amex Blue Business Plus':  'americanexpress.com',
  'Amex Business Gold':       'americanexpress.com',
  'Amex Platinum':            'americanexpress.com',
  'Amex Gold':                'americanexpress.com',
  'Chase':                    'chase.com',
  'Chase Freedom':            'chase.com',
  'Chase Freedom Flex':       'chase.com',
  'Chase Freedom Unlimited':  'chase.com',
  'Chase Sapphire':           'chase.com',
  'Chase Ink':                'chase.com',
  'Citi':                     'citi.com',
  'Citi Custom Cash':         'citi.com',
  'Citi Double Cash':         'citi.com',
  'Capital One':              'capitalone.com',
  'Capital One Spark':        'capitalone.com',
  'Capital One Venture':      'capitalone.com',
  'Bank of America':          'bankofamerica.com',
  'BofA':                     'bankofamerica.com',
  'Wells Fargo':              'wellsfargo.com',
  'Discover':                 'discover.com',
  'US Bank':                  'usbank.com',
  'Barclays':                 'barclays.com',
  'Robinhood':                'robinhood.com',
  'Apple Card':               'apple.com',
  'Bilt':                     'biltrewards.com',
};

const BRAND_COLORS = {
  'Amazon':           { bg: '#FEF3C7', text: '#92400E' },
  'Best Buy':         { bg: '#EDE9FE', text: '#5B21B6' },
  'Walmart':          { bg: '#DBEAFE', text: '#1D4ED8' },
  'Target':           { bg: '#FEE2E2', text: '#DC2626' },
  'Costco':           { bg: '#DBEAFE', text: '#1D4ED8' },
  "Sam's Club":       { bg: '#EDE9FE', text: '#5B21B6' },
  'eBay':             { bg: '#FEF3C7', text: '#92400E' },
  'Apple':            { bg: '#F1F5F9', text: '#475569' },
  'Woot':             { bg: '#DCFCE7', text: '#166534' },
  'Chase':            { bg: '#DBEAFE', text: '#1D4ED8' },
  'Amex':             { bg: '#DBEAFE', text: '#1D4ED8' },
  'American Express': { bg: '#DBEAFE', text: '#1D4ED8' },
  'Citi':             { bg: '#DBEAFE', text: '#1D4ED8' },
  'Capital One':      { bg: '#FEE2E2', text: '#DC2626' },
  'Discover':         { bg: '#FEF3C7', text: '#92400E' },
  'Robinhood':        { bg: '#DCFCE7', text: '#166534' },
};

const DEFAULT_COLORS = [
  { bg: '#EDE9FE', text: '#5B21B6' },
  { bg: '#DBEAFE', text: '#1D4ED8' },
  { bg: '#FEF3C7', text: '#92400E' },
  { bg: '#DCFCE7', text: '#166534' },
  { bg: '#FEE2E2', text: '#DC2626' },
  { bg: '#F0FDF4', text: '#15803D' },
  { bg: '#FFF7ED', text: '#C2410C' },
];

function getFallbackColor(name) {
  if (BRAND_COLORS[name]) return BRAND_COLORS[name];
  const idx = (name?.charCodeAt(0) || 0) % DEFAULT_COLORS.length;
  return DEFAULT_COLORS[idx];
}

function getBrandfetchUrl(domain) {
  if (!domain) return null;
  return `https://cdn.brandfetch.io/domain/${domain}?c=${BRANDFETCH_CLIENT_ID}`;
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

function LogoBox({ domain, name, size = 36, className = '' }) {
  const [err, setErr] = useState(false);
  const src      = getBrandfetchUrl(domain);
  const fallback = getFallbackColor(name);
  const initials = getInitials(name);
  const radius   = Math.round(size * 0.22);
  const fontSize = size < 28 ? 9 : size < 40 ? 11 : 13;

  const boxStyle = {
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
      <div style={{ ...boxStyle, background: fallback.bg }} className={className}>
        <span style={{ fontSize, fontWeight: 700, color: fallback.text, lineHeight: 1 }}>
          {initials}
        </span>
      </div>
    );
  }

  return (
    <div style={{ ...boxStyle, background: '#fff', border: '0.5px solid #e2e8f0' }} className={className}>
      <img
        src={src}
        alt={name}
        style={{ width: size * 0.68, height: size * 0.68, objectFit: 'contain' }}
        onError={() => setErr(true)}
      />
    </div>
  );
}

export default function RetailerLogo({ retailer, size = 36, className = '' }) {
  const domain = RETAILER_DOMAINS[retailer] || null;
  return <LogoBox domain={domain} name={retailer} size={size} className={className} />;
}

export function CardLogo({ cardName, size = 36, className = '' }) {
  let domain = CARD_DOMAINS[cardName];

  if (!domain && cardName) {
    const lower = cardName.toLowerCase();
    if (lower.includes('amex') || lower.includes('american express')) domain = 'americanexpress.com';
    else if (lower.includes('chase'))       domain = 'chase.com';
    else if (lower.includes('citi'))        domain = 'citi.com';
    else if (lower.includes('capital one')) domain = 'capitalone.com';
    else if (lower.includes('discover'))    domain = 'discover.com';
    else if (lower.includes('wells'))       domain = 'wellsfargo.com';
    else if (lower.includes('bank of america') || lower.includes('bofa')) domain = 'bankofamerica.com';
    else if (lower.includes('robinhood'))   domain = 'robinhood.com';
    else if (lower.includes('apple'))       domain = 'apple.com';
    else if (lower.includes('bilt'))        domain = 'biltrewards.com';
    else if (lower.includes('barclays'))    domain = 'barclays.com';
    else if (lower.includes('us bank'))     domain = 'usbank.com';
  }

  return <LogoBox domain={domain} name={cardName} size={size} className={className} />;
}

export { RETAILER_DOMAINS, CARD_DOMAINS, getBrandfetchUrl };