import React, { useState, useMemo } from 'react';
import { useAuth } from '../components/AuthContext';
import { 
  Award, Search, Filter, MapPin, Clock, ShieldCheck, 
  FileUp, CheckCircle2, X, ArrowRight, Flag, Calendar, Send, Sparkles, Building2
} from 'lucide-react';

interface SchoolCeremony {
  id: string;
  title: string;
  type: 'flag_ceremony' | 'convocation' | 'commencement' | 'institutional';
  scheduleDay: string;
  timeFrame: string;
  locationName: string;
  geofenceRadius: number; // in meters
  attire: string;
  description: string;
  penaltyValue: number;
}

const MOCK_CEREMONIES: SchoolCeremony[] = [
  {
    id: 'c1',
    title: 'Weekly Institutional Flag Raising Ceremony',
    type: 'flag_ceremony',
    scheduleDay: 'Every Monday',
    timeFrame: '07:00 AM - 07:30 AM',
    locationName: 'RMC Main Campus Grounds & Track Oval',
    geofenceRadius: 200,
    attire: 'Complete Type-A School Uniform with Institutional ID',
    description: 'Mandatory weekly flag raising ceremony, national anthem, and brief announcements by administrative heads.',
    penaltyValue: 3
  },
  {
    id: 'c2',
    title: 'Monthly Flag Lowering & Retreat Ceremony',
    type: 'flag_ceremony',
    scheduleDay: 'Last Friday of the Month',
    timeFrame: '04:30 PM - 05:00 PM',
    locationName: 'RMC Quadrangle',
    geofenceRadius: 150,
    attire: 'Official School Uniform or Washday Uniform with ID',
    description: 'Monthly ceremonial flag retreat honoring national symbols and student achievers.',
    penaltyValue: 2
  },
  {
    id: 'c3',
    title: 'Annual Founders Day Thanksgiving Mass & Convocation',
    type: 'convocation',
    scheduleDay: 'March 15, 2026',
    timeFrame: '08:00 AM - 11:30 AM',
    locationName: 'RMC Gym & Cultural Center',
    geofenceRadius: 350,
    attire: 'Formal White Filipiniana / Barong / Type-A Uniform',
    description: 'Formal convocation celebrating RMC founding anniversary and honoring distinguished alumni and scholar awardees.',
    penaltyValue: 6
  },
  {
    id: 'c4',
    title: 'Senior High School Completion & Recognition Ceremony',
    type: 'commencement',
    scheduleDay: 'May 28, 2026',
    timeFrame: '01:00 PM - 05:00 PM',
    locationName: 'Davao City Recreation Center (Almendras Gym)',
    geofenceRadius: 400,
    attire: 'Formal Toga / Formal Attire',
    description: 'Official commencement ceremony for graduating Grade 12 students and academic honor students.',
    penaltyValue: 10
  }
];

const StudentCeremonies: React.FC = () => {
  const { profile } = useAuth();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modal State
  const [selectedCeremony, setSelectedCeremony] = useState<SchoolCeremony | null>(null);
  const [showExcuseModal, setShowExcuseModal] = useState(false);

  // Excuse Form State
  const [excuseReason, setExcuseReason] = useState('Official Academic Conflict');
  const [excuseDetails, setExcuseDetails] = useState('');
  const [excuseContact, setExcuseContact] = useState('');
  const [filePreviewName, setFilePreviewName] = useState('');
  const [submittedExcuse, setSubmittedExcuse] = useState(false);

  const filteredCeremonies = useMemo(() => {
    return MOCK_CEREMONIES.filter(ceremony => {
      const matchesSearch = ceremony.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            ceremony.locationName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' ? true : ceremony.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [searchTerm, typeFilter]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFilePreviewName(e.target.files[0].name);
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
      setFilePreviewName('');
    }, 2000);
  };

  return (
    <div className="p-4 sm:p-5 max-w-6xl mx-auto space-y-4 animate-in fade-in duration-200">
      
      {/* HEADER & FILTERS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-gold-600 dark:text-gold-400 font-bold text-[10px] uppercase tracking-wider mb-0.5">
            <Award size={14} /> Official Protocol
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-900 dark:text-slate-100 uppercase tracking-tight">Institutional Ceremonies</h1>
          <p className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">Flag ceremonies, convocations, and formal school protocols with mandatory geofenced attendance.</p>
        </div>

        {/* SEARCH & FILTER */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search ceremony..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-9 pr-3 py-1.5 shadow-xs"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="text-slate-400 shrink-0" size={14} />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input-field select-field py-1.5 shadow-xs cursor-pointer text-xs"
            >
              <option value="all">All Ceremonies</option>
              <option value="flag_ceremony">Flag Ceremonies</option>
              <option value="convocation">Convocations</option>
              <option value="commencement">Commencements</option>
            </select>
          </div>
        </div>
      </div>

      {/* CEREMONIES CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredCeremonies.map(ceremony => (
          <div 
            key={ceremony.id}
            onClick={() => setSelectedCeremony(ceremony)}
            className="group bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs hover:border-gold-400/60 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden"
          >
            {/* Top Badge */}
            <div className="flex items-center justify-between mb-2.5">
              <span className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gold-50 dark:bg-amber-500/20 text-gold-700 dark:text-amber-300 border border-gold-200 dark:border-amber-500/30">
                <Flag size={10} /> {ceremony.type.replace('_', ' ')}
              </span>
              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                Geofence Active ({ceremony.geofenceRadius}m)
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-brand-900 dark:text-slate-100 uppercase tracking-tight group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors">
                {ceremony.title}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium line-clamp-2 mt-2">
                {ceremony.description}
              </p>
            </div>

            {/* Timing & Location Bar */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5 text-brand-900 dark:text-slate-100"><Calendar size={14} className="text-gold-500" /> {ceremony.scheduleDay}</span>
                <span className="flex items-center gap-1.5 text-brand-900 dark:text-slate-100"><Clock size={14} className="text-gold-500" /> {ceremony.timeFrame}</span>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1 truncate max-w-[220px]"><MapPin size={12} /> {ceremony.locationName}</span>
                <span className="font-bold text-brand-900 dark:text-slate-100 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  View Rules <ArrowRight size={12} />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CEREMONY DETAIL MODAL */}
      {selectedCeremony && (
        <div className="fixed inset-0 z-50 bg-brand-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-3xl shadow-modal border border-gold-400/40 overflow-hidden animate-modal-enter my-auto flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="bg-brand-900 p-5 sm:p-6 text-white border-b border-gold-400/40 flex justify-between items-start shrink-0">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest bg-gold-400/20 text-gold-300 px-3 py-1 rounded-full border border-gold-400/30">
                  {selectedCeremony.type.replace('_', ' ')}
                </span>
                <h3 className="text-xl font-black uppercase tracking-tight text-white mt-2">
                  {selectedCeremony.title}
                </h3>
              </div>
              <button onClick={() => setSelectedCeremony(null)} className="p-2 text-white/60 hover:text-white rounded-xl hover:bg-white/10 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
              <div>
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-1">Ceremony Overview</h4>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 leading-relaxed">
                  {selectedCeremony.description}
                </p>
              </div>

              {/* Grid Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Day & Timeframe</p>
                  <p className="text-xs font-bold text-brand-900 dark:text-slate-100">{selectedCeremony.scheduleDay}</p>
                  <p className="text-xs font-bold text-gold-600 dark:text-gold-400">{selectedCeremony.timeFrame}</p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Dress Code & Protocol</p>
                  <p className="text-xs font-bold text-brand-900 dark:text-slate-100">{selectedCeremony.attire}</p>
                </div>
              </div>

              {/* Geofencing Location Map */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <MapPin size={12} className="text-gold-600" /> Geofenced Check-In Perimeter
                  </h4>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Perimeter Radius: {selectedCeremony.geofenceRadius}m
                  </span>
                </div>

                <div className="relative h-44 rounded-2xl overflow-hidden border border-slate-300 bg-slate-100 flex items-center justify-center shadow-inner">
                  <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:16px_16px] opacity-70"></div>
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-brand-900 border-2 border-gold-400 shadow-xl flex items-center justify-center text-gold-400 animate-bounce">
                      <Building2 size={18} />
                    </div>
                    <span className="mt-1 text-[10px] font-black bg-brand-900 text-white px-2.5 py-0.5 rounded-full shadow-md uppercase">
                      {selectedCeremony.locationName}
                    </span>
                  </div>
                  <div className="absolute w-32 h-32 rounded-full border-2 border-dashed border-emerald-500 bg-emerald-500/10 flex items-center justify-center animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
              <p className="text-[10px] text-slate-500 font-medium">Cannot participate in this official ceremony?</p>

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

      {/* EXCUSE FILING MODAL */}
      {showExcuseModal && selectedCeremony && (
        <div className="fixed inset-0 z-[60] bg-brand-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl shadow-modal border border-gold-400/40 overflow-hidden animate-modal-enter my-auto">
            
            <div className="bg-brand-900 p-5 sm:p-6 text-white border-b border-gold-400/40 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-gold-400">Ceremony Exemption</span>
                <h3 className="text-lg font-black uppercase tracking-tight text-white">Excuse Letter Submission</h3>
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
                <h4 className="text-lg font-black text-brand-900 dark:text-slate-100 uppercase tracking-tight">Exemption Form Transmitted!</h4>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Your exemption request for <span className="font-bold text-brand-900 dark:text-slate-100">{selectedCeremony.title}</span> has been logged for Prefect of Discipline approval.
                </p>
              </div>
            ) : (
              <form onSubmit={handleExcuseSubmit} className="p-5 sm:p-6 space-y-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Target Ceremony</p>
                  <p className="font-bold text-brand-900 dark:text-slate-100">{selectedCeremony.title}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Exemption Reason</label>
                  <select
                    value={excuseReason}
                    onChange={(e) => setExcuseReason(e.target.value)}
                    className="input-field select-field"
                  >
                    <option value="Official Academic Conflict">Official Academic Conflict</option>
                    <option value="Medical / Health Condition">Medical / Health Reason</option>
                    <option value="Religious Observance">Religious Observance</option>
                    <option value="Official Off-Campus Event">Official Off-Campus Competition</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Detailed Justification</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Provide detailed explanation for ceremony absence..."
                    value={excuseDetails}
                    onChange={(e) => setExcuseDetails(e.target.value)}
                    className="input-field min-h-[90px] font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Upload Supporting Document / Excuse Letter</label>
                  <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-gold-400 bg-slate-50 dark:bg-slate-900/50 transition-colors">
                    <FileUp size={24} className="text-slate-400 mb-1" />
                    <span className="text-xs font-bold text-brand-900 dark:text-slate-200">
                      {filePreviewName ? filePreviewName : 'Upload Excuse Letter / Photo'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Supported formats: PDF, PNG, JPG</span>
                    <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-brand-900 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-brand-800 active:scale-98 transition-all flex items-center justify-center gap-2 border border-gold-400/30"
                >
                  <Send size={16} className="text-gold-400" /> Transmit Exemption Letter
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default StudentCeremonies;
