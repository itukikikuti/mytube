import fs from 'fs';
import { NextResponse } from 'next/server';

const EXTERNAL_VIDEO_DIR = 'N:\\Videos';

export async function GET(request) {
  try {
    if (!fs.existsSync(EXTERNAL_VIDEO_DIR)) {
      return NextResponse.json({ message: '動画フォルダが見つかりません。' }, { status: 404 });
    }

    const files = fs.readdirSync(EXTERNAL_VIDEO_DIR);
    const mp4Files = files.filter(f => f.toLowerCase().endsWith('.mp4'));

    return NextResponse.json(mp4Files);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'ファイル読み取りエラー' }, { status: 500 });
  }
}
