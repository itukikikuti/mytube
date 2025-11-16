import fs from 'fs';
import path from 'path';

const EXTERNAL_VIDEO_DIR = 'N:\\Videos';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    if (!fs.existsSync(EXTERNAL_VIDEO_DIR)) {
      return res.status(404).json({ message: '動画フォルダが見つかりません。' });
    }

    const files = fs.readdirSync(EXTERNAL_VIDEO_DIR);
    const mp4Files = files
      .filter(f => f.toLowerCase().endsWith('.mp4'))
      .map(f => ({
        name: f,
        url: `/api/stream-video?filename=${encodeURIComponent(f)}`
      }));

    res.status(200).json(mp4Files);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'ファイル読み取りエラー' });
  }
}
