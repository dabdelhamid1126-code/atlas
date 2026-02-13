/**
 * Get live tracking information from TrackingMore API
 * @param {string} tracking_number - The tracking number to look up
 * @param {string} carrier - Optional carrier code (fedex, ups, usps, etc.)
 * @returns {object} Tracking information including status, location, and delivery details
 */
export default async function getTrackingInfo({ tracking_number, carrier }) {
  const apiKey = process.env.TRACKINGMORE_API_KEY;
  
  if (!apiKey) {
    throw new Error('TRACKINGMORE_API_KEY not configured');
  }
  
  if (!tracking_number) {
    throw new Error('tracking_number is required');
  }
  
  try {
    const url = `https://api.trackingmore.com/v4/trackings/get?tracking_number=${tracking_number}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Tracking-Api-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`TrackingMore API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return {
        success: false,
        error: 'No tracking information found'
      };
    }
    
    const trackingData = data.data[0];
    const latestEvent = trackingData.origin_info?.trackinfo?.[0];
    
    return {
      success: true,
      carrier: trackingData.carrier_code?.toUpperCase() || carrier?.toUpperCase() || 'UNKNOWN',
      status: trackingData.delivery_status || trackingData.substatus || 'unknown',
      location: latestEvent?.checkpoint_delivery_location || 'Unknown location',
      delivered_date: trackingData.delivered_date || null,
      estimated_delivery: trackingData.estimated_delivery_date || null,
      latest_update: latestEvent?.checkpoint_status || 'No recent updates',
      last_scan_date: latestEvent?.checkpoint_date || null,
      tracking_number: tracking_number
    };
  } catch (error) {
    console.error('Tracking error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch tracking information'
    };
  }
}