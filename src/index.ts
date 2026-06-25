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

const app = new Hono()

app.use('/static/*', serveStatic({ root: './' }))
app.use('/videos/*', serveStatic({ root: './' }))

app.get('/', serveStatic({ path: './static/index.html' }))

app.get("/medias", (c) => {
  const rows = mediaItemIdListSchema.parse(db.prepare("SELECT id FROM media_items").all())

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

  return c.html(`
    <div
      data-date="${escapeHtml(mediaDateTimeText)}"
      data-duration="${mediaItem.duration}"
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
