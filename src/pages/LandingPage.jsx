import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import LoginModal from "@/components/LoginModal";

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
    <circle cx="256" cy="256" r="52" fill="#1e1a14" stroke="#C4922E" strokeWidth="10"/>
    <circle cx="256" cy="256" r="22" fill="#C4922E"/>
    <circle cx="256" cy="256" r="10" fill="#f5e09a"/>
  </svg>
);

const FEATURES = [
  {
    title: "Profit Tracking",
    desc: "See your true profit after fees, shipping, taxes, and cashback. Know exactly what you're making on every order.",
    icon: <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><polyline points="3,19 9,12 14,15 23,6" stroke="#C4922E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="18,6 23,6 23,11" stroke="#C4922E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  },
  {
    title: "Inventory Management",
    desc: "Track all your inventory in one place — cost basis, status, and margin visibility from purchase to sale.",
    icon: <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><rect x="3" y="7" width="20" height="15" rx="2" stroke="#C4922E" strokeWidth="2"/><path d="M8 7V5a5 5 0 0 1 10 0v2" stroke="#C4922E" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="13" x2="23" y2="13" stroke="#C4922E" strokeWidth="2"/></svg>,
  },
  {
    title: "Card Optimization",
    desc: "Track cashback rates per store and always know the best card to use for every single purchase.",
    icon: <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><rect x="2" y="6" width="22" height="14" rx="2" stroke="#C4922E" strokeWidth="2"/><line x1="2" y1="11" x2="24" y2="11" stroke="#C4922E" strokeWidth="2"/><rect x="5" y="15" width="5" height="2" rx="1" fill="#C4922E"/></svg>,
  },
  {
    title: "Gmail Auto-Import",
    desc: "Connect Gmail and automatically import orders from Amazon, Best Buy, Walmart, and more.",
    icon: <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><rect x="2" y="5" width="22" height="16" rx="2" stroke="#C4922E" strokeWidth="2"/><polyline points="2,7 13,15 24,7" stroke="#C4922E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  },
];

const WHY_POINTS = [
  "Knows your true margins after every fee and cashback",
  "Tracks the best card to use for every store",
  "Auto-imports orders straight from your inbox",
  "Gives you a live view of your entire operation",
  "Built by a reseller — every feature exists because we needed it",
];

const NAV_LINKS = ["Features", "Early Access", "Roadmap", "About", "FAQ"];

const FOOTER_COLS = [
  { title: "Product",   links: ["Features", "Early Access", "Roadmap", "Changelog"] },
  { title: "Company",   links: ["About", "Careers", "Contact"] },
  { title: "Resources", links: ["Blog", "Guides", "Support"] },
];

export default function LandingPage() {
  const { navigateToLogin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [visible,  setVisible]  = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // ── Star canvas animation ──────────────────────────────────────
  useEffect(() => {
    const canvas = document.getElementById('atlas-stars');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Generate stars
    const STARS = Array.from({ length: 240 }, () =>({
      x:     Math.random() * window.innerWidth,
      y:     Math.random() * window.innerHeight,
      r:     Math.random() * 1.4 + 0.2,
      alpha: Math.random() * 0.6 + 0.1,
      speed: Math.random() * 0.004 + 0.001,
      phase: Math.random() * Math.PI * 2,
    }));

    // Generate connections
    const LINES = [];
    for (let i = 0; i < STARS.length; i++) {
      for (let j = i + 1; j < STARS.length; j++) {
        const d = Math.hypot(STARS[i].x - STARS[j].x, STARS[i].y - STARS[j].y);
        if (d < 140) LINES.push({ i, j, d });
      }
    }

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.01;

      // Draw connection lines
      LINES.forEach(({ i, j, d }) => {
        const alpha = (1 - d / 140) * 0.18;
        ctx.beginPath();
        ctx.moveTo(STARS[i].x, STARS[i].y);
        ctx.lineTo(STARS[j].x, STARS[j].y);
        ctx.strokeStyle = `rgba(196,146,46,${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });

      // Draw stars
      STARS.forEach(s => {
        const pulse = s.alpha * (0.7 + 0.3 * Math.sin(t * s.speed * 100 + s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,245,${Math.min(pulse * 1.3, 0.9)})`;
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  useEffect(() => {
    setTimeout(() => setVisible(true), 80);
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goRegister = () => setLoginModalOpen(true);
  const goLogin    = () => setLoginModalOpen(true);

  return (
    <div style={{ background: "#060503", minHeight: "100vh", color: "#f0ece4", overflowX: "hidden", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=DM+Sans:wght@300;400;500;600&family=Marcellus&family=Marcellus&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .serif { font-family: 'Cormorant Garamond', Georgia, serif; }

        /* Star canvas */
        #atlas-stars { position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:0; }

        /* Logo watermark */
        .logo-watermark { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
          width:min(90vw,800px); height:min(90vw,800px); pointer-events:none; z-index:0;
          opacity:0.055; }

        /* Make all sections sit above stars */
        nav, section, footer { position:relative; z-index:1; }

        .fu { opacity: 0; transform: translateY(26px); transition: opacity 0.75s ease, transform 0.75s ease; }
        .fu.in { opacity: 1; transform: translateY(0); }
        .d1{transition-delay:.08s}.d2{transition-delay:.18s}.d3{transition-delay:.28s}
        .d4{transition-delay:.40s}.d5{transition-delay:.52s}.d6{transition-delay:.64s}

        .btn-g { background:#C4922E; color:#080706; border:none; border-radius:8px;
          font-family:'DM Sans',sans-serif; font-weight:600; cursor:pointer;
          display:inline-flex; align-items:center; gap:8px; transition:all 0.2s; }
        .btn-g:hover { background:#d9a43a; transform:translateY(-1px); }

        .btn-o { background:transparent; color:#f0ece4; border:1px solid #C4922E44;
          border-radius:8px; font-family:'DM Sans',sans-serif; font-weight:500;
          cursor:pointer; display:inline-flex; align-items:center; gap:8px; transition:all 0.2s; }
        .btn-o:hover { border-color:#C4922E88; background:#C4922E0a; }

        .nl { color:#7a7060; text-decoration:none; font-size:13px; font-weight:400;
          transition:color 0.2s; letter-spacing:0.02em; }
        .nl:hover { color:#C4922E; }

        .fc { background:#161208; border:1px solid #C4922E33; border-radius:14px;
          padding:28px 22px; transition:all 0.25s; position:relative; overflow:hidden; }
        .fc:hover { border-color:#C4922E77; transform:translateY(-3px); background:#1e1810; }

        .dot-bg { background-image:radial-gradient(circle,#C4922E12 1px,transparent 1px);
          background-size:30px 30px; }

        .gold-line { height:1px; background:linear-gradient(90deg,transparent,#C4922E88,transparent); }

        @keyframes pulse { 0%,100%{opacity:.15} 50%{opacity:.3} }
        .pr { animation:pulse 3.5s ease-in-out infinite; }
        .pr2 { animation:pulse 3.5s ease-in-out infinite; animation-delay:1.2s; }
        .pr3 { animation:pulse 3.5s ease-in-out infinite; animation-delay:2.4s; }

        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        .fl { animation:float 5.5s ease-in-out infinite; }

        .fa { text-decoration:none; color:#3a342c; font-size:13px; font-weight:300;
          transition:color 0.2s; }
        .fa:hover { color:#9a9080; }

        @media(max-width:900px){
          .hg{grid-template-columns:1fr !important; text-align:center; gap:0 !important;}
          .hgr{margin:0 auto 16px !important; order:-1; height:220px !important;}
          .hb{justify-content:center !important;}
          .fg{grid-template-columns:1fr 1fr !important;}
          .wg{grid-template-columns:1fr !important;}
          .ht{font-size:38px !important;}
          .sp{padding:60px 20px !important;}
          .nm{display:none !important;}
          .sm{display:flex !important;}
          .ftg{grid-template-columns:1fr 1fr !important;}
        }
        @media(max-width:540px){
          .fg{grid-template-columns:1fr !important;}
          .ht{font-size:32px !important;}
          .hgr{height:180px !important;}
        }
        @media(max-width:540px){
          .fg{grid-template-columns:1fr !important;}
          .ht{font-size:34px !important;}
        }
      `}</style>

      {/* Star background */}
      <canvas id="atlas-stars" />

      {/* Logo watermark */}
      <div className="logo-watermark">
        <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:'100%',height:'100%'}}>
          <polygon points="256,60 420,155 420,345 256,440 92,345 92,155" fill="none" stroke="#C4922E" strokeWidth="8" opacity="1"/>
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
      <nav style={{
        position:"fixed", top:0, left:0, right:0, zIndex:50,
        padding:"16px 48px", display:"flex", alignItems:"center", justifyContent:"space-between",
        background: scrolled ? "rgba(8,7,6,0.92)" : "rgba(8,7,6,0.3)",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid #C4922E18" : "1px solid transparent",
        transition:"all 0.35s",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <AtlasLogo size={42}/>
          <span style={{ fontFamily:"'Marcellus', serif", fontSize:24, fontWeight:400, letterSpacing:"0.05em", color:"#f5e09a" }}>ATLAS</span>
        </div>
        <div className="nm" style={{ display:"flex", gap:28 }}>
          {[
          {label:'Features', path:'/features'},
          {label:'Pricing',  path:'/pricing'},
          {label:'Roadmap',  path:'/roadmap'},
          {label:'About',    path:'/about'},
        ].map(l => <a key={l.label} href={l.path} className="nl">{l.label}</a>)}
        </div>
        <div className="nm" style={{ display:"flex", gap:10 }}>
          <button className="btn-o" style={{ padding:"9px 20px", fontSize:13 }} onClick={goLogin}>Log In</button>
          <button className="btn-g" style={{ padding:"9px 22px", fontSize:13 }} onClick={goRegister}>Join Beta →</button>
        </div>
        <button className="sm" onClick={() => setMenuOpen(true)}
          style={{ display:"none", background:"none", border:"none", color:"#f0ece4", cursor:"pointer", fontSize:24 }}>☰</button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ position:"fixed", inset:0, background:"#080706", zIndex:100, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:28 }}>
          <button onClick={() => setMenuOpen(false)} style={{ position:"absolute", top:20, right:24, background:"none", border:"none", color:"#f0ece4", fontSize:30, cursor:"pointer" }}>×</button>
          {NAV_LINKS.map(l => <a key={l} href="#" className="nl" style={{ fontSize:18 }} onClick={() => setMenuOpen(false)}>{l}</a>)}
          <button className="btn-g" style={{ padding:"13px 36px", fontSize:15, marginTop:8 }} onClick={goRegister}>Join Beta →</button>
          <button className="btn-o" style={{ padding:"11px 32px", fontSize:14 }} onClick={goLogin}>Log In</button>
        </div>
      )}

      {/* HERO */}
      <section style={{ minHeight:"100vh", padding:"100px 48px 60px", display:"flex", alignItems:"center", background:"transparent" }} className="sp" style={{ padding:"100px 48px 60px" }} className="sp" style={{ padding:"130px 48px 80px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", width:"100%" }}>
          <div className="hg" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:40, alignItems:"center" }}>

            {/* Left */}
            <div>
              <div className={`fu ${visible?"in":""}`} style={{ marginBottom:24 }}>
                <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#C4922E16", border:"1px solid #C4922E40", borderRadius:99, padding:"5px 14px" }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:"#C4922E" }}/>
                  <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.2em", color:"#C4922E", textTransform:"uppercase" }}>Private Beta</span>
                </div>
              </div>

              <h1 className={`serif fu d1 ${visible?"in":""} ht`} style={{ fontSize:62, fontWeight:700, lineHeight:1.06, marginBottom:22 }}>
                Run Your Reselling<br/>Business Like a<br/>
                <span style={{ color:"#C4922E" }}>Hedge Fund.</span>
              </h1>

              <p className={`fu d2 ${visible?"in":""}`} style={{ fontSize:15, color:"#7a7060", lineHeight:1.75, marginBottom:36, maxWidth:440, fontWeight:300 }}>
                Atlas gives you the tools, insights, and automation to track inventory, maximize profit, and make smarter decisions — every day.
              </p>

              <div className={`fu d3 ${visible?"in":""} hb`} style={{ display:"flex", gap:14, marginBottom:28, flexWrap:"wrap" }}>
                <button className="btn-g" style={{ padding:"14px 30px", fontSize:15 }} onClick={goRegister}>Join Beta →</button>
                <button className="btn-o" style={{ padding:"14px 26px", fontSize:15 }} onClick={goLogin}>Log In</button>
              </div>

              <p className={`fu d4 ${visible?"in":""}`} style={{ fontSize:12, color:"#2e2820" }}>
                No credit card required · Free to get started
              </p>
            </div>

            {/* Right — Large logo with rings */}
            <div className={`fu d2 ${visible?"in":""} hgr`} style={{ display:"flex", justifyContent:"center", alignItems:"center", position:"relative", height:320 }}>
              <div className="pr"  style={{ position:"absolute", width:360, height:360, borderRadius:"50%", border:"1px solid #C4922E28" }}/>
              <div className="pr2" style={{ position:"absolute", width:260, height:260, borderRadius:"50%", border:"1px solid #C4922E20" }}/>
              <div className="pr3" style={{ position:"absolute", width:180, height:180, borderRadius:"50%", border:"1px solid #C4922E18" }}/>
              <div style={{ position:"absolute", width:320, height:320, borderRadius:"50%", background:"radial-gradient(circle, #C4922E28 0%, #C4922E08 50%, transparent 70%)" }}/>
              <div className="fl" style={{ position:"relative", zIndex:1 }}>
                <AtlasLogo size={220}/>
              </div>
            </div>

          </div>
        </div>
      </section>

      <div className="gold-line"/>

      {/* FEATURES */}
      <section style={{ padding:"100px 48px", background:"rgba(10,9,6,0.85)", borderTop:"1px solid #C4922E22", borderBottom:"1px solid #C4922E22" }} className="sp">
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:60 }}>
            <p style={{ fontSize:10, fontWeight:700, letterSpacing:"0.22em", color:"#C4922E", textTransform:"uppercase", marginBottom:14 }}>Built for Resellers</p>
            <h2 className="serif" style={{ fontSize:44, fontWeight:600, lineHeight:1.1, marginBottom:14 }}>
              Everything You Need.<br/>All in One Place.
            </h2>
            <p style={{ fontSize:14, color:"#4a4238", maxWidth:460, margin:"0 auto", lineHeight:1.7, fontWeight:300 }}>
              Every feature was built because we needed it ourselves. No fluff, no filler.
            </p>
          </div>
          <div className="fg" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`fc fu d${i+1} ${visible?"in":""}`}>
                <div style={{ width:50, height:50, background:"#C4922E18", border:"1px solid #C4922E44", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:18 }}>
                  {f.icon}
                </div>
                <div style={{ fontSize:14, fontWeight:600, color:"#fff", marginBottom:10 }}>{f.title}</div>
                <div style={{ fontSize:12, color:"#6a6258", lineHeight:1.65, fontWeight:300 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="gold-line"/>

      {/* WHY */}
      <section style={{ padding:"100px 48px", background:"rgba(8,7,6,0.88)" }} className="sp">
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div className="wg" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:80, alignItems:"center" }}>
            <div>
              <p style={{ fontSize:10, fontWeight:700, letterSpacing:"0.2em", color:"#C4922E", textTransform:"uppercase", marginBottom:16 }}>Why Atlas</p>
              <h2 className="serif" style={{ fontSize:44, fontWeight:600, lineHeight:1.1, marginBottom:20 }}>
                Not Another<br/><span style={{ color:"#C4922E" }}>Spreadsheet Tool.</span>
              </h2>
              <p style={{ fontSize:14, color:"#4a4238", lineHeight:1.8, marginBottom:36, fontWeight:300, maxWidth:400 }}>
                Atlas thinks like a reseller. Clarity, automation, and real insights — not just another place to log numbers.
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                {WHY_POINTS.map(p => (
                  <div key={p} style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:20, height:20, borderRadius:"50%", background:"#C4922E12", border:"1px solid #C4922E3a", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <div style={{ width:6, height:6, borderRadius:"50%", background:"#C4922E" }}/>
                    </div>
                    <span style={{ fontSize:13, color:"#8a8070", fontWeight:400, lineHeight:1.5 }}>{p}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:1, background:"#C4922E12", borderRadius:16, overflow:"hidden", border:"1px solid #C4922E18" }}>
              {[
                ["Profit Tracking","After all fees"],
                ["Card Optimizer","Per store rates"],
                ["Gmail Import","Auto-sync orders"],
                ["Inventory","Cost basis tracking"],
                ["Gift Cards","Codes & balances"],
                ["Analytics","ROI by store & card"],
                ["Forecasting","Trend-based outlook"],
                ["Goal Tracker","Monthly targets"],
              ].map(([label, sub]) => (
                <div key={label} style={{ background:"#080706", padding:"20px 18px", transition:"background 0.2s", cursor:"default" }}
                  onMouseEnter={e => e.currentTarget.style.background="#1a1610"}
                  onMouseLeave={e => e.currentTarget.style.background="#0d0b08"}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#b0aba2", marginBottom:4 }}>{label}</div>
                  <div style={{ fontSize:11, color:"#302c28", fontWeight:300 }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="gold-line"/>

      {/* CTA */}
      <section style={{ padding:"110px 48px", background:"rgba(6,5,4,0.82)", textAlign:"center", position:"relative", overflow:"hidden" }} className="sp">

        <div style={{ maxWidth:580, margin:"0 auto", position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:24 }}>
            <AtlasLogo size={60}/>
          </div>
          <h2 className="serif" style={{ fontSize:50, fontWeight:600, lineHeight:1.08, marginBottom:16 }}>
            Get Early Access<br/>to <span style={{ color:"#C4922E" }}>Atlas</span>
          </h2>
          <p style={{ fontSize:15, color:"#4a4238", marginBottom:38, lineHeight:1.7, fontWeight:300 }}>
            Create your free account and start running your reselling business like a pro.
          </p>
          <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap", marginBottom:16 }}>
            <button className="btn-g" style={{ padding:"15px 36px", fontSize:15 }} onClick={goRegister}>
              Create Free Account →
            </button>
            <button className="btn-o" style={{ padding:"15px 28px", fontSize:15 }} onClick={goLogin}>Log In</button>
          </div>
          <p style={{ fontSize:12, color:"#252018" }}>No credit card required · Free to get started</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background:"#040302", borderTop:"1px solid #C4922E12", padding:"56px 48px 28px" }} className="sp">
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div className="ftg" style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:48, marginBottom:44 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <AtlasLogo size={36}/>
                <span style={{ fontFamily:"'Marcellus', serif", fontSize:18, fontWeight:400, letterSpacing:"0.05em", color:"#f5e09a" }}>ATLAS</span>
              </div>
              <p style={{ fontSize:13, color:"#2e2820", lineHeight:1.65, maxWidth:220, fontWeight:300, marginBottom:18 }}>
                The command center for serious resellers.
              </p>
              <div style={{ display:"flex", gap:16 }}>
                {["Twitter","Discord","Instagram"].map(s => (
                  <a key={s} href="#" className="fa" style={{ fontSize:12 }}>{s}</a>
                ))}
              </div>
            </div>
            {FOOTER_COLS.map(col => (
              <div key={col.title}>
                <p style={{ fontSize:10, fontWeight:700, letterSpacing:"0.16em", color:"#C4922E", textTransform:"uppercase", marginBottom:16 }}>{col.title}</p>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {col.links.map(l => <a key={l} href="#" className="fa">{l}</a>)}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop:"1px solid #C4922E0a", paddingTop:22, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
            <p style={{ fontSize:12, color:"#201c16" }}>© 2026 Atlas. All rights reserved.</p>
            <div style={{ display:"flex", gap:22 }}>
              {["Privacy Policy","Terms of Service"].map(l => (
                <a key={l} href="#" style={{ fontSize:12, color:"#201c16", textDecoration:"none", transition:"color 0.2s" }}
                  onMouseEnter={e=>e.currentTarget.style.color="#4a4238"}
                  onMouseLeave={e=>e.currentTarget.style.color="#201c16"}>{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </div>
  );
}