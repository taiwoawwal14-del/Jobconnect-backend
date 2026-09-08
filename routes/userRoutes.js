const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /api/users/:id - get user profile
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id - update profile (partial)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    // prevent password update via this route
    delete updates.password;
    const user = await User.findByIdAndUpdate(id, updates, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
