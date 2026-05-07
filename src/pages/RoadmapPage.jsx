import React from 'react';
import LandingLayout from './LandingLayout';

const ROADMAP = [
  {
    status: 'live',
    label:  'Live',
    items: [
      { title:'Profit Tracking',       desc:'True profit after every fee, tax, and cashback across all orders.' },
      { title:'Card Optimizer',        desc:'Track cashback rates per store and always use the best card.' },
      { title:'Inventory Manager',     desc:'Full cost basis tracking from purchase to sale.' },
      { title:'Gift Card Tracker',     desc:'Codes, balances, purchase cost, and profit per card.' },
      { title:'Analytics & Forecasting', desc:'ROI by store, cashback by card, profit trends over time.' },
      { title:'Gmail Auto-Import',     desc:'Auto-pull orders from Amazon, Best Buy, Walmart, Target.' },
      { title:'Chrome Extension',      desc:'One-click import from order pages on major retailers.' },
      { title:'Goal Tracker',          desc:'Set and track monthly profit and revenue goals.' },
    ],
  },
  {
    status: 'next',
    label:  'Up Next',
    items: [
      { title:'Mobile App',            desc:'Barcode scanner, in-store card recommendations, on-the-go tracking.' },
      { title:'AI Receipt Parser',     desc:'Take a photo of any receipt — Atlas reads it and creates the order.' },
      { title:'P&L PDF Export',        desc:'Generate clean profit & loss reports. Tax season ready.' },
    ],
  },
  {
    status: 'soon',
    label:  'Coming Soon',
    items: [
      { title:'Price Alert Engine',    desc:'Get notified when a product drops below your target margin.' },
      { title:'Deal Score',            desc:'Every product gets an automatic profitability score (0–100).' },
      { title:'Cashback Calendar',     desc:'See upcoming card bonus cashback periods so you can plan purchases.' },
      { title:'Team Mode',             desc:'Multiple buyers, shared inventory, per-user analytics.' },
      { title:'Competitor Price Tracker', desc:'Track what similar items sell for on eBay and Amazon.' },
      { title:'Smart Reorder Alerts', desc:'"You\'ve bought this 3x and made $X — it\'s back in stock."' },
    ],
  },
];

const STATUS_STYLES = {
  live: { dot:'#C4922E', bg:'rgba(196,146,46,0.12)', color:'#C4922E',   label:'● Live'       },
  next: { dot:'#5a9aba', bg:'rgba(42,92,122,0.12)',  color:'#5a9aba',   label:'▶ Up Next'    },
  soon: { dot:'#9a6aba', bg:'rgba(90,58,110,0.12)',  color:'#9a6aba',   label:'◎ Coming Soon'},
};

export default function RoadmapPage() {
  return (
    <LandingLayout currentPage="roadmap">
      <section className="sp" style={{ paddingTop:140 }}>
        <div style={{ maxWidth:1000, margin:'0 auto' }}>

          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:72 }}>
            <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.22em', color:'#C4922E', textTransform:'uppercase', marginBottom:14 }}>What's Coming</p>
            <h1 className="serif" style={{ fontSize: 56, fontWeight:700,  lineHeight: 1.08, marginBottom:16, color:"#f0ece4" }}>
              The Atlas <span style={{ color:'#C4922E' }}>Roadmap.</span>
            </h1>
            <p style={{ fontSize:15, color:'#f0ece4', maxWidth:480, margin:'0 auto', lineHeight:1.7, fontWeight:300 }}>
              Built in public. Every feature here came from real resellers telling us what they needed.
            </p>
          </div>

          {/* Legend */}
          <div style={{ display:'flex', gap:16, justifyContent:'center', marginBottom:52, flexWrap:'wrap' }}>
            {Object.values(STATUS_STYLES).map(s => (
              <div key={s.label} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 16px', background:s.bg, border:`1px solid ${s.color}44`, borderRadius:99 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:s.dot }}/>
                <span style={{ fontSize:12, fontWeight:600, color:s.color }}>{s.label.replace('● ','').replace('▶ ','').replace('◎ ','')}</span>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div style={{ display:'flex', flexDirection:'column', gap:48 }}>
            {ROADMAP.map(section => {
              const s = STATUS_STYLES[section.status];
              return (
                <div key={section.status}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:s.dot, flexShrink:0 }}/>
                    <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.16em', color:s.color, textTransform:'uppercase' }}>{section.label}</span>
                    <div style={{ flex:1, height:1, background:`linear-gradient(90deg, ${s.dot}44, transparent)` }}/>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:12, paddingLeft:22 }}>
                    {section.items.map(item => (
                      <div key={item.title} style={{ background:'rgba(14,11,6,0.85)', border:`1px solid ${s.dot}22`, borderLeft:`3px solid ${s.dot}`, borderRadius:'0 12px 12px 0', padding:'16px 18px', transition:'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background='rgba(22,18,10,0.9)'; e.currentTarget.style.borderColor=`${s.dot}55`; }}
                        onMouseLeave={e => { e.currentTarget.style.background='rgba(14,11,6,0.85)'; e.currentTarget.style.borderColor=`${s.dot}22`; }}>
                        <div style={{ fontSize:14, fontWeight:600, color:'#f0ece4', marginBottom:6 }}>{item.title}</div>
                        <div style={{ fontSize:12, color:'#f0ece4', lineHeight:1.55, fontWeight:300 }}>{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Suggest a feature */}
          <div style={{ textAlign:'center', marginTop:72, padding:'40px 24px', background:'rgba(10,8,4,0.6)', border:'1px solid rgba(196,146,46,0.18)', borderRadius:20 }}>
            <h2 className="serif" style={{ fontSize:36, fontWeight:600, marginBottom:12, color:'#f0ece4' }}>
              Have a Feature Idea?
            </h2>
            <p style={{ fontSize:14, color:'#f0ece4', marginBottom:24, fontWeight:300 }}>
              We build what resellers actually need. Tell us what's missing.
            </p>
            <a href="mailto:hello@atlasresellhub.com"
              style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'13px 28px', borderRadius:10, fontSize:14, fontWeight:600, background:'transparent', color:'#C4922E', border:'1px solid rgba(196,146,46,0.4)', textDecoration:'none', transition:'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(196,146,46,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background='transparent'; }}>
              Suggest a Feature →
            </a>
          </div>

        </div>
      </section>
    </LandingLayout>
  );
}