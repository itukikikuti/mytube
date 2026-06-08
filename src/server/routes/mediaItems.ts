import { Router } from "express";
import db from "../db";

const router = Router();

router.get("/", (req, res) => {
  const rows = db.prepare("SELECT title FROM media_items").all();
  res.json(rows);
});

export default router;
