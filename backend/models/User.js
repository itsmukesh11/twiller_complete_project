const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String,
  password: String,
  follows: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  allowNotifications: { type: Boolean, default: true },
  lastForgotRequest: Date,
  subscription: {
    plan: { type: String, enum: ['free','bronze','silver','gold'], default: 'free' },
    expiresAt: Date
  },
  modelPreference: { type: String, default: 'default' },
  otpVerifiedForAudio: { type: Boolean, default: false }
}, { timestamps: true });

// allow storing avatar URL
schema.add({ avatar: { type: String, default: '' } });

// bio for profile
schema.add({ bio: { type: String, default: '' } });

module.exports = mongoose.model('User', schema);
