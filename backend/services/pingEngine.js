const axios = require('axios');
const storage = require('./storage');
const { emitHeartbeat } = require('./socket');
const { validateUrlForSSRF } = require('../utils/security');

const pingMonitor = async (monitor) => {
  const url = monitor.url;
  const monitorId = monitor._id.toString();
  
  let status = 0; // 0 for DOWN, 1 for UP
  let code = null;
  let latency = 0;
  const startTime = Date.now();
  
  try {
    // Run SSRF verification filter
    const isSafe = await validateUrlForSSRF(url);
    
    if (!isSafe) {
      status = 0;
      code = 403; // Forbidden by Security Policy
      latency = 0;
    } else {
      // Perform standard HTTP GET check
      const response = await axios.get(url, {
        timeout: 10000, // 10 seconds timeout
        headers: {
          'User-Agent': 'DownPulse-Uptime-Monitor/1.0',
          'Accept': '*/*'
        },
        // Consider status codes 2xx and 3xx as successful/UP
        validateStatus: (s) => s >= 200 && s < 400
      });
      
      latency = Date.now() - startTime;
      status = 1;
      code = response.status;
    }
  } catch (error) {
    latency = Date.now() - startTime;
    status = 0;
    
    if (error.response) {
      code = error.response.status;
    } else if (error.code === 'ECONNABORTED') {
      code = 408; // Timeout
    } else {
      code = 500; // Network error or DNS resolution error
    }
  }

  try {
    // Record heartbeat event in Database/Memory (will also update Monitor's status)
    const heartbeat = await storage.addHeartbeat({
      monitorId,
      status,
      latency,
      code
    });
    
    // Broadcast updates to connected clients (live rooms & general dashboard)
    emitHeartbeat(monitorId, {
      status,
      latency,
      code,
      timestamp: heartbeat.timestamp
    });

    // Color logs: green for success (1), red for failure (0)
    const logSymbol = status === 1 ? '🟢' : '🔴';
    console.log(`${logSymbol} Ping [${monitor.name}] (${url}) -> status: ${status === 1 ? 'UP' : 'DOWN'}, latency: ${latency}ms, code: ${code}`);
  } catch (dbError) {
    console.error(`❌ Failed to save heartbeat for monitor [${monitor.name}]:`, dbError.message);
  }
};

module.exports = { pingMonitor };
