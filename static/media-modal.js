export function initMediaModal({
  mediaModal,
  mediaModalClose,
  mediaPlayer,
  mediaModalDate,
  mediaModalTitle,
  mediaModalDuration,
  mediaModalRate,
  mediaModalThumbs,
  mediaModalPlayLocal,
}) {
  if (!mediaModal || !mediaModalClose || !mediaPlayer || !mediaModalDate || !mediaModalTitle || !mediaModalDuration || !mediaModalRate || !mediaModalThumbs || !mediaModalPlayLocal) {
    return;
  }

  let currentMediaId = null;

  function formatDuration(duration) {
    const totalSeconds = Number(duration);
    if (!Number.isFinite(totalSeconds)) return '';

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = String(totalSeconds % 60).padStart(2, '0');

    return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
  }

  function setModalDetails(sourceElement) {
    const rate = Math.max(0, Math.min(5, Number(sourceElement.dataset.rate) || 0));

    mediaModalDate.textContent = sourceElement.dataset.date || '';
    mediaModalTitle.textContent = sourceElement.dataset.title || '';
    mediaModalDuration.textContent = formatDuration(sourceElement.dataset.duration);
    mediaModalRate.textContent = `${'♥'.repeat(rate)}${'♡'.repeat(5 - rate)}`;
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