export function initMediaModal({
  mediaModal,
  mediaModalClose,
  mediaPlayer,
  mediaModalDate,
  mediaModalTitle,
  mediaModalDuration,
  mediaModalSize,
  mediaModalPlayCount,
  mediaModalRate,
  mediaModalThumbs,
  mediaModalPlayLocal,
}) {
  if (!mediaModal || !mediaModalClose || !mediaPlayer || !mediaModalDate || !mediaModalTitle || !mediaModalDuration || !mediaModalRate || !mediaModalThumbs || !mediaModalPlayLocal) {
    return;
  }

  const mediaImage = document.getElementById('media-image');
  const mediaBook = document.getElementById('media-book');

  const MODE_BY_TYPE = { image: 'image', anime: 'image', book: 'book' };
  const modeOf = (type) => MODE_BY_TYPE[type] ?? 'video';
  let currentMode = 'video';

  // ===== カスタムプレイヤーコントロール =====
  const playerWrapper = document.getElementById('player-wrapper');
  const playerPlayBtn = document.getElementById('player-play-btn');
  const playerSeekbar = document.getElementById('player-seekbar');
  const playerTimeDisplay = document.getElementById('player-time');
  const playerFullscreenBtn = document.getElementById('player-fullscreen-btn');

  let controlsHideTimer = null;

  function showControls(autohide = true) {
    playerWrapper.classList.add('controls-active');
    clearTimeout(controlsHideTimer);
    if (autohide && !mediaPlayer.paused) {
      controlsHideTimer = setTimeout(() => {
        if (!mediaPlayer.paused) playerWrapper.classList.remove('controls-active');
      }, 1000);
    }
  }

  function formatTime(secs) {
    if (!Number.isFinite(secs) || secs < 0) return '0:00';
    const total = Math.floor(secs);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
    return (h > 0 ? `${h}:` : '') + `${mm}:${String(s).padStart(2, '0')}`;
  }

  function updateTimeDisplay() {
    playerTimeDisplay.textContent = `${formatTime(mediaPlayer.currentTime)} / ${formatTime(mediaPlayer.duration)}`;
  }

  function updateSeekbar() {
    if (!mediaPlayer.duration) return;
    const pct = (mediaPlayer.currentTime / mediaPlayer.duration) * 100;
    playerSeekbar.value = Math.round((mediaPlayer.currentTime / mediaPlayer.duration) * 1000);
    playerSeekbar.style.setProperty('--fill', `${pct}%`);
  }

  mediaPlayer.addEventListener('timeupdate', () => {
    updateTimeDisplay();
    updateSeekbar();
  });

  mediaPlayer.addEventListener('loadedmetadata', () => {
    playerSeekbar.value = 0;
    playerSeekbar.style.setProperty('--fill', '0%');
    updateTimeDisplay();
  });

  mediaPlayer.addEventListener('play', () => {
    playerPlayBtn.dataset.state = 'playing';
    showControls(true);
  });

  mediaPlayer.addEventListener('pause', () => {
    playerPlayBtn.dataset.state = 'paused';
    showControls(false);
  });

  mediaPlayer.addEventListener('emptied', () => {
    playerPlayBtn.dataset.state = 'paused';
    playerSeekbar.value = 0;
    playerSeekbar.style.setProperty('--fill', '0%');
    playerTimeDisplay.textContent = '0:00 / 0:00';
  });

  playerWrapper.addEventListener('mousemove', () => showControls(true));
  playerWrapper.addEventListener('touchstart', () => showControls(true), { passive: true });

  // ビデオ領域クリックで再生/停止トグル
  playerWrapper.addEventListener('click', (e) => {
    if (currentMode !== 'video') return;
    if (e.target.closest('#player-play-btn, #player-fullscreen-btn, #player-seekbar')) return;
    if (mediaPlayer.paused) {
      mediaPlayer.play();
    } else {
      mediaPlayer.pause();
    }
  });

  playerPlayBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (mediaPlayer.paused) {
      mediaPlayer.play();
    } else {
      mediaPlayer.pause();
    }
  });

  playerSeekbar.addEventListener('click', (e) => e.stopPropagation());
  playerSeekbar.addEventListener('input', () => {
    if (!mediaPlayer.duration) return;
    const pct = playerSeekbar.value / 1000;
    mediaPlayer.currentTime = pct * mediaPlayer.duration;
    playerSeekbar.style.setProperty('--fill', `${pct * 100}%`);
    updateTimeDisplay();
  });

  playerFullscreenBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
      playerWrapper.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  document.addEventListener('fullscreenchange', () => {
    playerFullscreenBtn.dataset.state = document.fullscreenElement ? 'fullscreen' : 'normal';
    if (document.fullscreenElement) {
      const orientation = mediaPlayer.videoWidth >= mediaPlayer.videoHeight ? 'landscape' : 'portrait';
      screen.orientation?.lock(orientation).catch(() => {});
    } else {
      screen.orientation?.unlock();
    }
  });
  let currentMediaId = null;

  function setModalDetails(sourceElement) {
    const rate = Math.max(0, Math.min(5, Number(sourceElement.dataset.rate) || 0));
    const mode = modeOf(sourceElement.dataset.type ?? 'video');

    mediaModalDate.textContent = sourceElement.dataset.date || '';
    mediaModalTitle.textContent = sourceElement.dataset.title || '';
    mediaModalDuration.textContent = sourceElement.dataset.duration || '';
    mediaModalSize.textContent = sourceElement.dataset.size || '';
    mediaModalPlayCount.textContent = `${Number(sourceElement.dataset.playCount) || 0}回`;
    mediaModalRate.innerHTML = `${'♥'.repeat(rate)}<span style="color: gray">${'♥'.repeat(5 - rate)}</span>`;

    if (mode !== 'image') {
      mediaModalThumbs.replaceChildren(...Array.from(sourceElement.querySelectorAll('.media-item-thumb-image')).map((image) => {
        const thumb = image.cloneNode(false);
        thumb.className = 'media-modal-thumb';
        return thumb;
      }));
    } else {
      mediaModalThumbs.replaceChildren();
    }
  }

  function clearModalDetails() {
    mediaModalDate.textContent = '';
    mediaModalTitle.textContent = '';
    mediaModalDuration.textContent = '';
    mediaModalSize.textContent = '';
    mediaModalPlayCount.textContent = '';
    mediaModalRate.textContent = '';
    mediaModalThumbs.replaceChildren();
  }

  function playVideo(src, sourceElement) {
    currentMode = modeOf(sourceElement?.dataset.type ?? 'video');
    currentMediaId = sourceElement?.closest('[data-media-id]')?.dataset.mediaId ?? null;
    if (sourceElement) setModalDetails(sourceElement);
    playerWrapper.classList.toggle('is-image', currentMode === 'image');
    playerWrapper.classList.toggle('is-book', currentMode === 'book');
    if (currentMode === 'image') {
      mediaImage.src = src;
    } else if (currentMode === 'book') {
      mediaBook.src = src;
    } else {
      mediaPlayer.src = src;
    }
    mediaModal.showModal();
    if (currentMode === 'video') mediaPlayer.play();
  }

  window.playVideo = playVideo;

  playerWrapper.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (!mediaPlayer.duration) return;
    const delta = e.deltaY < 0 ? 5 : -5;
    mediaPlayer.currentTime = Math.max(0, Math.min(mediaPlayer.duration, mediaPlayer.currentTime + delta));
    showControls(true);
  }, { passive: false });

  let touchStartX = null;
  let touchStartY = null;
  let touchStartTime = null;
  let isSeeking = false;
  mediaModal.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = mediaPlayer.currentTime;
    isSeeking = false;
  }, { passive: true });
  playerWrapper.addEventListener('touchmove', (e) => {
    if (touchStartX === null || !mediaPlayer.duration) return;
    const deltaX = e.touches[0].clientX - touchStartX;
    const deltaY = e.touches[0].clientY - touchStartY;
    if (!isSeeking) {
      if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) return;
      if (Math.abs(deltaX) < Math.abs(deltaY)) return;
      isSeeking = true;
    }
    e.preventDefault();
    const seekDelta = deltaX;
    mediaPlayer.currentTime = Math.max(0, Math.min(mediaPlayer.duration, touchStartTime + seekDelta * 0.1));
    showControls(true);
  }, { passive: false });
  mediaModal.addEventListener('touchend', () => {
    touchStartX = null;
    touchStartY = null;
    touchStartTime = null;
    isSeeking = false;
  }, { passive: true });

  mediaModalClose.addEventListener('click', () => mediaModal.close());
  mediaModalPlayLocal.addEventListener('click', () => {
    if (!currentMediaId) return;
    fetch('/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ media: Number(currentMediaId) }),
    });
  });
  mediaModal.addEventListener('close', () => {
    mediaPlayer.pause();
    mediaPlayer.removeAttribute('src');
    mediaPlayer.load();
    mediaImage.src = '';
    mediaBook.removeAttribute('src');
    playerWrapper.classList.remove('is-image', 'is-book');
    clearModalDetails();
    currentMediaId = null;
    currentMode = 'video';
  });
}