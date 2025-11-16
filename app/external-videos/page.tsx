'use client';
import React, { useEffect, useState } from 'react';

export default function ExternalVideosPage() {
  const [list, setList] = useState<{ name: string; url: string }[]>([]);
  const [current, setCurrent] = useState<string | null>(null);

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
            <button onClick={() => setCurrent(item.url)}>{item.name}</button>
          </li>
        ))}
      </ul>

      {current && (
        <div style={{ marginTop: 20 }}>
          <h2>再生: {current.split('=').pop()}</h2>
          <video key={current} width={640} height={360} controls autoPlay>
            <source src={current} type="video/mp4" />
            お使いのブラウザは video をサポートしていません。
          </video>
        </div>
      )}
    </div>
  );
}
