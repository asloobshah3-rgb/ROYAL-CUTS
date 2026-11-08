(function () {
  const { api, escapeHtml, safeUrl } = window.RC;
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navItems = [
    ['index.html', 'Home'], ['about.html', 'Our story'], ['services.html', 'Services'],
    ['gallery.html', 'Gallery'], ['contact.html', 'Contact'],
  ];

  const nav = navItems.map(([href, label]) => (
    `<a href="/${href}"${currentPage === href ? ' class="active"' : ''}>${label}</a>`
  )).join('');
  const header = document.querySelector('[data-site-header]');
  if (header) {
    header.innerHTML = `<header class="site-header"><div class="nav-inner">
      <a class="brand" href="/" aria-label="Royal Cuts home"><span class="brand-mark">RC</span><span class="brand-name">ROYAL CUTS<small>LOOK SHARP. FEEL ROYAL.</small></span></a>
      <button class="nav-toggle" type="button" aria-label="Open navigation" aria-expanded="false">☰</button>
      <nav class="nav-links" aria-label="Main navigation">${nav}<a href="/account.html">Account</a><a href="/booking.html" class="nav-book">Book now ↗</a></nav>
    </div></header>`;
    const siteHeader = header.querySelector('.site-header');
    const toggle = header.querySelector('.nav-toggle');
    const links = header.querySelector('.nav-links');
    toggle.addEventListener('click', () => {
      const isOpen = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
      toggle.textContent = isOpen ? '×' : '☰';
    });
    window.addEventListener('scroll', () => siteHeader.classList.toggle('scrolled', window.scrollY > 24), { passive: true });
  }

  const footer = document.querySelector('[data-site-footer]');
  if (footer) {
    footer.innerHTML = `<footer class="site-footer"><div class="wrap"><div class="footer-main">
      <div><a class="brand" href="/"><span class="brand-mark">RC</span><span class="brand-name">ROYAL CUTS<small>LOOK SHARP. FEEL ROYAL.</small></span></a><p class="footer-brand-copy">A modern grooming ritual, delivered with timeless craft. Luxury hair and grooming, made personal.</p></div>
      <div class="footer-col"><h3>Explore</h3><a href="/about.html">Our story</a><a href="/services.html">Services</a><a href="/gallery.html">Gallery</a><a href="/booking.html">Book an appointment</a></div>
      <div class="footer-col"><h3>Connect</h3><a data-footer-phone href="/contact.html">Contact the studio</a><a data-footer-email href="/contact.html">Send us a note</a><a href="/contact.html">Visit us</a></div>
      <div class="footer-col"><h3>Your account</h3><a href="/login.html">Sign in</a><a href="/signup.html">Create an account</a><a href="/admin/">Studio admin</a></div>
      </div><div class="footer-bottom"><span>© ${new Date().getFullYear()} Royal Cuts. All rights reserved.</span><span>Look sharp. Feel royal.</span></div></div></footer>`;
  }

  async function loadSharedContent() {
    const featured = document.getElementById('featured-services');
    if (featured) {
      try {
        const { services } = await api('/services');
        featured.innerHTML = services.slice(0, 4).map((service) => cardMarkup(service)).join('')
          || '<p class="muted">Our service menu is being refreshed. Please contact the studio.</p>';
      } catch (error) {
        featured.innerHTML = `<p class="form-message error">${escapeHtml(error.message)}</p>`;
      }
    }

    try {
      const { settings } = await api('/settings');
      applyContact(settings);
    } catch (error) {
      console.error('Studio contact details are unavailable:', error.message);
    }

    const stories = document.getElementById('testimonial-content');
    if (stories) {
      try {
        const { testimonials } = await api('/testimonials');
        stories.innerHTML = testimonials.length
          ? testimonials.slice(0, 3).map((item) => `<article class="guest-story"><blockquote>“${escapeHtml(item.quote)}”</blockquote><p>${escapeHtml(item.customerName)} <span>· ${escapeHtml(item.service)}</span></p></article>`).join('')
          : '<p class="guest-story-empty">Guest reflections are shared here with permission. We look forward to welcoming you.</p>';
      } catch (error) {
        stories.innerHTML = `<p class="form-message error">${escapeHtml(error.message)}</p>`;
      }
    }
  }

  function cardMarkup(service) {
    const image = safeUrl(service.image);
    const price = Number(service.price) > 0 ? `Price ${Number(service.price).toFixed(2)}` : 'Price set by studio';
    return `<article class="service-card"><div class="service-card-image"><img src="${escapeHtml(image)}" alt="${escapeHtml(service.name)}" loading="lazy"></div>
      <div class="service-card-body"><p class="service-card-category">${escapeHtml(service.category)}</p><h3>${escapeHtml(service.name)}</h3><p>${escapeHtml(service.description)}</p>
      <div class="service-meta"><span>${Number(service.duration)} min</span><strong>${escapeHtml(price)}</strong></div><a class="text-link" href="/booking.html?service=${encodeURIComponent(service._id)}">Book this service <span>↗</span></a></div></article>`;
  }

  function applyContact(settings) {
    if (!settings) return;
    const footerPhone = document.querySelector('[data-footer-phone]');
    const footerEmail = document.querySelector('[data-footer-email]');
    if (footerPhone && settings.phone) {
      footerPhone.href = `tel:${settings.phone.replace(/[^\d+]/g, '')}`;
      footerPhone.textContent = settings.phone;
    }
    if (footerEmail && settings.email) {
      footerEmail.href = `mailto:${settings.email}`;
      footerEmail.textContent = settings.email;
    }
  }

  loadSharedContent();
  window.RoyalCuts = { cardMarkup, applyContact };
}());
