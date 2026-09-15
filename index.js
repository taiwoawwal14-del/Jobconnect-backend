require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const Message = require('./models/Message');

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

io.on('connection', (socket) => {
  socket.on('join_room', async ({ roomId, userId }) => {
    if (!roomId) return;
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.userId = userId;
    try {
      const history = await Message.find({ roomId })
        .sort({ createdAt: 1 })
        .limit(50)
        .lean();
      socket.emit('chat_history', history.map((message) => ({
        ...message,
        id: message._id.toString(),
      })));
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  });

  socket.on('send_message', async (payload) => {
    const roomId = payload?.roomId;
    if (!roomId || !payload?.text?.trim()) return;

    const message = {
      roomId,
      senderId: payload.senderId,
      senderName: payload.senderName || 'User',
      text: payload.text.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      const savedMessage = await Message.create(message);
      io.to(roomId).emit('receive_message', {
        ...savedMessage.toObject(),
        id: savedMessage._id.toString(),
      });
    } catch (err) {
      console.error('Failed to save chat message:', err);
    }
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

// make the navbar in the jobs page to be a scroll bar ok and make the profile display to be efficient and good also make a good positioning for every thing and don't make it come pleacated and the pages navbar it feels some how can you fix it for 
