import React from 'react';
import Layout from '@/components/Layout';

export default function RoadmapPage() {
  const roadmap = [
    {
      status: 'Live',
      color: '#C4922E',
      features: [
        'Profit Tracking',
        'Inventory Management',
        'Card Optimization',
        'Gmail Auto-Import',
        'Analytics Dashboard',
      ]
    },
    {
      status: 'Up Next',
      color: '#5865F2',
      features: [
        'Mobile App (iOS/Android)',
        'Advanced Spreadsheet Mode',
        'Share Card PNG Generator',
        'Inventory Syncing',
        'Tax Reporting',
      ]
    },
    {
      status: 'Coming Soon',
      color: '#A367E0',
      features: [
        'AI Receipt Parser',
        'Multi-store Integration',
        'Automated Goal Tracking',
        'Custom Reports',
        'API Access',
      ]
    },
  ];

  return (
    <Layout>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ fontSize: 48, fontWeight: 700, marginBottom: 16, color: '#f0ece4', textAlign: 'center' }}>
          Roadmap
        </h1>
        <p style={{ fontSize: 16, color: '#8a7a6a', marginBottom: 48, maxWidth: 600, margin: '0 auto 48px', textAlign: 'center' }}>
          Here's what we're building for Atlas.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
          {roadmap.map(phase => (
            <div key={phase.status}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 20,
              }}>
                <div style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: phase.color,
                }} />
                <span style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  color: phase.color,
                  textTransform: 'uppercase',
                }}>
                  {phase.status}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {phase.features.map(f => (
                  <div key={f} style={{
                    background: '#161208',
                    border: `1px solid ${phase.color}33`,
                    borderRadius: 8,
                    padding: 16,
                    color: '#e8ddd0',
                    fontSize: 14,
                  }}>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}