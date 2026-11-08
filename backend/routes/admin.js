const express = require('express');
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Setting = require('../models/Setting');
const ContactMessage = require('../models/ContactMessage');
const { authenticate, requireAdmin } = require('../middleware/auth');
const {
  cleanString, validDateString, timeToMinutes, isValidTimeZone, isEmail, isPhone,
} = require('../utils/validation');

const router = express.Router();
router.use(authenticate, requireAdmin);

router.get('/overview', async (req, res, next) => {
  try {
    const [counts, total] = await Promise.all([
      Appointment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Appointment.countDocuments(),
    ]);
    const totals = { Pending: 0, Confirmed: 0, Completed: 0, Cancelled: 0 };
    counts.forEach(({ _id, count }) => { totals[_id] = count; });
    return res.json({ total, ...totals });
  } catch (error) {
    return next(error);
  }
});

router.get('/appointments', async (req, res, next) => {
  try {
    const filter = {};
    const status = cleanString(req.query.status, 20);
    const serviceId = cleanString(req.query.serviceId, 30);
    const date = cleanString(req.query.date, 10);
    const search = cleanString(req.query.search, 100);
    if (status && ['Pending', 'Confirmed', 'Completed', 'Cancelled'].includes(status)) filter.status = status;
    if (serviceId && mongoose.isValidObjectId(serviceId)) filter.service = serviceId;
    if (date && validDateString(date)) filter.appointmentDate = new Date(`${date}T00:00:00.000Z`);
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { customerName: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
        { bookingId: { $regex: escaped, $options: 'i' } },
      ];
    }
    const appointments = await Appointment.find(filter).sort({ appointmentDate: 1, timeSlot: 1 }).lean();
    return res.json({ appointments });
  } catch (error) {
    return next(error);
  }
});

router.patch('/appointments/:id/status', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid appointment ID.' });
    const status = cleanString(req.body.status, 20);
    if (!['Pending', 'Confirmed', 'Completed', 'Cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Choose a valid appointment status.' });
    }
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found.' });
    const validTransitions = {
      Pending: ['Confirmed', 'Cancelled'],
      Confirmed: ['Completed', 'Cancelled'],
      Completed: [],
      Cancelled: [],
    };
    if (appointment.status !== status && !validTransitions[appointment.status].includes(status)) {
      return res.status(409).json({ message: `A ${appointment.status.toLowerCase()} booking cannot be changed to ${status.toLowerCase()}.` });
    }
    appointment.status = status;
    appointment.slotReserved = ['Pending', 'Confirmed'].includes(status);
    await appointment.save();
    return res.json({ appointment });
  } catch (error) {
    return next(error);
  }
});

router.get('/settings', async (req, res, next) => {
  try {
    const setting = await Setting.findOne({ key: 'studio' }).lean();
    if (!setting) return res.status(503).json({ message: 'Studio schedule is not configured.' });
    return res.json({ settings: setting });
  } catch (error) {
    return next(error);
  }
});

router.patch('/settings', async (req, res, next) => {
  try {
    const openTime = cleanString(req.body.openTime, 5);
    const closeTime = cleanString(req.body.closeTime, 5);
    const timeZone = cleanString(req.body.timeZone, 100);
    const slotIntervalMinutes = Number(req.body.slotIntervalMinutes);
    const closedDays = req.body.closedDays;
    const open = timeToMinutes(openTime);
    const close = timeToMinutes(closeTime);
    if (open < 0 || close <= open || !isValidTimeZone(timeZone) || !Number.isInteger(slotIntervalMinutes)
      || slotIntervalMinutes < 5 || slotIntervalMinutes > 120
      || !Array.isArray(closedDays) || closedDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
      return res.status(400).json({ message: 'Provide valid opening hours, slot interval and closed weekdays.' });
    }
    const fields = ['phone', 'whatsapp', 'email', 'address', 'mapEmbedUrl', 'instagram', 'facebook'];
    const patch = { openTime, closeTime, timeZone, slotIntervalMinutes, closedDays: [...new Set(closedDays)] };
    fields.forEach((field) => {
      if (typeof req.body[field] === 'string') patch[field] = cleanString(req.body[field], field === 'address' ? 300 : 500);
    });
    if (patch.email && !isEmail(patch.email)) {
      return res.status(400).json({ message: 'Enter a valid studio email address.' });
    }
    if ((patch.phone && !isPhone(patch.phone)) || (patch.whatsapp && !isPhone(patch.whatsapp))) {
      return res.status(400).json({ message: 'Enter valid studio phone and WhatsApp numbers.' });
    }
    for (const field of ['mapEmbedUrl', 'instagram', 'facebook']) {
      if (!patch[field]) continue;
      let url;
      try {
        url = new URL(patch[field]);
      } catch (error) {
        url = null;
      }
      if (!url || url.protocol !== 'https:') {
        return res.status(400).json({ message: `${field} must be a valid HTTPS URL.` });
      }
    }
    const settings = await Setting.findOneAndUpdate({ key: 'studio' }, { $set: patch }, { new: true, upsert: true, runValidators: true });
    return res.json({ settings });
  } catch (error) {
    return next(error);
  }
});

router.get('/messages', async (req, res, next) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ messages });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
