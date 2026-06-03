import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import App from './App'
import { toApiUrl } from './lib/toApiUrl'

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

describe('toApiUrl', () => {
  test('uses the pathname when there is no api base', () => {
    expect(toApiUrl('/api/videos', '')).toBe('/api/videos')
  })

  test('appends a non-api base directly', () => {
    expect(toApiUrl('/api/videos', 'http://localhost:8080')).toBe('http://localhost:8080/api/videos')
  })

  test('avoids duplicating api when the base already ends with /api', () => {
    expect(toApiUrl('/api/videos', 'https://example.test/api')).toBe('https://example.test/api/videos')
  })
})

describe('App', () => {
  test('shows loading, then renders a list and selects the first video', async () => {
    mockFetchOnce({
      videos: [
        { id: 'Y2xpcC5tcDQ', name: 'clip.mp4' },
        { id: 'YWxwaGEubXA0', name: 'alpha.mp4' },
      ],
    })

    render(<App />)

    expect(screen.getByText('Loading videos...')).toBeTruthy()

    expect(await screen.findByRole('heading', { name: 'clip.mp4' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'clip.mp4' }).className.includes('selected')).toBe(true)
    expect(screen.getByRole('button', { name: 'alpha.mp4' }).className.includes('selected')).toBe(false)

    const video = document.querySelector('video')
    expect(video).toBeTruthy()
    expect(video?.getAttribute('src')).toBe('/api/videos/Y2xpcC5tcDQ/stream')
  })

  test('shows an error message when loading fails', async () => {
    mockFetchFailure('request failed')

    render(<App />)

    expect(await screen.findByText(/request failed/)).toBeTruthy()
  })

  test('shows the empty state when no videos exist', async () => {
    mockFetchOnce({ videos: [] })

    render(<App />)

    expect(await screen.findByText('No MP4 files found in mounted folder.')).toBeTruthy()
    expect(screen.getByText('Select a video')).toBeTruthy()
    expect(screen.getByText('No video selected.')).toBeTruthy()
  })

  test('updates the selected video and player source when a different video is chosen', async () => {
    mockFetchOnce({
      videos: [
        { id: 'YWxwaGEubXA0', name: 'alpha.mp4' },
        { id: 'YnJhdm8ubXA0', name: 'bravo.mp4' },
      ],
    })

    const user = userEvent.setup()
    render(<App />)

    await screen.findByRole('heading', { name: 'alpha.mp4' })

    await user.click(screen.getByRole('button', { name: 'bravo.mp4' }))

    expect(screen.getByRole('heading', { name: 'bravo.mp4' })).toBeTruthy()
    const video = document.querySelector('video')
    expect(video).toBeTruthy()
    expect(video?.getAttribute('src')).toBe('/api/videos/YnJhdm8ubXA0/stream')
  })
})