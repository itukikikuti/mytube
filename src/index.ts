import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { readFileSync } from 'node:fs'
import { db, mediaItemIdListSchema, mediaItemRowSchema, thumbsListSchema } from './db.js'
import { importNewMedias } from './import.js'
import { backupDatabase } from './backup.js'
import { escapeHtml, formatDuration, formatFileSize, videoUrl } from './format.js'
import { pdfInfo, renderPage } from './pdf.js'
import { encodeApp } from "./encode/routes.js"

const ORDER_BY_MAP: Record<string, string> = {
  date_desc:      "date DESC",
  date_asc:       "date ASC",
  recent:         "(SELECT MAX(date) FROM history_items WHERE media = media_items.id) DESC",
  duration_desc:  "duration DESC",
  duration_asc:   "duration ASC",
  size_desc:      "file_size DESC",
  size_asc:       "file_size ASC",
  rate_desc:      "rate DESC",
  play_count:     "(SELECT COUNT(*) FROM history_items WHERE media = media_items.id) DESC",
  shuffle:        "RANDOM()",
  title:          "title ASC",
  id:             "id ASC",
}

importNewMedias()
setInterval(importNewMedias, 60_000)

const app = new Hono()

app.use('/static/*', serveStatic({ root: './' }))
// videoUrl() で %23 にした # を戻す。
// serveStatic はパスを decodeURI で戻すが、decodeURI は予約文字の %XX を復号しないため。
// ここで戻すのは # だけにする（/ や .. を復号すると、この直前に済んでいる
// パストラバーサル検査をすり抜けてしまうため）。
app.use('/videos/*', serveStatic({
  root: './',
  rewriteRequestPath: (path) => path.replace(/%23/g, "#"),
}))

app.get('/', serveStatic({ path: './static/index.html' }))

// エンコード確認画面 (src/encode)
app.route("/encode", encodeApp)

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
  const mediaFileSizeText = escapeHtml(formatFileSize(mediaItem.file_size))
  const mediaFileSizeDetail = escapeHtml(formatFileSize(mediaItem.file_size, true))
  const book = mediaItem.type === "book" ? pdfInfo(String(mediaItem.id), mediaItem.title) : null

  return c.html(`
    <div
      data-type="${mediaItem.type}"
      data-date="${escapeHtml(mediaDateTimeText)}"
      data-duration="${mediaDurationText}"
      data-size="${mediaFileSizeDetail}"
      data-play-count="${mediaItem.playCount}"
      data-rate="${mediaItem.rate}"
      data-title="${escapedTitle}"
      data-url="${escapeHtml(videoUrl(mediaItem.title))}"
      ${book ? `data-pages="${book.pages}" data-page-ratio="${book.ratio.toFixed(4)}"` : ''}
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
              data-src="${escapeHtml(videoUrl(mediaItem.title))}"
            ></video>
            <span class="media-item-thumb-duration">${mediaDurationText}</span>
          ` : ''}
        ` : `
          <img src="${escapeHtml(videoUrl(mediaItem.title))}" alt="${escapedTitle}" class="media-item-thumb-image">
        `}
      </div>
      <p class="media-item-title">${escapedTitle}</p>
      <div class="media-item-meta">
        <span>${mediaItem.playCount}回・${escapeHtml(mediaDateText)}${mediaFileSizeText ? `・${mediaFileSizeText}` : ''}</span>
        <span class="media-item-rate">
          <span class="media-item-rate-long">${'♥'.repeat(mediaItem.rate)}<span class="media-item-rate-off">${'♥'.repeat(5 - mediaItem.rate)}</span></span>
          <span class="media-item-rate-short">♥${mediaItem.rate}</span>
        </span>
      </div>
    </div>
  `)
})

// 320x180 の JPEG なら base64 で2万文字程度。桁違いのものは弾く
const MAX_THUMB_LENGTH = 1_000_000

function readThumbs(id: string) {
  const row = db.prepare("SELECT thumbs FROM media_items WHERE id = ?").get(id) as { thumbs: string } | undefined
  return row ? thumbsListSchema.parse(JSON.parse(row.thumbs)) : null
}

function writeThumbs(id: string, thumbs: string[]) {
  db.prepare("UPDATE media_items SET thumbs = ? WHERE id = ?").run(JSON.stringify(thumbs), id)
}

app.get("/medias/:id/pages/:page", async (c) => {
  const id = c.req.param("id")
  const row = db.prepare("SELECT title, type FROM media_items WHERE id = ?").get(id) as { title: string, type: string } | undefined
  if (!row || row.type !== "book") {
    return c.notFound()
  }

  const page = Number(c.req.param("page"))
  if (!Number.isInteger(page) || page < 1 || page > pdfInfo(id, row.title).pages) {
    return c.text("invalid page", 400)
  }

  try {
    const file = await renderPage(id, row.title, page)
    return c.body(readFileSync(file), 200, {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    })
  } catch (error) {
    console.error(`Failed to render page ${page} of ${row.title}:`, error)
    return c.text("render failed", 500)
  }
})

app.put("/medias/:id/rate", async (c) => {
  const { rate } = await c.req.json()
  if (!Number.isInteger(rate) || rate < 0 || rate > 5) {
    return c.text("invalid rate", 400)
  }

  const result = db.prepare("UPDATE media_items SET rate = ? WHERE id = ?").run(rate, c.req.param("id"))
  if (!result.changes) {
    return c.notFound()
  }

  return c.body(null, 204)
})

app.post("/medias/:id/thumbs", async (c) => {
  const { thumb } = await c.req.json()
  if (typeof thumb !== "string" || !thumb || thumb.length > MAX_THUMB_LENGTH || !/^[A-Za-z0-9+/]+={0,2}$/.test(thumb)) {
    return c.text("invalid thumb", 400)
  }

  const thumbs = readThumbs(c.req.param("id"))
  if (!thumbs) {
    return c.notFound()
  }

  thumbs.push(thumb)
  writeThumbs(c.req.param("id"), thumbs)
  return c.body(null, 204)
})

app.delete("/medias/:id/thumbs/:index", (c) => {
  const thumbs = readThumbs(c.req.param("id"))
  if (!thumbs) {
    return c.notFound()
  }

  const index = Number(c.req.param("index"))
  if (!Number.isInteger(index) || index < 0 || index >= thumbs.length) {
    return c.text("invalid index", 400)
  }

  thumbs.splice(index, 1)
  writeThumbs(c.req.param("id"), thumbs)
  return c.body(null, 204)
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

backupDatabase()
setInterval(backupDatabase, 3600_000)
