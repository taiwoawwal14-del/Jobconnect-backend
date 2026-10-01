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
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'https://jobconnect-frontend-wine.vercel.app',
  'https://jobconnect-frontend-git-main-*.vercel.app',
  'https://*.vercel.app',
];

const corsOptions = {
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

    callback(new Error('Origin not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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

io.on('connection', (socket) => {
  socket.on('join_room', ({ roomId, userId }) => {
    if (!roomId) return;
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.userId = userId;

    const history = roomMessages.get(roomId) || [];
    socket.emit('chat_history', history);
  });

  socket.on('send_message', (payload) => {
    const roomId = payload?.roomId;
    if (!roomId || !payload?.text?.trim()) return;

    const message = {
      _id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      roomId,
      senderId: payload.senderId,
      senderName: payload.senderName || 'User',
      text: payload.text.trim(),
      createdAt: new Date().toISOString(),
    };

    const existing = roomMessages.get(roomId) || [];
    const next = [...existing, message];
    roomMessages.set(roomId, next);

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



