import { Router } from "express";
import db from "../db";

const router = Router();

router.get("/", (req, res) => {
  const rows = db.prepare("SELECT id,title FROM media_items").all();
  res.json(rows);
});

router.get("/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const row = db
    .prepare("SELECT * FROM media_items WHERE id = ?")
    .get(id);

  if (!row) {
    return res.sendStatus(404);
  }

  res.json(row);
});

export default router;
