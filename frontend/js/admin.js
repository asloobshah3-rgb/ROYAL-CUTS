(function () {
  const { api, escapeHtml, safeUrl, setMessage } = window.RC;
  const statuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
  const globalMessage = document.getElementById('admin-global-message');
  const serviceForm = document.getElementById('service-form');
  const galleryForm = document.getElementById('gallery-form');
  const settingsForm = document.getElementById('settings-form');
  const testimonialForm = document.getElementById('testimonial-form');

  function showError(error) {
    setMessage(globalMessage, error.message, 'error');
    if (error.status === 401 || error.status === 403) window.location.assign('/login.html?next=%2Fadmin%2F');
  }

  function dateLabel(date) {
    const datePart = new Date(date).toISOString().slice(0, 10);
    const value = new Date(`${datePart}T12:00:00`);
    return Number.isNaN(value.getTime()) ? '' : value.toLocaleDateString();
  }

  function timestampLabel(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
  }

  async function loadOverview() {
    const data = await api('/admin/overview');
    const labels = [['Total', data.total], ['Pending', data.Pending], ['Confirmed', data.Confirmed], ['Completed', data.Completed], ['Cancelled', data.Cancelled]];
    document.getElementById('overview-cards').innerHTML = labels.map(([label, count]) =>
      `<article class="stat-card"><span>${label}</span><strong>${Number(count)}</strong></article>`
    ).join('');
  }

  async function loadServiceOptions() {
    const { services } = await api('/services/admin/all');
    const select = document.getElementById('booking-filter-service');
    select.innerHTML = '<option value="">All services</option>' + services.map((service) =>
      `<option value="${escapeHtml(service._id)}">${escapeHtml(service.name)}</option>`
    ).join('');
    return services;
  }

  async function loadAppointments() {
    const params = new URLSearchParams();
    const search = document.getElementById('booking-search').value.trim();
    const date = document.getElementById('booking-filter-date').value;
    const serviceId = document.getElementById('booking-filter-service').value;
    const status = document.getElementById('booking-filter-status').value;
    if (search) params.set('search', search);
    if (date) params.set('date', date);
    if (serviceId) params.set('serviceId', serviceId);
    if (status) params.set('status', status);
    const { appointments } = await api(`/admin/appointments?${params.toString()}`);
    const rows = document.getElementById('appointment-rows');
    if (!appointments.length) {
      rows.innerHTML = '<tr><td colspan="6" class="admin-empty">No appointments match these filters.</td></tr>';
      return;
    }
    rows.innerHTML = appointments.map((appointment) => {
      const options = statuses.map((status) => `<option${appointment.status === status ? ' selected' : ''}>${status}</option>`).join('');
      return `<tr><td><strong>${escapeHtml(appointment.bookingId)}</strong><small>${escapeHtml(appointment.message || 'No guest note')}</small></td>
        <td>${escapeHtml(appointment.customerName)}<small><a href="mailto:${escapeHtml(appointment.email)}">${escapeHtml(appointment.email)}</a><br>${escapeHtml(appointment.phone)}</small></td>
        <td>${escapeHtml(appointment.serviceName)}</td><td>${escapeHtml(dateLabel(appointment.appointmentDate))}<small>${escapeHtml(appointment.timeSlot)}</small></td>
        <td>${escapeHtml(appointment.status)}</td><td><div class="status-control"><select aria-label="Status for ${escapeHtml(appointment.bookingId)}" data-status-for="${escapeHtml(appointment._id)}">${options}</select>
        <button type="button" data-update-status="${escapeHtml(appointment._id)}">Update</button></div></td></tr>`;
    }).join('');
    rows.querySelectorAll('[data-update-status]').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.dataset.updateStatus;
        const status = rows.querySelector(`[data-status-for="${CSS.escape(id)}"]`).value;
        button.disabled = true;
        try {
          await api(`/admin/appointments/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status } });
          setMessage(globalMessage, 'Appointment status updated.', 'success');
          await Promise.all([loadAppointments(), loadOverview()]);
        } catch (error) {
          showError(error);
        } finally {
          button.disabled = false;
        }
      });
    });
  }

  async function loadServices() {
    const { services } = await api('/services/admin/all');
    const container = document.getElementById('service-list');
    const active = services.filter((service) => service.isActive);
    container.innerHTML = active.length ? active.map((service) =>
      `<article class="admin-item"><img src="${escapeHtml(safeUrl(service.image))}" alt=""><div><h3>${escapeHtml(service.name)}</h3><p>${escapeHtml(service.category)} · ${Number(service.duration)} min · Price ${Number(service.price).toFixed(2)}</p><p>${escapeHtml(service.description)}</p></div><div><button type="button" data-edit-service="${escapeHtml(service._id)}">Edit</button> <button type="button" data-delete-service="${escapeHtml(service._id)}">Remove</button></div></article>`
    ).join('') : '<p class="admin-empty">No active services.</p>';
    container.querySelectorAll('[data-edit-service]').forEach((button) => {
      button.addEventListener('click', () => {
        const service = services.find((item) => item._id === button.dataset.editService);
        Object.entries(service).forEach(([key, value]) => {
          const field = serviceForm.elements.namedItem(key);
          if (field) field.value = value;
        });
        serviceForm.elements.namedItem('id').value = service._id;
        serviceForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
    container.querySelectorAll('[data-delete-service]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!window.confirm('Remove this service from the public menu?')) return;
        try {
          await api(`/services/${encodeURIComponent(button.dataset.deleteService)}`, { method: 'DELETE' });
          setMessage(globalMessage, 'Service removed from the public menu.', 'success');
          await Promise.all([loadServices(), loadServiceOptions()]);
        } catch (error) {
          showError(error);
        }
      });
    });
  }

  async function loadGallery() {
    const { items } = await api('/services/admin/gallery');
    const container = document.getElementById('gallery-list');
    container.innerHTML = items.length ? items.filter((item) => item.isActive).map((item) =>
      `<article class="admin-item"><img src="${escapeHtml(safeUrl(item.image))}" alt="${escapeHtml(item.alt)}"><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.category)} · ${escapeHtml(item.image)}</p></div><button type="button" data-delete-gallery="${escapeHtml(item._id)}">Remove</button></article>`
    ).join('') : '<p class="admin-empty">No gallery images yet.</p>';
    container.querySelectorAll('[data-delete-gallery]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!window.confirm('Remove this image from the gallery?')) return;
        try {
          await api(`/services/admin/gallery/${encodeURIComponent(button.dataset.deleteGallery)}`, { method: 'DELETE' });
          await loadGallery();
          setMessage(globalMessage, 'Gallery image removed.', 'success');
        } catch (error) {
          showError(error);
        }
      });
    });
  }

  async function loadSettings() {
    const { settings } = await api('/admin/settings');
    ['openTime', 'closeTime', 'slotIntervalMinutes', 'timeZone', 'phone', 'whatsapp', 'email', 'address', 'mapEmbedUrl', 'instagram', 'facebook'].forEach((key) => {
      settingsForm.elements.namedItem(key).value = settings[key] == null ? (key === 'timeZone' ? 'UTC' : '') : settings[key];
    });
    settingsForm.querySelectorAll('[name="closedDays"]').forEach((checkbox) => {
      checkbox.checked = settings.closedDays.includes(Number(checkbox.value));
    });
  }

  async function loadMessages() {
    const { messages } = await api('/admin/messages');
    document.getElementById('contact-messages').innerHTML = messages.length ? messages.map((message) =>
      `<article class="admin-message"><h3>${escapeHtml(message.name)}</h3><div class="message-meta">${escapeHtml(message.email)} · ${escapeHtml(timestampLabel(message.createdAt))}</div><p>${escapeHtml(message.message)}</p></article>`
    ).join('') : '<p class="admin-empty">There are no contact messages yet.</p>';
  }

  async function loadTestimonials() {
    const { testimonials } = await api('/testimonials/admin/all');
    const container = document.getElementById('testimonial-list');
    container.innerHTML = testimonials.length ? testimonials.map((item) =>
      `<article class="admin-item testimonial-admin-item"><div class="testimonial-mark">“</div><div><h3>${escapeHtml(item.customerName)} · ${escapeHtml(item.service)}</h3><p>${escapeHtml(item.quote)}</p></div><button type="button" data-delete-testimonial="${escapeHtml(item._id)}">Remove</button></article>`
    ).join('') : '<p class="admin-empty">No guest stories published yet. Add verified feedback with the guest’s permission.</p>';
    container.querySelectorAll('[data-delete-testimonial]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!window.confirm('Remove this testimonial from the website?')) return;
        try {
          await api(`/testimonials/${encodeURIComponent(button.dataset.deleteTestimonial)}`, { method: 'DELETE' });
          await loadTestimonials();
          setMessage(globalMessage, 'Testimonial removed.', 'success');
        } catch (error) {
          showError(error);
        }
      });
    });
  }

  serviceForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(serviceForm).entries());
    const id = values.id;
    delete values.id;
    values.price = Number(values.price);
    values.duration = Number(values.duration);
    try {
      await api(id ? `/services/${encodeURIComponent(id)}` : '/services', { method: id ? 'PATCH' : 'POST', body: values });
      serviceForm.reset();
      serviceForm.elements.namedItem('id').value = '';
      setMessage(globalMessage, 'Service saved.', 'success');
      await Promise.all([loadServices(), loadServiceOptions()]);
    } catch (error) {
      showError(error);
    }
  });
  document.getElementById('service-reset').addEventListener('click', () => {
    serviceForm.reset();
    serviceForm.elements.namedItem('id').value = '';
  });

  galleryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await api('/services/admin/gallery', { method: 'POST', body: Object.fromEntries(new FormData(galleryForm).entries()) });
      galleryForm.reset();
      await loadGallery();
      setMessage(globalMessage, 'Gallery image added.', 'success');
    } catch (error) {
      showError(error);
    }
  });

  settingsForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(settingsForm).entries());
    values.slotIntervalMinutes = Number(values.slotIntervalMinutes);
    values.closedDays = Array.from(settingsForm.querySelectorAll('[name="closedDays"]:checked')).map((checkbox) => Number(checkbox.value));
    try {
      await api('/admin/settings', { method: 'PATCH', body: values });
      setMessage(globalMessage, 'Studio settings saved.', 'success');
    } catch (error) {
      showError(error);
    }
  });

  testimonialForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await api('/testimonials', { method: 'POST', body: Object.fromEntries(new FormData(testimonialForm).entries()) });
      testimonialForm.reset();
      await loadTestimonials();
      setMessage(globalMessage, 'Testimonial published.', 'success');
    } catch (error) {
      showError(error);
    }
  });

  document.getElementById('apply-filters').addEventListener('click', () => loadAppointments().catch(showError));
  document.getElementById('refresh-dashboard').addEventListener('click', () => refresh().catch(showError));
  document.getElementById('admin-logout').addEventListener('click', async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
      window.location.assign('/login.html');
    } catch (error) {
      showError(error);
    }
  });

  async function refresh() {
    await api('/auth/me').then(({ user }) => {
      if (user.role !== 'admin') throw Object.assign(new Error('Administrator access is required.'), { status: 403 });
      document.getElementById('admin-name').textContent = user.name;
    });
    await Promise.all([loadOverview(), loadServiceOptions(), loadAppointments(), loadServices(), loadGallery(), loadSettings(), loadMessages(), loadTestimonials()]);
    setMessage(globalMessage, '');
  }

  refresh().catch(showError);
}());
