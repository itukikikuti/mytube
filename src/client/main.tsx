import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

type MediaItem = { id: number; title: string };

type MediaDetail = MediaItem & {
  date?: number;
  type?: string;
  duration?: number;
  rate?: number;
  tags?: string;
  thumbs?: string;
};

function formatDuration(seconds?: number) {
  if (!seconds) return "未設定";

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");

  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

function formatDate(value?: number) {
  if (!value) return "";

  const d = new Date(value < 1e12 ? value * 1000 : value);

  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDateTime(value?: number) {
  if (!value) return "未取得";

  const date = new Date(value < 1e12 ? value * 1000 : value);

  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function MediaCard({
  item,
  onSelect,
}: {
  item: MediaItem;
  onSelect: (item: MediaItem) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [detail, setDetail] = useState<MediaDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [currentThumbIndex, setCurrentThumbIndex] = useState(0);

  useEffect(() => {
    const element = buttonRef.current;

    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isVisible || detail || isDetailLoading) return;

    let isCancelled = false;

    setIsDetailLoading(true);

    fetch(`/api/media-items/${item.id}`)
      .then((response) => response.json())
      .then((data) => {
        if (!isCancelled) {
          setDetail(data);
          setCurrentThumbIndex(0);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsDetailLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [detail, item.id, isVisible]);

  useEffect(() => {
    if (!detail?.thumbs) return;

    const thumbs = JSON.parse(detail.thumbs);
    if (thumbs.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentThumbIndex((prev) => (prev + 1) % thumbs.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [detail]);

  return (
    <li className="h-full">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => onSelect(item)}
        className="group flex h-72 w-full cursor-pointer flex-col rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
      >
        <div className="relative mb-3 aspect-video w-full overflow-hidden rounded-lg bg-slate-100">
          {(detail?.thumbs && JSON.parse(detail.thumbs).length > 0) ? (
            <>
              <div className="relative h-full w-full overflow-hidden">
                <div
                  className="flex h-full transition-transform duration-500"
                  style={{
                    transform: `translateX(${-currentThumbIndex * 100}%)`,
                  }}
                >
                  {JSON.parse(detail.thumbs).map((thumb: string) => (
                    <img
                      key={thumb}
                      src={`data:image/jpeg;base64,${thumb}`}
                      alt={item.title}
                      className="h-full min-w-full object-cover"
                    />
                  ))}
                </div>
              </div>
              {JSON.parse(detail.thumbs).length > 1 && (
                <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                  {JSON.parse(detail.thumbs).map((_: string, idx: number) => (
                    <div
                      key={idx}
                      className={`h-1.5 w-1.5 rounded-full transition-all ${
                        idx === currentThumbIndex ? "bg-white" : "bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <span className="flex h-full items-center justify-center text-sm font-medium text-slate-500">
              サムネイルなし
            </span>
          )}
          {detail?.duration != null && (
            <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
              {formatDuration(detail.duration)}
            </span>
          )}
        </div>
        <p
          className="mb-3 flex-1 overflow-hidden text-base font-semibold text-slate-900"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {item.title}
        </p>
        <div className="mt-auto flex items-center justify-between text-sm text-slate-500">
          <span>{detail ? (formatDate(detail.date) || "日付なし") : (isDetailLoading ? "取得中..." : "")}</span>
          <span>{detail?.rate != null ? `★ ${detail.rate}` : ""}</span>
        </div>
      </button>
    </li>
  );
}

function App() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<MediaDetail | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  
  useEffect(() => {
    fetch("/api/media-items")
      .then((r) => r.json())
      .then(setMediaItems);
  }, []);

  useEffect(() => {
    if (selectedItem) {
      dialogRef.current?.showModal();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedItem]);

  useEffect(() => {
    if (!selectedItem) {
      setSelectedDetail(null);
      return;
    }

    fetch(`/api/media-items/${selectedItem.id}`)
      .then((r) => r.json())
      .then(setSelectedDetail);
  }, [selectedItem]);

  function handleClose() {
    dialogRef.current?.close();
    setSelectedItem(null);
  }

  function handlePlay() {
    if (!selectedItem) return;
    fetch("/api/history-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media: selectedItem.id,
        date: Math.floor(Date.now() / 1000),
      }),
    });
  }

  return (
    <>
      <ul className="grid list-none grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {mediaItems.map((item) => (
          <MediaCard key={item.id} item={item} onSelect={setSelectedItem} />
        ))}
      </ul>
      <dialog
        ref={dialogRef}
        onClose={handleClose}
        className="box-border m-0 h-screen max-h-screen w-screen max-w-screen border-none p-0"
      >
        <div className="flex h-full w-full flex-col">
          <header className="flex items-center gap-2 p-2">
            <button onClick={handleClose}>Close</button>
            <h3 className="m-0">{selectedItem?.title}</h3>
            <button onClick={handlePlay}>Play</button>
          </header>
          <div className="flex flex-1">
            <main className="min-w-0 flex-1">
              {selectedItem && (
                <video
                  src={`/api/video/${selectedItem.id}/stream`}
                  controls
                  autoPlay
                  className="block min-h-0 w-full h-full bg-black"
                />
              )}
            </main>
            <aside className="w-64 border-l p-4 overflow-y-auto">
              {selectedDetail && (
                <dl className="space-y-2">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">日時</dt>
                    <dd>{formatDateTime(selectedDetail.date)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">種別</dt>
                    <dd>{selectedDetail.type ?? "未設定"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">再生時間</dt>
                    <dd>{formatDuration(selectedDetail.duration)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">レート</dt>
                    <dd>{selectedDetail.rate ?? "未設定"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">タグ</dt>
                    <dd>{selectedDetail.tags ?? "未設定"}</dd>
                  </div>
                </dl>
              )}
            </aside>
          </div>
        </div>
      </dialog>
    </>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
