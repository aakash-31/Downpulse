const mongoose = require('mongoose');

const monitorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    interval: {
      type: Number,
      default: 60, // Ping interval in seconds
      min: 5,      // Minimum 5 seconds to prevent abuse
    },
    status: {
      type: String,
      enum: ['UP', 'DOWN', 'PENDING'],
      default: 'PENDING',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Monitor', monitorSchema);
