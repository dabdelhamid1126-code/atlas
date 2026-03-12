import React from 'react';

export default function GoalToggle({ checked, onChange, color = 'green' }) {
  const colors = {
    green: 'data-[checked=true]:bg-green-500',
    red: 'data-[checked=false]:bg-slate-300',
  };

  return (
    <button
      onClick={() => onChange(!checked)}
      data-checked={checked}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-green-500' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}