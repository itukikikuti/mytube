import { z } from "zod"

// エンコード設定 (画面から変更でき、ジョブ開始時の値がジョブに記録される)
// 既定値は「画質を落とさない」安全側に寄せている
export const encodeSettingsSchema = z.object({
  // quick: 動画全体から集めた短いサンプルで CRF を決めて1本を1つの CRF で (速い)
  // av1an: シーンごとに目標画質を満たす CRF を探す (遅い) / single-crf: 7月方式 (サンプルで1本1つの CRF を探す)
  method: z.enum(["quick", "av1an", "single-crf"]).default("quick"),
  // av1an の目標画質の指標 (single-crf は常に VMAF 平均)
  targetMetric: z.enum(["vmaf", "xpsnr-weighted"]).default("vmaf"),
  // 目標値。av1an には「目標値〜目標値+許容幅」の範囲で渡す
  targetQuality: z.coerce.number().min(0).max(100).default(95),
  targetTolerance: z.coerce.number().min(0.1).max(10).default(1),
  // サンプル (quick) / シーン (av1an) 内のフレームの点数をどうまとめて判定するか。
  // mean = 平均。percentile=5 は「悪い方から5%のフレーム」で判定 (平均より厳しい)
  probingStat: z.string().trim().regex(/^(auto|mean|median|harmonic|minimum|percentile=\d+(\.\d+)?)$/).default("mean"),
  // SVT-AV1 のプリセット (小さいほど遅くて高圧縮)。quick は探索も本番もこのプリセット。av1an の探索は probePreset
  preset: z.coerce.number().int().min(0).max(13).default(6),
  probePreset: z.coerce.number().int().min(0).max(13).default(8),
  crfMin: z.coerce.number().int().min(1).max(63).default(10),
  crfMax: z.coerce.number().int().min(1).max(63).default(55),
  probes: z.coerce.number().int().min(2).max(12).default(4),
  // quick: CRF を決めるサンプルの長さ (秒)。全体から 1秒ずつ均等に集める
  sampleSeconds: z.coerce.number().int().min(2).max(120).default(8),
  // 並列に処理するシーン数 (メモリ 1 本あたり約 1.5GB @1080p)
  workers: z.coerce.number().int().min(1).max(8).default(2),
  // SVT-AV1 に追加で渡すパラメータ (例: --tune 0)
  svtParams: z.string().trim().max(500).regex(/^[\w\s.:=,+-]*$/).default(""),
  // 音声 (Opus) のビットレート kbps
  audioBitrate: z.coerce.number().int().min(32).max(512).default(128),
  // 結果が元の何倍以上なら「縮まない」として元を採用するか
  keepRatio: z.coerce.number().min(0.3).max(1).default(0.95),
  // 全編の画質測定 (VMAF) の合格ライン。平均・下位1% のどちらかが下回ったら元を採用
  acceptVmafMean: z.coerce.number().min(0).max(100).default(93),
  acceptVmafLow: z.coerce.number().min(0).max(100).default(80),
  // 全編の画質測定で何フレームに1回測るか (1 = 全フレーム + XPSNR。3 なら測定時間は約 1/3)
  measureSubsample: z.coerce.number().int().min(1).max(30).default(3),
})

export type EncodeSettings = z.infer<typeof encodeSettingsSchema>

export const defaultEncodeSettings: EncodeSettings = encodeSettingsSchema.parse({})
