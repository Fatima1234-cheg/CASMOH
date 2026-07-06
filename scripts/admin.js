const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const path = require('path');

const Admin = require(path.join(__dirname, '..', 'models', 'Admin'));

async function main() {
  const emailArg = getArg('--email');
  const passArg = getArg('--password');
  const email = emailArg || process.env.ADMIN_EMAIL || 'admin@casmoh.com';
  const password = passArg || process.env.ADMIN_PASSWORD || 'Casmoh@2026!';

  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/casmoh';
  const MONGO_DB = process.env.MONGO_DB || 'casmoh';
  await mongoose.connect(MONGO_URI, { dbName: MONGO_DB });

  let admin = await Admin.findOne({ email: email.toLowerCase().trim() });
  if (!admin) {
    admin = new Admin({ email, password });
    await admin.save();
    console.log('Admin created:', email);
  } else {
    admin.password = password;
    await admin.save();
    console.log('Admin password reset for:', email);
  }

  await mongoose.disconnect();
}

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1]) {
    return process.argv[idx + 1];
  }
  return null;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

