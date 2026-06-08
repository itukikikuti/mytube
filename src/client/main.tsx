import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

type MediaItem = { id: number; title: string };

function App() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);

  useEffect(() => {
    fetch("/api/media-items")
      .then((r) => r.json())
      .then(setMediaItems);
  }, []);

  return (
    <ul>
      {mediaItems.map((item) => (
        <li key={item.id}>{item.title}</li>
      ))}
    </ul>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
