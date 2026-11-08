const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function authenticate(req, res, next) {
  try {
    const token = req.cookies.rc_session || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) {
      return res.status(401).json({ message: 'Please sign in to continue.' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select('name email phone role');
    if (!user) {
      return res.status(401).json({ message: 'Your session is no longer valid. Please sign in again.' });
    }
    req.user = user;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
    }
    return next(error);
  }
}

async function optionalAuthenticate(req, res, next) {
  try {
    const token = req.cookies.rc_session || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return next();
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(payload.sub).select('name email phone role');
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') return next();
    return next(error);
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Administrator access is required.' });
  }
  return next();
}

module.exports = { authenticate, optionalAuthenticate, requireAdmin };
