import React, { useState, useMemo } from 'react';
import { useAuth } from '../components/AuthContext';
import { AppEvent } from '../types';
import { mockData } from '../lib/mockBackend';
import { 
  Calendar, Search, Filter, MapPin, Clock, AlertTriangle, 
  ChevronDown, ChevronUp, FileUp, CheckCircle2, X, ArrowRight,
  Shield, Send, Sparkles, AlertCircle, FileText
} from 'lucide-react';

// Mock initial extra events so student has rich data
const MOCK_EVENTS: AppEvent[] = [
  {
    id: 'e_active_1',
    title: 'University Midyear Leadership Convocation',
    description: 'Mandatory assembly for all student council members, section mayors, and departmental officers. Discussions cover campus initiatives and budget allocations.',
    status: 'active',
    created_by: 'SSG President',
    startTime: Date.now() - 1800000, // started 30 mins ago
    endTime: Date.now() + 5400000, // ends in 1.5 hrs
    penaltyValue: 8,
    penaltyUnit: 'hours',
    participantsType: 'all',
    target: { all: true },
    location: { lat: 7.0736, lng: 125.6126, radius_meters: 300 },
    timestamp: Date.now()
  },
  {
    id: 'e_sched_1',
    title: 'RMC Campus Sports & Cultural Festival 2026',
    description: 'Annual inter-departmental athletic games and cultural competitions. All students are required to log attendance during opening and closing ceremonies.',
    status: 'scheduled',
    created_by: 'Sports Development Committee',
    startTime: Date.now() + 86400000 * 2, // 2 days later
    endTime: Date.now() + 86400000 * 2 + 14400000,
    penaltyValue: 12,
    penaltyUnit: 'hours',
    participantsType: 'department',
    target: { department: 'Senior High School' },
    location: { lat: 7.0740, lng: 125.6130, radius_meters: 500 },
    timestamp: Date.now()
  },
  {
    id: 'e_sched_2',
    title: 'Career & College Program Orientation',
    description: 'Orientation session for Grade 12 Senior High School students regarding tertiary education offerings and scholarship tracks.',
    status: 'scheduled',
    created_by: 'Guidance Office',
    startTime: Date.now() + 86400000 * 5, // 5 days later
    endTime: Date.now() + 86400000 * 5 + 7200000,
    penaltyValue: 5,
    penaltyUnit: 'hours',
    participantsType: 'department',
    target: { department: 'Senior High School' },
    location: { lat: 7.0725, lng: 125.6120, radius_meters: 250 },
    timestamp: Date.now()
  },
  {
    id: 'e_archived_1',
    title: 'First Semester General Assembly 2025',
    description: 'Institutional opening assembly for all enrolled students at Rizal Memorial Colleges.',
    status: 'ended',
    created_by: 'SSG Executive Board',
    startTime: Date.now() - 86400000 * 30,
    endTime: Date.now() - 86400000 * 30 + 10800000,
    penaltyValue: 10,
    penaltyUnit: 'hours',
    participantsType: 'all',
    target: { all: true },
    location: { lat: 7.0736, lng: 125.6126, radius_meters: 400 },
    timestamp: Date.now() - 86400000 * 30
  },
  {
    id: 'e_archived_2',
    title: 'Disaster Risk & Safety Drill',
    description: 'Campus-wide emergency evacuation drill supervised by the Safety and Logistics Unit.',
    status: 'cancelled',
    created_by: 'Campus Safety Office',
    startTime: Date.now() - 86400000 * 14,
    endTime: Date.now() - 86400000 * 14 + 3600000,
    penaltyValue: 4,
    penaltyUnit: 'hours',
    participantsType: 'all',
    target: { all: true },
    location: { lat: 7.0736, lng: 125.6126, radius_meters: 300 },
    timestamp: Date.now() - 86400000 * 14
  }
];

const StudentEvents: React.FC = () => {
  const { profile } = useAuth();
  
  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'scheduled' | 'ended' | 'cancelled'>('all');
  
  // Section Collapsible Toggles (Default: Scheduled & Archived Collapsed)
  const [isScheduledOpen, setIsScheduledOpen] = useState(false);
  const [isArchivedOpen, setIsArchivedOpen] = useState(false);

  // Modal States
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  const [showExcuseModal, setShowExcuseModal] = useState(false);

  // Excuse Form State
  const [excuseReason, setExcuseReason] = useState('Medical / Health Condition');
  const [excuseDetails, setExcuseDetails] = useState('');
  const [excuseContact, setExcuseContact] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewName, setFilePreviewName] = useState<string>('');
  const [submittedExcuse, setSubmittedExcuse] = useState(false);

  // Combine backend mock events + additional student events
  const allEvents = useMemo(() => {
    const backendEvs = mockData.getEvents();
    const map = new Map<string, AppEvent>();
    MOCK_EVENTS.forEach(e => map.set(e.id, e));
    backendEvs.forEach(e => map.set(e.id, e));
    return Array.from(map.values());
  }, []);

  // Filtered lists
  const filteredEvents = useMemo(() => {
    return allEvents.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            event.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' ? true : event.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allEvents, searchTerm, statusFilter]);

  // Group events into categories
  const activeEvents = useMemo(() => filteredEvents.filter(e => e.status === 'active'), [filteredEvents]);
  const scheduledEvents = useMemo(() => filteredEvents.filter(e => e.status === 'scheduled'), [filteredEvents]);
  const archivedEvents = useMemo(() => filteredEvents.filter(e => e.status === 'ended' || e.status === 'cancelled'), [filteredEvents]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFilePreviewName(file.name);
    }
  };

  const handleExcuseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!excuseDetails) return;
    setSubmittedExcuse(true);
    setTimeout(() => {
      setSubmittedExcuse(false);
      setShowExcuseModal(false);
      setExcuseDetails('');
      setSelectedFile(null);
      setFilePreviewName('');
    }, 2000);
  };

  return (
    <div className="p-4 sm:p-5 max-w-6xl mx-auto space-y-4 animate-in fade-in duration-200">
      
      {/* HEADER & FILTERS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-gold-600 dark:text-gold-400 font-bold text-[10px] uppercase tracking-wider mb-0.5">
            <Calendar size={14} /> Campus Calendar
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-900 dark:text-slate-100 uppercase tracking-tight">Institutional Events</h1>
          <p className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">Review active mandatory assemblies, scheduled activities, and archived events.</p>
        </div>

        {/* SEARCH & FILTER BAR */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search event name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-9 pr-3 py-1.5 shadow-xs"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="text-slate-400 shrink-0" size={14} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="input-field select-field py-1.5 shadow-xs cursor-pointer text-xs"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="scheduled">Scheduled Only</option>
              <option value="ended">Ended Only</option>
              <option value="cancelled">Cancelled Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* 1. ACTIVE / ONGOING EVENTS (ALWAYS ON TOP) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 -ml-4.5"></span>
            <h2 className="text-xs font-bold text-brand-900 dark:text-slate-100 uppercase tracking-wider">Active & Ongoing ({activeEvents.length})</h2>
          </div>
          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full uppercase">Check-In Open</span>
        </div>

        {activeEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeEvents.map(event => (
              <div 
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="group p-4 bg-gradient-to-br from-brand-900 to-brand-950 text-white rounded-2xl border border-gold-400/40 shadow-md cursor-pointer hover:border-gold-400 transition-all relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 bg-gold-gradient text-brand-900 font-extrabold text-[8px] uppercase px-3 py-1 rounded-bl-xl shadow-xs tracking-wider">
                  Live Event
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gold-400/20 border border-gold-400/40 flex items-center justify-center text-gold-300 shrink-0">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-tight text-white group-hover:text-gold-300 transition-colors pr-12">
                      {event.title}
                    </h3>
                    <p className="text-slate-300 text-[11px] font-medium line-clamp-2 mt-0.5">
                      {event.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-gold-300 font-bold">
                    <Clock size={12} />
                    <span>Ends: {new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-red-300 font-bold">
                    <AlertTriangle size={12} />
                    <span>Penalty: {event.penaltyValue} {event.penaltyUnit}</span>
                  </div>

                  <span className="text-[9px] font-bold text-gold-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    View Details & Map <ArrowRight size={10} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 text-center text-slate-400 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            No active events in session right now.
          </div>
        )}
      </div>

      {/* 2. SCHEDULED EVENTS (COLLAPSED BY DEFAULT WITH ANIMATION) */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm transition-all">
        <button
          onClick={() => setIsScheduledOpen(!isScheduledOpen)}
          className="w-full p-5 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100/80 dark:hover:bg-slate-900 flex items-center justify-between text-left transition-colors border-b border-slate-200 dark:border-slate-700"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-900/40 text-brand-900 dark:text-brand-300 flex items-center justify-center font-bold">
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-brand-900 dark:text-slate-100 uppercase tracking-widest">Scheduled Upcoming Events ({scheduledEvents.length})</h2>
              <p className="text-slate-400 dark:text-slate-400 text-[10px] font-medium">Click to expand or collapse future assemblies</p>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-brand-900 dark:text-slate-100">
            {isScheduledOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </button>

        {isScheduledOpen && (
          <div className="p-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
            {scheduledEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scheduledEvents.map(event => (
                  <div 
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className="p-5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-gold-400 dark:hover:border-gold-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-800 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/40 px-2.5 py-0.5 rounded-md">
                          Scheduled
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400">
                          {new Date(event.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <h3 className="text-sm font-black text-brand-900 dark:text-slate-100 uppercase tracking-tight">{event.title}</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2 mt-1">{event.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><Clock size={12} /> {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-brand-900 dark:text-slate-100 font-bold hover:text-gold-600 dark:hover:text-gold-400 flex items-center gap-1">Details <ArrowRight size={12} /></span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-400 text-xs font-bold uppercase tracking-wider py-4">No scheduled events found.</p>
            )}
          </div>
        )}
      </div>

      {/* 3. ARCHIVED EVENTS (ENDED OR CANCELLED - COLLAPSED BY DEFAULT) */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm transition-all">
        <button
          onClick={() => setIsArchivedOpen(!isArchivedOpen)}
          className="w-full p-5 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100/80 dark:hover:bg-slate-900 flex items-center justify-between text-left transition-colors border-b border-slate-200 dark:border-slate-700"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-brand-900 dark:text-slate-100 uppercase tracking-widest">Archived Events ({archivedEvents.length})</h2>
              <p className="text-slate-400 dark:text-slate-400 text-[10px] font-medium">Past and cancelled campus events</p>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-brand-900 dark:text-slate-100">
            {isArchivedOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </button>

        {isArchivedOpen && (
          <div className="p-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
            {archivedEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {archivedEvents.map(event => (
                  <div 
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className="p-5 bg-slate-50 border border-slate-200 rounded-2xl hover:border-slate-300 opacity-80 hover:opacity-100 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-md ${
                        event.status === 'ended' ? 'bg-slate-200 text-slate-700' : 'bg-red-50 text-red-600'
                      }`}>
                        {event.status}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {new Date(event.startTime).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-brand-900 uppercase tracking-tight">{event.title}</h3>
                    <p className="text-slate-500 text-xs line-clamp-2 mt-1">{event.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-400 text-xs font-bold uppercase tracking-wider py-4">No archived events.</p>
            )}
          </div>
        )}
      </div>

      {/* EVENT DETAIL MODAL PANEL */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-brand-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-3xl shadow-modal border border-gold-400/40 overflow-hidden animate-modal-enter my-auto flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="bg-brand-900 p-5 sm:p-6 text-white border-b border-gold-400/40 flex justify-between items-start shrink-0">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest bg-gold-400/20 text-gold-300 px-3 py-1 rounded-full border border-gold-400/30">
                  {selectedEvent.status} Event
                </span>
                <h3 className="text-xl font-black uppercase tracking-tight text-white mt-2">
                  {selectedEvent.title}
                </h3>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="p-2 text-white/60 hover:text-white rounded-xl hover:bg-white/10 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {/* Description */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-1">Full Description</h4>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                  {selectedEvent.description}
                </p>
              </div>

              {/* Time & Penalty Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/40 text-brand-900 dark:text-brand-300 flex items-center justify-center font-bold">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Event Schedule</p>
                    <p className="text-xs font-bold text-brand-900 dark:text-slate-100">
                      {new Date(selectedEvent.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedEvent.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-100 dark:border-red-900/50 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-red-400 dark:text-red-300 uppercase tracking-widest">Unexcused Sanction Penalty</p>
                    <p className="text-xs font-black text-red-700 dark:text-red-400">
                      {selectedEvent.penaltyValue} {selectedEvent.penaltyUnit}
                    </p>
                  </div>
                </div>
              </div>

              {/* Geofencing Location Map Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <MapPin size={12} className="text-gold-600 dark:text-gold-400" /> Geofence Verification Zone
                  </h4>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                    Radius: {selectedEvent.location?.radius_meters || 300}m
                  </span>
                </div>

                <div className="relative h-44 rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 flex items-center justify-center shadow-inner">
                  {/* Mock Map Background Grid */}
                  <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-70"></div>
                  
                  {/* Center Marker */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-brand-900 border-2 border-gold-400 shadow-xl flex items-center justify-center text-gold-400 animate-bounce">
                      <MapPin size={18} />
                    </div>
                    <span className="mt-1 text-[10px] font-black bg-brand-900 text-white px-2.5 py-0.5 rounded-full shadow-md uppercase">
                      RMC Campus Quadrangle
                    </span>
                  </div>

                  {/* Geofence Circle Overlay */}
                  <div className="absolute w-36 h-36 rounded-full border-2 border-dashed border-gold-500 bg-gold-400/10 flex items-center justify-center animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Unable to attend this assembly?</p>

              <button
                onClick={() => setShowExcuseModal(true)}
                className="w-full sm:w-auto px-6 py-3 bg-gold-gradient text-brand-900 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <FileUp size={16} /> File for Excuse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXCUSE FILING SECONDARY MODAL PANEL */}
      {showExcuseModal && selectedEvent && (
        <div className="fixed inset-0 z-[60] bg-brand-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl shadow-modal border border-gold-400/40 overflow-hidden animate-modal-enter my-auto">
            
            <div className="bg-brand-900 p-5 sm:p-6 text-white border-b border-gold-400/40 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-gold-400">Formal Request</span>
                <h3 className="text-lg font-black uppercase tracking-tight text-white">File Excuse Application</h3>
              </div>
              <button onClick={() => setShowExcuseModal(false)} className="text-white/60 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors">
                <X size={20} />
              </button>
            </div>

            {submittedExcuse ? (
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 size={36} />
                </div>
                <h4 className="text-lg font-black text-brand-900 dark:text-slate-100 uppercase tracking-tight">Excuse Letter Submitted!</h4>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Your application for <span className="font-bold text-brand-900 dark:text-slate-200">{selectedEvent.title}</span> has been forwarded to the SSG Student Affairs Committee for review.
                </p>
              </div>
            ) : (
              <form onSubmit={handleExcuseSubmit} className="p-5 sm:p-6 space-y-4">
                {/* Event Summary */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Target Event</p>
                  <p className="font-bold text-brand-900 dark:text-slate-100">{selectedEvent.title}</p>
                </div>

                {/* Reason Select */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Excuse Reason</label>
                  <select
                    value={excuseReason}
                    onChange={(e) => setExcuseReason(e.target.value)}
                    className="input-field select-field"
                  >
                    <option value="Medical / Health Condition">Medical / Health Condition</option>
                    <option value="Academic Conflict / Exam">Academic Conflict / Official Exam</option>
                    <option value="Family Emergency">Family Emergency</option>
                    <option value="Official Representation (Off-Campus)">Official School Off-Campus Event</option>
                  </select>
                </div>

                {/* Details textarea */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Detailed Explanation</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Provide detailed justification for absence..."
                    value={excuseDetails}
                    onChange={(e) => setExcuseDetails(e.target.value)}
                    className="input-field min-h-[90px] font-medium"
                  />
                </div>

                {/* File Upload Component */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Attach Excuse Letter / Medical Certificate</label>
                  <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-gold-400 bg-slate-50 dark:bg-slate-900/50 transition-colors">
                    <FileUp size={24} className="text-slate-400 mb-1" />
                    <span className="text-xs font-bold text-brand-900 dark:text-slate-200">
                      {filePreviewName ? filePreviewName : 'Click or Drag File to Upload'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">PDF, JPG, PNG up to 10MB</span>
                    <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>

                {/* Contact phone */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Guardian / Contact Mobile Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 0917 123 4567"
                    value={excuseContact}
                    onChange={(e) => setExcuseContact(e.target.value)}
                    className="input-field"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-brand-900 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-brand-800 active:scale-98 transition-all flex items-center justify-center gap-2 border border-gold-400/30"
                >
                  <Send size={16} className="text-gold-400" /> Submit Formal Excuse
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default StudentEvents;
