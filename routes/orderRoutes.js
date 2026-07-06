const express = require('express');
const router = express.Router();
const { ensureAuth, ensureAdmin } = require('../middleware/auth');
const orders = require('../controllers/orderController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'orders');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
    } catch (e) { }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const safe = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, safe);
  }
});
function imageFilter(req, file, cb) {
  if (/^image\//.test(file.mimetype)) cb(null, true);
  else cb(null, false);
}
const upload = multer({ storage, fileFilter: imageFilter, limits: { fileSize: 10 * 1024 * 1024 } });

const Order = require('../models/Order');

router.get('/', ensureAuth, ensureAdmin, orders.list);
router.get('/new', ensureAuth, ensureAdmin, orders.createForm);

// Route POST avec tous les validateurs appliqués individuellement
router.post(
  '/', 
  ensureAuth,
  upload.array('photos', 10),
  orders.validators[0],   // orderNumber
  orders.validators[1],   // senderName
  orders.validators[2],   // senderPhone
  orders.validators[3],   // senderCity
  orders.validators[4],   // receiverName
  orders.validators[5],   // receiverPhone
  orders.validators[6],   // receiverCity
  orders.validators[7],   // parcelsCount
  orders.validators[8],   // description
  orders.validators[9],   // paidAmount
  orders.validators[10],  // weightKg
  orders.validators[11],  // price
  orders.validators[12],  // status
  orders.create
);

router.get('/:id/edit', ensureAuth, ensureAdmin, orders.editForm);
router.get('/:id', ensureAuth, orders.getById);
router.put('/bulk-location', ensureAuth, ensureAdmin, orders.bulkUpdateLocation);

router.delete('/:id', ensureAuth, ensureAdmin, orders.remove);

// Route simple PUT pour dashboard - mise à jour directe DB sans validateurs
router.put('/:id', ensureAuth, ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body || {};

    const updateData = {};
    if (b.senderName !== undefined) updateData.senderName = String(b.senderName).trim();
    if (b.receiverName !== undefined) updateData.receiverName = String(b.receiverName).trim();
    if (b.senderCity !== undefined) updateData.senderCity = String(b.senderCity).trim();
    if (b.receiverCity !== undefined) updateData.receiverCity = String(b.receiverCity).trim();
    if (b.senderPhone !== undefined) updateData.senderPhone = String(b.senderPhone).trim();
    if (b.receiverPhone !== undefined) updateData.receiverPhone = String(b.receiverPhone).trim();
    if (b.status !== undefined) updateData.status = String(b.status).trim();
    if (b.paid !== undefined) updateData.paid = b.paid === true || b.paid === 'true';
    if (b.paidAmount !== undefined) updateData.paidAmount = b.paidAmount;
    if (b.parcelsCount !== undefined) updateData.parcelsCount = b.parcelsCount;
    if (b.weightKg !== undefined) updateData.weightKg = b.weightKg;
    if (b.description !== undefined) updateData.description = String(b.description).trim();

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    const updated = await Order.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    return res.json({ success: true, order: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
