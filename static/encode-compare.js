// エンコード前後の見比べプレイヤー
// - フリッカーテスト: 動画の上でポインタを動かす/ドラッグすると、中央より左なら変換後、右なら元動画に瞬時に切り替わる
//   (マウスのホバー・ドラッグ、Android のタッチ(指でドラッグ)の両方に対応)
// - スライダー: 動画の上をドラッグすると、境目より左が元動画・右が変換後になり、境目をドラッグで動かせる
// - 2窓: 変換後と元動画を横に並べて再生
// どちらのモードでも 2つの動画は再生位置・一時停止・シークを常に同期させる (変換後側が主、元動画側が従)
export function initComparePlayer(root) {
  const stage = root.querySelector('.compare-stage');
  const encodedVideo = root.querySelector('.compare-video-encoded');
  const originalVideo = root.querySelector('.compare-video-original');
  const playBtn = root.querySelector('.compare-play-btn');
  const seekbar = root.querySelector('.compare-seekbar');
  const timeDisplay = root.querySelector('.compare-time');
  const sideDisplay = root.querySelector('.compare-side');
  const fullscreenBtn = root.querySelector('.compare-fullscreen-btn');
  const modeButtons = root.querySelectorAll('[data-compare-mode]');
  const stepButtons = root.querySelectorAll('[data-compare-step]');
  const message = root.querySelector('.compare-message');
  const encodedLabel = root.querySelector('.compare-pane-encoded .compare-label');
  const originalLabel = root.querySelector('.compare-pane-original .compare-label');

  let fps = 30;
  let showingOriginal = false;

  function setMode(mode) {
    root.dataset.mode = mode;
    modeButtons.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.compareMode === mode));
    // スライダーは元動画が左・変換後が右なので矢印の向きを変える
    encodedLabel.textContent = mode === 'slider' ? '変換後 ▶' : '◀ 変換後';
    originalLabel.textContent = mode === 'slider' ? '◀ 元動画' : '元動画 ▶';
    updateSideDisplay();
  }

  function setShowOriginal(value) {
    if (showingOriginal === value) return;
    showingOriginal = value;
    root.classList.toggle('show-original', value);
    updateSideDisplay();
  }

  function updateSideDisplay() {
    if (!sideDisplay) return;
    const mode = root.dataset.mode;
    if (mode === 'flicker') sideDisplay.textContent = showingOriginal ? '元動画' : '変換後';
    else if (mode === 'slider') sideDisplay.textContent = '左: 元動画 / 右: 変換後';
    else sideDisplay.textContent = '';
  }

  function showMessage(text) {
    if (!message) return;
    message.textContent = text;
    message.hidden = !text;
  }

  // ===== フリッカーテスト: ポインタ位置で表示を切り替える =====
  function updateSideFromPointer(clientX) {
    if (root.dataset.mode !== 'flicker') return;
    const rect = stage.getBoundingClientRect();
    setShowOriginal(clientX - rect.left > rect.width / 2);
  }

  // ===== スライダー: ドラッグで境目を動かす =====
  function setSplitFromPointer(clientX) {
    const rect = stage.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    stage.style.setProperty('--split', `${ratio * 100}%`);
  }

  let downX = null;
  let downY = null;
  let dragged = false;

  stage.addEventListener('pointerdown', (e) => {
    downX = e.clientX;
    downY = e.clientY;
    dragged = false;
    updateSideFromPointer(e.clientX);
    // 指が動画の外に出ても切り替えを続けられるようにする (スライダーはマウスでも外に出て動かせるように)
    if (e.pointerType !== 'mouse' || root.dataset.mode === 'slider') stage.setPointerCapture?.(e.pointerId);
  });
  stage.addEventListener('pointermove', (e) => {
    if (downX !== null && (Math.abs(e.clientX - downX) > 10 || Math.abs(e.clientY - downY) > 10)) dragged = true;
    updateSideFromPointer(e.clientX);
    // スライダーはドラッグ中だけ境目を動かす (クリックだけなら再生/停止)
    if (root.dataset.mode === 'slider' && downX !== null && dragged) setSplitFromPointer(e.clientX);
  });
  const endPointer = () => {
    downX = null;
    downY = null;
  };
  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);

  // ドラッグせずにクリック/タップしたときだけ再生/停止を切り替える
  stage.addEventListener('click', () => {
    if (dragged) return;
    togglePlay();
  });

  // ===== 同期 =====
  // 従側が読み込み中で止まったら主側も止めて待つ (ズレたまま進まないように)
  let waitingForOriginal = false;

  function togglePlay() {
    if (!encodedVideo.currentSrc) return;
    if (encodedVideo.paused) {
      encodedVideo.play().catch(() => {});
    } else {
      encodedVideo.pause();
    }
  }

  encodedVideo.addEventListener('play', () => {
    playBtn.dataset.state = 'playing';
    if (originalVideo.currentSrc) originalVideo.play().catch(() => {});
    startSyncLoop();
  });
  encodedVideo.addEventListener('pause', () => {
    playBtn.dataset.state = 'paused';
    if (waitingForOriginal) return;
    originalVideo.pause();
    originalVideo.currentTime = encodedVideo.currentTime;
  });
  encodedVideo.addEventListener('ended', () => {
    playBtn.dataset.state = 'paused';
  });
  encodedVideo.addEventListener('seeking', () => {
    if (originalVideo.currentSrc) originalVideo.currentTime = encodedVideo.currentTime;
    updateTime();
  });
  encodedVideo.addEventListener('waiting', () => {
    if (!originalVideo.paused) originalVideo.pause();
  });
  encodedVideo.addEventListener('playing', () => {
    if (originalVideo.paused && originalVideo.currentSrc) originalVideo.play().catch(() => {});
  });
  originalVideo.addEventListener('loadedmetadata', () => {
    originalVideo.currentTime = encodedVideo.currentTime;
  });
  originalVideo.addEventListener('waiting', () => {
    if (!encodedVideo.paused) {
      waitingForOriginal = true;
      encodedVideo.pause();
    }
  });
  originalVideo.addEventListener('canplay', () => {
    if (waitingForOriginal) {
      waitingForOriginal = false;
      encodedVideo.play().catch(() => {});
    }
  });
  originalVideo.addEventListener('error', () => {
    if (originalVideo.getAttribute('src')) showMessage('元動画をこのブラウザで再生できません');
  });
  encodedVideo.addEventListener('error', () => {
    if (encodedVideo.getAttribute('src')) showMessage('変換後の動画を再生できません');
  });

  // 同期ループ: 小さなズレは再生速度の微調整で滑らかに追いつかせ、大きなズレだけシークで合わせる
  let syncRaf = null;
  function syncTick() {
    if (!originalVideo.currentSrc || (encodedVideo.paused && !waitingForOriginal)) {
      syncRaf = null;
      return;
    }
    if (!waitingForOriginal && !originalVideo.seeking) {
      const drift = originalVideo.currentTime - encodedVideo.currentTime;
      if (Math.abs(drift) > 0.5) {
        originalVideo.currentTime = encodedVideo.currentTime;
        originalVideo.playbackRate = encodedVideo.playbackRate;
      } else {
        const correction = Math.max(-0.25, Math.min(0.25, drift * 0.5));
        originalVideo.playbackRate = encodedVideo.playbackRate * (1 - correction);
      }
    }
    syncRaf = requestAnimationFrame(syncTick);
  }
  function startSyncLoop() {
    if (syncRaf === null) syncRaf = requestAnimationFrame(syncTick);
  }

  // ===== コントロール =====
  function formatTime(secs) {
    if (!Number.isFinite(secs) || secs < 0) return '0:00';
    const total = Math.floor(secs);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
    return (h > 0 ? `${h}:` : '') + `${mm}:${String(s).padStart(2, '0')}`;
  }

  function updateTime() {
    const t = encodedVideo.currentTime;
    const d = encodedVideo.duration;
    timeDisplay.textContent = `${formatTime(t)}.${String(Math.floor((t % 1) * 10))} / ${formatTime(d)}`;
    if (d) {
      const pct = (t / d) * 100;
      seekbar.value = Math.round((t / d) * 1000);
      seekbar.style.setProperty('--fill', `${pct}%`);
    }
  }

  encodedVideo.addEventListener('timeupdate', updateTime);
  encodedVideo.addEventListener('loadedmetadata', updateTime);

  playBtn.addEventListener('click', togglePlay);
  seekbar.addEventListener('input', () => {
    if (!encodedVideo.duration) return;
    encodedVideo.currentTime = (seekbar.value / 1000) * encodedVideo.duration;
  });

  function seek(time) {
    if (!encodedVideo.currentSrc) return;
    encodedVideo.currentTime = Math.max(0, Math.min(encodedVideo.duration || time, time));
  }

  // 1コマ送り/戻し (一時停止して動かす)
  function step(frames) {
    encodedVideo.pause();
    seek(encodedVideo.currentTime + frames / fps);
  }
  stepButtons.forEach((btn) => btn.addEventListener('click', () => step(Number(btn.dataset.compareStep))));
  modeButtons.forEach((btn) => btn.addEventListener('click', () => setMode(btn.dataset.compareMode)));

  fullscreenBtn?.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      root.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  root.addEventListener('keydown', (e) => {
    if (e.target.closest('input, select, textarea')) return;
    if (e.key === ' ') {
      e.preventDefault();
      togglePlay();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const dir = e.key === 'ArrowLeft' ? -1 : 1;
      if (encodedVideo.paused) step(dir);
      else seek(encodedVideo.currentTime + dir * 5);
    } else if (e.key === 'Shift') {
      // Shift を押している間だけ元動画を表示 (フリッカーテストのキーボード版)
      if (root.dataset.mode === 'flicker') setShowOriginal(true);
    }
  });
  root.addEventListener('keyup', (e) => {
    if (e.key === 'Shift' && root.dataset.mode === 'flicker') setShowOriginal(false);
  });

  function load({ encodedSrc, originalSrc, frameRate }) {
    unload();
    fps = frameRate > 0 ? frameRate : 30;
    showMessage(encodedSrc ? '' : 'エンコード結果がまだありません');
    if (encodedSrc) encodedVideo.src = encodedSrc;
    if (originalSrc) originalVideo.src = originalSrc;
  }

  function unload() {
    waitingForOriginal = false;
    for (const video of [encodedVideo, originalVideo]) {
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.playbackRate = 1;
    }
    setShowOriginal(false);
    playBtn.dataset.state = 'paused';
    seekbar.value = 0;
    seekbar.style.setProperty('--fill', '0%');
    timeDisplay.textContent = '0:00 / 0:00';
    showMessage('');
  }

  setMode(root.dataset.mode || 'flicker');

  // 指定位置で一時停止して見比べる (画質が低い場面へのジャンプ用)
  function seekAndPause(time) {
    encodedVideo.pause();
    seek(time);
  }

  return { load, unload, seek: seekAndPause, setMode };
}
