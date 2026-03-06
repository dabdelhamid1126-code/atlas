import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
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

        // Step 1: Create tracking (or get existing)
        const createUrl = 'https://api.trackingmore.com/v4/trackings/create';
        console.log(`Creating/updating tracking: ${createUrl}`);
        
        const createBody = {
            tracking_number: tracking_number,
            courier_code: courierCode
        };
        console.log(`Create request body:`, JSON.stringify(createBody, null, 2));
        
        const createResponse = await fetch(createUrl, {
            method: 'POST',
            headers: {
                'Tracking-Api-Key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(createBody)
        });

        const createResponseText = await createResponse.text();
        console.log(`Create API response: ${createResponseText}`);
        
        let createData;
        try {
            createData = JSON.parse(createResponseText);
        } catch (e) {
            console.error('Failed to parse create response:', e);
        }

        // Step 2: Get tracking details
        const url = `https://api.trackingmore.com/v4/trackings/get?tracking_numbers=${tracking_number}`;
        console.log(`Getting tracking details: ${url}`);
        
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

        // data.data is an array, get the first item
        const trackingInfo = Array.isArray(data.data) ? data.data[0] : data.data;
        console.log(`Tracking info extracted:`, JSON.stringify(trackingInfo, null, 2));
        
        if (!trackingInfo) {
            console.log('Error: No tracking data in array');
            return Response.json({ 
                error: 'No tracking information found',
                received: data
            }, { status: 404 });
        }

        // Parse latest_event string (format: "event,location,date")
        const latestEventStr = trackingInfo.latest_event || '';
        const eventParts = latestEventStr.split(',');
        const eventDescription = eventParts[0] || 'No updates available';
        const eventLocation = eventParts[1] || 'N/A';
        
        // Get delivery date from origin_info.milestone_date
        const milestoneDate = trackingInfo.origin_info?.milestone_date;
        const deliveryDate = milestoneDate?.delivery_date || null;
        
        const result = {
            carrier: (trackingInfo.courier_code || carrier || 'unknown').toUpperCase(),
            status: trackingInfo.delivery_status || 'unknown',
            current_location: eventLocation.trim(),
            delivered_date: deliveryDate ? deliveryDate.split('T')[0] : null,
            latest_update: eventDescription.trim(),
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