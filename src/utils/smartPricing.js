// src/utils/smartPricing.js
// Smart pricing calculations with cashback and cost multipliers

/**
 * Calculate true cost after applying cashback and cost multiplier
 * @param {number} storePrice - Price paid at store
 * @param {number} cashbackRate - Cashback percentage (0-100)
 * @param {number} costMultiplier - Cost multiplier for discounts (0-2)
 * @returns {number} Final cost after adjustments
 */
export const calculateTrueCost = (storePrice, cashbackRate = 0, costMultiplier = 1) => {
  const adjustedPrice = storePrice * costMultiplier;
  const cashback = adjustedPrice * (cashbackRate / 100);
  return adjustedPrice - cashback;
};

/**
 * Calculate suggested sale price (same as true cost, user can override)
 * @param {number} trueCost - Calculated true cost
 * @returns {number} Suggested sale price
 */
export const calculateSuggestedPrice = (trueCost) => {
  return trueCost;
};

/**
 * Calculate profit from sale
 * @param {number} salePrice - Price item sold for
 * @param {number} trueCost - True cost after adjustments
 * @returns {number} Profit
 */
export const calculateProfit = (salePrice, trueCost) => {
  return salePrice - trueCost;
};

/**
 * Calculate ROI percentage
 * @param {number} profit - Profit amount
 * @param {number} trueCost - True cost
 * @returns {number} ROI percentage
 */
export const calculateROI = (profit, trueCost) => {
  if (trueCost <= 0) return 0;
  return (profit / trueCost) * 100;
};

/**
 * Get vendor config with defaults
 * @param {string} vendorName - Name of vendor
 * @param {array} vendorConfigs - Array of vendor configs
 * @returns {object} Vendor config or defaults
 */
export const getVendorConfig = (vendorName, vendorConfigs = []) => {
  const found = vendorConfigs.find(v => v.name.toLowerCase() === vendorName.toLowerCase());
  return found || { name: vendorName, cashback_rate: 0, cost_multiplier: 1 };
};

/**
 * Format currency
 */
export const fmt$ = (v) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(parseFloat(v) || 0);

/**
 * Format percentage
 */
export const pct = (v) => `${Number(v || 0).toFixed(1)}%`;
