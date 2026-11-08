const express = require('express');
const mongoose = require('mongoose');
const Testimonial = require('../models/Testimonial');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { cleanString } = require('../utils/validation');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const testimonials = await Testimonial.find({ isPublished: true })
      .sort({ createdAt: -1 }).limit(12).lean();
    return res.json({ testimonials });
  } catch (error) {
    return next(error);
  }
});

router.get('/admin/all', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const testimonials = await Testimonial.find().sort({ createdAt: -1 }).lean();
    return res.json({ testimonials });
  } catch (error) {
    return next(error);
  }
});

router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const customerName = cleanString(req.body.customerName, 100);
    const service = cleanString(req.body.service, 100);
    const quote = cleanString(req.body.quote, 700);
    if (customerName.length < 2 || !service || quote.length < 10) {
      return res.status(400).json({ message: 'Provide a guest name, service and testimonial of at least 10 characters.' });
    }
    const testimonial = await Testimonial.create({ customerName, service, quote });
    return res.status(201).json({ testimonial });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid testimonial ID.' });
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
    if (!testimonial) return res.status(404).json({ message: 'Testimonial not found.' });
    return res.json({ message: 'Testimonial removed.' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
