import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { z } from 'zod'
import Database from "better-sqlite3"
import { readdirSync, statSync } from 'node:fs'
import { extname } from 'node:path'
import { execFileSync } from 'node:child_process'

const mediaItemRowSchema = z.object({
  id: z.number(),
  title: z.string(),
  date: z.number(),
  type: z.string(),
  duration: z.number(),
  rate: z.number(),
  playCount: z.number(),
  thumbs: z.string().transform((json) => JSON.parse(json)).pipe(z.array(z.string())),
})

const mediaItemIdListSchema = z.array(z.object({ id: z.number() }))

const ORDER_BY_MAP: Record<string, string> = {
  date_desc:      "date DESC",
  date_asc:       "date ASC",
  recent:         "(SELECT MAX(date) FROM history_items WHERE media = media_items.id) DESC",
  duration_desc:  "duration DESC",
  duration_asc:   "duration ASC",
  rate_desc:      "rate DESC",
  play_count:     "(SELECT COUNT(*) FROM history_items WHERE media = media_items.id) DESC",
  shuffle:        "RANDOM()",
  title:          "title ASC",
  id:             "id ASC",
}

const db: Database.Database = new Database("data/db.sqlite")

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

function importNewMedias() {
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

importNewMedias()
setInterval(importNewMedias, 60_000)

function escapeHtml(value: string | number) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]!)
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m)
  return (h > 0 ? `${h}:` : "") + `${mm}:${String(s).padStart(2, "0")}`
}

const app = new Hono()

app.use('/static/*', serveStatic({ root: './' }))
app.use('/videos/*', serveStatic({ root: './' }))

app.get('/', serveStatic({ path: './static/index.html' }))

app.get("/medias", (c) => {
  const sort = c.req.query("sort") ?? ""
  const orderBy = ORDER_BY_MAP[sort] ?? ORDER_BY_MAP.id

  const search = (c.req.query("q") ?? "").trim()
  const types = c.req.queries("type") ?? []
  const rates = (c.req.queries("rate") ?? [])
    .map(Number)
    .filter((n) => Number.isInteger(n))

  const conditions: string[] = []
  const params: unknown[] = []

  if (search) {
    conditions.push("title LIKE ?")
    params.push(`%${search}%`)
  }
  if (types.length) {
    conditions.push(`type IN (${types.map(() => "?").join(",")})`)
    params.push(...types)
  }
  if (rates.length) {
    conditions.push(`rate IN (${rates.map(() => "?").join(",")})`)
    params.push(...rates)
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""
  const rows = mediaItemIdListSchema.parse(
    db.prepare(`SELECT id FROM media_items ${where} ORDER BY ${orderBy}`).all(...params)
  )
  const total = (db.prepare("SELECT COUNT(*) AS n FROM media_items").get() as { n: number }).n
  const filtered = rows.length

  return c.html(`
    <div id="media-count" hx-swap-oob="true">${filtered} / ${total} 件</div>
  ` + rows.map((row) => `
    <div id="media-${row.id}" class="media-item" data-media-id="${row.id}">
      <div>
        <div class="media-item-thumb"></div>
        <p class="media-item-title"></p>
        <div class="media-item-meta"></div>
      </div>
    </div>
  `).join(''))
})

app.get("/medias/:id", (c) => {
  const row = db.prepare(`
    SELECT *, (SELECT COUNT(*) FROM history_items WHERE media = media_items.id) AS playCount
    FROM media_items
    WHERE id = ?
  `).get(c.req.param("id"));

  if (!row) {
    return c.notFound()
  }

  const mediaItem = mediaItemRowSchema.parse(row)
  const escapedTitle = escapeHtml(mediaItem.title)
  const mediaDate = new Date(mediaItem.date * 1000)
  const mediaDateText = mediaDate.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })
  const mediaDateTimeText = mediaDate.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
  const mediaDurationText = escapeHtml(formatDuration(mediaItem.duration))

  return c.html(`
    <div
      data-type="${mediaItem.type}"
      data-date="${escapeHtml(mediaDateTimeText)}"
      data-duration="${mediaDurationText}"
      data-play-count="${mediaItem.playCount}"
      data-rate="${mediaItem.rate}"
      data-title="${escapedTitle}"
      onclick="playVideo('/videos/${encodeURI(mediaItem.title)}', this)"
    >
      <div class="media-item-thumb">
        ${mediaItem.type === 'video' || mediaItem.type === 'book' ? `
          <div class="media-item-thumb-viewport">
            <div class="media-item-thumb-track">
              ${mediaItem.thumbs.map((thumb) => `<img src="data:image/jpeg;base64,${thumb}" alt="${escapedTitle} thumbnail" class="media-item-thumb-image">`).join('')}
            </div>
          </div>
          ${mediaItem.thumbs.length > 1 ? `
            <div class="media-item-thumb-indicators">
              ${mediaItem.thumbs.map((_, index) => `<div class="media-item-thumb-indicator${index === 0 ? ' is-active' : ''}"></div>`).join('')}
            </div>
          ` : ''}
          ${mediaItem.type === 'video' ? `
            <video
              class="media-item-preview"
              muted
              loop
              playsinline
              preload="none"
              data-src="/videos/${encodeURI(mediaItem.title)}"
            ></video>
            <span class="media-item-thumb-duration">${mediaDurationText}</span>
          ` : ''}
        ` : `
          <img src="/videos/${encodeURI(mediaItem.title)}" alt="${escapedTitle}" class="media-item-thumb-image">
        `}
      </div>
      <p class="media-item-title">${escapedTitle}</p>
      <div class="media-item-meta">
        <span>${mediaItem.playCount}回・${escapeHtml(mediaDateText)}</span>
        <span class="media-item-rate">
          <span class="media-item-rate-long">${'♥'.repeat(mediaItem.rate)}<span class="media-item-rate-off">${'♥'.repeat(5 - mediaItem.rate)}</span></span>
          <span class="media-item-rate-short">♥${mediaItem.rate}</span>
        </span>
      </div>
    </div>
  `)
})

app.post("/history", async (c) => {
  const { media } = await c.req.json()
  db.prepare("INSERT INTO history_items (media, date) VALUES (?, ?)")
    .run(media, Math.floor(Date.now() / 1000))
  return c.body(null, 204)
})

const port = Number(process.env.PORT ?? 3000)

serve({ fetch: app.fetch, port })

console.log(`Server running at http://localhost:${port}`)
