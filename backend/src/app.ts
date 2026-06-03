import express, { type Express, type Request, type Response } from 'express'
import fs from 'node:fs'
import path from 'node:path'

export type Video = {
  id: string
  name: string
}

export type ByteRange = {
  start: number
  end: number
}

export const DEFAULT_PORT = 8080
export const defaultVideoDir = process.env.VIDEO_DIR || path.resolve(__dirname, '../videos')

export const isAllowedVideoFile = (fileName: string): boolean => path.extname(fileName).toLowerCase() === '.mp4'
export const encodeId = (fileName: string): string => Buffer.from(fileName, 'utf8').toString('base64url')
export const decodeId = (id: string): string => Buffer.from(id, 'base64url').toString('utf8')

export function ensureVideoDirectory(videoDir = defaultVideoDir) {
  if (!fs.existsSync(videoDir)) {
    throw new Error(`VIDEO_DIR does not exist: ${videoDir}`)
  }

  const stat = fs.statSync(videoDir)
  if (!stat.isDirectory()) {
    throw new Error(`VIDEO_DIR is not a directory: ${videoDir}`)
  }
}

export function listVideos(videoDir = defaultVideoDir): Video[] {
  const collator = new Intl.Collator('ja')
  return fs
    .readdirSync(videoDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && isAllowedVideoFile(entry.name))
    .map((entry) => ({
      id: encodeId(entry.name),
      name: entry.name,
    }))
    .sort((a, b) => collator.compare(a.name, b.name))
}

export function parseRange(rangeHeader: string, fileSize: number): ByteRange | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader)
  if (!match) return null

  const rawStart = match[1]
  const rawEnd = match[2]

  if (rawStart === '' && rawEnd === '') return null

  let start: number
  let end: number

  if (rawStart !== '') {
    start = Number(rawStart)
    end = rawEnd !== '' ? Number(rawEnd) : fileSize - 1
  } else {
    const suffixLength = Number(rawEnd)
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) return null
    start = Math.max(fileSize - suffixLength, 0)
    end = fileSize - 1
  }

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end < 0 ||
    start > end ||
    start >= fileSize
  ) {
    return null
  }

  end = Math.min(end, fileSize - 1)
  return { start, end }
}

export function createApp(videoDir = defaultVideoDir): Express {
  const app = express()

  app.get('/api/videos', (req, res) => {
    res.json({ videos: listVideos(videoDir) })
  })

  app.get('/api/videos/:id/stream', (req: Request, res: Response) => {
    let fileName: string
    const rawId = req.params.id
    const videoId = Array.isArray(rawId) ? rawId[0] : rawId

    if (!videoId) {
      res.status(400).json({ error: 'Invalid video id.' })
      return
    }

    try {
      fileName = decodeId(videoId)
    } catch {
      res.status(400).json({ error: 'Invalid video id.' })
      return
    }

    if (path.basename(fileName) !== fileName || !isAllowedVideoFile(fileName)) {
      res.status(400).json({ error: 'Invalid video id.' })
      return
    }

    const filePath = path.join(videoDir, fileName)

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Video not found.' })
      return
    }

    const stat = fs.statSync(filePath)
    const fileSize = stat.size
    const rawRangeHeader = req.headers.range
    const rangeHeader = Array.isArray(rawRangeHeader) ? rawRangeHeader[0] : rawRangeHeader

    res.setHeader('Accept-Ranges', 'bytes')
    res.setHeader('Content-Type', 'video/mp4')

    if (!rangeHeader) {
      res.setHeader('Content-Length', fileSize)
      fs.createReadStream(filePath).pipe(res)
      return
    }

    const range = parseRange(rangeHeader, fileSize)
    if (!range) {
      res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end()
      return
    }

    const chunkSize = range.end - range.start + 1

    res.status(206)
    res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${fileSize}`)
    res.setHeader('Content-Length', chunkSize)

    fs.createReadStream(filePath, { start: range.start, end: range.end }).pipe(res)
  })

  return app
}

export function startServer(port = DEFAULT_PORT, videoDir = defaultVideoDir) {
  ensureVideoDirectory(videoDir)
  const app = createApp(videoDir)
  return app.listen(port, () => {
    console.log(`[backend] listening on :${port}`)
    console.log(`[backend] serving videos from ${videoDir}`)
  })
}