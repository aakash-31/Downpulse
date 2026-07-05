const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/downpulse';
  
  try {
    console.log(`Connecting to MongoDB at: ${uri}...`);
    // Set connection timeout to 4 seconds to fail fast and trigger the fallback
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000,
    });
    isConnected = true;
    console.log('✅ MongoDB connected successfully.');
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    console.log('⚠️  Activating IN-MEMORY DATABASE FALLBACK mode for demonstration.');
    process.env.USE_MEMORY_DB = 'true';
    isConnected = false;
  }
};

const getIsConnected = () => isConnected;

module.exports = { connectDB, getIsConnected };
