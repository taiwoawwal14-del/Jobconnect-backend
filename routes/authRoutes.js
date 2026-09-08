const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// POST /api/signup
router.post('/signup', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Please enter all fields (fullName, email, password)' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const newUser = new User({ fullName, email, password });
    await newUser.save();

    // return created user info (no password)
    res.status(201).json({ message: 'User registered successfully!', user: { id: newUser._id, email: newUser.email, fullName: newUser.fullName } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

    // POST /api/login
    router.post('/login', async (req, res) => {
      try {
        const { email, password } = req.body;
        if (!email || !password) {
          return res.status(400).json({ error: 'Please provide email and password' });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ error: 'Invalid credentials' });

        res.json({ message: 'Login successful', user: { id: user._id, email: user.email, fullName: user.fullName } });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

module.exports = router;
