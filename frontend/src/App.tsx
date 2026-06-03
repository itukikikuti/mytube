import { useMemo, useState, useEffect } from 'react'
import { toApiUrl } from './lib/toApiUrl'

type Video = {
  id: string
  name: string
}

type VideosResponse = {
  videos?: Video[]
}

function App() {
  const [videos, setVideos] = useState<Video[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadVideos() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(toApiUrl('/api/videos'))
        if (!response.ok) {
          throw new Error(`Failed to load videos: HTTP ${response.status}`)
        }

        const data = (await response.json()) as VideosResponse
        if (!active) return

        const list = Array.isArray(data.videos) ? data.videos : []
        setVideos(list)
        if (list.length > 0) {
          setSelectedId(list[0].id)
        }
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Failed to load videos')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadVideos()

    return () => {
      active = false
    }
  }, [])

  const selectedVideo = useMemo(
    () => videos.find((video) => video.id === selectedId) || null,
    [selectedId, videos],
  )

  return (
    <main className="layout">
      <aside className="panel sidebar">
        <header className="sidebar-header">
          <p className="eyebrow">MYTUBE</p>
          <h1>NAS Videos</h1>
        </header>

        {loading && <p className="state">Loading videos...</p>}

        {!loading && error && <p className="state error">{error}</p>}

        {!loading && !error && videos.length === 0 && (
          <p className="state">No MP4 files found in mounted folder.</p>
        )}

        {!loading && !error && videos.length > 0 && (
          <ul className="video-list" aria-label="Video list">
            {videos.map((video) => (
              <li key={video.id}>
                <button
                  type="button"
                  className={video.id === selectedId ? 'video-item selected' : 'video-item'}
                  onClick={() => setSelectedId(video.id)}
                >
                  <span className="video-name">{video.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="panel player-area">
        <header className="player-header">
          <h2>{selectedVideo ? selectedVideo.name : 'Select a video'}</h2>
        </header>

        {selectedVideo ? (
          <div className="player-frame">
            <video
              key={selectedVideo.id}
              className="video-player"
              controls
              preload="metadata"
              src={toApiUrl(`/api/videos/${encodeURIComponent(selectedVideo.id)}/stream`)}
            >
              Your browser does not support video playback.
            </video>
          </div>
        ) : (
          <div className="empty-player">No video selected.</div>
        )}
      </section>
    </main>
  )
}

export default App
