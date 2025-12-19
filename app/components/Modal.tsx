import { useEffect, useRef } from 'react';
import { HiX, HiPlus, HiExternalLink } from 'react-icons/hi';
import type { MediaItem } from '../types/media';

interface ModalProps {
  item: MediaItem | null;
  onClose: () => void;
  onAddThumb?: (thumb: string) => void;
  onRemoveThumb?: (index: number) => void;
  onRate?: (rating: number) => void;
  onOpenLocal: (item: MediaItem) => void;
}

export function Modal({ item, onClose, onAddThumb, onRemoveThumb, onRate, onOpenLocal }: ModalProps) {
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

    const step = 3;
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

      const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
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
              {item && (
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
                      {item.thumbs && item.thumbs.map((b64, idx) => (
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
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (item) onOpenLocal(item);
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
