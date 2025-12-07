import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

const EXTERNAL_VIDEO_DIR = '/app/nas/Videos';

export async function GET(request) {
  const filename = request.nextUrl.searchParams.get('filename');
  if (!filename) {
    return NextResponse.json({ message: 'filename is required' }, { status: 400 });
  }

  const safeName = path.basename(filename);
  const filePath = path.join(EXTERNAL_VIDEO_DIR, safeName);

  if (!fs.existsSync(filePath) || !filePath.toLowerCase().endsWith('.mp4')) {
    return NextResponse.json({ message: 'File not found or unsupported' }, { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = request.headers.get('range');

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = (end - start) + 1;
    const stream = fs.createReadStream(filePath, { start, end });

    const headers = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    };

    return new Response(stream, { status: 206, headers });
  } else {
    const stream = fs.createReadStream(filePath);
    const headers = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };
    return new Response(stream, { status: 200, headers });
  }
}
