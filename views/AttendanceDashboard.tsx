
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../components/AuthContext';
import { mockData } from '../lib/mockBackend';
import { AppEvent, SchoolNode, UserProfile } from '../types';
import CustomSelect from '../components/ui/CustomSelect';
import { 
  Filter, Calendar, Download, PieChart, BarChart, LineChart, 
  Users, CheckCircle, XCircle, Clock, AlertCircle, FileText, 
  ChevronDown, ChevronRight, Search, Printer
} from 'lucide-react';
import { 
  PieChart as RePieChart, Pie, Cell, BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart as ReLineChart, Line, AreaChart, Area
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

// --- Types ---

type TimeFilter = 'all' | 'this_month' | 'this_week' | 'custom';
type LevelFilter = 'all' | 'tertiary' | 'secondary' | 'elementary';
type ChartType = 'pie' | 'donut' | 'column' | 'bar' | 'line';

interface FilterState {
  level: LevelFilter;
  // Tertiary
  college: string;
  program: string;
  major: string;
  yearLevel: string;
  section: string;
  // Secondary
  secondaryType: 'shs' | 'jhs' | '';
  strand: string;
  specialization: string;
  gradeLevel: string;
  // Elementary
  elemGradeLevel: string;
}

interface AttendanceRecord {
  studentId: string;
  studentName: string;
  status: 'present' | 'late' | 'excused' | 'absent' | 'not_recorded';
  timeIn?: number;
  section: string;
  program?: string; // or strand/track
  level: string;
}

// --- Mock Data Generator (since backend is limited) ---
const generateMockAttendance = (events: AppEvent[], filter: FilterState): AttendanceRecord[] => {
  // In a real app, this would query the backend based on filters
  // For now, we generate plausible data for visualization
  const statuses = ['present', 'late', 'excused', 'absent', 'not_recorded'] as const;
  const records: AttendanceRecord[] = [];
  
  // Generate 100 random records
  for (let i = 0; i < 100; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    records.push({
      studentId: `ID-${1000 + i}`,
      studentName: `Student ${i + 1}`,
      status,
      timeIn: status === 'present' || status === 'late' ? Date.now() - Math.random() * 3600000 : undefined,
      section: ['Newton', 'Einstein', 'Pascal', 'Darwin'][Math.floor(Math.random() * 4)],
      program: ['STEM', 'ABM', 'HUMSS', 'BSCS'][Math.floor(Math.random() * 4)],
      level: ['Grade 11', 'Grade 12', '1st Year', '2nd Year'][Math.floor(Math.random() * 4)]
    });
  }
  return records;
};

const AttendanceDashboard: React.FC = () => {
  const { isMock } = useAuth();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  const [filters, setFilters] = useState<FilterState>({
    level: 'all',
    college: '', program: '', major: '', yearLevel: '', section: '',
    secondaryType: '', strand: '', specialization: '', gradeLevel: '',
    elemGradeLevel: ''
  });

  const [chartType, setChartType] = useState<ChartType>('pie');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSettings, setExportSettings] = useState({
    groupBy: 'status' as 'status' | 'program' | 'section' | 'level',
    includeCharts: true,
    includeTables: true
  });

  const chartRef = useRef<HTMLDivElement>(null);

  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const [eventSearch, setEventSearch] = useState('');

  // Load initial data
  useEffect(() => {
    if (isMock) {
      setEvents(mockData.getEvents());
    }
  }, [isMock]);

  // Derived Data
  const attendanceData = useMemo(() => generateMockAttendance(events, filters), [events, filters, selectedEvents]);
  
  const stats = useMemo(() => {
    const s = { present: 0, late: 0, excused: 0, absent: 0, not_recorded: 0, total: 0 };
    attendanceData.forEach(r => {
      s[r.status]++;
      s.total++;
    });
    return s;
  }, [attendanceData]);

  const chartData = useMemo(() => {
    const data = [
      { name: 'Present', value: stats.present, color: '#22c55e' },
      { name: 'Late', value: stats.late, color: '#eab308' },
      { name: 'Excused', value: stats.excused, color: '#3b82f6' },
      { name: 'Absent', value: stats.absent, color: '#ef4444' },
      { name: 'No Record', value: stats.not_recorded, color: '#94a3b8' },
    ];
    return data.filter(d => d.value > 0);
  }, [stats]);

  // Filtered Events for Search
  const filteredEvents = useMemo(() => {
    if (!eventSearch) return events;
    return events.filter(e => e.title.toLowerCase().includes(eventSearch.toLowerCase()));
  }, [events, eventSearch]);

  const toggleEventSelection = (eventId: string) => {
    if (selectedEvents.includes(eventId)) {
      setSelectedEvents(selectedEvents.filter(id => id !== eventId));
    } else {
      setSelectedEvents([...selectedEvents, eventId]);
    }
  };

  // --- Export Logic ---
  const handleExportPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(14, 27, 66); // Brand color
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('RMC SSG Attendance Report', 14, 25);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 32);

    let yPos = 50;

    // Summary
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text('Attendance Summary', 14, yPos);
    yPos += 10;
    
    const summaryData = [
      ['Total Students', stats.total],
      ['Present', `${stats.present} (${((stats.present/stats.total)*100).toFixed(1)}%)`],
      ['Late', `${stats.late} (${((stats.late/stats.total)*100).toFixed(1)}%)`],
      ['Absent', `${stats.absent} (${((stats.absent/stats.total)*100).toFixed(1)}%)`],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [212, 175, 55] }, // Gold
    });

    yPos = (doc as any).lastAutoTable.finalY + 20;

    // Charts
    if (exportSettings.includeCharts && chartRef.current) {
      try {
        const canvas = await html2canvas(chartRef.current);
        const imgData = canvas.toDataURL('image/png');
        const imgProps = doc.getImageProperties(imgData);
        const pdfWidth = pageWidth - 28;
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        if (yPos + pdfHeight > doc.internal.pageSize.getHeight()) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.text('Visualization', 14, yPos - 5);
        doc.addImage(imgData, 'PNG', 14, yPos, pdfWidth, pdfHeight);
        yPos += pdfHeight + 20;
      } catch (e) {
        console.error("Chart export failed", e);
      }
    }

    // Detailed Table
    if (exportSettings.includeTables) {
      doc.addPage();
      doc.text('Detailed Records', 14, 20);
      
      const tableBody = attendanceData.map(r => [
        r.studentName,
        r.studentId,
        r.status.toUpperCase(),
        r.section,
        r.level,
        r.timeIn ? new Date(r.timeIn).toLocaleTimeString() : '-'
      ]);

      autoTable(doc, {
        startY: 30,
        head: [['Name', 'ID', 'Status', 'Section', 'Level', 'Time In']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [14, 27, 66] },
      });
    }

    doc.save('attendance_report.pdf');
    setShowExportModal(false);
  };

  const handleExportCSV = () => {
    const headers = ['Student Name', 'Student ID', 'Status', 'Section', 'Level', 'Time In'];
    const rows = attendanceData.map(r => [
      r.studentName,
      r.studentId,
      r.status,
      r.section,
      r.level,
      r.timeIn ? new Date(r.timeIn).toLocaleTimeString() : ''
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "attendance_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-in fade-in">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-900 dark:text-slate-100 uppercase tracking-tight">Attendance Dashboard</h1>
          <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest">Analytics & Reporting Module</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowExportModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-brand-800 transition-all shadow-lg">
            <Printer size={16} /> Export Report
          </button>
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-brand-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">
            <Download size={16} /> CSV
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
        <div className="flex items-center gap-2 text-brand-900 dark:text-slate-100 font-black uppercase tracking-widest text-xs border-b border-slate-100 dark:border-slate-700 pb-4">
          <Filter size={14} className="text-gold-500" /> Data Filters
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Event Selection - Smart Search */}
          <div className="space-y-1.5 relative">
             <CustomSelect 
               label="Event Scope"
               options={[
                 { value: 'all', label: 'All Events' },
                 ...events.map(ev => ({ value: ev.id, label: ev.title }))
               ]}
               value={selectedEvents.length === 0 ? 'all' : selectedEvents}
               onChange={(val) => {
                 if (val === 'all' || (Array.isArray(val) && val.length === 0)) setSelectedEvents([]);
                 else if (Array.isArray(val)) setSelectedEvents(val);
                 else setSelectedEvents([val]);
               }}
               multi={true}
               searchable={true}
               placeholder="Select Events..."
             />
          </div>

          {/* Time Filter */}
          <div className="space-y-1.5">
            <CustomSelect 
              label="Time Period"
              options={[
                { value: 'all', label: 'All Time' },
                { value: 'this_month', label: 'This Month' },
                { value: 'this_week', label: 'This Week' },
                { value: 'custom', label: 'Custom Range...' }
              ]}
              value={timeFilter}
              onChange={(val) => {
                const v = val as TimeFilter;
                setTimeFilter(v);
                if (v === 'custom') setShowTimeModal(true);
              }}
            />
          </div>

          {/* Level Filter */}
          <div className="space-y-1.5">
            <CustomSelect 
              label="Education Level"
              options={[
                { value: 'all', label: 'All Levels' },
                { value: 'tertiary', label: 'Tertiary (College)' },
                { value: 'secondary', label: 'Secondary (High School)' },
                { value: 'elementary', label: 'Elementary' }
              ]}
              value={filters.level}
              onChange={(val) => setFilters({...filters, level: val as LevelFilter})}
            />
          </div>
        </div>

        {/* Dynamic Sub-Filters */}
        {filters.level === 'tertiary' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
            <div className="space-y-1.5">
              <CustomSelect 
                label="College"
                options={[
                  { value: '', label: 'All Colleges' },
                  { value: 'cas', label: 'Arts & Sciences' },
                  { value: 'cba', label: 'Business Admin' },
                  { value: 'ccje', label: 'Criminal Justice' }
                ]}
                value={filters.college}
                onChange={(val) => setFilters({...filters, college: val as string})}
              />
            </div>
            <div className="space-y-1.5">
              <CustomSelect 
                label="Program"
                options={[
                  { value: '', label: 'All Programs' },
                  { value: 'bscs', label: 'BS Computer Science' },
                  { value: 'bsit', label: 'BS Info Tech' }
                ]}
                value={filters.program}
                onChange={(val) => setFilters({...filters, program: val as string})}
              />
            </div>
            <div className="space-y-1.5">
              <CustomSelect 
                label="Year Level"
                options={[
                  { value: '', label: 'All Years' },
                  { value: '1', label: '1st Year' },
                  { value: '2', label: '2nd Year' },
                  { value: '3', label: '3rd Year' },
                  { value: '4', label: '4th Year' }
                ]}
                value={filters.yearLevel}
                onChange={(val) => setFilters({...filters, yearLevel: val as string})}
              />
            </div>
          </div>
        )}

        {filters.level === 'secondary' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
            <div className="space-y-1.5">
              <CustomSelect 
                label="Type"
                options={[
                  { value: '', label: 'All Secondary' },
                  { value: 'shs', label: 'Senior High' },
                  { value: 'jhs', label: 'Junior High' }
                ]}
                value={filters.secondaryType}
                onChange={(val) => setFilters({...filters, secondaryType: val as any})}
              />
            </div>
            {filters.secondaryType === 'shs' && (
              <>
                <div className="space-y-1.5">
                  <CustomSelect 
                    label="Strand"
                    options={[
                      { value: '', label: 'All Strands' },
                      { value: 'stem', label: 'STEM' },
                      { value: 'abm', label: 'ABM' },
                      { value: 'humss', label: 'HUMSS' }
                    ]}
                    value={filters.strand}
                    onChange={(val) => setFilters({...filters, strand: val as string})}
                  />
                </div>
                <div className="space-y-1.5">
                  <CustomSelect 
                    label="Grade"
                    options={[
                      { value: '', label: 'All Grades' },
                      { value: '11', label: 'Grade 11' },
                      { value: '12', label: 'Grade 12' }
                    ]}
                    value={filters.gradeLevel}
                    onChange={(val) => setFilters({...filters, gradeLevel: val as string})}
                  />
                </div>
              </>
            )}
             {filters.secondaryType === 'jhs' && (
              <div className="space-y-1.5">
                <CustomSelect 
                  label="Grade"
                  options={[
                    { value: '', label: 'All Grades' },
                    { value: '7', label: 'Grade 7' },
                    { value: '8', label: 'Grade 8' },
                    { value: '9', label: 'Grade 9' },
                    { value: '10', label: 'Grade 10' }
                  ]}
                  value={filters.gradeLevel}
                  onChange={(val) => setFilters({...filters, gradeLevel: val as string})}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-950/60 text-green-600 dark:text-green-400 flex items-center justify-center mb-2">
            <CheckCircle size={20} />
          </div>
          <span className="text-2xl font-black text-brand-900 dark:text-slate-100">{stats.present}</span>
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Present</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-yellow-50 dark:bg-yellow-950/60 text-yellow-600 dark:text-yellow-400 flex items-center justify-center mb-2">
            <Clock size={20} />
          </div>
          <span className="text-2xl font-black text-brand-900 dark:text-slate-100">{stats.late}</span>
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Late</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2">
            <FileText size={20} />
          </div>
          <span className="text-2xl font-black text-brand-900 dark:text-slate-100">{stats.excused}</span>
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Excused</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mb-2">
            <XCircle size={20} />
          </div>
          <span className="text-2xl font-black text-brand-900 dark:text-slate-100">{stats.absent}</span>
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Absent</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center mb-2">
            <AlertCircle size={20} />
          </div>
          <span className="text-2xl font-black text-brand-900 dark:text-slate-100">{stats.not_recorded}</span>
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">No Record</span>
        </div>
      </div>

      {/* VISUALIZATION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black text-brand-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
              <PieChart size={14} className="text-gold-500" /> Data Visualization
            </h3>
            <div className="flex bg-slate-50 dark:bg-slate-900 p-1 rounded-lg border border-slate-100 dark:border-slate-700">
              {(['pie', 'donut', 'bar', 'column', 'line'] as ChartType[]).map(t => (
                <button 
                  key={t}
                  onClick={() => setChartType(t)}
                  className={`px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all ${chartType === t ? 'bg-white dark:bg-slate-800 text-brand-900 dark:text-slate-100 shadow-sm' : 'text-slate-400 hover:text-brand-900 dark:hover:text-slate-100'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-[400px] w-full" ref={chartRef}>
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'pie' || chartType === 'donut' ? (
                <RePieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={chartType === 'donut' ? 80 : 0}
                    outerRadius={140}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RePieChart>
              ) : chartType === 'bar' ? (
                <ReBarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#D4AF37" radius={[0, 4, 4, 0]} />
                </ReBarChart>
              ) : chartType === 'column' ? (
                <ReBarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#0E1B42" radius={[4, 4, 0, 0]} />
                </ReBarChart>
              ) : (
                <ReLineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke="#D4AF37" strokeWidth={3} dot={{ r: 6 }} />
                </ReLineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* RECENT RECORDS */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
          <h3 className="text-xs font-black text-brand-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2 mb-4">
            <Users size={14} className="text-gold-500" /> Recent Logs
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 max-h-[400px]">
            {attendanceData.slice(0, 10).map((record, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700/60">
                <div className={`w-2 h-10 rounded-full ${
                  record.status === 'present' ? 'bg-green-500' : 
                  record.status === 'late' ? 'bg-yellow-500' :
                  record.status === 'absent' ? 'bg-red-500' : 'bg-slate-300'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-brand-900 dark:text-slate-100 truncate">{record.studentName}</p>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider">{record.studentId}</p>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  {record.timeIn ? new Date(record.timeIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* EXPORT MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-brand-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border-2 border-gold-400 overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-brand-900 p-6 text-white border-b-2 border-gold-400 flex justify-between items-center">
               <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                 <Printer size={18} className="text-gold-400" /> Export Configuration
               </h3>
               <button onClick={() => setShowExportModal(false)} className="text-white/50 hover:text-white"><XCircle size={20} /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Group Data By</label>
                <select 
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-brand-900 dark:text-slate-100 outline-none focus:border-gold-400"
                  value={exportSettings.groupBy}
                  onChange={(e) => setExportSettings({...exportSettings, groupBy: e.target.value as any})}
                >
                  <option value="status">Attendance Status</option>
                  <option value="section">Section</option>
                  <option value="level">Level</option>
                  <option value="program">Program</option>
                </select>
              </div>
              
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-gold-400 transition-all">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 accent-gold-400"
                    checked={exportSettings.includeCharts}
                    onChange={(e) => setExportSettings({...exportSettings, includeCharts: e.target.checked})}
                  />
                  <span className="text-xs font-bold text-brand-900 dark:text-slate-100 uppercase tracking-wide">Include Visualizations</span>
                </label>
                <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-gold-400 transition-all">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 accent-gold-400"
                    checked={exportSettings.includeTables}
                    onChange={(e) => setExportSettings({...exportSettings, includeTables: e.target.checked})}
                  />
                  <span className="text-xs font-bold text-brand-900 dark:text-slate-100 uppercase tracking-wide">Include Detailed Tables</span>
                </label>
              </div>

              <button 
                onClick={handleExportPDF}
                className="w-full py-4 bg-gold-gradient text-brand-900 text-xs font-black rounded-xl uppercase tracking-widest shadow-lg hover:brightness-110 active:scale-95 transition-all"
              >
                Generate PDF Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM TIME MODAL */}
      {showTimeModal && (
        <div className="fixed inset-0 z-50 bg-brand-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl border-2 border-gold-400 overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-brand-900 p-6 text-white border-b-2 border-gold-400 flex justify-between items-center">
               <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                 <Calendar size={18} className="text-gold-400" /> Select Date Range
               </h3>
               <button onClick={() => setShowTimeModal(false)} className="text-white/50 hover:text-white"><XCircle size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Date</label>
                <input 
                  type="date" 
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-brand-900 dark:text-slate-100 outline-none focus:border-gold-400"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End Date</label>
                <input 
                  type="date" 
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-brand-900 dark:text-slate-100 outline-none focus:border-gold-400"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                />
              </div>
              <button 
                onClick={() => setShowTimeModal(false)}
                className="w-full py-4 bg-gold-gradient text-brand-900 text-xs font-black rounded-xl uppercase tracking-widest shadow-lg hover:brightness-110 active:scale-95 transition-all mt-4"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceDashboard;
