const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Tweet = require('../models/Tweet');
const auth = require('../middleware/authMiddleware');

// Get public profile by handle (email prefix or name)
router.get('/:handle', auth, async (req, res) => {
  const handle = req.params.handle;
  let user = await User.findOne({ email: new RegExp('^' + handle + '@', 'i') });
  if (!user) user = await User.findOne({ name: new RegExp('^' + handle + '$', 'i') });
  if (!user) return res.status(404).json({ message: 'User not found' });

  // follower count = users having this user's id in their follows
  const followersCount = await User.countDocuments({ follows: user._id });
  const followingCount = (user.follows || []).length;

  // mutual: intersection of current user's follows and target user's follows
  const me = req.user;
  const myFollows = (me.follows || []).map(String);
  const theirFollows = (user.follows || []).map(String);
  const mutualCount = myFollows.filter(f => theirFollows.includes(f)).length;

  // fetch user's posts
  const posts = await Tweet.find({ user: user._id }).sort({ createdAt: -1 }).lean();

  res.json({
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png',
      bio: user.bio || '',
      createdAt: user.createdAt
    },
    counts: {
      followers: followersCount,
      following: followingCount,
      mutual: mutualCount
    },
    posts
  });
});

// Get profile by user id
router.get('/id/:id', auth, async (req, res) => {
  const id = req.params.id;
  let user = null;
  try {
    user = await User.findById(id);
  } catch (e) {
    return res.status(400).json({ message: 'Invalid id' });
  }
  if (!user) return res.status(404).json({ message: 'User not found' });

  const followersCount = await User.countDocuments({ follows: user._id });
  const followingCount = (user.follows || []).length;
  const me = req.user;
  const myFollows = (me.follows || []).map(String);
  const theirFollows = (user.follows || []).map(String);
  const mutualCount = myFollows.filter(f => theirFollows.includes(f)).length;
  const posts = await Tweet.find({ user: user._id }).sort({ createdAt: -1 }).lean();

  res.json({
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png',
      bio: user.bio || '',
      createdAt: user.createdAt
    },
    counts: {
      followers: followersCount,
      following: followingCount,
      mutual: mutualCount
    },
    posts
  });
});

// Update notification preference
router.post('/notifications', auth, async (req, res) => {
  try {
    const allow = !!req.body.allow;
    const user = await User.findByIdAndUpdate(req.user._id, { allowNotifications: allow }, { new: true });
    return res.json({ success: true, allowNotifications: user.allowNotifications });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Could not update preference' });
  }
});

module.exports = router;
 