const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  username: { type: String },
  avatar: { type: String },
  location: { type: String },
  bio: { type: String },
  skills: { type: [String], default: [] },
  experience: { type: String },
  contactInfo: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Hash password automatically before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.model('User', userSchema);