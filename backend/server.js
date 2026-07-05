require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { connectDB } = require('./config/db');
const { initSocket } = require('./services/socket');
const { seedDatabaseIfEmpty } = require('./services/storage');
const scheduler = require('./services/scheduler');
const monitorsRouter = require('./routes/monitors');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Middleware
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// API Routes
app.use('/api/monitors', monitorsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    mode: process.env.USE_MEMORY_DB === 'true' ? 'in-memory-db' : 'mongodb',
    timestamp: new Date()
  });
});

const PORT = process.env.PORT || 5000;

// Start Server
const startServer = async () => {
  // Connect to Database (falls back to memory DB mode on failure)
  await connectDB();
  
  // Seed database if empty
  await seedDatabaseIfEmpty();
  
  server.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`🚀 DownPulse Server running on port ${PORT}`);
    console.log(`🔌 WebSockets enabled and listening`);
    console.log(`========================================`);
    
    // Start the Background Ping Engine
    scheduler.startScheduler();
  });
};

startServer().catch(err => {
  console.error('🔥 Server boot failure:', err.message);
});
