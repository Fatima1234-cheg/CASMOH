const mongoose = require('mongoose');
const Order = require('../models/Order');

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/casmoh';
const dbName = process.env.MONGO_DB || 'casmoh';
const id = '69da79893346215e1535dd73';

async function run() {
  try {
    await mongoose.connect(uri, { dbName });
    const order = await Order.findById(id).lean();
    console.log('URI', uri);
    console.log('DB', dbName);
    console.log('ID', id);
    console.log('FOUND', !!order);
    if (order) console.log('ORDER', order);
  } catch (err) {
    console.error('ERR', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();
