import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { REJECTED_DIR_NAME, WORK_DIR_NAME, encodePaths } from "./config.js"
import type { Job, JobResult, Metrics } from "./db.js"
import { resolveInside } from "./files.js"
import { countPackets, decodeErrors, packetSummary, probeMedia, webPlayableReason, type MediaInfo } from "./probe.js"
import { CanceledError, run, runChecked, type RunOptions } from "./process.js"
import type { EncodeSettings } from "./settings.js"

export type JobContext = {
  signal: AbortSignal
  log: (text: string) => void
  // stage: 画面に出す工程名、progress: 全体の進み具合 0〜1
  progress: (stage: string, progress: number) => void
}

// 工程ごとの全体に占める割合 (進捗バー用の目安)
const WEIGHTS = { check: 0.04, audio: 0.02, video: 0.78, verify: 0.04, measure: 0.12 }

export function workDirFor(job: Job): string {
  return path.join(encodePaths.outputDir, WORK_DIR_NAME, `job-${job.id}`)
}

// 出力先での名前: upload からの相対パスの拡張子を .mp4 にしたもの
export function encodedName(name: string): string {
  const parsed = path.posix.parse(name)
  return path.posix.join(parsed.dir, `${parsed.name}.mp4`)
}

// 探索の段階で「目標画質を満たすと元より小さくならない」と分かったとき (本番のエンコードを省いて元を採用する)
class NotSmallerError extends Error {}

function removeQuietly(target: string) {
  try {
    fs.rmSync(target, { recursive: true, force: true })
  } catch {}
}

function sec(ms: number) {
  return Math.round(ms / 100) / 10
}

// 縮まない・失敗などで元を採用するとき、前回の結果 (encoded / _rejected のどちらか) を消しておく
function removePreviousOutputs(file: string) {
  for (const previous of [encodedName(file), path.posix.join(REJECTED_DIR_NAME, encodedName(file))]) {
    const previousPath = resolveInside(encodePaths.outputDir, previous)
    if (previousPath) removeQuietly(previousPath)
  }
}

// ffmpeg の stderr (-v error) からデコードのエラーの行だけを取り出す (SVT-AV1 は自分の情報を stderr に直接出すので除く)
function errorLines(stderr: string): string[] {
  return stderr.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("Svt["))
}

// 1本の動画をエンコードして、結果を採用するか元を採用するかを決める
export async function runPipeline(job: Job, settings: EncodeSettings, ctx: JobContext): Promise<JobResult> {
  const src = resolveInside(encodePaths.uploadDir, job.file)
  if (!src || !fs.existsSync(src)) throw new Error(`upload に ${job.file} がありません`)
  const work = workDirFor(job)
  fs.mkdirSync(work, { recursive: true })
  const opts: RunOptions = { signal: ctx.signal }
  const timings: Record<string, number> = {}
  const t0 = Date.now()
  const lap = (name: string, from: number) => {
    timings[name] = sec(Date.now() - from)
  }

  // ===== 1. 元動画の解析 =====
  ctx.progress("元動画を解析中", 0)
  const sourceSize = fs.statSync(src).size
  const info = await probeMedia(src, opts)
  if (!info.video) throw new Error("映像ストリームがありません")
  const v = info.video
  ctx.log(`元動画: ${v.codec} ${v.width}x${v.height} ${v.fps.toFixed(3)}fps (平均 ${v.avgFps.toFixed(3)}) ${v.pixFmt} ${info.duration.toFixed(2)}秒 ${sourceSize} バイト` +
    (info.audio ? ` / 音声 ${info.audio.codec} ${info.audio.channels}ch` : " / 音声なし") + (v.rotation ? ` / 回転 ${v.rotation}°` : ""))
  if (Math.abs(v.fps - v.avgFps) > 0.01 * v.fps) ctx.log("注意: 可変フレームレートの可能性があります (尺の検査で確認します)")
  const sourcePackets = await packetSummary(src, opts)
  const sourceFrames = sourcePackets.video.packets
  const unplayable = webPlayableReason(job.file, info)

  // 元動画のデコード検査は、全編をデコードする工程 (音声のエンコード・サンプル作成または探索・av1an 以外の本番) で出たエラーを集める
  // (検査のためだけに全編をもう一度デコードしない)。映像を全編デコードする前に終わったときだけ、映像の検査を別に行う
  const audioErrors: string[] = []
  let videoErrors: string[] | undefined
  let sourceChecked: { errors: number; originalPlayable: boolean; originalNote?: string } | undefined
  const checkSource = async () => {
    if (sourceChecked) return sourceChecked
    if (!videoErrors) {
      const t = Date.now()
      videoErrors = await decodeErrors(src, opts, "video")
      lap("元動画の検査", t)
    }
    const errors = [...videoErrors, ...audioErrors]
    ctx.log(errors.length ? `元動画のデコードでエラー ${errors.length} 件:\n  ${errors.slice(0, 10).join("\n  ")}` : "元動画のデコード: エラーなし")
    const originalPlayable = !unplayable && errors.length === 0
    const originalNote = unplayable ?? (errors.length ? `元動画にデコードエラー ${errors.length} 件` : undefined)
    sourceChecked = { errors: errors.length, originalPlayable, originalNote }
    return sourceChecked
  }
  const base = async (): Promise<JobResult> => {
    const s = await checkSource()
    return {
      decision: "original",
      reason: "",
      method: settings.method,
      sourceSize,
      sourceErrors: s.errors,
      originalPlayable: s.originalPlayable,
      originalNote: s.originalNote,
      timings,
    }
  }
  const playableNote = async () => {
    const s = await checkSource()
    return s.originalPlayable ? "" : ` ※元動画もそのままでは再生に問題あり (${s.originalNote})`
  }

  // ===== 2. 音声: 常に Opus に再エンコード (元の音声が壊れていても補修され、再生できる形になる) =====
  const audioFile = path.join(work, "audio.mka")
  if (info.audio) {
    ctx.progress("音声をエンコード中", WEIGHTS.check)
    let t = Date.now()
    const r = await runChecked("ffmpeg", [
      "-hide_banner", "-nostdin", "-v", "error", "-y", "-err_detect", "ignore_err",
      "-i", src, "-map", "0:a:0", "-vn", "-sn", "-dn",
      "-af", "aresample=async=1",
      "-c:a", "libopus", "-b:a", `${settings.audioBitrate}k`,
      audioFile,
    ], opts)
    audioErrors.push(...errorLines(r.stderr))
    lap("音声", t)
  }
  const audioSize = info.audio ? fs.statSync(audioFile).size : 0

  // ===== 3. 映像 =====
  const videoFile = path.join(work, "video.mkv")
  const videoStart = Date.now()
  let crf: JobResult["crf"]
  const videoProgress = (frac: number, label: string) =>
    ctx.progress(label, WEIGHTS.check + WEIGHTS.audio + WEIGHTS.video * Math.min(1, frac))
  // 本番のエンコード中に映像だけでこれを超えたら、結合しても元の keepRatio 倍を下回らないので打ち切る
  // (MKV と MP4 の入れ物の大きさの差を見込んで 1% の余裕を持たせる)
  const videoSizeLimit = sourceSize * settings.keepRatio * 1.01 - audioSize
  try {
    if (settings.method === "quick") {
      crf = await encodeQuick(src, info, work, videoFile, settings, ctx, videoProgress, videoSizeLimit, (errors) => {
        videoErrors = errors
      })
    } else if (settings.method === "av1an") {
      crf = await encodeWithAv1an(src, info, work, videoFile, settings, ctx, videoProgress)
    } else {
      crf = await encodeWithSingleCrf(src, info, work, videoFile, settings, ctx, videoProgress)
    }
  } catch (err) {
    if (err instanceof CanceledError) throw err
    lap("映像", videoStart)
    const result = await base()
    removePreviousOutputs(job.file)
    lap("合計", t0)
    if (err instanceof NotSmallerError) {
      ctx.log(`本番のエンコードを省略・打ち切り: ${err.message}`)
      return { ...result, reason: `縮まない見込み (${err.message})${await playableNote()}` }
    }
    const message = err instanceof Error ? err.message : String(err)
    ctx.log(`映像のエンコードに失敗: ${message}`)
    return { ...result, reason: `エンコード失敗: ${message.split("\n")[0]}` }
  }
  lap("映像", videoStart)

  // ===== 4. 結合 (MP4: AV1 + Opus、faststart) =====
  const muxed = path.join(work, "out.mp4")
  const audioOffset = info.audio ? -(v.startTime - info.startTime) : 0
  await runChecked("ffmpeg", [
    "-hide_banner", "-nostdin", "-v", "error", "-y",
    ...(v.rotation ? ["-display_rotation", String(v.rotation)] : []),
    "-i", videoFile,
    ...(info.audio ? [...(Math.abs(audioOffset) > 0.001 ? ["-itsoffset", audioOffset.toFixed(6)] : []), "-i", audioFile] : []),
    "-map", "0:v:0", ...(info.audio ? ["-map", "1:a:0"] : []),
    "-c", "copy", "-movflags", "+faststart",
    muxed,
  ], opts)
  const encodedSize = fs.statSync(muxed).size
  const ratio = encodedSize / sourceSize
  const sourceResult = await base()

  // 縮まなければ、検査・画質測定の結果に関わらず元を採用になるので、検査・測定をせずに元を採用する
  if (ratio >= settings.keepRatio) {
    removePreviousOutputs(job.file)
    removeQuietly(muxed)
    lap("合計", t0)
    const reason = `縮まない (元の ${(ratio * 100).toFixed(1)}%、基準 ${(settings.keepRatio * 100).toFixed(0)}% 未満)${await playableNote()}`
    ctx.log(`判定: 元を採用 (${reason}、検査・画質測定は省略)`)
    return { ...sourceResult, reason, encodedSize, crf }
  }

  // ===== 5. 検査 (フレーム数・尺) と全編の画質測定 (VMAF のフレームごとの点数 + XPSNR) =====
  // 変換結果の映像の全編デコード検査は、画質測定で全編をデコードするときに一緒に行う
  ctx.progress("画質を測定中", WEIGHTS.check + WEIGHTS.audio + WEIGHTS.video)
  let t = Date.now()
  const problems: string[] = []
  const encodedPackets = await packetSummary(muxed, opts)
  const encodedFrames = encodedPackets.video.packets
  if (Math.abs(encodedFrames - sourceFrames) > 1) problems.push(`フレーム数が一致しない (元 ${sourceFrames} / 結果 ${encodedFrames})`)
  const srcVideoDuration = sourcePackets.video.duration
  const encVideoDuration = encodedPackets.video.duration
  const tolerance = Math.max(0.2, 2 / (v.avgFps || 30))
  if (Math.abs(srcVideoDuration - encVideoDuration) > tolerance) problems.push(`映像の尺が一致しない (元 ${srcVideoDuration.toFixed(3)}秒 / 結果 ${encVideoDuration.toFixed(3)}秒)`)
  let audioSource: number | undefined
  let audioEncoded: number | undefined
  if (info.audio) {
    audioSource = sourcePackets.audio.duration
    audioEncoded = encodedPackets.audio.duration
    if (Math.abs(audioSource - audioEncoded) > 0.5) problems.push(`音声の尺が一致しない (元 ${audioSource.toFixed(2)}秒 / 結果 ${audioEncoded.toFixed(2)}秒)`)
  }
  const encodedErrors = info.audio ? await decodeErrors(muxed, opts, "audio") : []
  lap("検査", t)

  let metrics: Metrics | undefined
  let worstScenes: JobResult["worstScenes"]
  if (encodedFrames > 0) {
    t = Date.now()
    const measured = await measureQuality(muxed, src, work, v.avgFps || v.fps || 30, encodedFrames, settings.measureSubsample, ctx, (frac) =>
      ctx.progress("画質を測定中", WEIGHTS.check + WEIGHTS.audio + WEIGHTS.video + WEIGHTS.verify + WEIGHTS.measure * frac))
    lap("画質測定", t)
    // 測定のデコードのエラーは元動画のものも混ざる。元動画にエラーがあったときは、変換結果だけを別にデコードして確かめる
    const videoDecodeErrors = sourceResult.sourceErrors ? await decodeErrors(muxed, opts, "video") : measured.errors
    encodedErrors.push(...videoDecodeErrors)
    if (!encodedErrors.length) {
      metrics = measured.metrics
      worstScenes = measured.worstScenes
    }
  }
  if (encodedErrors.length) problems.push(`変換結果のデコードでエラー ${encodedErrors.length} 件 (${encodedErrors[0]})`)
  ctx.log(`検査: フレーム 元 ${sourceFrames} / 結果 ${encodedFrames}、映像 元 ${srcVideoDuration.toFixed(3)}秒 / 結果 ${encVideoDuration.toFixed(3)}秒` +
    (info.audio ? `、音声 元 ${audioSource!.toFixed(2)}秒 / 結果 ${audioEncoded!.toFixed(2)}秒` : "") +
    (problems.length ? `\n問題: ${problems.join(" / ")}` : "、問題なし"))
  const vm = metrics?.vmaf
  if (vm) ctx.log(`VMAF: 平均 ${vm.mean.toFixed(2)} / 調和平均 ${vm.harmonic.toFixed(2)} / 下位5% ${vm.p5.toFixed(2)} / 下位1% ${vm.p1.toFixed(2)} / 最小 ${vm.min.toFixed(2)}`)
  const xp = metrics?.xpsnr
  if (xp) ctx.log(`XPSNR: Y ${xp.y.toFixed(2)} / U ${xp.u.toFixed(2)} / V ${xp.v.toFixed(2)} dB`)

  // ===== 6. 採用の判定 (縮むことは確認済み) =====
  let decision: JobResult["decision"] = "encoded"
  let reason: string
  if (problems.length) {
    decision = "original"
    reason = `検査エラー: ${problems.join(" / ")}`
  } else if (!vm) {
    decision = "original"
    reason = "画質を測定できなかった"
  } else if (vm.mean < settings.acceptVmafMean || vm.p1 < settings.acceptVmafLow) {
    decision = "original"
    reason = `画質が合格ラインに届かない (VMAF 平均 ${vm.mean.toFixed(2)} / 下位1% ${vm.p1.toFixed(2)}、合格ライン ${settings.acceptVmafMean} / ${settings.acceptVmafLow})`
  } else {
    reason = `元の ${(ratio * 100).toFixed(1)}% に縮小、画質は合格ライン以上`
  }
  if (decision === "original") reason += await playableNote()

  // 結果を encoded へ移す。元を採用したときも見比べ用に _rejected に残す
  const outName = decision === "encoded" ? encodedName(job.file) : path.posix.join(REJECTED_DIR_NAME, encodedName(job.file))
  const outPath = resolveInside(encodePaths.outputDir, outName)
  if (!outPath) throw new Error(`出力先のパスが不正です: ${outName}`)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  // 前回の結果 (判定が変わった場合は反対側のフォルダにある) を消してから置く
  removePreviousOutputs(job.file)
  fs.renameSync(muxed, outPath)
  lap("合計", t0)
  ctx.log(`判定: ${decision === "encoded" ? "結果を採用" : "元を採用"} (${reason}) → encoded/${outName}`)

  return {
    ...sourceResult,
    decision,
    reason,
    encodedSize,
    outputFile: outName,
    metrics,
    worstScenes,
    crf,
    frames: { source: sourceFrames, encoded: encodedFrames },
    durations: { source: srcVideoDuration, encoded: encVideoDuration, audioSource, audioEncoded },
  }
}

// ソースの色情報を SVT-AV1 に引き継ぐ (BT.709 などのタグが落ちると色が変わって見えるため)
function colorParams(info: MediaInfo): string[] {
  const v = info.video!
  const map: Record<string, string> = { bt709: "1", bt470bg: "5", smpte170m: "6", bt2020: "9", bt2020nc: "9", "bt2020-10": "14", smpte2084: "16", "arib-std-b67": "18" }
  const args: string[] = []
  if (v.colorPrimaries && map[v.colorPrimaries]) args.push("--color-primaries", map[v.colorPrimaries])
  if (v.colorTransfer && map[v.colorTransfer]) args.push("--transfer-characteristics", map[v.colorTransfer])
  const matrix: Record<string, string> = { bt709: "1", bt470bg: "5", smpte170m: "6", bt2020nc: "9" }
  if (v.colorSpace && matrix[v.colorSpace]) args.push("--matrix-coefficients", matrix[v.colorSpace])
  if (v.colorRange === "pc") args.push("--color-range", "1")
  return args
}

function splitParams(params: string): string[] {
  return params.split(/\s+/).filter(Boolean)
}

// ===== Av1an: シーン分割 + シーンごとの目標画質 (target quality) =====
async function encodeWithAv1an(
  src: string, info: MediaInfo, work: string, output: string, settings: EncodeSettings, ctx: JobContext,
  onProgress: (frac: number, label: string) => void,
): Promise<JobResult["crf"]> {
  const temp = path.join(work, "av1an")
  const logFile = path.join(work, "av1an.log")
  const resume = fs.existsSync(path.join(temp, "done.json"))
  const lp = Math.max(1, Math.floor(os.availableParallelism() / settings.workers))
  const videoParams = ["--preset", String(settings.preset), "--lp", String(lp), ...colorParams(info), ...splitParams(settings.svtParams)]
  const args = [
    "-i", src, "-o", output, "--temp", temp, ...(resume ? ["--resume"] : []), "-y",
    "--log-file", logFile, "--log-level", "debug",
    "--cache-mode", "temp",
    "-e", "svt-av1", "--pix-format", "yuv420p10le",
    "-v", videoParams.join(" "),
    "--target-quality", `${settings.targetQuality}-${settings.targetQuality + settings.targetTolerance}`,
    "--target-metric", settings.targetMetric,
    "--probing-stat", settings.probingStat,
    "--qp-range", `${settings.crfMin}-${settings.crfMax}`,
    "--probes", String(settings.probes),
    // 画質の測定は元の解像度のまま行う (既定の 1920x1080 だと縦動画が引き伸ばされて点数がずれる)
    "--vmaf-res", `${info.video!.width}x${info.video!.height}`,
    "--probe-res", `${info.video!.width}x${info.video!.height}`,
    "--probe-video-params", `--preset ${settings.probePreset}`,
    "-w", String(settings.workers),
    "--sc-downscale-height", "540",
  ]
  ctx.log(`${resume ? "続きから再開: " : ""}av1an ${args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(" ")}`)
  onProgress(0, "シーン検出中")

  // av1an はパイプ出力では進捗を出さないので、作業フォルダの done.json から進み具合を読む
  const totalFrames = info.video!.frames || 1
  const timer = setInterval(() => {
    try {
      const done = JSON.parse(fs.readFileSync(path.join(temp, "done.json"), "utf8")) as { frames?: number; done?: Record<string, { frames: number }> }
      const total = done.frames || totalFrames
      const finished = Object.values(done.done ?? {}).reduce((sum, c) => sum + c.frames, 0)
      onProgress(finished / total, `映像をエンコード中 (${finished}/${total} フレーム)`)
    } catch {}
  }, 3000)
  try {
    const result = await run("av1an", args, {
      signal: ctx.signal,
      onStderr: (line) => {
        if (/ERROR|WARN|error/i.test(line)) ctx.log(`av1an: ${line}`)
      },
    })
    if (result.code !== 0) {
      throw new Error(`av1an が終了コード ${result.code} で失敗しました\n${result.stderr.trim().split("\n").slice(-6).join("\n")}`)
    }
  } finally {
    clearInterval(timer)
  }

  // ログからシーンごとの CRF と点数を拾う
  const scenes = parseAv1anLog(logFile)
  if (scenes.length) {
    ctx.log(`シーンごとの結果 (${scenes.length} シーン):\n` + scenes.map((s) => `  #${s.chunk} ${s.frames}フレーム: CRF ${s.q} → ${settings.targetMetric} ${s.score}`).join("\n"))
    const qs = scenes.map((s) => s.q)
    const totalFramesInScenes = scenes.reduce((sum, s) => sum + s.frames, 0) || 1
    return {
      min: Math.min(...qs),
      max: Math.max(...qs),
      mean: Math.round((scenes.reduce((sum, s) => sum + s.q * s.frames, 0) / totalFramesInScenes) * 10) / 10,
      scenes: scenes.length,
    }
  }
  return undefined
}

function parseAv1anLog(logFile: string): { chunk: string; frames: number; q: number; score: number }[] {
  let text: string
  try {
    text = fs.readFileSync(logFile, "utf8")
  } catch {
    return []
  }
  // 再開したときは同じシーンが複数回出るので、最後のものを使う
  const byChunk = new Map<string, { chunk: string; frames: number; q: number; score: number }>()
  const re = /chunk (\d+): Target=[^\n]*?, (\d+) frames[^\n]*\n(?:[^\n]*\n)*?\s*Final Q=([\d.]+), Final Score=([\d.]+)/g
  for (const m of text.matchAll(re)) {
    byChunk.set(m[1], { chunk: m[1], frames: Number(m[2]), q: Number(m[3]), score: Number(m[4]) })
  }
  return [...byChunk.values()].sort((a, b) => a.chunk.localeCompare(b.chunk))
}

// ===== 速い方式: 動画全体から短い区間を集めたサンプルで CRF を決め、1本全体を1つの CRF でエンコード =====
// av1an のシーンごとの探索は N100 で動画1分あたり15〜30分かかるため、探索はサンプル (既定 8秒分) だけで行う。
// 探索と本番は同じプリセットで行う (プリセットが違うと同じ CRF でも画質が変わり、探索の結果がずれるため)
const QUICK_SEGMENT_SECONDS = 1
// 1 CRF あたり VMAF が下がる量の目安 (CRF 40〜50 あたりの実測。2点そろうまでの次の CRF の見積もりに使う)
const QUICK_VMAF_PER_CRF = 0.35
// 最初に試す CRF (VMAF 平均 95 だと多くの動画で 48〜52 に落ち着く)
const QUICK_START_CRF = 48
// 見積もりで次の CRF へ一度に動かす最大の幅 (見積もりが外れて行き過ぎないように)
const QUICK_MAX_STEP = 8
// サンプルからのサイズの見積もりは粗いので、keepRatio にこれだけ余裕を持たせてから「縮まない」と判断する
const QUICK_SIZE_MARGIN = 0.05

async function encodeQuick(
  src: string, info: MediaInfo, work: string, output: string, settings: EncodeSettings, ctx: JobContext,
  onProgress: (frac: number, label: string) => void,
  // 本番のエンコード中に映像がこのバイト数を超えたら縮まないので打ち切る
  videoSizeLimit: number,
  // 元動画の映像を全編デコードしたときのエラーの行 (サンプル作成か、短い動画は最初の探索で全編をデコードする)
  onSourceDecoded: (errors: string[]) => void,
): Promise<JobResult["crf"]> {
  const opts: RunOptions = { signal: ctx.signal }
  const v = info.video!
  const threads = os.availableParallelism()
  // 中断から再開したときに前回の途中までの出力が残っていると完成品と間違えるので消しておく
  removeQuietly(output)

  // 1. サンプル: 全体に均等に散らばった 1秒の区間を集め、可逆 (FFV1) で1つのファイルにする
  //    短い動画は全編をそのまま使い、探索でエンコードしたものをそのまま本番の結果にする (同じ処理を2回しない)
  onProgress(0, "サンプルを作成中")
  const duration = info.duration
  const whole = duration <= settings.sampleSeconds * 1.5
  const sample = whole ? src : path.join(work, "sample.mkv")
  // 入力側のオプション: 回転はデコード時に適用せず、結合のときに元と同じ回転情報を付ける
  const input = ["-noautorotate", "-i", sample]
  const videoOnly = ["-map", "0:v:0", "-an", "-sn", "-dn", "-fps_mode", "passthrough"]
  let sampleSeconds = duration
  if (!whole) {
    const count = Math.max(1, Math.round(settings.sampleSeconds / QUICK_SEGMENT_SECONDS))
    const ranges: string[] = []
    for (let i = 0; i < count; i++) {
      const start = v.startTime + (duration * (i + 0.5)) / count - QUICK_SEGMENT_SECONDS / 2
      ranges.push(`between(t,${start.toFixed(3)},${(start + QUICK_SEGMENT_SECONDS).toFixed(3)})`)
    }
    // 8bit の 4:2:0 はそのまま保存する (10bit にするのはエンコード・測定のときに同じ変換で行われるので結果は同じ。サンプルの読み書きが軽くなる)
    const sampleFormat = v.pixFmt === "yuv420p" ? "yuv420p" : "yuv420p10le"
    // 選んだ区間以外もデコードはするので、元動画の映像のデコード検査を兼ねる
    const r = await runChecked("ffmpeg", [
      "-hide_banner", "-nostdin", "-v", "error", "-y", "-noautorotate", "-i", src, ...videoOnly,
      "-vf", `select='${ranges.join("+")}',setpts=N/FRAME_RATE/TB,format=${sampleFormat}`, "-c:v", "ffv1", "-threads", String(threads), sample,
    ], opts)
    onSourceDecoded(errorLines(r.stderr))
    const frames = await countPackets(sample, "v:0", opts)
    sampleSeconds = frames / (v.avgFps || v.fps || 30)
    ctx.log(`サンプル: ${count} 区間 × ${QUICK_SEGMENT_SECONDS}秒 (${frames} フレーム)`)
  } else {
    ctx.log(`サンプル: 全編 (${settings.sampleSeconds * 1.5}秒以下のため)`)
  }

  const svt = (crfValue: number) => [
    "-c:v", "libsvtav1", "-preset", String(settings.preset), "-crf", String(crfValue), "-pix_fmt", "yuv420p10le",
    "-svtav1-params", ["lp=" + threads, ...svtParamsForFfmpeg(info, settings)].join(":"),
  ]

  // 2. 探索: サンプルを CRF を変えてエンコードし、VMAF (probingStat で集計) が目標以上になる最大の CRF を探す
  const trialFile = (crfValue: number) => path.join(work, `trial-${crfValue}.mkv`)
  const vmafLog = path.join(work, "trial-vmaf.json")
  const scores = new Map<number, number>()
  const sizes = new Map<number, number>()
  const scoreAt = async (crfValue: number) => {
    const trial = trialFile(crfValue)
    const r = await runChecked("ffmpeg", ["-hide_banner", "-nostdin", "-v", "error", "-y", ...input, ...videoOnly, ...svt(crfValue), trial], opts)
    // 短い動画は探索で全編をデコードしているので、最初の探索を元動画のデコード検査にする
    if (whole && !scores.size) onSourceDecoded(errorLines(r.stderr))
    const align = "settb=1/1000,setpts=N,format=yuv420p10le"
    await runChecked("ffmpeg", ["-hide_banner", "-nostdin", "-v", "error", "-noautorotate", "-i", trial, ...input, "-lavfi",
      `[0:v]${align}[d];[1:v]${align}[r];[d][r]libvmaf=n_threads=${threads}:n_subsample=2:log_fmt=json:log_path=${vmafLog.replace(/[\\':]/g, "\\$&")}`,
      "-f", "null", "-"], opts)
    const data = JSON.parse(fs.readFileSync(vmafLog, "utf8")) as { frames: { metrics: { vmaf: number } }[] }
    const score = aggregate(data.frames.map((f) => f.metrics.vmaf), settings.probingStat)
    scores.set(crfValue, score)
    sizes.set(crfValue, fs.statSync(trial).size)
    ctx.log(`  crf=${crfValue} → サンプル VMAF (${settings.probingStat}) ${score.toFixed(2)}、サイズ見積もり 元の ${(estimateRatio(crfValue) * 100).toFixed(0)}%`)
    return score
  }

  // 結果のサイズの見積もり (元に対する比率): サンプルの映像のビットレート × 尺 + 音声 (Opus)
  const sourceSize = fs.statSync(src).size
  const audioBytesPerSecond = info.audio ? (settings.audioBitrate * 1000) / 8 : 0
  const estimateRatio = (crfValue: number) =>
    ((sizes.get(crfValue) ?? 0) / Math.max(sampleSeconds, 0.1) + audioBytesPerSecond) * duration / sourceSize

  const target = settings.targetQuality
  const clamp = (x: number) => Math.min(settings.crfMax, Math.max(settings.crfMin, Math.round(x)))
  let crf = clamp(QUICK_START_CRF)
  for (let i = 0; i < settings.probes; i++) {
    onProgress((0.35 * i) / settings.probes, `CRF を探索中 (crf ${crf})`)
    await scoreAt(crf)
    // 目標に届かない CRF でもう縮まないなら、合格する (より小さい) CRF はさらに大きくなるので、探索を続けずに元を採用する
    const lowestFailing = [...scores].filter(([, s]) => s < target).sort((a, b) => a[0] - b[0])[0]
    if (lowestFailing && estimateRatio(lowestFailing[0]) >= settings.keepRatio + QUICK_SIZE_MARGIN) {
      const message = `目標画質に届かない CRF ${lowestFailing[0]} でも元の約 ${(estimateRatio(lowestFailing[0]) * 100).toFixed(0)}%`
      for (const tried of scores.keys()) removeQuietly(trialFile(tried))
      if (!whole) removeQuietly(sample)
      throw new NotSmallerError(message)
    }
    const passing = [...scores].filter(([, s]) => s >= target).sort((a, b) => b[0] - a[0])[0]
    const failing = [...scores].filter(([, s]) => s < target).sort((a, b) => a[0] - b[0])[0]
    let next: number
    if (passing && failing) {
      // 合格した最大の CRF と不合格の最小の CRF の間を直線で補間する
      // CRF 1 の差はサイズで 3% ほどなので、幅 2 まで絞れたら合格側で決める
      if (failing[0] - passing[0] <= 2) break
      const t = (passing[1] - target) / (passing[1] - failing[1])
      next = Math.min(failing[0] - 1, Math.max(passing[0] + 1, Math.floor(passing[0] + t * (failing[0] - passing[0]))))
    } else if (passing) {
      if (passing[0] >= settings.crfMax) break
      next = clamp(passing[0] + Math.min(QUICK_MAX_STEP, Math.max(2, Math.ceil((passing[1] - target) / QUICK_VMAF_PER_CRF))))
    } else {
      if (failing[0] <= settings.crfMin) break
      next = clamp(failing[0] - Math.min(QUICK_MAX_STEP, Math.max(2, Math.ceil((target - failing[1]) / QUICK_VMAF_PER_CRF))))
    }
    if (scores.has(next)) break
    crf = next
  }
  const best = [...scores].filter(([, s]) => s >= target).sort((a, b) => b[0] - a[0])[0]
  crf = best ? best[0] : settings.crfMin
  if (!best) ctx.log(`  CRF ${settings.crfMin} でも目標に届かないため CRF ${settings.crfMin} を使用`)
  if (best && estimateRatio(crf) >= settings.keepRatio + QUICK_SIZE_MARGIN) {
    for (const tried of scores.keys()) removeQuietly(trialFile(tried))
    if (!whole) removeQuietly(sample)
    throw new NotSmallerError(`目標画質を満たす CRF ${crf} だと元の約 ${(estimateRatio(crf) * 100).toFixed(0)}%`)
  }
  if (whole && fs.existsSync(trialFile(crf))) {
    ctx.log(`CRF ${crf} (探索で全編をエンコードしたものをそのまま使う)`)
    fs.renameSync(trialFile(crf), output)
  }
  for (const tried of scores.keys()) removeQuietly(trialFile(tried))
  if (!whole) removeQuietly(sample)

  // 3. 本番
  if (!fs.existsSync(output)) {
    ctx.log(`CRF ${crf} で全体をエンコード (preset ${settings.preset})`)
    const totalSeconds = duration || 1
    // 出力が videoSizeLimit を超えた時点で縮まないことが確定するので、最後までエンコードせずに打ち切る
    const limiter = new AbortController()
    const abortLimiter = () => limiter.abort()
    ctx.signal.addEventListener("abort", abortLimiter, { once: true })
    let exceeded = 0
    try {
      await runChecked("ffmpeg", [
        "-hide_banner", "-nostdin", "-v", "error", "-y", "-progress", "pipe:1", "-noautorotate", "-i", src, ...videoOnly, ...svt(crf), output,
      ], {
        signal: limiter.signal,
        onStdout: (line) => {
          const m = line.match(/^out_time_us=(\d+)/)
          if (m) onProgress(0.35 + 0.65 * (Number(m[1]) / 1e6 / totalSeconds), "映像をエンコード中")
          const size = line.match(/^total_size=(\d+)/)
          if (size && !exceeded && Number(size[1]) > videoSizeLimit) {
            exceeded = Number(size[1])
            limiter.abort()
          }
        },
      })
    } catch (err) {
      if (exceeded && !ctx.signal.aborted) {
        removeQuietly(output)
        throw new NotSmallerError(`本番のエンコード中に映像だけで ${exceeded} バイトになり、元の ${(settings.keepRatio * 100).toFixed(0)}% を超えることが確定`)
      }
      throw err
    } finally {
      ctx.signal.removeEventListener("abort", abortLimiter)
    }
  }
  return { min: crf, max: crf, mean: crf, scenes: 1 }
}

// av1an の --probing-stat と同じ書き方 (mean / median / harmonic / minimum / percentile=N / auto) でフレームの点数をまとめる
function aggregate(values: number[], stat: string): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const pct = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]
  if (stat === "minimum") return sorted[0]
  if (stat === "median") return pct(50)
  if (stat === "harmonic") return values.length / values.reduce((s, x) => s + 1 / Math.max(x, 0.01), 0)
  const m = stat.match(/^percentile=([\d.]+)$/)
  if (m) return pct(Number(m[1]))
  return values.reduce((s, x) => s + x, 0) / values.length
}

// ===== 7月方式: サンプル区間で VMAF 平均が目標を満たす最大の CRF を二分探索し、1本全体を1つの CRF でエンコード =====
const SAMPLE_SECONDS = 20
const SAMPLE_COUNT = 3

async function encodeWithSingleCrf(
  src: string, info: MediaInfo, work: string, output: string, settings: EncodeSettings, ctx: JobContext,
  onProgress: (frac: number, label: string) => void,
): Promise<JobResult["crf"]> {
  const opts: RunOptions = { signal: ctx.signal }
  const duration = info.duration
  const count = duration >= SAMPLE_SECONDS * (SAMPLE_COUNT + 1) ? SAMPLE_COUNT : 1
  const samples: string[] = []
  for (let i = 0; i < count; i++) {
    const start = count === 1 ? 0 : (duration * (i + 1)) / (count + 1)
    const dest = path.join(work, `sample${i}.mkv`)
    const r = await run("ffmpeg", ["-hide_banner", "-nostdin", "-v", "error", "-y", "-ss", String(start), "-i", src, "-t", String(SAMPLE_SECONDS), "-map", "0:v:0", "-c", "copy", dest], opts)
    if (r.code === 0) samples.push(dest)
  }
  if (!samples.length) throw new Error("サンプルを切り出せませんでした")
  const threads = os.availableParallelism()
  const svt = (preset: number, crfValue: number) => [
    "-c:v", "libsvtav1", "-preset", String(preset), "-crf", String(crfValue), "-pix_fmt", "yuv420p10le",
    "-svtav1-params", ["lp=" + threads, ...svtParamsForFfmpeg(info, settings)].join(":"),
  ]

  const scoreAt = async (crfValue: number) => {
    let total = 0
    for (const sample of samples) {
      const trial = path.join(work, "trial.mkv")
      await runChecked("ffmpeg", ["-hide_banner", "-nostdin", "-v", "error", "-y", "-i", sample, ...svt(settings.probePreset, crfValue), "-an", trial], opts)
      const r = await runChecked("ffmpeg", ["-hide_banner", "-nostdin", "-i", trial, "-i", sample, "-lavfi",
        `[0:v]settb=1/1000,setpts=N,format=yuv420p10le[d];[1:v]settb=1/1000,setpts=N,format=yuv420p10le[r];[d][r]libvmaf=n_threads=${threads}`, "-f", "null", "-"], opts)
      const m = r.stderr.match(/VMAF score: ([\d.]+)/)
      if (!m) throw new Error("VMAF を測定できませんでした")
      total += Number(m[1])
    }
    return total / samples.length
  }

  let lo = settings.crfMin
  let hi = settings.crfMax
  let found: number | null = null
  const steps = Math.ceil(Math.log2(hi - lo + 1)) + 1
  let step = 0
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    onProgress((0.3 * step++) / steps, `CRF を探索中 (crf ${mid})`)
    const score = await scoreAt(mid)
    ctx.log(`  crf=${mid} → サンプル VMAF 平均 ${score.toFixed(2)}`)
    if (score >= settings.targetQuality) {
      lo = mid
      found = score
    } else {
      hi = mid - 1
    }
  }
  if (found === null) ctx.log(`  下限 CRF ${lo} でも目標に届かないためそのまま使用`)
  ctx.log(`CRF ${lo} で全体をエンコード (preset ${settings.preset})`)

  const totalSeconds = duration || 1
  await runChecked("ffmpeg", ["-hide_banner", "-nostdin", "-v", "error", "-y", "-progress", "pipe:1", "-i", src, "-map", "0:v:0", ...svt(settings.preset, lo), "-an", output], {
    signal: ctx.signal,
    onStdout: (line) => {
      const m = line.match(/^out_time_us=(\d+)/)
      if (m) onProgress(0.3 + 0.7 * (Number(m[1]) / 1e6 / totalSeconds), "映像をエンコード中")
    },
  })
  for (const sample of samples) removeQuietly(sample)
  removeQuietly(path.join(work, "trial.mkv"))
  return { min: lo, max: lo, mean: lo, scenes: 1 }
}

function svtParamsForFfmpeg(info: MediaInfo, settings: EncodeSettings): string[] {
  // "--color-primaries 1" → "color-primaries=1" (ffmpeg の -svtav1-params 形式)
  const tokens = [...colorParams(info), ...splitParams(settings.svtParams)]
  const out: string[] = []
  for (let i = 0; i < tokens.length; i++) {
    const key = tokens[i].replace(/^--?/, "")
    const value = tokens[i + 1] && !tokens[i + 1].startsWith("-") ? tokens[++i] : "1"
    out.push(`${key}=${value}`)
  }
  return out
}

// ===== 全編の画質測定 =====
// VMAF はフレームごとの点数から平均だけでなく下位パーセンタイル・最小も出す (平均では一部の劣化場面が隠れるため)
async function measureQuality(
  encoded: string, src: string, work: string, fps: number, frames: number, subsample: number, ctx: JobContext,
  onProgress: (frac: number) => void,
): Promise<{ metrics: Metrics; worstScenes: JobResult["worstScenes"]; errors: string[] }> {
  const vmafLog = path.join(work, "vmaf.json")
  const threads = os.availableParallelism()
  // フレーム番号で揃える (タイムスタンプのずれ・可変フレームレートの影響を受けないように)
  const align = "settb=1/1000,setpts=N,format=yuv420p10le"
  const vmaf = `libvmaf=n_threads=${threads}${subsample > 1 ? `:n_subsample=${subsample}` : ""}:log_fmt=json:log_path=${vmafLog.replace(/[\\':]/g, "\\$&")}`
  // 間引くとき (subsample > 1) は XPSNR も省く (全フレームの XPSNR だけで N100 だと動画の尺の3割ほどかかるため)
  const graph = subsample > 1
    ? `[0:v]${align}[d1];[1:v]${align}[r1];[d1][r1]${vmaf}`
    : [
      `[0:v]${align},split[d1][d2]`,
      `[1:v]${align},split[r1][r2]`,
      `[d1][r1]${vmaf}`,
      // XPSNR は ffmpeg 9 の 10bit 入力だと値が壊れるため 8bit で測る
      `[d2]format=yuv420p[d3];[r2]format=yuv420p[r3];[d3][r3]xpsnr`,
    ].join(";")
  // 全編をデコードするので、デコードのエラー (ログの [error] 以上の行) も集めて変換結果の検査を兼ねる
  const r = await run("ffmpeg", ["-hide_banner", "-nostdin", "-nostats", "-loglevel", "level+info", "-progress", "pipe:1", "-i", encoded, "-i", src, "-filter_complex", graph, "-f", "null", "-"], {
    signal: ctx.signal,
    onStdout: (line) => {
      const m = line.match(/^frame=(\d+)/)
      if (m) onProgress(Math.min(1, Number(m[1]) / frames))
    },
  })
  // 出力先 (null) の「タイムスタンプが増えていない」はフレーム番号で揃えたために出るもので、デコードとは関係ないので除く
  const errors = r.stderr.split(/\r?\n|\r/).map((l) => l.trim()).filter((l) => /\[(error|fatal|panic)\]/.test(l) && !l.startsWith("[null @"))
  if (r.code !== 0) errors.push(`ffmpeg が終了コード ${r.code} で終了`)
  const metrics: Metrics = {}
  const xm = r.stderr.match(/XPSNR\s+y:\s*([\d.]+|inf)\s+u:\s*([\d.]+|inf)\s+v:\s*([\d.]+|inf)/)
  if (xm) {
    const [y, u, v] = [xm[1], xm[2], xm[3]].map((s) => (s === "inf" ? 100 : Number(s)))
    metrics.xpsnr = { y, u, v, min: Math.min(y, u, v) }
  }
  let worstScenes: JobResult["worstScenes"] = []
  try {
    const data = JSON.parse(fs.readFileSync(vmafLog, "utf8")) as { frames: { frameNum: number; metrics: { vmaf: number } }[] }
    const points = data.frames.map((f) => ({ frame: f.frameNum, vmaf: f.metrics.vmaf }))
    const scores = points.map((p) => p.vmaf)
    if (scores.length) {
      const sorted = [...scores].sort((a, b) => a - b)
      const pct = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]
      const mean = scores.reduce((s, x) => s + x, 0) / scores.length
      const harmonic = scores.length / scores.reduce((s, x) => s + 1 / Math.max(x, 0.01), 0)
      metrics.vmaf = { mean, harmonic, min: sorted[0], p1: pct(1), p5: pct(5) }
      worstScenes = findWorstScenes(points, fps, subsample)
    }
  } catch {
    ctx.log("VMAF のログを読めませんでした")
  }
  return { metrics, worstScenes, errors }
}

// 1秒の移動平均が低い場面を、互いに 3秒以上離して最大5か所選ぶ (見比べで確認する場所の候補)
// points は測ったフレームだけ (間引いたときは subsample フレームおきに1つ)
function findWorstScenes(points: { frame: number; vmaf: number }[], fps: number, subsample: number): { time: number; vmaf: number }[] {
  const scores = points.map((p) => p.vmaf)
  const win = Math.max(1, Math.round(fps / subsample))
  const avgs: { start: number; avg: number }[] = []
  let sum = 0
  for (let i = 0; i < scores.length; i++) {
    sum += scores[i]
    if (i >= win) sum -= scores[i - win]
    if (i >= win - 1) avgs.push({ start: i - win + 1, avg: sum / win })
  }
  if (!avgs.length) avgs.push({ start: 0, avg: scores.reduce((s, x) => s + x, 0) / scores.length })
  avgs.sort((a, b) => a.avg - b.avg)
  const picked: { start: number; avg: number }[] = []
  for (const a of avgs) {
    if (picked.every((p) => Math.abs(p.start - a.start) >= 3 * win)) picked.push(a)
    if (picked.length >= 5) break
  }
  return picked.map((p) => {
    // 窓の中で一番点数が低いフレームの位置を返す
    let worst = p.start
    for (let i = p.start; i < Math.min(scores.length, p.start + win); i++) if (scores[i] < scores[worst]) worst = i
    // フレームの中央の時刻にする (ちょうど境目だと前のフレームが表示されることがあるため)
    return { time: Math.round(((points[worst].frame + 0.5) / fps) * 1000) / 1000, vmaf: Math.round(p.avg * 100) / 100 }
  })
}
