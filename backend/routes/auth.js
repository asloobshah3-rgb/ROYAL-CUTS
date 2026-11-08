const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { cleanString, isEmail, isPhone } = require('../utils/validation');

const router = express.Router();
const loginLimiter = require('express-rate-limit').rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many sign-in attempts. Please try again in 15 minutes.' },
});
const registrationLimiter = require('express-rate-limit').rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many registration attempts. Please try again later.' },
});

function setSessionCookie(res, user) {
  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('rc_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role };
}

router.post('/register', registrationLimiter, async (req, res, next) => {
  try {
    const name = cleanString(req.body.name, 100);
    const email = cleanString(req.body.email, 254).toLowerCase();
    const phone = cleanString(req.body.phone, 30);
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (name.length < 2 || !isEmail(email) || !isPhone(phone) || password.length < 10 || password.length > 128) {
      return res.status(400).json({ message: 'Enter a valid name, email and phone number. Passwords must be at least 10 characters.' });
    }
    if (await User.exists({ email })) {
      return res.status(409).json({ message: 'An account with that email already exists.' });
    }

    const user = await User.create({ name, email, phone, password: await bcrypt.hash(password, 12) });
    setSessionCookie(res, user);
    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'An account with that email already exists.' });
    return next(error);
  }
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const email = cleanString(req.body.email, 254).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!isEmail(email) || password.length === 0 || password.length > 128) {
      return res.status(400).json({ message: 'Enter a valid email address and password.' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }
    setSessionCookie(res, user);
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('rc_session', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api',
  });
  return res.json({ message: 'You have been signed out.' });
});

router.get('/me', authenticate, (req, res) => res.json({ user: publicUser(req.user) }));

module.exports = router;
