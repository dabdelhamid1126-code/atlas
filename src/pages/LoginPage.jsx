import React, { useEffect, useRef } from 'react';
import LoginModal from '@/components/LoginModal';

const AtlasLogo = ({ size = 48 }) => (
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

// Animated hex grid background
function HexGrid() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let t = 0;

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function hexPath(cx, cy, r) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const R   = 52;
      const col = Math.ceil(canvas.width  / (R * 1.73)) + 2;
      const row = Math.ceil(canvas.height / (R * 1.5))  + 2;

      for (let r = -1; r < row; r++) {
        for (let c = -1; c < col; c++) {
          const cx = c * R * Math.sqrt(3) + (r % 2 === 0 ? 0 : R * Math.sqrt(3) / 2);
          const cy = r * R * 1.5;

          // Pulse based on distance from center + time
          const dx   = cx - canvas.width  / 2;
          const dy   = cy - canvas.height / 2;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const wave = Math.sin(dist / 120 - t * 0.6) * 0.5 + 0.5;
          const alpha = 0.03 + wave * 0.06;

          hexPath(cx, cy, R - 2);
          ctx.strokeStyle = `rgba(196, 146, 46, ${alpha})`;
          ctx.lineWidth   = 0.8;
          ctx.stroke();
        }
      }

      t += 0.016;
      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
}

const STATS = [
  { value: 'Live',    label: 'Profit Tracking'  },
  { value: 'Auto',    label: 'Order Import'      },
  { value: 'Smart',   label: 'Card Optimization' },
  { value: 'Real',    label: 'Analytics'         },
];

export default function LoginPage() {
  const handleClose = () => { window.location.href = '/'; };

  return (
    <div style={{
      position:   'fixed',
      inset:       0,
      background: '#0d0b08',
      overflow:   'hidden',
      fontFamily: "'DM Sans', 'Satoshi', system-ui, sans-serif",
    }}>

      {/* Animated hex grid */}
      <HexGrid />

      {/* Radial glow center */}
      <div style={{
        position:   'absolute',
        inset:       0,
        background: 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(196,146,46,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }}/>

      {/* Top-left glow */}
      <div style={{
        position:   'absolute',
        top: '-10%', left: '-5%',
        width: '40%', height: '50%',
        background: 'radial-gradient(ellipse, rgba(196,146,46,0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
      }}/>

      {/* Bottom-right glow */}
      <div style={{
        position:   'absolute',
        bottom: '-10%', right: '-5%',
        width: '40%', height: '50%',
        background: 'radial-gradient(ellipse, rgba(196,146,46,0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
      }}/>

      {/* Left panel — branding */}
      <div style={{
        position:   'absolute',
        left:        0, top: 0, bottom: 0,
        width:      '42%',
        display:    'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding:    '60px 56px',
        zIndex:      10,
      }}>
        {/* Logo + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 48 }}>
          <AtlasLogo size={44}/>
          <div>
            <div style={{
              fontSize:      22,
              fontWeight:    800,
              letterSpacing: '0.22em',
              color:         '#f5e09a',
              lineHeight:     1,
            }}>ATLAS</div>
            <div style={{ fontSize: 11, color: '#5a5248', letterSpacing: '0.12em', marginTop: 3 }}>
              RESELLING, QUANTIFIED
            </div>
          </div>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize:   42,
          fontWeight: 700,
          lineHeight:  1.1,
          color:      '#f0ece4',
          margin:     '0 0 16px',
          letterSpacing: '-0.01em',
        }}>
          Your operation,<br/>
          <span style={{ color: '#C4922E' }}>fully visible.</span>
        </h1>

        <p style={{
          fontSize:   14,
          color:      '#4a4238',
          lineHeight:  1.7,
          maxWidth:   320,
          margin:     '0 0 48px',
        }}>
          Track profits, optimize cashback, auto-import orders, and see exactly what you're making on every deal.
        </p>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          {STATS.map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#C4922E', fontVariantNumeric: 'tabular-nums' }}>
                {s.value}
              </div>
              <div style={{ fontSize: 10, color: '#4a4238', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Decorative divider line */}
        <div style={{
          marginTop:   56,
          width:        60,
          height:        1,
          background:  'linear-gradient(90deg, #C4922E44, transparent)',
        }}/>

        <p style={{ marginTop: 16, fontSize: 11, color: '#2e2a24', letterSpacing: '0.06em' }}>
          © 2026 Atlas · Built for resellers
        </p>
      </div>

      {/* Vertical divider */}
      <div style={{
        position:   'absolute',
        left:       '42%',
        top:        '10%', bottom: '10%',
        width:       1,
        background: 'linear-gradient(180deg, transparent, rgba(196,146,46,0.15) 30%, rgba(196,146,46,0.15) 70%, transparent)',
        zIndex:      10,
      }}/>

      {/* Right panel — login modal area */}
      <div style={{
        position:       'absolute',
        right:           0, top: 0, bottom: 0,
        left:           '42%',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        zIndex:          20,
      }}>
        <LoginModal isOpen={true} onClose={handleClose}/>
      </div>

    </div>
  );
}