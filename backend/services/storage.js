const Monitor = require('../models/Monitor');
const Heartbeat = require('../models/Heartbeat');

// In-memory data store for fallback/demo mode
let monitorsMemory = [
  {
    _id: 'mock-google',
    name: 'Google Health Check',
    url: 'https://www.google.com',
    interval: 30,
    status: 'PENDING',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'mock-github',
    name: 'GitHub API Portal',
    url: 'https://api.github.com',
    interval: 60,
    status: 'PENDING',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'mock-http-200',
    name: 'HTTP 200 Mock OK',
    url: 'https://httpstat.us/200',
    interval: 15,
    status: 'PENDING',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'mock-http-503',
    name: 'HTTP 503 Mock Outage',
    url: 'https://httpstat.us/503',
    interval: 20,
    status: 'PENDING',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

let heartbeatsMemory = [];

// Helper to generate seed heartbeats for mock data so the grid is not empty initially
const seedMockHeartbeats = () => {
  const now = Date.now();
  const timeBlock = 60 * 1000; // 1 minute
  
  monitorsMemory.forEach(monitor => {
    // Generate 60 historical heartbeats to represent the last hour or so
    for (let i = 60; i >= 0; i--) {
      const timestamp = new Date(now - i * timeBlock * 20); // spread over several hours
      const isOutage = monitor._id === 'mock-http-503' || (monitor._id === 'mock-github' && i % 15 === 0);
      const status = isOutage ? 0 : 1;
      const code = isOutage ? (monitor._id === 'mock-http-503' ? 503 : 500) : 200;
      const latency = isOutage ? 0 : Math.floor(Math.random() * 150) + 50;

      heartbeatsMemory.push({
        _id: `hb-${monitor._id}-${i}`,
        monitorId: monitor._id,
        status,
        latency,
        code,
        timestamp
      });
    }
  });
};

seedMockHeartbeats();

const isMemoryMode = () => process.env.USE_MEMORY_DB === 'true';

const getMonitors = async () => {
  if (isMemoryMode()) {
    return monitorsMemory;
  }
  return await Monitor.find({});
};

const getMonitorById = async (id) => {
  if (isMemoryMode()) {
    return monitorsMemory.find(m => m._id.toString() === id.toString()) || null;
  }
  return await Monitor.findById(id);
};

const createMonitor = async (data) => {
  if (isMemoryMode()) {
    const newMonitor = {
      _id: 'mem-' + Math.random().toString(36).substr(2, 9),
      name: data.name,
      url: data.url,
      interval: parseInt(data.interval) || 60,
      status: 'PENDING',
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    monitorsMemory.push(newMonitor);
    return newMonitor;
  }
  const monitor = new Monitor(data);
  return await monitor.save();
};

const updateMonitor = async (id, data) => {
  if (isMemoryMode()) {
    const index = monitorsMemory.findIndex(m => m._id.toString() === id.toString());
    if (index === -1) return null;
    
    monitorsMemory[index] = {
      ...monitorsMemory[index],
      ...data,
      interval: data.interval !== undefined ? parseInt(data.interval) : monitorsMemory[index].interval,
      updatedAt: new Date()
    };
    return monitorsMemory[index];
  }
  return await Monitor.findByIdAndUpdate(id, data, { new: true });
};

const deleteMonitor = async (id) => {
  if (isMemoryMode()) {
    const index = monitorsMemory.findIndex(m => m._id.toString() === id.toString());
    if (index === -1) return null;
    const deleted = monitorsMemory[index];
    monitorsMemory.splice(index, 1);
    // clean up related heartbeats
    heartbeatsMemory = heartbeatsMemory.filter(h => h.monitorId.toString() !== id.toString());
    return deleted;
  }
  const deleted = await Monitor.findByIdAndDelete(id);
  if (deleted) {
    await Heartbeat.deleteMany({ monitorId: id });
  }
  return deleted;
};

const addHeartbeat = async (data) => {
  if (isMemoryMode()) {
    const newHeartbeat = {
      _id: 'hb-' + Math.random().toString(36).substr(2, 9),
      monitorId: data.monitorId,
      status: data.status,
      latency: data.latency,
      code: data.code,
      timestamp: new Date()
    };
    heartbeatsMemory.push(newHeartbeat);
    
    // Memory cap to prevent memory leaks (keep max 1000 heartbeats per monitor)
    const monitorHBs = heartbeatsMemory.filter(h => h.monitorId === data.monitorId);
    if (monitorHBs.length > 1000) {
      const excess = monitorHBs.length - 1000;
      // remove oldest
      let removed = 0;
      heartbeatsMemory = heartbeatsMemory.filter(h => {
        if (h.monitorId === data.monitorId && removed < excess) {
          removed++;
          return false;
        }
        return true;
      });
    }

    // Also update monitor status
    const statusText = data.status === 1 ? 'UP' : 'DOWN';
    const index = monitorsMemory.findIndex(m => m._id.toString() === data.monitorId.toString());
    if (index !== -1) {
      monitorsMemory[index].status = statusText;
      monitorsMemory[index].updatedAt = new Date();
    }

    return newHeartbeat;
  }
  
  const statusText = data.status === 1 ? 'UP' : 'DOWN';
  await Monitor.findByIdAndUpdate(data.monitorId, { status: statusText });
  
  const heartbeat = new Heartbeat(data);
  return await heartbeat.save();
};

const getHeartbeats = async (monitorId, limit = 50) => {
  if (isMemoryMode()) {
    return heartbeatsMemory
      .filter(h => h.monitorId.toString() === monitorId.toString())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
  return await Heartbeat.find({ monitorId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

const getHeartbeatsLast24Hours = async (monitorId) => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (isMemoryMode()) {
    return heartbeatsMemory
      .filter(h => h.monitorId.toString() === monitorId.toString() && h.timestamp >= oneDayAgo)
      .sort((a, b) => a.timestamp - b.timestamp);
  }
  return await Heartbeat.find({
    monitorId,
    timestamp: { $gte: oneDayAgo }
  }).sort({ timestamp: 1 });
};

const seedDatabaseIfEmpty = async () => {
  if (isMemoryMode()) return;
  try {
    const count = await Monitor.countDocuments();
    if (count === 0) {
      console.log('🌱 Database is empty. Seeding default monitors...');
      const defaultMonitors = [
        {
          name: 'Google Health Check',
          url: 'https://www.google.com',
          interval: 30,
          status: 'PENDING',
          isActive: true
        },
        {
          name: 'GitHub API Portal',
          url: 'https://api.github.com',
          interval: 60,
          status: 'PENDING',
          isActive: true
        },
        {
          name: 'HTTP 200 Mock OK',
          url: 'https://httpstat.us/200',
          interval: 15,
          status: 'PENDING',
          isActive: true
        },
        {
          name: 'HTTP 503 Mock Outage',
          url: 'https://httpstat.us/503',
          interval: 20,
          status: 'PENDING',
          isActive: true
        }
      ];
      const seeded = await Monitor.insertMany(defaultMonitors);
      
      // Also generate some initial heartbeats for MongoDB to make the grid look beautiful from start
      const now = Date.now();
      const timeBlock = 60 * 1000;
      const heartbeatsToInsert = [];
      
      for (const monitor of seeded) {
        for (let i = 48; i >= 0; i--) {
          const timestamp = new Date(now - i * timeBlock * 20);
          const isOutage = monitor.name.includes('503') || (monitor.name.includes('GitHub') && i % 15 === 0);
          const status = isOutage ? 0 : 1;
          const code = isOutage ? (monitor.name.includes('503') ? 503 : 500) : 200;
          const latency = isOutage ? 0 : Math.floor(Math.random() * 150) + 50;
          
          heartbeatsToInsert.push({
            monitorId: monitor._id,
            status,
            latency,
            code,
            timestamp
          });
        }
      }
      await Heartbeat.insertMany(heartbeatsToInsert);
      console.log(`🌱 Default monitors and ${heartbeatsToInsert.length} historical heartbeats seeded successfully.`);
    }
  } catch (error) {
    console.error('❌ Seeding database failed:', error.message);
  }
};

module.exports = {
  getMonitors,
  getMonitorById,
  createMonitor,
  updateMonitor,
  deleteMonitor,
  addHeartbeat,
  getHeartbeats,
  getHeartbeatsLast24Hours,
  isMemoryMode,
  seedDatabaseIfEmpty
};
