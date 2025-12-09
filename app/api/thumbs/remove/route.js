import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const media = body.media;
    const index = body.index;

    if (!media && media !== 0) {
      return NextResponse.json({ message: 'media is required' }, { status: 400 });
    }
    if (typeof index !== 'number') {
      return NextResponse.json({ message: 'index is required' }, { status: 400 });
    }

    const db = await getDbConnection();
    const row = await db.get('SELECT thumbs FROM media_items WHERE id = ?', [media]);
    let thumbs = [];
    try {
      thumbs = row && row.thumbs ? JSON.parse(row.thumbs) : [];
    } catch (e) {
      thumbs = [];
    }

    if (index < 0 || index >= thumbs.length) {
      return NextResponse.json({ message: 'index out of range' }, { status: 400 });
    }

    thumbs.splice(index, 1);
    await db.run('UPDATE media_items SET thumbs = ? WHERE id = ?', [JSON.stringify(thumbs), media]);

    return NextResponse.json({ ok: true, thumbs });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'internal error' }, { status: 500 });
  }
}
