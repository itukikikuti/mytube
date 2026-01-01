import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

const EXTERNAL_VIDEO_DIR = '/app/nas/Videos';

export const maxDuration = 3600; // 60分のタイムアウト設定

export async function HEAD(request) {
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

  const headers = {
    'Content-Length': fileSize.toString(),
    'Content-Type': 'video/mp4',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=86400',
  };

  return new Response(null, { status: 200, headers });
}

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

  // ファイルオープン時のエラーハンドリング
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
  } catch (error) {
    console.error('Failed to open file:', filePath, error);
    return NextResponse.json({ message: 'Failed to read file' }, { status: 500 });
  }

  try {
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;

      // ファイルディスクリプタから直接読み込み
      const buffer = Buffer.alloc(chunkSize);
      fs.readSync(fd, buffer, 0, chunkSize, start);

      const headers = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
        'Content-Type': 'video/mp4',
        'Cache-Control': 'public, max-age=86400',
      };

      return new Response(buffer, { status: 206, headers });
    } else {
      // 完全ファイル返却 - ストリーミング使用
      const stream = fs.createReadStream(filePath, {
        highWaterMark: 1024 * 1024 * 5, // 5MB chunks
      });

      const headers = {
        'Content-Length': fileSize.toString(),
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400',
      };

      return new Response(stream, { status: 200, headers });
    }
  } finally {
    if (fd !== undefined) {
      fs.closeSync(fd);
    }
  }
}
