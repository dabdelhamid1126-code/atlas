import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const apiKey = Deno.env.get('PARCELSAPP_API_KEY');
    
    if (!apiKey) {
      return Response.json({ 
        success: false,
        error: 'PARCELSAPP_API_KEY not configured in app secrets'
      }, { status: 500 });
    }
    
    const { tracking_number, carrier } = await req.json();
    
    if (!tracking_number) {
      return Response.json({ 
        success: false,
        error: 'tracking_number is required'
      }, { status: 400 });
    }
    
    // Call ParcelsApp API
    const url = 'https://parcelsapp.com/api/v3/shipments/tracking';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        trackingId: tracking_number,
        language: 'en'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('ParcelsApp API error:', response.status, errorText);
      return Response.json({ 
        success: false,
        error: `ParcelsApp API error: ${response.status}` 
      }, { status: 500 });
    }
    
    const data = await response.json();
    
    if (!data || !data.trackingId) {
      return Response.json({
        success: false,
        error: 'No tracking information found for this tracking number'
      }, { status: 404 });
    }
    
    const latestCheckpoint = data.checkpoints && data.checkpoints.length > 0 
      ? data.checkpoints[data.checkpoints.length - 1] 
      : null;
    
    return Response.json({
      success: true,
      carrier: data.courier?.name || carrier?.toUpperCase() || 'UNKNOWN',
      status: data.status || 'unknown',
      location: latestCheckpoint?.location || 'Unknown location',
      delivered_date: data.deliveredAt || null,
      estimated_delivery: data.eta || null,
      latest_update: latestCheckpoint?.message || 'No recent updates',
      last_scan_date: latestCheckpoint?.date || null,
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