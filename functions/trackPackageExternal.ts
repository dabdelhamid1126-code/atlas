import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { tracking_number, carrier } = await req.json();

    if (!tracking_number) {
      return Response.json({ error: 'tracking_number is required' }, { status: 400 });
    }

    // Build query params
    const params = new URLSearchParams({ TrackingNumber: tracking_number });
    if (carrier) params.append('Carrier', carrier);

    const response = await fetch(`https://trackingpackage.p.rapidapi.com/TrackingPackage?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic Ym9sZGNoYXQ6TGZYfm0zY2d1QzkuKz9SLw==',
        'Content-Type': 'application/json',
        'x-rapidapi-host': 'trackingpackage.p.rapidapi.com',
        'x-rapidapi-key': '634588b8f5msh33828ed8aac926fp14d015jsnf838b3096c8a',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json({ error: `API error: ${response.status}`, details: errorText }, { status: 502 });
    }

    const data = await response.json();

    // Normalize response into our tracking format
    // The API may return events in various formats — we map to our standard structure
    const events = [];
    const rawEvents = data?.events || data?.TrackingEvents || data?.tracking_events || data?.checkpoints || [];

    for (const ev of rawEvents) {
      const statusRaw = (ev.status || ev.Status || ev.event_type || '').toLowerCase();
      let status = 'In Transit';
      if (statusRaw.includes('delivered')) status = 'Delivered';
      else if (statusRaw.includes('out for delivery') || statusRaw.includes('out_for_delivery')) status = 'Out for Delivery';
      else if (statusRaw.includes('exception') || statusRaw.includes('failed') || statusRaw.includes('alert')) status = 'Exception';
      else if (statusRaw.includes('pending') || statusRaw.includes('pre-shipment') || statusRaw.includes('label')) status = 'Pending';

      events.push({
        status,
        location: ev.location || ev.Location || ev.city || '',
        description: ev.description || ev.Description || ev.event_description || ev.message || statusRaw,
        event_datetime: ev.datetime || ev.Datetime || ev.timestamp || ev.occurred_at || ev.date || new Date().toISOString(),
      });
    }

    // Determine current status from latest event or top-level status field
    const topStatus = data?.status || data?.Status || data?.current_status || '';
    let currentStatus = 'In Transit';
    const ts = topStatus.toLowerCase();
    if (ts.includes('delivered')) currentStatus = 'Delivered';
    else if (ts.includes('out for delivery') || ts.includes('out_for_delivery')) currentStatus = 'Out for Delivery';
    else if (ts.includes('exception') || ts.includes('failed')) currentStatus = 'Exception';
    else if (ts.includes('pending') || ts.includes('pre')) currentStatus = 'Pending';
    else if (events.length > 0) currentStatus = events[0].status;

    const estimatedDelivery = data?.estimated_delivery || data?.EstimatedDelivery || data?.expected_delivery || null;

    return Response.json({
      tracking_number,
      current_status: currentStatus,
      estimated_delivery: estimatedDelivery,
      events,
      raw: data,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});