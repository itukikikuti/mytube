import fs from "node:fs"
import path from "node:path"
import Database from "better-sqlite3"
import { z } from "zod"
import { encodePaths } from "./config.js"
import type { MediaInfo } from "./probe.js"
import { defaultEncodeSettings, encodeSettingsSchema, type EncodeSettings } from "./settings.js"

// エンコードの状態は既存の db.sqlite とは別のファイルに持つ (既存テーブルには触れない)
// Web とワーカーの2プロセスから開くので WAL にする
let db: Database.Database | null = null

export function encodeDb(): Database.Database {
  if (db) return db
  fs.mkdirSync(path.dirname(encodePaths.dbPath), { recursive: true })
  db = new Database(encodePaths.dbPath)
  db.pragma("journal_mode = WAL")
  db.pragma("busy_timeout = 5000")
  db.exec(`
    CREATE TABLE IF NOT EXISTS encode_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      stage TEXT NOT NULL DEFAULT '',
      progress REAL NOT NULL DEFAULT 0,
      cancel_requested INTEGER NOT NULL DEFAULT 0,
      restart INTEGER NOT NULL DEFAULT 1,
      attempts INTEGER NOT NULL DEFAULT 0,
      settings TEXT,
      result TEXT,
      error TEXT,
      log TEXT NOT NULL DEFAULT '',
      elapsed_ms INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      started_at INTEGER,
      finished_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS encode_probes (
      file TEXT PRIMARY KEY,
      size INTEGER NOT NULL,
      mtime INTEGER NOT NULL,
      info TEXT,
      error TEXT
    );
    CREATE TABLE IF NOT EXISTS encode_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
  return db
}

export type JobStatus = "queued" | "running" | "done" | "failed" | "canceled"

export type Metrics = {
  vmaf?: { mean: number; harmonic: number; min: number; p1: number; p5: number }
  xpsnr?: { y: number; u: number; v: number; min: number }
}

export type JobResult = {
  decision: "encoded" | "original"
  reason: string
  method: string
  sourceSize: number
  encodedSize?: number
  // encoded フォルダからの相対パス (採用しなかった結果も見比べ用に残す)
  outputFile?: string
  metrics?: Metrics
  worstScenes?: { time: number; vmaf: number }[]
  crf?: { min: number; max: number; mean: number; scenes: number }
  frames?: { source: number; encoded: number }
  durations?: { source: number; encoded: number; audioSource?: number; audioEncoded?: number }
  sourceErrors?: number
  originalPlayable?: boolean
  originalNote?: string
  timings?: Record<string, number>
}

export type Job = {
  id: number
  file: string
  status: JobStatus
  stage: string
  progress: number
  cancelRequested: boolean
  restart: boolean
  attempts: number
  settings: EncodeSettings | null
  result: JobResult | null
  error: string | null
  log: string
  elapsedMs: number
  createdAt: number
  startedAt: number | null
  finishedAt: number | null
}

const jobRowSchema = z.object({
  id: z.number(),
  file: z.string(),
  status: z.enum(["queued", "running", "done", "failed", "canceled"]),
  stage: z.string(),
  progress: z.number(),
  cancel_requested: z.number(),
  restart: z.number(),
  attempts: z.number(),
  settings: z.string().nullable(),
  result: z.string().nullable(),
  error: z.string().nullable(),
  log: z.string(),
  elapsed_ms: z.number(),
  created_at: z.number(),
  started_at: z.number().nullable(),
  finished_at: z.number().nullable(),
})

function toJob(row: unknown): Job {
  const r = jobRowSchema.parse(row)
  return {
    id: r.id,
    file: r.file,
    status: r.status,
    stage: r.stage,
    progress: r.progress,
    cancelRequested: r.cancel_requested === 1,
    restart: r.restart === 1,
    attempts: r.attempts,
    settings: r.settings ? encodeSettingsSchema.parse(JSON.parse(r.settings)) : null,
    result: r.result ? (JSON.parse(r.result) as JobResult) : null,
    error: r.error,
    log: r.log,
    elapsedMs: r.elapsed_ms,
    createdAt: r.created_at,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
  }
}

export function getJob(id: number): Job | null {
  const row = encodeDb().prepare("SELECT * FROM encode_jobs WHERE id = ?").get(id)
  return row ? toJob(row) : null
}

// 一覧用 (ログは重いので含めない)
export function listJobs(): Job[] {
  return encodeDb().prepare("SELECT *, '' AS log FROM encode_jobs").all().map(toJob)
}

// エンコード待ちに入れる。既に待ち・実行中なら何もしない。終わったもの (完了・失敗・キャンセル) はやり直す
export function enqueueJob(file: string): void {
  const now = Date.now()
  encodeDb().prepare(`
    INSERT INTO encode_jobs (file, status, created_at) VALUES (?, 'queued', ?)
    ON CONFLICT(file) DO UPDATE SET
      status = 'queued', stage = '', progress = 0, cancel_requested = 0, restart = 1,
      result = NULL, error = NULL, log = '', elapsed_ms = 0, created_at = excluded.created_at,
      started_at = NULL, finished_at = NULL
    WHERE status IN ('done', 'failed', 'canceled')
  `).run(file, now)
}

// 待ちならすぐキャンセル、実行中ならワーカーに中断を頼む
export function requestCancel(id: number): void {
  const d = encodeDb()
  d.prepare("UPDATE encode_jobs SET status = 'canceled', stage = 'キャンセル', finished_at = ? WHERE id = ? AND status = 'queued'").run(Date.now(), id)
  d.prepare("UPDATE encode_jobs SET cancel_requested = 1 WHERE id = ? AND status = 'running'").run(id)
}

export function retryJob(id: number): void {
  const job = getJob(id)
  if (job) enqueueJob(job.file)
}

// ===== ワーカー用 =====

// 前回ワーカーが止まったときに実行中だったものを待ちに戻す (作業フォルダは残して続きから再開する)
export function requeueInterruptedJobs(): number {
  return encodeDb().prepare("UPDATE encode_jobs SET status = 'queued', stage = '再開待ち' WHERE status = 'running'").run().changes
}

export function claimNextJob(settings: EncodeSettings): Job | null {
  const d = encodeDb()
  return d.transaction(() => {
    const row = d.prepare("SELECT * FROM encode_jobs WHERE status = 'queued' ORDER BY created_at, id LIMIT 1").get()
    if (!row) return null
    const job = toJob(row)
    // 最初から始めるときは今の設定を記録する。再開のときは前回の設定のまま続ける
    const jobSettings = job.restart || !job.settings ? settings : job.settings
    d.prepare(`
      UPDATE encode_jobs SET status = 'running', cancel_requested = 0, settings = ?,
        attempts = attempts + ?, started_at = COALESCE(started_at, ?)
      WHERE id = ?
    `).run(JSON.stringify(jobSettings), job.restart ? 1 : 0, Date.now(), job.id)
    return getJob(job.id)
  })()
}

export function markRestartHandled(id: number): void {
  encodeDb().prepare("UPDATE encode_jobs SET restart = 0 WHERE id = ?").run(id)
}

export function updateProgress(id: number, stage: string, progress: number, elapsedMs: number): void {
  encodeDb().prepare("UPDATE encode_jobs SET stage = ?, progress = ?, elapsed_ms = ? WHERE id = ?").run(stage, progress, elapsedMs, id)
}

const LOG_LIMIT = 300_000

export function appendLog(id: number, text: string): void {
  encodeDb().prepare("UPDATE encode_jobs SET log = substr(log || ?, -?) WHERE id = ?").run(text, LOG_LIMIT, id)
}

export function isCancelRequested(id: number): boolean {
  const row = encodeDb().prepare("SELECT cancel_requested FROM encode_jobs WHERE id = ?").get(id) as { cancel_requested: number } | undefined
  return row?.cancel_requested === 1
}

export function finishJob(id: number, status: "done" | "failed" | "canceled", fields: { result?: JobResult; error?: string; elapsedMs: number }): void {
  encodeDb().prepare(`
    UPDATE encode_jobs SET status = ?, stage = ?, progress = ?, result = ?, error = ?, elapsed_ms = ?, finished_at = ?, cancel_requested = 0
    WHERE id = ?
  `).run(
    status,
    status === "done" ? "完了" : status === "failed" ? "失敗" : "キャンセル",
    status === "done" ? 1 : 0,
    fields.result ? JSON.stringify(fields.result) : null,
    fields.error ?? null,
    fields.elapsedMs,
    Date.now(),
    id,
  )
}

// ===== 解析結果 (ffprobe) のキャッシュ =====

export type ProbeRow = { file: string; size: number; mtime: number; info: MediaInfo | null; error: string | null }

export function listProbes(): Map<string, ProbeRow> {
  const rows = encodeDb().prepare("SELECT * FROM encode_probes").all() as { file: string; size: number; mtime: number; info: string | null; error: string | null }[]
  return new Map(rows.map((r) => [r.file, { ...r, info: r.info ? (JSON.parse(r.info) as MediaInfo) : null }]))
}

export function saveProbe(row: ProbeRow): void {
  encodeDb().prepare(`
    INSERT INTO encode_probes (file, size, mtime, info, error) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(file) DO UPDATE SET size = excluded.size, mtime = excluded.mtime, info = excluded.info, error = excluded.error
  `).run(row.file, row.size, row.mtime, row.info ? JSON.stringify(row.info) : null, row.error)
}

// ===== 設定 =====

export function loadSettings(): EncodeSettings {
  const row = encodeDb().prepare("SELECT value FROM encode_settings WHERE key = 'settings'").get() as { value: string } | undefined
  if (!row) return defaultEncodeSettings
  const parsed = encodeSettingsSchema.safeParse(JSON.parse(row.value))
  return parsed.success ? parsed.data : defaultEncodeSettings
}

export function saveSettings(settings: EncodeSettings): void {
  encodeDb().prepare(`
    INSERT INTO encode_settings (key, value) VALUES ('settings', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(JSON.stringify(settings))
}

// まだジョブの無いファイルだけ待ちに入れる (「全部エンコード」用)
export function enqueueNewJobs(files: string[]): number {
  const d = encodeDb()
  const insert = d.prepare("INSERT INTO encode_jobs (file, status, created_at) VALUES (?, 'queued', ?) ON CONFLICT(file) DO NOTHING")
  return d.transaction(() => {
    let added = 0
    const now = Date.now()
    for (const file of files) added += insert.run(file, now).changes
    return added
  })()
}

// ===== ワーカーの生存確認 =====

export function writeHeartbeat(): void {
  encodeDb().prepare(`
    INSERT INTO encode_settings (key, value) VALUES ('worker_heartbeat', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(String(Date.now()))
}

export function readHeartbeat(): number | null {
  const row = encodeDb().prepare("SELECT value FROM encode_settings WHERE key = 'worker_heartbeat'").get() as { value: string } | undefined
  return row ? Number(row.value) : null
}
