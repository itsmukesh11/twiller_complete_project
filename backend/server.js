require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');
const fs = require('fs');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Connect to MongoDB
connectDB(process.env.MONGO_URI);

// ✅ Middlewares
// If running behind a proxy (Render), trust the first proxy so secure cookies work correctly
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none',
    // 7 days
    maxAge: 7 * 24 * 60 * 60 * 1000,
  }
}));
app.use(passport.initialize());
app.use(passport.session());
// Configure CORS with specific options
app.use(cors({
  origin: [
    'https://twiller-complete-project-1.onrender.com',
    'https://twiller-complete-project.onrender.com',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(express.json());

// ✅ Google OAuth setup
passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:
      process.env.GOOGLE_CALLBACK_URL ||
      "https://twiller-complete-project.onrender.com/api/auth/google/callback",
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        user = new User({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails?.[0]?.value,
          avatar: profile.photos?.[0]?.value,
        });
        await user.save();
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

// ✅ Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tweets', require('./routes/tweets'));
app.use('/api/audio', require('./routes/audio'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/profile', require('./routes/profile'));

// ✅ Test route to verify API is working
app.get("/api", (req, res) => {
  res.json({ message: "✅ Twiller API is running correctly" });
});

// ✅ Health check route
app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ✅ Root route
app.get('/', (req, res) => res.status(200).send('Twiller backend is up 🚀'));

// ✅ Serve frontend build if exists
const FRONTEND_BUILD_DIR = process.env.FRONTEND_BUILD_DIR || path.join(__dirname, 'frontend_build');
if (fs.existsSync(FRONTEND_BUILD_DIR)) {
  app.use(express.static(FRONTEND_BUILD_DIR));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return res.status(404).send('Not found');
    res.sendFile(path.join(FRONTEND_BUILD_DIR, 'index.html'));
  });
}

// ✅ Start the server
const server = app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`⚠️  Port ${PORT} already in use. Stop any running instance and retry.`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});
