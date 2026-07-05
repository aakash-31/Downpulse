import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { Plus, Search, Activity, ShieldAlert, Sparkles, Sliders, Mail, MessageSquare, AlertCircle } from 'lucide-react';
import Sidebar from './components/Sidebar';
import MetricsGrid from './components/MetricsGrid';
import MonitorRow from './components/MonitorRow';
import AddMonitorModal from './components/AddMonitorModal';

const API_BASE = import.meta.env.VITE_API_BASE || 
  (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [monitors, setMonitors] = useState([]);
  const [historyMap, setHistoryMap] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [monitorToEdit, setMonitorToEdit] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  
  // Alert settings mock state (saved in localStorage for persistence)
  const [alertChannels, setAlertChannels] = useState(() => {
    const saved = localStorage.getItem('downpulse_alerts');
    return saved ? JSON.parse(saved) : {
      emailEnabled: true,
      emailAddress: 'engineering@downpulse.io',
      slackEnabled: false,
      slackWebhook: '',
      discordEnabled: false,
      discordWebhook: ''
    };
  });

  const socketRef = useRef(null);

  // Fetch initial monitors and histories
  useEffect(() => {
    const initData = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/monitors`);
        if (!res.ok) throw new Error('Failed to fetch monitors');
        const data = await res.json();
        setMonitors(data);

        // Fetch history for each monitor
        const historyData = {};
        await Promise.all(
          data.map(async (m) => {
            try {
              const histRes = await fetch(`${API_BASE}/api/monitors/${m._id}/history`);
              if (histRes.ok) {
                historyData[m._id] = await histRes.json();
              }
            } catch (err) {
              console.error(`Error fetching history for ${m.name}:`, err);
            }
          })
        );
        setHistoryMap(historyData);
      } catch (err) {
        console.error(err);
        setErrorMsg('Could not connect to backend server. Make sure the backend server is running on http://localhost:5000.');
      }
    };

    initData();
  }, []);

  // WebSockets setup
  useEffect(() => {
    socketRef.current = io(API_BASE);

    socketRef.current.on('connect', () => {
      console.log('✅ WebSocket connected to backend');
      setErrorMsg(null); // clear connection error if re-connected
    });

    // Listen to general monitor update events (emitted after health checks)
    socketRef.current.on('monitor_update', (data) => {
      const { monitorId, status, latency, code, timestamp } = data;

      // 1. Update status in monitors list
      setMonitors((prevMonitors) =>
        prevMonitors.map((m) =>
          m._id === monitorId
            ? { ...m, status: status === 1 ? 'UP' : 'DOWN', updatedAt: timestamp }
            : m
        )
      );

      // 2. Append new heartbeat to history and filter older than 24h
      setHistoryMap((prevHistory) => {
        const currentHist = prevHistory[monitorId] || [];
        const updatedHist = [...currentHist, { monitorId, status, latency, code, timestamp }];
        
        // Filter out records older than 24 hours
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const freshHist = updatedHist.filter(h => new Date(h.timestamp).getTime() > oneDayAgo);
        
        return {
          ...prevHistory,
          [monitorId]: freshHist
        };
      });
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // Persist alert settings
  useEffect(() => {
    localStorage.setItem('downpulse_alerts', JSON.stringify(alertChannels));
  }, [alertChannels]);

  // Handle Save Monitor (Create or Update)
  const handleSaveMonitor = async (formData) => {
    try {
      let response;
      if (monitorToEdit) {
        // Update
        response = await fetch(`${API_BASE}/api/monitors/${monitorToEdit._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } else {
        // Create
        response = await fetch(`${API_BASE}/api/monitors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }

      if (!response.ok) throw new Error('API request failed');
      const savedMonitor = await response.json();

      if (monitorToEdit) {
        setMonitors(prev => prev.map(m => m._id === savedMonitor._id ? savedMonitor : m));
      } else {
        setMonitors(prev => [...prev, savedMonitor]);
        // initialize empty history for the new monitor
        setHistoryMap(prev => ({ ...prev, [savedMonitor._id]: [] }));
      }

      setIsModalOpen(false);
      setMonitorToEdit(null);
    } catch (err) {
      console.error(err);
      alert('Error saving monitor configuration');
    }
  };

  // Handle Toggle Active state (Play/Pause checks)
  const handleToggleActive = async (monitor) => {
    try {
      const response = await fetch(`${API_BASE}/api/monitors/${monitor._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !monitor.isActive })
      });
      if (!response.ok) throw new Error('API request failed');
      const updated = await response.json();
      setMonitors(prev => prev.map(m => m._id === updated._id ? updated : m));
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Delete Monitor
  const handleDeleteMonitor = async (id) => {
    if (!window.confirm('Are you sure you want to delete this monitor and all its historical heartbeats?')) return;

    try {
      const response = await fetch(`${API_BASE}/api/monitors/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('API request failed');
      
      setMonitors(prev => prev.filter(m => m._id !== id));
      setHistoryMap(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Count active outages for notifications / footer
  const outageCount = monitors.filter(m => m.status === 'DOWN' && m.isActive).length;

  // Search filtered monitors
  const filteredMonitors = monitors.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text flex">
      {/* Navigation Left Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} outageCount={outageCount} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 p-8 space-y-8 overflow-y-auto max-h-screen">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-dark-border/40 pb-5">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-blue-500 uppercase tracking-widest bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                MERN Stack
              </span>
              <span className="text-xs font-bold text-brand-up uppercase tracking-widest bg-brand-up/10 px-2.5 py-1 rounded-md border border-brand-up/20 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-up animate-pulse" />
                <span>Socket.io Live</span>
              </span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white mt-1">
              System Operations
            </h2>
          </div>
          <button
            onClick={() => {
              setMonitorToEdit(null);
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-brand-up hover:bg-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/25 active:scale-95 transition-all"
          >
            <Plus size={16} />
            <span>Add Monitor</span>
          </button>
        </header>

        {/* Global Connection Warning */}
        {errorMsg && (
          <div className="bg-brand-down/10 border border-brand-down/30 rounded-2xl p-4 flex items-start space-x-3 text-brand-down">
            <AlertCircle className="shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-bold">API Server Connection Issue</p>
              <p className="text-xs text-dark-muted mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* --- DASHBOARD TAB --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* KPI Cards Grid */}
            <MetricsGrid monitors={monitors} historyMap={historyMap} />

            {/* Overview Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Outages List (Left) */}
              <div className="lg:col-span-2 glass-panel p-6 rounded-3xl space-y-4">
                <div className="flex items-center justify-between border-b border-dark-border/40 pb-3">
                  <h3 className="text-lg font-bold text-white tracking-wide flex items-center space-x-2">
                    <ShieldAlert size={18} className="text-brand-down" />
                    <span>Current Outages & Warning Nodes</span>
                  </h3>
                  <span className="text-xs font-bold text-dark-muted">
                    Total: {outageCount}
                  </span>
                </div>

                {outageCount === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-brand-up/10 border border-brand-up/25 flex items-center justify-center mx-auto text-brand-up animate-bounce">
                      <Sparkles size={20} />
                    </div>
                    <p className="font-bold text-white text-sm">Perfect Health Status</p>
                    <p className="text-xs text-dark-muted">All active nodes are pinging successfully with zero latency warnings.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {monitors
                      .filter((m) => m.status === 'DOWN' && m.isActive)
                      .map((monitor) => (
                        <div key={monitor._id} className="p-4 rounded-xl bg-brand-down/5 border border-brand-down/20 flex items-center justify-between">
                          <div>
                            <p className="font-bold text-white text-sm">{monitor.name}</p>
                            <p className="text-xs text-dark-muted mt-0.5">{monitor.url}</p>
                          </div>
                          <span className="text-xs font-extrabold text-brand-down uppercase bg-brand-down/10 border border-brand-down/20 px-2.5 py-1 rounded-lg">
                            Critical Outage
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Status Page Banner Info (Right) */}
              <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between h-full space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-wide flex items-center space-x-2 pb-3 border-b border-dark-border/40">
                    <Sliders size={18} className="text-brand-latency" />
                    <span>Real-time Operations</span>
                  </h3>
                  <p className="text-xs text-dark-muted mt-4 leading-relaxed font-medium">
                    DownPulse runs health checks in background threads. Updates are pushed to clients through Socket.io WebSocket rooms.
                  </p>
                  <p className="text-xs text-dark-muted mt-2 leading-relaxed font-medium">
                    A 30-day index TTL is activated on the database, preventing log bloated records automatically.
                  </p>
                </div>
                
                <div className="p-4 rounded-xl bg-dark-bg/60 border border-dark-border/50 text-xs">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-dark-muted">DB Fallback:</span>
                    <span className="font-bold text-brand-up">Auto Enabled</span>
                  </div>
                  <div className="flex justify-between items-center py-1 mt-1 border-t border-dark-border/20">
                    <span className="text-dark-muted">Client Connection:</span>
                    <span className="font-bold text-brand-latency">WebSocket Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- MONITORS TAB --- */}
        {activeTab === 'monitors' && (
          <div className="space-y-6">
            {/* Search and filter bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:max-w-xs">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted">
                  <Search size={15} />
                </span>
                <input
                  type="text"
                  placeholder="Search targets by name or URL..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full input-glass rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-dark-muted/60"
                />
              </div>
              <p className="text-xs font-semibold text-dark-muted">
                Showing {filteredMonitors.length} of {monitors.length} targets
              </p>
            </div>

            {/* High-density monitors list */}
            {filteredMonitors.length === 0 ? (
              <div className="glass-panel p-16 rounded-3xl text-center space-y-3">
                <p className="font-bold text-white text-base">No monitors found</p>
                <p className="text-xs text-dark-muted">Create a new monitor target to start scheduling uptime checks.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMonitors.map((monitor) => (
                  <MonitorRow
                    key={monitor._id}
                    monitor={monitor}
                    heartbeats={historyMap[monitor._id] || []}
                    onEdit={(m) => {
                      setMonitorToEdit(m);
                      setIsModalOpen(true);
                    }}
                    onDelete={handleDeleteMonitor}
                    onToggleActive={handleToggleActive}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- ALERTS SETTINGS TAB --- */}
        {activeTab === 'alerts' && (
          <div className="glass-panel p-8 rounded-3xl max-w-2xl space-y-6">
            <h3 className="text-lg font-bold text-white tracking-wide border-b border-dark-border/40 pb-3 flex items-center space-x-2">
              <Sliders className="text-blue-500" size={18} />
              <span>Notification channels config</span>
            </h3>
            
            <p className="text-xs text-dark-muted leading-relaxed font-medium">
              Configure alert triggers when endpoints fail checks. Simulated notifications fire whenever an outages are registered.
            </p>

            <div className="space-y-5 pt-2">
              {/* Email Alerts */}
              <div className="p-5 rounded-2xl bg-dark-bg/40 border border-dark-border/50 flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-500">
                      <Mail size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">Email Integration</p>
                      <p className="text-[10px] text-dark-muted">Sends incident reports automatically</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={alertChannels.emailEnabled}
                    onChange={(e) => setAlertChannels(p => ({ ...p, emailEnabled: e.target.checked }))}
                    className="w-4 h-4 rounded border-dark-border text-blue-600 focus:ring-blue-500/40 focus:ring-2"
                  />
                </div>
                {alertChannels.emailEnabled && (
                  <input
                    type="email"
                    placeholder="engineering@downpulse.io"
                    value={alertChannels.emailAddress}
                    onChange={(e) => setAlertChannels(p => ({ ...p, emailAddress: e.target.value }))}
                    className="w-full input-glass rounded-xl px-4 py-2.5 text-xs text-white"
                  />
                )}
              </div>

              {/* Slack Alerts */}
              <div className="p-5 rounded-2xl bg-dark-bg/40 border border-dark-border/50 flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-brand-up/10 border border-brand-up/25 rounded-xl text-brand-up">
                      <MessageSquare size={16} />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">Slack Webhook Alerts</p>
                      <p className="text-[10px] text-dark-muted">Post live updates directly to channels</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={alertChannels.slackEnabled}
                    onChange={(e) => setAlertChannels(p => ({ ...p, slackEnabled: e.target.checked }))}
                    className="w-4 h-4 rounded border-dark-border text-blue-600 focus:ring-blue-500/40 focus:ring-2"
                  />
                </div>
                {alertChannels.slackEnabled && (
                  <input
                    type="text"
                    placeholder="https://hooks.slack.com/services/YOUR_WEBHOOK_URL"
                    value={alertChannels.slackWebhook}
                    onChange={(e) => setAlertChannels(p => ({ ...p, slackWebhook: e.target.value }))}
                    className="w-full input-glass rounded-xl px-4 py-2.5 text-xs text-white"
                  />
                )}
              </div>

              {/* Save Success Note */}
              <div className="pt-2 text-right">
                <span className="text-[10px] font-bold text-brand-up bg-brand-up/10 px-3 py-1 rounded-full border border-brand-up/20">
                  Settings Saved Automatically
                </span>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Create / Edit Dialog Modal */}
      <AddMonitorModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setMonitorToEdit(null);
        }}
        onSave={handleSaveMonitor}
        monitorToEdit={monitorToEdit}
      />
    </div>
  );
}

export default App;
