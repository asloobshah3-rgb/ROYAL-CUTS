const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit').rateLimit;
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const Setting = require('../models/Setting');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const {
  cleanString, isEmail, isPhone, validDateString, dateOnly, timeToMinutes, studioDate, localDateTimeToUtc,
} = require('../utils/validation');
const { slotKeys, availableTimes } = require('../utils/schedule');

const router = express.Router();
const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 12,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many booking requests. Please try again later.' },
});

router.get('/availability', async (req, res, next) => {
  try {
    const date = cleanString(req.query.date, 10);
    const serviceId = cleanString(req.query.serviceId, 30);
    if (!validDateString(date)) return res.status(400).json({ message: 'Choose a valid appointment date.' });
    if (!/^[a-f\d]{24}$/i.test(serviceId)) return res.status(400).json({ message: 'Choose a valid service.' });
    const [service, setting] = await Promise.all([
      Service.findOne({ _id: serviceId, isActive: true }).lean(),
      Setting.findOne({ key: 'studio' }).lean(),
    ]);
    if (!service) return res.status(404).json({ message: 'Service not found.' });
    if (!setting) return res.status(503).json({ message: 'Studio schedule is not configured.' });
    if (date < studioDate(new Date(), setting.timeZone || 'UTC')) {
      return res.status(400).json({ message: 'Appointments must be booked for a future date.' });
    }
    if (setting.closedDays.includes(new Date(`${date}T00:00:00.000Z`).getUTCDay())) return res.json({ date, slots: [] });

    const appointments = await Appointment.find({
      appointmentDate: dateOnly(date),
      status: { $in: ['Pending', 'Confirmed'] },
    }).select('slotKeys').lean();
    const occupied = new Set(appointments.flatMap((appointment) => appointment.slotKeys));
    const now = Date.now();
    const slots = availableTimes(date, service.duration, setting, occupied).filter((time) => {
      const start = localDateTimeToUtc(date, time, setting.timeZone || 'UTC');
      return start && start.getTime() > now;
    });
    return res.json({ date, slots, duration: service.duration });
  } catch (error) {
    return next(error);
  }
});

router.post('/', bookingLimiter, optionalAuthenticate, async (req, res, next) => {
  try {
    const customerName = cleanString(req.body.customerName, 100);
    const email = cleanString(req.body.email, 254).toLowerCase();
    const phone = cleanString(req.body.phone, 30);
    const serviceId = cleanString(req.body.serviceId, 30);
    const date = cleanString(req.body.date, 10);
    const timeSlot = cleanString(req.body.timeSlot, 5);
    const message = cleanString(req.body.message, 1000);
    if (customerName.length < 2 || !isEmail(email) || !isPhone(phone)
      || !/^[a-f\d]{24}$/i.test(serviceId) || !validDateString(date) || timeToMinutes(timeSlot) < 0) {
      return res.status(400).json({ message: 'Check your name, email, phone, service, date and selected time.' });
    }

    const [service, setting] = await Promise.all([
      Service.findOne({ _id: serviceId, isActive: true }),
      Setting.findOne({ key: 'studio' }).lean(),
    ]);
    if (!service) return res.status(404).json({ message: 'The selected service is no longer available.' });
    if (!setting) return res.status(503).json({ message: 'Studio schedule is not configured.' });
    const timeZone = setting.timeZone || 'UTC';
    const today = studioDate(new Date(), timeZone);
    if (date < today) return res.status(400).json({ message: 'Appointments must be booked for a future date.' });

    const startMinutes = timeToMinutes(timeSlot);
    const open = timeToMinutes(setting.openTime);
    const close = timeToMinutes(setting.closeTime);
    if (setting.closedDays.includes(new Date(`${date}T00:00:00.000Z`).getUTCDay())
      || startMinutes < open || startMinutes + service.duration > close
      || (startMinutes - open) % setting.slotIntervalMinutes !== 0) {
      return res.status(400).json({ message: 'That time is outside the studio schedule. Choose an available slot.' });
    }
    const appointmentStart = localDateTimeToUtc(date, timeSlot, timeZone);
    if (!appointmentStart || appointmentStart.getTime() <= Date.now()) {
      return res.status(400).json({ message: 'Choose a future appointment time.' });
    }

    const keys = slotKeys(date, startMinutes, service.duration, setting.slotIntervalMinutes);
    const collision = await Appointment.exists({
      appointmentDate: dateOnly(date),
      status: { $in: ['Pending', 'Confirmed'] },
      slotKeys: { $in: keys },
    });
    if (collision) return res.status(409).json({ message: 'That time was just booked. Please choose another available slot.' });

    const bookingId = `RC-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    const appointment = await Appointment.create({
      bookingId, customerName, email, phone, service: service._id, serviceName: service.name,
      serviceDuration: service.duration, appointmentDate: dateOnly(date), timeSlot,
      slotKeys: keys, message, customerUser: req.user ? req.user._id : null,
    });
    return res.status(201).json({
      message: 'Your appointment request has been received.',
      appointment: {
        bookingId: appointment.bookingId,
        customerName: appointment.customerName,
        service: appointment.serviceName,
        appointmentDate: date,
        timeSlot: appointment.timeSlot,
        status: appointment.status,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'That time was just booked. Please choose another available slot.' });
    }
    return next(error);
  }
});

router.get('/mine', authenticate, async (req, res, next) => {
  try {
    const appointments = await Appointment.find({ customerUser: req.user._id })
      .sort({ appointmentDate: -1, timeSlot: -1 }).lean();
    return res.json({ appointments });
  } catch (error) {
    return next(error);
  }
});

router.get('/:bookingId', async (req, res, next) => {
  try {
    const bookingId = cleanString(req.params.bookingId, 30).toUpperCase();
    const email = cleanString(req.query.email, 254).toLowerCase();
    if (!isEmail(email)) return res.status(400).json({ message: 'Enter the email address used for this booking.' });
    const appointment = await Appointment.findOne({ bookingId, email }).select('-slotKeys -customerUser').lean();
    if (!appointment) return res.status(404).json({ message: 'No booking was found with those details.' });
    return res.json({ appointment });
  } catch (error) {
    return next(error);
  }
});

router.post('/:bookingId/cancel', async (req, res, next) => {
  try {
    const bookingId = cleanString(req.params.bookingId, 30).toUpperCase();
    const email = cleanString(req.body.email, 254).toLowerCase();
    if (!isEmail(email)) return res.status(400).json({ message: 'Enter the email address used for this booking.' });
    const appointment = await Appointment.findOne({ bookingId, email });
    if (!appointment) return res.status(404).json({ message: 'No booking was found with those details.' });
    const setting = await Setting.findOne({ key: 'studio' }).lean();
    if (!setting) return res.status(503).json({ message: 'Studio schedule is not configured.' });
    const startsAt = localDateTimeToUtc(
      appointment.appointmentDate.toISOString().slice(0, 10), appointment.timeSlot, setting.timeZone || 'UTC'
    );
    if (!['Pending', 'Confirmed'].includes(appointment.status)) {
      return res.status(409).json({ message: 'This booking can no longer be cancelled.' });
    }
    if (!startsAt || startsAt.getTime() - Date.now() < 24 * 60 * 60 * 1000) {
      return res.status(400).json({ message: 'Bookings can be cancelled up to 24 hours before the appointment.' });
    }
    appointment.status = 'Cancelled';
    appointment.slotReserved = false;
    await appointment.save();
    return res.json({ message: 'Your appointment has been cancelled.', status: appointment.status });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
