import fs from "node:fs"
import path from "node:path"
import { Hono } from "hono"
import { serveStatic } from "@hono/node-server/serve-static"
import { encodePaths } from "./config.js"
import { encodePathSegments, listVideoFiles, resolveInside, sendFile } from "./files.js"
import { escapeHtml, formatSize } from "./html.js"

// エンコード確認画面 (/encode)。既存の一覧・DB とは独立している
export const encodeApp = new Hono()

encodeApp.get("/", serveStatic({ path: "./static/encode.html" }))

// 出力先での名前: upload からの相対パスの拡張子を .mp4 にしたもの
function encodedName(name: string) {
  const parsed = path.posix.parse(name)
  return path.posix.join(parsed.dir, `${parsed.name}.mp4`)
}

encodeApp.get("/list", (c) => {
  const files = listVideoFiles(encodePaths.uploadDir)
  if (files.length === 0) {
    return c.html(`<p class="encode-empty">upload フォルダに動画がありません</p>`)
  }
  return c.html(files.map((file) => {
    const outName = encodedName(file.name)
    const outFile = resolveInside(encodePaths.outputDir, outName)
    const outSize = outFile && fs.existsSync(outFile) ? fs.statSync(outFile).size : null
    return `
      <div class="encode-item">
        <div>
          <p class="encode-item-name">${escapeHtml(file.name)}</p>
          <div class="encode-item-meta">
            <span>${formatSize(file.size)}</span>
            ${outSize !== null ? `<span>→ ${formatSize(outSize)}</span>` : ""}
          </div>
        </div>
        <div class="encode-item-actions">
          ${outSize !== null ? `
            <button type="button" class="encode-btn" data-compare-open
              data-encoded-src="/encode/media/encoded/${escapeHtml(encodePathSegments(outName))}"
              data-original-src="/encode/media/upload/${escapeHtml(encodePathSegments(file.name))}">確認</button>
          ` : ""}
        </div>
      </div>
    `
  }).join(""))
})

// 元動画・エンコード結果の配信 (Range 対応)
encodeApp.get("/media/:root{upload|encoded}/:path{.+}", (c) => {
  const dir = c.req.param("root") === "upload" ? encodePaths.uploadDir : encodePaths.outputDir
  // param は Hono がデコード済み
  const file = resolveInside(dir, c.req.param("path"))
  return file ? sendFile(c, file) : c.notFound()
})
