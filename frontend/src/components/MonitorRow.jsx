import React, { useState } from 'react';
import { Play, Pause, Edit2, Trash2, Globe, ArrowUpRight, Zap } from 'lucide-react';

const MonitorRow = ({ monitor, heartbeats, onEdit, onDelete, onToggleActive }) => {
  const [hoveredBlock, setHoveredBlock] = useState(null);

  // 1. Calculate stats for this monitor
  const totalHBs = heartbeats.length;
  const upHBs = heartbeats.filter(h => h.status === 1).length;
  const uptimePct = totalHBs > 0 ? ((upHBs / totalHBs) * 100).toFixed(2) : '100.00';
  
  // Get current latency (default to last heartbeat's latency if UP)
  const lastHeartbeat = heartbeats[heartbeats.length - 1];
  const currentLatency = monitor.status === 'UP' && lastHeartbeat && lastHeartbeat.latency > 0
    ? `${lastHeartbeat.latency} ms`
    : '---';

  // 2. Generate 48 blocks representing 24 hours (30 min per block)
  const numBlocks = 48;
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const blockSizeMs = (24 * 60 * 60 * 1000) / numBlocks;

  const blocks = Array.from({ length: numBlocks }).map((_, index) => {
    const blockStart = oneDayAgo + index * blockSizeMs;
    const blockEnd = blockStart + blockSizeMs;

    // Filter heartbeats in this block's timeframe
    const hbsInBlock = heartbeats.filter(
      h => {
        const t = new Date(h.timestamp).getTime();
        return t >= blockStart && t < blockEnd;
      }
    );

    let status = 'NO_DATA'; // default
    let avgLatency = 0;
    if (hbsInBlock.length > 0) {
      const hasDown = hbsInBlock.some(h => h.status === 0);
      status = hasDown ? 'DOWN' : 'UP';
      
      const upPings = hbsInBlock.filter(h => h.status === 1);
      if (upPings.length > 0) {
        avgLatency = Math.round(upPings.reduce((sum, h) => sum + h.latency, 0) / upPings.length);
      }
    }

    return {
      index,
      startTime: new Date(blockStart),
      endTime: new Date(blockEnd),
      status,
      count: hbsInBlock.length,
      avgLatency
    };
  });

  return (
    <div className="glass-panel p-6 rounded-2xl border border-dark-border/40 hover:border-dark-border/80 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6 relative group">
      
      {/* Monitor Metadata */}
      <div className="flex-1 min-w-[200px]">
        <div className="flex items-center space-x-3">
          {/* Active status pulse glow indicator */}
          <div className="relative flex">
            {monitor.isActive ? (
              monitor.status === 'UP' ? (
                <>
                  <span className="absolute inline-flex h-2.5 w-2.5 rounded-full bg-brand-up opacity-75 animate-ping"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-up shadow-sm"></span>
                </>
              ) : monitor.status === 'DOWN' ? (
                <>
                  <span className="absolute inline-flex h-2.5 w-2.5 rounded-full bg-brand-down opacity-75 animate-ping"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-down shadow-sm"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-pending shadow-sm animate-pulse"></span>
              )
            ) : (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-dark-muted shadow-sm"></span>
            )}
          </div>
          
          <h3 className="text-lg font-bold text-white tracking-wide truncate">
            {monitor.name}
          </h3>
          
          {/* Status Badge */}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide border uppercase ${
            !monitor.isActive
              ? 'bg-dark-border/30 text-dark-muted border-dark-border/50'
              : monitor.status === 'UP'
              ? 'bg-brand-up/10 text-brand-up border-brand-up/30'
              : monitor.status === 'DOWN'
              ? 'bg-brand-down/10 text-brand-down border-brand-down/30'
              : 'bg-brand-pending/10 text-brand-pending border-brand-pending/30'
          }`}>
            {!monitor.isActive ? 'PAUSED' : monitor.status}
          </span>
        </div>
        
        {/* URL link */}
        <a 
          href={monitor.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-dark-muted hover:text-brand-latency flex items-center space-x-1 mt-1 font-medium transition-colors"
        >
          <Globe size={12} />
          <span className="truncate max-w-[250px]">{monitor.url}</span>
          <ArrowUpRight size={10} className="opacity-50" />
        </a>
      </div>

      {/* Latency & Uptime summary */}
      <div className="flex items-center space-x-8 md:px-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-dark-muted block tracking-wider">Latency</span>
          <span className="text-base font-extrabold text-white flex items-center space-x-1">
            <Zap size={14} className="text-brand-latency inline-block mr-0.5" />
            {currentLatency}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-dark-muted block tracking-wider">Uptime (24h)</span>
          <span className={`text-base font-extrabold ${parseFloat(uptimePct) > 99 ? 'text-brand-up' : 'text-brand-pending'}`}>
            {uptimePct}%
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-dark-muted block tracking-wider">Interval</span>
          <span className="text-sm font-semibold text-white">
            {monitor.interval}s
          </span>
        </div>
      </div>

      {/* 24-hour block timeline */}
      <div className="flex-grow max-w-full md:max-w-[340px] xl:max-w-[400px]">
        <div className="flex items-center justify-between text-[10px] text-dark-muted font-bold mb-1.5 px-0.5">
          <span>24 hours ago</span>
          <span>Now</span>
        </div>
        <div className="flex gap-[3px] justify-between relative">
          {blocks.map((block) => (
            <div
              key={block.index}
              onMouseEnter={() => setHoveredBlock(block)}
              onMouseLeave={() => setHoveredBlock(null)}
              className={`h-5 flex-grow rounded-sm cursor-pointer transition-all duration-150 ${
                !monitor.isActive
                  ? 'bg-dark-border/20 border border-dark-border/10'
                  : block.status === 'UP'
                  ? 'bg-brand-up hover:bg-brand-up/80'
                  : block.status === 'DOWN'
                  ? 'bg-brand-down hover:bg-brand-down/80 animate-pulse'
                  : 'bg-dark-border/40 hover:bg-dark-border/60'
              }`}
            />
          ))}

          {/* Block Tooltip */}
          {hoveredBlock && (
            <div className="absolute bottom-7 left-1/2 -translate-x-1/2 bg-dark-card border border-dark-border text-white text-xs px-3 py-2 rounded-lg shadow-xl z-20 w-48 text-center pointer-events-none">
              <p className="font-bold text-dark-muted">
                {hoveredBlock.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {hoveredBlock.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <div className="mt-1 flex items-center justify-center space-x-1">
                <span className={`w-2 h-2 rounded-full ${
                  hoveredBlock.status === 'UP' ? 'bg-brand-up' : hoveredBlock.status === 'DOWN' ? 'bg-brand-down' : 'bg-dark-muted'
                }`} />
                <span className="font-semibold">
                  {hoveredBlock.status === 'UP' 
                    ? `UP (${hoveredBlock.avgLatency}ms)` 
                    : hoveredBlock.status === 'DOWN' 
                    ? 'OUTAGE' 
                    : 'No Checks'}
                </span>
              </div>
              <p className="text-[10px] text-dark-muted mt-0.5">
                {hoveredBlock.count} pings in this window
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Row Control Actions */}
      <div className="flex items-center space-x-2 border-t md:border-t-0 border-dark-border/40 pt-4 md:pt-0 justify-end">
        <button
          onClick={() => onToggleActive(monitor)}
          title={monitor.isActive ? 'Pause Monitor' : 'Resume Monitor'}
          className={`p-2.5 rounded-xl border transition-all duration-200 ${
            monitor.isActive
              ? 'bg-dark-bg/60 border-dark-border/60 text-brand-pending hover:bg-brand-pending/10 hover:border-brand-pending/30'
              : 'bg-brand-up/5 border-brand-up/20 text-brand-up hover:bg-brand-up/10 hover:border-brand-up/30'
          }`}
        >
          {monitor.isActive ? <Pause size={15} /> : <Play size={15} />}
        </button>

        <button
          onClick={() => onEdit(monitor)}
          title="Edit Config"
          className="p-2.5 rounded-xl bg-dark-bg/60 border border-dark-border/60 text-dark-muted hover:text-white hover:bg-dark-cardHover/50 hover:border-dark-border transition-all duration-200"
        >
          <Edit2 size={15} />
        </button>

        <button
          onClick={() => onDelete(monitor._id)}
          title="Delete Monitor"
          className="p-2.5 rounded-xl bg-dark-bg/60 border border-dark-border/60 text-brand-down/80 hover:text-white hover:bg-brand-down/20 hover:border-brand-down/40 transition-all duration-200"
        >
          <Trash2 size={15} />
        </button>
      </div>
      
    </div>
  );
};

export default MonitorRow;
