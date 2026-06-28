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

  let currentMediaId = null;

  function setModalDetails(sourceElement) {
    const rate = Math.max(0, Math.min(5, Number(sourceElement.dataset.rate) || 0));

    mediaModalDate.textContent = sourceElement.dataset.date || '';
    mediaModalTitle.textContent = sourceElement.dataset.title || '';
    mediaModalDuration.textContent = sourceElement.dataset.duration || '';
    mediaModalPlayCount.textContent = `${Number(sourceElement.dataset.playCount) || 0}回`;
    mediaModalRate.innerHTML = `${'♥'.repeat(rate)}<span style="color: gray">${'♥'.repeat(5 - rate)}</span>`;
    mediaModalThumbs.replaceChildren(...Array.from(sourceElement.querySelectorAll('.media-item-thumb-image')).map((image) => {
      const thumb = image.cloneNode(false);
      thumb.className = 'media-modal-thumb';
      return thumb;
    }));
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
    mediaPlayer.src = src;
    currentMediaId = sourceElement?.closest('[data-media-id]')?.dataset.mediaId ?? null;
    if (sourceElement) setModalDetails(sourceElement);
    mediaModal.showModal();
    mediaPlayer.play();
  }

  window.playVideo = playVideo;

  mediaModal.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (!mediaPlayer.duration) return;
    const delta = e.deltaY < 0 ? 5 : -5;
    mediaPlayer.currentTime = Math.max(0, Math.min(mediaPlayer.duration, mediaPlayer.currentTime + delta));
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
  mediaModal.addEventListener('touchmove', (e) => {
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
    clearModalDetails();
    currentMediaId = null;
  });
}