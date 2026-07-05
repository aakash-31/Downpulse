import React from 'react';
import { Activity, ShieldCheck, AlertTriangle, Shield, Globe } from 'lucide-react';

const MetricsGrid = ({ monitors, historyMap }) => {
  // 1. Calculate Active Outages and Total Monitors
  const totalMonitors = monitors.length;
  const activeOutages = monitors.filter(m => m.status === 'DOWN' && m.isActive).length;

  // 2. Calculate Uptime and Latency from last 24h history
  let totalHeartbeatsCount = 0;
  let successfulHeartbeatsCount = 0;
  let totalLatencySum = 0;
  let latencyHeartbeatsCount = 0;

  Object.keys(historyMap).forEach(monitorId => {
    const heartbeats = historyMap[monitorId] || [];
    
    // Check if the monitor is currently active before including in calculation
    const monitor = monitors.find(m => m._id === monitorId);
    if (!monitor || !monitor.isActive) return;

    heartbeats.forEach(hb => {
      totalHeartbeatsCount++;
      if (hb.status === 1) {
        successfulHeartbeatsCount++;
        // Include in latency average only if successful and latency > 0
        if (hb.latency > 0) {
          totalLatencySum += hb.latency;
          latencyHeartbeatsCount++;
        }
      }
    });
  });

  const globalUptime = totalHeartbeatsCount > 0 
    ? ((successfulHeartbeatsCount / totalHeartbeatsCount) * 100).toFixed(2)
    : '100.00';

  const averageLatency = latencyHeartbeatsCount > 0
    ? Math.round(totalLatencySum / latencyHeartbeatsCount)
    : 0;

  const metrics = [
    {
      title: 'Global Uptime (24h)',
      value: `${globalUptime}%`,
      description: 'Overall system reliability',
      icon: ShieldCheck,
      colorClass: 'text-brand-up',
      bgGlow: 'hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] border-brand-up/20',
      progress: parseFloat(globalUptime)
    },
    {
      title: 'Average Latency',
      value: `${averageLatency} ms`,
      description: 'Mean network response time',
      icon: Activity,
      colorClass: 'text-brand-latency',
      bgGlow: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] border-brand-latency/20',
      progress: null
    },
    {
      title: 'Active Outages',
      value: activeOutages,
      description: 'Nodes currently offline',
      icon: AlertTriangle,
      colorClass: activeOutages > 0 ? 'text-brand-down animate-pulse' : 'text-dark-muted',
      bgGlow: activeOutages > 0 ? 'hover:shadow-[0_0_20px_rgba(244,63,94,0.15)] border-brand-down/40 bg-brand-down/5' : 'border-dark-border/40',
      progress: null
    },
    {
      title: 'Monitored Targets',
      value: totalMonitors,
      description: 'Endpoints checks configured',
      icon: Globe,
      colorClass: 'text-white',
      bgGlow: 'hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] border-dark-border/40',
      progress: null
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, i) => {
        const Icon = metric.icon;
        return (
          <div
            key={i}
            className={`glass-panel p-5 rounded-2xl smooth-transition border flex flex-col justify-between h-36 ${metric.bgGlow}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-dark-muted uppercase tracking-wider">
                  {metric.title}
                </p>
                <p className="text-3xl font-extrabold tracking-tight mt-1 text-white">
                  {metric.value}
                </p>
              </div>
              <div className={`p-2.5 rounded-xl bg-dark-bg/60 border border-dark-border/60 ${metric.colorClass}`}>
                <Icon size={20} />
              </div>
            </div>
            
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-dark-muted font-medium">{metric.description}</span>
              {metric.progress !== null && (
                <div className="w-16 bg-dark-bg rounded-full h-1.5 overflow-hidden border border-dark-border/30">
                  <div 
                    className="bg-brand-up h-full rounded-full" 
                    style={{ width: `${Math.max(20, Math.min(100, metric.progress))}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MetricsGrid;
