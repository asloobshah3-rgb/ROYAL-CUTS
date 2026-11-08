const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'studio' },
  timeZone: { type: String, default: 'UTC' },
  openTime: { type: String, default: '09:00' },
  closeTime: { type: String, default: '18:00' },
  slotIntervalMinutes: { type: Number, default: 15, min: 5, max: 120 },
  closedDays: { type: [Number], default: [0] },
  phone: { type: String, default: '' },
  whatsapp: { type: String, default: '' },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
  mapEmbedUrl: { type: String, default: '' },
  instagram: { type: String, default: '' },
  facebook: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);
