const mongoose = require('mongoose');
const crypto = require('crypto');

function generateTrackingCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(12);
  let value = 0;
  let valueBits = 0;
  let output = '';

  for (const byte of bytes) {
    value = (value << 8) | byte;
    valueBits += 8;

    while (valueBits >= 5) {
      const index = (value >> (valueBits - 5)) & 31;
      valueBits -= 5;
      output += alphabet[index] || '';
      if (output.length >= 12) {
        return output.slice(0, 12);
      }
    }
  }

  while (output.length < 12) {
    output += alphabet[crypto.randomInt(0, alphabet.length)];
  }

  return output.slice(0, 12);
}

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: Number, required: true, unique: true },
    trackingCode: { type: String, required: true, unique: true, index: true, trim: true },
    // Legacy fields (optional)
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    fromCity: { type: mongoose.Schema.Types.ObjectId, ref: 'City' },
    toCity: { type: mongoose.Schema.Types.ObjectId, ref: 'City' },
    direction: {
      type: String,
      enum: ['MA-FR', 'FR-MA'],
    },
    // New explicit sender/receiver fields for the stepper form
    senderName: { type: String, trim: true },
    senderPhone: { type: String, trim: true },
    senderCity: { type: String, trim: true },
    senderAddress: { type: String, trim: true },
    receiverName: { type: String, trim: true },
    receiverPhone: { type: String, trim: true },
    receiverCity: { type: String, trim: true },
    receiverAddress: { type: String, trim: true },
    homeDelivery: { type: Boolean, default: false },
    description: { type: String, trim: true },
    weightKg: { type: Number, min: 0 },
    price: { type: Number, min: 0 },
    paid: { type: Boolean, default: false },
    paidAmount: { type: Number, min: 0, default: 0 },
    parcelsCount: { type: Number, min: 1, default: 1 },
    dimensions: { type: String, trim: true },
    localisation: { type: String, trim: true },
    photos: [{ type: String }],
    status: { type: String, enum: ['pending', 'shipped', 'delivered'], default: 'pending' },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
    origin: { type: String, enum: ['admin', 'client'], default: 'admin' },
    newOrderAlert: { type: Boolean, default: false },
  },
  { timestamps: true }
);

OrderSchema.index({ direction: 1, status: 1 });

OrderSchema.pre('validate', function ensureTrackingCode() {
  if (!this.trackingCode) {
    this.trackingCode = generateTrackingCode();
  }
});

OrderSchema.statics.generateTrackingCode = generateTrackingCode;

module.exports = mongoose.model('Order', OrderSchema);
