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
    }
  }, [selectedItem]);

  function handleClose() {
    dialogRef.current?.close();
    setSelectedItem(null);
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
      <dialog ref={dialogRef} onClose={handleClose}>
        {selectedItem && <video src={`/api/video/${selectedItem.id}/stream`} controls autoPlay />}
      </dialog>
    </>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
