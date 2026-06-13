import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  FiFastForward,
  FiMaximize,
  FiMinimize,
  FiPause,
  FiPlay,
  FiRewind,
  FiVolume2,
  FiVolumeX,
} from "react-icons/fi";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";

  const totalSeconds = Math.floor(value);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const paddedSeconds = String(seconds).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${paddedSeconds}`;
  }

  return `${minutes}:${paddedSeconds}`;
}

export type VideoPlayerHandle = {
  seekBy: (deltaSeconds: number) => void;
  togglePlay: () => void;
};

type VideoPlayerProps = {
  src: string;
  title: string;
  onFirstPlay?: () => void;
};

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(function VideoPlayer({ src, title, onFirstPlay }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimerRef = useRef<number | null>(null);
  const swipeRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    startTime: number;
    previewTime: number;
  }>({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startTime: 0,
    previewTime: 0,
  });

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsBoosted, setControlsBoosted] = useState(false);
  const [previewTime, setPreviewTime] = useState<number | null>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipePreviewLabel, setSwipePreviewLabel] = useState<string | null>(null);
  const firstPlayReportedRef = useRef(false);

  const displayedTime = previewTime ?? currentTime;
  const progress = useMemo(() => {
    if (duration <= 0) return 0;
    return clamp((displayedTime / duration) * 100, 0, 100);
  }, [displayedTime, duration]);

  function revealControls() {
    setControlsBoosted(true);

    if (controlsTimerRef.current != null) {
      window.clearTimeout(controlsTimerRef.current);
    }

    controlsTimerRef.current = window.setTimeout(() => {
      setControlsBoosted(false);
      controlsTimerRef.current = null;
    }, 1800);
  }

  function seekTo(time: number) {
    const video = videoRef.current;
    if (!video || !Number.isFinite(time)) return;

    const nextTime = clamp(time, 0, Number.isFinite(video.duration) ? video.duration : time);
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
    setPreviewTime(null);
    setSwipeOffset(0);
    setSwipePreviewLabel(null);
  }

  function seekBy(deltaSeconds: number) {
    const video = videoRef.current;
    if (!video) return;

    seekTo(video.currentTime + deltaSeconds);
  }

  useImperativeHandle(ref, () => ({
    seekBy,
    togglePlay,
  }));

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }

  function handlePlayStarted() {
    if (firstPlayReportedRef.current) return;

    firstPlayReportedRef.current = true;
    onFirstPlay?.();
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "touch") return;

    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;

    swipeRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTime: video.currentTime,
      previewTime: video.currentTime,
    };
    setIsSeeking(true);
    setPreviewTime(video.currentTime);
    setSwipeOffset(0);
    setSwipePreviewLabel(formatTime(video.currentTime));
    revealControls();
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const swipe = swipeRef.current;
    const video = videoRef.current;

    if (!swipe.active || swipe.pointerId !== event.pointerId || !video || !Number.isFinite(video.duration)) {
      return;
    }

    const deltaX = event.clientX - swipe.startX;
    const deltaY = event.clientY - swipe.startY;

    if (Math.abs(deltaX) < 8 || Math.abs(deltaX) < Math.abs(deltaY)) {
      return;
    }

    const nextTime = clamp(swipe.startTime + deltaX * 0.12, 0, video.duration);
    swipe.previewTime = nextTime;
    setPreviewTime(nextTime);
    setSwipeOffset(deltaX);
    setSwipePreviewLabel(`${deltaX >= 0 ? "+" : "-"}${formatTime(Math.abs(nextTime - swipe.startTime))}`);
    revealControls();
  }

  function finishSwipe(event: React.PointerEvent<HTMLDivElement>) {
    const swipe = swipeRef.current;
    const video = videoRef.current;

    if (!swipe.active || swipe.pointerId !== event.pointerId || !video) return;

    const commitTime = swipe.previewTime;

    swipeRef.current = {
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      startTime: 0,
      previewTime: 0,
    };

    setIsSeeking(false);
    setSwipeOffset(0);

    if (Number.isFinite(commitTime)) {
      seekTo(commitTime);
    } else {
      setPreviewTime(null);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;

    switch (event.key) {
      case " ":
      case "Spacebar":
        event.preventDefault();
        togglePlay();
        break;
      case "ArrowLeft":
        event.preventDefault();
        seekTo(video.currentTime - 5);
        break;
      case "ArrowRight":
        event.preventDefault();
        seekTo(video.currentTime + 5);
        break;
      case "ArrowUp":
        event.preventDefault();
        video.volume = clamp(video.volume + 0.1, 0, 1);
        video.muted = false;
        break;
      case "ArrowDown":
        event.preventDefault();
        video.volume = clamp(video.volume - 0.1, 0, 1);
        video.muted = false;
        break;
      case "m":
      case "M":
        event.preventDefault();
        video.muted = !video.muted;
        break;
      case "f":
      case "F":
        event.preventDefault();
        void toggleFullscreen();
        break;
      case "Home":
        event.preventDefault();
        seekTo(0);
        break;
      case "End":
        event.preventDefault();
        seekTo(video.duration);
        break;
      default:
        break;
    }
  }

  async function toggleFullscreen() {
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await container.requestFullscreen();
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setVolume(1);
    setIsMuted(false);
    setPlaybackRate(1);
    setPreviewTime(null);
    setIsSeeking(false);

    const sync = () => {
      setCurrentTime(video.currentTime);
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      setIsPlaying(!video.paused);
      setVolume(video.volume);
      setIsMuted(video.muted);
      setPlaybackRate(video.playbackRate);
      setIsFullscreen(document.fullscreenElement === containerRef.current);
      firstPlayReportedRef.current = false;
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };

    video.addEventListener("loadedmetadata", sync);
    video.addEventListener("timeupdate", sync);
    video.addEventListener("play", sync);
    video.addEventListener("play", handlePlayStarted);
    video.addEventListener("pause", sync);
    video.addEventListener("volumechange", sync);
    video.addEventListener("ratechange", sync);
    video.addEventListener("ended", sync);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    sync();

    return () => {
      video.removeEventListener("loadedmetadata", sync);
      video.removeEventListener("timeupdate", sync);
      video.removeEventListener("play", sync);
      video.removeEventListener("play", handlePlayStarted);
      video.removeEventListener("pause", sync);
      video.removeEventListener("volumechange", sync);
      video.removeEventListener("ratechange", sync);
      video.removeEventListener("ended", sync);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [src]);

  useEffect(() => {
    return () => {
      if (controlsTimerRef.current != null) {
        window.clearTimeout(controlsTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (document.fullscreenElement) {
        event.preventDefault();
        void document.exitFullscreen();
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishSwipe}
      onPointerCancel={finishSwipe}
      onPointerLeave={() => {
        if (!isSeeking) {
          setControlsBoosted(false);
        }
      }}
      onMouseMove={revealControls}
      onFocus={revealControls}
      onKeyDown={handleKeyDown}
      className="group relative h-full min-h-0 w-full overflow-hidden bg-black outline-none"
      style={{ touchAction: "pan-y" }}
      aria-label={`動画プレイヤー: ${title}`}
    >
      <video
        ref={videoRef}
        src={src}
        autoPlay
        playsInline
        className="absolute inset-0 h-full w-full bg-black object-contain"
      />

      {isSeeking && swipePreviewLabel && (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
          style={{ transform: `translateX(${clamp(swipeOffset * 0.08, -24, 24)}px)` }}
        >
          <div className="rounded-full border border-white/12 bg-black/52 px-4 py-2 text-center text-white shadow-[0_10px_32px_rgba(0,0,0,0.28)] backdrop-blur-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">シーク</div>
            <div className="mt-1 text-2xl font-black tabular-nums leading-none">{swipePreviewLabel}</div>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/72 via-black/28 to-transparent px-2.5 pb-2.5 pt-10 sm:px-3 sm:pb-3 md:px-4 md:pb-4">
        <div
          className="pointer-events-auto rounded-[16px] border border-white/10 bg-white/7 px-2 py-2.5 text-white shadow-[0_10px_28px_rgba(0,0,0,0.18)] backdrop-blur-md transition-opacity duration-200 sm:rounded-[18px] sm:px-2.5"
          style={{ opacity: controlsBoosted || isSeeking ? 1 : 0.56 }}
        >
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-white/80">
            <span className="rounded-full bg-white/10 px-2 py-1 font-semibold">
              <span className="inline-flex items-center">
                {isPlaying ? <FiPause size={12} aria-hidden="true" /> : <FiPlay size={12} aria-hidden="true" />}
              </span>
            </span>
            <span className="rounded-full bg-white/10 px-2 py-1 font-semibold">
              {formatTime(displayedTime)} / {formatTime(duration)}
            </span>
            <span className="rounded-full bg-white/10 px-2 py-1 font-semibold">{Math.round(playbackRate * 100) / 100}x</span>
            {isFullscreen && <span className="rounded-full bg-white/10 px-2 py-1 font-semibold">全画面</span>}
          </div>

          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progress}
            onChange={(event) => {
              const nextProgress = Number(event.target.value);
              if (!duration) return;
              seekTo((duration * nextProgress) / 100);
            }}
            aria-label="再生位置"
            className="mb-3 h-2.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-white"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white/14 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
              aria-label={isPlaying ? "一時停止" : "再生"}
              title={isPlaying ? "一時停止" : "再生"}
            >
              {isPlaying ? <FiPause size={18} aria-hidden="true" /> : <FiPlay size={18} aria-hidden="true" />}
            </button>

            <button
              type="button"
              onClick={() => seekTo(currentTime - 10)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white/14 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
              aria-label="10秒戻る"
              title="10秒戻る"
            >
              <FiRewind size={18} aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => seekTo(currentTime + 10)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white/14 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
              aria-label="10秒進む"
              title="10秒進む"
            >
              <FiFastForward size={18} aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.muted = !videoRef.current.muted;
                }
              }}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white/14 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
              aria-label={isMuted ? "ミュート解除" : "ミュート"}
              title={isMuted ? "ミュート解除" : "ミュート"}
            >
              {isMuted ? <FiVolumeX size={18} aria-hidden="true" /> : <FiVolume2 size={18} aria-hidden="true" />}
            </button>

            <label className="flex min-h-11 items-center gap-2 rounded-full bg-white/10 px-3.5 py-2 text-sm font-semibold text-white/90">
              音量
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(event) => {
                  const nextVolume = Number(event.target.value);
                  if (videoRef.current) {
                    videoRef.current.volume = nextVolume;
                    videoRef.current.muted = nextVolume === 0;
                  }
                }}
                className="h-2.5 w-20 cursor-pointer accent-white sm:w-24 md:w-28"
                aria-label="音量"
              />
            </label>

            <label className="flex min-h-11 items-center gap-2 rounded-full bg-white/10 px-3.5 py-2 text-sm font-semibold text-white/90">
              速度
              <select
                value={playbackRate}
                onChange={(event) => {
                  if (videoRef.current) {
                    videoRef.current.playbackRate = Number(event.target.value);
                  }
                }}
                className="rounded-full bg-transparent text-sm font-semibold text-white outline-none"
                aria-label="再生速度"
              >
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
            </label>

            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white/14 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
              aria-label={isFullscreen ? "全画面解除" : "全画面"}
              title={isFullscreen ? "全画面解除" : "全画面"}
            >
              {isFullscreen ? <FiMinimize size={18} aria-hidden="true" /> : <FiMaximize size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default VideoPlayer;