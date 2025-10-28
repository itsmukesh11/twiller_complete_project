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


connectDB(process.env.MONGO_URI);


app.use(session({
	secret: process.env.SESSION_SECRET || 'your-session-secret',
	resave: false,
	saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(cors());
app.use(express.json());


// Google OAuth setup
passport.use(new GoogleStrategy({
	clientID: process.env.GOOGLE_CLIENT_ID,
	clientSecret: process.env.GOOGLE_CLIENT_SECRET,
	callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
	try {
		// prefer finding by email if available
		const email = profile.emails && profile.emails[0] && profile.emails[0].value;
		let user = null;
		if (email) user = await User.findOne({ email: email });
		if (!user) {
			user = await User.create({ name: profile.displayName || profile.username || 'GoogleUser', email: email || `google_${profile.id}@local`, password: '' });
		}
		return done(null, user);
	} catch (err) {
		return done(err);
	}
}));

passport.serializeUser((user, done) => {
	done(null, user);
});
passport.deserializeUser((user, done) => {
	done(null, user);
});

// Google OAuth routes
app.get('/auth/google',
	passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
	passport.authenticate('google', { failureRedirect: '/' }),
	(req, res) => {
		// Generate JWT for the user
		const user = req.user;
		// Build payload using the database user object
		const payload = {
			id: user._id ? String(user._id) : user.id,
			displayName: user.name || user.displayName,
			email: user.email,
			provider: 'google'
		};
		const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
		// Use FRONTEND_URL env in production; fallback to localhost:3000 for development
		const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
		res.redirect(`${FRONTEND_URL}?token=${token}`);
	}
);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/tweets', require('./routes/tweets'));
app.use('/api/audio', require('./routes/audio'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/profile', require('./routes/profile'));

// static uploads for demo
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health endpoint
app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Health route for quick checks
app.get('/', (req, res) => res.status(200).send('Twiller backend is up'));

// Serve frontend build if present (build will be copied into backend/frontend_build by CI)
const FRONTEND_BUILD_DIR = process.env.FRONTEND_BUILD_DIR || path.join(__dirname, 'frontend_build');
if (fs.existsSync(FRONTEND_BUILD_DIR)) {
	app.use(express.static(FRONTEND_BUILD_DIR));
	// Fallback to index.html for non-API routes
	app.get('*', (req, res) => {
		if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return res.status(404).send('Not found');
		res.sendFile(path.join(FRONTEND_BUILD_DIR, 'index.html'));
	});
}

// Start server with error handling (clearer EADDRINUSE logging)
const server = app.listen(PORT, () => console.log(`Server listening on ${PORT}`));

server.on('error', (err) => {
	if (err.code === 'EADDRINUSE') {
		console.error(`Port ${PORT} already in use. Stop any running instance and retry.`);
	} else {
		console.error('Server error:', err);
	}
	process.exit(1);
});
