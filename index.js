require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');

const authRoutes = require('./routes/authRoutes');
const jobsRoutes = require('./routes/jobsRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const roomMessages = {};

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  socket.on('join_room', ({ roomId, userId }) => {
    if (!roomId) return;
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.userId = userId;
    if (roomMessages[roomId]) {
      socket.emit('chat_history', roomMessages[roomId]);
    }
  });

  socket.on('send_message', (payload) => {
    const roomId = payload?.roomId;
    if (!roomId || !payload?.text?.trim()) return;

    const message = {
      id: Date.now().toString(),
      roomId,
      senderId: payload.senderId,
      senderName: payload.senderName || 'User',
      text: payload.text.trim(),
      createdAt: new Date().toISOString(),
    };

    if (!roomMessages[roomId]) roomMessages[roomId] = [];
    roomMessages[roomId].push(message);
    if (roomMessages[roomId].length > 50) {
      roomMessages[roomId] = roomMessages[roomId].slice(-50);
    }

    io.to(roomId).emit('receive_message', message);
  });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('Successfully connected to MongoDB!'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.use('/api', authRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
  res.send('Server running successfully!');
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});