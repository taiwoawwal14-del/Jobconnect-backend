const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
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
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/jobconnect';
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:3000',
  'http://localhost:4173',
  'https://jobconnect-frontend-wine.vercel.app',
  'https://jobconnect-frontend-git-main-*.vercel.app',
  'https://*.vercel.app',
];

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  return allowedOrigins.some((pattern) => {
    if (pattern.includes('*')) {
      const regex = new RegExp(
        `^${pattern
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          .replace(/\\\*/g, '.*')}$`
      );
      return regex.test(origin);
    }
    return pattern === origin;
  });
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const allowed = allowedOrigins.some((pattern) => {
        if (pattern.includes('*')) {
          const regex = new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*')}$`);
          return regex.test(origin);
        }
        return pattern === origin;
      });

      if (allowed) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by Socket.IO CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const roomMessages = new Map();

async function loadRoomHistory(roomId) {
  const cached = roomMessages.get(roomId);
  if (cached && cached.length) return cached;

  const history = await Message.find({ roomId })
    .sort({ createdAt: 1 })
    .limit(100)
    .lean();

  const normalized = history.map((message) => ({
    ...message,
    _id: String(message._id),
    createdAt: new Date(message.createdAt).toISOString(),
  }));

  roomMessages.set(roomId, normalized);
  return normalized;
}

io.on('connection', (socket) => {
  socket.on('join_room', async ({ roomId, userId }) => {
    if (!roomId) return;
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.userId = userId;

    const history = await loadRoomHistory(roomId);
    socket.emit('chat_history', history);
  });

  socket.on('send_message', async (payload) => {
    const roomId = payload?.roomId;
    if (!roomId || !payload?.text?.trim()) return;

    try {
      const savedMessage = await Message.create({
        roomId,
        senderId: payload.senderId,
        senderName: payload.senderName || 'User',
        text: payload.text.trim(),
      });

      const message = {
        ...savedMessage.toObject(),
        _id: String(savedMessage._id),
        createdAt: new Date(savedMessage.createdAt).toISOString(),
      };

      const existing = roomMessages.get(roomId) || [];
      const next = [...existing, message].slice(-100);
      roomMessages.set(roomId, next);

      io.to(roomId).emit('receive_message', message);
    } catch (error) {
      console.error('Socket message save error:', error);
      socket.emit('message_error', { error: 'Failed to save message' });
    }
  });
});

mongoose
  .connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 })
  .then(() => console.log('Successfully connected to MongoDB!'))
  .catch((err) => {
    console.error('MongoDB connection error:', err.message || err);
  });

app.use('/api', authRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
  res.send('Server running successfully!');
});

const startServer = (port) => {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Close the other Node process or change PORT in the Backend .env file.`);
      process.exit(1);
    }

    console.error('Server startup error:', err);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
};

startServer(PORT);



