import React, { useState, useMemo } from 'react';
import { useAuth } from '../components/AuthContext';
import { Modal } from '../components/ui/Modal';
import { Page, PageHeader, Surface } from '../components/ui/Page';
import { 
  Award, Search, Filter, MapPin, Clock,
  FileUp, CheckCircle2, ArrowRight, Flag, Calendar, Send, Building2
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
    <Page className="max-w-6xl animate-in fade-in duration-200">
      
      {/* HEADER & FILTERS */}
      <PageHeader
        eyebrow={<span className="flex items-center gap-1.5"><Award size={14} /> Official Protocol</span>}
        title="Institutional Ceremonies"
        description="Flag ceremonies, convocations, and formal school protocols with mandatory geofenced attendance."
      />

      {/* SEARCH & FILTER */}
      <Surface aria-label="Ceremony filters" className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <label className="sr-only" htmlFor="ceremony-search">Search ceremonies</label>
            <input 
              id="ceremony-search"
              type="text" 
              placeholder="Search ceremony..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-9 pr-3 py-1.5 shadow-xs"
            />
          </div>

          <div className="flex min-w-0 items-center gap-1.5 sm:w-56">
            <Filter className="text-slate-400 shrink-0" size={14} />
            <label className="sr-only" htmlFor="ceremony-type-filter">Filter ceremonies by type</label>
            <select
              id="ceremony-type-filter"
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
      </Surface>

      {/* CEREMONIES CARDS GRID */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filteredCeremonies.map(ceremony => (
          <button
            type="button"
            key={ceremony.id}
            onClick={() => setSelectedCeremony(ceremony)}
            className="app-surface group relative flex w-full flex-col justify-between overflow-hidden p-4 text-left shadow-xs transition-all hover:border-gold-400/60 hover:shadow-md sm:p-5"
          >
            {/* Top Badge */}
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gold-50 dark:bg-amber-500/20 text-gold-700 dark:text-amber-300 border border-gold-200 dark:border-amber-500/30">
                <Flag size={10} /> {ceremony.type.replace('_', ' ')}
              </span>
              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                Geofence Active ({ceremony.geofenceRadius}m)
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-tight text-brand-900 [overflow-wrap:anywhere] transition-colors group-hover:text-gold-600 dark:text-slate-100 dark:group-hover:text-gold-400">
                {ceremony.title}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium line-clamp-2 mt-2">
                {ceremony.description}
              </p>
            </div>

            {/* Timing & Location Bar */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-slate-700 dark:text-slate-300">
                <span className="flex min-w-0 items-center gap-1.5 text-brand-900 [overflow-wrap:anywhere] dark:text-slate-100"><Calendar size={14} className="shrink-0 text-gold-500" /> {ceremony.scheduleDay}</span>
                <span className="flex min-w-0 items-center gap-1.5 text-brand-900 [overflow-wrap:anywhere] dark:text-slate-100"><Clock size={14} className="shrink-0 text-gold-500" /> {ceremony.timeFrame}</span>
              </div>

              <div className="flex flex-col items-start gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex min-w-0 items-start gap-1 [overflow-wrap:anywhere]"><MapPin size={12} className="mt-0.5 shrink-0" /> {ceremony.locationName}</span>
                <span className="flex shrink-0 items-center gap-1 font-bold text-brand-900 transition-transform group-hover:translate-x-1 dark:text-slate-100">
                  View Rules <ArrowRight size={12} />
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* CEREMONY DETAIL MODAL */}
      {selectedCeremony ? (
        <Modal
          open
          onClose={() => setSelectedCeremony(null)}
          title={selectedCeremony.title}
          description="Review the official protocol, schedule, attire, and geofenced check-in perimeter."
          size="lg"
          footer={(
            <>
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 sm:mr-auto sm:self-center">
                Cannot participate in this official ceremony?
              </p>
              <button
                onClick={() => setShowExcuseModal(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold-gradient px-6 py-3 text-xs font-black uppercase tracking-widest text-brand-900 shadow-lg transition-all hover:brightness-110 active:scale-95 sm:w-auto"
                type="button"
              >
                <FileUp size={16} /> File for Excuse
              </button>
            </>
          )}
        >
          <div className="space-y-5">
            <span className="inline-flex rounded-full border border-gold-300 bg-gold-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gold-700 dark:border-gold-400/30 dark:bg-gold-400/10 dark:text-gold-300">
              {selectedCeremony.type.replace('_', ' ')}
            </span>
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
                <div className="mb-2 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">
                    <MapPin size={12} className="text-gold-600 dark:text-gold-400" /> Geofenced Check-In Perimeter
                  </h4>
                  <span className="max-w-full rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 [overflow-wrap:anywhere] dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300">
                    Perimeter Radius: {selectedCeremony.geofenceRadius}m
                  </span>
                </div>

                <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-2xl border border-slate-300 bg-slate-100 shadow-inner dark:border-slate-700 dark:bg-slate-900">
                  <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:16px_16px] opacity-70 dark:bg-[radial-gradient(#334155_1px,transparent_1px)]"></div>
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-brand-900 border-2 border-gold-400 shadow-xl flex items-center justify-center text-gold-400 animate-bounce">
                      <Building2 size={18} />
                    </div>
                    <span className="mt-1 max-w-[min(15rem,80vw)] rounded-full bg-brand-900 px-2.5 py-0.5 text-center text-[10px] font-black uppercase text-white [overflow-wrap:anywhere] shadow-md">
                      {selectedCeremony.locationName}
                    </span>
                  </div>
                  <div className="absolute w-32 h-32 rounded-full border-2 border-dashed border-emerald-500 bg-emerald-500/10 flex items-center justify-center animate-pulse"></div>
                </div>
              </div>
          </div>
        </Modal>
      ) : null}

      {/* EXCUSE FILING MODAL */}
      {selectedCeremony ? (
        <Modal
          open={showExcuseModal}
          onClose={() => setShowExcuseModal(false)}
          title={`Excuse Letter Submission — ${selectedCeremony.title}`}
          description="Transmit an exemption letter and supporting document for discipline approval."
          size="md"
          closeOnBackdrop={!submittedExcuse}
          footer={!submittedExcuse ? (
            <button
              type="submit"
              form="ceremony-excuse-form"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gold-400/30 bg-brand-900 px-5 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-brand-800 active:scale-98 sm:w-auto"
            >
              <Send size={16} className="text-gold-400" /> Transmit Exemption Letter
            </button>
          ) : undefined}
        >
            {submittedExcuse ? (
              <div className="space-y-4 py-3 text-center">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 size={36} />
                </div>
                <h4 className="text-lg font-black text-brand-900 dark:text-slate-100 uppercase tracking-tight">Exemption Form Transmitted!</h4>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Your exemption request for <span className="font-bold text-brand-900 dark:text-slate-100">{selectedCeremony.title}</span> has been logged for Prefect of Discipline approval.
                </p>
              </div>
            ) : (
              <form id="ceremony-excuse-form" onSubmit={handleExcuseSubmit} className="space-y-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Target Ceremony</p>
                  <p className="font-bold text-brand-900 dark:text-slate-100">{selectedCeremony.title}</p>
                </div>

                <div className="space-y-1">
                  <label htmlFor="ceremony-excuse-reason" className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Exemption Reason</label>
                  <select
                    id="ceremony-excuse-reason"
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
                  <label htmlFor="ceremony-excuse-details" className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Detailed Justification</label>
                  <textarea
                    id="ceremony-excuse-details"
                    rows={3}
                    required
                    placeholder="Provide detailed explanation for ceremony absence..."
                    value={excuseDetails}
                    onChange={(e) => setExcuseDetails(e.target.value)}
                    className="input-field min-h-[90px] font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Upload Supporting Document / Excuse Letter</span>
                  <label htmlFor="ceremony-excuse-file" className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-gold-400 bg-slate-50 dark:bg-slate-900/50 transition-colors">
                    <FileUp size={24} className="text-slate-400 mb-1" />
                    <span className="text-xs font-bold text-brand-900 dark:text-slate-200">
                      {filePreviewName ? filePreviewName : 'Upload Excuse Letter / Photo'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Supported formats: PDF, PNG, JPG</span>
                    <input aria-label="Upload Supporting Document / Excuse Letter" id="ceremony-excuse-file" type="file" accept="image/*,.pdf" onChange={handleFileChange} className="sr-only" />
                  </label>
                </div>
              </form>
            )}
        </Modal>
      ) : null}

    </Page>
  );
};

export default StudentCeremonies;
