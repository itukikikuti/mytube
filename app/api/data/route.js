import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDbConnection();
    const results = await db.all('SELECT * FROM media_items');

    // 再生履歴から再生回数と最終再生日時を取得
    const counts = await db.all(`
      SELECT media as id, COUNT(*) as play_count, MAX(date) as last_played
      FROM history_items
      GROUP BY media
    `);

    const countsMap = new Map();
    counts.forEach((c) => countsMap.set(c.id, { play_count: c.play_count, last_played: c.last_played }));

    const merged = results.map((r) => {
      const info = countsMap.get(r.id) || { play_count: 0, last_played: null };
      return { ...r, play_count: info.play_count, last_played: info.last_played };
    });

    return NextResponse.json(merged);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'データベースからのデータ取得に失敗しました。' }, { status: 500 });
  }
}
