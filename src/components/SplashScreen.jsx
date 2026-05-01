import { useState, useEffect, useRef } from 'react';

/* ─────────────────────────────────────────────
   ATLAS LOGO — matches Layout.jsx exactly
───────────────────────────────────────────── */
function AtlasLogo({ size = 82 }) {
  const s = size;
  const scale = s / 512;
  // Scale a 512-viewBox point to current size
  const p = (x, y) => `${x * scale},${y * scale}`;
  const cx = s / 2, cy = s / 2;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Dark background */}
      <rect width={s} height={s} rx={s * 0.195} fill="#1e1a14"/>
      <rect width={s} height={s} rx={s * 0.195} fill="none" stroke="#C4922E" strokeWidth={s * 0.008} opacity="0.4"/>
      {/* Outer hexagon */}
      <polygon
        points={[p(256,60),p(420,155),p(420,345),p(256,440),p(92,345),p(92,155)].join(' ')}
        fill="none" stroke="#C4922E" strokeWidth={s * 0.023} opacity="0.9"
      />
      {/* Inner hexagon */}
      <polygon
        points={[p(256,110),p(375,175),p(375,305),p(256,370),p(137,305),p(137,175)].join(' ')}
        fill="none" stroke="#C4922E" strokeWidth={s * 0.008} opacity="0.3"
      />
      {/* Cross lines */}
      <line x1={p(256,80).split(',')[0]} y1={p(256,80).split(',')[1]} x2={p(256,432).split(',')[0]} y2={p(256,432).split(',')[1]}
        stroke="#C4922E" strokeWidth={s * 0.006} strokeDasharray={`${s*0.035} ${s*0.035}`} opacity="0.35"/>
      <line x1={p(80,256).split(',')[0]} y1={p(80,256).split(',')[1]} x2={p(432,256).split(',')[0]} y2={p(432,256).split(',')[1]}
        stroke="#C4922E" strokeWidth={s * 0.006} strokeDasharray={`${s*0.035} ${s*0.035}`} opacity="0.35"/>
      {/* Diagonal lines */}
      <line x1={p(112,112).split(',')[0]} y1={p(112,112).split(',')[1]} x2={p(400,400).split(',')[0]} y2={p(400,400).split(',')[1]}
        stroke="#C4922E" strokeWidth={s * 0.004} strokeDasharray={`${s*0.023} ${s*0.035}`} opacity="0.18"/>
      <line x1={p(400,112).split(',')[0]} y1={p(400,112).split(',')[1]} x2={p(112,400).split(',')[0]} y2={p(112,400).split(',')[1]}
        stroke="#C4922E" strokeWidth={s * 0.004} strokeDasharray={`${s*0.023} ${s*0.035}`} opacity="0.18"/>
      {/* North arrow — solid gold */}
      <polygon points={[p(256,82),p(238,168),p(256,152),p(274,168)].join(' ')} fill="#C4922E"/>
      {/* South arrow — dim */}
      <polygon points={[p(256,430),p(238,344),p(256,360),p(274,344)].join(' ')} fill="#C4922E" opacity="0.25"/>
      {/* East arrow — bright */}
      <polygon points={[p(430,256),p(344,238),p(360,256),p(344,274)].join(' ')} fill="#f5e09a"/>
      {/* West arrow — dim */}
      <polygon points={[p(82,256),p(168,238),p(152,256),p(168,274)].join(' ')} fill="#C4922E" opacity="0.25"/>
      {/* Center ring */}
      <circle cx={cx} cy={cy} r={s * 0.1015} fill="#1e1a14" stroke="#C4922E" strokeWidth={s * 0.0195}/>
      {/* Center dot */}
      <circle cx={cx} cy={cy} r={s * 0.043} fill="#C4922E"/>
      {/* Inner dot */}
      <circle cx={cx} cy={cy} r={s * 0.0195} fill="#f5e09a"/>
    </svg>
  );
}

/* ─────────────────────────────────────────────
   INK PARTICLES — Neutral Elegance tones
───────────────────────────────────────────── */
function InkParticles() {
  const particles = useRef(
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 8 + 6,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.12 + 0.04,
    }))
  );
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
      {particles.current.map(p => (
        <div key={p.id} style={{
          position:'absolute', left:`${p.x}%`, top:`${p.y}%`,
          width:p.size, height:p.size, borderRadius:'50%',
          background:'#997E67',
          opacity:p.opacity,
          animation:`inkFloat ${p.duration}s ease-in-out ${p.delay}s infinite`,
        }}/>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SPLASH SCREEN
───────────────────────────────────────────── */
export default function SplashScreen({ onComplete, userName = '' }) {
  const [progress, setProgress]               = useState(0);
  const [phase, setPhase]                     = useState('in');
  const [logoVisible, setLogoVisible]         = useState(false);
  const [titleVisible, setTitleVisible]       = useState(false);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [greetVisible, setGreetVisible]       = useState(false);
  const [barVisible, setBarVisible]           = useState(false);

  useEffect(() => {
    const t = [
      setTimeout(() => setLogoVisible(true),     300),
      setTimeout(() => setTitleVisible(true),    900),
      setTimeout(() => setSubtitleVisible(true), 1400),
      setTimeout(() => setGreetVisible(true),    1800),
      setTimeout(() => setBarVisible(true),      2200),
    ];
    let p = 0;
    const tick = setInterval(() => {
      // Slow start, steady middle, slight pause near end
      const step = p < 30  ? Math.random() * 1.2 + 0.4   // slow start
                 : p < 75  ? Math.random() * 1.8 + 0.8   // steady
                 : p < 95  ? Math.random() * 0.8 + 0.3   // slow near end
                 :            Math.random() * 0.4 + 0.1;  // creep to 100
      p += step;
      if (p >= 100) {
        p = 100; clearInterval(tick);
        // Pause at 100% for 900ms so user sees "Ready", then fade out
        setTimeout(() => { setPhase('out'); setTimeout(() => onComplete?.(), 900); }, 900);
      }
      setProgress(Math.min(p, 100));
    }, 55);
    return () => { t.forEach(clearTimeout); clearInterval(tick); };
  }, []);

  const fadeUp = (visible) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(14px)',
    transition: 'opacity 0.7s ease, transform 0.7s cubic-bezier(0.16,1,0.3,1)',
  });

  const statusText = progress < 30  ? 'Charting the territory...'
    : progress < 65 ? 'Loading your ledger...'
    : progress < 95 ? 'Almost ready...'
    : 'Ready';

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9999,
      display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column',
      overflow:'hidden',
      opacity: phase === 'out' ? 0 : 1,
      transition: phase === 'out' ? 'opacity 0.75s ease' : 'none',
    }}>
      <style>{`
        @keyframes inkFloat {
          0%,100% { transform:translateY(0) translateX(0); }
          33%      { transform:translateY(-14px) translateX(5px); }
          66%      { transform:translateY(-7px) translateX(-6px); }
        }
        @keyframes logoBreath {
          0%,100% { filter:drop-shadow(0 0 12px rgba(160,114,42,0.45)) drop-shadow(0 0 28px rgba(160,114,42,0.18)); }
          50%      { filter:drop-shadow(0 0 24px rgba(160,114,42,0.75)) drop-shadow(0 0 50px rgba(160,114,42,0.3)); }
        }
        @keyframes ringCW  { from{transform:rotate(0deg)}   to{transform:rotate(360deg)} }
        @keyframes ringCCW { from{transform:rotate(0deg)}   to{transform:rotate(-360deg)} }
        @keyframes titlePulse { 0%,100%{opacity:1} 50%{opacity:0.78} }
        @keyframes barGlow {
          0%,100%{box-shadow:0 0 6px rgba(160,114,42,0.45)}
          50%    {box-shadow:0 0 16px rgba(160,114,42,0.85)}
        }
        @keyframes splashIn {
          from{opacity:0;transform:scale(0.9)}
          to  {opacity:1;transform:scale(1)}
        }
      `}</style>

      {/* ── Neutral Elegance cream base ── */}
      <div style={{ position:'absolute', inset:0, background:'#FDF5EC' }}/>

      {/* Radial aged vignette — warmed to match #CCBEB1 */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background:'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 25%, rgba(153,126,103,0.07) 65%, rgba(102,73,48,0.18) 100%)',
      }}/>

      {/* Corner burn — espresso #664930 */}
      {[{top:0,left:0},{top:0,right:0},{bottom:0,left:0},{bottom:0,right:0}].map((pos,i)=>(
        <div key={i} style={{
          position:'absolute', width:260, height:260, borderRadius:'50%', pointerEvents:'none',
          background:'radial-gradient(circle, rgba(102,73,48,0.12) 0%, transparent 70%)',
          ...pos,
          transform:`translate(${pos.left!==undefined?'-45%':'45%'},${pos.top!==undefined?'-45%':'45%'})`,
        }}/>
      ))}

      {/* Cartographic grid — #CCBEB1 tones */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        backgroundImage:`
          repeating-linear-gradient(0deg,  rgba(153,126,103,0.1) 0px, transparent 1px, transparent 44px, rgba(153,126,103,0.1) 45px),
          repeating-linear-gradient(90deg, rgba(153,126,103,0.1) 0px, transparent 1px, transparent 44px, rgba(153,126,103,0.1) 45px)
        `,
      }}/>

      {/* Compass SVG lines */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', opacity:0.07 }}>
        <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#997E67" strokeWidth="1"/>
        <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#997E67" strokeWidth="1"/>
        <line x1="0" y1="0" x2="100%" y2="100%" stroke="#997E67" strokeWidth="0.6"/>
        <line x1="100%" y1="0" x2="0" y2="100%" stroke="#997E67" strokeWidth="0.6"/>
        <circle cx="50%" cy="50%" r="17%" fill="none" stroke="#997E67" strokeWidth="0.7"/>
        <circle cx="50%" cy="50%" r="31%" fill="none" stroke="#997E67" strokeWidth="0.45"/>
        <circle cx="50%" cy="50%" r="45%" fill="none" stroke="#997E67" strokeWidth="0.3"/>
      </svg>

      <InkParticles/>

      {/* ── Main content ── */}
      <div style={{
        position:'relative',
        display:'flex', flexDirection:'column', alignItems:'center',
        animation:'splashIn 0.55s cubic-bezier(0.16,1,0.3,1) both',
      }}>
        {/* Outer dashed ring */}
        <div style={{
          position:'absolute', width:168, height:168,
          top:'50%', left:'50%', marginTop:-84, marginLeft:-84,
          borderRadius:'50%',
          border:'1px dashed rgba(160,114,42,0.22)',
          animation: logoVisible ? 'ringCW 20s linear infinite' : 'none',
          pointerEvents:'none',
        }}/>
        {/* Inner solid ring */}
        <div style={{
          position:'absolute', width:124, height:124,
          top:'50%', left:'50%', marginTop:-62, marginLeft:-62,
          borderRadius:'50%',
          border:'1px solid rgba(160,114,42,0.14)',
          animation: logoVisible ? 'ringCCW 14s linear infinite' : 'none',
          pointerEvents:'none',
        }}/>

        {/* Logo */}
        <div style={{
          marginBottom:30,
          ...fadeUp(logoVisible),
          animation: logoVisible ? 'logoBreath 3s ease-in-out 1s infinite' : 'none',
        }}>
          <AtlasLogo size={82}/>
        </div>

        {/* Title — espresso #3D2B1A */}
        <div style={{ ...fadeUp(titleVisible), marginBottom:10, textAlign:'center' }}>
          <h1 style={{
            fontFamily:"'Satoshi', 'Inter', system-ui, sans-serif",
            fontSize:46, fontWeight:900,
            letterSpacing:'0.22em',
            color:'#3D2B1A',
            margin:0, lineHeight:1,
            animation: titleVisible ? 'titlePulse 4s ease-in-out 0.5s infinite' : 'none',
          }}>ATLAS</h1>
        </div>

        {/* Divider + subtitle */}
        <div style={{ ...fadeUp(subtitleVisible), marginBottom:22, textAlign:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:30, height:1, background:'rgba(160,114,42,0.4)' }}/>
            <p style={{
              fontFamily:"'Satoshi', 'Inter', system-ui, sans-serif",
              fontSize:10, fontWeight:600,
              letterSpacing:'0.3em', textTransform:'uppercase',
              color:'#664930', margin:0,
            }}>Reselling, Quantified</p>
            <div style={{ width:30, height:1, background:'rgba(160,114,42,0.4)' }}/>
          </div>
        </div>

        {/* Greeting */}
        <div style={{ ...fadeUp(greetVisible), marginBottom:38, textAlign:'center' }}>
          <p style={{
            fontFamily:"'Satoshi', 'Inter', system-ui, sans-serif",
            fontSize:14, fontStyle:'italic',
            color:'#8a6d56', margin:0,
          }}>
            {userName
              ? <>Good to see you,{' '}<span style={{ fontStyle:'normal', fontWeight:700, color:'#A0722A' }}>{userName}</span>.</>
              : 'Welcome back.'}
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ ...fadeUp(barVisible), width:210, display:'flex', flexDirection:'column', alignItems:'center', gap:9 }}>
          <div style={{
            width:'100%', height:3,
            background:'rgba(160,114,42,0.14)',
            borderRadius:3, overflow:'hidden',
            border:'1px solid rgba(160,114,42,0.1)',
          }}>
            <div style={{
              height:'100%', width:`${progress}%`,
              background:'linear-gradient(90deg, #664930, #A0722A, #C4922E, #A0722A)',
              borderRadius:3,
              transition:'width 0.06s linear',
              animation: barVisible && progress < 100 ? 'barGlow 1.5s ease-in-out infinite' : 'none',
            }}/>
          </div>
          <p style={{
            fontFamily:"ui-monospace, 'SF Mono', 'Consolas', monospace",
            fontSize:9, letterSpacing:'0.18em',
            textTransform:'uppercase',
            color:'rgba(102,73,48,0.5)', margin:0,
          }}>{statusText}</p>
        </div>
      </div>

      {/* Corner compass roses */}
      {[{ bottom:26, right:30 },{ top:26, left:30 }].map((pos,i)=>(
        <svg key={i} width="38" height="38" viewBox="0 0 38 38"
          style={{ position:'absolute', opacity: subtitleVisible ? 0.22 : 0, transition:'opacity 1s ease 1.6s', ...pos }}
          xmlns="http://www.w3.org/2000/svg">
          <circle cx="19" cy="19" r="17" fill="none" stroke="#997E67" strokeWidth="0.8"/>
          <line x1="19" y1="2" x2="19" y2="36" stroke="#997E67" strokeWidth="0.8"/>
          <line x1="2" y1="19" x2="36" y2="19" stroke="#997E67" strokeWidth="0.8"/>
          <line x1="5" y1="5" x2="33" y2="33" stroke="#997E67" strokeWidth="0.5"/>
          <line x1="33" y1="5" x2="5" y2="33" stroke="#997E67" strokeWidth="0.5"/>
          <circle cx="19" cy="19" r="3" fill="#A0722A" opacity="0.55"/>
          <polygon points="19,3 17,15 19,13 21,15" fill="#997E67"/>
        </svg>
      ))}

      {/* Bottom stamp */}
      <div style={{
        position:'absolute', bottom:22,
        display:'flex', alignItems:'center', gap:8,
        opacity: subtitleVisible ? 0.28 : 0,
        transition:'opacity 1s ease 2s',
      }}>
        <div style={{ width:18, height:1, background:'#997E67' }}/>
        <p style={{
          fontFamily:"ui-monospace, 'SF Mono', 'Consolas', monospace",
          fontSize:8, letterSpacing:'0.2em',
          color:'#997E67', margin:0, textTransform:'uppercase',
        }}>
          Est. 2024 · All Rights Reserved
        </p>
        <div style={{ width:18, height:1, background:'#997E67' }}/>
      </div>
    </div>
  );
}