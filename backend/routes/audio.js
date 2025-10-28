const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/authMiddleware');
const OTP = require('../models/OTP');
const User = require('../models/User');
const { sendMail } = require('../utils/mailer');
const moment = require('moment-timezone');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB

// send OTP for audio post
router.post('/send-otp', auth, async (req, res) => {
  const email = req.user.email;
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await OTP.create({ email, code, purpose: 'audio', expiresAt });
  try {
    await sendMail(email, 'Your audio upload OTP', `<p>Your OTP is <b>${code}</b>, it expires in 10 minutes.</p>`);
    res.json({ message: 'OTP sent' });
  } catch (mailErr) {
    console.error('Failed to send audio OTP:', mailErr && mailErr.message);
    res.json({ message: 'OTP generated but failed to send email. Please check SMTP config.' });
  }
});

// verify OTP
router.post('/verify-otp', auth, async (req, res) => {
  const { code } = req.body;
  const rec = await OTP.findOne({ email: req.user.email, code, purpose: 'audio', used: false });
  if (!rec) return res.status(400).json({ message: 'Invalid OTP' });
  if (rec.expiresAt < new Date()) return res.status(400).json({ message: 'OTP expired' });
  rec.used = true; await rec.save();
  req.user.otpVerifiedForAudio = true;
  await req.user.save();
  res.json({ message: 'OTP verified' });
});

// upload audio
router.post('/upload', auth, upload.single('audio'), async (req, res) => {
  // Time window: Audio uploads only allowed 14:00 - 19:00 IST
  const now = moment().tz('Asia/Kolkata');
  const start = now.clone().hour(14).minute(0);
  const end = now.clone().hour(19).minute(0);
  if (!now.isBetween(start, end, null, '[]')) {
    return res.status(403).json({ message: 'Audio uploads allowed only between 2PM and 7PM IST' });
  }

  if (!req.user.otpVerifiedForAudio) return res.status(403).json({ message: 'Verify OTP before uploading audio' });

  const file = req.file;
  if (!file) return res.status(400).json({ message: 'No file' });
  // size already limited by multer to 100MB
  // duration check: perform server-side check using ffmpeg (fluent-ffmpeg)
  const fs = require('fs');
  const path = require('path');
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  const audioDir = path.join(uploadsDir, 'audio');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir);
  const filename = `audio_${Date.now()}.webm`;
  const filepath = path.join(audioDir, filename);
  fs.writeFileSync(filepath, req.file.buffer);

  // server-side duration check using ffprobe
  try {
    const ffmpeg = require('fluent-ffmpeg');
    // prefer bundled ffprobe via ffprobe-static if available
    try {
      const ffprobeStatic = require('ffprobe-static');
      if (ffprobeStatic && ffprobeStatic.path) {
        ffmpeg.setFfprobePath(ffprobeStatic.path);
      }
    } catch (e) {
      // ffprobe-static not installed; fluent-ffmpeg will try system ffprobe
    }

    // ensure ffprobe is available and check duration
    await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filepath, (err, metadata) => {
        if (err) return reject(err);
        const duration = metadata && metadata.format ? metadata.format.duration || 0 : 0;
        if (duration > 300) {
          // delete file
          try { fs.unlinkSync(filepath); } catch (e) {}
          return reject(new Error('Audio duration exceeds 5 minutes'));
        }
        resolve();
      });
    });
  } catch (err) {
    // If ffmpeg/ffprobe is not installed or duration > 300s
    if (err.message && err.message.includes('exceeds')) {
      return res.status(400).json({ message: 'Audio duration should not exceed 5 minutes' });
    }
    // Could not run ffprobe - inform operator
    try { fs.unlinkSync(filepath); } catch (e) {}
    return res.status(500).json({ message: 'Server cannot validate audio duration. Install ffmpeg/ffprobe or add the ffprobe-static package.' });
  }

  // reset verification flag
  req.user.otpVerifiedForAudio = false;
  await req.user.save();

  // create a Tweet record so it appears in timeline
  const Tweet = require('../models/Tweet');
  // save audio metadata (attempt to read duration again via ffprobe)
  let audioMeta = { url: `/uploads/audio/${filename}`, size: file.size };
  try {
    const ffmpeg = require('fluent-ffmpeg');
    try {
      const ffprobeStatic = require('ffprobe-static');
      if (ffprobeStatic && ffprobeStatic.path) ffmpeg.setFfprobePath(ffprobeStatic.path);
    } catch (e) {}
    const meta = await new Promise((resolve, reject) => ffmpeg.ffprobe(filepath, (err, m) => err ? reject(err) : resolve(m)));
    audioMeta.duration = meta && meta.format ? meta.format.duration || 0 : 0;
  } catch (e) {
    // ignore
  }

  // If S3 is configured, upload the audio file to S3 and set public URL
  try {
    if (process.env.S3_BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      const AWS = require('aws-sdk');
      const s3 = new AWS.S3({ region: process.env.AWS_REGION || 'us-east-1' });
      const key = `audio/${filename}`;
      const stream = fs.createReadStream(filepath);
      const uploadRes = await s3.upload({ Bucket: process.env.S3_BUCKET, Key: key, Body: stream, ContentType: 'audio/webm', ACL: 'public-read' }).promise();
      audioMeta.url = uploadRes.Location;
      // delete local file
      try { fs.unlinkSync(filepath); } catch (e) {}
    }
  } catch (e) {
    console.error('S3 upload failed for audio:', e && e.message);
    // proceed with local URL if S3 upload fails
  }

  const t = await Tweet.create({ user: req.user._id, text: req.body.text || '', audioUrl: audioMeta.url, audioMeta });

  res.json({ message: 'Uploaded', url: audioMeta.url, tweet: t });
});

module.exports = router;
