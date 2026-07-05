import React, { useState, useEffect } from 'react';
import { X, Check, Globe, HelpCircle } from 'lucide-react';

const AddMonitorModal = ({ isOpen, onClose, onSave, monitorToEdit }) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [interval, setIntervalVal] = useState(60);
  const [error, setError] = useState('');

  useEffect(() => {
    if (monitorToEdit) {
      setName(monitorToEdit.name);
      setUrl(monitorToEdit.url);
      setIntervalVal(monitorToEdit.interval);
    } else {
      setName('');
      setUrl('');
      setIntervalVal(60);
    }
    setError('');
  }, [monitorToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please provide a name for this monitor.');
      return;
    }
    if (!url.trim()) {
      setError('Please provide a URL to check.');
      return;
    }

    // Basic URL format validation
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        setError('URL protocol must be http:// or https://');
        return;
      }
    } catch (e) {
      setError('Please enter a valid absolute URL (e.g., https://example.com)');
      return;
    }

    const intervalNum = parseInt(interval);
    if (isNaN(intervalNum) || intervalNum < 5) {
      setError('Ping interval must be at least 5 seconds.');
      return;
    }

    onSave({
      name: name.trim(),
      url: url.trim(),
      interval: intervalNum
    });
  };

  const intervalPresets = [15, 30, 60, 300, 600];

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300">
      <div 
        className="glass-panel w-full max-w-lg rounded-3xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-dark-border/40">
          <h2 className="text-xl font-bold text-white tracking-wide">
            {monitorToEdit ? 'Configure Monitor' : 'Create New Monitor'}
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-dark-bg/60 border border-dark-border/40 text-dark-muted hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 mt-5">
          {error && (
            <div className="bg-brand-down/10 border border-brand-down/30 text-brand-down text-xs rounded-xl p-3.5 font-semibold">
              {error}
            </div>
          )}

          {/* Name Field */}
          <div>
            <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-2">
              Friendly Name
            </label>
            <input
              type="text"
              placeholder="e.g. My Website API Gateway"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full input-glass rounded-xl px-4 py-3 text-sm text-white placeholder-dark-muted/60"
            />
          </div>

          {/* URL Field */}
          <div>
            <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-2">
              Target URL
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted/60">
                <Globe size={16} />
              </span>
              <input
                type="text"
                placeholder="https://example.com/api/health"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full input-glass rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-dark-muted/60"
              />
            </div>
            <p className="text-[10px] text-dark-muted mt-1.5 font-medium">
              We send background HTTP GET requests to this absolute URL.
            </p>
          </div>

          {/* Interval Field */}
          <div>
            <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-2">
              Ping Interval (Seconds)
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                min="5"
                value={interval}
                onChange={(e) => setIntervalVal(e.target.value)}
                className="w-24 input-glass rounded-xl px-4 py-3 text-sm text-white text-center"
              />
              <div className="flex-1 flex gap-2">
                {intervalPresets.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setIntervalVal(val)}
                    className={`flex-grow text-xs font-bold py-2 px-1.5 rounded-xl border transition-all duration-150 ${
                      parseInt(interval) === val
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-dark-bg/60 border-dark-border/60 text-dark-muted hover:text-white hover:border-dark-border'
                    }`}
                  >
                    {val >= 60 ? `${val / 60}m` : `${val}s`}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-dark-muted mt-1.5 font-medium">
              Time between each health check. Smaller intervals reflect outages faster.
            </p>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-dark-border/40 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-dark-muted hover:text-white hover:bg-dark-cardHover/50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-95 transition-all"
            >
              <Check size={16} />
              <span>{monitorToEdit ? 'Save Changes' : 'Create Monitor'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMonitorModal;
