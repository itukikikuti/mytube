import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDbConnection();
    const rows = await db.all('SELECT id, name FROM tag_items ORDER BY name');
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Failed to fetch tags', error);
    return NextResponse.json({ message: 'タグの取得に失敗しました' }, { status: 500 });
  }
}
