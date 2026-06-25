import { initMediaList } from './media-list.js';
import { initMediaModal } from './media-modal.js';
import { initThumbnailCarousel } from './thumbnail-carousel.js';
import { renderIcons } from './icons.js';

initMediaList({
  mediaList: document.getElementById('media-list'),
});

initThumbnailCarousel();

initMediaModal({
  mediaModal: document.getElementById('media-modal'),
  mediaModalClose: document.getElementById('media-modal-close'),
  mediaPlayer: document.getElementById('media-player'),
  mediaModalDate: document.getElementById('media-modal-date'),
  mediaModalTitle: document.getElementById('media-modal-title'),
  mediaModalDuration: document.getElementById('media-modal-duration'),
  mediaModalPlayCount: document.getElementById('media-modal-play-count'),
  mediaModalRate: document.getElementById('media-modal-rate'),
  mediaModalThumbs: document.getElementById('media-modal-thumbs'),
  mediaModalPlayLocal: document.getElementById('media-modal-play-local'),
});

renderIcons();