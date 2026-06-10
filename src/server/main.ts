import express from "express";
import mediaItemsRouter from "./routes/mediaItems";
import historyItemsRouter from "./routes/historyItems";
import videoStreamRouter from "./routes/videoStream";

const app = express();

app.use(express.static("public"));
app.use(express.json());
app.use("/api/media-items", mediaItemsRouter);
app.use("/api/history-items", historyItemsRouter);
app.use("/api/video", videoStreamRouter);

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
