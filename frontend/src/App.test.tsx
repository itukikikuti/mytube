import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import App from './App'

function mockFetchOnce(body: unknown, status = 200) {
  const response = new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
}

function mockFetchFailure(message = 'network error') {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error(message)))
}

describe('App', () => {
  test('読み込み表示の後に一覧を表示し、先頭動画を選択状態にする', async () => {
    mockFetchOnce({
      videos: [
        { id: 'Y2xpcC5tcDQ', name: 'clip.mp4' },
        { id: 'YWxwaGEubXA0', name: 'alpha.mp4' },
      ],
    })

    render(<App />)

    expect(screen.getByText('Loading videos...')).toBeTruthy()

    expect(await screen.findByRole('button', { name: 'clip.mp4' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'clip.mp4' }).className.includes('selected')).toBe(true)
    expect(screen.getByRole('button', { name: 'alpha.mp4' }).className.includes('selected')).toBe(false)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  test('読み込み失敗時にエラーメッセージを表示する', async () => {
    mockFetchFailure('request failed')

    render(<App />)

    expect(await screen.findByText(/request failed/)).toBeTruthy()
  })

  test('動画が存在しない場合は空状態を表示する', async () => {
    mockFetchOnce({ videos: [] })

    render(<App />)

    expect(await screen.findByText('No MP4 files found in mounted folder.')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  test('動画を選ぶと全画面モーダルで再生する', async () => {
    mockFetchOnce({
      videos: [
        { id: 'YWxwaGEubXA0', name: 'alpha.mp4' },
        { id: 'YnJhdm8ubXA0', name: 'bravo.mp4' },
      ],
    })

    const user = userEvent.setup()
    render(<App />)

    await screen.findByRole('button', { name: 'alpha.mp4' })

    await user.click(screen.getByRole('button', { name: 'bravo.mp4' }))

    const dialog = screen.getByRole('dialog', { name: 'bravo.mp4 player' })
    expect(dialog).toBeTruthy()
    const video = dialog.querySelector('video')
    expect(video).toBeTruthy()
    expect(video?.getAttribute('src')).toBe('/api/videos/YnJhdm8ubXA0/stream')
  })

  test('Escキーでモーダルを閉じる', async () => {
    mockFetchOnce({
      videos: [{ id: 'YWxwaGEubXA0', name: 'alpha.mp4' }],
    })

    const user = userEvent.setup()
    render(<App />)

    await screen.findByRole('button', { name: 'alpha.mp4' })
    await user.click(screen.getByRole('button', { name: 'alpha.mp4' }))

    expect(screen.getByRole('dialog', { name: 'alpha.mp4 player' })).toBeTruthy()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  test('閉じるボタンでモーダルを閉じる', async () => {
    mockFetchOnce({
      videos: [{ id: 'YWxwaGEubXA0', name: 'alpha.mp4' }],
    })

    const user = userEvent.setup()
    render(<App />)

    await screen.findByRole('button', { name: 'alpha.mp4' })
    await user.click(screen.getByRole('button', { name: 'alpha.mp4' }))

    expect(screen.getByRole('dialog', { name: 'alpha.mp4 player' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Close player' }))

    expect(screen.queryByRole('dialog')).toBeNull()
  })
})