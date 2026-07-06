const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const AdminSchema = new mongoose.Schema(
  {
    fullname: { type: String, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, minlength: 6 },
    provider: { type: String, enum: ['google', 'facebook', null], default: null },
    providerId: { type: String, default: null },
    avatar: { type: String, default: null },
  },
  { timestamps: true }
);

AdminSchema.pre('save', async function () {
  if (!this.password) return;
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

AdminSchema.methods.comparePassword = async function (candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('Admin', AdminSchema);
