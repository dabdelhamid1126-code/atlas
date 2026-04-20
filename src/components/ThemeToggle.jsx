import { useTheme } from '@/lib/ThemeContext';

const THEMES = [
  {
    id: 'parchment',
    name: 'Parchment',
    desc: 'Aged paper & gold ink — the classic Atlas look',
    preview: {
      bg: '#f4edd8',
      card: '#faf6ec',
      accent: '#b8860b',
      text: '#1c1410',
      dots: ['#b8860b','#2d5a27','#1a5276'],
    },
  },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      {/* Section header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--gold)', flexShrink:0 }}/>
        <span style={{ fontFamily:'var(--font-serif)', fontSize:10, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--gold)' }}>
          Theme
        </span>
        <div style={{ flex:1, height:1, background:'linear-gradient(90deg, rgba(184,134,11,0.25), transparent)' }}/>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {THEMES.map(t => {
          const isActive = theme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              style={{
                cursor:'pointer',
                borderRadius:12,
                padding:0,
                border:`2px solid ${isActive ? 'var(--gold)' : 'var(--parch-line)'}`,
                background:'transparent',
                overflow:'hidden',
                transition:'border-color 0.2s ease',
                textAlign:'left',
              }}
            >
              {/* Preview swatch */}
              <div style={{
                height:80,
                background: t.id === 'midnight'
                  ? 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(6,182,212,0.2) 0%, #0a0e1a 60%)'
                  : t.preview.bg,
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                gap:8,
                position:'relative',
                overflow:'hidden',
              }}>
                {/* Mini card */}
                <div style={{
                  width:54, height:38,
                  borderRadius:6,
                  background: t.preview.card,
                  border:`1px solid ${t.id === 'midnight' ? 'rgba(100,180,255,0.15)' : 'rgba(160,120,40,0.22)'}`,
                  display:'flex', flexDirection:'column',
                  padding:'5px 6px', gap:4,
                }}>
                  <div style={{ width:'60%', height:4, borderRadius:2, background:t.preview.accent, opacity:0.8 }}/>
                  <div style={{ width:'90%', height:3, borderRadius:2, background:t.preview.text, opacity:0.15 }}/>
                  <div style={{ width:'75%', height:3, borderRadius:2, background:t.preview.text, opacity:0.1 }}/>
                </div>
                {/* Color dots */}
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {t.preview.dots.map((c,i) => (
                    <div key={i} style={{ width:8, height:8, borderRadius:'50%', background:c }}/>
                  ))}
                </div>
                {/* Active checkmark */}
                {isActive && (
                  <div style={{
                    position:'absolute', top:6, right:6,
                    width:18, height:18, borderRadius:'50%',
                    background:'var(--gold)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>

              {/* Label */}
              <div style={{
                padding:'8px 12px',
                background:'var(--parch-warm)',
                borderTop:`1px solid var(--parch-line)`,
              }}>
                <p style={{ margin:0, fontSize:12, fontWeight:700, color:'var(--ink)', fontFamily:'var(--font-serif)' }}>{t.name}</p>
                <p style={{ margin:'2px 0 0', fontSize:10, color:'var(--ink-ghost)' }}>{t.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Current theme indicator */}
      <div style={{
        marginTop:12, padding:'8px 12px',
        borderRadius:8, border:'1px solid var(--parch-line)',
        background:'var(--parch-card)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <span style={{ fontSize:11, color:'var(--ink-dim)' }}>
          Active theme
        </span>
        <span style={{
          fontSize:11, fontWeight:700,
          padding:'2px 10px', borderRadius:99,
          background:'var(--gold-bg)',
          color:'var(--gold)',
          border:'1px solid var(--gold-border)',
        }}>
          {THEMES.find(t => t.id === theme)?.name}
        </span>
      </div>
    </div>
  );
}