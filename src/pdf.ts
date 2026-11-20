// ===== PDF をページ画像として配信する =====
// スマホのブラウザは iframe 内のPDFを描画しないうえ、実物は数百MBあって
// 丸ごと転送できないため、見ているページだけをJPEGにして返す。
import { existsSync, mkdirSync } from 'node:fs'
import { execFile, execFileSync } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const PAGE_DIR = "data/pages"
const pdfInfoCache = new Map<string, { pages: number, ratio: number }>()
const pageRenders = new Map<string, Promise<string>>()

export function pdfInfo(id: string, title: string) {
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

export function renderPage(id: string, title: string, page: number) {
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
