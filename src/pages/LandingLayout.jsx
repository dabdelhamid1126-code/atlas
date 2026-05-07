// src/pages/landing/LandingLayout.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginModal from '@/components/LoginModal';

const AtlasLogo = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polygon points="256,60 420,155 420,345 256,440 92,345 92,155" fill="none" stroke="#C4922E" strokeWidth="12" opacity="0.9"/>
    <polygon points="256,110 375,175 375,305 256,370 137,305 137,175" fill="none" stroke="#C4922E" strokeWidth="4" opacity="0.3"/>
    <line x1="256" y1="80" x2="256" y2="432" stroke="#C4922E" strokeWidth="3" strokeDasharray="18 18" opacity="0.35"/>
    <line x1="80" y1="256" x2="432" y2="256" stroke="#C4922E" strokeWidth="3" strokeDasharray="18 18" opacity="0.35"/>
    <polygon points="256,82 238,168 256,152 274,168" fill="#C4922E"/>
    <polygon points="256,430 238,344 256,360 274,344" fill="#C4922E" opacity="0.25"/>
    <polygon points="430,256 344,238 360,256 344,274" fill="#f5e09a"/>
    <polygon points="82,256 168,238 152,256 168,274" fill="#C4922E" opacity="0.25"/>
    <circle cx="256" cy="256" r="52" fill="none" stroke="#C4922E" strokeWidth="10"/>
    <circle cx="256" cy="256" r="22" fill="#C4922E"/>
    <circle cx="256" cy="256" r="10" fill="#f5e09a"/>
  </svg>
);

const NAV_LINKS = [
  { label: 'Features',  path: '/features'  },
  { label: 'Pricing',   path: '/pricing'   },
  { label: 'Roadmap',   path: '/roadmap'   },
  { label: 'About',     path: '/about'     },
];

const FOOTER_COLS = [
  { title: 'Product',   links: ['Features', 'Pricing', 'Roadmap', 'Changelog'] },
  { title: 'Company',   links: ['About', 'Careers', 'Contact']                 },
  { title: 'Resources', links: ['Blog', 'Guides', 'Support']                   },
];

export { AtlasLogo, NAV_LINKS, FOOTER_COLS };

export default function LandingLayout({ children, currentPage }) {
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const canvas = document.getElementById('atlas-stars');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const STARS = Array.from({ length: 240 }, () => ({
      x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
      r: Math.random() * 1.4 + 0.2, alpha: Math.random() * 0.6 + 0.1,
      speed: Math.random() * 0.004 + 0.001, phase: Math.random() * Math.PI * 2,
    }));
    const LINES = [];
    for (let i = 0; i < STARS.length; i++)
      for (let j = i + 1; j < STARS.length; j++) {
        const d = Math.hypot(STARS[i].x - STARS[j].x, STARS[i].y - STARS[j].y);
        if (d < 140) LINES.push({ i, j, d });
      }
    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.01;
      LINES.forEach(({ i, j, d }) => {
        ctx.beginPath(); ctx.moveTo(STARS[i].x, STARS[i].y); ctx.lineTo(STARS[j].x, STARS[j].y);
        ctx.strokeStyle = `rgba(196,146,46,${(1 - d / 140) * 0.18})`; ctx.lineWidth = 0.5; ctx.stroke();
      });
      STARS.forEach(s => {
        const pulse = s.alpha * (0.7 + 0.3 * Math.sin(t * s.speed * 100 + s.phase));
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,245,${Math.min(pulse * 1.3, 0.9)})`; ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  const goTo    = (path) => navigate(path);
  const goLogin = () => setLoginModalOpen(true);

  return (
    <div style={{ background:'#060503', minHeight:'100vh', color:'#f0ece4', overflowX:'hidden', fontFamily:"'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=DM+Sans:wght@300;400;500;600&family=Marcellus&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        .serif { font-family:'Cormorant Garamond', Georgia, serif; }
        .marcellus { font-family:'Marcellus', serif; }
        #atlas-stars { position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:0; }
        .logo-watermark { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); width:min(90vw,800px); height:min(90vw,800px); pointer-events:none; z-index:0; opacity:0.055; }
        nav, section, footer, .lp-section { position:relative; z-index:1; }
        .gold-line { height:1px; background:linear-gradient(90deg,transparent,#C4922E88,transparent); }
        .btn-g { background:#C4922E; color:#080706; border:none; border-radius:8px; font-family:'DM Sans',sans-serif; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:8px; transition:all 0.2s; }
        .btn-g:hover { background:#d9a43a; transform:translateY(-1px); }
        .btn-o { background:transparent; color:#f0ece4; border:1px solid #C4922E55; border-radius:8px; font-family:'DM Sans',sans-serif; font-weight:500; cursor:pointer; display:inline-flex; align-items:center; gap:8px; transition:all 0.2s; }
        .btn-o:hover { border-color:#C4922E99; background:#C4922E0a; }
        .nl { color:#f0ece4; text-decoration:none; font-size:13px; font-weight:400; transition:color 0.2s; }
        .nl:hover, .nl.active { color:#C4922E; }
        .nl.active { border-bottom:1px solid #C4922E; padding-bottom:2px; }
        .fa { text-decoration:none; color:#f0ece4; font-size:13px; font-weight:300; transition:color 0.2s; }
        .fa:hover { color:#9a9080; }
        .sp { padding:100px 48px; }
        @media(max-width:900px) {
          .sp { padding:60px 20px !important; }
          .nm { display:none !important; }
          .sm { display:flex !important; }
          .two-col { grid-template-columns:1fr !important; }
        }
        @media(max-width:540px) { .sp { padding:40px 16px !important; } }
      `}</style>

      <canvas id="atlas-stars"/>
      <div className="logo-watermark">
        <svg viewBox="0 0 512 512" fill="none" style={{width:'100%',height:'100%'}}>
          <polygon points="256,60 420,155 420,345 256,440 92,345 92,155" fill="none" stroke="#C4922E" strokeWidth="8"/>
          <polygon points="256,110 375,175 375,305 256,370 137,305 137,175" fill="none" stroke="#C4922E" strokeWidth="4" opacity="0.6"/>
          <line x1="256" y1="80" x2="256" y2="432" stroke="#C4922E" strokeWidth="3" strokeDasharray="18 18" opacity="0.5"/>
          <line x1="80" y1="256" x2="432" y2="256" stroke="#C4922E" strokeWidth="3" strokeDasharray="18 18" opacity="0.5"/>
          <polygon points="256,82 238,168 256,152 274,168" fill="#C4922E"/>
          <polygon points="256,430 238,344 256,360 274,344" fill="#C4922E" opacity="0.5"/>
          <polygon points="430,256 344,238 360,256 344,274" fill="#f5e09a"/>
          <polygon points="82,256 168,238 152,256 168,274" fill="#C4922E" opacity="0.5"/>
          <circle cx="256" cy="256" r="52" fill="none" stroke="#C4922E" strokeWidth="8"/>
          <circle cx="256" cy="256" r="22" fill="#C4922E"/>
          <circle cx="256" cy="256" r="10" fill="#f5e09a"/>
        </svg>
      </div>

      {/* NAV */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:50, padding:'14px 48px', display:'flex', alignItems:'center', justifyContent:'space-between', background: scrolled ? 'rgba(8,7,6,0.92)' : 'rgba(8,7,6,0.3)', backdropFilter: scrolled ? 'blur(16px)' : 'none', borderBottom: scrolled ? '1px solid #C4922E1a' : '1px solid transparent', transition:'all 0.35s' }}>
        <div onClick={() => goTo('/')} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
          <AtlasLogo size={42}/>
          <span className="marcellus" style={{ fontSize:24, color:'#f5e09a', letterSpacing:'0.05em' }}>ATLAS</span>
        </div>
        <div className="nm" style={{ display:'flex', gap:28 }}>
          {NAV_LINKS.map(l => (
            <a key={l.label} href="#" onClick={(e) => { e.preventDefault(); goTo(l.path); }} className={`nl${currentPage === l.label.toLowerCase() ? ' active' : ''}`}>{l.label}</a>
          ))}
        </div>
        <div className="nm" style={{ display:'flex', gap:10 }}>
          <button className="btn-o" style={{ padding:'9px 20px', fontSize:13 }} onClick={goLogin}>Log In</button>
          <button className="btn-g" style={{ padding:'9px 22px', fontSize:13 }} onClick={goLogin}>Join Beta →</button>
        </div>
        <button className="sm" onClick={() => setMenuOpen(true)} style={{ display:'none', background:'none', border:'none', color:'#f0ece4', cursor:'pointer', fontSize:24 }}>☰</button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ position:'fixed', inset:0, background:'#080706', zIndex:100, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:28 }}>
          <button onClick={() => setMenuOpen(false)} style={{ position:'absolute', top:20, right:24, background:'none', border:'none', color:'#f0ece4', fontSize:30, cursor:'pointer' }}>×</button>
          {NAV_LINKS.map(l => <a key={l.label} href="#" onClick={(e) => { e.preventDefault(); goTo(l.path); setMenuOpen(false); }} className="nl" style={{ fontSize:18 }}>{l.label}</a>)}
          <button className="btn-g" style={{ padding:'13px 36px', fontSize:15, marginTop:8 }} onClick={goLogin}>Join Beta →</button>
          <button className="btn-o" style={{ padding:'11px 32px', fontSize:14 }} onClick={goLogin}>Log In</button>
        </div>
      )}

      {/* Page content */}
      {children}

      {/* FOOTER */}
      <footer style={{ background:'rgba(4,3,2,0.92)', borderTop:'1px solid #C4922E22', padding:'56px 48px 28px', position:'relative', zIndex:1 }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div className="two-col" style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:48, marginBottom:44 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                <AtlasLogo size={32}/>
                <span className="marcellus" style={{ fontSize:18, color:'#f5e09a', letterSpacing:'0.05em' }}>ATLAS</span>
              </div>
              <p style={{ fontSize:13, color:'#f0ece4', lineHeight:1.65, maxWidth:220, fontWeight:300, marginBottom:18 }}>The command center for serious resellers.</p>
              <div style={{ display:'flex', gap:16 }}>
                {['Twitter','Discord','Instagram'].map(s => <a key={s} href="#" className="fa" style={{ fontSize:12 }}>{s}</a>)}
              </div>
            </div>
            {FOOTER_COLS.map(col => (
              <div key={col.title}>
                <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.16em', color:'#C4922E', textTransform:'uppercase', marginBottom:16 }}>{col.title}</p>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {col.links.map(l => <a key={l} href="#" className="fa">{l}</a>)}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop:'1px solid #C4922E0a', paddingTop:22, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
            <p style={{ fontSize:12, color:'#f0ece4' }}>© 2026 Atlas. All rights reserved.</p>
            <div style={{ display:'flex', gap:22 }}>
              {['Privacy Policy','Terms of Service'].map(l => <a key={l} href="#" style={{ fontSize:12, color:'#f0ece4', textDecoration:'none' }}>{l}</a>)}
            </div>
          </div>
        </div>
      </footer>
      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </div>
  );
}