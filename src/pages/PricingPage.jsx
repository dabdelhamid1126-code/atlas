import React from 'react';
import LandingLayout from './LandingLayout';

export default function PricingPage() {
  return (
    <LandingLayout currentPage="pricing">
      <section style={{ paddingTop: 140, paddingBottom: 140, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 800, textAlign: 'center' }}>
          
          {/* Coming Soon Badge */}
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', color: '#C4922E', textTransform: 'uppercase', marginBottom: 24 }}>
            Coming Soon
          </p>

          {/* Main Heading */}
          <h1 className="serif" style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1, marginBottom: 20, color: '#f0ece4' }}>
            Pricing Details Coming <span style={{ color: '#C4922E' }}>Soon</span>
          </h1>

          {/* Subtitle */}
          <p style={{ fontSize: 18, color: '#9a9080', marginBottom: 32, lineHeight: 1.6, maxWidth: 500, margin: '0 auto 32px' }}>
            We're working on finalized pricing plans. Get early access to Atlas and help shape what matters most.
          </p>

          {/* CTA Button */}
          <button 
            onClick={() => window.location.href = 'https://atlasresellhub.base44.app'}
            style={{
              padding: '16px 36px',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              background: '#C4922E',
              color: '#080706',
              border: 'none',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
          >
            Join the Beta
          </button>

          {/* Decorative element */}
          <div style={{ marginTop: 64, display: 'flex', justifyContent: 'center', gap: 16 }}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#C4922E',
                  opacity: 0.3 + i * 0.25,
                }}
              />
            ))}
          </div>

        </div>
      </section>
    </LandingLayout>
  );
}