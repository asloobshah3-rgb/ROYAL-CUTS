const Service = require('../models/Service');
const Setting = require('../models/Setting');
const GalleryItem = require('../models/GalleryItem');

const services = [
  {
    name: 'Signature Haircut', category: 'Haircut & Styling',
    description: 'A considered cut tailored to your features, finished with a refined style.',
    price: 0, duration: 45,
    image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1000&q=85',
  },
  {
    name: 'Beard Sculpt', category: 'Beard Grooming',
    description: 'Precision shaping, warm towel preparation and a clean, confident finish.',
    price: 0, duration: 30,
    image: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1000&q=85',
  },
  {
    name: 'Renewal Facial', category: 'Facial Treatment',
    description: 'A restorative cleanse and facial massage to leave skin refreshed and balanced.',
    price: 0, duration: 45,
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1000&q=85',
  },
  {
    name: 'The Royal Ritual', category: 'Premium Services',
    description: 'Our complete grooming experience: a tailored cut, beard detail and finishing care.',
    price: 0, duration: 90,
    image: 'https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=1000&q=85',
  },
];

const gallery = [
  ['The classic finish', 'Haircut', 'photo-1503951914875-452162b0f3f1'],
  ['Precision in every detail', 'Beard', 'photo-1621605815971-fbc98d665033'],
  ['A moment to reset', 'Facial', 'photo-1570172619644-dfd03ed5d881'],
  ['The Royal Cuts studio', 'Studio', 'photo-1512690459411-b9245aed614b'],
  ['Made for the modern gentleman', 'Beard', 'photo-1622286342621-4bd786c2447c'],
];

async function seedInitialData() {
  await Setting.updateOne({ key: 'studio' }, { $setOnInsert: { key: 'studio' } }, { upsert: true });
  await Setting.updateOne({ key: 'studio', timeZone: { $exists: false } }, { $set: { timeZone: 'UTC' } });
  if (await Service.countDocuments() === 0) {
    await Service.insertMany(services);
  }
  if (await GalleryItem.countDocuments() === 0) {
    const items = gallery.map(([title, category, photo]) => ({
        title, category,
        image: `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=1000&q=85`,
        alt: title,
      }));
    await GalleryItem.insertMany(items);
  }
}

module.exports = seedInitialData;
