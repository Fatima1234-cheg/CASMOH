const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Client = require('../models/Client');
const City = require('../models/City');
const Order = require('../models/Order');
const Counter = require('../models/Counter');

const RESET_SECURITY_CODE = '12345@';

const uploadDir = path.join(__dirname, '..', 'tmp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `restore_${Date.now()}_${file.originalname}`),
});

exports.uploader = multer({ storage });

exports.backup = async (req, res, next) => {
  try {
    const data = {
      clients: await Client.find().lean(),
      cities: await City.find().lean(),
      orders: await Order.find().lean(),
      exportedAt: new Date().toISOString(),
      version: 1,
    };
    const json = JSON.stringify(data, null, 2);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=\"casmoh-backup.json\"');
    res.send(json);
  } catch (err) {
    next(err);
  }
};

exports.restore = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).send('Fichier JSON requis');
    }
    const raw = fs.readFileSync(req.file.path, 'utf8');
    const data = JSON.parse(raw);
    if (!data.clients || !data.cities || !data.orders) {
      return res.status(400).send('Format de sauvegarde invalide');
    }
    await Promise.all([Client.deleteMany({}), City.deleteMany({}), Order.deleteMany({})]);
    const clients = await Client.insertMany(data.clients.map(stripIds));
    const cities = await City.insertMany(data.cities.map(stripIds));

    const clientMap = new Map(clients.map((c) => [c._id.toString(), c]));
    const cityMap = new Map(cities.map((c) => [c._id.toString(), c]));

    const ordersPrepared = data.orders.map((o) => {
      const obj = stripIds(o);
      if (o.client && clientMap.has(o.client.toString())) obj.client = clientMap.get(o.client.toString())._id;
      if (o.fromCity && cityMap.has(o.fromCity.toString())) obj.fromCity = cityMap.get(o.fromCity.toString())._id;
      if (o.toCity && cityMap.has(o.toCity.toString())) obj.toCity = cityMap.get(o.toCity.toString())._id;
      return obj;
    });
    await Order.insertMany(ordersPrepared);
    res.redirect('/dashboard');
  } catch (err) {
    next(err);
  } finally {
    if (req.file) fs.unlink(req.file.path, () => {});
  }
};

exports.resetAll = async (req, res, next) => {
  try {
    const code = String(req.body?.code || '').trim();

    if (!code) {
      return res.status(400).json({ success: false, error: 'Veuillez saisir le code' });
    }

    if (code !== RESET_SECURITY_CODE) {
      return res.status(403).json({ success: false, error: 'Mot de passe incorrect' });
    }

    const ordersCount = await Order.countDocuments();
    if (!ordersCount) {
      return res.status(400).json({ success: false, error: 'Aucune commande à supprimer' });
    }

    await Order.deleteMany({});
    await Counter.updateMany({}, { $set: { seq: 0 } });

    return res.json({ success: true, message: 'Vos commandes sont supprimées' });
  } catch (err) {
    next(err);
  }
};

function stripIds(doc) {
  const { _id, createdAt, updatedAt, __v, ...rest } = doc;
  return rest;
}
