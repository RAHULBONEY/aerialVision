require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const authRoutes = require('./src/routes/auth');
const adminOperatorsRoutes = require("./src/routes/admin.operators");
const adminRolesRoutes = require("./src/routes/admin.roles");
const adminAuditLogsRoutes = require("./src/routes/admin.auditLogs");
const adminLoginHistoryRoutes = require("./src/routes/admin.loginHistory");
const adminStreams = require("./src/routes/admin.streams");
const configRoutes = require("./src/routes/config.routes");
const streams = require("./src/routes/streams");
const incidentRoutes = require("./src/routes/incident");
const trafficPoliceRoutes = require("./src/routes/trafficPolice.routes");
const chatRoutes = require("./src/routes/chat.routes");

const app = express();
const server = http.createServer(app);

// Socket.io setup with CORS
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const allowedOrigins = ['http://localhost:5173'];
      if (process.env.CLIENT_URL) {
        allowedOrigins.push(process.env.CLIENT_URL);
      }
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }
});

// Make io accessible globally for services
global.io = io;

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Join a stream room for targeted broadcasts
  socket.on('join_stream', (streamId) => {
    socket.join(`stream_${streamId}`);
    console.log(`📺 Socket ${socket.id} joined stream_${streamId}`);
  });

  socket.on('leave_stream', (streamId) => {
    socket.leave(`stream_${streamId}`);
    console.log(`📺 Socket ${socket.id} left stream_${streamId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const allowedOrigins = ['http://localhost:5173'];
    if (process.env.CLIENT_URL) {
      allowedOrigins.push(process.env.CLIENT_URL);
    }
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Serve static video files for simulations
app.use('/streams', express.static(path.join(__dirname, 'public', 'streams')));

app.get('/health', async (req, res) => {
  let aiEngineStatus = 'OFFLINE';
  try {
    const aiEngineUrl = process.env.AI_ENGINE_URL || 'http://127.0.0.1:8001';
   
    const response = await fetch(aiEngineUrl, { signal: AbortSignal.timeout(2000) });
    if (response.ok || response.status === 404 || response.status === 405) {

        aiEngineStatus = 'ACTIVE';
    }
  } catch (error) {
    aiEngineStatus = 'OFFLINE';
  }
  
  res.json({ 
    success: true, 
    backend: 'ONLINE', 
    aiEngine: aiEngineStatus, 
    socketConnections: io.engine.clientsCount 
  });
});

app.use('/api/auth', authRoutes);
app.use("/api/admin", adminStreams);
app.use("/api", streams);
app.use("/api/admin", adminOperatorsRoutes);
app.use("/api/admin", adminRolesRoutes);
app.use("/api/admin", adminAuditLogsRoutes);
app.use("/api/admin", adminLoginHistoryRoutes);
app.use("/api/config", configRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/traffic-police", trafficPoliceRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/emergency", require('./src/routes/emergency.routes'));


app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 API running on port ${PORT}`);
  console.log(`🔌 Socket.io ready for connections`);
});

// Export for use in other modules
module.exports = { io, server };
