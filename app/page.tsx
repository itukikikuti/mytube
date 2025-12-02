'use client';

import { useEffect, useState } from 'react';

interface CardProps {
  title: string;
  thumbs: string[];
  rate: number;
  date: number;
  play_count?: number;
  last_played?: number | null;
}

const Card = ({ title, thumbs, rate, date, play_count, last_played }: CardProps) => {
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

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '';
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <span key={i} className={i < rating ? "text-yellow-500" : "opacity-50"}>★</span>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden transition duration-300 hover:shadow-xl hover:scale-[1.02]">
      <div className="bg-black relative w-full aspect-video">
        {hasImages ? (
          <div
            className="h-full flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {thumbs.map((base64, index) => (
              <div key={index} className="w-full flex-shrink-0">
                <img
                  src={`data:image/jpeg;base64,${base64}`}
                  alt={title}
                  className="w-full h-full object-contain"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-white opacity-50">No Image</span>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1 text-left">
        <h3 className="text-sm truncate" title={title}>
          {title}
        </h3>
        <div className="flex items-center justify-between text-xs">
          <span className="opacity-50">{(play_count || 0)}回・{formatDate(last_played ?? date)}</span>
          {renderStars(rate)}
        </div>
      </div>
    </div>
  );
};

interface ModalProps {
  item: { id: number, title: string, date: number, type: string, duration: number, rate: number, tags: string, thumbs: string, play_count?: number, last_played?: number | null } | null;
  onClose: () => void;
}

const Modal = ({ item, onClose }: ModalProps) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-white w-screen h-screen overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="w-full h-8/10 bg-black">
          <PlayerContent item={item} />
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{item?.title}</h2>
              <div className="text-sm text-gray-500 mt-1">
                {item ? `${item.play_count || 0} 回視聴・${new Date(item.date * 1000).toLocaleDateString()}` : ''}
              </div>
            </div>
            <a
              className="text-sm text-blue-600"
              href={item ? `mytube:N:\\Videos\\${item.title}` : '#'}
              onClick={async (e) => {
                e.preventDefault();
                if (!item) return;
                const href = `mytube:N:\\Videos\\${item.title}`;
                try {
                  await fetch('/api/history', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ media: item.id, date: Math.floor(Date.now() / 1000) }),
                  });
                } catch (err) {
                  console.error('履歴の記録に失敗しました', err);
                }
                window.location.href = href;
              }}
            >開く（ローカル）</a>
            <button onClick={onClose} className="text-4xl leading-none ml-4" aria-label="Close modal">&times;</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerContent({ item }: { item: { title: string } | null }) {
  const title = item?.title ?? null;

  if (!title) {
    return (
      <div className="w-full h-full flex items-center justify-center text-white">
        <p>ビデオが指定されていません。</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <video key={title} className="w-full h-full object-contain" controls autoPlay>
        <source src={`/api/stream-video?filename=${encodeURIComponent(title)}`} type="video/mp4" />
        お使いのブラウザは video をサポートしていません。
      </video>
    </div>
  );
}

function Drawer() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDrawer = () => {
    setIsOpen(!isOpen);
  }
  
  return (
    <nav className="relative p-4 shadow-md">
      <button className="z-30 focus:outline-none" onClick={toggleDrawer} aria-label="Toggle Menu">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      <div
        className={`fixed top-0 left-0 h-full w-128 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-20 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 pt-16">
          <a href="#" className="block py-2 hover:bg-gray-600">ホーム</a>
          <a href="#" className="block py-2 hover:bg-gray-600">サービス</a>
          <a href="#" className="block py-2 hover:bg-gray-600">お問い合わせ</a>
        </div>
      </div>

      {isOpen && <div className="fixed inset-0 z-10" onClick={toggleDrawer}></div>}
    </nav>
  );
}

export default function ListPage() {
  const [list, setList] = useState<{ id: number, title: string, date: number, type: string, duration: number, rate: number, tags: string, thumbs: string, play_count?: number, last_played?: number | null }[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<{ id: number, title: string, date: number, type: string, duration: number, rate: number, tags: string, thumbs: string, play_count?: number, last_played?: number | null } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/data')
      .then(r => r.json())
      .then((data: any) => setList((data as any[]).sort((a: any, b: any) => b.date - a.date)))
      .catch(console.error);
  }, []);

  const openModal = (item: { id: number, title: string, date: number, type: string, duration: number, rate: number, tags: string, thumbs: string, play_count: number }) => {
    setIsModalOpen(true);
    setSelectedMedia(item);
  }
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedMedia(null);
  };

  return (
    <>
      <header>
        <Drawer />
      </header>
      <div className="container mx-auto p-5">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
          {list.map((item) => (
            <button key={item.id} onClick={() => openModal(item)}>
              <Card
                title={item.title}
                thumbs={JSON.parse(item.thumbs)}
                rate={item.rate}
                date={item.date}
                play_count={item.play_count}
                last_played={item.last_played}
              />
            </button>
          ))}
        </div>
      </div>
      {isModalOpen && <Modal item={selectedMedia} onClose={closeModal} />}
    </>
  );
}
