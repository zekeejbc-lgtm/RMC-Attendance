
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../components/AuthContext';
import { mockData } from '../lib/mockBackend';
import { Application, AppEvent, UserProfile, SchoolNode, UserStats } from '../types';
import Button from '../components/ui/Button';
import CustomSelect from '../components/ui/CustomSelect';
import { 
  Users, Check, X, Shield, Plus, UserCheck, Search, Filter,
  ChevronRight, School, BookOpen, Grid, List, ShieldAlert,
  Mail, Phone, User as UserIcon, Minus, ImageIcon, LayoutGrid,
  Upload, Trash2, Home, Clock, Lock, CalendarPlus, MapPin, Target,
  AlignLeft, Info, Users2, AlertTriangle, Compass, Crosshair, Map,
  Globe, ChevronDown, FileText, Fingerprint, Trash
} from 'lucide-react';

const SSGPanel: React.FC = () => {
  const { profile, isMock } = useAuth();
  const [tab, setTab] = useState<'hub' | 'applicants' | 'events'>('hub');
  const [apps, setApps] = useState<Application[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [structure, setStructure] = useState<SchoolNode[]>([]);
  
  const [path, setPath] = useState<SchoolNode[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<(UserProfile & { stats: UserStats }) | null>(null);

  const [showNodeModal, setShowNodeModal] = useState<{parent: string | null, type: string} | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [newNodeName, setNewNodeName] = useState('');
  
  // Specific Asset Input State
  const [assetInput, setAssetInput] = useState('');

  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    radius: 100,
    penaltyValue: 1,
    penaltyUnit: 'hours' as 'hours' | 'minutes',
    
    // Threaded Targeting State
    targetDepth: 'all' as AppEvent['participantsType'],
    selectedCampus: '',
    selectedDept: '',
    selectedTrack: '',
    selectedStrand: '',
    selectedLevel: '',
    selectedSection: '',
    specificPeople: [] as string[],
    
    lat: 7.0736,
    lng: 125.6126,
    isLocating: false
  });

  const isPresident = profile?.role === 'ssg' || profile?.role === 'admin';

  // Fix: Enhanced refresh to update selected student details if a modal is active
  const refresh = () => {
    setApps(mockData.getApplications());
    setStructure(mockData.getSchoolStructure());
    setEvents(mockData.getEvents());
    
    // Check if the current user has selected student open to refresh their data
    if (selectedStudent) {
      const freshUser = mockData.getUserDetail(selectedStudent.uid);
      if (freshUser) {
        setSelectedStudent({ ...freshUser.profile, stats: freshUser.stats });
      }
    }
  };

  // Fix: Implemented missing handleApprove function for the applicants tab
  const handleApprove = (id: string, asMayor: boolean = false) => {
    mockData.approveApplication(id, asMayor ? 'mayor' : 'student');
    refresh();
  };

  // Fix: Implemented missing handleAdjustSanctionHours function for student detail modal
  const handleAdjustSanctionHours = (uid: string, delta: number) => {
    mockData.adjustSanctionHours(uid, delta, `Administrative Adjustment: ${profile?.name}`);
    refresh();
  };

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 5000);
    return () => clearInterval(i);
  }, []);

  // --- Threaded Targeting Helpers ---

  const campusOptions = structure;
  const deptOptions = useMemo(() => {
    const campus = structure.find(s => s.id === eventData.selectedCampus);
    return campus?.children?.filter(c => c.type === 'department') || [];
  }, [structure, eventData.selectedCampus]);

  const trackOptions = useMemo(() => {
    const dept = deptOptions.find(d => d.id === eventData.selectedDept);
    return dept?.children?.filter(c => c.type === 'track') || [];
  }, [deptOptions, eventData.selectedDept]);

  const strandOptions = useMemo(() => {
    const track = trackOptions.find(t => t.id === eventData.selectedTrack);
    return track?.children?.filter(c => c.type === 'strand') || [];
  }, [trackOptions, eventData.selectedTrack]);

  const levelOptions = useMemo(() => {
    // Level can be child of Department or Strand depending on hierarchy
    if (eventData.selectedStrand) {
      const strand = strandOptions.find(s => s.id === eventData.selectedStrand);
      return strand?.children?.filter(c => c.type === 'level') || [];
    }
    const dept = deptOptions.find(d => d.id === eventData.selectedDept);
    return dept?.children?.filter(c => c.type === 'level') || [];
  }, [strandOptions, deptOptions, eventData.selectedStrand, eventData.selectedDept]);

  const sectionOptions = useMemo(() => {
    const level = levelOptions.find(l => l.id === eventData.selectedLevel);
    return level?.children?.filter(c => c.type === 'section') || [];
  }, [levelOptions, eventData.selectedLevel]);

  const handleAddAsset = () => {
    if (assetInput.trim() && !eventData.specificPeople.includes(assetInput.trim())) {
      setEventData(prev => ({ ...prev, specificPeople: [...prev.specificPeople, assetInput.trim()] }));
      setAssetInput('');
    }
  };

  const handleRemoveAsset = (id: string) => {
    setEventData(prev => ({ ...prev, specificPeople: prev.specificPeople.filter(p => p !== id) }));
  };

  const handleCaptureLocation = () => {
    setEventData(prev => ({ ...prev, isLocating: true }));
    navigator.geolocation.getCurrentPosition(pos => {
      setEventData(prev => ({ ...prev, lat: pos.coords.latitude, lng: pos.coords.longitude, isLocating: false }));
    }, () => {
      alert("Location Denied.");
      setEventData(prev => ({ ...prev, isLocating: false }));
    }, { enableHighAccuracy: true });
  };

  const handleCreateEvent = () => {
    // Determine the actual final targeting label
    let finalTargetValue = "All Students";
    if (eventData.targetDepth === 'section') finalTargetValue = sectionOptions.find(s => s.id === eventData.selectedSection)?.name || "";
    else if (eventData.targetDepth === 'level') finalTargetValue = levelOptions.find(s => s.id === eventData.selectedLevel)?.name || "";
    else if (eventData.targetDepth === 'strand') finalTargetValue = strandOptions.find(s => s.id === eventData.selectedStrand)?.name || "";
    else if (eventData.targetDepth === 'track') finalTargetValue = trackOptions.find(s => s.id === eventData.selectedTrack)?.name || "";
    else if (eventData.targetDepth === 'department') finalTargetValue = deptOptions.find(s => s.id === eventData.selectedDept)?.name || "";

    mockData.createEvent({
      title: eventData.title,
      description: eventData.description,
      status: 'active',
      created_by: profile?.name || 'System',
      startTime: new Date(eventData.startTime).getTime(),
      endTime: new Date(eventData.endTime).getTime(),
      penaltyValue: eventData.penaltyValue,
      penaltyUnit: eventData.penaltyUnit,
      participantsType: eventData.targetDepth,
      targetValue: finalTargetValue,
      specificParticipants: eventData.specificPeople,
      target: { all: eventData.targetDepth === 'all' },
      location: { lat: eventData.lat, lng: eventData.lng, radius_meters: eventData.radius },
      timestamp: Date.now()
    } as any);

    setShowEventModal(false);
    setEventData({ 
      title: '', description: '', startTime: '', endTime: '', radius: 100, penaltyValue: 1, penaltyUnit: 'hours',
      targetDepth: 'all', selectedCampus: '', selectedDept: '', selectedTrack: '', selectedStrand: '', 
      selectedLevel: '', selectedSection: '', specificPeople: [], lat: 7.0736, lng: 125.6126, isLocating: false
    });
    refresh();
  };

  const navigateTo = (node: SchoolNode) => setPath([...path, node]);
  const goBackTo = (index: number) => setPath(index === -1 ? [] : path.slice(0, index + 1));

  const currentNode = path.length > 0 ? path[path.length - 1] : null;
  const subUnits = currentNode ? (currentNode.children || []) : structure;
  const isAtSection = currentNode?.type === 'section';
  const students = isAtSection ? mockData.getStudentsBySection(currentNode.name) : [];

  const mapUrl = `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d15844.0!2d${eventData.lng}!3d${eventData.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!3m2!1sen!2sph!4v1620000000000!5m2!1sen!2sph&maptype=satellite`;

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-7xl mx-auto">
      {/* HUB HEADER */}
      <header className="bg-brand-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gold-400/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img 
              src="https://i.imgur.com/K3T5yIT.jpeg" 
              alt="IARS Academic Seal" 
              className="w-9 h-9 rounded-full object-cover ring-2 ring-gold-400/50 shadow-md shrink-0" 
            />
            <div>
              <h2 className="text-xl font-bold uppercase tracking-tight">IARS Control Hub</h2>
              <p className="text-emerald-300 text-[8px] font-bold uppercase tracking-widest">Administrative Operations</p>
            </div>
          </div>
          <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 overflow-hidden">
            {['hub', 'applicants', 'events'].map(t => (
              <button key={t} onClick={() => setTab(t as any)} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${tab === t ? 'bg-gold-gradient text-brand-900 shadow-md' : 'text-white/40 hover:text-white'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* HUB CONTENT */}
      <div className="min-h-[60vh]">
        {tab === 'hub' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-x-auto no-scrollbar">
              <button onClick={() => goBackTo(-1)} className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest ${path.length === 0 ? 'text-brand-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-400'}`}>
                <Home size={14} /> Campus
              </button>
              {path.map((node, i) => (
                <React.Fragment key={node.id}>
                  <ChevronRight size={12} className="text-slate-200 dark:text-slate-600" />
                  <button onClick={() => goBackTo(i)} className={`whitespace-nowrap text-[9px] font-bold uppercase tracking-widest ${i === path.length - 1 ? 'text-brand-900 dark:text-slate-100 font-black' : 'text-slate-400 dark:text-slate-400'}`}>
                    {node.name}
                  </button>
                </React.Fragment>
              ))}
            </div>

            {!isAtSection ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {subUnits.map(node => (
                  <div key={node.id} onClick={() => navigateTo(node)} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-gold-400 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-brand-50 dark:bg-brand-900/40 rounded-xl flex items-center justify-center text-brand-900 dark:text-brand-300 border border-brand-100 dark:border-brand-800 group-hover:scale-110 transition-transform mb-3">
                      {node.type === 'school' ? <School size={22} /> : node.type === 'section' ? <LayoutGrid size={22} /> : <BookOpen size={22} />}
                    </div>
                    <h4 className="text-[11px] font-bold text-brand-900 dark:text-slate-100 uppercase tracking-tight line-clamp-2 h-8 flex items-center">{node.name}</h4>
                    <p className="text-[7px] font-black text-slate-300 dark:text-slate-400 uppercase tracking-widest mt-1">{node.type}</p>
                  </div>
                ))}
                <button onClick={() => setShowNodeModal({ parent: currentNode?.id || null, type: 'unit' })} className="bg-slate-50/50 dark:bg-slate-900/40 p-5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-gold-400 hover:bg-white dark:hover:bg-slate-800 transition-all group flex flex-col items-center justify-center opacity-60">
                   <Plus size={20} className="text-slate-300 dark:text-slate-500 mb-1" />
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Add Unit</p>
                </button>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-lg overflow-hidden">
                 <div className="p-5 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="text-xs font-black text-brand-900 dark:text-slate-100 uppercase tracking-widest">{currentNode.name} Registry</h3>
                    <div className="flex gap-2">
                       <span className="bg-white dark:bg-slate-800 px-3 py-1 rounded-lg text-[8px] font-bold text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-700">{students.length} Personnel</span>
                    </div>
                 </div>
                 <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {students.map(student => (
                      <div key={student.uid} onClick={() => setSelectedStudent(student)} className="bg-white dark:bg-slate-800 p-3 rounded-xl flex items-center gap-3 border border-slate-100 dark:border-slate-700 hover:border-gold-400 hover:shadow-md transition-all cursor-pointer group">
                         <img src={student.photo_url} className="w-10 h-10 rounded-lg object-cover shadow-sm grayscale-[0.5] group-hover:grayscale-0 transition-all" />
                         <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-brand-900 dark:text-slate-100 text-[10px] uppercase tracking-tight truncate">{student.name}</h4>
                            <div className="flex gap-2 mt-0.5">
                               <span className="text-[7px] font-black text-red-500 uppercase flex items-center gap-0.5"><Clock size={10} /> {student.stats.sanction_hours}h</span>
                               <span className="text-[7px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest">{student.role}</span>
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            )}
          </div>
        )}

        {tab === 'applicants' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in">
            {apps.map(app => (
              <div key={app.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                <img src={app.form_data.photo_url} className="w-12 h-12 rounded-xl object-cover shadow-sm border border-slate-100 dark:border-slate-700" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-brand-900 dark:text-slate-100 text-[11px] uppercase tracking-tight truncate mb-2">{app.form_data.name}</h4>
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(app.id)} className="flex-1 py-1.5 bg-green-500 text-white text-[8px] font-black rounded-lg uppercase tracking-widest hover:bg-green-600">Verify</button>
                    <button onClick={() => handleApprove(app.id, true)} className="flex-1 py-1.5 bg-brand-900 text-white text-[8px] font-black rounded-lg uppercase tracking-widest hover:bg-brand-800">Mayor</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'events' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
               <h3 className="text-[10px] font-black text-brand-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                 <Target size={14} className="text-gold-500" /> Operational Log
               </h3>
               <button onClick={() => setShowEventModal(true)} className="px-4 py-2 bg-gold-gradient text-brand-900 text-[9px] font-black rounded-lg uppercase tracking-widest flex items-center gap-2 shadow-md hover:brightness-110 active:scale-95 transition-all">
                  <CalendarPlus size={14} /> Create Event
               </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
               {events.map(ev => (
                 <div key={ev.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-4">
                       <div className="w-9 h-9 bg-brand-50 dark:bg-brand-900/40 rounded-lg flex items-center justify-center text-brand-900 dark:text-brand-300 border border-brand-100 dark:border-brand-800">
                          <MapPin size={18} />
                       </div>
                       <span className="text-[7px] font-black bg-green-50 dark:bg-green-950/60 text-green-600 dark:text-green-400 px-2.5 py-1 rounded-full uppercase tracking-widest border border-green-100 dark:border-green-800/60">{ev.status}</span>
                    </div>
                    <h4 className="text-sm font-black text-brand-900 dark:text-slate-100 uppercase tracking-tight mb-1">{ev.title}</h4>
                    <div className="flex items-center gap-1.5 text-[8px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-widest">
                       <Target size={12} className="text-slate-300 dark:text-slate-500" /> {ev.location.radius_meters}m 
                       <span className="mx-1 opacity-30">|</span>
                       <Users size={12} className="text-slate-300 dark:text-slate-500" /> {ev.participantsType}
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}
      </div>

      {/* CREATE EVENT MODAL - THREADED TARGETING & FULL DESCRIPTION */}
      {showEventModal && (
        <div className="fixed inset-0 z-[400] bg-brand-950/90 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl border-2 border-gold-400 flex flex-col max-h-[95vh] animate-in zoom-in duration-300">
              <div className="bg-brand-900 p-8 text-white border-b-2 border-gold-400 flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-4">
                    <Globe size={28} className="text-gold-400" />
                    <div>
                       <h3 className="text-lg font-black uppercase tracking-widest leading-none">Strategic Deployment</h3>
                       <p className="text-[9px] text-gold-400/50 uppercase font-black tracking-[0.4em] mt-2">Institution Event Engine</p>
                    </div>
                 </div>
                 <button onClick={() => setShowEventModal(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors"><X size={24} /></button>
              </div>

              <div className="p-10 space-y-10 overflow-y-auto no-scrollbar bg-slate-50/40 dark:bg-slate-900/40">
                 {/* CORE INFO */}
                 <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-2">
                         <Target size={14} className="text-gold-500" /> Deployment Title
                       </label>
                       <input 
                         placeholder="e.g. 2nd Semester Institutional Assembly" 
                         className="w-full p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-brand-900 dark:text-slate-100 text-sm shadow-sm focus:border-gold-400 outline-none" 
                         value={eventData.title}
                         onChange={e => setEventData({...eventData, title: e.target.value})}
                       />
                    </div>
                    
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-2">
                         <FileText size={14} className="text-brand-900 dark:text-slate-100" /> Administrative Description (No Truncation)
                       </label>
                       <textarea 
                         placeholder="Detail the full instructional parameters, objectives, and any prerequisites for this event here..." 
                         rows={5}
                         className="w-full p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl font-bold text-brand-900 dark:text-slate-100 text-sm shadow-sm focus:border-gold-400 outline-none resize-none whitespace-pre-wrap leading-relaxed" 
                         value={eventData.description}
                         onChange={e => setEventData({...eventData, description: e.target.value})}
                       />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Window Open</label>
                          <input type="datetime-local" className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-brand-900 dark:text-slate-100 text-xs shadow-sm" value={eventData.startTime} onChange={e => setEventData({...eventData, startTime: e.target.value})} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Window Close</label>
                          <input type="datetime-local" className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-brand-900 dark:text-slate-100 text-xs shadow-sm" value={eventData.endTime} onChange={e => setEventData({...eventData, endTime: e.target.value})} />
                       </div>
                    </div>
                 </div>

                 {/* SATELLITE MAP */}
                 <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-brand-900 tracking-widest flex items-center gap-2">
                       <Map size={16} className="text-gold-500" /> Operational Perimeter
                    </h4>
                    <div className="bg-brand-950 rounded-[3rem] overflow-hidden border-2 border-slate-200 shadow-xl relative aspect-video">
                       <iframe src={mapUrl} className="w-full h-full opacity-90" style={{ border: 0, filter: 'grayscale(0.1)' }} loading="lazy"></iframe>
                       <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="border-4 border-gold-400/20 bg-gold-400/5 rounded-full animate-pulse" style={{ width: '150px', height: '150px' }}></div>
                          <Crosshair size={40} className="text-gold-400 absolute opacity-40" />
                       </div>
                       <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end pointer-events-none">
                          <button onClick={handleCaptureLocation} className="p-4 bg-brand-900 text-gold-400 rounded-2xl shadow-xl pointer-events-auto hover:bg-gold-400 hover:text-brand-900 transition-all border border-gold-400/20">
                             <Crosshair size={24} className={eventData.isLocating ? 'animate-spin' : ''} />
                          </button>
                          <div className="bg-brand-900/90 backdrop-blur-md p-5 rounded-[2rem] border border-white/10 pointer-events-auto min-w-[160px] shadow-2xl">
                             <div className="flex justify-between items-center mb-2">
                                <label className="text-[8px] font-black text-gold-400/50 uppercase tracking-widest">Radius</label>
                                <span className="text-[10px] text-white font-black">{eventData.radius}m</span>
                             </div>
                             <input type="range" min="50" max="2000" step="50" className="w-full accent-gold-400" value={eventData.radius} onChange={e => setEventData({...eventData, radius: parseInt(e.target.value)})} />
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* THREADED TARGETING SYSTEM */}
                 <div className="space-y-6">
                    <h4 className="text-xs font-black uppercase text-brand-900 tracking-widest flex items-center gap-2">
                       <Users2 size={16} className="text-gold-500" /> Target Population Thread
                    </h4>
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                             <CustomSelect 
                               label="Precision Depth"
                               options={[
                                 { value: 'all', label: 'Global Institutional' },
                                 { value: 'department', label: 'By Department' },
                                 { value: 'track', label: 'By Academic Track' },
                                 { value: 'strand', label: 'By Specialized Strand' },
                                 { value: 'level', label: 'By Year Level' },
                                 { value: 'section', label: 'By Specific Section' },
                                 { value: 'specific', label: 'Manual Asset UIDs' }
                               ]}
                               value={eventData.targetDepth}
                               onChange={val => setEventData({...eventData, targetDepth: val as any, selectedCampus: '', selectedDept: '', selectedTrack: '', selectedStrand: '', selectedLevel: '', selectedSection: ''})}
                             />
                          </div>

                          {eventData.targetDepth !== 'all' && eventData.targetDepth !== 'specific' && (
                             <div className="space-y-1.5 animate-in slide-in-from-top-2">
                                <CustomSelect 
                                  label="Target Campus"
                                  options={campusOptions.map(c => ({ value: c.id, label: c.name }))}
                                  value={eventData.selectedCampus}
                                  onChange={val => setEventData({...eventData, selectedCampus: val as string})}
                                  placeholder="Choose Campus..."
                                />
                             </div>
                          )}
                       </div>

                       {/* CASCADING DROPDOWNS (THE THREAD) */}
                       <div className="space-y-4 animate-in fade-in duration-500">
                          {eventData.selectedCampus && (eventData.targetDepth !== 'all') && (
                            <div className="space-y-1.5">
                               <CustomSelect 
                                 label="Target Department"
                                 options={deptOptions.map(d => ({ value: d.id, label: d.name }))}
                                 value={eventData.selectedDept}
                                 onChange={val => setEventData({...eventData, selectedDept: val as string, selectedTrack: '', selectedStrand: '', selectedLevel: '', selectedSection: ''})}
                                 placeholder="Choose Department..."
                               />
                            </div>
                          )}

                          {eventData.selectedDept && ['track', 'strand', 'level', 'section'].includes(eventData.targetDepth) && (
                            <div className="space-y-1.5">
                               <CustomSelect 
                                 label="Target Track"
                                 options={trackOptions.map(t => ({ value: t.id, label: t.name }))}
                                 value={eventData.selectedTrack}
                                 onChange={val => setEventData({...eventData, selectedTrack: val as string, selectedStrand: '', selectedLevel: '', selectedSection: ''})}
                                 placeholder="Choose Track (Everyone in Dept if empty)..."
                               />
                            </div>
                          )}

                          {eventData.selectedTrack && ['strand', 'level', 'section'].includes(eventData.targetDepth) && (
                            <div className="space-y-1.5">
                               <CustomSelect 
                                 label="Target Strand"
                                 options={strandOptions.map(s => ({ value: s.id, label: s.name }))}
                                 value={eventData.selectedStrand}
                                 onChange={val => setEventData({...eventData, selectedStrand: val as string, selectedLevel: '', selectedSection: ''})}
                                 placeholder="Choose Strand..."
                               />
                            </div>
                          )}

                          {((eventData.selectedDept && !trackOptions.length) || eventData.selectedStrand) && ['level', 'section'].includes(eventData.targetDepth) && (
                            <div className="space-y-1.5">
                               <CustomSelect 
                                 label="Target Level"
                                 options={levelOptions.map(l => ({ value: l.id, label: l.name }))}
                                 value={eventData.selectedLevel}
                                 onChange={val => setEventData({...eventData, selectedLevel: val as string, selectedSection: ''})}
                                 placeholder="Choose Year Level..."
                               />
                            </div>
                          )}

                          {eventData.selectedLevel && eventData.targetDepth === 'section' && (
                            <div className="space-y-1.5">
                               <CustomSelect 
                                 label="Target Section"
                                 options={sectionOptions.map(s => ({ value: s.id, label: s.name }))}
                                 value={eventData.selectedSection}
                                 onChange={val => setEventData({...eventData, selectedSection: val as string})}
                                 placeholder="Choose Section..."
                               />
                            </div>
                          )}
                       </div>

                       {/* SPECIFIC ASSET UIDs (MANUAL) */}
                       {eventData.targetDepth === 'specific' && (
                          <div className="space-y-4 animate-in slide-in-from-top-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                               <Fingerprint size={14} className="text-brand-900 dark:text-slate-100"/> Asset ID Registry
                             </label>
                             <div className="flex gap-2">
                                <input 
                                  placeholder="Enter Student ID or UID..." 
                                  className="flex-1 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-brand-900 dark:text-slate-100 text-xs focus:border-gold-400 outline-none" 
                                  value={assetInput}
                                  onChange={e => setAssetInput(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && handleAddAsset()}
                                />
                                <button onClick={handleAddAsset} className="px-6 bg-brand-900 text-gold-400 rounded-xl font-black text-[10px] uppercase hover:bg-brand-800 transition-colors">Add ID</button>
                             </div>
                             <div className="flex flex-wrap gap-2 pt-2">
                                {eventData.specificPeople.map(id => (
                                   <span key={id} className="bg-slate-100 dark:bg-slate-700 text-brand-900 dark:text-slate-100 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight flex items-center gap-2 border border-slate-200 dark:border-slate-600">
                                      {id} <button onClick={() => handleRemoveAsset(id)}><X size={12} className="text-red-500" /></button>
                                   </span>
                                ))}
                                {eventData.specificPeople.length === 0 && <p className="text-[8px] text-slate-300 dark:text-slate-500 font-bold uppercase tracking-widest italic p-2">Queue empty: Add identifiers above</p>}
                             </div>
                          </div>
                       )}
                    </div>
                 </div>

                 {/* PENALTY LOGIC */}
                 <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-brand-900 dark:text-slate-100 tracking-widest flex items-center gap-2">
                       <AlertTriangle size={16} className="text-red-500" /> Attendance Penalty Logic
                    </h4>
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm flex items-end gap-4 h-full">
                       <div className="flex-1 space-y-1.5">
                          <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Service Value</label>
                          <input type="number" min="1" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl font-bold text-brand-900 dark:text-slate-100 text-sm outline-none" value={eventData.penaltyValue} onChange={e => setEventData({...eventData, penaltyValue: parseInt(e.target.value)})} />
                       </div>
                       <div className="w-28 space-y-1.5">
                          <CustomSelect 
                            label="Temporal Unit"
                            options={[
                              { value: 'hours', label: 'Hours' },
                              { value: 'minutes', label: 'Minutes' }
                            ]}
                            value={eventData.penaltyUnit}
                            onChange={val => setEventData({...eventData, penaltyUnit: val as any})}
                          />
                       </div>
                    </div>
                 </div>
              </div>

              {/* AUTHORIZATION BUTTON */}
              <div className="p-10 pt-0 bg-slate-50/50 dark:bg-slate-900/50 shrink-0 border-t border-slate-100 dark:border-slate-800">
                 <button 
                   onClick={handleCreateEvent} 
                   disabled={!eventData.title || !eventData.startTime || !eventData.endTime || (eventData.targetDepth !== 'all' && eventData.targetDepth !== 'specific' && !eventData.selectedDept)} 
                   className="w-full py-6 bg-gold-gradient text-brand-900 text-sm font-black rounded-3xl uppercase tracking-[0.4em] shadow-[0_20px_40px_rgba(212,175,55,0.3)] hover:brightness-110 active:scale-95 transition-all disabled:opacity-40"
                 >
                    Authorize Deployment Protocol
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* NODE ESTABLISHMENT MODAL */}
      {showNodeModal && (
        <div className="fixed inset-0 z-[500] bg-brand-950/80 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 w-full max-w-xs rounded-3xl shadow-2xl border-2 border-gold-400 overflow-hidden">
              <div className="bg-brand-900 p-6 text-white border-b-2 border-gold-400 flex justify-between items-center">
                 <h3 className="text-sm font-black uppercase tracking-widest">Establish Unit</h3>
                 <button onClick={() => setShowNodeModal(null)} className="text-white/30 hover:text-white"><X size={18} /></button>
              </div>
              <div className="p-8 space-y-4">
                 <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-1">Unit Designation</label>
                    <input placeholder="e.g. STEM-12-Newton" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-brand-900 dark:text-slate-100 text-[11px] focus:border-gold-400 outline-none transition-all" value={newNodeName} onChange={e => setNewNodeName(e.target.value)} />
                 </div>
                 <button disabled={!newNodeName} onClick={() => {
                     let nextType: any = 'department';
                     if (currentNode) {
                        if (currentNode.type === 'department') nextType = 'track';
                        else if (currentNode.type === 'track') nextType = 'strand';
                        else if (currentNode.type === 'strand') nextType = 'level';
                        else if (currentNode.type === 'level') nextType = 'section';
                     }
                     mockData.addSchoolNode(showNodeModal.parent, { id: `node_${Date.now()}`, name: newNodeName, type: nextType, children: [] });
                     setShowNodeModal(null); setNewNodeName(''); refresh();
                   }} className="w-full py-4 bg-gold-gradient text-brand-900 text-[10px] font-black rounded-xl uppercase tracking-widest shadow-md hover:brightness-110">
                    Establish Unit
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* REGAL USER DETAIL MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 z-[200] bg-brand-950/80 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col sm:flex-row border-2 border-gold-400 animate-in zoom-in duration-300 relative">
            <button onClick={() => setSelectedStudent(null)} className="absolute top-4 right-4 p-2 bg-slate-100/50 dark:bg-slate-800/80 rounded-lg text-slate-400 hover:text-brand-900 dark:hover:text-slate-100 z-50 transition-all hover:bg-slate-200 dark:hover:bg-slate-700">
              <X size={16} />
            </button>
            <div className="sm:w-[42%] bg-brand-900 p-6 flex flex-col items-center text-center border-b-2 sm:border-b-0 sm:border-r-2 border-gold-400/20">
               <div className="relative mb-5 mt-4">
                  <img src={selectedStudent.photo_url} className="w-28 h-28 rounded-2xl object-cover border-4 border-gold-400/30 shadow-lg" />
                  <div className="absolute -bottom-2 -right-2 bg-gold-400 p-2 rounded-lg border-2 border-brand-900 shadow-lg text-brand-900">
                     <Shield size={16} />
                  </div>
               </div>
               <h3 className="text-white text-lg font-black uppercase tracking-tight mb-1 leading-tight">{selectedStudent.name}</h3>
               <p className="text-gold-400/50 text-[8px] font-bold uppercase tracking-[0.4em] mb-8">ID-{selectedStudent.student_id}</p>
               <div className="w-full space-y-2">
                  <div className="flex items-center gap-2 bg-white/5 px-3 py-2.5 rounded-lg text-white/40 text-[7px] font-bold uppercase tracking-widest border border-white/5 overflow-hidden">
                     <Mail size={12} className="text-gold-400/70 shrink-0" /> <span className="truncate">{selectedStudent.email}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 px-3 py-2.5 rounded-lg text-white/40 text-[7px] font-bold uppercase tracking-widest border border-white/5">
                     <Phone size={12} className="text-gold-400/70 shrink-0" /> {selectedStudent.phone || 'UNLINKED'}
                  </div>
               </div>
            </div>
            <div className="sm:w-[58%] p-8 space-y-8 bg-white dark:bg-slate-800 flex flex-col justify-center">
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                     <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest mb-1">Success Score</p>
                     <p className="text-3xl font-black text-brand-900 dark:text-slate-100">98%</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950/60 p-4 rounded-xl border border-red-100 dark:border-red-900/50 text-center shadow-sm">
                     <p className="text-[7px] font-black uppercase text-red-400 tracking-widest mb-1">Service Hours</p>
                     <p className="text-3xl font-black text-red-600 dark:text-red-400">{selectedStudent.stats.sanction_hours}</p>
                  </div>
               </div>
               <div className="space-y-4">
                  <h4 className="text-[8px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <ShieldAlert size={12} /> Hour Modification
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                     <button onClick={() => handleAdjustSanctionHours(selectedStudent.uid, 1)} className="py-4 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-200 dark:hover:bg-red-900 transition-all flex items-center justify-center gap-1.5 shadow-sm">
                        <Plus size={16} /> Add Hour
                     </button>
                     <button disabled={!isPresident} onClick={() => handleAdjustSanctionHours(selectedStudent.uid, -1)} className={`py-4 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-sm ${isPresident ? 'bg-green-50 dark:bg-green-950/80 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900 border border-green-200 dark:border-green-800' : 'bg-slate-50 dark:bg-slate-900 text-slate-300 dark:text-slate-600 opacity-40 cursor-not-allowed'}`}>
                        {isPresident ? <Minus size={16} /> : <Lock size={12} />} Clear Hour
                     </button>
                  </div>
               </div>
               <div className="space-y-4">
                  <h4 className="text-[8px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <UserIcon size={12} /> Designation Control
                  </h4>
                  <div className="flex bg-slate-50 dark:bg-slate-900 p-1.5 rounded-xl gap-1.5 border border-slate-100 dark:border-slate-700 shadow-inner">
                     <button onClick={() => mockData.assignRole(selectedStudent.uid, 'student')} className={`flex-1 py-3 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${selectedStudent.role === 'student' ? 'bg-brand-900 text-white shadow-md' : 'text-slate-400'}`}>Regular</button>
                     <button onClick={() => mockData.assignRole(selectedStudent.uid, 'mayor')} className={`flex-1 py-3 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${selectedStudent.role === 'mayor' ? 'bg-gold-gradient text-brand-900 shadow-md' : 'text-slate-400'}`}>Mayor</button>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SSGPanel;
