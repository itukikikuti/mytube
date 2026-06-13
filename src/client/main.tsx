import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

type MediaItem = { id: number; title: string };

type MediaSummary = MediaItem & {
  date?: number;
  type?: string;
  duration?: number;
  rate?: number;
  tags?: string;
  playCount?: number;
};

type MediaDetail = MediaSummary & {
  thumbs?: string;
};

type SortKey =
  | "dateDesc"
  | "dateAsc"
  | "durationDesc"
  | "durationAsc"
  | "rateDesc"
  | "playCountDesc"
  | "titleAsc";

function parseThumbs(thumbs?: string) {
  if (!thumbs) return [];

  try {
    const parsed = JSON.parse(thumbs);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

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

function RatingHearts({ rate }: { rate?: number }) {
  const value = rate ?? 0;
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < value ? "text-pink-400" : "text-slate-300"}>
          ♥
        </span>
      ))}
    </span>
  );
}

function MediaCard({
  item,
  summary,
  onSelect,
}: {
  item: MediaItem;
  summary?: MediaSummary;
  onSelect: (item: MediaItem) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [detail, setDetail] = useState<MediaDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [currentThumbIndex, setCurrentThumbIndex] = useState(0);
  const thumbs = useMemo(() => parseThumbs(detail?.thumbs), [detail?.thumbs]);
  const cardData = detail ?? summary;

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
    if (thumbs.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentThumbIndex((prev) => (prev + 1) % thumbs.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [thumbs]);

  return (
    <li className="h-full">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => onSelect(item)}
        className="group flex h-72 w-full cursor-pointer flex-col rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
      >
        <div className="relative mb-3 aspect-video w-full overflow-hidden rounded-lg bg-slate-100">
          {thumbs.length > 0 ? (
            <>
              <div className="relative h-full w-full overflow-hidden">
                <div
                  className="flex h-full transition-transform duration-500"
                  style={{
                    transform: `translateX(${-currentThumbIndex * 100}%)`,
                  }}
                >
                  {thumbs.map((thumb: string) => (
                    <img
                      key={thumb}
                      src={`data:image/jpeg;base64,${thumb}`}
                      alt={item.title}
                      className="h-full min-w-full object-cover"
                    />
                  ))}
                </div>
              </div>
              {thumbs.length > 1 && (
                <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                  {thumbs.map((_: string, idx: number) => (
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
          {cardData?.duration != null && (
            <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
              {formatDuration(cardData.duration)}
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
          <span>
            {cardData
              ? `${cardData.playCount ?? 0}回・${formatDate(cardData.date) || "日付なし"}`
              : (isDetailLoading ? "取得中..." : "")}
          </span>
          {cardData?.rate != null && <RatingHearts rate={cardData.rate} />}
        </div>
      </button>
    </li>
  );
}

function App() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [mediaSummariesById, setMediaSummariesById] = useState<Record<number, MediaSummary>>({});
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<MediaDetail | null>(null);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("dateDesc");
  const [minRate, setMinRate] = useState<number>(0);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [unwatchedOnly, setUnwatchedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const availableTypes = useMemo(() => {
    return Array.from(
      new Set(Object.values(mediaSummariesById).map((summary) => summary.type).filter(Boolean) as string[]),
    ).sort((a, b) => a.localeCompare(b, "ja"));
  }, [mediaSummariesById]);

  const hasActiveFilters =
    query.trim().length > 0 ||
    minRate > 0 ||
    selectedTypes.length > 0 ||
    unwatchedOnly ||
    sortKey !== "dateDesc";

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = mediaItems.filter((item) => {
      const summary = mediaSummariesById[item.id];

      if (normalizedQuery && !item.title.toLowerCase().includes(normalizedQuery)) {
        return false;
      }

      if (selectedTypes.length > 0 && (!summary?.type || !selectedTypes.includes(summary.type))) {
        return false;
      }

      if (minRate > 0 && (summary?.rate ?? 0) < minRate) {
        return false;
      }

      if (unwatchedOnly && (summary?.playCount ?? 0) > 0) {
        return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      const summaryA = mediaSummariesById[a.id];
      const summaryB = mediaSummariesById[b.id];

      const num = (value?: number) => value ?? 0;

      switch (sortKey) {
        case "dateAsc":
          return num(summaryA?.date) - num(summaryB?.date);
        case "durationDesc":
          return num(summaryB?.duration) - num(summaryA?.duration);
        case "durationAsc":
          return num(summaryA?.duration) - num(summaryB?.duration);
        case "rateDesc":
          return num(summaryB?.rate) - num(summaryA?.rate);
        case "playCountDesc":
          return num(summaryB?.playCount) - num(summaryA?.playCount);
        case "titleAsc":
          return a.title.localeCompare(b.title, "ja");
        case "dateDesc":
        default:
          return num(summaryB?.date) - num(summaryA?.date);
      }
    });
  }, [mediaItems, mediaSummariesById, minRate, query, selectedTypes, sortKey, unwatchedOnly]);

  useEffect(() => {
    fetch("/api/media-items/summary")
      .then((response) => response.json())
      .then((summaries: MediaSummary[]) => {
        setMediaItems(summaries.map(({ id, title }) => ({ id, title })));
        setMediaSummariesById(
          Object.fromEntries(summaries.map((summary) => [summary.id, summary])),
        );
      });
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

  function toggleType(type: string) {
    setSelectedTypes((current) =>
      current.includes(type) ? current.filter((value) => value !== type) : [...current, type],
    );
  }

  function resetFilters() {
    setQuery("");
    setSortKey("dateDesc");
    setMinRate(0);
    setSelectedTypes([]);
    setUnwatchedOnly(false);
  }

  return (
    <>
      <section className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="タイトルで検索"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
              <select
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as SortKey)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              >
                <option value="dateDesc">新しい順</option>
                <option value="dateAsc">古い順</option>
                <option value="durationDesc">長い順</option>
                <option value="durationAsc">短い順</option>
                <option value="rateDesc">レート高い順</option>
                <option value="playCountDesc">再生回数順</option>
                <option value="titleAsc">タイトル順</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFilters((current) => !current)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {showFilters ? "詳細フィルタを閉じる" : "詳細フィルタ"}
              </button>
              <button
                type="button"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                リセット
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                レート
                <select
                  value={minRate}
                  onChange={(event) => setMinRate(Number(event.target.value))}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
                >
                  <option value={0}>指定なし</option>
                  <option value={3}>3以上</option>
                  <option value={4}>4以上</option>
                  <option value={5}>5のみ</option>
                </select>
              </label>

              <fieldset className="flex flex-col gap-1 rounded-lg border border-slate-200 p-2">
                <legend className="px-1 text-xs font-medium text-slate-500">種別</legend>
                {availableTypes.length === 0 ? (
                  <span className="text-sm text-slate-500">種別なし</span>
                ) : (
                  availableTypes.map((type) => (
                    <label key={type} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes(type)}
                        onChange={() => toggleType(type)}
                      />
                      {type}
                    </label>
                  ))
                )}
              </fieldset>

              <fieldset className="flex flex-col gap-1 rounded-lg border border-slate-200 p-2">
                <legend className="px-1 text-xs font-medium text-slate-500">その他</legend>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={unwatchedOnly}
                    onChange={(event) => setUnwatchedOnly(event.target.checked)}
                  />
                  未視聴のみ
                </label>
              </fieldset>

            </div>
          )}

          <p className="text-sm text-slate-500">
            {visibleItems.length}件 / 全{mediaItems.length}件
          </p>
        </div>
      </section>

      <ul className="grid list-none grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleItems.map((item) => (
          <MediaCard
            key={item.id}
            item={item}
            summary={mediaSummariesById[item.id]}
            onSelect={setSelectedItem}
          />
        ))}
      </ul>

      {visibleItems.length === 0 && (
        <div className="px-4 pb-8 text-sm text-slate-500">条件に一致するメディアがありません。</div>
      )}
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
                    <dd>{selectedDetail.rate != null ? <RatingHearts rate={selectedDetail.rate} /> : "未設定"}</dd>
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
