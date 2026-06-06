import { useMemo, useState, useEffect } from 'react'

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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadVideos() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch('/api/videos')
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

  useEffect(() => {
    if (!isModalOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsModalOpen(false)
      }
    }

    document.body.classList.add('modal-open')
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isModalOpen])

  function handleSelectVideo(videoId: string) {
    setSelectedId(videoId)
    setIsModalOpen(true)
  }

  function handleCloseModal() {
    setIsModalOpen(false)
  }

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
                  onClick={() => handleSelectVideo(video.id)}
                >
                  <span className="video-name">{video.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {selectedVideo && isModalOpen && (
        <div className="video-modal" role="dialog" aria-modal="true" aria-label={`${selectedVideo.name} player`}>
          <button type="button" className="modal-close" onClick={handleCloseModal} aria-label="Close player">
            Close
          </button>
          <div className="video-modal-content">
            <video
              key={selectedVideo.id}
              className="video-player fullscreen"
              controls
              preload="metadata"
              autoPlay
              src={`/api/videos/${encodeURIComponent(selectedVideo.id)}/stream`}
            >
              Your browser does not support video playback.
            </video>
          </div>
        </div>
      )}
    </main>
  )
}

export default App
