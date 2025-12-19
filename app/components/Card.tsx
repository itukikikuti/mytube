import { useEffect, useState, useRef } from 'react';
import { HiOutlinePhotograph } from 'react-icons/hi';
import type { MediaItem } from '../types/media';

interface CardProps {
  media: MediaItem;
}

export function Card({ media }: CardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [thumbs, setThumbs] = useState<string[]>(media.thumbs || []);
  const mountedRef = useRef(true);

  const hasImages = thumbs && thumbs.length > 0;
  const totalImages = hasImages ? thumbs.length : 0;

  const minutes = Math.floor(media.duration / 60).toString();
  const seconds = ('00' + (media.duration % 60).toString()).slice(-2);

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

  useEffect(() => {
    if (media.thumbs && media.thumbs.length !== thumbs.length) {
      setThumbs(media.thumbs);
    }
  }, [media.thumbs]);

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
          <span key={i} className={i < rating ? 'text-pink-400' : 'opacity-50'}>♥</span>
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
}
