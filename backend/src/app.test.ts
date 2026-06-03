import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createServer, type Server } from 'node:http'
import { test } from 'node:test'
import { createApp, decodeId, encodeId, ensureVideoDirectory, isAllowedVideoFile, listVideos, parseRange } from './app'

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mytube-backend-'))
}

async function startTestServer(videoDir: string): Promise<{ server: Server; baseUrl: string }> {
  const app = createApp(videoDir)
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

test('backend helpers cover encoding, file filtering, listing, and directory validation', () => {
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

test('backend routes return lists, full streams, ranged streams, and error states', async () => {
  const tempDir = createTempDir()
  const serverState: { server: Server | null } = { server: null }

  try {
    fs.writeFileSync(path.join(tempDir, 'beta.mp4'), 'beta')
    fs.writeFileSync(path.join(tempDir, 'alpha.mp4'), 'alpha')
    fs.writeFileSync(path.join(tempDir, 'notes.txt'), 'notes')
    fs.writeFileSync(path.join(tempDir, 'clip.mp4'), 'abcdef')

    const testServer = await startTestServer(tempDir)
    serverState.server = testServer.server

    const listResponse = await fetch(`${testServer.baseUrl}/api/videos`)
    assert.equal(listResponse.status, 200)

    const listBody = (await listResponse.json()) as { videos: Array<{ id: string; name: string }> }
    assert.deepEqual(listBody.videos, [
      { id: encodeId('alpha.mp4'), name: 'alpha.mp4' },
      { id: encodeId('beta.mp4'), name: 'beta.mp4' },
      { id: encodeId('clip.mp4'), name: 'clip.mp4' },
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

test('parseRange still rejects invalid combinations in helper coverage', () => {
  assert.equal(parseRange('bytes=10-5', 100), null)
  assert.equal(parseRange('bytes=200-300', 100), null)
  assert.equal(parseRange('garbage', 100), null)
})