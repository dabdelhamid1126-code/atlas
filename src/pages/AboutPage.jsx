import React from 'react';
import LandingLayout from './LandingLayout';

const VALUES = [
  { title:'Built by a Reseller',  desc:'Atlas was created by someone who actually churns cards and flips products. Every feature exists because we needed it — not because a product manager thought it would look good on a slide.' },
  { title:'Honest by Default',    desc:'No fake stats. No inflated numbers. We only show you what\'s real — your real margins, your real cashback, your real ROI. No smoke and mirrors.' },
  { title:'Always Improving',     desc:'We ship updates constantly based on real user feedback. If something is broken or missing, we fix it fast. Our roadmap is public and driven by the community.' },
  { title:'Privacy First',        desc:'Your financial data never leaves your account. We don\'t sell data, we don\'t serve ads, and we never share your information with third parties.' },
];

export default function AboutPage() {
  return (
    <LandingLayout currentPage="about">
      <section className="sp" style={{ paddingTop:140 }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>

          {/* Hero */}
          <div style={{ textAlign:'center', marginBottom:80 }}>
            <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.22em', color:'#C4922E', textTransform:'uppercase', marginBottom:14 }}>Our Story</p>
            <h1 className="serif" style={{ fontSize:56, fontWeight:700, lineHeight:1.08, marginBottom:20 }}>
              Built by a Reseller,<br/><span style={{ color:'#C4922E' }}>For Resellers.</span>
            </h1>
            <p style={{ fontSize:16, color:'#7a7060', maxWidth:560, margin:'0 auto', lineHeight:1.8, fontWeight:300 }}>
              Atlas started because no tool existed that thought like a reseller. Spreadsheets were slow. Other apps were built for sellers, not churners. So we built it ourselves.
            </p>
          </div>

          {/* Story */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:60, alignItems:'center', marginBottom:80 }} className="two-col">
            <div>
              <h2 className="serif" style={{ fontSize:40, fontWeight:600, lineHeight:1.1, marginBottom:20 }}>
                Why Atlas <span style={{ color:'#C4922E' }}>Exists</span>
              </h2>
              <p style={{ fontSize:14, color:'#6a6258', lineHeight:1.8, marginBottom:16, fontWeight:300 }}>
                We were frustrated. Tracking reselling across spreadsheets, random apps, and mental math was eating hours every week. Worse, we couldn't trust the numbers.
              </p>
              <p style={{ fontSize:14, color:'#6a6258', lineHeight:1.8, marginBottom:16, fontWeight:300 }}>
                We wanted to know exactly which stores were most profitable, which cards were underperforming, and where our money was actually going — in real time, not after three hours of manual entry.
              </p>
              <p style={{ fontSize:14, color:'#6a6258', lineHeight:1.8, fontWeight:300 }}>
                Atlas is the answer. The command center we always wanted — and now you can use it too.
              </p>
            </div>
            <div style={{ background:'rgba(14,11,6,0.85)', border:'1px solid rgba(196,146,46,0.18)', borderRadius:20, padding:'32px 28px' }}>
              <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.16em', color:'#C4922E', textTransform:'uppercase', marginBottom:20 }}>The Mission</p>
              <p className="serif" style={{ fontSize:28, fontWeight:600, lineHeight:1.3, color:'#f0ece4', marginBottom:16 }}>
                "Give every serious reseller the operational clarity of a hedge fund."
              </p>
              <p style={{ fontSize:13, color:'#4a4238', fontWeight:300, lineHeight:1.6 }}>
                We believe reselling is a real business — and it deserves real tools. Not another spreadsheet. Not another generic tracker. Atlas.
              </p>
            </div>
          </div>

          {/* Values */}
          <div style={{ marginBottom:80 }}>
            <h2 className="serif" style={{ fontSize:40, fontWeight:600, textAlign:'center', marginBottom:48 }}>
              What We <span style={{ color:'#C4922E' }}>Stand For</span>
            </h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:16 }}>
              {VALUES.map((v, i) => (
                <div key={i} style={{ background:'rgba(14,11,6,0.85)', border:'1px solid rgba(196,146,46,0.18)', borderRadius:14, padding:'24px 22px' }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:'#C4922E', marginBottom:14 }}/>
                  <div style={{ fontSize:15, fontWeight:600, color:'#f0ece4', marginBottom:10 }}>{v.title}</div>
                  <div style={{ fontSize:13, color:'#5a5248', lineHeight:1.65, fontWeight:300 }}>{v.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div style={{ textAlign:'center', padding:'48px 24px', background:'rgba(10,8,4,0.6)', border:'1px solid rgba(196,146,46,0.18)', borderRadius:20 }}>
            <h2 className="serif" style={{ fontSize:40, fontWeight:600, marginBottom:14 }}>
              Join Us on the <span style={{ color:'#C4922E' }}>Journey</span>
            </h2>
            <p style={{ fontSize:14, color:'#5a5248', marginBottom:28, fontWeight:300 }}>We're just getting started. Come build with us.</p>
            <button className="btn-g" style={{ padding:'14px 36px', fontSize:15 }} onClick={() => window.location.href='https://atlasresellhub.base44.app'}>
              Create Free Account →
            </button>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}