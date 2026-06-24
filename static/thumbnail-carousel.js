export function initThumbnailCarousel({ intervalMs = 1800 } = {}) {
  return window.setInterval(() => {
    document.querySelectorAll('.media-item-thumb-track').forEach(track => {
      const thumb = track.closest('.media-item-thumb');
      const thumbCount = track.children.length;
      if (!thumb || thumbCount <= 1) return;

      const currentThumbIndex = ((Number(thumb.dataset.thumbIndex) || 0) + 1) % thumbCount;
      thumb.dataset.thumbIndex = String(currentThumbIndex);
      track.style.transform = `translateX(${-currentThumbIndex * 100}%)`;
      thumb.querySelectorAll('.media-item-thumb-indicator').forEach((indicator, indicatorIndex) => {
        indicator.classList.toggle('is-active', indicatorIndex === currentThumbIndex);
      });
    });
  }, intervalMs);
}