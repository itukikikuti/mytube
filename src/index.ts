import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { z } from 'zod'
import Database from "better-sqlite3"

const mediaItemRowSchema = z.object({
  id: z.number(),
  title: z.string(),
  date: z.number().transform((unixSeconds) =>
    new Date(unixSeconds * 1000).toLocaleDateString()
  ),
  type: z.string(),
  duration: z.number(),
  rate: z.number().transform((filledHearts) =>
    `${'♥'.repeat(filledHearts)}${'♡'.repeat(5 - filledHearts)}`
  ),
})

const mediaItemIdListSchema = z.array(mediaItemRowSchema.pick({ id: true, title: true }))

const db: Database.Database = new Database("data/db.sqlite")

const app = new Hono()

app.use('/static/*', serveStatic({ root: './' }))
app.use('/videos/*', serveStatic({ root: './' }))

app.get('/', serveStatic({ path: './static/index.html' }))

app.get("/medias", (c) => {
  const rows = mediaItemIdListSchema.parse(db.prepare("SELECT id,title FROM media_items").all())

  return c.html(rows.map((row) => `
    <div id="media-${row.id}" class="media-item" data-media-id="${row.id}" onclick="playVideo('/videos/${encodeURIComponent(row.title)}')"></div>
  `).join(''))
})

app.get("/medias/:id", (c) => {
  const row = db.prepare("SELECT * FROM media_items WHERE id = ?").get(c.req.param("id"));

  if (!row) {
    return c.notFound()
  }

  const mediaItem = mediaItemRowSchema.parse(row)

  return c.html(`
    <div class="media-item-thumb"></div>
    <p class="media-item-title">${mediaItem.title}</p>
    <div class="media-item-meta">
      <span>${mediaItem.date}</span>
      <span>${mediaItem.rate}</span>
    </div>
  `)
})

const port = Number(process.env.PORT ?? 3000)

serve({ fetch: app.fetch, port })

console.log(`Server running at http://localhost:${port}`)
