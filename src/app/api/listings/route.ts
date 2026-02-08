import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { Listing } from '@/types/database';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const category = url.searchParams.get('category');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (id) {
      conditions.push(`id = $${paramIdx++}`);
      params.push(id);
    }

    if (status) {
      conditions.push(`status = $${paramIdx++}`);
      params.push(status);
    }

    if (category) {
      conditions.push(`category = $${paramIdx++}`);
      params.push(category);
    }

    if (search) {
      conditions.push(`(title ILIKE $${paramIdx} OR description ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM listings ${where} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx}`;
    params.push(limit, offset);

    const result = await query<Listing>(sql, params);

    return NextResponse.json({ listings: result.rows });
  } catch (err) {
    console.error('GET /api/listings error:', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch listings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUserId = await getUserIdFromRequest(req);
    const body = await req.json();
    const {
      title,
      description,
      category,
      structured,
      ask_price,
      condition_notes,
      haggling_ammo,
      image_urls,
      hero_image_url,
      hero_thumbnail_url,
    } = body;

    if (!title || !category || !ask_price) {
      return NextResponse.json(
        { error: 'title, category, and ask_price are required' },
        { status: 400 }
      );
    }

    const finalUserId = authUserId || null;

    const formatArray = (arr: string[] | undefined) =>
      arr?.length ? `{${arr.map((u: string) => `"${u}"`).join(',')}}` : '{}';

    const result = await query<Listing>(
      `INSERT INTO listings (
        seller_user_id, title, description, category, structured,
        ask_price, condition_notes, haggling_ammo, image_urls, hero_image_url, hero_thumbnail_url, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active')
      RETURNING *`,
      [
        finalUserId,
        title,
        description || '',
        category,
        JSON.stringify(structured || {}),
        ask_price,
        JSON.stringify(condition_notes || []),
        formatArray(haggling_ammo),
        formatArray(image_urls),
        hero_image_url || null,
        hero_thumbnail_url || null,
      ]
    );

    return NextResponse.json({ listing: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error('POST /api/listings error:', err);
    const message = err instanceof Error ? err.message : 'Failed to create listing';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
