import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { z } from 'zod'
import Database from "better-sqlite3"

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

  return c.html(rows.map((row) => `
    <div id="media-${row.id}" class="media-item" data-media-id="${row.id}"></div>
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
  const mediaDateText = mediaDate.toLocaleDateString()
  const mediaDateTimeText = mediaDate.toLocaleString()
  const mediaDurationText = escapeHtml(formatDuration(mediaItem.duration))

  return c.html(`
    <div
      data-date="${escapeHtml(mediaDateTimeText)}"
      data-duration="${mediaDurationText}"
      data-play-count="${mediaItem.playCount}"
      data-rate="${mediaItem.rate}"
      data-title="${escapedTitle}"
      onclick="playVideo('/videos/${encodeURIComponent(mediaItem.title)}', this)"
    >
      <div class="media-item-thumb">
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
        <span class="media-item-thumb-duration">${mediaDurationText}</span>
      </div>
      <p class="media-item-title">${escapedTitle}</p>
      <div class="media-item-meta">
        <span>${mediaItem.playCount}回・${escapeHtml(mediaDateText)}</span>
        <span>${'♥'.repeat(mediaItem.rate)}${'♡'.repeat(5 - mediaItem.rate)}</span>
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
