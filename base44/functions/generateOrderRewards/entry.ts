import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This is an entity automation — validate it's coming from the platform (no user session)
    // by verifying the payload has the expected structure
    const body = await req.json();
    const { event, data } = body;

    if (!event || !data) {
      return Response.json({ error: 'Invalid automation payload' }, { status: 400 });
    }

    if (event.type !== 'create' || event.entity_name !== 'PurchaseOrder') {
      return Response.json({ skipped: true, reason: 'Not a PurchaseOrder create event' });
    }

    const order = data;

    // Only generate rewards if order has a credit card and total cost
    if (!order.credit_card_id || !order.total_cost) {
      return Response.json({ skipped: true, reason: 'Missing credit_card_id or total_cost' });
    }

    // Fetch the credit card
    const cards = await base44.asServiceRole.entities.CreditCard.filter({
      id: order.credit_card_id
    });
    
    if (!cards.length) {
      return Response.json({ error: 'Credit card not found' }, { status: 404 });
    }

    const card = cards[0];

    // Calculate reward base amount
    const baseAmount = order.final_cost || order.total_cost;
    const category = order.category || 'other';

    // Get category-specific rates
    let pointsMultiplier = card.points_rate || 1;
    let cashbackRate = card.cashback_rate || 0;

    if (category === 'dining') {
      if (card.dining_points_rate) pointsMultiplier = card.dining_points_rate;
      if (card.dining_cashback_rate) cashbackRate = card.dining_cashback_rate;
    } else if (category === 'travel') {
      if (card.travel_points_rate) pointsMultiplier = card.travel_points_rate;
      if (card.travel_cashback_rate) cashbackRate = card.travel_cashback_rate;
    } else if (category === 'groceries') {
      if (card.groceries_points_rate) pointsMultiplier = card.groceries_points_rate;
      if (card.groceries_cashback_rate) cashbackRate = card.groceries_cashback_rate;
    } else if (category === 'gas') {
      if (card.gas_points_rate) pointsMultiplier = card.gas_points_rate;
      if (card.gas_cashback_rate) cashbackRate = card.gas_cashback_rate;
    } else if (category === 'streaming') {
      if (card.streaming_points_rate) pointsMultiplier = card.streaming_points_rate;
      if (card.streaming_cashback_rate) cashbackRate = card.streaming_cashback_rate;
    }

    const rewardsCreated = [];

    // Base card reward
    if (card.reward_type === 'cashback' && cashbackRate > 0) {
      const amount = parseFloat((baseAmount * cashbackRate / 100).toFixed(2));
      if (amount > 0) {
        const reward = await base44.asServiceRole.entities.Reward.create({
          credit_card_id: order.credit_card_id,
          card_name: card.card_name,
          source: card.card_name,
          type: 'cashback',
          currency: 'USD',
          purchase_amount: baseAmount,
          amount: amount,
          purchase_order_id: order.id,
          order_number: order.order_number,
          date_earned: order.order_date,
          status: order.status === 'received' ? 'earned' : 'pending',
          notes: `Auto-generated from order ${order.order_number}`
        });
        rewardsCreated.push(reward);
      }
    } else if (card.reward_type === 'points' && pointsMultiplier > 0) {
      const amount = Math.round(baseAmount * pointsMultiplier);
      if (amount > 0) {
        const reward = await base44.asServiceRole.entities.Reward.create({
          credit_card_id: order.credit_card_id,
          card_name: card.card_name,
          source: card.card_name,
          type: 'points',
          currency: 'points',
          purchase_amount: baseAmount,
          amount: amount,
          purchase_order_id: order.id,
          order_number: order.order_number,
          date_earned: order.order_date,
          status: order.status === 'received' ? 'earned' : 'pending',
          notes: `Auto-generated from order ${order.order_number}`
        });
        rewardsCreated.push(reward);
      }
    } else if (card.reward_type === 'both') {
      if (cashbackRate > 0) {
        const amount = parseFloat((baseAmount * cashbackRate / 100).toFixed(2));
        if (amount > 0) {
          const reward = await base44.asServiceRole.entities.Reward.create({
            credit_card_id: order.credit_card_id,
            card_name: card.card_name,
            source: card.card_name,
            type: 'cashback',
            currency: 'USD',
            purchase_amount: baseAmount,
            amount: amount,
            purchase_order_id: order.id,
            order_number: order.order_number,
            date_earned: order.order_date,
            status: order.status === 'received' ? 'earned' : 'pending',
            notes: `Auto-generated from order ${order.order_number}`
          });
          rewardsCreated.push(reward);
        }
      } else if (pointsMultiplier > 0) {
        const amount = Math.round(baseAmount * pointsMultiplier);
        if (amount > 0) {
          const reward = await base44.asServiceRole.entities.Reward.create({
            credit_card_id: order.credit_card_id,
            card_name: card.card_name,
            source: card.card_name,
            type: 'points',
            currency: 'points',
            purchase_amount: baseAmount,
            amount: amount,
            purchase_order_id: order.id,
            order_number: order.order_number,
            date_earned: order.order_date,
            status: order.status === 'received' ? 'earned' : 'pending',
            notes: `Auto-generated from order ${order.order_number}`
          });
          rewardsCreated.push(reward);
        }
      }
    }

    // Extra cashback %
    if (order.extra_cashback_percent > 0) {
      const amount = parseFloat((baseAmount * order.extra_cashback_percent / 100).toFixed(2));
      if (amount > 0) {
        const reward = await base44.asServiceRole.entities.Reward.create({
          credit_card_id: order.credit_card_id,
          card_name: card.card_name,
          source: card.card_name,
          type: 'cashback',
          currency: 'USD',
          purchase_amount: baseAmount,
          amount: amount,
          purchase_order_id: order.id,
          order_number: order.order_number,
          date_earned: order.order_date,
          status: order.status === 'received' ? 'earned' : 'pending',
          notes: `Extra ${order.extra_cashback_percent}% cashback from order ${order.order_number}`
        });
        rewardsCreated.push(reward);
      }
    }

    // Bonus amount
    if (order.bonus_amount > 0) {
      const isPrimeYoungAdult = order.bonus_notes?.toLowerCase().includes('prime young adult');
      const reward = await base44.asServiceRole.entities.Reward.create({
        credit_card_id: order.credit_card_id,
        card_name: card.card_name,
        source: card.card_name,
        type: isPrimeYoungAdult ? 'cashback' : 'loyalty_rewards',
        currency: isPrimeYoungAdult ? 'USD' : 'points',
        purchase_amount: baseAmount,
        amount: order.bonus_amount,
        purchase_order_id: order.id,
        order_number: order.order_number,
        date_earned: order.order_date,
        status: order.status === 'received' ? 'earned' : 'pending',
        notes: order.bonus_notes || `Bonus from order ${order.order_number}`
      });
      rewardsCreated.push(reward);
    }

    return Response.json({
      success: true,
      order_id: order.id,
      rewards_created: rewardsCreated.length,
      total_value: rewardsCreated.reduce((sum, r) => sum + (r.amount || 0), 0)
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});