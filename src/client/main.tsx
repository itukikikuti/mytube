import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

type MediaItem = { id: number; title: string };

type MediaDetail = MediaItem & {
  date?: number;
  type?: string;
  duration?: number;
  rate?: number;
  tags?: string;
};

function App() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<MediaDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
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
          <li key={item.id} className="h-full">
            <button
              type="button"
              onClick={() => setSelectedItem(item)}
              className="group flex h-72 w-full cursor-pointer flex-col rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              <div className="mb-3 flex aspect-video items-center justify-center rounded-lg bg-slate-100 text-sm font-medium text-slate-500">
                Thumbnail
              </div>
              <p
                className="mb-2 overflow-hidden text-base font-semibold text-slate-900"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {item.title}
              </p>
              <p className="mt-auto text-sm text-slate-500">ID: {item.id}</p>
            </button>
          </li>
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
                  <dt>ID</dt>
                  <dd>{selectedDetail.id}</dd>
                  <dt>Date</dt>
                  <dd>{selectedDetail.date}</dd>
                  <dt>Type</dt>
                  <dd>{selectedDetail.type}</dd>
                  <dt>Duration</dt>
                  <dd>{selectedDetail.duration}</dd>
                  <dt>Rate</dt>
                  <dd>{selectedDetail.rate}</dd>
                  <dt>Tags</dt>
                  <dd>{selectedDetail.tags}</dd>
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
