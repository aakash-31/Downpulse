const storage = require('./storage');
const { pingMonitor } = require('./pingEngine');

// Store active timer handles mapped by monitor ID
const activeTimers = {};

/**
 * Initializes the ping scheduler by loading all active monitors from storage and starting their intervals.
 */
const startScheduler = async () => {
  try {
    const monitors = await storage.getMonitors();
    console.log(`⏰ Starting Ping Scheduler. Found ${monitors.length} monitor configurations.`);
    
    monitors.forEach(monitor => {
      if (monitor.isActive) {
        syncMonitor(monitor);
      }
    });
  } catch (error) {
    console.error('❌ Ping Scheduler Initialization Failed:', error.message);
  }
};

/**
 * Dynamically starts, stops, or adjusts the interval check for a given monitor configuration.
 * Call this when a monitor is created or updated.
 */
const syncMonitor = (monitor) => {
  const monitorId = monitor._id.toString();
  
  // Stop existing timer if it exists
  if (activeTimers[monitorId]) {
    clearInterval(activeTimers[monitorId]);
    delete activeTimers[monitorId];
  }
  
  if (!monitor.isActive) {
    console.log(`⏸️ Scheduler: Paused ping checks for [${monitor.name}]`);
    return;
  }
  
  // Standardize ping interval in milliseconds (default to 60s if invalid)
  const intervalSecs = parseInt(monitor.interval) || 60;
  const intervalMs = intervalSecs * 1000;
  
  // Fire an immediate health check so the dashboard gets immediate results
  pingMonitor(monitor);
  
  // Register the background interval
  activeTimers[monitorId] = setInterval(() => {
    // Re-fetch monitor details dynamically in case of updates (like URL/name changes)
    storage.getMonitorById(monitorId)
      .then(currentMonitor => {
        if (currentMonitor && currentMonitor.isActive) {
          pingMonitor(currentMonitor);
        } else {
          // Monitor was set to inactive or deleted, clear the timer
          stopMonitor(monitorId);
        }
      })
      .catch(err => {
        console.error(`❌ Scheduler query error for ${monitor.name}:`, err.message);
      });
  }, intervalMs);
  
  console.log(`▶️ Scheduler: Running ping for [${monitor.name}] every ${intervalSecs}s`);
};

/**
 * Stops checks for a specific monitor. Call this when a monitor is deleted.
 */
const stopMonitor = (monitorId) => {
  const idStr = monitorId.toString();
  if (activeTimers[idStr]) {
    clearInterval(activeTimers[idStr]);
    delete activeTimers[idStr];
    console.log(`⏸️ Scheduler: Cancelled timer for monitor ID [${idStr}]`);
  }
};

module.exports = {
  startScheduler,
  syncMonitor,
  stopMonitor
};
