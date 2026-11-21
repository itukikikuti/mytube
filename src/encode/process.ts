import { spawn } from "node:child_process"

export type RunOptions = {
  signal?: AbortSignal
  cwd?: string
  // 標準出力・標準エラーを1行ずつ受け取る (\r 区切りの進捗表示も1行として扱う)
  onStdout?: (line: string) => void
  onStderr?: (line: string) => void
}

export type RunResult = { code: number | null; stdout: string; stderr: string }

export class CanceledError extends Error {
  constructor() {
    super("キャンセルされました")
  }
}

const MAX_CAPTURE = 4 * 1024 * 1024

// 外部コマンドを実行する。中断されたらプロセスグループごと終了させる (av1an の子プロセスも止めるため)
export function run(cmd: string, args: string[], options: RunOptions = {}): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) return reject(new CanceledError())
    const child = spawn(cmd, args, { cwd: options.cwd, detached: true, stdio: ["ignore", "pipe", "pipe"] })
    let stdout = ""
    let stderr = ""
    const lineReader = (onLine?: (line: string) => void) => {
      let buffer = ""
      return {
        push(chunk: string) {
          if (!onLine) return
          buffer += chunk
          const parts = buffer.split(/\r\n|\r|\n/)
          buffer = parts.pop() ?? ""
          for (const part of parts) if (part) onLine(part)
        },
        flush() {
          if (onLine && buffer) onLine(buffer)
          buffer = ""
        },
      }
    }
    const outLines = lineReader(options.onStdout)
    const errLines = lineReader(options.onStderr)
    child.stdout.setEncoding("utf8")
    child.stderr.setEncoding("utf8")
    child.stdout.on("data", (chunk: string) => {
      if (stdout.length < MAX_CAPTURE) stdout += chunk
      outLines.push(chunk)
    })
    child.stderr.on("data", (chunk: string) => {
      // 長い stderr は末尾だけ残す
      stderr = (stderr + chunk).slice(-MAX_CAPTURE)
      errLines.push(chunk)
    })
    const kill = () => {
      try {
        process.kill(-child.pid!, "SIGTERM")
      } catch {}
      setTimeout(() => {
        try {
          process.kill(-child.pid!, "SIGKILL")
        } catch {}
      }, 5000).unref()
    }
    options.signal?.addEventListener("abort", kill, { once: true })
    child.on("error", (err) => {
      options.signal?.removeEventListener("abort", kill)
      reject(err)
    })
    child.on("close", (code) => {
      options.signal?.removeEventListener("abort", kill)
      outLines.flush()
      errLines.flush()
      if (options.signal?.aborted) return reject(new CanceledError())
      resolve({ code, stdout, stderr })
    })
  })
}

// 失敗したら stderr の末尾を付けて例外にする
export async function runChecked(cmd: string, args: string[], options: RunOptions = {}): Promise<RunResult> {
  const result = await run(cmd, args, options)
  if (result.code !== 0) {
    const tail = result.stderr.trim().split("\n").slice(-8).join("\n")
    throw new Error(`${cmd} が終了コード ${result.code} で失敗しました\n${tail}`)
  }
  return result
}
