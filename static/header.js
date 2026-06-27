export function initHeader({ mediaHeader, filterToggle }) {
  if (!mediaHeader || !filterToggle) {
    return;
  }

  filterToggle.addEventListener('click', () => {
    const open = mediaHeader.classList.toggle('filters-open');
    filterToggle.setAttribute('aria-expanded', String(open));
  });
}
