const mongoose = require('mongoose');

// Keeps the existing Socket.IO payloads available after a server restart.
const messageSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  senderId: { type: String, required: true },
  senderName: { type: String, default: 'User' },
  text: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

messageSchema.index({ roomId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
