import React from 'react';
import Layout from '@/components/Layout';

export default function PricingPage() {
  const plans = [
    {
      name: 'Free',
      price: '0',
      features: [
        'Basic profit tracking',
        'Up to 50 orders/month',
        'Manual data entry',
        'Basic analytics',
      ]
    },
    {
      name: 'Pro',
      price: '29',
      popular: true,
      features: [
        'All Free features',
        'Unlimited orders',
        'Gmail auto-import',
        'Advanced analytics',
        'Goal tracking',
        'Card optimization',
        'Priority support',
      ]
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      features: [
        'All Pro features',
        'Custom integrations',
        'API access',
        'Dedicated support',
        'Advanced reporting',
      ]
    },
  ];

  return (
    <Layout>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ fontSize: 48, fontWeight: 700, marginBottom: 16, color: '#f0ece4', textAlign: 'center' }}>Pricing</h1>
        <p style={{ fontSize: 16, color: '#8a7a6a', marginBottom: 48, maxWidth: 600, margin: '0 auto 48px' }}>
          Simple, transparent pricing for serious resellers.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {plans.map(plan => (
            <div key={plan.name} style={{
              background: '#161208',
              border: plan.popular ? '2px solid #C4922E' : '1px solid #C4922E33',
              borderRadius: 12,
              padding: 32,
              transform: plan.popular ? 'scale(1.05)' : 'scale(1)',
            }}>
              {plan.popular && (
                <div style={{ background: '#C4922E', color: '#080706', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, marginBottom: 16, display: 'inline-block' }}>
                  MOST POPULAR
                </div>
              )}
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#e8ddd0', marginBottom: 8 }}>
                {plan.name}
              </h2>
              <div style={{ marginBottom: 24 }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: '#C4922E' }}>
                  ${plan.price}
                </span>
                {plan.price !== 'Custom' && (
                  <span style={{ color: '#8a7a6a', marginLeft: 8 }}>/month</span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8a7a6a', fontSize: 14 }}>
                    <span style={{ color: '#C4922E' }}>✓</span>
                    {f}
                  </div>
                ))}
              </div>
              <button style={{
                width: '100%',
                marginTop: 24,
                padding: '12px 16px',
                background: plan.popular ? '#C4922E' : 'transparent',
                color: plan.popular ? '#080706' : '#C4922E',
                border: plan.popular ? 'none' : '1px solid #C4922E',
                borderRadius: 8,
                fontWeight: 600,
                cursor: 'pointer',
              }}>
                Get Started
              </button>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}