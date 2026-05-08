import React from 'react';

export default function GoalToggle({ checked, onChange, activeColor = null }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: 44,
        height: 24,
        borderRadius: 99,
        border: 'none',
        cursor: 'pointer',
        flexShrink: 0,
        background: checked ? (activeColor || '#22c55e') : 'var(--parch-deep)',
        transition: 'background 0.2s',
      }}
    >
      <span style={{
        position: 'absolute',
        left: checked ? 22 : 2,
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: 'white',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        transition: 'left 0.2s',
      }} />
    </button>
  );
}