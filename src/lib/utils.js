// Format currency (e.g., $1,234.56)
export function formatCurrency(value) {
  if (typeof value !== 'number' || isNaN(value)) {
    return '$0.00';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

// Format date (e.g., May 7, 2026)
export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return 'N/A';
  }
}

// Parse date safely
export function parseDate(dateString) {
  if (!dateString) return new Date();
  return new Date(dateString + 'T00:00:00Z');
}

// Calculate days difference
export function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Format percentage
export function formatPercent(value) {
  if (typeof value !== 'number') return '0%';
  return `${(value * 100).toFixed(2)}%`;
}
