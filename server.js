require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'shopscout_super_secret_jwt_key_2026_!@#$%^&*';
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

// ─── Middleware ───
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure data folder and users.json exist with seed accounts
function initUsersDatabase() {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(USERS_FILE)) {
    const defaultPasswordHash = bcrypt.hashSync('Password123', 10);
    const initialUsers = [
      {
        id: 'usr_1001',
        name: 'Alex Hunter',
        email: 'alex.hunter@example.com',
        password: defaultPasswordHash,
        role: 'user',
        joinedDate: 'Jan 2026',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
      },
      {
        id: 'usr_1002',
        name: 'Rahul Sharma',
        email: 'rahul.sharma@example.com',
        password: defaultPasswordHash,
        role: 'user',
        joinedDate: 'Feb 2026',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'
      }
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(initialUsers, null, 2), 'utf-8');
  }
}

initUsersDatabase();

function getUsers() {
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading users database:', err);
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

// ─── JWT Authentication Middleware ───
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Access Denied: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token. Please log in again.' });
  }
}

// ─── AUTHENTICATION APIS ───

/**
 * POST /api/auth/signup
 * Registers a new user with bcrypt password hashing and returns JWT
 */
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Validation
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields (name, email, password).' });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Name must be at least 2 characters long.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }

    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ success: false, message: 'Password must contain both letters and numbers.' });
    }

    // 2. Check if email already registered
    const users = getUsers();
    const cleanEmail = email.trim().toLowerCase();
    const existingUser = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please Sign In.'
      });
    }

    // 3. Hash password using bcrypt (10 rounds)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create and save new user
    const newUser = {
      id: 'usr_' + Date.now(),
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: 'user',
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      avatar: ''
    };

    users.push(newUser);
    saveUsers(users);

    // 5. Generate JWT Token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        joinedDate: newUser.joinedDate,
        avatar: newUser.avatar
      }
    });

  } catch (error) {
    console.error('Signup Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error. Please try again later.' });
  }
});

/**
 * POST /api/auth/login
 * Authenticates user, verifies bcrypt hash, and issues JWT
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please enter both email and password.' });
    }

    // 1. Find user by email
    const users = getUsers();
    const cleanEmail = email.trim().toLowerCase();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No registered account found with this email. Please check your spelling or register a new account.'
      });
    }

    // 2. Compare password with bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password! Please verify your password and try again.'
      });
    }

    // 3. Issue JWT Token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role || 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Signed in successfully!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        joinedDate: user.joinedDate || 'Sep 2026',
        avatar: user.avatar || ''
      }
    });

  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error. Please try again later.' });
  }
});

/**
 * GET /api/auth/me
 * Protected Route: Returns logged in user profile using JWT token
 */
app.get('/api/auth/me', verifyToken, (req, res) => {
  const users = getUsers();
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  return res.status(200).json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      joinedDate: user.joinedDate,
      avatar: user.avatar
    }
  });
});

// ─── Serve Static Frontend Files ───
app.use(express.static(__dirname));

// Fallback for clean URLs or root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 ShopScout Express Backend & Auth Server Live!`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`🔐 APIs:`);
  console.log(`   - POST http://localhost:${PORT}/api/auth/signup`);
  console.log(`   - POST http://localhost:${PORT}/api/auth/login`);
  console.log(`   - GET  http://localhost:${PORT}/api/auth/me (Protected)`);
  console.log(`==================================================\n`);
});
