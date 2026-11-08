(async function () {
  const grid = document.getElementById('gallery-grid');
  const filters = document.getElementById('gallery-filters');
  const lightbox = document.getElementById('lightbox');
  if (!grid || !filters || !lightbox) return;
  const { api, escapeHtml, safeUrl } = window.RC;
  let items = [];
  let activeCategory = 'All';

  function render() {
    const visible = items.filter((item) => activeCategory === 'All' || item.category === activeCategory);
    grid.innerHTML = visible.map((item, index) => `<button class="gallery-item" type="button" data-index="${index}" aria-label="View ${escapeHtml(item.title)}">
      <img src="${escapeHtml(safeUrl(item.image))}" alt="${escapeHtml(item.alt)}" loading="lazy"><span>${escapeHtml(item.title)}</span></button>`).join('')
      || '<p class="muted">More studio moments are on the way.</p>';
    grid.querySelectorAll('.gallery-item').forEach((button) => {
      button.addEventListener('click', () => openLightbox(visible[Number(button.dataset.index)]));
    });
  }

  function openLightbox(item) {
    lightbox.querySelector('img').src = safeUrl(item.image);
    lightbox.querySelector('img').alt = item.alt;
    lightbox.querySelector('p').textContent = item.title;
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    lightbox.querySelector('.lightbox-close').focus();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightbox.querySelector('img').src = '';
    document.body.style.overflow = '';
  }

  filters.addEventListener('click', (event) => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    activeCategory = button.dataset.category;
    filters.querySelectorAll('.filter-button').forEach((item) => item.classList.toggle('active', item === button));
    render();
  });
  lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (event) => { if (event.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !lightbox.hidden) closeLightbox(); });

  try {
    ({ items } = await api('/services/gallery'));
    render();
  } catch (error) {
    grid.innerHTML = `<p class="form-message error">${escapeHtml(error.message)}</p>`;
  }
}());
