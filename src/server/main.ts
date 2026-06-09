import express from "express";
import mediaItemsRouter from "./routes/mediaItems";
import videoStreamRouter from "./routes/videoStream";

const app = express();

app.use(express.static("public"));
app.use("/api/media-items", mediaItemsRouter);
app.use("/api/video", videoStreamRouter);

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
