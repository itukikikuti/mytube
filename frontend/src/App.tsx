import { useEffect, useMemo, useState } from 'react'

type VideoListItem = {
  id: string
  title: string
}

type MediaItem = {
  id: string
  title: string
  date: number
  type: string
  duration: number
  rate: number
  tags: string[]
  thumbs: string[]
}

type TagItem = {
  id: number
  name: string
}

type HistoryItem = {
  id: number
  media: number
  mediaTitle: string
  date: number
}

type LibraryResponse = {
  videos?: VideoListItem[]
  tags?: TagItem[]
  history?: HistoryItem[]
}

function formatDate(value: number): string {
  const normalized = value < 1_000_000_000_000 ? value * 1000 : value
  const date = new Date(normalized)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatDuration(value: number): string {
  const totalSeconds = Math.max(0, Math.floor(value))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function toThumbSrc(value: string): string {
  return value.startsWith('data:') ? value : `data:image/jpeg;base64,${value}`
}

function App() {
  const [videos, setVideos] = useState<VideoListItem[]>([])
  const [tags, setTags] = useState<TagItem[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [videoDetails, setVideoDetails] = useState<Record<string, MediaItem>>({})
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [detailLoadingId, setDetailLoadingId] = useState('')
  const [error, setError] = useState('')
  const [detailError, setDetailError] = useState('')

  useEffect(() => {
    let active = true

    async function loadLibrary() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch('/api/videos')
        if (!response.ok) {
          throw new Error(`Failed to load library: HTTP ${response.status}`)
        }

        const data = (await response.json()) as LibraryResponse
        if (!active) return

        const videoList = Array.isArray(data.videos) ? data.videos : []
        setVideos(videoList)
        setTags(Array.isArray(data.tags) ? data.tags : [])
        setHistory(Array.isArray(data.history) ? data.history : [])
        setSelectedId((current) => {
          if (videoList.some((video) => video.id === current)) {
            return current
          }

          return videoList[0]?.id ?? ''
        })
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Failed to load library')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadLibrary()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!isModalOpen || !selectedId || videoDetails[selectedId]) {
      return
    }

    let active = true

    async function loadVideoDetails() {
      setDetailLoadingId(selectedId)
      setDetailError('')

      try {
        const response = await fetch(`/api/videos/${encodeURIComponent(selectedId)}`)
        if (!response.ok) {
          throw new Error(`Failed to load media item: HTTP ${response.status}`)
        }

        const detail = (await response.json()) as MediaItem
        if (!active) return

        setVideoDetails((current) => ({
          ...current,
          [selectedId]: detail,
        }))
      } catch (err) {
        if (!active) return
        setDetailError(err instanceof Error ? err.message : 'Failed to load media item')
      } finally {
        if (active) {
          setDetailLoadingId((current) => (current === selectedId ? '' : current))
        }
      }
    }

    loadVideoDetails()

    return () => {
      active = false
    }
  }, [isModalOpen, selectedId, videoDetails])

  const selectedVideoSummary = useMemo(
    () => videos.find((video) => video.id === selectedId) || null,
    [selectedId, videos],
  )

  const selectedVideo = useMemo(
    () => videoDetails[selectedId] || null,
    [selectedId, videoDetails],
  )

  const modalTitle = selectedVideo?.title ?? selectedVideoSummary?.title ?? 'Video'

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
        <header className="hero">
          <div>
            <p className="eyebrow">MYTUBE</p>
            <h1>NAS Library</h1>
          </div>
          <p className="hero-note">SQLite metadata, video list, tags, and history in one place.</p>
        </header>

        {loading && <p className="state">Loading library...</p>}

        {!loading && error && <p className="state error">{error}</p>}

        {!loading && !error && videos.length === 0 && (
          <p className="state">No media items were found in the database.</p>
        )}

        {!loading && !error && videos.length > 0 && (
          <ul className="video-list" aria-label="Media items">
            {videos.map((video) => (
              <li key={video.id}>
                <button
                  type="button"
                  className={video.id === selectedId ? 'video-item selected' : 'video-item'}
                  onClick={() => handleSelectVideo(video.id)}
                >
                  <span className="video-name">{video.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="panel meta-panel" aria-label="Library metadata">
        <div className="panel-section">
          <header className="section-header">
            <div>
              <p className="eyebrow">TAG ITEMS</p>
              <h2>Tag catalog</h2>
            </div>
            <span className="section-count">{tags.length}</span>
          </header>

          {tags.length === 0 ? (
            <p className="state compact">No tag_items found.</p>
          ) : (
            <ul className="chip-list" aria-label="Tag items list">
              {tags.map((tag) => (
                <li key={tag.id} className="chip">
                  {tag.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel-section">
          <header className="section-header">
            <div>
              <p className="eyebrow">HISTORY ITEMS</p>
              <h2>Playback history</h2>
            </div>
            <span className="section-count">{history.length}</span>
          </header>

          {history.length === 0 ? (
            <p className="state compact">No history_items found.</p>
          ) : (
            <ul className="history-list" aria-label="History items list">
              {history.map((entry) => (
                <li key={entry.id} className="history-item">
                  <p className="history-title">{entry.mediaTitle}</p>
                  <p className="history-meta">{formatDate(entry.date)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {isModalOpen && selectedId && (
        <div className="video-modal" role="dialog" aria-modal="true" aria-label={`${modalTitle} details`}>
          <div className="video-modal-card">
            <div className="video-modal-stage">
              <button type="button" className="modal-close" onClick={handleCloseModal} aria-label="Close player">
                Close
              </button>
              <video
                key={selectedId}
                className="video-player fullscreen"
                controls
                preload="metadata"
                autoPlay
                src={`/api/videos/${encodeURIComponent(selectedId)}/stream`}
              >
                Your browser does not support video playback.
              </video>
            </div>

            <aside className="video-modal-details">
              {detailLoadingId === selectedId && !selectedVideo && <p className="state">Loading media details...</p>}

              {detailError && <p className="state error">{detailError}</p>}

              {selectedVideo && (
                <>
                  <div>
                    <p className="eyebrow">MEDIA ITEM</p>
                    <h2 className="modal-title">{selectedVideo.title}</h2>
                  </div>

                  <dl className="details-grid">
                    <div>
                      <dt>Date</dt>
                      <dd>{formatDate(selectedVideo.date)}</dd>
                    </div>
                    <div>
                      <dt>Type</dt>
                      <dd>{selectedVideo.type}</dd>
                    </div>
                    <div>
                      <dt>Duration</dt>
                      <dd>{formatDuration(selectedVideo.duration)}</dd>
                    </div>
                    <div>
                      <dt>Rate</dt>
                      <dd>{selectedVideo.rate}</dd>
                    </div>
                  </dl>

                  <div className="panel-section compact-section">
                    <h3>Tags</h3>
                    {selectedVideo.tags.length === 0 ? (
                      <p className="state compact">No tags attached.</p>
                    ) : (
                      <ul className="chip-list" aria-label="Selected video tags">
                        {selectedVideo.tags.map((tag) => (
                          <li key={tag} className="chip accent">
                            {tag}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="panel-section compact-section">
                    <h3>Thumbs</h3>
                    {selectedVideo.thumbs.length === 0 ? (
                      <p className="state compact">No thumbs attached.</p>
                    ) : (
                      <ul className="thumb-grid" aria-label="Video thumbs">
                        {selectedVideo.thumbs.map((thumb, index) => (
                          <li key={`${selectedVideo.id}-${index}`} className="thumb-item">
                            <img
                              src={toThumbSrc(thumb)}
                              alt={`${selectedVideo.title} thumbnail ${index + 1}`}
                              loading="lazy"
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </aside>
          </div>
        </div>
      )}
    </main>
  )
}

export default App
