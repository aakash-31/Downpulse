const socketIo = require('socket.io');

let io = null;

const initSocket = (server) => {
  const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
  io = socketIo(server, {
    cors: {
      origin: allowedOrigin,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join room for specific monitor
    socket.on('join_monitor', (monitorId) => {
      socket.join(monitorId);
      console.log(`👤 Client ${socket.id} joined room for monitor: ${monitorId}`);
    });

    // Leave room for specific monitor
    socket.on('leave_monitor', (monitorId) => {
      socket.leave(monitorId);
      console.log(`👤 Client ${socket.id} left room for monitor: ${monitorId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  return io;
};

const emitHeartbeat = (monitorId, heartbeatData) => {
  if (io) {
    // Emit to room for this monitor
    io.to(monitorId).emit('heartbeat', heartbeatData);
    
    // Also emit global update for dashboard
    io.emit('monitor_update', {
      monitorId,
      ...heartbeatData
    });
  }
};

module.exports = {
  initSocket,
  getIO,
  emitHeartbeat
};
