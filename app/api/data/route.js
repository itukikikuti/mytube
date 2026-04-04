import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';

const MEDIA_DIR = process.env.MEDIA_DIR || path.resolve(process.cwd(), 'public/videos');
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.m4v', '.avi', '.mkv']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']);

function detectMediaType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  return 'video';
}

async function syncNewFilesToMediaItems(db) {
  let dirEntries;

  try {
    dirEntries = await fs.readdir(MEDIA_DIR, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  const folderFiles = dirEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => {
      const ext = path.extname(name).toLowerCase();
      return VIDEO_EXTENSIONS.has(ext) || IMAGE_EXTENSIONS.has(ext);
    });

  if (folderFiles.length === 0) {
    return;
  }

  const rows = await db.all('SELECT title FROM media_items');
  const existingTitles = new Set(rows.map((row) => row.title));
  const missingFiles = folderFiles.filter((name) => !existingTitles.has(name));

  if (missingFiles.length === 0) {
    return;
  }

  await db.exec('BEGIN');
  try {
    for (const filename of missingFiles) {
      const filePath = path.join(MEDIA_DIR, filename);
      const stat = await fs.stat(filePath);
      const createdAtMs = (typeof stat.birthtimeMs === 'number' && stat.birthtimeMs > 0)
        ? stat.birthtimeMs
        : stat.mtimeMs;
      const createdAt = Math.floor(createdAtMs / 1000);

      await db.run(
        'INSERT INTO media_items (title, date, type, duration, rate, tags, thumbs) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [filename, createdAt, detectMediaType(filename), 0, 0, '[]', '[]']
      );
    }
    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}

export async function GET() {
  try {
    const db = await getDbConnection();
    await syncNewFilesToMediaItems(db);
    const results = await db.all('SELECT id, title, date, type, duration, rate, tags FROM media_items');

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
