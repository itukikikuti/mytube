'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const Card = ({ title, thumbs }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const hasImages = thumbs && thumbs.length > 0;
  const totalImages = hasImages ? thumbs.length : 0;
  
  useEffect(() => {
    if (totalImages <= 1) return;

    const intervalId = setInterval(() => {
      setCurrentIndex((prevIndex) => (
        prevIndex === totalImages - 1 ? 0 : prevIndex + 1
      ));
    }, 3000);

    return () => clearInterval(intervalId);
  }, [totalImages]);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden transition duration-300 hover:shadow-xl hover:scale-[1.02]">
      <div className="bg-black relative w-full aspect-video">
        {hasImages ? (
          <div
            className="flex h-full transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {thumbs.map((base64, index) => (
              <div key={index} className="w-full flex-shrink-0">
                <img
                  src={`data:image/jpeg;base64,${base64}`}
                  alt={title}
                  className="w-full h-full object-contain rounded-t-lg"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full h-full bg-black flex items-center justify-center rounded-t-lg">
            <span className="text-white opacity-50">No Image</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-sm text-gray-800 truncate">
          {title}
        </h3>
      </div>
    </div>
  );
};

export default function ListPage() {
  const [list, setList] = useState<{ id: number, title: string, date: number, type: string, duration: number, rate: number, tags: string, thumbs: string }[]>([]);

  useEffect(() => {
    fetch('/api/data')
      .then(r => r.json())
      .then(data => setList(data))
      .catch(console.error);
  }, []);

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {list.map((item) => (
          <Link key={item.id} href={`/player?filename=${encodeURIComponent(item.title)}`}>
            <Card
              title={item.title}
              thumbs={JSON.parse(item.thumbs)}
            />
          </Link>
        ))}
      </div>
    </div>
    /*
    <div style={{ padding: 24 }}>
      <h1>外部ビデオ一覧 (N:\\Videos)</h1>
      <ul>
        {list.map(item => (
          <li key={item.id}>
            <Link href={`/player?filename=${encodeURIComponent(item.title)}`}>
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
    */
  );
}
