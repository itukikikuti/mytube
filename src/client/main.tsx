import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

type MediaItem = { id: number; title: string };

type MediaSummary = MediaItem & {
  date?: number;
  type?: string;
  duration?: number;
  rate?: number;
  tags?: string;
  lastPlayedAt?: number;
  playCount?: number;
};

type MediaDetail = MediaSummary & {
  thumbs?: string;
};

type SortKey =
  | "dateDesc"
  | "dateAsc"
  | "recentPlayDesc"
  | "durationDesc"
  | "durationAsc"
  | "rateDesc"
  | "playCountDesc"
  | "shuffle"
  | "titleAsc";

function shuffleRank(id: number, seed: number) {
  let value = id ^ (seed + 1);

  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);

  return (value ^ (value >>> 16)) >>> 0;
}

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
        <span key={i} className={i < value ? "text-rose-400 drop-shadow-[0_1px_1px_rgba(255,255,255,0.65)]" : "text-rose-200"}>
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
        className="group flex h-72 w-full cursor-pointer flex-col overflow-hidden rounded-[28px] border border-rose-200/70 bg-white/80 p-4 text-left shadow-[0_16px_40px_rgba(233,187,205,0.22)] backdrop-blur-sm transition hover:-translate-y-1 hover:border-rose-300/80 hover:shadow-[0_22px_50px_rgba(233,187,205,0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
      >
        <div className="relative mb-3 aspect-video w-full overflow-hidden rounded-[22px] bg-black ring-1 ring-white/70">
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
                      className="h-full min-w-full object-contain bg-black"
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
                        idx === currentThumbIndex ? "w-4 bg-white" : "bg-white/55"
                      }`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <span className="flex h-full items-center justify-center text-sm font-semibold text-rose-500/80">
              サムネイルなし
            </span>
          )}
          {cardData?.duration != null && (
            <span className="absolute bottom-2 right-2 rounded-full bg-white/88 px-2.5 py-1 text-xs font-semibold text-rose-700 shadow-sm backdrop-blur-sm">
              {formatDuration(cardData.duration)}
            </span>
          )}
        </div>
        <p
          className="mb-3 flex-1 overflow-hidden text-base font-bold leading-6 text-rose-950/85"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {item.title}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 text-sm text-rose-700/75">
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

  // 適用済みのフィルタ条件（visibleItems の算出に使う）
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("dateDesc");
  const [minRate, setMinRate] = useState<number>(0);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [unwatchedOnly, setUnwatchedOnly] = useState(false);

  // 編集中の下書き条件（入力欄にバインド）
  const [draftQuery, setDraftQuery] = useState("");
  const [draftSortKey, setDraftSortKey] = useState<SortKey>("dateDesc");
  const [draftMinRate, setDraftMinRate] = useState<number>(0);
  const [draftSelectedTypes, setDraftSelectedTypes] = useState<string[]>([]);
  const [draftUnwatchedOnly, setDraftUnwatchedOnly] = useState(false);
  const [shuffleVersion, setShuffleVersion] = useState(0);

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
        case "recentPlayDesc":
          return num(summaryB?.lastPlayedAt) - num(summaryA?.lastPlayedAt);
        case "durationDesc":
          return num(summaryB?.duration) - num(summaryA?.duration);
        case "durationAsc":
          return num(summaryA?.duration) - num(summaryB?.duration);
        case "rateDesc":
          return num(summaryB?.rate) - num(summaryA?.rate);
        case "playCountDesc":
          return num(summaryB?.playCount) - num(summaryA?.playCount);
        case "shuffle": {
          const rankA = shuffleRank(a.id, shuffleVersion);
          const rankB = shuffleRank(b.id, shuffleVersion);

          return rankA - rankB || a.id - b.id;
        }
        case "titleAsc":
          return a.title.localeCompare(b.title, "ja");
        case "dateDesc":
        default:
          return num(summaryB?.date) - num(summaryA?.date);
      }
    });
  }, [mediaItems, mediaSummariesById, minRate, query, selectedTypes, shuffleVersion, sortKey, unwatchedOnly]);

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

    const playedAt = Math.floor(Date.now() / 1000);

    fetch("/api/history-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media: selectedItem.id,
        date: playedAt,
      }),
    });

    setMediaSummariesById((current) => {
      const summary = current[selectedItem.id];

      if (!summary) return current;

      return {
        ...current,
        [selectedItem.id]: {
          ...summary,
          lastPlayedAt: playedAt,
          playCount: (summary.playCount ?? 0) + 1,
        },
      };
    });

    setSelectedDetail((current) =>
      current
        ? {
            ...current,
            lastPlayedAt: playedAt,
            playCount: (current.playCount ?? 0) + 1,
          }
        : current,
    );
  }

  const hasDraftChanges =
    draftQuery !== query ||
    draftSortKey !== sortKey ||
    draftMinRate !== minRate ||
    draftUnwatchedOnly !== unwatchedOnly ||
    draftSelectedTypes.length !== selectedTypes.length ||
    draftSelectedTypes.some((t) => !selectedTypes.includes(t));

  function applyFilters() {
    setQuery(draftQuery);
    setSortKey(draftSortKey);
    setMinRate(draftMinRate);
    setSelectedTypes(draftSelectedTypes);
    setUnwatchedOnly(draftUnwatchedOnly);

    if (draftSortKey === "shuffle") {
      setShuffleVersion((current) => current + 1);
    }
  }

  function toggleType(type: string) {
    setDraftSelectedTypes((current) =>
      current.includes(type) ? current.filter((value) => value !== type) : [...current, type],
    );
  }

  function resetFilters() {
    setDraftQuery("");
    setDraftSortKey("dateDesc");
    setDraftMinRate(0);
    setDraftSelectedTypes([]);
    setDraftUnwatchedOnly(false);
    setQuery("");
    setSortKey("dateDesc");
    setMinRate(0);
    setSelectedTypes([]);
    setUnwatchedOnly(false);
  }

  return (
    <>
      <div className="app-shell">
        <div className="app-frame">
          <section className="sticky top-0 z-10 px-4 py-4 backdrop-blur-md">
            <div className="rounded-[32px] border border-white/70 bg-[rgba(255,255,255,0.72)] px-4 py-4 shadow-[0_18px_50px_rgba(232,192,206,0.28)] ring-1 ring-rose-100/70 md:px-5">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                    <input
                      type="search"
                      value={draftQuery}
                      onChange={(event) => setDraftQuery(event.target.value)}
                      onKeyDown={(event) => { if (event.key === "Enter") applyFilters(); }}
                      placeholder="タイトルで検索"
                      className="w-full rounded-full border border-rose-200/80 bg-white/90 px-4 py-2.5 text-sm text-rose-950/80 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                    />
                    <select
                      value={draftSortKey}
                      onChange={(event) => setDraftSortKey(event.target.value as SortKey)}
                      className="rounded-full border border-rose-200/80 bg-white/90 px-4 py-2.5 text-sm text-rose-950/80 outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                    >
                      <option value="dateDesc">新しい順</option>
                      <option value="dateAsc">古い順</option>
                      <option value="recentPlayDesc">最近再生した順</option>
                      <option value="durationDesc">長い順</option>
                      <option value="durationAsc">短い順</option>
                      <option value="rateDesc">レート高い順</option>
                      <option value="playCountDesc">再生回数順</option>
                      <option value="shuffle">シャッフル</option>
                      <option value="titleAsc">タイトル順</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={applyFilters}
                      className={`rounded-full border px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 ${
                        hasDraftChanges
                          ? "border-rose-400 bg-gradient-to-b from-rose-400 to-rose-500 text-white hover:border-rose-500"
                          : "border-rose-200/90 bg-gradient-to-b from-white to-rose-50 text-rose-700 hover:border-rose-300"
                      }`}
                    >
                      {hasDraftChanges ? "● 適用" : "適用"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFilters((current) => !current)}
                      className="rounded-full border border-rose-200/90 bg-gradient-to-b from-white to-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 shadow-sm hover:-translate-y-0.5 hover:border-rose-300"
                    >
                      {showFilters ? "詳細フィルタを閉じる" : "詳細フィルタ"}
                    </button>
                    <button
                      type="button"
                      onClick={resetFilters}
                      disabled={!hasActiveFilters && !hasDraftChanges}
                      className="rounded-full border border-amber-200/90 bg-gradient-to-b from-white to-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 shadow-sm hover:-translate-y-0.5 hover:border-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      リセット
                    </button>
                  </div>
                </div>

                {showFilters && (
                  <div className="grid gap-3 rounded-[28px] border border-rose-100/90 bg-white/78 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] md:grid-cols-2 xl:grid-cols-4">
                    <label className="flex flex-col gap-1.5 rounded-[22px] border border-rose-100/70 bg-rose-50/45 p-3 text-sm font-medium text-rose-800/85">
                      レート
                      <select
                        value={draftMinRate}
                        onChange={(event) => setDraftMinRate(Number(event.target.value))}
                        className="rounded-full border border-rose-200/80 bg-white/90 px-3 py-2 text-sm font-normal text-rose-950/80 outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                      >
                        <option value={0}>指定なし</option>
                        <option value={3}>3以上</option>
                        <option value={4}>4以上</option>
                        <option value={5}>5のみ</option>
                      </select>
                    </label>

                    <fieldset className="flex flex-col gap-2 rounded-[22px] border border-rose-100/70 bg-white/65 p-3">
                      <legend className="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-400">種別</legend>
                      {availableTypes.length === 0 ? (
                        <span className="text-sm text-rose-500/75">種別なし</span>
                      ) : (
                        availableTypes.map((type) => (
                          <label key={type} className="flex items-center gap-2 text-sm text-rose-900/80">
                            <input
                              type="checkbox"
                              checked={draftSelectedTypes.includes(type)}
                              onChange={() => toggleType(type)}
                              className="h-4 w-4 rounded border-rose-300 text-rose-400 accent-rose-400"
                            />
                            {type}
                          </label>
                        ))
                      )}
                    </fieldset>

                    <fieldset className="flex flex-col gap-2 rounded-[22px] border border-amber-100/80 bg-amber-50/50 p-3">
                      <legend className="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">その他</legend>
                      <label className="flex items-center gap-2 text-sm text-amber-900/80">
                        <input
                          type="checkbox"
                          checked={draftUnwatchedOnly}
                          onChange={(event) => setDraftUnwatchedOnly(event.target.checked)}
                          className="h-4 w-4 rounded border-amber-300 text-amber-400 accent-amber-400"
                        />
                        未視聴のみ
                      </label>
                    </fieldset>
                  </div>
                )}

                <p className="text-sm font-medium text-rose-600/80">
                  {visibleItems.length}件 / 全{mediaItems.length}件
                </p>
              </div>
            </div>
          </section>

          <ul className="grid list-none grid-cols-1 gap-5 px-4 pb-6 pt-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
            <div className="px-4 pb-8 text-sm font-medium text-rose-500/80">条件に一致するメディアがありません。</div>
          )}
        </div>
      </div>
      <dialog
        ref={dialogRef}
        onClose={handleClose}
        className="box-border m-0 h-screen max-h-screen w-screen max-w-screen border-none bg-transparent p-3 md:p-5"
      >
        <div className="flex h-full w-full flex-col overflow-hidden rounded-[34px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,253,255,0.97),rgba(255,247,242,0.95))] shadow-[0_30px_80px_rgba(177,134,158,0.28)]">
          <header className="flex items-center gap-2 border-b border-rose-100/80 bg-white/70 p-3 backdrop-blur-sm md:p-4">
            <button
              onClick={handleClose}
              className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-sm font-semibold text-rose-700 shadow-sm hover:-translate-y-0.5 hover:border-rose-300"
            >
              Close
            </button>
            <h3 className="min-w-0 flex-1 truncate text-base font-bold text-rose-950/85 md:text-lg">
              {selectedItem?.title}
            </h3>
            <button
              onClick={handlePlay}
              className="rounded-full border border-amber-200 bg-gradient-to-b from-amber-50 to-orange-50 px-4 py-1.5 text-sm font-semibold text-amber-700 shadow-sm hover:-translate-y-0.5 hover:border-amber-300"
            >
              Play
            </button>
          </header>
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <main className="min-w-0 flex-1 bg-[#2f2235] p-2 md:p-3">
              <div className="h-full overflow-hidden rounded-[26px] bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                {selectedItem && (
                  <video
                    src={`/api/video/${selectedItem.id}/stream`}
                    controls
                    autoPlay
                    className="block h-full min-h-0 w-full bg-black"
                  />
                )}
              </div>
            </main>
            <aside className="cute-scrollbar w-full overflow-y-auto border-t border-rose-100/80 bg-white/72 p-4 md:w-72 md:border-l md:border-t-0 md:p-5">
              {selectedDetail && (
                <dl className="space-y-3">
                  <div className="rounded-[22px] border border-rose-100/75 bg-rose-50/55 p-3">
                    <dt className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-400">日時</dt>
                    <dd className="text-sm text-rose-950/80">{formatDateTime(selectedDetail.date)}</dd>
                  </div>
                  <div className="rounded-[22px] border border-rose-100/75 bg-white/75 p-3">
                    <dt className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-400">種別</dt>
                    <dd className="text-sm text-rose-950/80">{selectedDetail.type ?? "未設定"}</dd>
                  </div>
                  <div className="rounded-[22px] border border-amber-100/80 bg-amber-50/55 p-3">
                    <dt className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">再生時間</dt>
                    <dd className="text-sm text-amber-950/80">{formatDuration(selectedDetail.duration)}</dd>
                  </div>
                  <div className="rounded-[22px] border border-rose-100/75 bg-white/75 p-3">
                    <dt className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-400">レート</dt>
                    <dd>{selectedDetail.rate != null ? <RatingHearts rate={selectedDetail.rate} /> : "未設定"}</dd>
                  </div>
                  <div className="rounded-[22px] border border-amber-100/80 bg-amber-50/55 p-3">
                    <dt className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">タグ</dt>
                    <dd className="text-sm text-amber-950/80">{selectedDetail.tags ?? "未設定"}</dd>
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
