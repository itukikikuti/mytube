import fs from "fs";
import path from "path";
import { Router } from "express";
import db from "../db";

const router = Router();

router.get("/:id/stream", (req, res) => {
  const row = db.prepare("SELECT title FROM media_items WHERE id = ?").get(req.params.id) as { title: string } | undefined;
  if (!row) return res.sendStatus(404);

  const filePath = path.resolve("videos", path.basename(row.title)); // パストラバーサル対策
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    // Range Request対応（シーク可能）
    const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "video/mp4",
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    // Range なし（最初から全部）
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

export default router;
