import React, { useState } from 'react';
import LandingLayout from './LandingLayout';

const PLANS = [
  {
    name: 'Starter',
    price: { monthly: 0, yearly: 0 },
    period: 'Forever free',
    desc: 'Perfect for getting started',
    features: ['Up to 50 orders/month', 'Basic profit tracking', '1 credit card', 'Dashboard & analytics', 'Email support'],
    cta: 'Get Started Free',
    featured: false,
  },
  {
    name: 'Pro',
    price: { monthly: 29, yearly: 23 },
    period: '/month',
    desc: 'For serious resellers',
    features: ['Unlimited orders', 'Gmail auto-import', 'Unlimited credit cards', 'Gift card manager', 'Full analytics & forecasting', 'Goal tracker', 'Chrome extension', 'P&L reports', 'Priority support'],
    cta: 'Start Pro Trial',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: { monthly: null, yearly: null },
    period: 'Custom pricing',
    desc: 'For teams & agencies',
    features: ['Everything in Pro', 'Multi-user access (up to 10)', 'Per-user analytics', 'Custom integrations', 'Dedicated onboarding', 'SLA support', 'API access'],
    cta: 'Contact Us',
    featured: false,
  },
];

const FAQ = [
  { q: 'Is there a free trial for Pro?',         a: 'Yes — 14 days free, no credit card required. Cancel anytime.' },
  { q: 'Can I switch plans later?',              a: 'Absolutely. Upgrade or downgrade anytime. Changes take effect immediately.' },
  { q: 'What payment methods do you accept?',    a: 'All major credit cards via Stripe. No PayPal at this time.' },
  { q: 'Do I lose my data if I downgrade?',      a: 'No. Your data is always safe. You just lose access to Pro features.' },
  { q: 'Is there a discount for yearly billing?', a: 'Yes — save 20% by paying yearly. That\'s $46 off per year on Pro.' },
];

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <LandingLayout currentPage="pricing">
      <section className="sp" style={{ paddingTop:140, minHeight:'100vh' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>

          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:48 }}>
            <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.22em', color:'#C4922E', textTransform:'uppercase', marginBottom:14 }}>Simple Pricing</p>
            <h1 className="serif" style={{ fontSize:56, fontWeight:700, lineHeight:1.08, marginBottom:16 }}>
              Start Free. <span style={{ color:'#C4922E' }}>Scale When Ready.</span>
            </h1>
            <p style={{ fontSize:15, color:'#7a7060', maxWidth:440, margin:'0 auto 28px', lineHeight:1.7, fontWeight:300 }}>
              No hidden fees. No surprise charges. Cancel anytime.
            </p>

            {/* Billing toggle */}
            <div style={{ display:'inline-flex', alignItems:'center', gap:12, padding:'6px 16px', background:'rgba(196,146,46,0.08)', border:'1px solid rgba(196,146,46,0.2)', borderRadius:99 }}>
              <span style={{ fontSize:13, color: yearly ? '#5a5248' : '#f0ece4', fontWeight: yearly ? 300 : 500 }}>Monthly</span>
              <div onClick={() => setYearly(v => !v)}
                style={{ width:44, height:24, borderRadius:99, background: yearly ? '#C4922E' : 'rgba(196,146,46,0.2)', cursor:'pointer', position:'relative', transition:'background 0.2s' }}>
                <div style={{ position:'absolute', top:3, left: yearly ? 22 : 3, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left 0.2s' }}/>
              </div>
              <span style={{ fontSize:13, color: yearly ? '#f0ece4' : '#5a5248', fontWeight: yearly ? 500 : 300 }}>
                Yearly <span style={{ fontSize:11, color:'#C4922E', fontWeight:700 }}>Save 20%</span>
              </span>
            </div>
          </div>

          {/* Plans */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:72 }}>
            {PLANS.map(plan => (
              <div key={plan.name} style={{ background: plan.featured ? 'rgba(28,20,8,0.9)' : 'rgba(14,11,6,0.85)', border: `1px solid ${plan.featured ? 'rgba(196,146,46,0.5)' : 'rgba(196,146,46,0.18)'}`, borderRadius:18, padding:'28px 24px', position:'relative', display:'flex', flexDirection:'column' }}>
                {plan.featured && (
                  <div style={{ position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)', background:'#C4922E', color:'#080706', fontSize:10, fontWeight:800, padding:'4px 16px', borderRadius:99, letterSpacing:'0.1em', whiteSpace:'nowrap' }}>
                    MOST POPULAR
                  </div>
                )}
                <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.14em', color:'#C4922E', textTransform:'uppercase', marginBottom:8 }}>{plan.name}</p>
                <div style={{ marginBottom:4 }}>
                  {plan.price.monthly === null ? (
                    <span className="serif" style={{ fontSize:36, fontWeight:600, color:'#f0ece4' }}>Custom</span>
                  ) : plan.price.monthly === 0 ? (
                    <span className="serif" style={{ fontSize:36, fontWeight:600, color:'#f0ece4' }}>Free</span>
                  ) : (
                    <span className="serif" style={{ fontSize:36, fontWeight:600, color:'#f0ece4' }}>
                      ${yearly ? plan.price.yearly : plan.price.monthly}<span style={{ fontSize:14, fontWeight:300, color:'#5a5248' }}>/mo</span>
                    </span>
                  )}
                </div>
                <p style={{ fontSize:12, color:'#3a342c', marginBottom:20, fontWeight:300 }}>{plan.period}</p>
                <p style={{ fontSize:13, color:'#7a7060', marginBottom:20, fontWeight:300, lineHeight:1.5 }}>{plan.desc}</p>
                <div style={{ flex:1, marginBottom:24 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:'1px solid rgba(196,146,46,0.06)' }}>
                      <div style={{ width:14, height:14, borderRadius:'50%', background:'rgba(196,146,46,0.15)', border:'1px solid rgba(196,146,46,0.4)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <div style={{ width:5, height:5, borderRadius:'50%', background:'#C4922E' }}/>
                      </div>
                      <span style={{ fontSize:13, color:'#9a9080', fontWeight:300 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => window.location.href='https://atlasresellhub.base44.app'}
                  style={{ width:'100%', padding:'13px', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", transition:'all 0.2s',
                    background: plan.featured ? '#C4922E' : 'transparent',
                    color:      plan.featured ? '#080706' : '#C4922E',
                    border:     plan.featured ? 'none' : '1px solid rgba(196,146,46,0.4)',
                  }}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          </div>
          </section>
    </LandingLayout>
  );
}