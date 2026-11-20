export function escapeHtml(value: string | number) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]!)
}

// encodeURI は # を素通しするが、それだとブラウザがフラグメント扱いしてURLが
// 途中で切れるため %23 にする。予約文字なので decodeURI では戻らず、
// serveStatic の rewriteRequestPath で戻している。
// 残りは encodeURI のままにし、HTML属性に埋める側で escapeHtml をかける
// （& などが実体参照として解釈されるのを防ぐため）。
export function videoUrl(title: string) {
  return `/videos/${encodeURI(title).replace(/#/g, "%23")}`
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m)
  return (h > 0 ? `${h}:` : "") + `${mm}:${String(s).padStart(2, "0")}`
}

const FILE_SIZE_UNITS = ["B", "KB", "MB", "GB", "TB"]

export function formatFileSize(bytes: number, precise = false): string {
  if (bytes <= 0) return ""

  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < FILE_SIZE_UNITS.length - 1) {
    value /= 1024
    unit++
  }

  // モーダルは幅の制約が無いので小数第2位まで出す
  if (precise && unit > 0) return `${value.toFixed(2)}${FILE_SIZE_UNITS[unit]}`

  // 一覧は幅を抑えるため、10未満のときだけ小数第1位まで出す
  const text = unit === 0 || value >= 10
    ? String(Math.round(value))
    : value.toFixed(1).replace(/\.0$/, "")
  return `${text}${FILE_SIZE_UNITS[unit]}`
}
