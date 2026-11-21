import { initComparePlayer } from './encode-compare.js';
import { renderIcons } from './icons.js';

const modal = document.getElementById('encode-modal');
const sidebar = document.getElementById('encode-modal-sidebar');
const playerRoot = document.getElementById('compare-player');
const player = initComparePlayer(playerRoot);

// 一覧の「確認」ボタン: 見比べプレイヤーを開く
document.addEventListener('click', (e) => {
  const openBtn = e.target.closest('[data-compare-open]');
  if (openBtn) {
    player.load({
      encodedSrc: openBtn.dataset.encodedSrc,
      originalSrc: openBtn.dataset.originalSrc,
      frameRate: Number(openBtn.dataset.fps),
    });
    sidebar.replaceChildren();
    if (openBtn.dataset.detailUrl) {
      htmx.ajax('GET', openBtn.dataset.detailUrl, { target: sidebar, swap: 'innerHTML' });
    }
    modal.showModal();
    playerRoot.focus();
    return;
  }
  // 詳細内の「この場面へ」ボタン: 指定位置へシークして一時停止
  const seekBtn = e.target.closest('[data-seek]');
  if (seekBtn) {
    player.seek(Number(seekBtn.dataset.seek));
  }
});

// 設定の開閉
const header = document.getElementById('encode-header');
const settingsToggle = document.getElementById('encode-settings-toggle');
settingsToggle.addEventListener('click', () => {
  const open = header.classList.toggle('settings-open');
  settingsToggle.classList.toggle('is-active', open);
  settingsToggle.setAttribute('aria-expanded', String(open));
});

document.getElementById('encode-modal-close').addEventListener('click', () => modal.close());
modal.addEventListener('close', () => {
  player.unload();
  sidebar.replaceChildren();
});

document.body.addEventListener('htmx:afterSwap', () => renderIcons());
renderIcons();
