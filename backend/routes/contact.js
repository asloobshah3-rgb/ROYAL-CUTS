const express = require('express');
const rateLimit = require('express-rate-limit').rateLimit;
const ContactMessage = require('../models/ContactMessage');
const { cleanString, isEmail } = require('../utils/validation');

const router = express.Router();
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many messages. Please try again later.' },
});

router.post('/', contactLimiter, async (req, res, next) => {
  try {
    const name = cleanString(req.body.name, 100);
    const email = cleanString(req.body.email, 254).toLowerCase();
    const message = cleanString(req.body.message, 2000);
    if (name.length < 2 || !isEmail(email) || message.length < 10) {
      return res.status(400).json({ message: 'Enter your name, a valid email and a message of at least 10 characters.' });
    }
    await ContactMessage.create({ name, email, message });
    return res.status(201).json({ message: 'Thank you. Your message has been received.' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
