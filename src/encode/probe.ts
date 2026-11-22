import { z } from "zod"
import { run, runChecked, type RunOptions } from "./process.js"

const streamSchema = z.object({
  index: z.number(),
  codec_type: z.string().optional(),
  codec_name: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  pix_fmt: z.string().optional(),
  r_frame_rate: z.string().optional(),
  avg_frame_rate: z.string().optional(),
  nb_frames: z.string().optional(),
  duration: z.string().optional(),
  start_time: z.string().optional(),
  channels: z.number().optional(),
  color_primaries: z.string().optional(),
  color_transfer: z.string().optional(),
  color_space: z.string().optional(),
  color_range: z.string().optional(),
  disposition: z.object({ attached_pic: z.number().optional() }).partial().optional(),
  side_data_list: z.array(z.object({ rotation: z.number().optional() }).passthrough()).optional(),
})

const probeSchema = z.object({
  streams: z.array(streamSchema).default([]),
  format: z.object({
    format_name: z.string().optional(),
    duration: z.string().optional(),
    start_time: z.string().optional(),
    bit_rate: z.string().optional(),
  }).default({}),
})

export type ProbeStream = z.infer<typeof streamSchema>

// 画面表示やエンコードに使う動画情報
export type MediaInfo = {
  formatName: string
  duration: number
  startTime: number
  bitRate: number
  video: {
    codec: string
    width: number
    height: number
    pixFmt: string
    fps: number
    avgFps: number
    // r_frame_rate / avg_frame_rate の元の書き方 (例: 30000/1001)
    rate: string
    avgRate: string
    frames: number
    startTime: number
    rotation: number
    colorPrimaries?: string
    colorTransfer?: string
    colorSpace?: string
    colorRange?: string
  } | null
  audio: {
    codec: string
    channels: number
    duration: number
    startTime: number
  } | null
}

function parseRate(rate?: string): number {
  if (!rate) return 0
  const [n, d] = rate.split("/").map(Number)
  return d ? n / d : n || 0
}

export async function probeMedia(file: string, options: RunOptions = {}): Promise<MediaInfo> {
  const { stdout } = await runChecked("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file], options)
  const data = probeSchema.parse(JSON.parse(stdout))
  const duration = Number(data.format.duration) || 0
  const formatStart = Number(data.format.start_time) || 0
  const v = data.streams.find((s) => s.codec_type === "video" && !s.disposition?.attached_pic)
  const a = data.streams.find((s) => s.codec_type === "audio")
  const fps = parseRate(v?.r_frame_rate)
  const avgFps = parseRate(v?.avg_frame_rate) || fps
  return {
    formatName: data.format.format_name ?? "",
    duration,
    startTime: formatStart,
    bitRate: Number(data.format.bit_rate) || 0,
    video: v ? {
      codec: v.codec_name ?? "?",
      width: v.width ?? 0,
      height: v.height ?? 0,
      pixFmt: v.pix_fmt ?? "",
      fps,
      avgFps,
      rate: v.r_frame_rate ?? "",
      avgRate: v.avg_frame_rate ?? "",
      frames: Number(v.nb_frames) || Math.round((Number(v.duration) || duration) * avgFps),
      startTime: Number(v.start_time) || 0,
      rotation: Math.round(v.side_data_list?.find((d) => typeof d.rotation === "number")?.rotation ?? 0),
      colorPrimaries: v.color_primaries,
      colorTransfer: v.color_transfer,
      colorSpace: v.color_space,
      colorRange: v.color_range,
    } : null,
    audio: a ? {
      codec: a.codec_name ?? "?",
      channels: a.channels ?? 0,
      duration: Number(a.duration) || duration,
      startTime: Number(a.start_time) || 0,
    } : null,
  }
}

// 指定ストリームのパケット数を数える (デコードしないので速い)
export async function countPackets(file: string, stream: "v:0" | "a:0", options: RunOptions = {}): Promise<number> {
  const { stdout } = await runChecked("ffprobe", ["-v", "error", "-select_streams", stream, "-count_packets", "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", file], options)
  return Number(stdout.trim().split(/\s+/)[0]) || 0
}

// ストリームの実際の長さ (最後のパケットの終わりの時刻 - 最初の時刻)
export async function streamDuration(file: string, stream: "v:0" | "a:0", options: RunOptions = {}): Promise<number> {
  const { stdout } = await runChecked("ffprobe", ["-v", "error", "-select_streams", stream, "-show_entries", "packet=pts_time,duration_time", "-of", "csv=p=0", file], options)
  let first = Infinity
  let last = -Infinity
  for (const line of stdout.split("\n")) {
    const [pts, dur] = line.split(",").map(Number)
    if (!Number.isFinite(pts)) continue
    first = Math.min(first, pts)
    last = Math.max(last, pts + (Number.isFinite(dur) ? dur : 0))
  }
  return Number.isFinite(first) ? last - first : 0
}

// パケットを1回だけ読んで、最初の映像・音声ストリームのパケット数と実際の長さ (countPackets・streamDuration と同じ値) をまとめて出す
export type StreamPackets = { packets: number; duration: number }

export async function packetSummary(file: string, options: RunOptions = {}): Promise<{ video: StreamPackets; audio: StreamPackets }> {
  const { stdout } = await runChecked("ffprobe", ["-v", "error", "-show_entries", "packet=stream_index,pts_time,duration_time:stream=index,codec_type", "-of", "csv=p=0", file], options)
  const types = new Map<number, string>()
  const stats = new Map<number, { packets: number; first: number; last: number }>()
  for (const line of stdout.split("\n")) {
    const parts = line.trim().split(",")
    const index = Number(parts[0])
    if (!parts[0] || !Number.isInteger(index)) continue
    // ストリームの行は「番号,種類」、パケットの行は「番号,時刻,長さ」
    if (parts.length === 2 && Number.isNaN(Number(parts[1]))) {
      types.set(index, parts[1])
      continue
    }
    const s = stats.get(index) ?? { packets: 0, first: Infinity, last: -Infinity }
    s.packets++
    const pts = Number(parts[1])
    const dur = Number(parts[2])
    if (parts[1] && Number.isFinite(pts)) {
      s.first = Math.min(s.first, pts)
      s.last = Math.max(s.last, pts + (parts[2] && Number.isFinite(dur) ? dur : 0))
    }
    stats.set(index, s)
  }
  const of = (type: string): StreamPackets => {
    const index = [...types].filter(([, t]) => t === type).map(([i]) => i).sort((a, b) => a - b)[0]
    const s = index === undefined ? undefined : stats.get(index)
    if (!s) return { packets: 0, duration: 0 }
    return { packets: s.packets, duration: Number.isFinite(s.first) ? s.last - s.first : 0 }
  }
  return { video: of("video"), audio: of("audio") }
}

// 全編をデコードしてエラーの行を集める (エラーが無ければ空配列)。streams で映像だけ・音声だけにもできる
export async function decodeErrors(file: string, options: RunOptions = {}, streams: "all" | "video" | "audio" = "all"): Promise<string[]> {
  const maps = [...(streams !== "audio" ? ["-map", "0:v:0?"] : []), ...(streams !== "video" ? ["-map", "0:a:0?"] : [])]
  const result = await run("ffmpeg", ["-hide_banner", "-nostdin", "-v", "error", "-i", file, ...maps, "-f", "null", "-"], options)
  const errors = result.stderr.split("\n").map((l) => l.trim()).filter(Boolean)
  if (result.code !== 0) errors.push(`ffmpeg が終了コード ${result.code} で終了`)
  return errors
}

// ブラウザ (Android Chrome) でそのまま再生できそうな形式か
const WEB_CONTAINERS = ["mp4", "webm"]
const WEB_VIDEO_CODECS = new Set(["h264", "av1", "vp9", "vp8", "hevc"])
const WEB_AUDIO_CODECS = new Set(["aac", "mp3", "opus", "vorbis", "flac"])

export function webPlayableReason(name: string, info: MediaInfo): string | null {
  const ext = name.toLowerCase().split(".").pop() ?? ""
  if (!["mp4", "m4v", "webm"].includes(ext) || !WEB_CONTAINERS.some((c) => info.formatName.includes(c))) return `コンテナ (${ext}) がブラウザ非対応`
  if (!info.video) return "映像が無い"
  if (!WEB_VIDEO_CODECS.has(info.video.codec)) return `映像コーデック ${info.video.codec} がブラウザ非対応`
  if (info.audio && !WEB_AUDIO_CODECS.has(info.audio.codec)) return `音声コーデック ${info.audio.codec} がブラウザ非対応`
  return null
}

// 出力のフレームレート (この一定間隔で時刻を作り直す)。
// r_frame_rate が平均と合っていればそれを、合わなければ (可変フレームレート・時刻が壊れている) 平均に近い一般的な値を使う
const COMMON_RATES = ["24000/1001", "24", "25", "30000/1001", "30", "48", "50", "60000/1001", "60", "120"]

export function outputFrameRate(info: MediaInfo): string {
  const v = info.video!
  const avg = v.avgFps || v.fps || 30
  if (v.rate && v.fps > 0 && Math.abs(v.fps - avg) <= 0.001 * avg) return v.rate
  // 時刻が壊れていると平均もずれるので、1% 以内で一番近いものにそろえる
  const common = COMMON_RATES.filter((r) => Math.abs(parseRate(r) - avg) <= 0.01 * avg)
    .sort((a, b) => Math.abs(parseRate(a) - avg) - Math.abs(parseRate(b) - avg))[0]
  return common ?? String(Math.round(avg * 1000) / 1000)
}

export function rateValue(rate: string): number {
  return parseRate(rate)
}

// 映像のパケットの時刻が壊れていないかを調べる (デコードしないので速い)。壊れていれば理由を返す
// - B フレームがあるのに全パケットで表示時刻 = 復号時刻 (MP4 の ctts が無い): 表示の順番が狂う
// - 表示時刻が無い・重複している・(B フレームが無いのに) 逆行している・復号時刻より前
export async function timestampProblem(file: string, options: RunOptions = {}): Promise<string | null> {
  const { stdout } = await runChecked("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "packet=pts,dts:stream=has_b_frames", "-of", "csv=p=0", file], options)
  let hasBFrames = 0
  const pts: number[] = []
  let missing = 0
  let backwards = 0
  let beforeDts = 0
  let differs = false
  for (const line of stdout.split("\n")) {
    const parts = line.trim().split(",")
    if (!parts[0]) continue
    // ストリームの行は has_b_frames の1つだけ、パケットの行は「pts,dts」
    if (parts.length === 1) {
      hasBFrames = Number(parts[0]) || 0
      continue
    }
    const p = Number(parts[0])
    const d = Number(parts[1])
    if (!Number.isFinite(p)) {
      missing++
      continue
    }
    if (pts.length && p <= pts[pts.length - 1]) backwards++
    if (Number.isFinite(d)) {
      if (p !== d) differs = true
      if (p < d) beforeDts++
    }
    pts.push(p)
  }
  if (!pts.length) return null
  const problems: string[] = []
  if (missing) problems.push(`表示時刻の無いパケット ${missing} 個`)
  if (hasBFrames > 0 && !differs && pts.length > 1) problems.push("B フレームがあるのに全パケットで表示時刻 = 復号時刻")
  const sorted = [...pts].sort((a, b) => a - b)
  let duplicates = 0
  for (let i = 1; i < sorted.length; i++) if (sorted[i] === sorted[i - 1]) duplicates++
  if (duplicates) problems.push(`表示時刻の重複 ${duplicates} 個`)
  if (hasBFrames === 0 && backwards) problems.push(`表示時刻の逆行 ${backwards} 個`)
  if (beforeDts) problems.push(`表示時刻が復号時刻より前 ${beforeDts} 個`)
  return problems.length ? problems.join("、") : null
}
