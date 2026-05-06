import React from 'react';
import Layout from '@/Layout';

export default function AboutPage() {
  return (
    <Layout>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 48, fontWeight: 700, marginBottom: 24, color: '#f0ece4' }}>
          About Atlas
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <section>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: '#C4922E', marginBottom: 12 }}>
              Who We Are
            </h2>
            <p style={{ fontSize: 16, color: '#8a7a6a', lineHeight: 1.8 }}>
              Atlas was built by resellers, for resellers. We spent years flipping products on Amazon, eBay, and other platforms, and realized we needed better tools to track profit, optimize credit cards, and manage our operations at scale.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: '#C4922E', marginBottom: 12 }}>
              Our Mission
            </h2>
            <p style={{ fontSize: 16, color: '#8a7a6a', lineHeight: 1.8 }}>
              Give resellers complete visibility into their business. Every margin, every cashback earn, every order status — in one place. No spreadsheets. No guesswork.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: '#C4922E', marginBottom: 12 }}>
              Why Atlas
            </h2>
            <p style={{ fontSize: 16, color: '#8a7a6a', lineHeight: 1.8, marginBottom: 16 }}>
              We know arbitrage because we do it. Every feature shipped is something we actually needed ourselves.
            </p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                'Profit tracking that actually accounts for all fees',
                'Cashback optimization across multiple cards',
                'One-click order import from major retailers',
                'Real-time analytics and forecasting',
                'Built for scale, from day 1',
              ].map(item => (
                <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, color: '#8a7a6a' }}>
                  <span style={{ color: '#C4922E', fontSize: 20 }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: '#C4922E', marginBottom: 12 }}>
              Get in Touch
            </h2>
            <p style={{ fontSize: 16, color: '#8a7a6a', lineHeight: 1.8 }}>
              Have feedback? Want to request a feature? Join our Discord community or email us at hello@atlasresellhub.com.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}