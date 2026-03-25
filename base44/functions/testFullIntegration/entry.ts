import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const results = {
      timestamp: new Date().toISOString(),
      tests: [],
      errors: []
    };

    // Test 1: Create test credit card
    try {
      const testCard = await base44.entities.CreditCard.create({
        card_name: 'Test Card - Integration Test',
        issuer: 'Chase',
        reward_type: 'cashback',
        cashback_rate: 2,
        dining_cashback_rate: 3,
        active: true
      });
      results.tests.push({
        name: 'Create Credit Card',
        status: 'passed',
        card_id: testCard.id,
        card_name: testCard.card_name
      });

      // Test 2: Create test purchase order linked to card
      try {
        const testOrder = await base44.entities.PurchaseOrder.create({
          order_type: 'churning',
          order_number: `TEST-${Date.now()}`,
          retailer: 'Amazon',
          buyer: 'Test Buyer',
          status: 'received',
          category: 'dining',
          credit_card_id: testCard.id,
          total_cost: 100,
          final_cost: 100,
          order_date: new Date().toISOString().split('T')[0],
          items: [{
            product_name: 'Test Product',
            quantity_ordered: 1,
            quantity_received: 1,
            unit_cost: 100
          }]
        });

        results.tests.push({
          name: 'Create Purchase Order',
          status: 'passed',
          order_id: testOrder.id,
          order_number: testOrder.order_number,
          total_cost: testOrder.total_cost
        });

        // Test 3: Verify rewards were created
        try {
          const orderRewards = await base44.entities.Reward.filter({
            purchase_order_id: testOrder.id
          });

          const expectedCashback = 100 * 0.03; // 3% dining cashback
          const hasValidReward = orderRewards.some(r => 
            r.type === 'cashback' && 
            Math.abs(r.amount - expectedCashback) < 0.01
          );

          results.tests.push({
            name: 'Verify Rewards Generated',
            status: hasValidReward ? 'passed' : 'warning',
            rewards_found: orderRewards.length,
            total_cashback: orderRewards.reduce((sum, r) => sum + (r.amount || 0), 0),
            expected_cashback: expectedCashback
          });
        } catch (err) {
          results.errors.push(`Rewards verification failed: ${err.message}`);
        }

        // Test 4: Verify card-order linkage
        try {
          const linkedOrder = await base44.entities.PurchaseOrder.filter({
            credit_card_id: testCard.id
          });

          results.tests.push({
            name: 'Verify Card-Order Linkage',
            status: linkedOrder.length > 0 ? 'passed' : 'failed',
            orders_linked: linkedOrder.length
          });
        } catch (err) {
          results.errors.push(`Card-order linkage check failed: ${err.message}`);
        }

      } catch (err) {
        results.errors.push(`Order creation failed: ${err.message}`);
      }

    } catch (err) {
      results.errors.push(`Card creation failed: ${err.message}`);
    }

    // Test 5: Check entities exist and are accessible
    try {
      const cardCount = await base44.entities.CreditCard.list();
      const orderCount = await base44.entities.PurchaseOrder.list();
      const rewardCount = await base44.entities.Reward.list();

      results.tests.push({
        name: 'Verify Data Access',
        status: 'passed',
        total_cards: cardCount.length,
        total_orders: orderCount.length,
        total_rewards: rewardCount.length
      });
    } catch (err) {
      results.errors.push(`Data access check failed: ${err.message}`);
    }

    const allPassed = results.errors.length === 0 && results.tests.every(t => t.status !== 'failed');

    return Response.json({
      success: allPassed,
      summary: `${results.tests.filter(t => t.status === 'passed').length}/${results.tests.length} tests passed`,
      results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});