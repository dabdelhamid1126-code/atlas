/**
 * Detects the shipping carrier from a tracking number format
 * @param {string} trackingNumber - The tracking number to analyze
 * @returns {string} The detected carrier code (uppercase) or 'unknown'
 */
export function detectCarrier(trackingNumber) {
  if (!trackingNumber) return 'unknown';
  
  const cleaned = trackingNumber.trim().replace(/\s/g, '');
  
  // UPS: starts with "1Z" (18 characters total)
  if (/^1Z[A-Z0-9]{16}$/i.test(cleaned)) {
    return 'UPS';
  }
  
  // Amazon: starts with "TBA"
  if (/^TBA/i.test(cleaned)) {
    return 'AMAZON';
  }
  
  // USPS: 20-22 digits, often starts with 9
  if (/^\d{20,22}$/.test(cleaned)) {
    return 'USPS';
  }
  
  // FedEx: 12 or 15 digits only (NOT starting with 1Z)
  if (/^\d{12}$/.test(cleaned) || /^\d{15}$/.test(cleaned)) {
    return 'FEDEX';
  }
  
  // DHL: exactly 10 digits
  if (/^\d{10}$/.test(cleaned)) {
    return 'DHL';
  }
  
  return 'unknown';
}