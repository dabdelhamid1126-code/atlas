import React from 'react';
import { cn } from '@/lib/utils';

const statusStyles = {
  // Inventory / order statuses
  pending:            { bg: 'var(--parch-warm)',  color: 'var(--ink-dim)',   border: 'var(--parch-line)' },
  received:           { bg: 'var(--terrain-bg)',  color: 'var(--terrain2)',  border: 'var(--terrain-bdr)' },
  in_stock:           { bg: 'var(--ink)',          color: 'var(--ne-cream)',  border: 'var(--ink)' },
  reserved:           { bg: 'var(--gold-bg)',      color: 'var(--gold2)',     border: 'var(--gold-bdr)' },
  exported:           { bg: 'var(--ocean-bg)',     color: 'var(--ocean2)',    border: 'var(--ocean-bdr)' },
  damaged:            { bg: 'var(--crimson-bg)',   color: 'var(--crimson2)',  border: 'var(--crimson-bdr)' },

  // Order statuses
  ordered:            { bg: 'var(--parch-warm)',  color: 'var(--ink-dim)',   border: 'var(--parch-line)' },
  shipped:            { bg: 'var(--ocean-bg)',     color: 'var(--ocean2)',    border: 'var(--ocean-bdr)' },
  partially_received: { bg: 'var(--gold-bg)',      color: 'var(--gold2)',     border: 'var(--gold-bdr)' },
  cancelled:          { bg: 'var(--parch-warm)',  color: 'var(--ink-ghost)', border: 'var(--parch-line)' },

  // Export statuses
  processing:         { bg: 'var(--ocean-bg)',     color: 'var(--ocean2)',    border: 'var(--ocean-bdr)' },
  completed:          { bg: 'var(--terrain-bg)',   color: 'var(--terrain2)',  border: 'var(--terrain-bdr)' },

  // Invoice statuses
  draft:              { bg: 'var(--parch-warm)',  color: 'var(--ink-faded)', border: 'var(--parch-line)' },
  sent:               { bg: 'var(--ocean-bg)',     color: 'var(--ocean2)',    border: 'var(--ocean-bdr)' },
  paid:               { bg: 'var(--terrain-bg)',   color: 'var(--terrain2)',  border: 'var(--terrain-bdr)' },
  overdue:            { bg: 'var(--crimson-bg)',   color: 'var(--crimson2)',  border: 'var(--crimson-bdr)' },

  // Task statuses
  in_progress:        { bg: 'var(--gold-bg)',      color: 'var(--gold2)',     border: 'var(--gold-bdr)' },

  // Gift card statuses
  available:          { bg: 'var(--terrain-bg)',   color: 'var(--terrain2)',  border: 'var(--terrain-bdr)' },
  used:               { bg: 'var(--parch-warm)',  color: 'var(--ink-ghost)', border: 'var(--parch-line)' },
  invalid:            { bg: 'var(--crimson-bg)',   color: 'var(--crimson2)',  border: 'var(--crimson-bdr)' },

  // Approval statuses
  approved:           { bg: 'var(--terrain-bg)',   color: 'var(--terrain2)',  border: 'var(--terrain-bdr)' },
  rejected:           { bg: 'var(--crimson-bg)',   color: 'var(--crimson2)',  border: 'var(--crimson-bdr)' },

  // Priority
  low:                { bg: 'var(--parch-warm)',  color: 'var(--ink-faded)', border: 'var(--parch-line)' },
  medium:             { bg: 'var(--gold-bg)',      color: 'var(--gold2)',     border: 'var(--gold-bdr)' },
  high:               { bg: 'var(--crimson-bg)',   color: 'var(--crimson2)',  border: 'var(--crimson-bdr)' },
  urgent:             { bg: 'var(--ink)',          color: 'var(--ne-cream)',  border: 'var(--ink)' },

  // Damage types
  physical:           { bg: 'var(--crimson-bg)',   color: 'var(--crimson2)',  border: 'var(--crimson-bdr)' },
  water:              { bg: 'var(--ocean-bg)',      color: 'var(--ocean2)',    border: 'var(--ocean-bdr)' },
  defective:          { bg: 'var(--crimson-bg)',   color: 'var(--crimson2)',  border: 'var(--crimson-bdr)' },
  missing_parts:      { bg: 'var(--gold-bg)',       color: 'var(--gold2)',     border: 'var(--gold-bdr)' },
  other:              { bg: 'var(--parch-warm)',   color: 'var(--ink-faded)', border: 'var(--parch-line)' },

  // Product categories
  phones:             { bg: 'var(--violet-bg)',    color: 'var(--violet2)',   border: 'var(--violet-bdr)' },
  tablets:            { bg: 'var(--violet-bg)',    color: 'var(--violet2)',   border: 'var(--violet-bdr)' },
  laptops:            { bg: 'var(--ocean-bg)',     color: 'var(--ocean2)',    border: 'var(--ocean-bdr)' },
  gaming:             { bg: 'var(--crimson-bg)',   color: 'var(--crimson2)',  border: 'var(--crimson-bdr)' },
  accessories:        { bg: 'var(--terrain-bg)',   color: 'var(--terrain2)',  border: 'var(--terrain-bdr)' },
  wearables:          { bg: 'var(--rose-bg)',      color: 'var(--rose2)',     border: 'var(--rose-bdr)' },
  audio:              { bg: 'var(--gold-bg)',      color: 'var(--gold2)',     border: 'var(--gold-bdr)' },

  // Default
  default:            { bg: 'var(--parch-warm)',   color: 'var(--ink-faded)', border: 'var(--parch-line)' },
};

export default function StatusBadge({ status, className }) {
  const formattedStatus = status?.replace(/_/g, ' ');
  const s = statusStyles[status] || statusStyles.default;

  return (
    <span
      className={cn('capitalize font-medium', className)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 9px',
        borderRadius: 99,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.04em',
        border: `1px solid ${s.border}`,
        background: s.bg,
        color: s.color,
        fontFamily: 'var(--font-serif)',
        whiteSpace: 'nowrap',
      }}
    >
      {formattedStatus}
    </span>
  );
}