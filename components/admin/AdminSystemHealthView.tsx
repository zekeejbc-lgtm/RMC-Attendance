import React, { useState, useEffect } from 'react';
import { Activity, Database, HardDrive, Cpu, ShieldCheck, Zap, Server, RefreshCw, CheckCircle2, AlertTriangle, FileText, Users, Calendar, QrCode } from 'lucide-react';
import { mockData } from '../../lib/mockBackend';
import { SystemHealthMetric } from '../../types';
import { MetricCard } from '../ui/Page';

export const AdminSystemHealthView: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemHealthMetric>(mockData.getSystemHealthMetrics());
  const [auditLogs, setAuditLogs] = useState(mockData.getAccountAuditLogs());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [logFilter, setLogFilter] = useState('');

  const refreshHealth = () => {
    setIsRefreshing(true);
    setMetrics(mockData.getSystemHealthMetrics());
    setAuditLogs(mockData.getAccountAuditLogs());
    setTimeout(() => setIsRefreshing(false), 300);
  };

  useEffect(() => {
    refreshHealth();
    const interval = setInterval(refreshHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const filteredLogs = auditLogs.filter(log =>
    log.action.toLowerCase().includes(logFilter.toLowerCase()) ||
    log.actor_name.toLowerCase().includes(logFilter.toLowerCase()) ||
    log.target_name.toLowerCase().includes(logFilter.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* HERO HEALTH STATUS BANNER */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl shrink-0">
              <Activity className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold uppercase tracking-tight">System Health & Performance Monitor</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white flex items-center gap-1">
                  <CheckCircle2 size={12} /> {metrics.healthScore}% Healthy
                </span>
              </div>
              <p className="text-slate-300 text-xs mt-1 max-w-2xl">
                Local browser data diagnostics and activity logs. Server, email delivery, and backup monitoring are not connected.
              </p>
            </div>
          </div>

          <button
            onClick={refreshHealth}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> Refresh Metrics
          </button>
        </div>
      </div>
      {/* CORE PERFORMANCE GAUGES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          icon={<Zap size={20} className="text-amber-500" />}
          label="Local Read Time"
          value={`${metrics.latencyMs} ms`}
          detail="Measured local storage read"
        />
        <MetricCard
          icon={<HardDrive size={20} className="text-cyan-500" />}
          label="Storage Utilization"
          value={`${metrics.storageUsagePercent}%`}
          detail={`${formatBytes(metrics.storageUsedBytes)} / ${formatBytes(metrics.storageMaxBytes)}`}
        />
        <MetricCard
          icon={<Users size={20} className="text-emerald-500" />}
          label="Active Sessions"
          value={metrics.activeSessions}
          detail="Concurrent online users"
        />
        <MetricCard
          icon={<Database size={20} className="text-purple-500" />}
          label="Database Status"
          value={metrics.dbStatus.toUpperCase()}
          detail="Indexed DB operational"
        />
      </div>
      {/* STORAGE & SUBSYSTEM MATRIX */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* STORAGE GAUGE & STATS */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <HardDrive size={18} className="text-cyan-500" /> Database & Storage Allocation
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-600 dark:text-slate-400">Local Browser Storage Quota</span>
              <span className="text-slate-900 dark:text-white">{metrics.storageUsagePercent}% Used</span>
            </div>
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  metrics.storageUsagePercent > 80 ? 'bg-red-500' : metrics.storageUsagePercent > 50 ? 'bg-amber-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${Math.max(5, metrics.storageUsagePercent)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {formatBytes(metrics.storageUsedBytes)} utilized out of {formatBytes(metrics.storageMaxBytes)} total capacity.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Total System Accounts:</span>
              <span className="font-bold text-slate-900 dark:text-white">{metrics.totalUsersCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Registered Students:</span>
              <span className="font-bold text-slate-900 dark:text-white">{metrics.studentsCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Scheduled Events:</span>
              <span className="font-bold text-slate-900 dark:text-white">{metrics.eventsCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Scans Recorded:</span>
              <span className="font-bold text-slate-900 dark:text-white">{metrics.attendanceLogsCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Excuse Applications:</span>
              <span className="font-bold text-slate-900 dark:text-white">{metrics.excuseAppsCount}</span>
            </div>
          </div>
        </div>

        {/* SUBSYSTEM HEALTH MATRIX */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Server size={18} className="text-emerald-500" /> Subsystem Operational Matrix
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { title: 'Authentication Gateway', status: metrics.authStatus, desc: 'OAuth & Session verification active' },
              { title: 'QR Code Generation Engine', status: 'operational', desc: 'Real-time AES QR renderer online' },
              { title: 'Geofence Location Service', status: metrics.geofenceStatus, desc: 'GPS radius calculation active' },
              { title: 'Database & Sync Proxy', status: metrics.dbStatus, desc: 'LocalStorage & mock sync proxy running' },
              { title: 'CSV & Report Exporter', status: 'operational', desc: 'Roster & ledger generator ready' },
              { title: 'Audit Trail Logger', status: 'operational', desc: 'Real-time activity logging active' },
            ].map(sub => (
              <div key={sub.title} className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{sub.title}</span>
                    <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                      ONLINE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{sub.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* AUDIT LOGS & DIAGNOSTIC STREAM */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <FileText size={18} className="text-purple-500" /> Security Audit & System Diagnostic Logs
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live immutable stream of system events, account changes, and administrative actions.
            </p>
          </div>

          <input
            type="text"
            value={logFilter}
            onChange={(e) => setLogFilter(e.target.value)}
            placeholder="Filter logs by actor, action..."
            className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
          />
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {filteredLogs.length > 0 ? (
            filteredLogs.map(log => (
              <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    log.action.includes('created') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                  }`}>
                    {log.action}
                  </span>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      Actor: <span className="text-purple-600 dark:text-purple-400">{log.actor_name}</span> &rarr; Target: <span className="text-brand-600 dark:text-brand-400">{log.target_name}</span> ({log.target_role})
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-xs text-slate-400">No diagnostic audit logs found.</div>
          )}
        </div>
      </div>
    </div>
  );
};