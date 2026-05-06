import React from 'react';
import Layout from '@/components/Layout';

export default function FeaturesPage() {
  const features = [
    {
      title: 'Profit Tracking',
      desc: 'Calculate true profit after fees, shipping, taxes, and cashback on every order.'
    },
    {
      title: 'Inventory Management',
      desc: 'Track inventory from purchase to sale with cost basis and margin visibility.'
    },
    {
      title: 'Card Optimizer',
      desc: 'Know the best credit card to use for every store and maximize cashback.'
    },
    {
      title: 'Gmail Auto-Import',
      desc: 'Automatically import orders from Amazon, Best Buy, Walmart, and more.'
    },
    {
      title: 'Analytics & Insights',
      desc: 'ROI by store, profit trends, cashback breakdown, and performance metrics.'
    },
    {
      title: 'Goal Tracking',
      desc: 'Set monthly profit targets and track progress in real-time.'
    },
    {
      title: 'Gift Card Tracker',
      desc: 'Manage gift card codes, balances, and purchase costs.'
    },
    {
      title: 'Forecasting',
      desc: 'Predict revenue trends and plan ahead with data-driven forecasts.'
    },
  ];

  return (
    <Layout>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ fontSize: 48, fontWeight: 700, marginBottom: 16, color: '#f0ece4' }}>Features</h1>
        <p style={{ fontSize: 16, color: '#8a7a6a', marginBottom: 48, maxWidth: 600 }}>
          Everything you need to run your reselling business professionally.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 60 }}>
          {features.map(f => (
            <div key={f.title} style={{
              background: '#161208',
              border: '1px solid #C4922E33',
              borderRadius: 12,
              padding: 24,
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#e8ddd0', marginBottom: 12 }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 14, color: '#8a7a6a', lineHeight: 1.6 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}