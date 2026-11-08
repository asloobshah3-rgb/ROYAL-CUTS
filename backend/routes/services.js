const express = require('express');
const mongoose = require('mongoose');
const Service = require('../models/Service');
const GalleryItem = require('../models/GalleryItem');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { cleanString } = require('../utils/validation');

const router = express.Router();

function serviceData(body) {
  if (body.price === '' || body.price == null || body.duration === '' || body.duration == null) return null;
  const data = {
    name: cleanString(body.name, 100),
    category: cleanString(body.category, 60),
    description: cleanString(body.description, 1000),
    image: cleanString(body.image, 1000),
    price: Number(body.price),
    duration: Number(body.duration),
  };
  let imageUrl;
  try {
    imageUrl = new URL(data.image);
  } catch (error) {
    imageUrl = null;
  }
  if (!data.name || !['Haircut & Styling', 'Beard Grooming', 'Facial Treatment', 'Premium Services'].includes(data.category)
    || !data.description || !imageUrl || !['http:', 'https:'].includes(imageUrl.protocol)
    || !Number.isFinite(data.price) || data.price < 0
    || !Number.isInteger(data.duration) || data.duration < 15 || data.duration > 360) {
    return null;
  }
  return data;
}

router.get('/', async (req, res, next) => {
  try {
    const services = await Service.find({ isActive: true }).sort({ category: 1, name: 1 }).lean();
    return res.json({ services });
  } catch (error) {
    return next(error);
  }
});

router.get('/gallery', async (req, res, next) => {
  try {
    const items = await GalleryItem.find({ isActive: true }).sort({ createdAt: -1 }).lean();
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.get('/admin/all', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 }).lean();
    return res.json({ services });
  } catch (error) {
    return next(error);
  }
});

router.get('/admin/gallery', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const items = await GalleryItem.find().sort({ createdAt: -1 }).lean();
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid service ID.' });
    const service = await Service.findOne({ _id: req.params.id, isActive: true }).lean();
    if (!service) return res.status(404).json({ message: 'Service not found.' });
    return res.json({ service });
  } catch (error) {
    return next(error);
  }
});

router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const data = serviceData(req.body);
    if (!data) return res.status(400).json({ message: 'Provide a name, category, description, image, non-negative price and duration (15–360 minutes).' });
    const service = await Service.create(data);
    return res.status(201).json({ service });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid service ID.' });
    const data = serviceData(req.body);
    if (!data) return res.status(400).json({ message: 'Provide a name, category, description, image, non-negative price and duration (15–360 minutes).' });
    const service = await Service.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!service) return res.status(404).json({ message: 'Service not found.' });
    return res.json({ service });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid service ID.' });
    const service = await Service.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!service) return res.status(404).json({ message: 'Service not found.' });
    return res.json({ message: 'Service removed.' });
  } catch (error) {
    return next(error);
  }
});

router.post('/admin/gallery', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const title = cleanString(req.body.title, 100);
    const category = cleanString(req.body.category, 30);
    const image = cleanString(req.body.image, 1000);
    const alt = cleanString(req.body.alt, 200);
    let imageUrl;
    try {
      imageUrl = new URL(image);
    } catch (error) {
      imageUrl = null;
    }
    if (!title || !['Haircut', 'Beard', 'Facial', 'Studio'].includes(category)
      || !imageUrl || !['http:', 'https:'].includes(imageUrl.protocol) || !alt) {
      return res.status(400).json({ message: 'Provide a title, valid category, image URL and accessible image description.' });
    }
    const item = await GalleryItem.create({ title, category, image, alt });
    return res.status(201).json({ item });
  } catch (error) {
    return next(error);
  }
});

router.delete('/admin/gallery/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid gallery item ID.' });
    const item = await GalleryItem.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!item) return res.status(404).json({ message: 'Gallery item not found.' });
    return res.json({ message: 'Gallery image removed.' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
