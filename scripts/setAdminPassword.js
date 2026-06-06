const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/casmoh';
const ADMIN_EMAIL = 'admin@casmoh.com';
const NEW_PASSWORD = 'Casmoh2026@!';

async function run() {
  await mongoose.connect(MONGO_URI, { dbName: process.env.MONGO_DB || 'casmoh' });
  const admin = await Admin.findOne({ email: ADMIN_EMAIL });
  if (!admin) {
    console.error('Admin non trouvé', ADMIN_EMAIL);
    process.exit(1);
  }
  admin.password = NEW_PASSWORD;
  await admin.save();
  console.log('Mot de passe admin mis à jour');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
