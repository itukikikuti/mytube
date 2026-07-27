import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { z } from 'zod'
import Database from "better-sqlite3"
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync } from 'node:fs'
import { extname } from 'node:path'
import { execFile, execFileSync } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const mediaItemRowSchema = z.object({
  id: z.number(),
  title: z.string(),
  date: z.number(),
  type: z.string(),
  duration: z.number(),
  rate: z.number(),
  file_size: z.number(),
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
  size_desc:      "file_size DESC",
  size_asc:       "file_size ASC",
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

const BACKUP_DIR = "videos/backup"

async function backupDatabase() {
  try {
    // NAS 上で SQLite を開くとロックが取れないため、一旦ローカルに書いてからコピーする
    const tmp = "data/_backup.tmp"
    await db.backup(tmp)
    mkdirSync(BACKUP_DIR, { recursive: true })
    const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14)
    const dest = `${BACKUP_DIR}/db-${stamp}.sqlite`
    copyFileSync(tmp, `${dest}.tmp`)
    renameSync(`${dest}.tmp`, dest) // 転送中の不完全なファイルを有効な世代に見せない
    unlinkSync(tmp)

    // 自分が作った命名のものだけを世代管理の対象にする
    const olds = readdirSync(BACKUP_DIR).filter((f) => /^db-\d{14}\.sqlite$/.test(f)).sort()
    for (const f of olds.slice(0, -24)) unlinkSync(`${BACKUP_DIR}/${f}`)
    console.log(`Backed up database to ${dest}`)
  } catch (error) {
    console.error("Backup failed:", error)
  }
}

function escapeHtml(value: string | number) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]!)
}

// encodeURI は # を素通しするが、それだとブラウザがフラグメント扱いしてURLが
// 途中で切れるため %23 にする。予約文字なので decodeURI では戻らず、
// serveStatic の rewriteRequestPath で戻している。
// 残りは encodeURI のままにし、HTML属性に埋める側で escapeHtml をかける
// （& などが実体参照として解釈されるのを防ぐため）。
function videoUrl(title: string) {
  return `/videos/${encodeURI(title).replace(/#/g, "%23")}`
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m)
  return (h > 0 ? `${h}:` : "") + `${mm}:${String(s).padStart(2, "0")}`
}

const FILE_SIZE_UNITS = ["B", "KB", "MB", "GB", "TB"]

function formatFileSize(bytes: number, precise = false): string {
  if (bytes <= 0) return ""

  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < FILE_SIZE_UNITS.length - 1) {
    value /= 1024
    unit++
  }

  // モーダルは幅の制約が無いので小数第2位まで出す
  if (precise && unit > 0) return `${value.toFixed(2)}${FILE_SIZE_UNITS[unit]}`

  // 一覧は幅を抑えるため、10未満のときだけ小数第1位まで出す
  const text = unit === 0 || value >= 10
    ? String(Math.round(value))
    : value.toFixed(1).replace(/\.0$/, "")
  return `${text}${FILE_SIZE_UNITS[unit]}`
}

// ===== PDF をページ画像として配信する =====
// スマホのブラウザは iframe 内のPDFを描画しないうえ、実物は数百MBあって
// 丸ごと転送できないため、見ているページだけをJPEGにして返す。
const PAGE_DIR = "data/pages"
const pdfInfoCache = new Map<string, { pages: number, ratio: number }>()
const pageRenders = new Map<string, Promise<string>>()

function pdfInfo(id: string, title: string) {
  const cached = pdfInfoCache.get(id)
  if (cached) return cached

  let info = { pages: 0, ratio: 0.7 }
  try {
    const out = execFileSync("pdfinfo", [`videos/${title}`], { encoding: "utf8" })
    const size = out.match(/^Page size:\s+([\d.]+) x ([\d.]+)/m)
    info = {
      pages: Number(out.match(/^Pages:\s+(\d+)/m)?.[1] ?? 0),
      ratio: size ? Number(size[1]) / Number(size[2]) : 0.7,
    }
  } catch {
    // 壊れている場合はページ0件として扱う
  }

  pdfInfoCache.set(id, info)
  return info
}

function renderPage(id: string, title: string, page: number) {
  const file = `${PAGE_DIR}/${id}/${page}.jpg`
  if (existsSync(file)) return Promise.resolve(file)

  // 連続でめくられたときに同じページを何度も変換しない
  const key = `${id}/${page}`
  const running = pageRenders.get(key)
  if (running) return running

  const task = (async () => {
    mkdirSync(`${PAGE_DIR}/${id}`, { recursive: true })
    // -singlefile なので出力は <prefix>.jpg になる
    await execFileAsync("pdftoppm", [
      "-jpeg", "-jpegopt", "quality=80",
      "-scale-to-x", "1200", "-scale-to-y", "-1",
      "-f", String(page), "-l", String(page), "-singlefile",
      `videos/${title}`, `${PAGE_DIR}/${id}/${page}`,
    ])
    return file
  })().finally(() => pageRenders.delete(key))

  pageRenders.set(key, task)
  return task
}

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
  return row ? z.array(z.string()).parse(JSON.parse(row.thumbs)) : null
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
