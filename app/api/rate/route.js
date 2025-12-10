import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

// POST /api/rate
// body: { media: number, rate: number }
export async function POST(req) {
  try {
    const body = await req.json();
    const media = body?.media;
    const rate = Number(body?.rate) || 0;

    if (media === undefined || media === null) {
      return NextResponse.json({ message: 'media is required' }, { status: 400 });
    }

    const db = await getDbConnection();
    // Update the media_items table's rate column
    await db.run('UPDATE media_items SET rate = ? WHERE id = ?', [rate, media]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('/api/rate error', err);
    return NextResponse.json({ message: 'internal error' }, { status: 500 });
  }
}
