const mongoose = require('mongoose');

async function connectDatabase() {
  const uri = (process.env.MONGODB_URI || '').trim();
  if (!uri) {
    throw new Error('MONGODB_URI is not configured. Paste your MongoDB Atlas connection string into backend/.env.');
  }
  if (uri.includes('<') || uri.includes('>')) {
    throw new Error('MONGODB_URI still contains placeholder values. Replace them with your MongoDB Atlas connection details.');
  }

  try {
    await mongoose.connect(uri);
  } catch (error) {
    const errorType = error && error.name ? error.name : 'connection error';
    throw new Error(`MongoDB connection failed (${errorType}). Check MONGODB_URI, Atlas network access and database user permissions.`);
  }

  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB connection did not reach the connected state.');
  }
  console.log('Connected to MongoDB.');
}

module.exports = connectDatabase;
