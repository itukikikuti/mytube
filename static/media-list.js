export function initMediaList({ mediaList }) {
  if (!mediaList) {
    return;
  }

  // スケルトン要素はロード済みカードと同じ構造にする（src/index.ts の /medias を参照）。
  // 同じCSSルールで高さが決まるため、ロード前後で高さが一致してガタつかない。
  const SKELETON = '<div><div class="media-item-thumb"></div><p class="media-item-title"></p><div class="media-item-meta"></div></div>';

  const mediaRequests = new WeakMap();

  const intersectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadMedia(entry.target);
      } else {
        const controller = mediaRequests.get(entry.target);
        if (controller) {
          controller.abort();
          mediaRequests.delete(entry.target);
        }

        entry.target.innerHTML = SKELETON;
        entry.target.removeAttribute('data-loaded');
        entry.target.removeAttribute('data-loading');
      }
    });
  }, { threshold: 0 });

  async function loadMedia(target) {
    const mediaId = target.dataset.mediaId;

    if (!mediaId || target.dataset.loading === 'true' || target.dataset.loaded === 'true') {
      return;
    }

    const controller = new AbortController();
    mediaRequests.set(target, controller);
    target.dataset.loading = 'true';

    try {
      const response = await fetch(`/medias/${encodeURIComponent(mediaId)}`, {
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch media ${mediaId}`);
      }

      const html = await response.text();
      if (controller.signal.aborted) {
        return;
      }

      target.innerHTML = html;
      target.dataset.loaded = 'true';

      if (!target.dataset.previewInit) {
        target.dataset.previewInit = 'true';
        target.addEventListener('mouseenter', () => {
          const video = target.querySelector('.media-item-preview');
          if (!video) return;
          video.classList.add('is-active');
          video.play().catch(() => {});
        });
        target.addEventListener('mouseleave', () => {
          const video = target.querySelector('.media-item-preview');
          if (!video) return;
          video.pause();
          video.currentTime = 0;
          video.classList.remove('is-active');
        });
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error(error);
      }
    } finally {
      if (mediaRequests.get(target) === controller) {
        mediaRequests.delete(target);
        target.removeAttribute('data-loading');
      }
    }
  }

  function observeListItems() {
    mediaList.querySelectorAll('[data-media-id]').forEach(target => {
      intersectionObserver.observe(target);
    });
  }

  observeListItems();
  mediaList.addEventListener('htmx:afterSwap', observeListItems);
}