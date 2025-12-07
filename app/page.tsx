'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';

interface CardProps {
  title: string;
  thumbs: string[];
  rate: number;
  date: number;
  play_count?: number;
  last_played?: number | null;
}

type MediaItem = {
  id: number;
  title: string;
  date: number;
  type: string;
  duration: number;
  rate: number;
  tags: string;
  thumbs: string[];
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
        <h3 className="text-sm truncate" title={title}>{title}</h3>
        <div className="flex items-center justify-between text-xs">
          <span className="opacity-50">{(play_count || 0)}回・{formatDate(date)}</span>
          {renderStars(rate)}
        </div>
      </div>
    </div>
  );
};

interface ModalProps {
  item: MediaItem | null;
  onClose: () => void;
}

const Modal = ({ item, onClose }: ModalProps) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const onWheel2 = (e: React.WheelEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;

    // ページ全体のスクロールを抑止
    e.preventDefault();

    const step = 3; // 3秒ずつ移動
    if (e.deltaY < 0) {
      video.currentTime = Math.min(isFinite(video.duration) ? video.duration : Infinity, video.currentTime + step);
    } else if (e.deltaY > 0) {
      video.currentTime = Math.max(0, video.currentTime - step);
    }
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center z-50" onClick={onClose} onWheel={onWheel2}>
      <div className="bg-white w-screen h-screen overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="w-full h-8/10 bg-black">
          <div className="w-full h-full">
            <video
              key={item?.title}
              ref={videoRef}
              className="w-full h-full object-contain"
              controls
              autoPlay
            >
              <source src={`/api/stream-video?filename=${item ? encodeURIComponent(item.title) : ''}`} type="video/mp4" />
              お使いのブラウザは video をサポートしていません。
            </video>
          </div>
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

function Drawer({ sortOrder, setSortOrder }: { sortOrder: string; setSortOrder: (s: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDrawer = () => {
    setIsOpen(!isOpen);
  }
  
  return (
    <nav className="fixed top-0 left-0 w-full z-40 bg-white p-4 shadow-md flex items-center">
      <button className="relative z-50 focus:outline-none" onClick={toggleDrawer} aria-label="Toggle Menu">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      <div className="ml-3 text-lg font-semibold select-none">MyTube</div>

      <div
        className={`fixed top-0 left-0 h-full w-128 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-20 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 pt-16">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">並び順</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full border rounded p-2 text-sm"
              aria-label="並び順"
            >
              <option value="newest">新しい順</option>
              <option value="oldest">古い順</option>
              <option value="most_played">再生回数が多い順</option>
              <option value="highest_rated">評価が高い順</option>
              <option value="last_played">最終再生が新しい順</option>
            </select>
          </div>
        </div>
      </div>

      {isOpen && <div className="fixed inset-0 z-10" onClick={toggleDrawer}></div>}
    </nav>
  );
}

export default function ListPage() {
  const [list, setList] = useState<MediaItem[]>([]);
  const [sortOrder, setSortOrder] = useState('newest');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/data')
      .then(r => r.json())
      .then((data: any[]) => {
        const mapped = data.map((item: any) => ({
          ...item,
          thumbs: (() => {
            try {
              return JSON.parse(item.thumbs || '[]');
            } catch (e) {
              return [];
            }
          })(),
        }));
        setList(mapped.sort((a: any, b: any) => b.date - a.date));
      })
      .catch(console.error);
  }, []);

  const sortedList = useMemo(() => {
    const copy = [...list];
    switch (sortOrder) {
      case 'newest':
        return copy.sort((a, b) => b.date - a.date);
      case 'oldest':
        return copy.sort((a, b) => a.date - b.date);
      case 'most_played':
        return copy.sort((a, b) => (b.play_count || 0) - (a.play_count || 0));
      case 'highest_rated':
        return copy.sort((a, b) => b.rate - a.rate);
      case 'last_played':
        return copy.sort((a, b) => (b.last_played || 0) - (a.last_played || 0));
      default:
        return copy.sort((a, b) => b.date - a.date);
    }
  }, [list, sortOrder]);

  const openModal = (item: MediaItem) => {
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
        <Drawer sortOrder={sortOrder} setSortOrder={setSortOrder} />
      </header>
      <div className="pt-15">
        <VirtuosoGrid
          style={{ height: 'calc(100vh - var(--spacing) * 15)' }}
          totalCount={sortedList.length}
          listClassName="container mx-auto p-5 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3"
          itemContent={(index) => {
            const item = sortedList[index];
            if (!item) return <div />;
            return (
              <div>
                <button onClick={() => openModal(item)} className="w-full p-0 bg-transparent border-0 text-left">
                  <Card
                    title={item.title}
                    thumbs={item.thumbs}
                    rate={item.rate}
                    date={item.date}
                    play_count={item.play_count}
                    last_played={item.last_played}
                  />
                </button>
              </div>
            );
          }}
        />
      </div>
      {isModalOpen && <Modal item={selectedMedia} onClose={closeModal} />}
    </>
  );
}
