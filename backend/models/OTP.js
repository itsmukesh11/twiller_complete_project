const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  email: String,
  code: String,
  purpose: String,
  expiresAt: Date,
  used: { type: Boolean, default: false }
});

module.exports = mongoose.model('OTP', schema);
