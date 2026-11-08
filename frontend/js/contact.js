(function () {
  const form = document.getElementById('contact-form');
  const { api, escapeHtml, safeUrl, setMessage } = window.RC;
  const feedback = document.getElementById('contact-message');

  function makeLink(id, value, href) {
    if (!value) return;
    const current = document.getElementById(id);
    const link = document.createElement('a');
    link.id = id;
    link.href = href;
    link.textContent = value;
    current.replaceWith(link);
  }

  async function loadStudioInfo() {
    try {
      const { settings } = await api('/settings');
      const address = document.getElementById('contact-address');
      makeLink('contact-phone', settings.phone, `tel:${(settings.phone || '').replace(/[^\d+]/g, '')}`);
      if (settings.whatsapp) {
        const number = settings.whatsapp.replace(/\D/g, '');
        if (number) makeLink('contact-whatsapp', settings.whatsapp, `https://wa.me/${number}`);
      }
      makeLink('contact-email', settings.email, `mailto:${settings.email || ''}`);
      if (settings.address) address.textContent = settings.address;
      const closed = new Set(settings.closedDays || []);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      document.getElementById('contact-hours').textContent =
        `${days.filter((_, day) => !closed.has(day)).join(', ')} · ${settings.openTime}–${settings.closeTime}`;
      const socials = document.getElementById('contact-socials');
      socials.innerHTML = [
        ['Instagram', settings.instagram], ['Facebook', settings.facebook],
      ].filter(([, url]) => safeUrl(url)).map(([label, url]) =>
        `<a href="${escapeHtml(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`
      ).join('');
      if (safeUrl(settings.mapEmbedUrl)) {
        const mapWrap = document.getElementById('map-wrap');
        mapWrap.hidden = false;
        document.getElementById('studio-map').src = safeUrl(settings.mapEmbedUrl);
      }
      window.RoyalCuts.applyContact(settings);
    } catch (error) {
      setMessage(feedback, `Studio contact details could not be loaded: ${error.message}`, 'error');
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    setMessage(feedback, 'Sending your message…');
    const values = Object.fromEntries(new FormData(form).entries());
    try {
      const result = await api('/contact', { method: 'POST', body: values });
      setMessage(feedback, result.message, 'success');
      form.reset();
    } catch (error) {
      setMessage(feedback, error.message, 'error');
    } finally {
      submit.disabled = false;
    }
  });

  loadStudioInfo();
}());
