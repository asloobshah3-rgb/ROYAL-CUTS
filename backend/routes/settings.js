const express = require('express');
const Setting = require('../models/Setting');

const router = express.Router();
const publicFields = [
  'openTime', 'closeTime', 'closedDays', 'timeZone', 'phone', 'whatsapp', 'email',
  'address', 'mapEmbedUrl', 'instagram', 'facebook',
];

router.get('/', async (req, res, next) => {
  try {
    const setting = await Setting.findOne({ key: 'studio' }).select(publicFields.join(' ')).lean();
    if (!setting) return res.status(503).json({ message: 'Studio information is not configured.' });
    return res.json({ settings: setting });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
