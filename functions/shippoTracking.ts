import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { tracking_number, carrier } = await req.json();

        if (!tracking_number || !carrier) {
            return Response.json({ error: 'tracking_number and carrier are required' }, { status: 400 });
        }

        const apiKey = Deno.env.get('SHIPPO_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'Shippo API key not configured' }, { status: 500 });
        }

        const response = await fetch(
            `https://api.goshippo.com/tracks/${carrier.toLowerCase()}/${tracking_number}`,
            {
                headers: {
                    'Authorization': `ShippoToken ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return Response.json({ error: data.detail || 'Failed to fetch tracking from Shippo' }, { status: response.status });
        }

        // Map tracking events
        const events = (data.tracking_history || []).map(event => ({
            status: event.status,
            status_details: event.status_details,
            location: [event.location?.city, event.location?.state, event.location?.country]
                .filter(Boolean).join(', ') || 'N/A',
            date: event.status_date
        }));

        return Response.json({
            tracking_number: data.tracking_number,
            carrier: carrier.toUpperCase(),
            status: data.tracking_status?.status || 'UNKNOWN',
            status_details: data.tracking_status?.status_details || '',
            eta: data.eta,
            current_location: [
                data.tracking_status?.location?.city,
                data.tracking_status?.location?.state,
                data.tracking_status?.location?.country
            ].filter(Boolean).join(', ') || null,
            address_from: data.address_from ? [
                data.address_from.city,
                data.address_from.state,
                data.address_from.country
            ].filter(Boolean).join(', ') : null,
            address_to: data.address_to ? [
                data.address_to.city,
                data.address_to.state,
                data.address_to.country
            ].filter(Boolean).join(', ') : null,
            events
        });

    } catch (error) {
        return Response.json({
            error: 'Failed to fetch tracking information',
            details: error.message
        }, { status: 500 });
    }
});