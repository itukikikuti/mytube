import { Router } from "express";
import db from "../db";

const router = Router();

router.post("/", (req, res) => {
  const { media, date } = req.body;
  db.prepare("INSERT INTO history_items (media, date) VALUES (?, ?)").run(media, date);
  res.status(201).end();
});

export default router;
