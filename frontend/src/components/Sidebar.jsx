import React from 'react';
import { LayoutDashboard, Activity, Bell, ShieldAlert, Cpu } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, outageCount }) => {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'monitors', name: 'Monitors', icon: Activity },
    { id: 'alerts', name: 'Alert Settings', icon: Bell }
  ];

  return (
    <aside className="w-64 glass-panel border-r border-dark-border h-screen sticky top-0 flex flex-col justify-between p-6 z-10">
      <div className="space-y-8">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-up to-brand-latency flex items-center justify-center glow-up shadow-md">
            <Cpu size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white font-sans flex items-center">
              Down<span className="text-brand-up">Pulse</span>
            </h1>
            <span className="text-xs text-dark-muted font-medium">Uptime Monitor</span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/10 text-white border-l-2 border-brand-latency'
                    : 'text-dark-muted hover:text-white hover:bg-dark-cardHover/50'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-brand-latency' : ''} />
                <span>{item.name}</span>
                {item.id === 'monitors' && outageCount > 0 && (
                  <span className="ml-auto bg-brand-down/20 text-brand-down text-xs font-semibold px-2 py-0.5 rounded-full border border-brand-down/30 animate-pulse">
                    {outageCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer System Status */}
      <div className="pt-6 border-t border-dark-border/40">
        <div className="flex items-center space-x-3 p-3 rounded-xl bg-dark-card/40 border border-dark-border/30">
          <div className="relative flex">
            {outageCount === 0 ? (
              <>
                <span className="absolute inline-flex h-3.5 w-3.5 rounded-full bg-brand-up opacity-75 animate-ping"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-brand-up shadow-sm"></span>
              </>
            ) : (
              <>
                <span className="absolute inline-flex h-3.5 w-3.5 rounded-full bg-brand-down opacity-75 animate-ping"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-brand-down shadow-sm"></span>
              </>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-white">
              {outageCount === 0 ? 'All Systems Go' : `${outageCount} Outage${outageCount > 1 ? 's' : ''} Active`}
            </p>
            <p className="text-[10px] text-dark-muted font-medium">
              {outageCount === 0 ? 'Everything operational' : 'Investigating degraded nodes'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
