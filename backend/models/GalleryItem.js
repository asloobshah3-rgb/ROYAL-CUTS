const mongoose = require('mongoose');

const galleryItemSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 100 },
  category: { type: String, required: true, enum: ['Haircut', 'Beard', 'Facial', 'Studio'] },
  image: { type: String, required: true, trim: true, maxlength: 1000 },
  alt: { type: String, required: true, trim: true, maxlength: 200 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('GalleryItem', galleryItemSchema);
