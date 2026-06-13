import { Router } from "express";
import db from "../db";

const router = Router();

router.get("/", (req, res) => {
  const rows = db.prepare("SELECT id,title FROM media_items").all();
  res.json(rows);
});

router.get("/summary", (req, res) => {
  const rows = db
    .prepare(
      `SELECT
         media_items.id,
         media_items.title,
         media_items.date,
         media_items.type,
         media_items.duration,
         media_items.rate,
         media_items.tags,
         history_stats.last_played_at AS lastPlayedAt,
         COALESCE(history_stats.play_count, 0) AS playCount
       FROM media_items
       LEFT JOIN (
         SELECT media, COUNT(*) AS play_count, MAX(date) AS last_played_at
         FROM history_items
         GROUP BY media
       ) AS history_stats ON history_stats.media = media_items.id`,
    )
    .all();

  res.json(rows);
});

router.get("/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const row = db
    .prepare(
      `SELECT
         media_items.*,
         history_stats.last_played_at AS lastPlayedAt,
         COALESCE(history_stats.play_count, 0) AS playCount
       FROM media_items
       LEFT JOIN (
         SELECT media, COUNT(*) AS play_count, MAX(date) AS last_played_at
         FROM history_items
         GROUP BY media
       ) AS history_stats ON history_stats.media = media_items.id
       WHERE media_items.id = ?`,
    )
    .get(id);

  if (!row) {
    return res.sendStatus(404);
  }

  res.json(row);
});

export default router;
