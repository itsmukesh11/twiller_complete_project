// backend/routes/tweets.js
const express = require('express');
const router = express.Router();
const Tweet = require('../models/Tweet');
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');
const moment = require('moment-timezone');
const path = require('path');
const upload = require('../middleware/uploadMiddleware');

// Accept up to 4 media files (images) OR 1 video
// We'll accept field name 'media' with multiple files.
const cpUpload = upload.array('media', 4); // max 4

router.post('/', auth, function (req, res) {
  // Use multer as middleware but with the callback style to preserve async rules
  cpUpload(req, res, async function (err) {
    if (err) {
      // multer error
      return res.status(400).json({ message: err.message || 'File upload error' });
    }

    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: 'Unauthorized' });

      // Read text & optional audioUrl/videoUrl from form fields
      const text = req.body.text || '';
      const audioUrl = req.body.audioUrl || '';
      const videoUrl = req.body.videoUrl || '';

      // Posting rules (same as before)
      const now = moment().tz('Asia/Kolkata');
      const followCount = (user.follows || []).length;
      const startOfDay = now.clone().startOf('day').toDate();
      const endOfDay = now.clone().endOf('day').toDate();
      const todayCount = await Tweet.countDocuments({ user: user._id, createdAt: { $gte: startOfDay, $lte: endOfDay } });
      // Posting rules influenced by follows and subscription plans.
      // Subscription plan quotas
      const plan = user.subscription?.plan || 'free';
      const planMap = { free: 1, bronze: 3, silver: 5, gold: Infinity };
      let allowedByPlan = planMap[plan] ?? 1;

      // Follow-based allowances (increase allowed posts, except 0 follows has a time-window restriction)
      let allowedByFollows = 0;
      if (followCount === 0) {
        // Only allowed once and only in the 10:00-10:30 IST window
        const start = now.clone().hour(10).minute(0);
        const end = now.clone().hour(10).minute(30);
        if (!now.isBetween(start, end, null, '[]')) {
          return res.status(403).json({ message: 'Users who follow nobody can post only between 10:00-10:30 IST' });
        }
        if (todayCount >= 1) return res.status(403).json({ message: 'You already posted today in your window.' });
        allowedByFollows = 1;
      } else if (followCount === 2) {
        allowedByFollows = 2; // exactly 2 follows -> up to 2 posts/day
      } else if (followCount > 10) {
        allowedByFollows = Infinity; // more than 10 follows -> unlimited
      }

      // Final allowed posts is the maximum of plan allowance and follow-based allowance
      const finalAllowed = allowedByFollows === 0 ? allowedByPlan : Math.max(allowedByPlan, allowedByFollows);
      if (finalAllowed !== Infinity && todayCount >= finalAllowed) {
        return res.status(403).json({ message: 'You have reached your posting limit for today.' });
      }

      // Process uploaded files (if any)
      const mediaUrls = [];
      if (req.files && req.files.length) {
        // Basic rule: allow up to 4 images OR 1 video.
        // If any uploaded file is video, ensure only one file uploaded (server-side rule).
  const hasVideo = req.files.some(f => f.mimetype.startsWith('video/'));
        if (hasVideo && req.files.length > 1) {
          return res.status(400).json({ message: 'If you upload a video, only 1 media file is allowed.' });
        }

        // Convert to publicly accessible URLs. If using S3 (multer-s3) the file will include `location`.
        for (const f of req.files) {
          if (f.location) {
            mediaUrls.push(f.location);
          } else if (f.path) {
            mediaUrls.push(`/uploads/${path.basename(f.path)}`);
          } else if (f.filename) {
            mediaUrls.push(`/uploads/${f.filename}`);
          }
        }
      }

      const tweet = await Tweet.create({
        user: user._id,
        text,
        audioUrl,
        videoUrl,
        mediaUrls
      });

      // Notification trigger: if text contains 'cricket' or 'science', return notify flag for frontend
      const notifyKeywords = /(?:\bcricket\b|\bscience\b)/i;
      const notify = notifyKeywords.test(text);

      return res.json({ tweet, notify });
    } catch (e) {
      console.error('Tweet POST error', e);
      return res.status(500).json({ message: 'Server error' });
    }
  });
});

router.get('/', async (req, res) => {
  // populate tweet.user and comments.user for frontend display
  const tweets = await Tweet.find().populate('user').populate('comments.user').sort({ createdAt: -1 }).limit(200);
  res.json(tweets);
});

// follow/unfollow endpoints
router.post('/:id/follow', auth, async (req, res) => {
  const targetId = req.params.id;
  const me = req.user;
  if (String(me._id) === String(targetId)) return res.status(400).json({ message: 'Cannot follow yourself' });
  if (!me.follows.includes(targetId)) {
    me.follows.push(targetId);
    await me.save();
  }
  res.json({ success: true });
});

router.post('/:id/unfollow', auth, async (req, res) => {
  const targetId = req.params.id;
  const me = req.user;
  me.follows = (me.follows || []).filter(f => String(f) !== String(targetId));
  await me.save();
  res.json({ success: true });
});

// like, comment, share
router.post('/:id/like', auth, async (req, res) => {
  const t = await Tweet.findById(req.params.id);
  if (!t) return res.status(404).json({ message: 'No tweet' });
  if (!t.likes.map(String).includes(String(req.user._id))) t.likes.push(req.user._id);
  await t.save();
  res.json({ success: true, likes: t.likes.length });
});

router.post('/:id/unlike', auth, async (req, res) => {
  const t = await Tweet.findById(req.params.id);
  if (!t) return res.status(404).json({ message: 'No tweet' });
  t.likes = (t.likes || []).filter(l => String(l) !== String(req.user._id));
  await t.save();
  res.json({ success: true, likes: t.likes.length });
});

router.post('/:id/comment', auth, async (req, res) => {
  const { text } = req.body;
  const t = await Tweet.findById(req.params.id);
  if (!t) return res.status(404).json({ message: 'No tweet' });
  t.comments = t.comments || [];
  t.comments.push({ user: req.user._id, text });
  await t.save();
  // populate comment user for response
  await t.populate('comments.user');
  res.json({ success: true, comments: t.comments });
});

router.post('/:id/share', auth, async (req, res) => {
  const t = await Tweet.findById(req.params.id);
  if (!t) return res.status(404).json({ message: 'No tweet' });
  t.shares = (t.shares || 0) + 1;
  await t.save();
  res.json({ success: true, shares: t.shares });
});

// Delete tweet endpoint
router.delete('/:id', auth, async (req, res) => {
  try {
    const tweet = await Tweet.findById(req.params.id);
    if (!tweet) return res.status(404).json({ message: 'Tweet not found' });
    
    // Only allow deletion if user owns the tweet
    if (String(tweet.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to delete this tweet' });
    }
    
    await Tweet.deleteOne({ _id: tweet._id });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete tweet error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete comment endpoint
router.delete('/:tweetId/comments/:commentId', auth, async (req, res) => {
  try {
    const tweet = await Tweet.findById(req.params.tweetId);
    if (!tweet) return res.status(404).json({ message: 'Tweet not found' });
    
    const comment = tweet.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    
    // Only allow deletion if user owns the comment
    if (String(comment.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }
    
    comment.remove();
    await tweet.save();
    
    // Populate updated comments for response
    await tweet.populate('comments.user');
    res.json({ success: true, comments: tweet.comments });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// simple trending hashtags endpoint
router.get('/trending/hashtags', async (req, res) => {
  // naive: scan recent tweets and collect hashtags
  const recent = await Tweet.find().sort({ createdAt: -1 }).limit(500);
  const counts = {};
  recent.forEach(t => {
    const matches = (t.text || '').match(/#\w+/g) || [];
    matches.forEach(m => { counts[m] = (counts[m] || 0) + 1; });
  });
  const sorted = Object.keys(counts).sort((a,b) => counts[b]-counts[a]);
  res.json(sorted.slice(0,20));
});

module.exports = router;
