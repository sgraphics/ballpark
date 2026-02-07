import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

const DEMO_LISTINGS = [
  {
    title: 'Vintage Leather Jacket',
    description: 'Classic 1980s leather jacket in excellent condition. Genuine leather with minimal wear.',
    category: 'clothing',
    structured: { size: 'M', gender: 'unisex', brand: 'Unknown', condition: 'Good' },
    ask_price: 450,
    condition_notes: [
      { issue: 'Minor shoulder wear', confidence: 'medium' },
      { issue: 'Original zippers intact', confidence: 'high' },
    ],
    haggling_ammo: ['Small scuff on left sleeve', 'Original care tags present'],
    image_urls: ['https://images.pexels.com/photos/1124468/pexels-photo-1124468.jpeg?auto=compress&cs=tinysrgb&w=800'],
  },
  {
    title: 'MacBook Pro 16" M2 Pro',
    description: 'Late 2023 model with M2 Pro chip. 16GB RAM, 512GB SSD. Excellent condition with AppleCare+.',
    category: 'electronics',
    structured: { brand: 'Apple', model: 'MacBook Pro 16"', year: 2023, storage: '512GB', condition: 'Excellent' },
    ask_price: 1800,
    condition_notes: [
      { issue: 'Battery health 95%', confidence: 'high' },
      { issue: 'No visible scratches', confidence: 'high' },
    ],
    haggling_ammo: ['One small dent on corner', 'Original box and charger included'],
    image_urls: ['https://images.pexels.com/photos/303383/pexels-photo-303383.jpeg?auto=compress&cs=tinysrgb&w=800'],
  },
  {
    title: 'Mid-Century Modern Desk',
    description: 'Beautiful walnut desk from the 1960s. Solid construction with two drawers.',
    category: 'furniture',
    structured: { style: 'Mid-Century Modern', material: 'Walnut', dimensions: '60x30x30', condition: 'Good' },
    ask_price: 650,
    condition_notes: [
      { issue: 'Some wear on top surface', confidence: 'medium' },
      { issue: 'Drawers slide smoothly', confidence: 'high' },
    ],
    haggling_ammo: ['Water ring marks on surface', 'Original hardware'],
    image_urls: ['https://images.pexels.com/photos/2451264/pexels-photo-2451264.jpeg?auto=compress&cs=tinysrgb&w=800'],
  },
  {
    title: 'Vintage Omega Seamaster',
    description: '1960s Omega Seamaster automatic. Recently serviced with new crystal.',
    category: 'accessories',
    structured: { brand: 'Omega', model: 'Seamaster', year: 1965, material: 'Stainless Steel', condition: 'Good' },
    ask_price: 2200,
    condition_notes: [
      { issue: 'Minor dial patina', confidence: 'high' },
      { issue: 'Crown replaced', confidence: 'medium' },
    ],
    haggling_ammo: ['Service records available', 'Original buckle missing'],
    image_urls: ['https://images.pexels.com/photos/9978722/pexels-photo-9978722.jpeg?auto=compress&cs=tinysrgb&w=800'],
  },
  {
    title: 'Herman Miller Aeron Chair',
    description: 'Size B Aeron in graphite. Fully loaded with all adjustments.',
    category: 'furniture',
    structured: { style: 'Modern', material: 'Mesh/Aluminum', dimensions: 'Size B', condition: 'Excellent' },
    ask_price: 750,
    condition_notes: [
      { issue: 'Mesh in perfect condition', confidence: 'high' },
      { issue: 'Minor armrest wear', confidence: 'low' },
    ],
    haggling_ammo: ['Original lumbar support', 'PostureFit included'],
    image_urls: ['https://images.pexels.com/photos/1957478/pexels-photo-1957478.jpeg?auto=compress&cs=tinysrgb&w=800'],
  },
  {
    title: 'Canon EOS R5 Body',
    description: '45MP full-frame mirrorless. Low shutter count, excellent condition.',
    category: 'electronics',
    structured: { brand: 'Canon', model: 'EOS R5', year: 2022, storage: 'N/A', condition: 'Excellent' },
    ask_price: 2800,
    condition_notes: [
      { issue: 'Shutter count: 12,000', confidence: 'high' },
      { issue: 'Minor dust on sensor', confidence: 'low' },
    ],
    haggling_ammo: ['Extra battery included', 'Original box and receipt'],
    image_urls: ['https://images.pexels.com/photos/51383/photo-camera-subject-photographer-51383.jpeg?auto=compress&cs=tinysrgb&w=800'],
  },
];

const DEMO_BUY_AGENTS = [
  {
    name: 'Vintage Jacket Finder',
    category: 'clothing',
    filters: { size: 'M', gender: 'unisex' },
    prompt: 'Looking for vintage leather jackets in good condition. Prefer 80s or 90s styles.',
    max_price: 500,
    urgency: 'medium',
  },
  {
    name: 'Laptop Deal Hunter',
    category: 'electronics',
    filters: { brand: 'Apple' },
    prompt: 'Need a MacBook Pro for development work. M-series chip preferred.',
    max_price: 2000,
    urgency: 'high',
  },
  {
    name: 'Office Furniture Scout',
    category: 'furniture',
    filters: { style: 'Modern' },
    prompt: 'Looking for ergonomic office furniture. Desk and chair combo preferred.',
    max_price: 1500,
    urgency: 'low',
  },
];

const DEMO_EVENTS = [
  { type: 'listing_created', payload: { title: 'Vintage Leather Jacket', price: 450 } },
  { type: 'listing_created', payload: { title: 'MacBook Pro 16" M2 Pro', price: 1800 } },
  { type: 'match_found', payload: { title: 'Match Found', message: 'Vintage Jacket Finder matched with Vintage Leather Jacket' } },
  { type: 'negotiation_started', payload: { title: 'Negotiation Started', message: 'Laptop Deal Hunter started negotiating for MacBook Pro' } },
  { type: 'buyer_proposes', payload: { title: 'Buyer Proposes', message: 'Opening offer at $1,600', price: 1600 } },
  { type: 'seller_counters', payload: { title: 'Seller Counters', message: 'Counter at $1,750', price: 1750 } },
];

export async function POST() {
  const devMode = process.env.DEV_MODE === 'true' || process.env.NEXT_PUBLIC_DEV_MODE === 'true';

  if (!devMode) {
    return NextResponse.json({ error: 'Seed only available in DEV_MODE' }, { status: 403 });
  }

  try {
    const listingIds: string[] = [];
    for (const listing of DEMO_LISTINGS) {
      const result = await query(
        `INSERT INTO listings (title, description, category, structured, ask_price, condition_notes, haggling_ammo, image_urls, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [
          listing.title,
          listing.description,
          listing.category,
          JSON.stringify(listing.structured),
          listing.ask_price,
          JSON.stringify(listing.condition_notes),
          `{${listing.image_urls.map(u => `"${u}"`).join(',')}}`,
          `{${listing.image_urls.map(u => `"${u}"`).join(',')}}`,
        ]
      );
      if (result.rows.length > 0) {
        listingIds.push(result.rows[0].id);
      }
    }

    const buyAgentIds: string[] = [];
    for (const agent of DEMO_BUY_AGENTS) {
      const result = await query(
        `INSERT INTO buy_agents (name, category, filters, prompt, max_price, urgency)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [
          agent.name,
          agent.category,
          JSON.stringify(agent.filters),
          agent.prompt,
          agent.max_price,
          agent.urgency,
        ]
      );
      if (result.rows.length > 0) {
        buyAgentIds.push(result.rows[0].id);
      }
    }

    for (const event of DEMO_EVENTS) {
      await query(
        `INSERT INTO events (type, payload) VALUES ($1, $2)`,
        [event.type, JSON.stringify(event.payload)]
      );
    }

    if (buyAgentIds.length > 0 && listingIds.length > 0) {
      await query(
        `INSERT INTO matches (buy_agent_id, listing_id, score, reason, status)
         VALUES ($1, $2, 85, 'Good match based on category and price', 'potential')
         ON CONFLICT DO NOTHING`,
        [buyAgentIds[0], listingIds[0]]
      );
    }

    return NextResponse.json({
      success: true,
      created: {
        listings: listingIds.length,
        buyAgents: buyAgentIds.length,
        events: DEMO_EVENTS.length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to seed database';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const devMode = process.env.DEV_MODE === 'true' || process.env.NEXT_PUBLIC_DEV_MODE === 'true';

  if (!devMode) {
    return NextResponse.json({ error: 'Seed only available in DEV_MODE' }, { status: 403 });
  }

  try {
    await query('DELETE FROM messages');
    await query('DELETE FROM escrow');
    await query('DELETE FROM negotiations');
    await query('DELETE FROM matches');
    await query('DELETE FROM events');
    await query('DELETE FROM buy_agents');
    await query('DELETE FROM sell_agents');
    await query('DELETE FROM listings');

    return NextResponse.json({ success: true, message: 'Database cleared' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to clear database';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
