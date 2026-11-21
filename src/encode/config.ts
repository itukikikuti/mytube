import path from "node:path"

// エンコード画面・ワーカー共通のパス設定 (環境変数で変更可能)
// upload: エンコード元の動画を置くフォルダ (読み取りのみ。元の動画は消さない・動かさない)
// encoded: エンコード結果の出力先 (videos とは別。一覧・DB には登録しない)
export const encodePaths = {
  uploadDir: path.resolve(process.env.ENCODE_UPLOAD_DIR ?? "upload"),
  outputDir: path.resolve(process.env.ENCODE_OUTPUT_DIR ?? "encoded"),
  dbPath: path.resolve(process.env.ENCODE_DB ?? "data/encode.sqlite"),
}

export const VIDEO_EXTS = new Set([".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v", ".wmv", ".flv", ".ts", ".m2ts", ".mpg", ".mpeg", ".3gp"])

// encoded 内の作業用フォルダ (一覧には出さない)
export const WORK_DIR_NAME = ".work"
export const REJECTED_DIR_NAME = "_rejected"
