import React from 'react';

export default function PageHeader({ title, description, actions }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.3px', margin: 0 }}>{title}</h1>
            {description && <p style={{ fontSize: 12, color: 'var(--ink-dim)', marginTop: 4 }}>{description}</p>}
          </div>
          {actions && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}