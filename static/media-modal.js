export function initMediaModal({ mediaModal, mediaModalClose, mediaPlayer }) {
  if (!mediaModal || !mediaModalClose || !mediaPlayer) {
    return;
  }

  function playVideo(src) {
    mediaPlayer.src = src;
    mediaModal.showModal();
    mediaPlayer.play();
  }

  window.playVideo = playVideo;

  mediaModalClose.addEventListener('click', () => mediaModal.close());
  mediaModal.addEventListener('close', () => {
    mediaPlayer.pause();
    mediaPlayer.removeAttribute('src');
    mediaPlayer.load();
  });
}