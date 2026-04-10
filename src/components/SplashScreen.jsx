import { useState, useEffect, useRef } from 'react';

function AtlasLogo({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#1a1208" stroke="rgba(201,168,76,0.5)" strokeWidth="1.5"/>
      <ellipse cx="50" cy="50" rx="32" ry="13" stroke="rgba(201,168,76,0.4)" strokeWidth="1" fill="none"/>
      <ellipse cx="50" cy="50" rx="32" ry="32" stroke="rgba(201,168,76,0.18)" strokeWidth="1" fill="none" transform="rotate(60 50 50)"/>
      <ellipse cx="50" cy="50" rx="32" ry="32" stroke="rgba(201,168,76,0.18)" strokeWidth="1" fill="none" transform="rotate(120 50 50)"/>
      <circle cx="50" cy="50" r="9" fill="rgba(201,168,76,0.85)"/>
      <circle cx="50" cy="50" r="5" fill="#c9a84c"/>
      <circle cx="50" cy="18" r="3" fill="#f0d070"/>
      <circle cx="50" cy="82" r="3" fill="#f0d070"/>
      <circle cx="18" cy="50" r="2" fill="rgba(201,168,76,0.55)"/>
      <circle cx="82" cy="50" r="2" fill="rgba(201,168,76,0.55)"/>
    </svg>
  );
}

function InkParticles() {
  const particles = useRef(
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 8 + 6,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.15 + 0.05,
    }))
  );
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
      {particles.current.map(p => (
        <div key={p.id} style={{
          position:'absolute', left:`${p.x}%`, top:`${p.y}%`,
          width:p.size, height:p.size, borderRadius:'50%',
          background:'#8a6a20', opacity:p.opacity,
          animation:`inkFloat ${p.duration}s ease-in-out ${p.delay}s infinite`,
        }}/>
      ))}
    </div>
  );
}

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
      setTimeout(() => setLogoVisible(true),    250),
      setTimeout(() => setTitleVisible(true),   700),
      setTimeout(() => setSubtitleVisible(true),1050),
      setTimeout(() => setGreetVisible(true),   1350),
      setTimeout(() => setBarVisible(true),     1650),
    ];
    let p = 0;
    const tick = setInterval(() => {
      p += Math.random() * 3.5 + 1.2;
      if (p >= 100) {
        p = 100; clearInterval(tick);
        setTimeout(() => { setPhase('out'); setTimeout(() => onComplete?.(), 800); }, 350);
      }
      setProgress(Math.min(p, 100));
    }, 45);
    return () => { t.forEach(clearTimeout); clearInterval(tick); };
  }, []);

  const fadeUp = (visible) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(14px)',
    transition: 'opacity 0.7s ease, transform 0.7s cubic-bezier(0.16,1,0.3,1)',
  });

  const statusText = progress < 30 ? 'Charting the territory...'
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
        /* System font stack — no Google Fonts */
        @keyframes inkFloat {
          0%,100% { transform:translateY(0) translateX(0); }
          33%      { transform:translateY(-14px) translateX(5px); }
          66%      { transform:translateY(-7px) translateX(-6px); }
        }
        @keyframes logoBreath {
          0%,100% { filter:drop-shadow(0 0 10px rgba(184,134,11,0.4)) drop-shadow(0 0 24px rgba(184,134,11,0.15)); }
          50%      { filter:drop-shadow(0 0 20px rgba(184,134,11,0.7)) drop-shadow(0 0 44px rgba(184,134,11,0.28)); }
        }
        @keyframes ringCW  { from{transform:rotate(0deg)}   to{transform:rotate(360deg)} }
        @keyframes ringCCW { from{transform:rotate(0deg)}   to{transform:rotate(-360deg)} }
        @keyframes titlePulse { 0%,100%{opacity:1} 50%{opacity:0.78} }
        @keyframes barGlow {
          0%,100%{box-shadow:0 0 6px rgba(184,134,11,0.45)}
          50%    {box-shadow:0 0 14px rgba(184,134,11,0.85)}
        }
        @keyframes splashIn {
          from{opacity:0;transform:scale(0.9)}
          to  {opacity:1;transform:scale(1)}
        }
      `}</style>

      {/* Parchment base */}
      <div style={{ position:'absolute', inset:0, background:'#ede6d0' }}/>

      {/* Radial aged vignette */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background:'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 25%, rgba(110,80,20,0.07) 65%, rgba(70,45,10,0.22) 100%)',
      }}/>

      {/* Corner burn */}
      {[{top:0,left:0},{top:0,right:0},{bottom:0,left:0},{bottom:0,right:0}].map((pos,i)=>(
        <div key={i} style={{
          position:'absolute', width:260, height:260, borderRadius:'50%', pointerEvents:'none',
          background:'radial-gradient(circle, rgba(70,45,10,0.16) 0%, transparent 70%)',
          ...pos,
          transform:`translate(${pos.left!==undefined?'-45%':'45%'},${pos.top!==undefined?'-45%':'45%'})`,
        }}/>
      ))}

      {/* Cartographic grid */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        backgroundImage:`
          repeating-linear-gradient(0deg,  rgba(150,110,35,0.08) 0px, transparent 1px, transparent 44px, rgba(150,110,35,0.08) 45px),
          repeating-linear-gradient(90deg, rgba(150,110,35,0.08) 0px, transparent 1px, transparent 44px, rgba(150,110,35,0.08) 45px)
        `,
      }}/>

      {/* Compass SVG lines */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', opacity:0.065 }}>
        <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#8a6a20" strokeWidth="1"/>
        <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#8a6a20" strokeWidth="1"/>
        <line x1="0" y1="0" x2="100%" y2="100%" stroke="#8a6a20" strokeWidth="0.6"/>
        <line x1="100%" y1="0" x2="0" y2="100%" stroke="#8a6a20" strokeWidth="0.6"/>
        <circle cx="50%" cy="50%" r="17%" fill="none" stroke="#8a6a20" strokeWidth="0.7"/>
        <circle cx="50%" cy="50%" r="31%" fill="none" stroke="#8a6a20" strokeWidth="0.45"/>
        <circle cx="50%" cy="50%" r="45%" fill="none" stroke="#8a6a20" strokeWidth="0.3"/>
      </svg>

      <InkParticles/>

      {/* ── Content ── */}
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
          border:'1px dashed rgba(184,134,11,0.2)',
          animation: logoVisible ? 'ringCW 20s linear infinite' : 'none',
          pointerEvents:'none',
        }}/>
        {/* Inner solid ring */}
        <div style={{
          position:'absolute', width:124, height:124,
          top:'50%', left:'50%', marginTop:-62, marginLeft:-62,
          borderRadius:'50%',
          border:'1px solid rgba(184,134,11,0.13)',
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

        {/* Title */}
        <div style={{ ...fadeUp(titleVisible), marginBottom:10, textAlign:'center' }}>
          <h1 style={{
            fontFamily:"ui-sans-serif, system-ui, -apple-system, sans-serif",
            fontSize:46, fontWeight:600,
            letterSpacing:'0.22em',
            color:'#26190a',
            margin:0, lineHeight:1,
            animation: titleVisible ? 'titlePulse 4s ease-in-out 0.5s infinite' : 'none',
          }}>ATLAS</h1>
        </div>

        {/* Divider + subtitle */}
        <div style={{ ...fadeUp(subtitleVisible), marginBottom:22, textAlign:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:30, height:1, background:'rgba(184,134,11,0.38)' }}/>
            <p style={{
              fontFamily:"ui-sans-serif, system-ui, -apple-system, sans-serif",
              fontSize:10, fontWeight:400,
              letterSpacing:'0.3em', textTransform:'uppercase',
              color:'#7a6040', margin:0,
            }}>Reselling, Quantified</p>
            <div style={{ width:30, height:1, background:'rgba(184,134,11,0.38)' }}/>
          </div>
        </div>

        {/* Greeting */}
        <div style={{ ...fadeUp(greetVisible), marginBottom:38, textAlign:'center' }}>
          <p style={{
            fontFamily:"ui-sans-serif, system-ui, -apple-system, sans-serif",
            fontSize:14, fontStyle:'italic',
            color:'#7a6040', margin:0,
          }}>
            {userName
              ? <>Good to see you,{' '}<span style={{ fontStyle:'normal', fontWeight:700, color:'#b8860b' }}>{userName}</span></>
              : 'Welcome back.'}
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ ...fadeUp(barVisible), width:210, display:'flex', flexDirection:'column', alignItems:'center', gap:9 }}>
          <div style={{
            width:'100%', height:3,
            background:'rgba(184,134,11,0.14)',
            borderRadius:3, overflow:'hidden',
            border:'1px solid rgba(184,134,11,0.1)',
          }}>
            <div style={{
              height:'100%', width:`${progress}%`,
              background:'linear-gradient(90deg, #8a6a00, #c9a84c, #f0d070, #c9a84c)',
              borderRadius:3,
              transition:'width 0.06s linear',
              animation: barVisible && progress < 100 ? 'barGlow 1.5s ease-in-out infinite' : 'none',
            }}/>
          </div>
          <p style={{
            fontFamily:'monospace', fontSize:9,
            letterSpacing:'0.18em', textTransform:'uppercase',
            color:'rgba(120,92,50,0.5)', margin:0,
          }}>{statusText}</p>
        </div>
      </div>

      {/* Corner compass roses */}
      {[{ bottom:26, right:30 },{ top:26, left:30 }].map((pos,i)=>(
        <svg key={i} width="38" height="38" viewBox="0 0 38 38"
          style={{ position:'absolute', opacity: subtitleVisible ? 0.2 : 0, transition:'opacity 1s ease 1.6s', ...pos }}
          xmlns="http://www.w3.org/2000/svg">
          <circle cx="19" cy="19" r="17" fill="none" stroke="#8a6a20" strokeWidth="0.8"/>
          <line x1="19" y1="2" x2="19" y2="36" stroke="#8a6a20" strokeWidth="0.8"/>
          <line x1="2" y1="19" x2="36" y2="19" stroke="#8a6a20" strokeWidth="0.8"/>
          <line x1="5" y1="5" x2="33" y2="33" stroke="#8a6a20" strokeWidth="0.5"/>
          <line x1="33" y1="5" x2="5" y2="33" stroke="#8a6a20" strokeWidth="0.5"/>
          <circle cx="19" cy="19" r="3" fill="#b8860b" opacity="0.55"/>
          <polygon points="19,3 17,15 19,13 21,15" fill="#8a6a20"/>
        </svg>
      ))}

      {/* Bottom stamp */}
      <div style={{
        position:'absolute', bottom:22,
        display:'flex', alignItems:'center', gap:8,
        opacity: subtitleVisible ? 0.28 : 0,
        transition:'opacity 1s ease 2s',
      }}>
        <div style={{ width:18, height:1, background:'#8a6a20' }}/>
        <p style={{ fontFamily:'monospace', fontSize:8, letterSpacing:'0.2em', color:'#8a6a20', margin:0, textTransform:'uppercase' }}>
          Est. 2024 · All Rights Reserved
        </p>
        <div style={{ width:18, height:1, background:'#8a6a20' }}/>
      </div>
    </div>
  );
}