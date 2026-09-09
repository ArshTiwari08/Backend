const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// Limit login attempts to slow down brute-force / credential-stuffing attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

// ---------- Register ----------
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('name').optional().trim().isLength({ max: 100 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { email, password, name } = req.body;

    try {
      const existing = await User.findOne({ email });
      if (existing) {
        // Same generic message as other failures - don't reveal which emails exist
        return res.status(409).json({ error: 'Could not create account with those details' });
      }

      const user = await User.create({ email, password, name });

      // Log the user in immediately after registering by starting a session
      req.session.userId = user._id.toString();

      res.status(201).json({ user: user.toSafeObject() });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  }
);

// ---------- Login ----------
router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email }).select('+password +failedLoginAttempts +lockUntil');

      // Always compare against something to keep response timing similar,
      // even when the account doesn't exist.
      if (!user) {
        await bcryptCompareDummy();
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (user.lockUntil && user.lockUntil > Date.now()) {
        const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
        return res.status(423).json({
          error: `Account temporarily locked. Try again in ${minutesLeft} minute(s).`,
        });
      }

      const isMatch = await user.comparePassword(password);

      if (!isMatch) {
        user.failedLoginAttempts += 1;
        if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
          user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
          user.failedLoginAttempts = 0;
        }
        await user.save();
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Successful login: reset lockout state and start a session
      user.failedLoginAttempts = 0;
      user.lockUntil = undefined;
      await user.save();

      // Regenerate the session to prevent session fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regenerate error:', err);
          return res.status(500).json({ error: 'Something went wrong. Please try again.' });
        }
        req.session.userId = user._id.toString();
        res.json({ user: user.toSafeObject() });
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  }
);

// Dummy hash comparison so login timing doesn't reveal whether an email exists
async function bcryptCompareDummy() {
  const bcrypt = require('bcryptjs');
  const dummyHash = '$2a$12$CwTycUXWue0Thq9StjUM0uJ8Ry6XmXfQoDNjnGVN6EymfBrxYFsFm';
  await bcrypt.compare('dummy-password', dummyHash);
}

// ---------- Logout ----------
router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Could not log out. Please try again.' });
    }
    res.clearCookie('connect.sid');
    res.status(200).json({ message: 'Logged out' });
  });
});

// ---------- Current user ----------
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json({ user: user.toSafeObject() });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
