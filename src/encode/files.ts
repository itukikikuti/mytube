import fs from "node:fs"
import path from "node:path"
import { Readable } from "node:stream"
import type { Context } from "hono"
import { getMimeType } from "hono/utils/mime"
import { VIDEO_EXTS } from "./config.js"

export type UploadFile = { name: string; size: number; mtime: number }

// upload フォルダ内の動画を (サブフォルダも含めて) 列挙する。name は upload からの相対パス
export function listVideoFiles(dir: string): UploadFile[] {
  const result: UploadFile[] = []
  const walk = (rel: string) => {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(path.join(dir, rel), { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue
      const childRel = rel ? `${rel}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        walk(childRel)
      } else if (entry.isFile() && VIDEO_EXTS.has(path.extname(entry.name).toLowerCase())) {
        try {
          const stat = fs.statSync(path.join(dir, childRel))
          result.push({ name: childRel, size: stat.size, mtime: Math.floor(stat.mtimeMs) })
        } catch {}
      }
    }
  }
  walk("")
  return result.sort((a, b) => a.name.localeCompare(b.name, "ja"))
}

// 相対パスを dir の中に限定して解決する (.. などで外に出るものは null)
export function resolveInside(dir: string, rel: string): string | null {
  if (!rel || rel.includes("\0")) return null
  const full = path.resolve(dir, rel)
  return full.startsWith(dir + path.sep) ? full : null
}

// URL 用に相対パスの各要素をエンコードする (# や ? を含むファイル名でも壊れないように)
export function encodePathSegments(rel: string): string {
  return rel.split("/").map(encodeURIComponent).join("/")
}

const EXTRA_MIME: Record<string, string> = {
  ".mkv": "video/x-matroska",
  ".mov": "video/quicktime",
  ".m4v": "video/mp4",
  ".ts": "video/mp2t",
  ".avi": "video/x-msvideo",
}

// Range 対応でファイルを返す (動画のシーク用)
export function sendFile(c: Context, file: string) {
  let stat: fs.Stats
  try {
    stat = fs.statSync(file)
    if (!stat.isFile()) return c.notFound()
  } catch {
    return c.notFound()
  }
  const ext = path.extname(file).toLowerCase()
  c.header("Content-Type", EXTRA_MIME[ext] ?? getMimeType(file) ?? "application/octet-stream")
  c.header("Accept-Ranges", "bytes")
  c.header("Last-Modified", stat.mtime.toUTCString())
  const size = stat.size
  const match = /^bytes=(\d*)-(\d*)$/.exec(c.req.header("range") ?? "")
  if (!match || size === 0) {
    c.header("Content-Length", String(size))
    if (c.req.method === "HEAD") return c.body(null, 200)
    return c.body(Readable.toWeb(fs.createReadStream(file)) as ReadableStream, 200)
  }
  let start = match[1] ? Number(match[1]) : size - Number(match[2])
  let end = match[1] && match[2] ? Number(match[2]) : size - 1
  start = Math.max(0, start)
  end = Math.min(end, size - 1)
  if (start > end) {
    c.header("Content-Range", `bytes */${size}`)
    return c.body(null, 416)
  }
  c.header("Content-Length", String(end - start + 1))
  c.header("Content-Range", `bytes ${start}-${end}/${size}`)
  if (c.req.method === "HEAD") return c.body(null, 206)
  return c.body(Readable.toWeb(fs.createReadStream(file, { start, end })) as ReadableStream, 206)
}
