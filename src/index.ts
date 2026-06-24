import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { z } from 'zod'
import Database from "better-sqlite3"

const mediaItemRowSchema = z.object({
  id: z.number(),
  title: z.string(),
  date: z.number().transform((unixSeconds) => new Date(unixSeconds * 1000).toLocaleDateString()),
  type: z.string(),
  duration: z.number(),
  rate: z.number(),
  thumbs: z.string().transform((json) => JSON.parse(json)).pipe(z.array(z.string())),
})

const mediaItemIdListSchema = z.array(z.object({ id: z.number() }))

const db: Database.Database = new Database("data/db.sqlite")

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
  const row = db.prepare("SELECT * FROM media_items WHERE id = ?").get(c.req.param("id"));

  if (!row) {
    return c.notFound()
  }

  const mediaItem = mediaItemRowSchema.parse(row)

  return c.html(`
    <div onclick="playVideo('/videos/${encodeURIComponent(mediaItem.title)}')">
      <div class="media-item-thumb">
        <div class="media-item-thumb-viewport">
          <div class="media-item-thumb-track">
            ${mediaItem.thumbs.map((thumb) => `<img src="data:image/jpeg;base64,${thumb}" alt="${mediaItem.title} thumbnail" class="media-item-thumb-image">`).join('')}
          </div>
        </div>
        ${mediaItem.thumbs.length > 1 ? `
          <div class="media-item-thumb-indicators">
            ${mediaItem.thumbs.map((_, index) => `<div class="media-item-thumb-indicator${index === 0 ? ' is-active' : ''}"></div>`).join('')}
          </div>
        ` : ''}
      </div>
      <p class="media-item-title">${mediaItem.title}</p>
      <div class="media-item-meta">
        <span>${mediaItem.date}</span>
        <span>${'♥'.repeat(mediaItem.rate)}${'♡'.repeat(5 - mediaItem.rate)}</span>
      </div>
    </div>
  `)
})

const port = Number(process.env.PORT ?? 3000)

serve({ fetch: app.fetch, port })

console.log(`Server running at http://localhost:${port}`)
