const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const connectDatabase = require('../config/db');

async function createAdmin() {
  const name = (process.env.ADMIN_NAME || '').trim();
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const phone = (process.env.ADMIN_PHONE || '').trim();
  const password = process.env.ADMIN_PASSWORD || '';
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || email.endsWith('@example.com') || phone.length < 7
    || phone === '+10000000000' || password.length < 14 || password.startsWith('replace-with-')) {
    throw new Error('Set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE and an ADMIN_PASSWORD of at least 14 characters in .env.');
  }

  await connectDatabase();
  const existing = await User.findOne({ email });
  if (existing) {
    throw new Error('That email already has an account. Use the dashboard login or a managed password reset.');
  }
  await User.create({ name, email, phone, password: await bcrypt.hash(password, 12), role: 'admin' });
  console.log(`Administrator account created for ${email}.`);
}

createAdmin()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  });
