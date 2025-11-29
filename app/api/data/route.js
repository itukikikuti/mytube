import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDbConnection();
    const results = await db.all('SELECT * FROM media_items');
    return NextResponse.json(results);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'データベースからのデータ取得に失敗しました。' }, { status: 500 });
  }
}
