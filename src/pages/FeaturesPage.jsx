import React, { useState, useEffect } from 'react';
import LandingLayout from './LandingLayout';

const FEATURES = [
  { icon:'📈', title:'Profit Tracking',     desc:'See your true profit after fees, shipping, taxes, and cashback. Know exactly what you\'re making on every single order — no guessing.',          tag:'Core' },
  { icon:'💳', title:'Card Optimizer',      desc:'Track cashback rates per store and always know the best card to use. Never leave money on the table on any purchase.',                         tag:'Core' },
  { icon:'📧', title:'Gmail Auto-Import',   desc:'Connect Gmail and automatically pull in orders from Amazon, Best Buy, Walmart, Target, and more. Zero manual entry.',                          tag:'Automation' },
  { icon:'📦', title:'Inventory Manager',   desc:'Full cost basis tracking from purchase to sale. Know what\'s in stock, what\'s sold, and what your margin looks like at all times.',            tag:'Core' },
  { icon:'🎁', title:'Gift Card Tracker',   desc:'Track gift card codes, balances, purchase cost, and profit. Works with Best Buy, Amazon, Walmart, Target and more.',                           tag:'Finance' },
  { icon:'📊', title:'Deep Analytics',      desc:'ROI by store, cashback by card, profit trends over time — all filterable by date range. Export to CSV anytime.',                               tag:'Insights' },
  { icon:'🔮', title:'Forecasting',         desc:'Predict future performance based on your historical trends and buying patterns. Know what to expect before you buy.',                           tag:'Insights' },
  { icon:'🎯', title:'Goal Tracker',        desc:'Set monthly profit and revenue goals. Track progress in real time with visual indicators and automatic alerts.',                                tag:'Core' },
  { icon:'🧾', title:'Invoice Import',      desc:'Upload PDF or image receipts and let Atlas parse order details automatically. Supports major retailers out of the box.',                        tag:'Automation' },
  { icon:'🔌', title:'Chrome Extension',    desc:'One-click import from Amazon, Best Buy, Walmart, and Target order pages. The floating "Import to Atlas" button makes it instant.',             tag:'Automation' },
  { icon:'📋', title:'P&L Reports',         desc:'Generate clean profit & loss reports for any date range. Tax season ready. Share with an accountant or business partner.',                     tag:'Finance' },
  { icon:'👥', title:'Team Mode',           desc:'Multiple buyers under one account. See each person\'s performance. Perfect for couples or small teams running the operation together.',         tag:'Coming Soon' },
];

const TAGS = ['All', 'Core', 'Automation', 'Finance', 'Insights', 'Coming Soon'];

export default function FeaturesPage() {
  const [activeTag, setActiveTag] = useState('All');
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 80); }, []);

  const filtered = activeTag === 'All' ? FEATURES : FEATURES.filter(f => f.tag === activeTag);

  const TAG_COLORS = {
    'Core':       { bg:'rgba(196,146,46,0.12)',  color:'#C4922E'  },
    'Automation': { bg:'rgba(42,92,122,0.15)',   color:'#5a9aba'  },
    'Finance':    { bg:'rgba(74,122,53,0.15)',   color:'#7ab85a'  },
    'Insights':   { bg:'rgba(90,58,110,0.15)',   color:'#9a6aba'  },
    'Coming Soon':{ bg:'rgba(90,80,50,0.15)',    color:'#8a8050'  },
  };

  return (
    <LandingLayout currentPage="features">
      <section className="sp" style={{ paddingTop:140, minHeight:'100vh' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>

          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:60 }}>
            <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.22em', color:'#C4922E', textTransform:'uppercase', marginBottom:14 }}>Built for Resellers</p>
            <h1 className="serif" style={{ fontSize:56, fontWeight:700, lineHeight:1.08, marginBottom:16 }}>
              Every Feature <span style={{ color:'#C4922E' }}>Earned.</span>
            </h1>
            <p style={{ fontSize:15, color:'#7a7060', maxWidth:480, margin:'0 auto', lineHeight:1.7, fontWeight:300 }}>
              No fluff, no filler. Every feature exists because we needed it ourselves as resellers.
            </p>
          </div>

          {/* Tag filters */}
          <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap', marginBottom:48 }}>
            {TAGS.map(tag => (
              <button key={tag} onClick={() => setActiveTag(tag)}
                style={{ padding:'7px 16px', borderRadius:99, fontSize:12, fontWeight:600, cursor:'pointer', transition:'all 0.2s',
                  background: activeTag === tag ? '#C4922E' : 'rgba(196,146,46,0.08)',
                  color:      activeTag === tag ? '#080706' : '#7a7060',
                  border:     activeTag === tag ? 'none' : '1px solid rgba(196,146,46,0.2)',
                }}>
                {tag}
              </button>
            ))}
          </div>

          {/* Feature grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:16 }}>
            {filtered.map((f, i) => {
              const tc = TAG_COLORS[f.tag] || TAG_COLORS['Core'];
              return (
                <div key={f.title} style={{ background:'rgba(18,14,8,0.85)', border:'1px solid rgba(196,146,46,0.2)', borderRadius:14, padding:'24px 22px', transition:'all 0.25s', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)', transitionDelay:`${i * 0.04}s` }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(196,146,46,0.5)'; e.currentTarget.style.transform='translateY(-3px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(196,146,46,0.2)'; e.currentTarget.style.transform='translateY(0)'; }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
                    <div style={{ width:48, height:48, background:'rgba(196,146,46,0.1)', border:'1px solid rgba(196,146,46,0.25)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
                      {f.icon}
                    </div>
                    <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:99, background:tc.bg, color:tc.color, letterSpacing:'0.08em' }}>
                      {f.tag}
                    </span>
                  </div>
                  <div style={{ fontSize:15, fontWeight:600, color:'#fff', marginBottom:8 }}>{f.title}</div>
                  <div style={{ fontSize:13, color:'#5a5248', lineHeight:1.65, fontWeight:300 }}>{f.desc}</div>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div style={{ textAlign:'center', marginTop:72, padding:'48px 24px', background:'rgba(10,8,4,0.6)', border:'1px solid rgba(196,146,46,0.18)', borderRadius:20 }}>
            <h2 className="serif" style={{ fontSize:40, fontWeight:600, marginBottom:14 }}>
              Ready to get started with <span style={{ color:'#C4922E' }}>Atlas?</span>
            </h2>
            <p style={{ fontSize:14, color:'#5a5248', marginBottom:28, fontWeight:300 }}>Create your free account and unlock every feature today.</p>
            <button className="btn-g" style={{ padding:'14px 36px', fontSize:15 }} onClick={() => window.location.href='https://atlasresellhub.base44.app'}>
              Create Free Account →
            </button>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}
