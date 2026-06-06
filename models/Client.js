const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const ClientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, unique: true, sparse: true, trim: true },
    passport: { type: String, trim: true, unique: true, sparse: true },
    email: { type: String, trim: true, lowercase: true },
    password: { type: String, required: false },
    city: { type: String, trim: true },
    role: { type: String, enum: ['client', 'admin'], default: 'client' },
    address: { type: String, trim: true },
  },
  { timestamps: true }
);

ClientSchema.pre('save', async function () {
  if (!this.password) return;
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

ClientSchema.methods.comparePassword = async function (candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

ClientSchema.index({ name: 1, phone: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Client', ClientSchema);

