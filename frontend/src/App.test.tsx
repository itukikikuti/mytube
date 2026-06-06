import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

function mockFetchSequence(items: Array<{ body: unknown; status?: number }>) {
  const queue = [...items]

  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(() => {
      const next = queue.shift()
      if (!next) {
        return Promise.reject(new Error('Unexpected fetch call'))
      }

      return Promise.resolve(
        new Response(JSON.stringify(next.body), {
          status: next.status ?? 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      )
    }),
  )
}

function mockFetchFailure(message = 'network error') {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error(message)))
}

test('読み込み表示の後に一覧を表示し、先頭動画を選択状態にする', async () => {
  document.body.innerHTML = ''
  mockFetchSequence([
    {
      body: {
      videos: [
        {
          id: 'Y2xpcC5tcDQ',
          title: 'clip.mp4',
        },
        {
          id: 'YWxwaGEubXA0',
          title: 'alpha.mp4',
        },
      ],
      tags: [
        { id: 1, name: 'featured' },
        { id: 2, name: 'night' },
      ],
      history: [{ id: 1, media: 1, mediaTitle: 'clip.mp4', date: 1717610000 }],
      },
    },
  ])

    render(<App />)

    expect(screen.getByText('Loading library...')).toBeTruthy()

    expect(await screen.findByRole('button', { name: 'clip.mp4' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'clip.mp4' }).className.includes('selected')).toBe(true)
    expect(screen.getByRole('button', { name: 'alpha.mp4' }).className.includes('selected')).toBe(false)
    expect(screen.getByRole('heading', { name: 'Tag catalog' })).toBeTruthy()
    expect(screen.getByText('featured')).toBeTruthy()
    expect(screen.getByText('clip.mp4', { selector: '.history-title' })).toBeTruthy()
  expect(screen.queryByRole('dialog')).toBeNull()
})

test('読み込み失敗時にエラーメッセージを表示する', async () => {
  document.body.innerHTML = ''
  mockFetchFailure('request failed')

    render(<App />)

  expect(await screen.findByText(/request failed/)).toBeTruthy()
})

test('動画が存在しない場合は空状態を表示する', async () => {
  document.body.innerHTML = ''
  mockFetchSequence([{ body: { videos: [], tags: [], history: [] } }])

    render(<App />)

    expect(await screen.findByText('No media items were found in the database.')).toBeTruthy()
    expect(screen.getByText('No tag_items found.')).toBeTruthy()
    expect(screen.getByText('No history_items found.')).toBeTruthy()
  expect(screen.queryByRole('dialog')).toBeNull()
})

test('動画を選ぶと詳細モーダルで再生し、thumbs を表示する', async () => {
  document.body.innerHTML = ''
  mockFetchSequence([
    {
      body: {
        videos: [
          {
            id: 'YWxwaGEubXA0',
            title: 'alpha.mp4',
          },
          {
            id: 'YnJhdm8ubXA0',
            title: 'bravo.mp4',
          },
        ],
        tags: [{ id: 1, name: 'featured' }],
        history: [],
      },
    },
    {
      body: {
        id: 'YWxwaGEubXA0',
        title: 'alpha.mp4',
        date: 1717500000,
        type: 'clip',
        duration: 123,
        rate: 4,
        tags: ['featured', 'night'],
        thumbs: ['thumb-one', 'thumb-two'],
      },
    },
  ])

    const user = userEvent.setup()
    render(<App />)

    await screen.findByRole('button', { name: 'alpha.mp4' })

    await user.click(screen.getByRole('button', { name: 'alpha.mp4' }))

    const dialog = screen.getByRole('dialog', { name: 'alpha.mp4 details' })
    expect(dialog).toBeTruthy()
    const video = dialog.querySelector('video')
    expect(video).toBeTruthy()
    expect(video?.getAttribute('src')).toBe('/api/videos/YWxwaGEubXA0/stream')
    expect(screen.getByText('Type')).toBeTruthy()
    expect(screen.getByText('clip')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'alpha.mp4 thumbnail 1' })).toBeTruthy()
})

test('Escキーでモーダルを閉じる', async () => {
  document.body.innerHTML = ''
  mockFetchSequence([
    {
      body: {
        videos: [
          {
            id: 'YWxwaGEubXA0',
            title: 'alpha.mp4',
          },
        ],
        tags: [],
        history: [],
      },
    },
    {
      body: {
        id: 'YWxwaGEubXA0',
        title: 'alpha.mp4',
        date: 1717500000,
        type: 'clip',
        duration: 123,
        rate: 4,
        tags: [],
        thumbs: [],
      },
    },
  ])

    const user = userEvent.setup()
    render(<App />)

    await screen.findByRole('button', { name: 'alpha.mp4' })
    await user.click(screen.getByRole('button', { name: 'alpha.mp4' }))

    expect(screen.getByRole('dialog', { name: 'alpha.mp4 details' })).toBeTruthy()

    fireEvent.keyDown(window, { key: 'Escape' })

  expect(screen.queryByRole('dialog')).toBeNull()
})

test('閉じるボタンでモーダルを閉じる', async () => {
  document.body.innerHTML = ''
  mockFetchSequence([
    {
      body: {
        videos: [
          {
            id: 'YWxwaGEubXA0',
            title: 'alpha.mp4',
          },
        ],
        tags: [],
        history: [],
      },
    },
    {
      body: {
        id: 'YWxwaGEubXA0',
        title: 'alpha.mp4',
        date: 1717500000,
        type: 'clip',
        duration: 123,
        rate: 4,
        tags: [],
        thumbs: [],
      },
    },
  ])

    const user = userEvent.setup()
    render(<App />)

    await screen.findByRole('button', { name: 'alpha.mp4' })
    await user.click(screen.getByRole('button', { name: 'alpha.mp4' }))

    expect(screen.getByRole('dialog', { name: 'alpha.mp4 details' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Close player' }))

  expect(screen.queryByRole('dialog')).toBeNull()
})
