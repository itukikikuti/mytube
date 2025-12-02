import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const media = body.media;
    const date = body.date || Math.floor(Date.now() / 1000);

    if (!media && media !== 0) {
      return NextResponse.json({ message: 'media is required' }, { status: 400 });
    }

    const db = await getDbConnection();
    await db.run('INSERT INTO history_items (media, date) VALUES (?, ?)', [media, date]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Failed to insert history' }, { status: 500 });
  }
}
