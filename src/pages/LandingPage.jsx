import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [visible,  setVisible]  = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 80);
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navigate   = useNavigate();
  const goRegister = () => navigate("/register");
  const goLogin    = () => navigate("/app");

  return (
    <div style={{ background: "#080706", minHeight: "100vh", color: "#f0ece4", overflowX: "hidden", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .serif { font-family: 'Inter', system-ui, sans-serif; font-style: normal; font-weight: 700; }

        .fu { opacity: 0; transform: translateY(26px); transition: opacity 0.75s ease, transform 0.75s ease; }
        .fu.in { opacity: 1; transform: translateY(0); }
        .d1{transition-delay:.08s}.d2{transition-delay:.18s}.d3{transition-delay:.28s}
        .d4{transition-delay:.40s}.d5{transition-delay:.52s}.d6{transition-delay:.64s}

        .btn-g { background:#C4922E; color:#080706; border:none; border-radius:8px;
          font-family:'Inter',system-ui,sans-serif; font-weight:600; cursor:pointer;
          display:inline-flex; align-items:center; gap:8px; transition:all 0.2s; }
        .btn-g:hover { background:#d9a43a; transform:translateY(-1px); }

        .btn-o { background:transparent; color:#f0ece4; border:1px solid #C4922E44;
          border-radius:8px; font-family:'Inter',system-ui,sans-serif; font-weight:500;
          cursor:pointer; display:inline-flex; align-items:center; gap:8px; transition:all 0.2s; }
        .btn-o:hover { border-color:#C4922E88; background:#C4922E0a; }

        .nl { color:#7a7060; text-decoration:none; font-size:13px; font-weight:500;
          transition:color 0.2s; letter-spacing:-0.01em; }
        .nl:hover { color:#C4922E; }

        .fc { background:#0d0b08; border:1px solid #C4922E1a; border-radius:14px;
          padding:28px 22px; transition:all 0.25s; position:relative; overflow:hidden; }
        .fc:hover { border-color:#C4922E44; transform:translateY(-3px); background:#111009; }

        .dot-bg { background-image:radial-gradient(circle,#C4922E12 1px,transparent 1px);
          background-size:30px 30px; }

        .gold-line { height:1px; background:linear-gradient(90deg,transparent,#C4922E44,transparent); }

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
          .hg{grid-template-columns:1fr !important; text-align:center;}
          .hgr{margin:0 auto 40px; order:-1;}
          .hb{justify-content:center !important;}
          .fg{grid-template-columns:1fr 1fr !important;}
          .wg{grid-template-columns:1fr !important;}
          .ht{font-size:42px !important;}
          .sp{padding:60px 20px !important;}
          .nm{display:none !important;}
          .sm{display:flex !important;}
          .ftg{grid-template-columns:1fr 1fr !important;}
        }
        @media(max-width:540px){
          .fg{grid-template-columns:1fr !important;}
          .ht{font-size:34px !important;}
        }
      `}
      </style>

      {/* NAV */}
      <nav style={{
        position:"fixed", top:0, left:0, right:0, zIndex:50,
        padding:"16px 48px", display:"flex", alignItems:"center", justifyContent:"space-between",
        background: scrolled ? "rgba(8,7,6,0.93)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid #C4922E18" : "1px solid transparent",
        transition:"all 0.35s",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <AtlasLogo size={30}/>
          <span style={{ fontSize:16, fontWeight:800, letterSpacing:"0.15em", color:"#f5e09a", fontFamily:"'Inter',system-ui,sans-serif" }}>ATLAS</span>
        </div>
        <div className="nm" style={{ display:"flex", gap:28 }}>
          {NAV_LINKS.map(l => <a key={l} href="#" className="nl">{l}</a>)}
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
      <section className="dot-bg" style={{ minHeight:"100vh", padding:"130px 48px 80px", display:"flex", alignItems:"center" }} className="sp" style={{ padding:"130px 48px 80px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", width:"100%" }}>
          <div className="hg" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:60, alignItems:"center" }}>

            {/* Left */}
            <div>
              <div className={`fu ${visible?"in":""}`} style={{ marginBottom:24 }}>
                <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#C4922E16", border:"1px solid #C4922E40", borderRadius:99, padding:"5px 14px" }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:"#C4922E" }}/>
                  <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.2em", color:"#C4922E", textTransform:"uppercase" }}>Private Beta</span>
                </div>
              </div>

              <h1 className={`fu d1 ${visible?"in":""} ht`} style={{ fontSize:62, fontWeight:800, lineHeight:1.06, marginBottom:22, letterSpacing:'-0.03em', fontFamily:"'Inter',system-ui,sans-serif" }}>
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
            <div className={`fu d2 ${visible?"in":""} hgr`} style={{ display:"flex", justifyContent:"center", alignItems:"center", position:"relative", height:400 }}>
              <div className="pr"  style={{ position:"absolute", width:440, height:440, borderRadius:"50%", border:"1px solid #C4922E1e" }}/>
              <div className="pr2" style={{ position:"absolute", width:330, height:330, borderRadius:"50%", border:"1px solid #C4922E18" }}/>
              <div className="pr3" style={{ position:"absolute", width:220, height:220, borderRadius:"50%", border:"1px solid #C4922E14" }}/>
              <div style={{ position:"absolute", width:280, height:280, borderRadius:"50%", background:"radial-gradient(circle, #C4922E14 0%, transparent 70%)" }}/>
              <div className="fl" style={{ position:"relative", zIndex:1 }}>
                <AtlasLogo size={260}/>
              </div>
            </div>

          </div>
        </div>
      </section>

      <div className="gold-line"/>

      {/* FEATURES */}
      <section style={{ padding:"100px 48px", background:"#060504" }} className="sp">
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:60 }}>
            <p style={{ fontSize:10, fontWeight:700, letterSpacing:"0.22em", color:"#C4922E", textTransform:"uppercase", marginBottom:14 }}>Built for Resellers</p>
            <h2 style={{ fontSize:44, fontWeight:700, lineHeight:1.1, marginBottom:14, letterSpacing:'-0.025em', fontFamily:"'Inter',system-ui,sans-serif" }}>
              Everything You Need.<br/>All in One Place.
            </h2>
            <p style={{ fontSize:14, color:"#4a4238", maxWidth:460, margin:"0 auto", lineHeight:1.7, fontWeight:300 }}>
              Every feature was built because we needed it ourselves. No fluff, no filler.
            </p>
          </div>
          <div className="fg" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`fc fu d${i+1} ${visible?"in":""}`}>
                <div style={{ width:50, height:50, background:"#C4922E10", border:"1px solid #C4922E28", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:18 }}>
                  {f.icon}
                </div>
                <div style={{ fontSize:14, fontWeight:600, color:"#f0ece4", marginBottom:10 }}>{f.title}</div>
                <div style={{ fontSize:12, color:"#4a4238", lineHeight:1.65, fontWeight:300 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="gold-line"/>

      {/* WHY */}
      <section style={{ padding:"100px 48px", background:"#080706" }} className="sp">
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div className="wg" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:80, alignItems:"center" }}>
            <div>
              <p style={{ fontSize:10, fontWeight:700, letterSpacing:"0.2em", color:"#C4922E", textTransform:"uppercase", marginBottom:16 }}>Why Atlas</p>
              <h2 style={{ fontSize:44, fontWeight:700, lineHeight:1.1, marginBottom:20, letterSpacing:'-0.025em', fontFamily:"'Inter',system-ui,sans-serif" }}>
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
                  onMouseEnter={e => e.currentTarget.style.background="#0f0d09"}
                  onMouseLeave={e => e.currentTarget.style.background="#080706"}>
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
      <section className="dot-bg" style={{ padding:"110px 48px", background:"#060504", textAlign:"center", position:"relative", overflow:"hidden" }} className="sp">
        <div style={{ position:"absolute", left:"50%", top:"50%", transform:"translate(-50%,-50%)", opacity:0.04, pointerEvents:"none" }}>
          <AtlasLogo size={560}/>
        </div>
        <div style={{ maxWidth:580, margin:"0 auto", position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:24 }}>
            <AtlasLogo size={60}/>
          </div>
          <h2 style={{ fontSize:50, fontWeight:800, lineHeight:1.08, marginBottom:16, letterSpacing:'-0.03em', fontFamily:"'Inter',system-ui,sans-serif" }}>
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
                <AtlasLogo size={26}/>
                <span style={{ fontSize:14, fontWeight:800, letterSpacing:"0.12em", color:"#f5e09a", fontFamily:"'Inter',system-ui,sans-serif" }}>ATLAS</span>
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

    </div>
  );
}