import fs from 'fs';
import path from 'path';

const EXTERNAL_VIDEO_DIR = 'N:\\Videos';

export default function handler(req, res) {
  const { filename } = req.query;
  if (!filename) return res.status(400).send('filename is required');

  const safeName = path.basename(Array.isArray(filename) ? filename[0] : filename);
  const filePath = path.join(EXTERNAL_VIDEO_DIR, safeName);

  if (!fs.existsSync(filePath) || !filePath.toLowerCase().endsWith('.mp4')) {
    return res.status(404).send('File not found or unsupported');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = (end - start) + 1;
    const stream = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4'
    });
    stream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4'
    });
    fs.createReadStream(filePath).pipe(res);
  }
}
