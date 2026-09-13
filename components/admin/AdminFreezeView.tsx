import React, { useState, useEffect } from 'react';
import { Snowflake, Lock, Unlock, AlertTriangle, CheckCircle2, ShieldAlert, Building2, Search, RefreshCw } from 'lucide-react';
import { mockData } from '../../lib/mockBackend';
import { SchoolNode, SystemFreezeState, NodeFreezeState } from '../../types';
import SearchInput from '../ui/SearchInput';
import { flattenDirectory } from '../../lib/academicDirectory';
import { Modal } from '../ui/Modal';

export const AdminFreezeView: React.FC<{ actorName?: string }> = ({ actorName }) => {
  const [systemFreeze, setSystemFreeze] = useState<SystemFreezeState>(mockData.getSystemFreezeStatus());
  const [frozenNodes, setFrozenNodes] = useState<Record<string, NodeFreezeState>>(mockData.getFrozenNodes());
  const [structure, setStructure] = useState<SchoolNode[]>(mockData.getSchoolStructure());
  
  const [globalReason, setGlobalReason] = useState('School Account Unpaid - Annual License Renewal Required');
  const [showGlobalModal, setShowGlobalModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedNode, setSelectedNode] = useState<SchoolNode | null>(null);
  const [nodeReason, setNodeReason] = useState('Department temporarily suspended by administration');

  const refreshData = () => {
    setSystemFreeze(mockData.getSystemFreezeStatus());
    setFrozenNodes(mockData.getFrozenNodes());
    setStructure(mockData.getSchoolStructure());
  };

  useEffect(() => {
    refreshData();
    window.addEventListener('rmc_auth_update', refreshData);
    return () => window.removeEventListener('rmc_auth_update', refreshData);
  }, []);

  const handleToggleSystemFreeze = () => {
    const nextState = !systemFreeze.isFrozen;
    mockData.setSystemFreezeStatus(nextState, nextState ? globalReason : '', actorName || 'System Admin');
    refreshData();
    setShowGlobalModal(false);
  };

  const handleToggleNodeFreeze = (node: SchoolNode) => {
    const currentlyFrozen = Boolean(frozenNodes[node.id]?.isFrozen);
    mockData.setNodeFreezeStatus(node.id, !currentlyFrozen, !currentlyFrozen ? nodeReason : '', actorName || 'System Admin');
    setSelectedNode(null);
    refreshData();
  };

  const flattenedNodes = flattenDirectory(structure);
  const filteredNodes = flattenedNodes.filter(node => 
    node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (node.code && node.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* HEADER HERO */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl shrink-0 ${systemFreeze.isFrozen ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
              <Snowflake className={`w-8 h-8 ${systemFreeze.isFrozen ? 'animate-spin-slow' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold uppercase tracking-tight">System & Scope Freeze Control</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${systemFreeze.isFrozen ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
                  {systemFreeze.isFrozen ? 'SYSTEM FROZEN' : 'SYSTEM ACTIVE'}
                </span>
              </div>
              <p className="text-slate-300 text-xs mt-1 max-w-2xl">
                Freeze access across the entire school system when payment is uncollected or lock down specific departments and classes.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowGlobalModal(true)}
            className={`px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all ${
              systemFreeze.isFrozen
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {systemFreeze.isFrozen ? <Unlock size={16} /> : <Lock size={16} />}
            {systemFreeze.isFrozen ? 'Unfreeze Master System' : 'Freeze Master System (Unpaid Account)'}
          </button>
        </div>
      </div>

      {/* GLOBAL FREEZE DETAILS SUMMARY */}
      {systemFreeze.isFrozen && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 rounded-2xl border-2 border-red-500/40 text-red-900 dark:text-red-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-black uppercase tracking-wider">Global System Freeze Active</h4>
            <p className="text-xs font-semibold mt-1">Reason: <span className="underline">{systemFreeze.reason}</span></p>
            <p className="text-[10px] opacity-75 mt-0.5">
              Frozen by {systemFreeze.frozenBy} on {systemFreeze.frozenAt ? new Date(systemFreeze.frozenAt).toLocaleString() : 'N/A'}. Non-admin users are locked out.
            </p>
          </div>
        </div>
      )}
      {/* TARGETED DEPARTMENT & CLASS FREEZE LIST */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Building2 size={18} className="text-cyan-500" /> Department & Class Unit Scope Freeze
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Freeze specific departments, colleges, or classroom sections independently.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              ariaLabel="Search department or section"
              placeholder="Search department or section..."
            />
            <button
              onClick={refreshData}
              className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl border border-slate-200 dark:border-slate-700"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* LIST OF UNITS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
          {filteredNodes.map(node => {
            const isDirectlyFrozen = Boolean(frozenNodes[node.id]?.isFrozen);
            const isInheritedFrozen = !isDirectlyFrozen && mockData.isNodeOrParentFrozen(node.id);
            const freezeDetail = frozenNodes[node.id];

            return (
              <div
                key={node.id}
                className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  isDirectlyFrozen
                    ? 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800/60'
                    : isInheritedFrozen
                    ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/40'
                    : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{node.name}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                      {node.type.replace('_', ' ')}
                    </span>
                  </div>

                  {isDirectlyFrozen && (
                    <p className="text-[11px] text-red-600 dark:text-red-300 font-semibold mt-1">
                      Directly Frozen: {freezeDetail?.reason || 'Locked by Admin'}
                    </p>
                  )}

                  {!isDirectlyFrozen && isInheritedFrozen && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-300 font-semibold mt-1">
                      Frozen via parent hierarchy
                    </p>
                  )}
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (isDirectlyFrozen) {
                        mockData.setNodeFreezeStatus(node.id, false, '', actorName || 'System Admin');
                        refreshData();
                      } else {
                        setSelectedNode(node);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition ${
                      isDirectlyFrozen
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-red-600/10 text-red-600 hover:bg-red-600 hover:text-white dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    {isDirectlyFrozen ? (
                      <><Unlock size={14} /> Unfreeze</>
                    ) : (
                      <><Lock size={14} /> Freeze</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* GLOBAL FREEZE MODAL */}
      <Modal
        open={showGlobalModal}
        onClose={() => setShowGlobalModal(false)}
        title={systemFreeze.isFrozen ? 'Unfreeze Master System' : 'Freeze Master System'}
        description={
          systemFreeze.isFrozen
            ? 'Unfreezing will restore full access to all students, mayors, and staff across all departments.'
            : 'Freezing will prevent non-admin users from scanning attendance, submitting applications, or accessing features until unfrozen.'
        }
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              onClick={() => setShowGlobalModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 uppercase"
            >
              Cancel
            </button>
            <button
              onClick={handleToggleSystemFreeze}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase text-white shadow-md ${
                systemFreeze.isFrozen ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {systemFreeze.isFrozen ? 'Confirm Unfreeze' : 'Confirm Freeze System'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {!systemFreeze.isFrozen && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Reason for System Freeze</label>
              <select
                value={globalReason}
                onChange={(e) => setGlobalReason(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
              >
                <option value="School Account Unpaid - Annual License Renewal Required">School Account Unpaid - Annual License Renewal Required</option>
                <option value="System Under Emergency Administrative Maintenance">System Under Emergency Administrative Maintenance</option>
                <option value="End of Academic Year System Freeze">End of Academic Year System Freeze</option>
                <option value="Custom Reason">Custom Reason...</option>
              </select>

              <textarea
                value={globalReason}
                onChange={(e) => setGlobalReason(e.target.value)}
                placeholder="Enter detailed reason..."
                rows={2}
                className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          )}
        </div>
      </Modal>

      {/* NODE FREEZE MODAL */}
      <Modal
        open={Boolean(selectedNode)}
        onClose={() => setSelectedNode(null)}
        title="Freeze Scope Unit"
        description={selectedNode ? `${selectedNode.name} (${selectedNode.type})` : undefined}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              onClick={() => setSelectedNode(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 uppercase"
            >
              Cancel
            </button>
            <button
              onClick={() => selectedNode && handleToggleNodeFreeze(selectedNode)}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase bg-red-600 hover:bg-red-700 text-white shadow-md"
            >
              Confirm Unit Freeze
            </button>
          </div>
        }
      >
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Reason for Unit Freeze</label>
          <textarea
            value={nodeReason}
            onChange={(e) => setNodeReason(e.target.value)}
            placeholder="Specify why this department or section is frozen..."
            rows={3}
            className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
        </div>
      </Modal>
    </div>
  );
};