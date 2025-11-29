'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function PlayerContent() {
  const searchParams = useSearchParams();
  const videoName = searchParams.get('filename');

  if (!videoName) {
    return (
      <div>
        <p>ビデオが指定されていません。</p>
        <Link href="/list">一覧に戻る</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Link href="/list">← 一覧に戻る</Link>
      <h1 style={{ marginTop: 20 }}>再生中: {videoName || 'ビデオ'}</h1>
      <video key={videoName} width="100%" style={{ maxWidth: 960 }} controls autoPlay>
        <source src={`/api/stream-video?filename=${videoName}`} type="video/mp4" />
        お使いのブラウザは video をサポートしていません。
      </video>
    </div>
  );
}

export default function PlayerPage() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <PlayerContent />
    </Suspense>
  );
}
