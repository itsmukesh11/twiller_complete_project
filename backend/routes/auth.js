const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { sendMail } = require('../utils/mailer');
const moment = require('moment-timezone');

const JWT_SECRET = process.env.JWT_SECRET;
const auth = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const passport = require('passport');

// register / login simple endpoints for demo

// Google OAuth endpoints
// Initiate OAuth flow
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// OAuth callback - issue JWT and redirect to frontend with token
router.get('/google/callback', passport.authenticate('google', { failureRedirect: (process.env.FRONTEND_URL || 'https://twiller-complete-project.onrender.com'), session: true }), (req, res) => {
  // Defensive checks + detailed logging to help diagnose callback issues in production
  if (!req.user) {
    console.error('Google callback: no req.user present', { session: req.session && req.session.passport });
    // Redirect back with an error flag to show something went wrong
    const frontendUrlErr = (process.env.FRONTEND_URL || 'https://twiller-complete-project.onrender.com').replace(/\/+$/, '');
    return res.redirect(`${frontendUrlErr}/?error=oauth_no_user`);
  }
  if (!JWT_SECRET) {
    console.error('Google callback: JWT_SECRET is not set in environment');
    return res.status(500).send('Server misconfiguration');
  }
  try {
    const token = jwt.sign({ id: req.user._id, email: req.user.email }, JWT_SECRET, { expiresIn: '7d' });
    // Redirect back to frontend and include token in query string (frontend should parse/store it)
    const frontendUrl = (process.env.FRONTEND_URL || 'https://twiller-complete-project.onrender.com').replace(/\/+$/, '');
    return res.redirect(`${frontendUrl}/?token=${token}`);
  } catch (e) {
    console.error('Google callback error', e, { user: req.user && { id: req.user._id, email: req.user.email } });
    const frontendUrlErr = (process.env.FRONTEND_URL || 'https://twiller-complete-project.onrender.com').replace(/\/+$/, '');
    return res.redirect(`${frontendUrlErr}/?error=oauth_server_error`);
  }
});

// Helper to remove sensitive fields
function cleanUser(u) {
  if (!u) return null;
  const { password, ...rest } = u.toObject ? u.toObject() : u;
  // Add a default avatar for demo
  return { ...rest, avatar: u.avatar || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png' };
}

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'All fields required' });
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });
      // try send welcome email but do not fail registration if mail fails
      try {
        await sendMail(user.email, 'Welcome to Twiller', `<p>Hi ${user.name}, welcome to Twiller!</p>`);
      } catch (mailErr) {
        console.error('Welcome email failed:', mailErr && mailErr.message);
      }
      res.json({ success: true, user: cleanUser(user) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'All fields required' });
  const u = await User.findOne({ email });
  if (!u) return res.status(400).json({ message: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, u.password);
  if (!ok) return res.status(400).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ id: u._id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: cleanUser(u) });
});


// Get current user profile (for notification preference)
// Return current authenticated user and notification preference
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'No user' });
  // reuse cleanUser helper
  res.json({ user: cleanUser(user), notificationsEnabled: user.allowNotifications });
});

// Update notification preference
router.post('/notifications', auth, async (req, res) => {
  const userId = req.user.id;
  const { enabled } = req.body;
  await User.findByIdAndUpdate(userId, { allowNotifications: enabled });
  res.json({ success: true });
});

// forgot password request with 1-per-day rule
router.post('/forgot', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'No user' });

  const last = user.lastForgotRequest;
  const now = moment().tz('Asia/Kolkata');
  if (last && moment(last).tz('Asia/Kolkata').isSame(now, 'day')) {
    return res.status(400).json({ message: 'You can request password reset only once per day' });
  }

  // generate random password (only upper & lower)
  const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let pwd = '';
  for (let i=0;i<10;i++) pwd += letters[Math.floor(Math.random()*letters.length)];

  // set new password hashed
  const bcrypt = require('bcryptjs');
  user.password = await bcrypt.hash(pwd, 10);
  user.lastForgotRequest = new Date();
  await user.save();

  // send mail with new password
  try {
    await sendMail(user.email, 'Your new temporary password', `<p>Your temporary password: <b>${pwd}</b></p><p>Please change it after login.</p>`);
    res.json({ message: 'Temporary password sent to email' });
  } catch (mailErr) {
    console.error('Failed to send temporary password email:', mailErr && mailErr.message);
    // still respond success but let operator know
    res.json({ message: 'Temporary password set on account but failed to send email. Please contact support.' });
  }
});

// follow/unfollow by handle (demo: handle maps to email prefix or name)
router.post('/follow/:handle', auth, async (req, res) => {
  const handle = req.params.handle;
  // try find by email prefix or exact name
  let target = await User.findOne({ email: new RegExp('^' + handle + '@', 'i') });
  if (!target) target = await User.findOne({ name: new RegExp('^' + handle + '$', 'i') });
  // For demo: create placeholder user if not found so follow button works
  if (!target) {
    target = await User.create({ name: handle, email: `${handle}@local`, password: '' });
  }
  if (String(target._id) === String(req.user._id)) return res.status(400).json({ message: 'Cannot follow yourself' });
  const me = req.user;
  if (!me.follows.map(String).includes(String(target._id))) {
    me.follows.push(target._id);
    await me.save();
  }
  // return updated follows and target id
  res.json({ success: true, targetId: String(target._id), follows: me.follows });
});

router.post('/unfollow/:handle', auth, async (req, res) => {
  const handle = req.params.handle;
  let target = await User.findOne({ email: new RegExp('^' + handle + '@', 'i') });
  if (!target) target = await User.findOne({ name: new RegExp('^' + handle + '$', 'i') });
  if (!target) {
    target = await User.create({ name: handle, email: `${handle}@local`, password: '' });
  }
  const me = req.user;
  me.follows = (me.follows || []).filter(f => String(f) !== String(target._id));
  await me.save();
  res.json({ success: true, targetId: String(target._id), follows: me.follows });
});

// Check if current user is following a handle
router.get('/is-following/:handle', auth, async (req, res) => {
  const handle = req.params.handle;
  let target = await User.findOne({ email: new RegExp('^' + handle + '@', 'i') });
  if (!target) target = await User.findOne({ name: new RegExp('^' + handle + '$', 'i') });
  if (!target) return res.json({ following: false });
  const me = req.user;
  const following = (me.follows || []).map(String).includes(String(target._id));
  res.json({ following, targetId: String(target._id) });
});

// Get or set model preference
router.get('/model', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'No user' });
  res.json({ modelPreference: user.modelPreference || 'default' });
});

router.post('/model', auth, async (req, res) => {
  const { model } = req.body;
  if (!model) return res.status(400).json({ message: 'Model required' });
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'No user' });
  user.modelPreference = model;
  await user.save();
  res.json({ success: true, modelPreference: user.modelPreference });
});

// Upload avatar (authenticated)
// field name: avatar
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file' });
  const avatarPath = req.file.location || `/uploads/${req.file.filename}`;
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'No user' });
  user.avatar = avatarPath;
  await user.save();
  res.json({ success: true, avatar: avatarPath });
  } catch (e) {
    console.error('avatar upload error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update bio
router.post('/bio', auth, async (req, res) => {
  try {
    const { bio } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'No user' });
    user.bio = bio || '';
    await user.save();
    res.json({ success: true, bio: user.bio });
  } catch (e) {
    console.error('bio update error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
