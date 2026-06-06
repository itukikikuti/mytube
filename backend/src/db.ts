import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

export type MediaItem = {
  id: number
  title: string
  date: number
  type: string
  duration: number
  rate: number
  tags: string[]
  thumbs: string[]
}

export type TagItem = {
  id: number
  name: string
}

export type HistoryItem = {
  id: number
  media: number
  mediaTitle: string
  date: number
}

export type LibraryData = {
  videos: MediaItem[]
  tags: TagItem[]
  history: HistoryItem[]
}

export type VideoTitleItem = {
  title: string
}

export type LibraryOverviewData = {
  videos: VideoTitleItem[]
  tags: TagItem[]
  history: HistoryItem[]
}

type MediaRow = {
  id: number | string
  title: string
  date: number | string
  type: string
  duration: number | string
  rate: number | string
  tags: string
  thumbs: string
}

type TagRow = {
  id: number | string
  name: string
}

type HistoryRow = {
  id: number | string
  media: number | string
  mediaTitle: string
  date: number | string
}

export const defaultDbPath = process.env.DB_PATH || path.resolve(process.cwd(), './data/db.sqlite')

function mapMediaRow(row: MediaRow): MediaItem {
  return {
    id: parseNumber(row.id, 'media_items.id'),
    title: row.title,
    date: parseNumber(row.date, 'media_items.date'),
    type: row.type,
    duration: parseNumber(row.duration, 'media_items.duration'),
    rate: parseNumber(row.rate, 'media_items.rate'),
    tags: parseStringList(row.tags),
    thumbs: parseThumbs(row.thumbs),
  }
}

function queryTagRows(database: Database.Database): TagRow[] {
  return database
    .prepare(
      `
        SELECT id, name
        FROM tag_items
        ORDER BY name COLLATE NOCASE ASC, id ASC
      `,
    )
    .all() as TagRow[]
}

function queryHistoryRows(database: Database.Database): HistoryRow[] {
  return database
    .prepare(
      `
        SELECT history_items.id, history_items.media, history_items.date, media_items.title AS mediaTitle
        FROM history_items
        INNER JOIN media_items ON media_items.id = history_items.media
        ORDER BY history_items.date DESC, history_items.id DESC
      `,
    )
    .all() as HistoryRow[]
}

function parseStringList(raw: string): string[] {
  if (!raw.trim()) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((value): value is string => typeof value === 'string')
    }
  } catch {
    // Fall back to simple splitting below.
  }

  if (raw.includes(',')) {
    return raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  }

  return [raw]
}

function parseThumbs(raw: string): string[] {
  return parseStringList(raw)
}

function parseNumber(value: unknown, fieldName: string): number {
  const numeric = typeof value === 'number' ? value : Number(value)

  if (!Number.isFinite(numeric)) {
    throw new Error(`Invalid numeric value for ${fieldName}.`)
  }

  return numeric
}

export function ensureDatabaseFile(dbPath = defaultDbPath) {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`DB_PATH does not exist: ${dbPath}`)
  }

  const stat = fs.statSync(dbPath)
  if (!stat.isFile()) {
    throw new Error(`DB_PATH is not a file: ${dbPath}`)
  }
}

export function loadLibrary(dbPath = defaultDbPath): LibraryData {
  ensureDatabaseFile(dbPath)

  const database = new Database(dbPath, {
    fileMustExist: true,
    readonly: true,
  })

  try {
    const videoRows = database
      .prepare(
        `
          SELECT id, title, date, type, duration, rate, tags, thumbs
          FROM media_items
          ORDER BY title COLLATE NOCASE ASC, id ASC
        `,
      )
      .all() as MediaRow[]

    const tagRows = queryTagRows(database)
    const historyRows = queryHistoryRows(database)

    return {
      videos: videoRows.map(mapMediaRow),
      tags: tagRows.map((row) => ({
        id: parseNumber(row.id, 'tag_items.id'),
        name: row.name,
      })),
      history: historyRows.map((row) => ({
        id: parseNumber(row.id, 'history_items.id'),
        media: parseNumber(row.media, 'history_items.media'),
        mediaTitle: row.mediaTitle,
        date: parseNumber(row.date, 'history_items.date'),
      })),
    }
  } finally {
    database.close()
  }
}

export function loadLibraryOverview(dbPath = defaultDbPath): LibraryOverviewData {
  ensureDatabaseFile(dbPath)

  const database = new Database(dbPath, {
    fileMustExist: true,
    readonly: true,
  })

  try {
    const videoRows = database
      .prepare(
        `
          SELECT title
          FROM media_items
          ORDER BY title COLLATE NOCASE ASC, id ASC
        `,
      )
      .all() as Array<{ title: string }>

    const tagRows = queryTagRows(database)
    const historyRows = queryHistoryRows(database)

    return {
      videos: videoRows.map((row) => ({ title: row.title })),
      tags: tagRows.map((row) => ({
        id: parseNumber(row.id, 'tag_items.id'),
        name: row.name,
      })),
      history: historyRows.map((row) => ({
        id: parseNumber(row.id, 'history_items.id'),
        media: parseNumber(row.media, 'history_items.media'),
        mediaTitle: row.mediaTitle,
        date: parseNumber(row.date, 'history_items.date'),
      })),
    }
  } finally {
    database.close()
  }
}

export function loadMediaByTitle(title: string, dbPath = defaultDbPath): MediaItem | null {
  ensureDatabaseFile(dbPath)

  const database = new Database(dbPath, {
    fileMustExist: true,
    readonly: true,
  })

  try {
    const row = database
      .prepare(
        `
          SELECT id, title, date, type, duration, rate, tags, thumbs
          FROM media_items
          WHERE title = ?
        `,
      )
      .get(title) as MediaRow | undefined

    if (!row) {
      return null
    }

    return mapMediaRow(row)
  } finally {
    database.close()
  }
}