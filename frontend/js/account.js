(async function () {
  const { api, escapeHtml, setMessage } = window.RC;
  const greeting = document.getElementById('account-greeting');
  const message = document.getElementById('account-message');
  const container = document.getElementById('account-appointments');

  function render(appointments, email) {
    if (!appointments.length) {
      container.innerHTML = '<div class="account-empty"><h3>Your next great cut starts here.</h3><p>You don’t have any appointments yet.</p><a class="text-link" href="/booking.html">Book your first visit <span>↗</span></a></div>';
      return;
    }
    container.innerHTML = appointments.map((appointment) => {
      const datePart = new Date(appointment.appointmentDate).toISOString().slice(0, 10);
      const date = new Date(`${datePart}T12:00:00`).toLocaleDateString();
      const canCancel = ['Pending', 'Confirmed'].includes(appointment.status);
      return `<article class="account-appointment"><div><p class="service-card-category">${escapeHtml(appointment.bookingId)}</p><h3>${escapeHtml(appointment.serviceName)}</h3><p>${escapeHtml(date)} · ${escapeHtml(appointment.timeSlot)}</p><p class="account-status">Status: ${escapeHtml(appointment.status)}</p></div>
        ${canCancel ? `<button type="button" class="button button-quiet" data-cancel-booking="${escapeHtml(appointment.bookingId)}" data-booking-email="${escapeHtml(email)}">Cancel appointment</button>` : ''}</article>`;
    }).join('');
    container.querySelectorAll('[data-cancel-booking]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!window.confirm('Cancel this appointment? Cancellations are accepted up to 24 hours before the visit.')) return;
        button.disabled = true;
        try {
          await api(`/appointments/${encodeURIComponent(button.dataset.cancelBooking)}/cancel`, {
            method: 'POST', body: { email: button.dataset.bookingEmail },
          });
          setMessage(message, 'Your appointment has been cancelled.', 'success');
          await loadAccount();
        } catch (error) {
          setMessage(message, error.message, 'error');
        } finally {
          button.disabled = false;
        }
      });
    });
  }

  async function loadAccount() {
    const [{ user }, { appointments }] = await Promise.all([api('/auth/me'), api('/appointments/mine')]);
    if (user.role === 'admin') {
      window.location.assign('/admin/');
      return;
    }
    greeting.textContent = `Welcome back, ${user.name}. Here are your studio appointments.`;
    render(appointments, user.email);
  }

  document.getElementById('account-logout').addEventListener('click', async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
      window.location.assign('/');
    } catch (error) {
      setMessage(message, error.message, 'error');
    }
  });

  try {
    await loadAccount();
  } catch (error) {
    if (error.status === 401) {
      window.location.assign('/login.html');
    } else {
      setMessage(message, error.message, 'error');
    }
  }
}());
