const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  category: { type: String, required: true, trim: true, maxlength: 60 },
  description: { type: String, required: true, trim: true, maxlength: 1000 },
  price: { type: Number, required: true, min: 0 },
  duration: { type: Number, required: true, min: 15, max: 360 },
  image: { type: String, required: true, trim: true, maxlength: 1000 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);
