import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
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
        const courierCode = carrier ? carrier.toLowerCase() : 'ups';
        console.log(`Using courier code: ${courierCode}`);

        // Use Realtime Query API for instant results
        const realtimeUrl = 'https://api.trackingmore.com/v4/trackings/realtime';
        console.log(`Calling Realtime API: ${realtimeUrl}`);
        
        const requestBody = {
            tracking_number: tracking_number,
            courier_code: courierCode
        };
        console.log(`Request body:`, JSON.stringify(requestBody, null, 2));
        
        const response = await fetch(realtimeUrl, {
            method: 'POST',
            headers: {
                'Tracking-Api-Key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
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
                error: 'Tracking information not available yet. The package may not be in transit.',
                received: data
            }, { status: 404 });
        }

        const trackingInfo = data.data;
        console.log(`Tracking info:`, JSON.stringify(trackingInfo, null, 2));
        
        if (!trackingInfo) {
            console.log('Error: No tracking data');
            return Response.json({ 
                error: 'No tracking information found for this package',
                received: data
            }, { status: 404 });
        }

        // Get latest tracking event from origin_info.trackinfo array
        const trackingEvents = trackingInfo.origin_info?.trackinfo || [];
        const latestEvent = trackingEvents.length > 0 ? trackingEvents[0] : null;
        
        // Extract tracking details
        const currentLocation = latestEvent?.Details || 'N/A';
        const latestUpdate = latestEvent?.StatusDescription || 'No updates available';
        
        // Find delivered date if status is delivered
        let deliveredDate = null;
        if (trackingInfo.delivery_status === 'delivered') {
            const deliveredEvent = trackingEvents.find(e => 
                e.StatusDescription?.toLowerCase().includes('delivered')
            );
            deliveredDate = deliveredEvent?.Date || null;
        }
        
        const result = {
            carrier: (trackingInfo.courier_code || carrier || 'unknown').toUpperCase(),
            status: trackingInfo.delivery_status || 'pending',
            current_location: currentLocation,
            delivered_date: deliveredDate,
            latest_update: latestUpdate,
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