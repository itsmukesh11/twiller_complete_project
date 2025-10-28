// backend/middleware/uploadMiddleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Allowed types: images and mp4 video
const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'video/mp4', 'video/webm'];

function fileFilter(req, file, cb) {
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Invalid file type. Only images (jpg,png,webp) and mp4/webm videos allowed.'));
}

// Limits: 100 MB per file (configurable)
const FILE_SIZE_LIMIT = 100 * 1024 * 1024; // 100MB

// If S3 config present, use multer-s3; otherwise fall back to disk storage (dev)
let upload;
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.S3_BUCKET) {
  const AWS = require('aws-sdk');
  const multerS3 = require('multer-s3');
  const s3 = new AWS.S3({ region: process.env.AWS_REGION || 'us-east-1' });

  const storage = multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET,
    acl: 'public-read',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      const ext = path.extname(file.originalname);
      const name = file.fieldname + '-' + Date.now() + ext;
      cb(null, name);
    }
  });

  upload = multer({ storage, fileFilter, limits: { fileSize: FILE_SIZE_LIMIT } });
} else {
  // Local disk storage (development)
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname);
      const name = file.fieldname + '-' + Date.now() + ext;
      cb(null, name);
    }
  });

  upload = multer({ storage, fileFilter, limits: { fileSize: FILE_SIZE_LIMIT } });
}

module.exports = upload;
