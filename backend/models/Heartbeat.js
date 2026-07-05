const mongoose = require('mongoose');

const heartbeatSchema = new mongoose.Schema({
  monitorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Monitor',
    required: true,
  },
  status: {
    type: Number, // 1 for UP, 0 for DOWN
    required: true,
    enum: [0, 1],
  },
  latency: {
    type: Number, // Response latency in milliseconds
    required: true,
  },
  code: {
    type: Number, // HTTP status code
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// TTL index to automatically purge heartbeat logs older than 30 days
// 30 days = 30 * 24 * 60 * 60 = 2,592,000 seconds
heartbeatSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('Heartbeat', heartbeatSchema);
