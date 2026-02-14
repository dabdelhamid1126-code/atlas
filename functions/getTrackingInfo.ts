import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const apiKey = Deno.env.get('TRACKINGMORE_API_KEY');
    
    if (!apiKey) {
      return Response.json({ 
        success: false,
        error: 'TRACKINGMORE_API_KEY not configured in app secrets'
      }, { status: 500 });
    }
    
    const { tracking_number, carrier } = await req.json();
    
    if (!tracking_number) {
      return Response.json({ 
        success: false,
        error: 'tracking_number is required'
      }, { status: 400 });
    }
    
    // Call TrackingMore API - create tracking first, then get it
    const createUrl = 'https://api.trackingmore.com/v4/trackings/create';
    
    // Try to create/register the tracking
    await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Tracking-Api-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tracking_number: tracking_number,
        carrier_code: carrier?.toLowerCase() || 'auto'
      })
    });
    
    // Now fetch the tracking info
    const url = `https://api.trackingmore.com/v4/trackings/get?tracking_numbers=${encodeURIComponent(tracking_number)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Tracking-Api-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('TrackingMore API error:', response.status, errorText);
      return Response.json({ 
        success: false,
        error: `TrackingMore API error: ${response.status}` 
      }, { status: 500 });
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return Response.json({
        success: false,
        error: 'No tracking information found for this tracking number'
      }, { status: 404 });
    }
    
    const trackingData = data.data[0];
    const latestEvent = trackingData.origin_info?.trackinfo?.[0];
    
    return Response.json({
      success: true,
      carrier: trackingData.carrier_code?.toUpperCase() || carrier?.toUpperCase() || 'UNKNOWN',
      status: trackingData.delivery_status || trackingData.substatus || 'unknown',
      location: latestEvent?.checkpoint_delivery_location || latestEvent?.checkpoint_delivery_city || 'Unknown location',
      delivered_date: trackingData.delivered_date || null,
      estimated_delivery: trackingData.estimated_delivery_date || null,
      latest_update: latestEvent?.checkpoint_status || 'No recent updates',
      last_scan_date: latestEvent?.checkpoint_date || null,
      tracking_number: tracking_number
    });
    
  } catch (error) {
    console.error('getTrackingInfo error:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Failed to fetch tracking information'
    }, { status: 500 });
  }
});