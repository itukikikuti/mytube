import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import Database from "better-sqlite3"

type MediaItem = {
  id: number
  title: string
  date: string
  type: string
  duration: string
  rate: number
}

const db: Database.Database = new Database("data/db.sqlite")

const app = new Hono()

app.use('/static/*', serveStatic({ root: './' }))
app.use('/videos/*', serveStatic({ root: './' }))

app.get('/', serveStatic({ path: './static/index.html' }))

app.get("/medias", (c) => {
  const rows = db.prepare<[], Pick<MediaItem, "id" | "title">>("SELECT id,title FROM media_items").all();
  return c.html(rows.map((row) => `
    <div id="media-${row.id}" data-media-id="${row.id}" onclick="playVideo('/videos/${encodeURIComponent(row.title)}')"></div>
  `).join(''))
})

app.get("/medias/:id", (c) => {
  const row = db.prepare<[string], MediaItem>("SELECT * FROM media_items WHERE id = ?").get(c.req.param("id"));

  if (!row) {
    return c.notFound()
  }

  return c.html(`
    <p>${row.title}</p>
    <p>${row.date}</p>
    <p>${row.type}</p>
    <p>${row.duration}</p>
    <p>${row.rate}</p>
  `)
})

const port = Number(process.env.PORT ?? 3000)

serve({ fetch: app.fetch, port })

console.log(`Server running at http://localhost:${port}`)
