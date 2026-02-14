/**
 * Detects the shipping carrier from a tracking number format
 * @param {string} trackingNumber - The tracking number to analyze
 * @returns {string} The detected carrier code (uppercase) or 'unknown'
 */
export function detectCarrier(trackingNumber) {
  if (!trackingNumber) return 'unknown';
  
  const cleaned = trackingNumber.trim().replace(/\s/g, '');
  
  // UPS: starts with "1Z" (case insensitive)
  if (/^1Z/i.test(cleaned)) {
    return 'UPS';
  }
  
  // FedEx: 12 or 15 digits only
  if (/^\d{12}$/.test(cleaned) || /^\d{15}$/.test(cleaned)) {
    return 'FEDEX';
  }
  
  // USPS: 20-22 digits, often starts with 9
  if (/^\d{20,22}$/.test(cleaned)) {
    return 'USPS';
  }
  
  // DHL: exactly 10 digits
  if (/^\d{10}$/.test(cleaned)) {
    return 'DHL';
  }
  
  // Amazon: starts with "TBA"
  if (/^TBA/i.test(cleaned)) {
    return 'AMAZON';
  }
  
  return 'unknown';
}