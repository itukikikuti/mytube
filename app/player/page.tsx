'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function PlayerContent() {
  const searchParams = useSearchParams();
  const videoUrl = searchParams.get('url');
  const videoName = searchParams.get('name');

  if (!videoUrl) {
    return (
      <div>
        <p>ビデオのURLが指定されていません。</p>
        <Link href="/external-videos">一覧に戻る</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Link href="/external-videos">← 一覧に戻る</Link>
      <h1 style={{ marginTop: 20 }}>再生中: {videoName || 'ビデオ'}</h1>
      <video key={videoUrl} width="100%" style={{ maxWidth: 960 }} controls autoPlay>
        <source src={videoUrl} type="video/mp4" />
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
