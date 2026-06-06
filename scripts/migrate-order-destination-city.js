const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const path = require('path');

const City = require(path.join(__dirname, '..', 'models', 'City'));
const Order = require(path.join(__dirname, '..', 'models', 'Order'));

function normalizeText(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function expectedCountryFromDirection(direction) {
  const d = String(direction || '').trim().toUpperCase();
  if (d === 'FR-MA') return 'Morocco';
  if (d === 'MA-FR') return 'France';
  return '';
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const limitArg = getArg('--limit');
  const limit = limitArg ? Math.max(1, parseInt(limitArg, 10) || 0) : 0;

  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/casmoh';
  const MONGO_DB = process.env.MONGO_DB || 'casmoh';
  await mongoose.connect(MONGO_URI, { dbName: MONGO_DB });

  const cities = await City.find({}).lean();
  const byId = new Map(cities.map((c) => [String(c._id), c]));
  const byName = new Map();
  for (const city of cities) {
    const key = normalizeText(city.name);
    if (!key) continue;
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(city);
  }

  const orders = await Order.find({}).lean();
  const scopedOrders = limit > 0 ? orders.slice(0, limit) : orders;

  let checked = 0;
  let updated = 0;
  let skippedNoCityName = 0;
  let skippedAmbiguous = 0;
  let skippedAlreadyGood = 0;
  const bulkOps = [];

  for (const order of scopedOrders) {
    checked += 1;

    const receiverCityName = String(order.receiverCity || '').trim();
    const normalizedReceiverCity = normalizeText(receiverCityName);
    if (!normalizedReceiverCity) {
      skippedNoCityName += 1;
      continue;
    }

    const candidates = byName.get(normalizedReceiverCity) || [];
    if (!candidates.length) {
      skippedNoCityName += 1;
      continue;
    }

    const expectedCountry = expectedCountryFromDirection(order.direction);
    let selectedCity = null;

    if (expectedCountry) {
      selectedCity = candidates.find((c) => c.country === expectedCountry) || null;
    }
    if (!selectedCity && candidates.length === 1) {
      selectedCity = candidates[0];
    }
    if (!selectedCity && candidates.length > 1) {
      skippedAmbiguous += 1;
      continue;
    }
    if (!selectedCity) {
      skippedNoCityName += 1;
      continue;
    }

    const currentToCityId = order.toCity ? String(order.toCity) : '';
    const currentToCity = currentToCityId ? byId.get(currentToCityId) : null;
    const alreadyGood =
      currentToCityId === String(selectedCity._id) &&
      normalizeText(order.receiverCity) === normalizeText(selectedCity.name) &&
      expectedCountryFromDirection(order.direction) === selectedCity.country;

    if (alreadyGood) {
      skippedAlreadyGood += 1;
      continue;
    }

    const nextDirection = selectedCity.country === 'Morocco' ? 'FR-MA' : 'MA-FR';
    bulkOps.push({
      updateOne: {
        filter: { _id: order._id },
        update: {
          $set: {
            toCity: selectedCity._id,
            receiverCity: selectedCity.name,
            direction: nextDirection,
          },
        },
      },
    });
    updated += 1;
  }

  if (!dryRun && bulkOps.length) {
    await Order.bulkWrite(bulkOps, { ordered: false });
  }

  console.log('--- Migration: destination city for orders ---');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLY'}`);
  console.log(`Checked: ${checked}`);
  console.log(`To update: ${updated}`);
  console.log(`Skipped (already good): ${skippedAlreadyGood}`);
  console.log(`Skipped (no city match): ${skippedNoCityName}`);
  console.log(`Skipped (ambiguous city): ${skippedAmbiguous}`);

  await mongoose.disconnect();
}

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1]) {
    return process.argv[idx + 1];
  }
  return null;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
