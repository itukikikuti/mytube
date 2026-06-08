import express from "express";
import itemsRouter from "./routes/mediaItems";

const app = express();

app.use(express.static("public"));
app.use("/api/media-items", itemsRouter);

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
