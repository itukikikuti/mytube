import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

type MediaItem = { id: number; title: string };

function App() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
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
          <li key={item.id} onClick={() => setSelectedItem(item)} style={{ cursor: "pointer" }}>
            {item.title}
          </li>
        ))}
      </ul>
      <dialog ref={dialogRef} onClose={handleClose} style={{
        width: "100vw",
        height: "100vh",
        maxWidth: "100vw",
        maxHeight: "100vh",
        margin: 0,
        padding: 0,
        border: "none",
        boxSizing: "border-box",
      }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          // flex: 1,
          width: "100%",
          height: "100%",
        }}>
          <header style={{
            display: "flex",
            alignItems: "center",
            padding: "0.5rem",
            gap: "0.5rem",
          }}>
            <button onClick={handleClose}>Close</button>
            <h3 style={{
              margin: 0,
            }}>{selectedItem?.title}</h3>
            <button onClick={handlePlay}>Play</button>
          </header>
          {selectedItem && <video src={`/api/video/${selectedItem.id}/stream`} controls autoPlay style={{
            display: "block",
            backgroundColor: "black",
            flex: 1,
            width: "100%",
            minHeight: 0,
          }} />}
        </div>
      </dialog>
    </>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
