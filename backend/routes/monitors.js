const express = require('express');
const router = express.Router();
const storage = require('../services/storage');
const scheduler = require('../services/scheduler');

const { validateUrlForSSRF } = require('../utils/security');

// GET all monitors
router.get('/', async (req, res) => {
  try {
    const monitors = await storage.getMonitors();
    res.json(monitors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET monitor details by ID
router.get('/:id', async (req, res) => {
  try {
    const monitor = await storage.getMonitorById(req.params.id);
    if (!monitor) {
      return res.status(404).json({ error: 'Monitor not found' });
    }
    res.json(monitor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET last 24h history for a monitor
router.get('/:id/history', async (req, res) => {
  try {
    const history = await storage.getHeartbeatsLast24Hours(req.params.id);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new monitor
router.post('/', async (req, res) => {
  const { name, url, interval } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error: 'Name and URL are required fields' });
  }

  // Pre-validate URL for protocol and SSRF
  const isSafe = await validateUrlForSSRF(url);
  if (!isSafe) {
    return res.status(400).json({ 
      error: 'Blocked URL: Protocol must be http/https, and loopback/private IP destinations are prohibited.' 
    });
  }

  try {
    const monitor = await storage.createMonitor({
      name,
      url,
      interval: parseInt(interval) || 60,
      isActive: true
    });
    
    // Sync the background scheduler for this monitor
    scheduler.syncMonitor(monitor);
    
    res.status(201).json(monitor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update monitor
router.put('/:id', async (req, res) => {
  try {
    if (req.body.url) {
      const isSafe = await validateUrlForSSRF(req.body.url);
      if (!isSafe) {
        return res.status(400).json({ 
          error: 'Blocked URL: Protocol must be http/https, and loopback/private IP destinations are prohibited.' 
        });
      }
    }

    const updated = await storage.updateMonitor(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Monitor not found' });
    }
    
    // Sync the background scheduler
    scheduler.syncMonitor(updated);
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE monitor
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await storage.deleteMonitor(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Monitor not found' });
    }
    
    // Stop checks for this monitor
    scheduler.stopMonitor(req.params.id);
    
    res.json({ message: 'Monitor successfully deleted', deletedId: req.params.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
