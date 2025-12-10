import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

export async function GET(request, { params }) {
  const paramsObj = await params;
  const { id } = paramsObj || {};
  if (!id) return NextResponse.json({ message: 'missing id' }, { status: 400 });
  try {
    const db = await getDbConnection();
    const row = await db.get('SELECT thumbs FROM media_items WHERE id = ?', [id]);
    if (!row) return NextResponse.json({ thumbs: [] });
    let thumbs = [];
    try {
      thumbs = JSON.parse(row.thumbs || '[]');
    } catch (e) {
      thumbs = [];
    }
    return NextResponse.json({ thumbs });
  } catch (err) {
    console.error('failed to get thumbs', err);
    return NextResponse.json({ message: 'failed' }, { status: 500 });
  }
}
