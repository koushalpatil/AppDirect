const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// ── Validation helpers ────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_RE = /^[a-zA-ZÀ-ÖØ-öø-ÿ\s'-]+$/;
const PW_UPPER = /[A-Z]/;
const PW_LOWER = /[a-z]/;
const PW_DIGIT = /\d/;

exports.signup = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    // ── Required fields ──
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // ── Sanitize strings ──
    const fn = String(firstName).trim();
    const ln = String(lastName).trim();
    const em = String(email).trim().toLowerCase();
    const pw = String(password);

    // ── Name validation ──
    if (fn.length < 2 || fn.length > 50) {
      return res.status(400).json({ message: 'First name must be between 2 and 50 characters.' });
    }
    if (!NAME_RE.test(fn)) {
      return res.status(400).json({ message: 'First name can only contain letters, spaces, hyphens, and apostrophes.' });
    }
    if (ln.length < 2 || ln.length > 50) {
      return res.status(400).json({ message: 'Last name must be between 2 and 50 characters.' });
    }
    if (!NAME_RE.test(ln)) {
      return res.status(400).json({ message: 'Last name can only contain letters, spaces, hyphens, and apostrophes.' });
    }

    // ── Email validation ──
    if (!EMAIL_RE.test(em)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }
    if (em.length > 254) {
      return res.status(400).json({ message: 'Email address is too long.' });
    }

    // ── Password strength ──
    if (pw.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }
    if (pw.length > 128) {
      return res.status(400).json({ message: 'Password must be under 128 characters.' });
    }
    if (!PW_UPPER.test(pw) || !PW_LOWER.test(pw) || !PW_DIGIT.test(pw)) {
      return res.status(400).json({ message: 'Password must include an uppercase letter, lowercase letter, and a number.' });
    }

    const existingUser = await User.findOne({ email: em });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const validRoles = ['user', 'admin'];
    const userRole = validRoles.includes(role) ? role : 'user';

    const user = await User.create({
      firstName: fn,
      lastName: ln,
      email: em,
      password: pw,
      role: userRole,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    res.status(500).json({ message: 'Failed to create account. Please try again.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const em = String(email).trim().toLowerCase();

    // ── Email format check ──
    if (!EMAIL_RE.test(em)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    const user = await User.findOne({ email: em }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // If role is specified, verify user has that role
    if (role && user.role !== role) {
      return res.status(403).json({ message: `You do not have ${role} privileges.` });
    }

    const token = generateToken(user._id);

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
};

exports.getMe = async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        role: req.user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve user profile.' });
  }
};
