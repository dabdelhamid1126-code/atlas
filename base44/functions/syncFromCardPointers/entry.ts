import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CARDS = [
  {
    card_name: "American Express Platinum (Personal)",
    issuer: "American Express",
    annual_fee: 895,
    reward_type: "points",
    points_rate: 1,
    active: true,
    store_rates: [
      { store: "Flights (direct/AmexTravel)", rate: 5 },
      { store: "Hotels (AmexTravel)", rate: 5 },
      { store: "Dining", rate: 1 },
      { store: "Grocery", rate: 1 },
    ],
    benefits: JSON.stringify([
      { title: "Airline Fee Credit: $200", category: "travel", annual_value: 200, used_amount: 0, period: "year", notes: "Once per calendar year; enrollment required", expiration: "2026-12-31" },
      { title: "CLEAR Credit: $209", category: "travel", annual_value: 209, used_amount: 0, period: "year", notes: "Once per calendar year; pay for CLEAR with Platinum Card", expiration: "2026-12-31" },
      { title: "Global Entry Credit: $120", category: "travel", annual_value: 120, used_amount: 0, period: "4 years", notes: "Once every 4 years; Global Entry or TSA Pre-Check", expiration: null },
      { title: "Hotel Credit: $300", category: "hotel", annual_value: 300, used_amount: 0, period: "semi-annual", notes: "Once Jan-Jun, once Jul-Dec; Fine Hotels + Resorts or The Hotel Collection (2-night min)", expiration: "2026-06-30" },
      { title: "Equinox Credit: $300", category: "credit", annual_value: 300, used_amount: 0, period: "year", notes: "Once per year; Equinox+ or any Equinox club membership", expiration: "2026-12-31" },
      { title: "Oura Credit: $200", category: "credit", annual_value: 200, used_amount: 0, period: "year", notes: "Oura Ring through Ouraring.com. Enrollment required.", expiration: "2026-12-31" },
      { title: "Uber One Credit: $120", category: "dining", annual_value: 120, used_amount: 0, period: "year", notes: "Up to $120/year with auto-renewing Uber One membership", expiration: "2026-12-31" },
      { title: "Resy Credit: $100", category: "dining", annual_value: 100, used_amount: 0, period: "quarter", notes: "Once per quarter; Resy restaurants. Enrollment required.", expiration: "2026-06-30" },
      { title: "Lululemon Credit: $75", category: "credit", annual_value: 75, used_amount: 0, period: "quarter", notes: "Once per quarter; Lululemon stores or Lululemon.com", expiration: "2026-06-30" },
      { title: "Saks Fifth Avenue Credit: $50", category: "shopping", annual_value: 50, used_amount: 0, period: "semi-annual", notes: "Once Jan-Jun, once Jul-Dec; enrollment required", expiration: "2026-06-30" },
      { title: "Digital Entertainment Credit: $25", category: "shopping", annual_value: 25, used_amount: 0, period: "month", notes: "Monthly; Paramount+, YouTube, Disney+, ESPN+, Hulu, Peacock, NYTimes, WSJ", expiration: "2026-05-31" },
      { title: "Walmart+ Credit: $12.95", category: "credit", annual_value: 12.95, used_amount: 0, period: "month", notes: "Monthly; covers $12.95 Walmart+ membership", expiration: "2026-05-31" },
      { title: "Uber Cash: $15", category: "dining", annual_value: 15, used_amount: 0, period: "month", notes: "Monthly ($35 in December); Uber Eats or Uber rides", expiration: "2026-05-31" },
    ]),
  },
  {
    card_name: "Chase Sapphire Reserve",
    issuer: "Chase",
    annual_fee: 795,
    reward_type: "points",
    points_rate: 1,
    active: true,
    store_rates: [
      { store: "Chase Travel", rate: 8 },
      { store: "Dining", rate: 3 },
      { store: "Travel", rate: 3 },
      { store: "Lyft", rate: 5 },
    ],
    benefits: JSON.stringify([
      { title: "Travel Credit: $300", category: "travel", annual_value: 300, used_amount: 0, period: "year", notes: "Once per cardmember year; any travel purchases", expiration: "2027-05-02" },
      { title: "The Edit Credit: $250", category: "hotel", annual_value: 500, used_amount: 0, period: "semi-annual", notes: "$250 twice per year ($500 total) for The Edit prepaid bookings. 2-night min.", expiration: "2026-12-31" },
      { title: "Chase Travel Hotels Credit: $250", category: "hotel", annual_value: 250, used_amount: 0, period: "year", notes: "Select hotels booked through Chase Travel in 2026", expiration: "2026-12-31" },
      { title: "StubHub Credit: $150", category: "shopping", annual_value: 300, used_amount: 0, period: "semi-annual", notes: "$150 Jan-Jun + $150 Jul-Dec ($300/yr) for StubHub/viagogo. Activation required.", expiration: "2026-06-30" },
      { title: "Dining Credit: $150", category: "dining", annual_value: 300, used_amount: 0, period: "semi-annual", notes: "$150 Jan-Jun + $150 Jul-Dec at Sapphire Reserve Exclusive Tables restaurants", expiration: "2026-06-30" },
      { title: "Apple TV+ Subscription", category: "shopping", annual_value: 125, used_amount: 0, period: "year", notes: "Complimentary Apple TV+ subscription through June 22, 2027", expiration: "2027-06-22" },
      { title: "Apple Music Subscription", category: "shopping", annual_value: 125, used_amount: 0, period: "year", notes: "Complimentary Apple Music subscription through June 22, 2027", expiration: "2027-06-22" },
      { title: "Global Entry Credit: $120", category: "travel", annual_value: 120, used_amount: 0, period: "4 years", notes: "Once every 4 years; Global Entry, TSA Pre-Check, or NEXUS", expiration: null },
      { title: "DashPass Subscription: 1 Year", category: "dining", annual_value: 120, used_amount: 0, period: "year", notes: "Complimentary DashPass, $0 delivery fees through 12/31/2027", expiration: "2027-05-02" },
      { title: "Lyft Credit: $10/month", category: "travel", annual_value: 120, used_amount: 0, period: "month", notes: "$10/month Lyft in-app credit, up to $120/year through Sept 30, 2027", expiration: "2026-05-31" },
      { title: "Peloton Credit: $10/month", category: "credit", annual_value: 120, used_amount: 0, period: "month", notes: "$10/month on Peloton memberships through 12/31/2027. Activation required.", expiration: "2026-05-31" },
      { title: "DoorDash Credit: $5/month", category: "dining", annual_value: 60, used_amount: 0, period: "month", notes: "$5/month off restaurant orders on DoorDash", expiration: "2026-05-31" },
      { title: "WHOOP Credit: $359", category: "credit", annual_value: 359, used_amount: 0, period: "year", notes: "EXPIRES MAY 12! WHOOP Life Membership on whoop.com. Activate on Chase account first.", expiration: "2026-05-12" },
    ]),
  },
  {
    card_name: "Marriott Bonvoy Brilliant® American Express® Card",
    issuer: "American Express",
    annual_fee: 650,
    reward_type: "points",
    points_rate: 2,
    active: true,
    store_rates: [
      { store: "Marriott Hotels", rate: 6 },
      { store: "Dining", rate: 3 },
      { store: "Travel", rate: 3 },
    ],
    benefits: JSON.stringify([
      { title: "Marriott Free Night Award", category: "hotel", annual_value: 600, used_amount: 0, period: "year", notes: "1 Free Night Award annually (up to 85,000 Marriott Bonvoy pts) after card renewal month.", expiration: "2027-05-02" },
      { title: "On-Property Credit: $100", category: "hotel", annual_value: 100, used_amount: 0, period: "year", notes: "2-night minimum at Ritz-Carlton or St. Regis via direct booking special rate", expiration: "2026-12-31" },
      { title: "Global Entry Credit: $100", category: "travel", annual_value: 100, used_amount: 0, period: "4 years", notes: "Once every 4 years; Global Entry or TSA Pre-Check", expiration: null },
      { title: "Restaurant Credit: $25/month", category: "dining", annual_value: 300, used_amount: 0, period: "month", notes: "Up to $25/month ($300/yr) for eligible restaurant purchases worldwide", expiration: "2026-05-31" },
    ]),
  },
  {
    card_name: "Chase Freedom Flex",
    issuer: "Chase",
    annual_fee: 0,
    reward_type: "cashback",
    cashback_rate: 1,
    active: true,
    store_rates: [
      { store: "Chase Travel", rate: 5 },
      { store: "Dining", rate: 3 },
      { store: "Drugstore", rate: 3 },
      { store: "Lyft", rate: 2 },
      { store: "Amazon (Q2 2026 promo)", rate: 5 },
    ],
    benefits: JSON.stringify([
      { title: "5x Q2 2026: Amazon + Chase Travel", category: "cashback", annual_value: 75, used_amount: 0, period: "quarter", notes: "5% on up to $1,500 at Amazon, Chase Travel, Feeding America (Q2 2026). Requires activation.", expiration: "2026-06-30" },
      { title: "DoorDash Promo: $10", category: "dining", annual_value: 10, used_amount: 0, period: "quarter", notes: "Once per quarter; $10 off DoorDash grocery/convenience orders. Requires DashPass.", expiration: "2026-06-30" },
    ]),
  },
  {
    card_name: "Blue Cash Everyday® Card from American Express",
    issuer: "American Express",
    annual_fee: 0,
    reward_type: "cashback",
    cashback_rate: 1,
    active: true,
    store_rates: [
      { store: "US Supermarkets", rate: 3 },
      { store: "US Gas Stations", rate: 3 },
      { store: "US Online Retail", rate: 3 },
    ],
    benefits: JSON.stringify([
      { title: "Home Chef Credit: $15/month", category: "dining", annual_value: 180, used_amount: 0, period: "month", notes: "Up to $15/month ($180/yr) for Home Chef purchases online. Enrollment required.", expiration: "2026-05-31" },
      { title: "Disney Bundle Credit: $7/month", category: "shopping", annual_value: 84, used_amount: 0, period: "month", notes: "$7/month for The Disney Bundle (Disney+, Hulu, ESPN+). Enrollment required.", expiration: "2026-05-31" },
    ]),
  },
  {
    card_name: "Amazon Prime Visa",
    issuer: "Chase",
    annual_fee: 0,
    reward_type: "cashback",
    cashback_rate: 1,
    active: true,
    store_rates: [
      { store: "Amazon", rate: 5 },
      { store: "Whole Foods", rate: 5 },
      { store: "Woot", rate: 5 },
      { store: "Chase Travel", rate: 5 },
      { store: "Dining", rate: 2 },
      { store: "Gas", rate: 2 },
      { store: "Transit", rate: 2 },
    ],
    benefits: JSON.stringify([]),
  },
  {
    card_name: "Robinhood Gold Card",
    issuer: "Coastal Community Bank",
    annual_fee: 0,
    reward_type: "cashback",
    cashback_rate: 3,
    active: true,
    store_rates: [],
    benefits: JSON.stringify([]),
  },
  {
    card_name: "Apple Card",
    issuer: "Goldman Sachs",
    annual_fee: 0,
    reward_type: "cashback",
    cashback_rate: 1,
    active: true,
    store_rates: [
      { store: "Apple", rate: 3 },
      { store: "Nike", rate: 3 },
      { store: "Uber/UberEats", rate: 3 },
      { store: "Walgreens", rate: 3 },
      { store: "Ace Hardware", rate: 3 },
      { store: "Apple Pay", rate: 2 },
    ],
    benefits: JSON.stringify([
      { title: "5% Cash Back at Walgreens", category: "cashback", annual_value: 25, used_amount: 0, period: "year", notes: "EXPIRES MAY 20! 5% Daily Cash at Walgreens/Duane Reade via Apple Pay on up to $500.", expiration: "2026-05-20" },
    ]),
  },
  {
    card_name: "Discover it®",
    issuer: "Discover",
    annual_fee: 0,
    reward_type: "cashback",
    cashback_rate: 1,
    active: true,
    store_rates: [
      { store: "Restaurants (Q2 2026)", rate: 5 },
      { store: "Home Improvement (Q2 2026)", rate: 5 },
    ],
    benefits: JSON.stringify([
      { title: "5x Q2 2026: Restaurants + Home Improvement", category: "cashback", annual_value: 75, used_amount: 0, period: "quarter", notes: "5% on up to $1,500 at Restaurants and Home Improvement Stores (Q2 2026). Requires activation.", expiration: "2026-06-30" },
    ]),
  },
  {
    card_name: "Target RedCard (Visa)",
    issuer: "Target Bank",
    annual_fee: 0,
    reward_type: "cashback",
    cashback_rate: 5,
    active: true,
    store_rates: [
      { store: "Target", rate: 5 },
    ],
    benefits: JSON.stringify([]),
  },
  {
    card_name: "Capital One Quicksilver Cash Rewards Credit Card",
    issuer: "Capital One",
    annual_fee: 0,
    reward_type: "cashback",
    cashback_rate: 1.5,
    active: true,
    store_rates: [],
    benefits: JSON.stringify([]),
  },
  {
    card_name: "PayPal Cashback Mastercard",
    issuer: "Synchrony Bank",
    annual_fee: 0,
    reward_type: "cashback",
    cashback_rate: 3,
    active: true,
    store_rates: [
      { store: "PayPal", rate: 3 },
      { store: "Everything else", rate: 2 },
    ],
    benefits: JSON.stringify([]),
  },
  {
    card_name: "JetBlue Card from Barclays",
    issuer: "Barclays",
    annual_fee: 0,
    reward_type: "points",
    points_rate: 1,
    active: true,
    store_rates: [
      { store: "JetBlue", rate: 3 },
      { store: "Dining", rate: 2 },
      { store: "Groceries", rate: 2 },
    ],
    benefits: JSON.stringify([]),
  },
  {
    card_name: "The Amex EveryDay™ Credit Card from American Express",
    issuer: "American Express",
    annual_fee: 0,
    reward_type: "points",
    points_rate: 1,
    active: true,
    store_rates: [
      { store: "US Supermarkets", rate: 2 },
      { store: "AmexTravel", rate: 2 },
    ],
    benefits: JSON.stringify([]),
  },
  {
    card_name: "Chase Slate® (Visa)",
    issuer: "Chase",
    annual_fee: 0,
    reward_type: "cashback",
    cashback_rate: 0,
    active: true,
    store_rates: [],
    benefits: JSON.stringify([
      { title: "DoorDash Promo: $10", category: "dining", annual_value: 10, used_amount: 0, period: "quarter", notes: "Once per quarter; $10 off DoorDash grocery/convenience orders. Requires DashPass.", expiration: "2026-06-30" },
    ]),
  },
  {
    card_name: "Credit One Bank® Platinum Card",
    issuer: "CreditOne Bank",
    annual_fee: 35,
    reward_type: "cashback",
    cashback_rate: 1,
    active: true,
    store_rates: [],
    benefits: JSON.stringify([]),
  },
  {
    card_name: "PayPal Credit",
    issuer: "PayPal",
    annual_fee: 0,
    reward_type: "cashback",
    cashback_rate: 0,
    active: true,
    store_rates: [],
    benefits: JSON.stringify([]),
  },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all existing cards for this user
    const existingCards = await base44.entities.CreditCard.list();
    const existingByName = {};
    for (const card of existingCards) {
      existingByName[card.card_name] = card;
    }

    let created = 0;
    let updated = 0;
    const errors = [];

    for (const cardData of CARDS) {
      try {
        const existing = existingByName[cardData.card_name];
        if (existing) {
          await base44.entities.CreditCard.update(existing.id, cardData);
          updated++;
        } else {
          await base44.entities.CreditCard.create(cardData);
          created++;
        }
      } catch (err) {
        errors.push({ card: cardData.card_name, error: err.message });
      }
    }

    return Response.json({
      success: true,
      summary: { created, updated, errors_count: errors.length },
      errors,
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });

  } catch (error) {
    return Response.json({ error: error.message }, {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
});