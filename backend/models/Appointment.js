const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  bookingId: { type: String, required: true, unique: true, index: true },
  customerName: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
  phone: { type: String, required: true, trim: true, maxlength: 30 },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  serviceName: { type: String, required: true },
  serviceDuration: { type: Number, required: true },
  appointmentDate: { type: Date, required: true },
  timeSlot: { type: String, required: true },
  slotKeys: { type: [String], required: true },
  status: { type: String, enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'], default: 'Pending' },
  slotReserved: { type: Boolean, default: true, select: false },
  message: { type: String, trim: true, maxlength: 1000, default: '' },
  customerUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: { createdAt: true, updatedAt: true } });

appointmentSchema.index(
  { slotKeys: 1 },
  { unique: true, partialFilterExpression: { slotReserved: true } }
);
appointmentSchema.index({ appointmentDate: 1, status: 1 });
appointmentSchema.index({ email: 1, createdAt: -1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
