const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  read: { type: Boolean, default: false },
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
