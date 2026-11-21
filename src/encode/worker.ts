// エンコード用ワーカー (Web とは別のプロセス/コンテナで動かす)
// - upload の動画を解析 (ffprobe) して一覧用にキャッシュする
// - エンコード待ちのジョブを1本ずつ、低優先度 (nice) で処理する
// - 再起動したら、実行中だったジョブを続きから再開する (av1an の作業フォルダを残しておく)
import fs from "node:fs"
import os from "node:os"
import { encodePaths } from "./config.js"
import {
  appendLog, claimNextJob, encodeDb, finishJob, isCancelRequested, listProbes, loadSettings,
  markRestartHandled, requeueInterruptedJobs, saveProbe, updateProgress, writeHeartbeat, type Job,
} from "./db.js"
import { listVideoFiles } from "./files.js"
import { runPipeline, workDirFor } from "./pipeline.js"
import { probeMedia } from "./probe.js"
import { CanceledError } from "./process.js"

const POLL_MS = 3000
const SCAN_MS = 30_000

function lowerPriority() {
  try {
    os.setPriority(19)
  } catch {}
}

function timestamp() {
  return new Date().toLocaleString("ja-JP", { hour12: false })
}

// upload の新しいファイル・変わったファイルだけ解析する
async function scanUploads() {
  const probes = listProbes()
  for (const file of listVideoFiles(encodePaths.uploadDir)) {
    const cached = probes.get(file.name)
    if (cached && cached.size === file.size && cached.mtime === file.mtime) continue
    try {
      const info = await probeMedia(`${encodePaths.uploadDir}/${file.name}`)
      saveProbe({ file: file.name, size: file.size, mtime: file.mtime, info, error: null })
    } catch (err) {
      saveProbe({ file: file.name, size: file.size, mtime: file.mtime, info: null, error: err instanceof Error ? err.message : String(err) })
    }
  }
}

async function processJob(job: Job) {
  const controller = new AbortController()
  const runStart = Date.now()
  const elapsed = () => job.elapsedMs + (Date.now() - runStart)
  const log = (text: string) => {
    console.log(`[job ${job.id}] ${text}`)
    appendLog(job.id, `[${timestamp()}] ${text}\n`)
  }
  let lastWrite = 0
  const progress = (stage: string, value: number) => {
    // 書き込みすぎないよう 2秒に1回まで
    const now = Date.now()
    if (now - lastWrite < 2000 && value < 1) return
    lastWrite = now
    updateProgress(job.id, stage, Math.max(0, Math.min(1, value)), elapsed())
  }
  const cancelWatcher = setInterval(() => {
    if (isCancelRequested(job.id)) controller.abort()
  }, 2000)

  const work = workDirFor(job)
  if (job.restart) {
    // 最初から (または再試行): 前回の作業フォルダを消す
    fs.rmSync(work, { recursive: true, force: true })
    markRestartHandled(job.id)
    log(`開始: ${job.file} (${job.attempts} 回目)`)
  } else {
    log(`再開: ${job.file}`)
  }
  const settings = job.settings!
  log(`設定: ${JSON.stringify(settings)}`)

  try {
    const result = await runPipeline(job, settings, { signal: controller.signal, log, progress })
    finishJob(job.id, "done", { result, elapsedMs: elapsed() })
    fs.rmSync(work, { recursive: true, force: true })
    log(`完了 (${Math.round(elapsed() / 1000)} 秒)`)
  } catch (err) {
    if (err instanceof CanceledError) {
      log("キャンセルしました")
      finishJob(job.id, "canceled", { elapsedMs: elapsed() })
      fs.rmSync(work, { recursive: true, force: true })
    } else {
      const message = err instanceof Error ? err.message : String(err)
      log(`失敗: ${message}`)
      finishJob(job.id, "failed", { error: message, elapsedMs: elapsed() })
    }
  } finally {
    clearInterval(cancelWatcher)
  }
}

let stopping = false

async function main() {
  lowerPriority()
  encodeDb()
  fs.mkdirSync(encodePaths.outputDir, { recursive: true })
  console.log(`エンコードワーカー起動: upload=${encodePaths.uploadDir} encoded=${encodePaths.outputDir} db=${encodePaths.dbPath}`)
  const resumed = requeueInterruptedJobs()
  if (resumed) console.log(`前回中断したジョブ ${resumed} 件を再開します`)

  // 解析はエンコード中も並行して行う (新しく置いた動画がすぐ一覧に出るように)
  let scanning = false
  const scan = () => {
    if (scanning) return
    scanning = true
    scanUploads()
      .catch((err) => console.error("upload の解析に失敗:", err))
      .finally(() => {
        scanning = false
      })
  }
  scan()
  setInterval(scan, SCAN_MS)
  writeHeartbeat()
  setInterval(writeHeartbeat, 10_000)

  while (!stopping) {
    const job = claimNextJob(loadSettings())
    if (job) {
      await processJob(job)
      continue
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS))
  }
}

// 停止時 (docker stop) は実行中のジョブを「実行中」のまま残し、次の起動時に続きから再開する
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    stopping = true
    console.log("停止します (実行中のジョブは次回起動時に再開)")
    process.exit(0)
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
