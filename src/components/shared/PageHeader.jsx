import React from 'react';

export default function PageHeader({ title, description, actions }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <h1 className="page-title">{title}</h1>
            {description && <p className="page-subtitle">{description}</p>}
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