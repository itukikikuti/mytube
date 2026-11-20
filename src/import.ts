import { readdirSync, statSync } from 'node:fs'
import { extname } from 'node:path'
import { execFileSync } from 'node:child_process'
import { db } from './db.js'

const MEDIA_TYPE_MAP: Record<string, string> = {
  ".mp4":   "video",
  ".mkv":   "video",
  ".pdf":   "book",
  ".gif":   "anime",
  ".jpg":   "image",
  ".png":   "image",
  ".webp":  "image",
  ".jfif":  "image",
  ".jpeg":  "image",
  ".avif":  "image",
}

function probeDuration(path: string) {
  try {
    const seconds = Number(execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
      { encoding: "utf8" }
    ))
    return Number.isFinite(seconds) ? Math.floor(seconds) : 0
  } catch {
    return 0
  }
}

export function importNewMedias() {
  const known = new Set(
    (db.prepare("SELECT title FROM media_items").all() as { title: string }[]).map((row) => row.title)
  )
  const insert = db.prepare(`
    INSERT INTO media_items (title, date, type, duration, rate, tags, thumbs, file_size)
    VALUES (?, ?, ?, ?, 0, '[]', '[]', ?)
  `)

  for (const name of readdirSync("videos")) {
    if (known.has(name)) continue
    const type = MEDIA_TYPE_MAP[extname(name).toLowerCase()]
    if (!type) continue
    const path = `videos/${name}`
    const stats = statSync(path)
    if (!stats.isFile()) continue
    const date = Math.floor(stats.birthtimeMs / 1000)
    insert.run(name, date, type, type === "video" ? probeDuration(path) : 0, stats.size)
    console.log(`Imported ${name}`)
  }
}
