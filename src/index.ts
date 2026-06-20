import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import Database from "better-sqlite3"

const db: Database.Database = new Database("data/db.sqlite")

const app = new Hono()

app.use('/static/*', serveStatic({ root: './' }))
app.use('/videos/*', serveStatic({ root: './' }))

app.get('/', serveStatic({ path: './static/index.html' }))

app.get("/medias", (c) => {
  const rows = db.prepare("SELECT id,title,date,type,duration,rate FROM media_items").all();
  return c.html(rows.map((row: any) => `
    <li id="media-${row.id}" onclick="playVideo('/videos/${encodeURIComponent(row.title)}')">${row.title}</li>
  `).join(''))
})

const port = Number(process.env.PORT ?? 3000)

serve({ fetch: app.fetch, port })

console.log(`Server running at http://localhost:${port}`)
