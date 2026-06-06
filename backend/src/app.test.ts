import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import { createServer, type Server } from 'node:http'
import { test } from 'node:test'
import { createApp, decodeId, encodeId, ensureVideoDirectory, isAllowedVideoFile, listVideos, parseRange } from './app'

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mytube-backend-'))
}

function createTempDb(dbPath: string) {
  const database = new Database(dbPath)

  database.exec(`
    CREATE TABLE media_items (
      id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      date INTEGER NOT NULL,
      type TEXT NOT NULL,
      duration INTEGER NOT NULL,
      rate INTEGER NOT NULL,
      tags TEXT NOT NULL,
      thumbs TEXT NOT NULL
    );

    CREATE TABLE history_items (
      id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      media INTEGER NOT NULL,
      date INTEGER NOT NULL
    );

    CREATE TABLE tag_items (
      id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );
  `)

  const insertMedia = database.prepare(
    'INSERT INTO media_items (title, date, type, duration, rate, tags, thumbs) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
  const insertHistory = database.prepare('INSERT INTO history_items (media, date) VALUES (?, ?)')
  const insertTag = database.prepare('INSERT INTO tag_items (name) VALUES (?)')

  insertMedia.run(
    'bravo.mp4',
    1717600000,
    'movie',
    3723,
    5,
    JSON.stringify(['night', 'road']),
    JSON.stringify(['iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO1o4V8AAAAASUVORK5CYII=']),
  )
  insertMedia.run('alpha.mp4', 1717500000, 'clip', 123, 4, 'highlight,featured', JSON.stringify(['thumb-2']))

  insertHistory.run(2, 1717605000)
  insertHistory.run(1, 1717610000)

  insertTag.run('night')
  insertTag.run('road')
  insertTag.run('featured')

  database.close()
}

async function startTestServer(videoDir: string, dbPath: string): Promise<{ server: Server; baseUrl: string }> {
  const app = createApp(videoDir, dbPath)
  const server = createServer(app)

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve())
  })

  const address = server.address()
  assert.ok(address && typeof address === 'object')

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  }
}

async function closeServer(server: Server) {
  await new Promise<void>((resolve) => server.close(() => resolve()))
}

test('バックエンドヘルパーでエンコード・拡張子判定・一覧取得・ディレクトリ検証を確認する', () => {
  const tempDir = createTempDir()
  const nestedDir = path.join(tempDir, 'nested')
  const missingDir = path.join(tempDir, 'missing')

  try {
    assert.equal(isAllowedVideoFile('movie.mp4'), true)
    assert.equal(isAllowedVideoFile('movie.MP4'), true)
    assert.equal(isAllowedVideoFile('movie.mov'), false)

    const fileName = 'サンプル video.mp4'
    const id = encodeId(fileName)
    assert.equal(decodeId(id), fileName)

    fs.writeFileSync(path.join(tempDir, 'b.mp4'), 'b')
    fs.writeFileSync(path.join(tempDir, 'a.mp4'), 'a')
    fs.writeFileSync(path.join(tempDir, 'ignore.txt'), 'x')
    fs.mkdirSync(nestedDir)

    assert.deepEqual(listVideos(tempDir), [
      { id: encodeId('a.mp4'), name: 'a.mp4' },
      { id: encodeId('b.mp4'), name: 'b.mp4' },
    ])

    assert.throws(() => ensureVideoDirectory(missingDir), /does not exist/)
    assert.throws(() => ensureVideoDirectory(path.join(tempDir, 'a.mp4')), /not a directory/)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

test('バックエンドルートが一覧取得・全体配信・範囲配信・各種エラーを返すことを確認する', async () => {
  const tempDir = createTempDir()
  const dbPath = path.join(tempDir, 'db.sqlite')
  const serverState: { server: Server | null } = { server: null }

  try {
    fs.writeFileSync(path.join(tempDir, 'alpha.mp4'), 'alpha')
    fs.writeFileSync(path.join(tempDir, 'bravo.mp4'), 'bravo')
    fs.writeFileSync(path.join(tempDir, 'notes.txt'), 'notes')
    fs.writeFileSync(path.join(tempDir, 'clip.mp4'), 'abcdef')

    createTempDb(dbPath)

    const testServer = await startTestServer(tempDir, dbPath)
    serverState.server = testServer.server

    const listResponse = await fetch(`${testServer.baseUrl}/api/videos`)
    assert.equal(listResponse.status, 200)

    const listBody = (await listResponse.json()) as {
      videos: Array<{
        id: string
        title: string
      }>
      tags: Array<{ id: number; name: string }>
      history: Array<{ id: number; media: number; mediaTitle: string; date: number }>
    }

    assert.deepEqual(listBody.videos, [
      {
        id: encodeId('alpha.mp4'),
        title: 'alpha.mp4',
      },
      {
        id: encodeId('bravo.mp4'),
        title: 'bravo.mp4',
      },
    ])

    const detailResponse = await fetch(`${testServer.baseUrl}/api/videos/${encodeId('alpha.mp4')}`)
    assert.equal(detailResponse.status, 200)

    const detailBody = (await detailResponse.json()) as {
      id: string
      title: string
      date: number
      type: string
      duration: number
      rate: number
      tags: string[]
      thumbs: string[]
    }

    assert.deepEqual(detailBody, {
      id: encodeId('alpha.mp4'),
      title: 'alpha.mp4',
      date: 1717500000,
      type: 'clip',
      duration: 123,
      rate: 4,
      tags: ['highlight', 'featured'],
      thumbs: ['thumb-2'],
    })

    assert.deepEqual(listBody.tags, [
      { id: 3, name: 'featured' },
      { id: 1, name: 'night' },
      { id: 2, name: 'road' },
    ])

    assert.deepEqual(listBody.history, [
      {
        id: 2,
        media: 1,
        mediaTitle: 'bravo.mp4',
        date: 1717610000,
      },
      {
        id: 1,
        media: 2,
        mediaTitle: 'alpha.mp4',
        date: 1717605000,
      },
    ])

    const fullStreamResponse = await fetch(`${testServer.baseUrl}/api/videos/${encodeId('clip.mp4')}/stream`)
    assert.equal(fullStreamResponse.status, 200)
    assert.equal(fullStreamResponse.headers.get('content-type'), 'video/mp4')
    assert.equal(fullStreamResponse.headers.get('content-length'), '6')
    assert.equal(fullStreamResponse.headers.get('accept-ranges'), 'bytes')
    assert.equal(await fullStreamResponse.text(), 'abcdef')

    const rangedResponse = await fetch(`${testServer.baseUrl}/api/videos/${encodeId('clip.mp4')}/stream`, {
      headers: {
        Range: 'bytes=1-3',
      },
    })
    assert.equal(rangedResponse.status, 206)
    assert.equal(rangedResponse.headers.get('content-range'), 'bytes 1-3/6')
    assert.equal(rangedResponse.headers.get('content-length'), '3')
    assert.equal(await rangedResponse.text(), 'bcd')

    const invalidIdResponse = await fetch(`${testServer.baseUrl}/api/videos/not-base64/stream`)
    assert.equal(invalidIdResponse.status, 400)

    const missingDetailResponse = await fetch(`${testServer.baseUrl}/api/videos/${encodeId('missing.mp4')}`)
    assert.equal(missingDetailResponse.status, 404)

    const missingResponse = await fetch(`${testServer.baseUrl}/api/videos/${encodeId('missing.mp4')}/stream`)
    assert.equal(missingResponse.status, 404)

    const invalidRangeResponse = await fetch(`${testServer.baseUrl}/api/videos/${encodeId('clip.mp4')}/stream`, {
      headers: {
        Range: 'bytes=999-1000',
      },
    })
    assert.equal(invalidRangeResponse.status, 416)
    assert.equal(invalidRangeResponse.headers.get('content-range'), 'bytes */6')
  } finally {
    if (serverState.server) {
      await closeServer(serverState.server)
    }
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

test('parseRangeが不正な組み合わせを拒否することを確認する', () => {
  assert.equal(parseRange('bytes=10-5', 100), null)
  assert.equal(parseRange('bytes=200-300', 100), null)
  assert.equal(parseRange('garbage', 100), null)
})
