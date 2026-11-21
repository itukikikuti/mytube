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

// 全編をデコードしてエラーの行を集める (エラーが無ければ空配列)
export async function decodeErrors(file: string, options: RunOptions = {}): Promise<string[]> {
  const result = await run("ffmpeg", ["-hide_banner", "-nostdin", "-v", "error", "-i", file, "-map", "0:v:0?", "-map", "0:a:0?", "-f", "null", "-"], options)
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
