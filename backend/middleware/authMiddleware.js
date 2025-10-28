const jwt = require('jsonwebtoken');
const User = require('../models/User');
const JWT_SECRET = process.env.JWT_SECRET;

module.exports = async function(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // First try lookup by MongoDB _id
    let user = null;
    try {
      user = await User.findById(decoded.id);
    } catch (e) {
      user = null;
    }
    // Fallback: if not found and token contains an email, try lookup by email
    if (!user && decoded.email) {
      user = await User.findOne({ email: decoded.email });
    }
    if (!user) return res.status(401).json({ message: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
