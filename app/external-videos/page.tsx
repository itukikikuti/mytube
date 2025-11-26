'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ExternalVideosPage() {
  const [list, setList] = useState<{ name: string; url: string }[]>([]);

  useEffect(() => {
    fetch('/api/list-videos')
      .then(r => r.json())
      .then(data => setList(data))
      .catch(console.error);
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>外部ビデオ一覧 (N:\\Videos)</h1>
      <ul>
        {list.map(item => (
          <li key={item.name}>
            <Link href={`/player?url=${encodeURIComponent(item.url)}&name=${encodeURIComponent(item.name)}`}>
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
