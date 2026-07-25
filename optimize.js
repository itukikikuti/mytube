// upload フォルダの動画を最適化して videos フォルダに出力するスクリプト
// 実行方法: node optimize.js (ffmpeg 本体は ffmpeg-static に同梱されるためインストール不要)

import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import ffmpeg from "fluent-ffmpeg"
import ffmpegPath from "ffmpeg-static"
import ffprobeStatic from "ffprobe-static"

// ===== 設定 =====
const TARGET_VMAF = 90     // 目標画質 (VMAFスコア。95=劣化ほぼ知覚不能, 90=注視すれば分かる程度)
const CRF_MIN = 10         // CRF探索の下限 (これ以上は下げない = ファイル肥大化の歯止め)
const CRF_MAX = 40         // CRF探索の上限
const FALLBACK_CRF = 30    // VMAF測定が使えない環境や探索失敗時の固定CRF
const SAMPLE_SECONDS = 20  // CRF探索に使うサンプル1本の長さ (秒)
const SAMPLE_COUNT = 3     // CRF探索に使うサンプルの数
const SVT_PRESET = 8  // SVT-AV1 の速度 (小さいほど遅くて高圧縮。8が速度と圧縮のバランス点。目安: 6-10)
const AOM_SPEED = 6   // libaom の速度 (小さいほど遅くて高圧縮。目安: 4-8)
const KEEP_THRESHOLD = 0.9 // 元の何倍未満に縮んだら無条件で変換版を採用するか
// ================

// システムの ffmpeg に高速な SVT-AV1 があればそれを使い、なければ同梱の ffmpeg (libaom) を使う
function detectEncoder() {
  const res = spawnSync("ffmpeg", ["-hide_banner", "-encoders"], { encoding: "utf8" })
  if (res.status === 0 && res.stdout.includes("libsvtav1")) {
    return { codec: "libsvtav1", ffmpeg: "ffmpeg", ffprobe: "ffprobe" }
  }
  return { codec: "libaom-av1", ffmpeg: ffmpegPath, ffprobe: ffprobeStatic.path }
}

const encoder = detectEncoder()
ffmpeg.setFfmpegPath(encoder.ffmpeg)
ffmpeg.setFfprobePath(encoder.ffprobe)

// CRF ごとの映像エンコード引数 ([フラグ, 値] のペアで持ち、fluent-ffmpeg と spawnSync の両方で使う)
function videoArgs(crf) {
  return encoder.codec === "libsvtav1"
    ? [["-c:v", "libsvtav1"], ["-crf", crf], ["-preset", SVT_PRESET]]
    : [["-c:v", "libaom-av1"], ["-crf", crf], ["-b:v", 0], ["-cpu-used", AOM_SPEED], ["-row-mt", 1], ["-tiles", "2x2"]]
}

const root = import.meta.dirname
const uploadDir = path.join(root, "upload")
const videosDir = path.join(root, "videos")
const videoExts = new Set([".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v", ".wmv", ".flv", ".ts"])

// fs.rmSync は絵文字入りファイル名で Node がクラッシュすることがあるため unlinkSync を使う
function removeFile(file) {
  try {
    fs.unlinkSync(file)
  } catch {}
}

function formatSize(bytes) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

function probe(file) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file, (err, data) => (err ? reject(err) : resolve(data)))
  })
}

// ブラウザでそのまま再生できる形式か (MP4 コンテナ + 再生互換のあるコーデック)
const WEB_VIDEO_CODECS = new Set(["h264", "av1", "vp9"])
const WEB_AUDIO_CODECS = new Set(["aac", "mp3"])

async function isWebPlayable(src, name) {
  if (path.extname(name).toLowerCase() !== ".mp4") return false
  const meta = await probe(src)
  const video = meta.streams.find((s) => s.codec_type === "video")
  const audio = meta.streams.find((s) => s.codec_type === "audio")
  return Boolean(video) && WEB_VIDEO_CODECS.has(video.codec_name)
    && (!audio || WEB_AUDIO_CODECS.has(audio.codec_name))
}

// 全編をデコードしてエラーが1件もないか検査する (最初のエラーで即中断)
function isCleanSource(src) {
  const res = spawnSync(encoder.ffmpeg, ["-v", "error", "-xerror", "-i", src, "-f", "null", "-"], { stdio: "ignore" })
  return res.status === 0
}

// ===== VMAF ターゲット方式の CRF 探索 =====
// libvmaf (知覚画質スコア測定) が ffmpeg に入っているか
function hasVmaf() {
  const res = spawnSync(encoder.ffmpeg, ["-hide_banner", "-filters"], { encoding: "utf8" })
  return res.status === 0 && res.stdout.includes("libvmaf")
}
const vmafAvailable = hasVmaf()
const VMAF_THREADS = os.availableParallelism()

// 動画の一部を無劣化 (ストリームコピー) で切り出す。開始位置は直前のキーフレームに丸められる
function extractSample(src, start, dest) {
  const args = ["-y", "-ss", String(start), "-i", src, "-t", String(SAMPLE_SECONDS), "-map", "0:v:0", "-c", "copy", dest]
  return spawnSync(encoder.ffmpeg, args, { stdio: "ignore" }).status === 0
}

function encodeSample(sample, crf, dest) {
  const args = ["-y", "-i", sample, ...videoArgs(crf).flat().map(String), "-pix_fmt", "yuv420p10le", "-an", dest]
  return spawnSync(encoder.ffmpeg, args, { stdio: "ignore" }).status === 0
}

// 変換後と元の VMAF スコア (知覚画質の一致度 0-100) を測る
function measureVmaf(distorted, reference) {
  const args = ["-i", distorted, "-i", reference, "-lavfi", `libvmaf=n_threads=${VMAF_THREADS}`, "-f", "null", "-"]
  const res = spawnSync(encoder.ffmpeg, args, { encoding: "utf8" })
  const match = (res.stderr ?? "").match(/VMAF score: ([\d.]+)/)
  return match ? Number(match[1]) : null
}

// サンプルを CRF を変えながらエンコード + VMAF 測定し、目標 VMAF を満たす最大の CRF (=最小ファイル) を二分探索する
async function findBestCrf(src) {
  const meta = await probe(src)
  const duration = Number(meta.format.duration) || 0
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mytube-crf-"))
  try {
    // 短い動画はサンプルを分けず先頭からの1本だけ使う
    const count = duration >= SAMPLE_SECONDS * (SAMPLE_COUNT + 1) ? SAMPLE_COUNT : 1
    const samples = []
    for (let i = 0; i < count; i++) {
      const start = count === 1 ? 0 : (duration * (i + 1)) / (count + 1)
      const dest = path.join(tmpDir, `sample${i}.mkv`)
      if (extractSample(src, start, dest)) samples.push(dest)
    }
    if (samples.length === 0) return null

    const scoreAt = (crf) => {
      let total = 0
      let n = 0
      for (const sample of samples) {
        const trial = path.join(tmpDir, "trial.mp4")
        if (!encodeSample(sample, crf, trial)) continue
        const score = measureVmaf(trial, sample)
        removeFile(trial)
        if (score !== null) {
          total += score
          n++
        }
      }
      return n > 0 ? total / n : null
    }

    let lo = CRF_MIN
    let hi = CRF_MAX
    let vmaf = null
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2)
      const score = scoreAt(mid)
      if (score === null) return null
      console.log(`    crf=${mid} → VMAF ${score.toFixed(1)}`)
      if (score >= TARGET_VMAF) {
        lo = mid
        vmaf = score
      } else {
        hi = mid - 1
      }
    }
    // 一度も目標を満たさず下限まで来た場合はここで下限 CRF を実測する
    if (vmaf === null) {
      vmaf = scoreAt(lo)
      if (vmaf === null) return null
      console.log(`    crf=${lo} → VMAF ${vmaf.toFixed(1)}`)
    }
    return { crf: lo, vmaf }
  } finally {
    for (const file of fs.readdirSync(tmpDir)) removeFile(path.join(tmpDir, file))
    try {
      fs.rmdirSync(tmpDir)
    } catch {}
  }
}

function encode(src, dest, crf, audioArgs) {
  return new Promise((resolve, reject) => {
    ffmpeg(src)
      .outputOptions([
        "-map 0:v:0",
        "-map 0:a:0?",
        ...videoArgs(crf).map((pair) => pair.join(" ")),
        "-pix_fmt yuv420p10le",
        ...audioArgs,
        "-movflags +faststart",
      ])
      .on("progress", (p) => {
        const percent = p.percent ? `${p.percent.toFixed(1)}%` : "-"
        process.stdout.write(`\r  進捗: ${percent} (${p.timemark})  `)
      })
      .on("end", () => {
        process.stdout.write("\r")
        resolve()
      })
      .on("error", (err) => {
        process.stdout.write("\r")
        reject(err)
      })
      .save(dest)
  })
}

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir)
  console.log("upload フォルダを作成しました。動画ファイルを入れてから再実行してください。")
  process.exit(0)
}
fs.mkdirSync(videosDir, { recursive: true })

// 前回中断した際の書きかけファイルを掃除
for (const stale of fs.readdirSync(videosDir).filter((n) => n.endsWith(".encoding.mp4"))) {
  removeFile(path.join(videosDir, stale))
}

const files = fs.readdirSync(uploadDir)
  .filter((name) => videoExts.has(path.extname(name).toLowerCase()))

if (files.length === 0) {
  console.log("upload フォルダに動画ファイルがありません。")
  process.exit(0)
}

const qualityNote = vmafAvailable ? `目標VMAF=${TARGET_VMAF} (crf ${CRF_MIN}-${CRF_MAX} を自動選択)` : `crf=${FALLBACK_CRF} 固定 (libvmaf なし)`
console.log(`${files.length} 件の動画を処理します。(${encoder.codec} ${qualityNote} ${encoder.codec === "libsvtav1" ? `preset=${SVT_PRESET}` : `cpu-used=${AOM_SPEED}`})`)
console.log()

let totalOrig = 0
let totalNew = 0
let index = 0

for (const name of files) {
  const src = path.join(uploadDir, name)
  const outName = `${path.parse(name).name}.mp4`
  const dest = path.join(videosDir, outName)
  const tmp = path.join(videosDir, `${outName}.encoding.mp4`)
  const origSize = fs.statSync(src).size

  index++
  console.log(`[${index}/${files.length}] ${name} (${formatSize(origSize)})`)

  if (fs.existsSync(dest)) {
    console.log("  スキップ: videos に同名ファイルが既にあります")
    console.log()
    continue
  }

  // 目標 VMAF を満たす最大の CRF をサンプルで探索する (libvmaf が無い環境では固定 CRF)
  let crf = FALLBACK_CRF
  if (vmafAvailable) {
    console.log(`  最適な CRF を探索中... (目標 VMAF ${TARGET_VMAF})`)
    try {
      const found = await findBestCrf(src)
      if (found) {
        crf = found.crf
        const note = found.vmaf >= TARGET_VMAF ? "" : " ※下限 CRF でも目標に届かないためそのまま使用"
        console.log(`  CRF ${crf} を採用 (サンプル VMAF ${found.vmaf.toFixed(1)})${note}`)
      } else {
        console.log(`  探索できなかったため既定の CRF ${crf} を使用`)
      }
    } catch {
      console.log(`  探索できなかったため既定の CRF ${crf} を使用`)
    }
  }

  try {
    // 音声はコピーせず常に再エンコードする（元の音声が壊れていても補修されて再生可能になる）
    await encode(src, tmp, crf, ["-c:a aac", "-b:a 128k"])
  } catch (err) {
    console.error(`  エラー: 変換に失敗しました (${err.message})`)
    removeFile(tmp)
    console.log()
    continue
  }

  const newSize = fs.statSync(tmp).size
  let finalSize = newSize

  // 念のため変換結果も全編デコードしてエラーがないか検査する
  console.log("  変換結果を検査中...")
  const encodedClean = isCleanSource(tmp)

  // 変換版に問題がある、またはあまり縮まなかった場合は元ファイルの採用を検討する
  let useOriginal = false
  if (!encodedClean || newSize >= origSize * KEEP_THRESHOLD) {
    console.log("  元ファイルを検査中...")
    try {
      useOriginal = (await isWebPlayable(src, name)) && isCleanSource(src)
    } catch {
      useOriginal = false
    }
  }

  if (useOriginal) {
    removeFile(tmp)
    fs.copyFileSync(src, dest)
    finalSize = origSize
    console.log(`  元ファイルを採用: 十分圧縮済み・Web再生可・エラー0 (${formatSize(origSize)})`)
  } else if (encodedClean) {
    fs.renameSync(tmp, dest)
    const diff = (1 - newSize / origSize) * 100
    const note = diff >= 0 ? `${diff.toFixed(0)}% 削減` : `${(-diff).toFixed(0)}% 増加`
    console.log(`  完了: ${formatSize(origSize)} → ${formatSize(newSize)} (${note})`)
  } else {
    removeFile(tmp)
    console.error("  エラー: 変換結果の検査でエラーが検出され、元ファイルも採用できないためスキップします")
    console.log()
    continue
  }

  totalOrig += origSize
  totalNew += finalSize
  console.log()
}

if (totalOrig > 0) {
  const saved = ((1 - totalNew / totalOrig) * 100).toFixed(0)
  console.log(`合計: ${formatSize(totalOrig)} → ${formatSize(totalNew)} (${saved}% 削減)`)
  console.log("元ファイルは upload フォルダに残っています。videos 内のファイルを確認してから削除してください。")
}
