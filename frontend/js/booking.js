(function () {
  const form = document.getElementById('booking-form');
  if (!form) return;
  const { api, escapeHtml, setMessage } = window.RC;
  const serviceSelect = document.getElementById('booking-service');
  const dateInput = document.getElementById('booking-date');
  const timeSelect = document.getElementById('booking-time');
  const feedback = document.getElementById('booking-message');
  const submit = document.getElementById('booking-submit');
  const confirmation = document.getElementById('booking-confirmation');
  const lookupForm = document.getElementById('lookup-form');
  const lookupMessage = document.getElementById('lookup-message');
  const cancelButton = document.getElementById('cancel-booking');
  let lookupBooking = null;

  const params = new URLSearchParams(window.location.search);
  const requestedService = params.get('service');

  async function loadServices() {
    try {
      const [{ services }, { settings }] = await Promise.all([api('/services'), api('/settings')]);
      const dateParts = new Intl.DateTimeFormat('en-CA', {
        timeZone: settings.timeZone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit',
      }).formatToParts(new Date());
      const dateValues = Object.fromEntries(dateParts.map((part) => [part.type, part.value]));
      dateInput.min = `${dateValues.year}-${dateValues.month}-${dateValues.day}`;
      serviceSelect.innerHTML = '<option value="">Select a service</option>' + services.map((service) => (
        `<option value="${escapeHtml(service._id)}">${escapeHtml(service.name)} — ${Number(service.duration)} min</option>`
      )).join('');
      if (requestedService && services.some((service) => service._id === requestedService)) {
        serviceSelect.value = requestedService;
      }
    } catch (error) {
      serviceSelect.innerHTML = '<option value="">Services are temporarily unavailable</option>';
      setMessage(feedback, error.message, 'error');
    }
  }

  async function refreshAvailability() {
    timeSelect.disabled = true;
    timeSelect.innerHTML = '<option value="">Choose a date and service first</option>';
    if (!dateInput.value || !serviceSelect.value) return;
    setMessage(feedback, 'Checking available times…');
    try {
      const data = await api(`/appointments/availability?date=${encodeURIComponent(dateInput.value)}&serviceId=${encodeURIComponent(serviceSelect.value)}`);
      if (!data.slots.length) {
        timeSelect.innerHTML = '<option value="">No available times for this date</option>';
        setMessage(feedback, 'There are no available times on this date. Please try another day.');
        return;
      }
      timeSelect.innerHTML = '<option value="">Select a time</option>' + data.slots.map((slot) => (
        `<option value="${escapeHtml(slot)}">${escapeHtml(slot)}</option>`
      )).join('');
      timeSelect.disabled = false;
      setMessage(feedback, `${data.slots.length} available time${data.slots.length === 1 ? '' : 's'} · ${data.duration} minute appointment`);
    } catch (error) {
      setMessage(feedback, error.message, 'error');
    }
  }

  serviceSelect.addEventListener('change', refreshAvailability);
  dateInput.addEventListener('change', refreshAvailability);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(feedback, '');
    submit.disabled = true;
    submit.textContent = 'Submitting…';
    const values = Object.fromEntries(new FormData(form).entries());
    try {
      const result = await api('/appointments', { method: 'POST', body: {
        customerName: values.customerName,
        phone: values.phone,
        email: values.email,
        serviceId: values.serviceId,
        date: values.date,
        timeSlot: values.timeSlot,
        message: values.message,
      } });
      form.hidden = true;
      confirmation.hidden = false;
      confirmation.innerHTML = `<p class="eyebrow">REQUEST RECEIVED</p><h3>Thank you, ${escapeHtml(result.appointment.customerName)}.</h3>
        <p>Your appointment request is in the studio’s hands.</p><p><strong>Booking ID:</strong> ${escapeHtml(result.appointment.bookingId)}</p>
        <p><strong>${escapeHtml(result.appointment.service)}</strong> · ${escapeHtml(result.appointment.appointmentDate)} at ${escapeHtml(result.appointment.timeSlot)}</p>
        <p><strong>Status:</strong> ${escapeHtml(result.appointment.status)}</p><p>Please keep your booking ID to look up or cancel this appointment.</p>`;
    } catch (error) {
      if (error.status === 409) {
        await refreshAvailability();
        setMessage(feedback, `${error.message} Available times have been refreshed.`, 'error');
      } else {
        setMessage(feedback, error.message, 'error');
      }
    } finally {
      submit.disabled = false;
      submit.innerHTML = 'Request appointment <span aria-hidden="true">↗</span>';
    }
  });

  lookupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    cancelButton.hidden = true;
    lookupBooking = null;
    const values = Object.fromEntries(new FormData(lookupForm).entries());
    try {
      const { appointment } = await api(`/appointments/${encodeURIComponent(values.bookingId)}?email=${encodeURIComponent(values.email)}`);
      lookupBooking = { bookingId: appointment.bookingId, email: values.email, status: appointment.status };
      const datePart = new Date(appointment.appointmentDate).toISOString().slice(0, 10);
      const appointmentDate = new Date(`${datePart}T12:00:00`).toLocaleDateString();
      setMessage(lookupMessage, `${appointment.serviceName} · ${appointmentDate} at ${appointment.timeSlot} · ${appointment.status}`, 'success');
      cancelButton.hidden = !['Pending', 'Confirmed'].includes(appointment.status);
    } catch (error) {
      setMessage(lookupMessage, error.message, 'error');
    }
  });

  cancelButton.addEventListener('click', async () => {
    if (!lookupBooking || !window.confirm('Cancel this appointment?')) return;
    cancelButton.disabled = true;
    try {
      const result = await api(`/appointments/${encodeURIComponent(lookupBooking.bookingId)}/cancel`, {
        method: 'POST', body: { email: lookupBooking.email },
      });
      setMessage(lookupMessage, result.message, 'success');
      cancelButton.hidden = true;
    } catch (error) {
      setMessage(lookupMessage, error.message, 'error');
    } finally {
      cancelButton.disabled = false;
    }
  });

  loadServices().then(() => {
    if (dateInput.value && serviceSelect.value) refreshAvailability();
  });
}());
