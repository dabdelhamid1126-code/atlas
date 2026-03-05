import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { tracking_number, carrier } = await req.json();

        if (!tracking_number) {
            return Response.json({ error: 'Tracking number is required' }, { status: 400 });
        }

        const apiKey = Deno.env.get('TRACKINGMORE_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'TrackingMore API key not configured' }, { status: 500 });
        }

        const courierCode = carrier ? carrier.toLowerCase() : 'auto';

        // Create/register tracking
        await fetch('https://api.trackingmore.com/v4/trackings/create', {
            method: 'POST',
            headers: {
                'Tracking-Api-Key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tracking_number, courier_code: courierCode })
        });

        // Fetch tracking details
        const response = await fetch(`https://api.trackingmore.com/v4/trackings/get?tracking_numbers=${tracking_number}`, {
            headers: {
                'Tracking-Api-Key': apiKey,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok || !data.data) {
            return Response.json({ error: data.message || 'Failed to fetch tracking' }, { status: response.status });
        }

        const trackingInfo = Array.isArray(data.data) ? data.data[0] : data.data;
        if (!trackingInfo) {
            return Response.json({ error: 'No tracking information found' }, { status: 404 });
        }

        const latestEventStr = trackingInfo.latest_event || '';
        const eventParts = latestEventStr.split(',');
        const eventDescription = eventParts[0]?.trim() || 'No updates available';
        const eventLocation = eventParts[1]?.trim() || 'N/A';

        const deliveryDate = trackingInfo.origin_info?.milestone_date?.delivery_date || null;

        return Response.json({
            carrier: (trackingInfo.courier_code || carrier || 'unknown').toUpperCase(),
            status: trackingInfo.delivery_status || 'unknown',
            current_location: eventLocation,
            delivered_date: deliveryDate ? deliveryDate.split('T')[0] : null,
            latest_update: eventDescription,
            tracking_number: trackingInfo.tracking_number || tracking_number
        });

    } catch (error) {
        return Response.json({ 
            error: 'Failed to fetch tracking information',
            details: error.message
        }, { status: 500 });
    }
});