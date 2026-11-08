const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema({
  customerName: { type: String, required: true, trim: true, maxlength: 100 },
  service: { type: String, required: true, trim: true, maxlength: 100 },
  quote: { type: String, required: true, trim: true, maxlength: 700 },
  isPublished: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Testimonial', testimonialSchema);
