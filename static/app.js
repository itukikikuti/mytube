import { initMediaList } from './media-list.js';
import { initMediaModal } from './media-modal.js';
import { initThumbnailCarousel } from './thumbnail-carousel.js';

initMediaList({
  mediaList: document.getElementById('media-list'),
});

initThumbnailCarousel();

initMediaModal({
  mediaModal: document.getElementById('media-modal'),
  mediaModalClose: document.getElementById('media-modal-close'),
  mediaPlayer: document.getElementById('media-player'),
});