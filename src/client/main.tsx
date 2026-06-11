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
      <ul>
        {mediaItems.map((item) => (
          <li key={item.id} onClick={() => setSelectedItem(item)} className="cursor-pointer">
            {item.title}
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
          <div>
            <main className="min-w-0 flex-1">
              {selectedItem && (
                <video
                  src={`/api/video/${selectedItem.id}/stream`}
                  controls
                  autoPlay
                  className="block min-h-0 w-full flex-1 bg-black"
                />
              )}
            </main>
            <aside>
              {selectedDetail && (
                <dl>
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
