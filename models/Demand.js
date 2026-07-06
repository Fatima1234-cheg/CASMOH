const mongoose = require('mongoose');

const DemandSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    parcelDescription: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    direction: {
      type: String,
      enum: ['MA-FR', 'FR-MA'],
      default: 'MA-FR',
    },
    status: {
      type: String,
      enum: ['not_contacted', 'contacted'],
      default: 'not_contacted',
    },
    newRequestAlert: { type: Boolean, default: false },
  },
  { timestamps: true }
);

DemandSchema.index({ createdAt: -1 });
DemandSchema.index({ newRequestAlert: 1, createdAt: -1 });

module.exports = mongoose.model('Demand', DemandSchema);
