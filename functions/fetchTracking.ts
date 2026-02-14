import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { tracking_number, carrier } = await req.json();

        if (!tracking_number) {
            return Response.json({ 
                error: 'Tracking number is required' 
            }, { status: 400 });
        }

        const apiKey = Deno.env.get('TRACKINGMORE_API_KEY');
        if (!apiKey) {
            return Response.json({ 
                error: 'TrackingMore API key not configured' 
            }, { status: 500 });
        }

        // Call TrackingMore API
        const url = `https://api.trackingmore.com/v4/trackings/get?tracking_number=${tracking_number}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Tracking-Api-Key': apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return Response.json({ 
                error: errorData.message || `TrackingMore API error: ${response.status}`,
                details: errorData
            }, { status: response.status });
        }

        const data = await response.json();
        
        // Extract tracking info from response
        if (!data.data || !data.data.tracking_number) {
            return Response.json({ 
                error: 'No tracking information found for this number' 
            }, { status: 404 });
        }

        const trackingInfo = data.data;
        
        // Get the latest event for current location
        const latestEvent = trackingInfo.latest_event || {};
        
        return Response.json({
            carrier: trackingInfo.carrier_code || carrier || 'Unknown',
            status: trackingInfo.delivery_status || trackingInfo.substatus || 'Unknown',
            current_location: latestEvent.location || trackingInfo.origin_country || 'N/A',
            delivered_date: trackingInfo.delivered_date || null,
            latest_update: latestEvent.description || latestEvent.stage || 'No updates available',
            tracking_number: trackingInfo.tracking_number
        });

    } catch (error) {
        console.error('fetchTracking error:', error);
        return Response.json({ 
            error: 'Failed to fetch tracking information',
            details: error.message 
        }, { status: 500 });
    }
});