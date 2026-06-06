const mongoose = require('mongoose');

const transporteurSchema = new mongoose.Schema({
  nom: { type: String, required: true, trim: true },
  telephone: { type: String, required: true, trim: true },
  paysOrigine: { type: String, required: true },
  paysDestination: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transporteur', transporteurSchema);