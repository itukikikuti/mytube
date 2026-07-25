export function initMediaModal({
  mediaModal,
  mediaModalClose,
  mediaPlayer,
  mediaModalDate,
  mediaModalTitle,
  mediaModalDuration,
  mediaModalPlayCount,
  mediaModalRate,
  mediaModalThumbs,
  mediaModalPlayLocal,
}) {
  if (!mediaModal || !mediaModalClose || !mediaPlayer || !mediaModalDate || !mediaModalTitle || !mediaModalDuration || !mediaModalRate || !mediaModalThumbs || !mediaModalPlayLocal) {
    return;
  }

  const mediaImage = document.getElementById('media-image');

  // ===== 2窓比較再生（一時機能） =====
  const originalPlayer = document.getElementById('media-player-original');

  function isComparing() {
    return playerWrapper.classList.contains('is-compare');
  }

  function stopCompare() {
    playerWrapper.classList.remove('is-compare', 'show-original');
    originalPlayer.pause();
    originalPlayer.removeAttribute('src');
    originalPlayer.load();
    originalPlayer.playbackRate = 1;
  }

  // original 側が存在しない（404等）場合は1窓に戻す
  originalPlayer.addEventListener('error', () => {
    if (originalPlayer.getAttribute('src')) stopCompare();
  });

  mediaPlayer.addEventListener('play', () => {
    if (isComparing()) originalPlayer.play().catch(() => {});
  });
  mediaPlayer.addEventListener('pause', () => {
    if (isComparing()) originalPlayer.pause();
  });
  mediaPlayer.addEventListener('seeking', () => {
    if (isComparing()) originalPlayer.currentTime = mediaPlayer.currentTime;
  });
  originalPlayer.addEventListener('loadedmetadata', () => {
    if (isComparing()) originalPlayer.currentTime = mediaPlayer.currentTime;
  });

  // 同期ループ: 小さなズレは再生速度の微調整で滑らかに追いつかせ、大きなズレだけシークで合わせる
  let syncRaf = null;
  function syncTick() {
    if (!isComparing()) {
      syncRaf = null;
      return;
    }
    const drift = originalPlayer.currentTime - mediaPlayer.currentTime;
    if (mediaPlayer.paused || Math.abs(drift) > 0.5) {
      if (Math.abs(drift) > 0.03) originalPlayer.currentTime = mediaPlayer.currentTime;
      originalPlayer.playbackRate = mediaPlayer.playbackRate;
    } else {
      const correction = Math.max(-0.25, Math.min(0.25, drift * 0.5));
      originalPlayer.playbackRate = mediaPlayer.playbackRate * (1 - correction);
    }
    syncRaf = requestAnimationFrame(syncTick);
  }
  function startSyncLoop() {
    if (syncRaf === null) syncRaf = requestAnimationFrame(syncTick);
  }

  // ===== カスタムプレイヤーコントロール =====
  const playerWrapper = document.getElementById('player-wrapper');

  // 重ね合わせ比較（一時機能）: フリッカーテスト。マウスが中央より左なら変換後、右なら元動画を瞬間切り替えで表示
  playerWrapper.addEventListener('mousemove', (e) => {
    if (!isComparing()) return;
    const rect = playerWrapper.getBoundingClientRect();
    playerWrapper.classList.toggle('show-original', e.clientX - rect.left > rect.width / 2);
  });
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

  mediaPlayer.addEventListener('ended', () => {
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
    const type = sourceElement.dataset.type ?? 'video';
    const isImageType = type === 'image' || type === 'anime';

    mediaModalDate.textContent = sourceElement.dataset.date || '';
    mediaModalTitle.textContent = sourceElement.dataset.title || '';
    mediaModalDuration.textContent = sourceElement.dataset.duration || '';
    mediaModalPlayCount.textContent = `${Number(sourceElement.dataset.playCount) || 0}回`;
    mediaModalRate.innerHTML = `${'♥'.repeat(rate)}<span style="color: gray">${'♥'.repeat(5 - rate)}</span>`;

    if (!isImageType) {
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
    mediaModalPlayCount.textContent = '';
    mediaModalRate.textContent = '';
    mediaModalThumbs.replaceChildren();
  }

  function playVideo(src, sourceElement) {
    const type = sourceElement?.dataset.type ?? 'video';
    const isImageType = type === 'image' || type === 'anime';
    currentMediaId = sourceElement?.closest('[data-media-id]')?.dataset.mediaId ?? null;
    if (sourceElement) setModalDetails(sourceElement);
    stopCompare();
    if (isImageType) {
      playerWrapper.classList.add('is-image');
      mediaImage.src = src;
    } else {
      playerWrapper.classList.remove('is-image');
      mediaPlayer.src = src;
      // 2窓比較再生（一時機能）: original 配下の同名ファイルを並べて再生
      if (src.startsWith('/videos/')) {
        playerWrapper.classList.add('is-compare');
        originalPlayer.src = src.replace('/videos/', '/original/');
        startSyncLoop();
      }
    }
    mediaModal.showModal();
    if (!isImageType) mediaPlayer.play();
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
    stopCompare();
    mediaImage.src = '';
    playerWrapper.classList.remove('is-image');
    clearModalDetails();
    currentMediaId = null;
  });
}