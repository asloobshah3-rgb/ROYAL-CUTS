(async function () {
  const list = document.getElementById('all-services');
  if (!list) return;
  try {
    const { services } = await window.RC.api('/services');
    const categories = ['Haircut & Styling', 'Beard Grooming', 'Facial Treatment', 'Premium Services'];
    const sections = categories.map((category) => {
      const entries = services.filter((service) => service.category === category);
      if (!entries.length) return '';
      return `<section class="service-category"><div class="service-category-heading"><p class="eyebrow">${window.RC.escapeHtml(category)}</p><h2>${window.RC.escapeHtml(category)}</h2></div><div class="service-grid service-grid-full">${entries.map(window.RoyalCuts.cardMarkup).join('')}</div></section>`;
    }).join('');
    list.innerHTML = sections || '<p class="muted">Our service menu is being refreshed. Please contact the studio.</p>';
  } catch (error) {
    list.innerHTML = `<p class="form-message error">${window.RC.escapeHtml(error.message)}</p>`;
  }
}());
