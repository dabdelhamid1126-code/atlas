import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

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

const FOOTER_COLS = [
  { title: "Product", links: [["Features", "/features"], ["Pricing", "/pricing"], ["Roadmap", "/roadmap"], ["Changelog", "https://github.com"]] },
  { title: "Company", links: [["About", "/about"], ["Careers", "https://careers.atlasresellhub.com"], ["Contact", "https://contact.atlasresellhub.com"]] },
  { title: "Resources", links: [["Blog", "https://blog.atlasresellhub.com"], ["Guides", "https://guides.atlasresellhub.com"], ["Support", "https://support.atlasresellhub.com"]] },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(false);

  // Star canvas animation
  useEffect(() => {
    const canvas = document.getElementById('atlas-stars');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const STARS = Array.from({ length: 240 }, () => (({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.4 + 0.2,
      alpha: Math.random() * 0.6 + 0.1,
      speed: Math.random() * 0.004 + 0.001,
      phase: Math.random() * Math.PI * 2,
    })));

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

      LINES.forEach(({ i, j, d }) => {
        const alpha = (1 - d / 140) * 0.18;
        ctx.beginPath();
        ctx.moveTo(STARS[i].x, STARS[i].y);
        ctx.lineTo(STARS[j].x, STARS[j].y);
        ctx.strokeStyle = `rgba(196,146,46,${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });

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

  return (
    <div style={{ background: "#060503", minHeight: "100vh", color: "#f0ece4", overflowX: "hidden", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=DM+Sans:wght@300;400;500;600&family=Marcellus&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .serif { font-family: 'Cormorant Garamond', Georgia, serif; }
        #atlas-stars { position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:0; }
        .logo-watermark { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); width:min(90vw,800px); height:min(90vw,800px); pointer-events:none; z-index:0; opacity:0.055; }
        nav, section, footer { position:relative; z-index:1; }
        .fu { opacity: 0; transform: translateY(26px); transition: opacity 0.75s ease, transform 0.75s ease; }
        .fu.in { opacity: 1; transform: translateY(0); }
        .d1{transition-delay:.08s}.d2{transition-delay:.18s}.d3{transition-delay:.28s}
        .d4{transition-delay:.40s}.d5{transition-delay:.52s}.d6{transition-delay:.64s}
        .btn-g { background:#C4922E; color:#080706; border:none; border-radius:8px; font-family:'DM Sans',sans-serif; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:8px; transition:all 0.2s; padding:12px 24px; }
        .btn-g:hover { background:#d9a43a; transform:translateY(-1px); }
        .btn-o { background:transparent; color:#f0ece4; border:1px solid #C4922E44; border-radius:8px; font-family:'DM Sans',sans-serif; font-weight:500; cursor:pointer; display:inline-flex; align-items:center; gap:8px; transition:all 0.2s; padding:12px 24px; }
        .btn-o:hover { border-color:#C4922E88; background:#C4922E0a; }
        .nl { color:#7a7060; text-decoration:none; font-size:13px; font-weight:400; transition:color 0.2s; letter-spacing:0.02em; }
        .nl:hover { color:#C4922E; }
        .fc { background:#161208; border:1px solid #C4922E33; border-radius:14px; padding:28px 22px; transition:all 0.25s; position:relative; overflow:hidden; }
        .fc:hover { border-color:#C4922E77; transform:translateY(-3px); background:#1e1810; }
        .gold-line { height:1px; background:linear-gradient(90deg,transparent,#C4922E88,transparent); }
        @keyframes pulse { 0%,100%{opacity:.15} 50%{opacity:.3} }
        .pr { animation:pulse 3.5s ease-in-out infinite; }
        .pr2 { animation:pulse 3.5s ease-in-out infinite; animation-delay:1.2s; }
        .pr3 { animation:pulse 3.5s ease-in-out infinite; animation-delay:2.4s; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        .fl { animation:float 5.5s ease-in-out infinite; }
        .fa { text-decoration:none; color:#3a342c; font-size:13px; font-weight:300; transition:color 0.2s; }
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
      `}</style>

      <canvas id="atlas-stars" />

      {/* Navigation */}
      <nav style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: scrolled ? "14px 32px" : "24px 32px",
        transition: "all 0.3s",
        background: scrolled ? "rgba(6, 5, 3, 0.8)" : "transparent",
        backdropFilter: scrolled ? "blur(8px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(196, 146, 46, 0.1)" : "none",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none", cursor: "pointer" }}>
          <svg width="32" height="32" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
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
          <span style={{ fontSize: "18px", fontWeight: "700", letterSpacing: "-0.01em" }}>Atlas</span>
        </a>

        <div style={{ display: "flex", gap: "32px", alignItems: "center" }} className="nm">
          <a href="/features" className="nl">Features</a>
          <a href="/pricing" className="nl">Pricing</a>
          <a href="/roadmap" className="nl">Roadmap</a>
          <a href="/about" className="nl">About</a>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button onClick={() => navigate('/login')} className="btn-o" style={{ padding: "10px 20px", fontSize: "13px" }}>
            Log In
          </button>
          <button onClick={() => navigate('/login')} className="btn-g" style={{ padding: "10px 20px", fontSize: "13px" }}>
            Join Beta
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ padding: "100px 32px 80px", maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px", alignItems: "center" }} className="hg">
          <div style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(26px)", transition: "all 0.75s ease" }}>
            <h1 style={{ fontSize: "54px", fontWeight: "700", lineHeight: "1.2", marginBottom: "20px", fontFamily: "'Cormorant Garamond', serif" }} className="ht">
              Run Your Reselling Business Like a <span style={{ color: "#C4922E" }}>Hedge Fund.</span>
            </h1>
            <p style={{ fontSize: "16px", color: "#8a7a6a", lineHeight: "1.6", marginBottom: "32px", maxWidth: "480px" }}>
              Atlas gives you the tools, insights, and automation to track inventory, maximize profit, and make smarter decisions — every day.
            </p>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }} className="hb">
              <button onClick={() => navigate('/login')} className="btn-g">Join Beta</button>
              <button onClick={() => navigate('/features')} className="btn-o">Learn More</button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ padding: "80px 32px", maxWidth: "1400px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "36px", fontWeight: "700", textAlign: "center", marginBottom: "60px", fontFamily: "'Cormorant Garamond', serif" }}>
          Everything you need to scale.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }} className="fg">
          {FEATURES.map((f, i) => (
            <div key={i} className="fc" style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(26px)", transition: `all 0.75s ease ${0.1 * (i + 1)}s` }}>
              <div style={{ marginBottom: "16px" }}>{f.icon}</div>
              <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>{f.title}</h3>
              <p style={{ fontSize: "13px", color: "#8a7a6a", lineHeight: "1.5" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Atlas Section */}
      <section style={{ padding: "80px 32px", maxWidth: "1400px", margin: "0 auto", borderTop: "1px solid rgba(196, 146, 46, 0.1)", borderBottom: "1px solid rgba(196, 146, 46, 0.1)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px", alignItems: "center" }} className="hg">
          <div>
            <h2 style={{ fontSize: "36px", fontWeight: "700", marginBottom: "32px", fontFamily: "'Cormorant Garamond', serif" }}>
              Why Atlas.
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }} className="wg">
              {WHY_POINTS.map((p, i) => (
                <div key={i} style={{ display: "flex", gap: "12px", opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(26px)", transition: `all 0.75s ease ${0.08 * (i + 1)}s` }}>
                  <div style={{ width: "6px", height: "6px", background: "#C4922E", borderRadius: "50%", marginTop: "8px", flexShrink: 0 }} />
                  <p style={{ fontSize: "15px", color: "#d0c5b5", lineHeight: "1.6" }}>{p}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "60px 32px 40px", borderTop: "1px solid rgba(196, 146, 46, 0.1)", marginTop: "80px" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "40px", marginBottom: "40px" }} className="ftg">
            {FOOTER_COLS.map((col, i) => (
              <div key={i}>
                <h4 style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase", color: "#9a8a7a", marginBottom: "16px", letterSpacing: "0.1em" }}>{col.title}</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {col.links.map((link, j) => (
                    <a key={j} href={link[1]} className="fa">{link[0]}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ paddingTop: "24px", borderTop: "1px solid rgba(196, 146, 46, 0.1)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "#5a4a3a" }}>
            <p>© 2025 Atlas. All rights reserved.</p>
            <div style={{ display: "flex", gap: "16px" }}>
              <a href="https://twitter.com/atlasresellhub" className="fa">Twitter</a>
              <a href="https://discord.gg/atlasresellhub" className="fa">Discord</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}