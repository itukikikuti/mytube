'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

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

interface ModalProps {
  title: string | null;
  onClose: () => void;
}

const Modal = ({ title, onClose }: ModalProps) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-black w-screen h-screen overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex justify-between items-start mb-6 border-b pb-4">
            <h2 className="text-3xl font-extrabold">モーダルタイトル</h2>
            <button onClick={onClose} className="text-4xl leading-none" aria-label="Close modal">&times;</button>
          </div>
          <PlayerPage title={title} />
          <a href={`mytube:N:\\Videos\\${title}`}>開く</a>
        </div>
      </div>
    </div>
  );
}

function PlayerContent({ title }) {
  if (!title) {
    return (
      <div>
        <p>ビデオが指定されていません。</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginTop: 20 }}>再生中: {title || 'ビデオ'}</h1>
      <video key={title} width="100%" style={{ maxWidth: 960 }} controls autoPlay>
        <source src={`/api/stream-video?filename=${encodeURIComponent(title)}`} type="video/mp4" />
        お使いのブラウザは video をサポートしていません。
      </video>
    </div>
  );
}

function PlayerPage({ title }) {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <PlayerContent title={title} />
    </Suspense>
  );
}

export default function ListPage() {
  const [list, setList] = useState<{ id: number, title: string, date: number, type: string, duration: number, rate: number, tags: string, thumbs: string }[]>([]);
  const [selectedMediaTitle, setSelectedMediaTitle] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/data')
      .then(r => r.json())
      .then(data => setList(data))
      .catch(console.error);
  }, []);

  const openModal = (title: string) => {
    setIsModalOpen(true);
    setSelectedMediaTitle(title);
  }
  const closeModal = () => setIsModalOpen(false);

  return (
    <>
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {list.map((item) => (
            <button key={item.id} onClick={() => openModal(item.title)}>
              <Card
                title={item.title}
                thumbs={JSON.parse(item.thumbs)}
              />
            </button>
          ))}
        </div>
      </div>
      {isModalOpen && <Modal title={selectedMediaTitle} onClose={closeModal} />}
    </>
  );
}
