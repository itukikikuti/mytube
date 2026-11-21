import { Hono, type Context } from "hono"
import { serveStatic } from "@hono/node-server/serve-static"
import { encodePaths } from "./config.js"
import {
  enqueueJob, enqueueNewJobs, getJob, listJobs, listProbes, loadSettings, readHeartbeat, requestCancel, retryJob, saveSettings,
  type Job, type ProbeRow,
} from "./db.js"
import { encodePathSegments, listVideoFiles, resolveInside, sendFile, type UploadFile } from "./files.js"
import { escapeHtml, formatDuration, formatSize } from "./html.js"
import { encodeSettingsSchema, type EncodeSettings } from "./settings.js"

// エンコード確認画面 (/encode)。既存の一覧・DB とは独立している
export const encodeApp = new Hono()

encodeApp.get("/", serveStatic({ path: "./static/encode.html" }))

const STATUS_LABELS: Record<string, string> = {
  none: "未処理",
  queued: "待ち",
  running: "実行中",
  done: "完了",
  failed: "失敗",
  canceled: "キャンセル",
}

function formatElapsed(ms: number): string {
  const s = Math.round(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h) return `${h}時間${m}分`
  if (m) return `${m}分${s % 60}秒`
  return `${s}秒`
}

function percentChange(from: number, to: number): string {
  const diff = (1 - to / from) * 100
  return diff >= 0 ? `-${diff.toFixed(1)}%` : `+${(-diff).toFixed(1)}%`
}

function mediaUrl(root: "upload" | "encoded", rel: string) {
  return `/encode/media/${root}/${encodePathSegments(rel)}`
}

function probeSummary(probe: ProbeRow | undefined): string {
  if (!probe) return `<span>解析待ち</span>`
  if (!probe.info) return `<span>解析失敗: ${escapeHtml(probe.error ?? "")}</span>`
  const { info } = probe
  const parts = [`<span>${formatDuration(info.duration)}</span>`]
  if (info.video) parts.push(`<span>${escapeHtml(info.video.codec)} ${info.video.width}×${info.video.height} ${Math.round(info.video.avgFps * 100) / 100}fps</span>`)
  parts.push(`<span>${info.audio ? `${escapeHtml(info.audio.codec)} ${info.audio.channels}ch` : "音声なし"}</span>`)
  return parts.join("")
}

function resultSummary(job: Job): string {
  const r = job.result
  if (!r) return ""
  const parts: string[] = []
  if (r.encodedSize) parts.push(`<span>${formatSize(r.sourceSize)} → <strong>${formatSize(r.encodedSize)}</strong> (${percentChange(r.sourceSize, r.encodedSize)})</span>`)
  if (r.metrics?.vmaf) parts.push(`<span>VMAF 平均 <strong>${r.metrics.vmaf.mean.toFixed(2)}</strong> / 下位1% ${r.metrics.vmaf.p1.toFixed(2)}</span>`)
  if (r.crf) parts.push(`<span>CRF ${r.crf.min === r.crf.max ? r.crf.min : `${r.crf.min}〜${r.crf.max}`}</span>`)
  parts.push(`<span>${formatElapsed(job.elapsedMs)}</span>`)
  parts.push(r.decision === "encoded"
    ? `<span class="encode-decision-encoded">結果を採用</span>`
    : `<span class="encode-decision-original" title="${escapeHtml(r.reason)}">元を採用</span>`)
  return `<div class="encode-item-result">${parts.join("")}</div>`
}

// 見比べを開くボタン (詳細だけでも開ける)
function compareButton(job: Job, fps: number) {
  const encodedSrc = job.result?.outputFile ? mediaUrl("encoded", job.result.outputFile) : ""
  return `
    <button type="button" class="encode-btn" data-compare-open
      data-encoded-src="${escapeHtml(encodedSrc)}"
      data-original-src="${escapeHtml(mediaUrl("upload", job.file))}"
      data-fps="${fps}"
      data-detail-url="/encode/jobs/${job.id}">${encodedSrc ? "確認" : "詳細"}</button>
  `
}

function jobActions(job: Job | undefined, file: string, fps: number): string {
  const fileField = `hx-vals='${escapeHtml(JSON.stringify({ file }))}'`
  if (!job) {
    return `<button type="button" class="encode-btn encode-btn-primary" hx-post="/encode/jobs" ${fileField} hx-swap="none">エンコード</button>`
  }
  const buttons: string[] = []
  if (job.status === "queued" || job.status === "running") {
    buttons.push(`<button type="button" class="encode-btn" hx-post="/encode/jobs/${job.id}/cancel" hx-swap="none" ${job.cancelRequested ? "disabled" : ""}>キャンセル</button>`)
  } else {
    buttons.push(`<button type="button" class="encode-btn" hx-post="/encode/jobs/${job.id}/retry" hx-swap="none" hx-confirm="もう一度エンコードしますか？ (前回の結果は上書きされます)">${job.status === "done" ? "再エンコード" : "再試行"}</button>`)
  }
  buttons.push(compareButton(job, fps))
  return buttons.join("")
}

function listItem(file: UploadFile | null, name: string, probe: ProbeRow | undefined, job: Job | undefined): string {
  const status = job?.status ?? "none"
  const fps = probe?.info?.video?.avgFps ?? 30
  const showProgress = status === "running" || status === "queued"
  const stage = status === "running" && job?.stage ? ` ${escapeHtml(job.stage)}` : ""
  return `
    <div class="encode-item">
      <div>
        <p class="encode-item-name">${escapeHtml(name)}</p>
        <div class="encode-item-meta">
          <span class="encode-status" data-status="${status}">${STATUS_LABELS[status]}${stage}${status === "running" ? ` ${Math.floor((job?.progress ?? 0) * 100)}%` : ""}</span>
          ${file ? `<span>${formatSize(file.size)}</span>${probeSummary(probe)}` : `<span>upload にファイルがありません</span>`}
        </div>
        ${job ? resultSummary(job) : ""}
        ${job?.status === "failed" && job.error ? `<div class="encode-item-result"><span>${escapeHtml(job.error.split("\n")[0])}</span></div>` : ""}
      </div>
      <div class="encode-item-actions">${file || job ? jobActions(job, name, fps) : ""}</div>
      ${showProgress ? `<div class="encode-progress"><div style="width: ${((job?.progress ?? 0) * 100).toFixed(1)}%"></div></div>` : ""}
    </div>
  `
}

encodeApp.get("/list", (c) => {
  const files = listVideoFiles(encodePaths.uploadDir)
  const probes = listProbes()
  const jobs = new Map(listJobs().map((job) => [job.file, job]))
  const items = files.map((file) => listItem(file, file.name, probes.get(file.name), jobs.get(file.name)))
  // upload から無くなったファイルのジョブも残っていれば表示する
  const fileNames = new Set(files.map((f) => f.name))
  for (const job of jobs.values()) {
    if (!fileNames.has(job.file)) items.push(listItem(null, job.file, undefined, job))
  }

  const counts: Record<string, number> = {}
  for (const job of jobs.values()) counts[job.status] = (counts[job.status] ?? 0) + 1
  const heartbeat = readHeartbeat()
  const workerAlive = heartbeat !== null && Date.now() - heartbeat < 60_000
  const doneJobs = [...jobs.values()].filter((j) => j.status === "done" && j.result)
  const totalSource = doneJobs.reduce((s, j) => s + j.result!.sourceSize, 0)
  const totalFinal = doneJobs.reduce((s, j) => s + (j.result!.decision === "encoded" ? j.result!.encodedSize ?? j.result!.sourceSize : j.result!.sourceSize), 0)
  const summary = [
    `${files.length} 本`,
    ...["running", "queued", "done", "failed", "canceled"].filter((s) => counts[s]).map((s) => `${STATUS_LABELS[s]} ${counts[s]}`),
    totalSource ? `完了分 ${formatSize(totalSource)} → ${formatSize(totalFinal)} (${percentChange(totalSource, totalFinal)})` : "",
    workerAlive ? "ワーカー稼働中" : `⚠ ワーカー停止中${heartbeat ? ` (最終 ${new Date(heartbeat).toLocaleString("ja-JP")})` : ""}`,
  ].filter(Boolean).join("・")

  return c.html(`
    <div id="encode-summary" hx-swap-oob="true">${escapeHtml(summary)}</div>
    ${items.length ? items.join("") : `<p class="encode-empty">upload フォルダに動画がありません (${escapeHtml(encodePaths.uploadDir)})</p>`}
  `)
})

// ===== ジョブ操作 (結果は一覧・詳細のポーリングに任せ、すぐ反映させるためにイベントを返す) =====
function changed(c: Context) {
  c.header("HX-Trigger", "encode-changed")
  return c.body(null, 204)
}

encodeApp.post("/jobs", async (c) => {
  const form = await c.req.parseBody()
  const files = listVideoFiles(encodePaths.uploadDir).map((f) => f.name)
  if (form.all) {
    enqueueNewJobs(files)
  } else if (typeof form.file === "string" && files.includes(form.file)) {
    enqueueJob(form.file)
  } else {
    return c.text("ファイルが見つかりません", 404)
  }
  return changed(c)
})

encodeApp.post("/jobs/:id{[0-9]+}/cancel", (c) => {
  requestCancel(Number(c.req.param("id")))
  return changed(c)
})

encodeApp.post("/jobs/:id{[0-9]+}/retry", (c) => {
  retryJob(Number(c.req.param("id")))
  return changed(c)
})

// ===== 詳細 (確認モーダルの右側) =====
function metricRows(job: Job): string {
  const r = job.result
  if (!r) return ""
  const rows: [string, string][] = []
  rows.push(["判定", r.decision === "encoded" ? `<span class="encode-decision-encoded">結果を採用</span>` : `<span class="encode-decision-original">元を採用</span>`])
  rows.push(["理由", escapeHtml(r.reason)])
  rows.push(["元サイズ", `${formatSize(r.sourceSize)} (${r.sourceSize.toLocaleString()} B)`])
  if (r.encodedSize) {
    rows.push(["結果サイズ", `${formatSize(r.encodedSize)} (${r.encodedSize.toLocaleString()} B)`])
    rows.push(["削減率", percentChange(r.sourceSize, r.encodedSize)])
  }
  const vm = r.metrics?.vmaf
  if (vm) rows.push(["VMAF", `平均 ${vm.mean.toFixed(2)} / 調和平均 ${vm.harmonic.toFixed(2)}<br>下位5% ${vm.p5.toFixed(2)} / 下位1% ${vm.p1.toFixed(2)} / 最小 ${vm.min.toFixed(2)}`])
  const xp = r.metrics?.xpsnr
  if (xp) rows.push(["XPSNR", `Y ${xp.y.toFixed(2)} / U ${xp.u.toFixed(2)} / V ${xp.v.toFixed(2)} dB`])
  if (r.crf) rows.push(["CRF", r.crf.scenes > 1 ? `${r.crf.min}〜${r.crf.max} (平均 ${r.crf.mean}、${r.crf.scenes} シーン)` : String(r.crf.min)])
  rows.push(["所要時間", formatElapsed(job.elapsedMs)])
  if (r.timings) rows.push(["内訳", Object.entries(r.timings).map(([k, v]) => `${escapeHtml(k)} ${formatElapsed(v * 1000)}`).join(" / ")])
  if (r.frames) rows.push(["フレーム数", `元 ${r.frames.source} / 結果 ${r.frames.encoded}`])
  if (r.durations) rows.push(["尺", `元 ${r.durations.source.toFixed(3)}秒 / 結果 ${r.durations.encoded.toFixed(3)}秒`])
  rows.push(["元動画", r.originalPlayable ? "そのまま再生可・デコードエラーなし" : escapeHtml(r.originalNote ?? "再生に問題あり")])
  if (r.outputFile) rows.push(["出力", `encoded/${escapeHtml(r.outputFile)}`])
  return rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")
}

function settingsSummary(s: EncodeSettings): string {
  if (s.method === "single-crf") {
    return `7月方式 (1本1 CRF): サンプル VMAF 平均 ≥ ${s.targetQuality}、SVT-AV1 preset ${s.preset} (探索 ${s.probePreset})、CRF ${s.crfMin}〜${s.crfMax}、10bit、Opus ${s.audioBitrate}k`
  }
  return `Av1an シーンごと: ${s.targetMetric} ${s.targetQuality}〜${s.targetQuality + s.targetTolerance} (${s.probingStat})、SVT-AV1 preset ${s.preset} (探索 ${s.probePreset})、CRF ${s.crfMin}〜${s.crfMax}、探索 ${s.probes} 回、10bit、Opus ${s.audioBitrate}k${s.svtParams ? `、追加 ${s.svtParams}` : ""}`
}

encodeApp.get("/jobs/:id{[0-9]+}", (c) => {
  const job = getJob(Number(c.req.param("id")))
  if (!job) return c.notFound()
  const active = job.status === "running" || job.status === "queued"
  const r = job.result
  const scenes = r?.worstScenes?.length ? `
    <h3>画質が低い場面 (押すとその位置で一時停止)</h3>
    <div class="encode-scenes">
      ${r.worstScenes.map((s) => `<button type="button" data-seek="${s.time}">${formatDuration(s.time)}.${Math.floor((s.time % 1) * 10)} (VMAF ${s.vmaf.toFixed(1)})</button>`).join("")}
    </div>
  ` : ""
  return c.html(`
    <div class="encode-detail" hx-get="/encode/jobs/${job.id}" hx-trigger="${active ? "every 3s, " : ""}encode-changed from:body" hx-swap="outerHTML">
      <h2>${escapeHtml(job.file)}</h2>
      <div class="encode-detail-actions">
        <span class="encode-status" data-status="${job.status}">${STATUS_LABELS[job.status]}${job.status === "running" ? ` ${escapeHtml(job.stage)} ${Math.floor(job.progress * 100)}%` : ""}</span>
        ${active
          ? `<button type="button" class="encode-btn" hx-post="/encode/jobs/${job.id}/cancel" hx-swap="none">キャンセル</button>`
          : `<button type="button" class="encode-btn" hx-post="/encode/jobs/${job.id}/retry" hx-swap="none" hx-confirm="もう一度エンコードしますか？">${job.status === "done" ? "再エンコード" : "再試行"}</button>`}
      </div>
      ${job.error ? `<p>${escapeHtml(job.error)}</p>` : ""}
      ${r ? `<dl>${metricRows(job)}</dl>` : ""}
      ${scenes}
      ${job.settings ? `<h3>採用した設定</h3><p>${escapeHtml(settingsSummary(job.settings))}</p>` : ""}
      <h3>ログ</h3>
      <pre class="encode-log">${escapeHtml(job.log || "(まだありません)")}</pre>
    </div>
  `)
})

// ===== 設定 =====
const SETTING_FIELDS: { key: keyof EncodeSettings; label: string; hint: string; options?: [string, string][] }[] = [
  { key: "method", label: "方式", hint: "Av1an はシーンごとに目標画質ぎりぎりの CRF を探す。7月方式は1本を1つの CRF で", options: [["av1an", "Av1an (シーンごと)"], ["single-crf", "7月方式 (1本1 CRF)"]] },
  { key: "targetMetric", label: "目標の指標 (Av1an)", hint: "VMAF は 0〜100、XPSNR は dB (40 前後)", options: [["vmaf", "VMAF"], ["xpsnr-weighted", "XPSNR (重み付き)"]] },
  { key: "targetQuality", label: "目標値", hint: "VMAF 95 前後 = 劣化がほぼ分からない (安全側)" },
  { key: "targetTolerance", label: "許容幅", hint: "目標値〜目標値+許容幅 に収まる CRF を探す" },
  { key: "probingStat", label: "シーン内の判定方法", hint: "percentile=5 = 悪い方から5%のフレームで判定。mean = 平均" },
  { key: "preset", label: "SVT-AV1 プリセット", hint: "小さいほど遅く高圧縮 (2〜4 推奨)" },
  { key: "probePreset", label: "探索用プリセット", hint: "探索の試しエンコード用。速いほど探索は早いが目安は粗くなる" },
  { key: "crfMin", label: "CRF 下限", hint: "" },
  { key: "crfMax", label: "CRF 上限", hint: "" },
  { key: "probes", label: "探索回数 (シーンごと)", hint: "" },
  { key: "workers", label: "並列シーン数", hint: "1 本あたりメモリ約 1.5GB (1080p)" },
  { key: "svtParams", label: "SVT-AV1 追加パラメータ", hint: "例: --tune 0 --enable-variance-boost 1" },
  { key: "audioBitrate", label: "音声 Opus kbps", hint: "" },
  { key: "keepRatio", label: "元を採用する大きさ", hint: "結果が元のこの倍率以上なら「縮まない」として元を採用 (0.95 = 5% 未満しか減らない)" },
  { key: "acceptVmafMean", label: "合格ライン: VMAF 平均", hint: "全編測定の平均がこれ未満なら元を採用" },
  { key: "acceptVmafLow", label: "合格ライン: VMAF 下位1%", hint: "全編測定の下位1%がこれ未満なら元を採用" },
]

function settingsForm(settings: EncodeSettings, message = "") {
  const fields = SETTING_FIELDS.map((f) => {
    const value = String(settings[f.key])
    const input = f.options
      ? `<select name="${f.key}">${f.options.map(([v, l]) => `<option value="${v}"${v === value ? " selected" : ""}>${l}</option>`).join("")}</select>`
      : `<input name="${f.key}" value="${escapeHtml(value)}"${typeof settings[f.key] === "number" ? ` inputmode="decimal"` : ""}>`
    return `<label>${f.label}${input}${f.hint ? `<small>${f.hint}</small>` : ""}</label>`
  }).join("")
  return `
    <form class="encode-settings-form" hx-post="/encode/settings" hx-swap="outerHTML">
      ${fields}
      <div class="encode-settings-actions">
        <button type="submit" class="encode-btn encode-btn-primary">保存</button>
        <button type="button" class="encode-btn" hx-post="/encode/settings/reset" hx-target="closest form" hx-swap="outerHTML" hx-confirm="既定値に戻しますか？">既定値に戻す</button>
        <span>${escapeHtml(message || "変更は次に開始するジョブから使われます")}</span>
      </div>
    </form>
  `
}

encodeApp.get("/settings", (c) => c.html(settingsForm(loadSettings())))

encodeApp.post("/settings", async (c) => {
  const parsed = encodeSettingsSchema.safeParse(await c.req.parseBody())
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const label = SETTING_FIELDS.find((f) => f.key === issue.path[0])?.label ?? String(issue.path[0])
    return c.html(settingsForm(loadSettings(), `保存できません: ${label} の値が不正です`))
  }
  if (parsed.data.crfMin > parsed.data.crfMax) {
    return c.html(settingsForm(loadSettings(), "保存できません: CRF 下限が上限より大きいです"))
  }
  saveSettings(parsed.data)
  return c.html(settingsForm(parsed.data, "保存しました"))
})

encodeApp.post("/settings/reset", (c) => {
  const settings = encodeSettingsSchema.parse({})
  saveSettings(settings)
  return c.html(settingsForm(settings, "既定値に戻しました"))
})

// 元動画・エンコード結果の配信 (Range 対応)
encodeApp.get("/media/:root{upload|encoded}/:path{.+}", (c) => {
  const dir = c.req.param("root") === "upload" ? encodePaths.uploadDir : encodePaths.outputDir
  // param は Hono がデコード済み
  const file = resolveInside(dir, c.req.param("path"))
  return file ? sendFile(c, file) : c.notFound()
})
