import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            console.log('Unauthorized access attempt');
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { tracking_number, carrier } = await req.json();
        console.log(`fetchTracking called with tracking_number: ${tracking_number}, carrier: ${carrier}`);

        if (!tracking_number) {
            console.log('Error: Tracking number not provided');
            return Response.json({ 
                error: 'Tracking number is required' 
            }, { status: 400 });
        }

        const apiKey = Deno.env.get('TRACKINGMORE_API_KEY');
        console.log(`API key found: ${!!apiKey}`);
        
        if (!apiKey) {
            console.log('Error: TRACKINGMORE_API_KEY not set');
            return Response.json({ 
                error: 'TrackingMore API key not configured' 
            }, { status: 500 });
        }

        // Convert carrier to lowercase courier code
        const courierCode = carrier ? carrier.toLowerCase() : 'fedex';
        console.log(`Using courier code: ${courierCode}`);

        // Call TrackingMore API - GET single tracking
        const url = `https://api.trackingmore.com/v4/trackings/get?courier_code=${courierCode}&tracking_number=${tracking_number}`;
        console.log(`Calling TrackingMore API: ${url}`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Tracking-Api-Key': apiKey,
                'Content-Type': 'application/json'
            }
        });

        console.log(`API response status: ${response.status}`);

        const responseText = await response.text();
        console.log(`API raw response: ${responseText}`);

        let data;
        try {
            data = JSON.parse(responseText);
            console.log(`API parsed response:`, JSON.stringify(data, null, 2));
        } catch (parseError) {
            console.error(`Failed to parse API response:`, parseError.message);
            return Response.json({ 
                error: 'Invalid response from TrackingMore API',
                details: responseText
            }, { status: 500 });
        }

        if (!response.ok) {
            console.log(`API error response:`, JSON.stringify(data, null, 2));
            return Response.json({ 
                error: data.message || data.error || `TrackingMore API error: ${response.status}`,
                details: data
            }, { status: response.status });
        }

        // Check if data exists and has tracking info
        if (!data || typeof data !== 'object') {
            console.log('Error: Invalid data structure - data is not an object');
            return Response.json({ 
                error: 'Invalid response structure from TrackingMore API',
                received: data
            }, { status: 500 });
        }

        if (!data.data) {
            console.log('Error: data.data is missing from response');
            return Response.json({ 
                error: 'No tracking data in API response',
                received: data
            }, { status: 404 });
        }

        const trackingInfo = data.data;
        console.log(`Tracking info extracted:`, JSON.stringify(trackingInfo, null, 2));
        
        // Extract latest status and event based on TrackingMore API structure
        const latestStatus = trackingInfo.latest_status || {};
        const latestEvent = trackingInfo.latest_event || {};
        
        const result = {
            carrier: trackingInfo.courier_code || carrier || 'Unknown',
            status: latestStatus.status || trackingInfo.delivery_status || 'Unknown',
            current_location: latestEvent.location || 'N/A',
            delivered_date: trackingInfo.delivered_date || null,
            latest_update: latestEvent.description || latestEvent.status || 'No updates available',
            tracking_number: trackingInfo.tracking_number || tracking_number
        };
        
        console.log(`Returning result:`, JSON.stringify(result, null, 2));
        return Response.json(result);

    } catch (error) {
        console.error('fetchTracking FATAL ERROR:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        return Response.json({ 
            error: 'Failed to fetch tracking information',
            details: error.message,
            errorType: error.name
        }, { status: 500 });
    }
});