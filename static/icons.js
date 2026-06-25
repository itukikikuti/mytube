export function renderIcons() {
  if (!window.lucide?.createIcons) {
    return;
  }

  window.lucide.createIcons({
    attrs: {
      'aria-hidden': 'true',
      focusable: 'false',
    },
  });
}