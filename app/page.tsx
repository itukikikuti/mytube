'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import { HiMenu, HiX, HiPlus, HiStar, HiOutlineStar, HiOutlinePhotograph, HiExternalLink } from 'react-icons/hi';

interface CardProps {
  media: MediaItem;
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

const Card = ({ media }: CardProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [thumbs, setThumbs] = useState<string[]>(media.thumbs || []);
  const mountedRef = useRef(true);

  const hasImages = thumbs && thumbs.length > 0;
  const totalImages = hasImages ? thumbs.length : 0;

  const minutes = Math.floor(media.duration / 60).toString();
  const seconds = ("00" + (media.duration % 60).toString()).slice(-2);

  // --- fetch thumbnails when media.id changes (only) ---
  useEffect(() => {
    const controller = new AbortController();
    setThumbs(media.thumbs || []);
    mountedRef.current = true;

    (async () => {
      if (!media?.id) return;
      if (media.thumbs && media.thumbs.length > 0) return;
      try {
        const res = await fetch(`/api/thumbs/${media.id}`, { signal: controller.signal });
        if (!res.ok) return;
        const json = await res.json();
        const list = Array.isArray(json) ? json : (Array.isArray(json?.thumbs) ? json.thumbs : []);
        if (mountedRef.current) setThumbs(list);
      } catch (err: any) {
        if (err.name !== 'AbortError') console.error('thumbs fetch failed', err);
      }
    })();

    return () => {
      controller.abort();
      mountedRef.current = false;
    };
  }, [media?.id]);

  // --- autoplay interval for thumbs, depends on thumbs.length only ---
  useEffect(() => {
    if (thumbs && thumbs.length > 1) {
      const intervalId = setInterval(() => {
        setCurrentIndex((prevIndex) => (
          prevIndex === thumbs.length - 1 ? 0 : prevIndex + 1
        ));
      }, 3000);
      return () => clearInterval(intervalId);
    }
    return;
  }, [thumbs.length]);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '';
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <span key={i} className={i < rating ? "text-pink-400" : "opacity-50"}>♥</span>
        ))}
      </div>
    );
  };

  return (
    <div data-thumb-count={thumbs.length} className="w-full aspect-5/6 sm:aspect-12/11 rounded-2xl shadow-md overflow-hidden transition duration-300 hover:shadow-lg hover:scale-[1.01]">
      <div className="bg-black w-full aspect-video relative">
        {hasImages ? (
          <div
            className="h-full flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {thumbs.map((base64, index) => (
              <div key={index} className="w-full flex-shrink-0">
                <img
                  src={base64 && base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`}
                  alt={media.title}
                  className="w-full h-full object-contain"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <HiOutlinePhotograph className="text-white opacity-50 w-8 h-8" />
            <span className="text-white opacity-50 ml-2">No Image</span>
          </div>
        )}
        {(typeof media.duration === 'number' && media.duration > 0) && (
          <div className="absolute right-2 bottom-2 bg-black bg-opacity-10 text-white text-xs px-2 py-1 rounded">
            {minutes}:{seconds}
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col justify-between gap-1 text-left">
        <h3 className="text-sm line-clamp-2 sm:line-clamp-3 break-all overflow-hidden">{media.title}</h3>
        <div className="flex items-center justify-between text-xs">
          <span className="opacity-50">{(media.play_count || 0)}回・{formatDate(media.date)}</span>
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <span key={i} className={i < media.rate ? 'text-pink-400' : 'opacity-50'}>
                ♥
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};



interface ModalProps {
  item: MediaItem | null;
  onClose: () => void;
  onAddThumb?: (thumb: string) => void;
  onRemoveThumb?: (index: number) => void;
  onRate?: (rating: number) => void;
}

const Modal = ({ item, onClose, onAddThumb, onRemoveThumb, onRate }: ModalProps) => {
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
    // e.preventDefault();

    const step = 3; // 3秒ずつ移動
    if (e.deltaY < 0) {
      video.currentTime = Math.min(isFinite(video.duration) ? video.duration : Infinity, video.currentTime + step);
    } else if (e.deltaY > 0) {
      video.currentTime = Math.max(0, video.currentTime - step);
    }
  };

  const handleAddThumb = () => {
    try {
      const video = videoRef.current;
      if (!video) return;

      const canvas = document.createElement('canvas');
      canvas.width = (video.videoWidth / video.videoHeight) * 180;
      canvas.height = 180;

      const ctx = canvas.getContext('2d');
      if (ctx !== null) {
        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, 0, 0, canvas.width, canvas.height);
      }

      // use quality 0.5 (50%) — canvas expects 0..1
      const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
      // normalize to plain base64 (strip data: prefix) to match existing storage format
      const base64 = dataUrl.startsWith('data:') ? dataUrl.split(',')[1] : dataUrl;
      if (onAddThumb) onAddThumb(base64);
    } catch (err) {
      console.error('サムネイルの作成に失敗しました', err);
    }
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center z-50" onClick={onClose} onWheel={onWheel2}>
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Close modal"
        className="absolute left-4 z-50 text-3xl leading-none bg-white/90 rounded-full w-10 h-10 flex items-center justify-center"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      ><HiX className="w-5 h-5" /></button>
      <div className="bg-white w-screen h-screen overflow-hidden flex flex-col relative" onClick={(e) => e.stopPropagation()}>
        <div className="w-full h-1/2 sm:h-8/10 bg-black flex-shrink-0">
          <div className="w-full h-full">
            <video
              key={item?.title}
              ref={videoRef}
              className="w-full h-full object-contain"
              controls
              autoPlay
              loop
            >
              <source src={`/api/stream-video?filename=${item ? encodeURIComponent(item.title) : ''}`} type="video/mp4" />
              お使いのブラウザは video をサポートしていません。
            </video>
          </div>
        </div>
        <div className="p-5 flex-1 overflow-auto">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{item?.title}</h2>
              <div className="text-sm text-gray-500 mt-1">
                {item ? `${item.play_count || 0} 回視聴・${new Date(item.date * 1000).toLocaleDateString()}` : ''}
              </div>
              {item && (
                <div className="mt-2">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => {
                      const filled = i < (item.rate || 0);
                      const cls = filled ? 'text-pink-400' : 'opacity-50';
                      return (
                        <button
                          key={i}
                          onClick={(e) => {
                            e.stopPropagation();
                            const newRating = (item?.rate === (i + 1)) ? 0 : (i + 1);
                            onRate?.(newRating);
                          }}
                          aria-label={`Rate ${i + 1}`}
                          title={`${i + 1} 点`}
                          className="p-1 hover:scale-125 transition-transform text-3xl"
                          type="button"
                        >
                          <span className={cls}>♥</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {item?.thumbs && item.thumbs.length > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-shrink-0">
                    <button
                      onClick={handleAddThumb}
                      aria-label="Add thumbnail"
                      className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-xl font-semibold"
                    >
                      <HiPlus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-x-auto">
                    <div className="flex items-center gap-2">
                      {item.thumbs.map((b64, idx) => (
                        <div key={idx} className="relative group flex-shrink-0 rounded overflow-hidden">
                          <img src={b64 && b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}`} alt={`${item?.title}-thumb-${idx}`} className="w-32 h-20 object-cover" />
                          <button
                            onClick={(e) => { e.stopPropagation(); onRemoveThumb?.(idx); }}
                            aria-label="Remove thumbnail"
                            className="absolute top-1 right-1 flex items-center justify-center w-7 h-7 bg-white/90 rounded text-sm"
                          >
                            <HiX className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button
              className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-300 border border-transparent"
              onClick={async (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (!item) return;

                const confirmed = window.confirm(`${item.title} をローカルで開きますか？`);
                if (!confirmed) return;

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
              aria-label="開く（ローカル）"
              title="開く（ローカル）"
            >
              <HiExternalLink className="w-5 h-5" />
            </button>
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
    <nav className="fixed top-0 left-0 w-full z-40 bg-white p-4 flex items-center">
      <button className="relative z-50 focus:outline-none" onClick={toggleDrawer} aria-label="Toggle Menu">
        {isOpen ? <HiX className="w-6 h-6" /> : <HiMenu className="w-6 h-6" />}
      </button>

      <div className="ml-3 text-lg font-semibold select-none">MyTube</div>

      <div
        className={`fixed top-0 left-0 h-full w-full sm:w-128 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-20 ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="p-4 pt-16">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">並び順</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full border rounded p-2 text-md"
              aria-label="並び順"
            >
              <option value="newest">新しい順</option>
              <option value="oldest">古い順</option>
              <option value="last_played">再生した順</option>
              <option value="most_played">再生回数が多い順</option>
              <option value="highest_rated">評価が高い順</option>
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
          thumbs: [], // thumbs now fetched per-item from /api/thumbs/{id}
        }));
        setList(mapped.sort((a: any, b: any) => b.date - a.date));
      })
      .catch(console.error);
  }, []);

  // helper to fetch thumbs for a media id
  const fetchThumbs = async (mediaId: number): Promise<string[]> => {
    try {
      const res = await fetch(`/api/thumbs/${mediaId}`);
      if (!res.ok) return [];
      const json = await res.json();
      if (Array.isArray(json)) return json;
      if (json && Array.isArray(json.thumbs)) return json.thumbs;
      return [];
    } catch (err) {
      console.error('failed to fetch thumbs', err);
      return [];
    }
  };

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
    (async () => {
      const thumbs = await fetchThumbs(item.id);
      setSelectedMedia({ ...item, thumbs });
      setIsModalOpen(true);
    })();
  }
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedMedia(null);
  };

  const addThumbToMedia = (thumb: string) => {
    if (!selectedMedia) return;
    // persist to server then update local state
    (async () => {
      try {
        const res = await fetch('/api/thumbs/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ media: selectedMedia.id, thumb }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || 'failed');
        const thumbs = json.thumbs || ((selectedMedia.thumbs || []).concat([thumb]));
        setList(prev => prev.map(m => m.id === selectedMedia.id ? { ...m, thumbs } : m));
        setSelectedMedia(prev => prev ? { ...prev, thumbs } : prev);
      } catch (err) {
        console.error('failed to add thumb', err);
      }
    })();
  };

  const removeThumbFromMedia = (index: number) => {
    if (!selectedMedia) return;
    (async () => {
      try {
        const res = await fetch('/api/thumbs/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ media: selectedMedia.id, index }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || 'failed');
        const thumbs = json.thumbs || (selectedMedia.thumbs || []).filter((_, i) => i !== index);
        setList(prev => prev.map(m => m.id === selectedMedia.id ? { ...m, thumbs } : m));
        setSelectedMedia(prev => prev ? { ...prev, thumbs } : prev);
      } catch (err) {
        console.error('failed to remove thumb', err);
      }
    })();
  };

  // 評価を行う（楽観更新してサーバーへ送信）
  const rateMedia = (mediaId: number, rating: number) => {
    // optimistic update
    setList(prev => prev.map(m => m.id === mediaId ? { ...m, rate: rating } : m));
    setSelectedMedia(prev => prev ? { ...prev, rate: rating } : prev);

    (async () => {
      try {
        await fetch('/api/rate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ media: mediaId, rate: rating }),
        });
      } catch (err) {
        console.error('failed to send rating', err);
      }
    })();
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
            const media = sortedList[index];
            if (!media) return <div />;
            return (
              <div key={media.id}>
                <button onClick={() => openModal(media)} className="w-full p-0 bg-transparent border-0 text-left">
                  <Card media={media} />
                </button>
              </div>
            );
          }}
        />
      </div>
      {isModalOpen && (
        <Modal
          item={selectedMedia}
          onClose={closeModal}
          onAddThumb={addThumbToMedia}
          onRemoveThumb={removeThumbFromMedia}
          onRate={(r) => { if (selectedMedia) rateMedia(selectedMedia.id, r); }}
        />
      )}
    </>
  );
}
