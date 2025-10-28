const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  plan: String,
  amount: Number,
  stripeSessionId: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Subscription', schema);
