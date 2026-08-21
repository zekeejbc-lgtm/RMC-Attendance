
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../components/AuthContext';
import { mockData } from '../lib/mockBackend';
import { AppEvent } from '../types';
import CustomSelect from '../components/ui/CustomSelect';
import { 
  Filter, Calendar, Download, PieChart,
  Users, CheckCircle, XCircle, Clock, AlertCircle, FileText, 
  Printer
} from 'lucide-react';
import { 
  PieChart as RePieChart, Pie, Cell, BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart as ReLineChart, Line
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import Button from '../components/ui/Button';
import { MetricCard, Page, PageHeader, Surface } from '../components/ui/Page';
import { Modal } from '../components/ui/Modal';

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

const statusClasses: Record<AttendanceRecord['status'], string> = {
  present: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  late: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  excused: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  absent: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  not_recorded: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200',
};

const formatStatus = (status: AttendanceRecord['status']) =>
  status === 'not_recorded' ? 'No Record' : `${status.charAt(0).toUpperCase()}${status.slice(1)}`;

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
  const { isMock, profile } = useAuth();
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
      setEvents(profile && typeof mockData.getVisibleEvents === 'function' ? mockData.getVisibleEvents(profile.uid) : mockData.getEvents());
    }
  }, [isMock, profile]);

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
    <Page className="max-w-[1600px] animate-in fade-in">
      <PageHeader
        actions={(
          <>
            <Button aria-label="Export report" className="sm:w-auto" onClick={() => setShowExportModal(true)} size="sm">
              <Printer size={16} /> Export
            </Button>
            <Button className="sm:w-auto dark:border-slate-600 dark:bg-slate-800 dark:text-white" onClick={handleExportCSV} size="sm" variant="secondary">
              <Download size={16} /> CSV
            </Button>
          </>
        )}
        className="flex-col sm:flex-row"
        description="Analytics & Reporting Module"
        eyebrow="Attendance Administration"
        title="Attendance Dashboard"
      />

      <Surface aria-label="Attendance filters" className="space-y-5 p-4 sm:p-6">
        <h2 id="attendance-filters-heading" className="flex items-center gap-2 border-b border-slate-200 pb-4 text-xs font-black uppercase tracking-widest text-brand-900 dark:border-slate-700 dark:text-white">
          <Filter size={14} className="text-gold-500" /> Data Filters
        </h2>
        <div className="flex flex-wrap gap-4 [&>*]:min-w-0 [&>*]:basis-full sm:[&>*]:basis-[calc(50%-0.5rem)] xl:[&>*]:basis-[calc(25%-0.75rem)]">
          <CustomSelect
            label="Event Scope"
            multi
            onChange={(value) => {
              if (Array.isArray(value)) setSelectedEvents(value);
              else setSelectedEvents([value]);
            }}
            options={events.map((event) => ({ value: event.id, label: event.title }))}
            placeholder="All Events"
            searchable
            value={selectedEvents}
          />
          <CustomSelect
            label="Time Period"
            onChange={(value) => {
              const nextFilter = value as TimeFilter;
              setTimeFilter(nextFilter);
              if (nextFilter === 'custom') setShowTimeModal(true);
            }}
            options={[
              { value: 'all', label: 'All Time' },
              { value: 'this_month', label: 'This Month' },
              { value: 'this_week', label: 'This Week' },
              { value: 'custom', label: 'Custom Range...' },
            ]}
            value={timeFilter}
          />
          <CustomSelect
            label="Education Level"
            onChange={(value) => setFilters({ ...filters, level: value as LevelFilter })}
            options={[
              { value: 'all', label: 'All Levels' },
              { value: 'tertiary', label: 'Tertiary (College)' },
              { value: 'secondary', label: 'Secondary (High School)' },
              { value: 'elementary', label: 'Elementary' },
            ]}
            value={filters.level}
          />
        </div>

        {filters.level === 'tertiary' ? (
          <div className="flex flex-wrap gap-4 animate-in fade-in slide-in-from-top-2 [&>*]:min-w-0 [&>*]:basis-full sm:[&>*]:basis-[calc(50%-0.5rem)] xl:[&>*]:basis-[calc(25%-0.75rem)]">
            <CustomSelect label="College" onChange={(value) => setFilters({ ...filters, college: value as string })} options={[{ value: '', label: 'All Colleges' }, { value: 'cas', label: 'Arts & Sciences' }, { value: 'cba', label: 'Business Admin' }, { value: 'ccje', label: 'Criminal Justice' }]} value={filters.college} />
            <CustomSelect label="Program" onChange={(value) => setFilters({ ...filters, program: value as string })} options={[{ value: '', label: 'All Programs' }, { value: 'bscs', label: 'BS Computer Science' }, { value: 'bsit', label: 'BS Info Tech' }]} value={filters.program} />
            <CustomSelect label="Year Level" onChange={(value) => setFilters({ ...filters, yearLevel: value as string })} options={[{ value: '', label: 'All Years' }, { value: '1', label: '1st Year' }, { value: '2', label: '2nd Year' }, { value: '3', label: '3rd Year' }, { value: '4', label: '4th Year' }]} value={filters.yearLevel} />
          </div>
        ) : null}

        {filters.level === 'secondary' ? (
          <div className="flex flex-wrap gap-4 animate-in fade-in slide-in-from-top-2 [&>*]:min-w-0 [&>*]:basis-full sm:[&>*]:basis-[calc(50%-0.5rem)] xl:[&>*]:basis-[calc(25%-0.75rem)]">
            <CustomSelect label="Type" onChange={(value) => setFilters({ ...filters, secondaryType: value as FilterState['secondaryType'] })} options={[{ value: '', label: 'All Secondary' }, { value: 'shs', label: 'Senior High' }, { value: 'jhs', label: 'Junior High' }]} value={filters.secondaryType} />
            {filters.secondaryType === 'shs' ? (
              <>
                <CustomSelect label="Strand" onChange={(value) => setFilters({ ...filters, strand: value as string })} options={[{ value: '', label: 'All Strands' }, { value: 'stem', label: 'STEM' }, { value: 'abm', label: 'ABM' }, { value: 'humss', label: 'HUMSS' }]} value={filters.strand} />
                <CustomSelect label="Grade" onChange={(value) => setFilters({ ...filters, gradeLevel: value as string })} options={[{ value: '', label: 'All Grades' }, { value: '11', label: 'Grade 11' }, { value: '12', label: 'Grade 12' }]} value={filters.gradeLevel} />
              </>
            ) : null}
            {filters.secondaryType === 'jhs' ? (
              <CustomSelect label="Grade" onChange={(value) => setFilters({ ...filters, gradeLevel: value as string })} options={[{ value: '', label: 'All Grades' }, { value: '7', label: 'Grade 7' }, { value: '8', label: 'Grade 8' }, { value: '9', label: 'Grade 9' }, { value: '10', label: 'Grade 10' }]} value={filters.gradeLevel} />
            ) : null}
          </div>
        ) : null}
      </Surface>

      <div aria-label="Attendance summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard detail={`${stats.total} total students`} icon={<CheckCircle size={22} />} label="Present" value={stats.present} />
        <MetricCard icon={<Clock size={22} />} label="Late" value={stats.late} />
        <MetricCard icon={<FileText size={22} />} label="Excused" value={stats.excused} />
        <MetricCard icon={<XCircle size={22} />} label="Absent" value={stats.absent} />
        <MetricCard icon={<AlertCircle size={22} />} label="No Record" value={stats.not_recorded} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Surface className="min-w-0 p-4 sm:p-6 lg:col-span-2">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand-900 dark:text-white">
              <PieChart size={14} className="text-gold-500" /> Data Visualization
            </h2>
            <div aria-label="Chart type" className="flex max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900" role="group">
              {(['pie', 'donut', 'bar', 'column', 'line'] as ChartType[]).map((type) => (
                <button aria-pressed={chartType === type} className={`shrink-0 rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-widest ${chartType === type ? 'bg-white text-brand-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 dark:text-slate-300'}`} key={type} onClick={() => setChartType(type)} type="button">
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div aria-label="Attendance visualization" className="h-64 min-h-64 min-w-0 w-full sm:h-72 sm:min-h-72" ref={chartRef} role="region">
            <ResponsiveContainer height="100%" initialDimension={{ width: 1, height: 256 }} minHeight={256} minWidth={0} width="100%">
              {chartType === 'pie' || chartType === 'donut' ? (
                <RePieChart>
                  <Pie data={chartData} dataKey="value" innerRadius={chartType === 'donut' ? 52 : 0} outerRadius={90} paddingAngle={2}>
                    {chartData.map((entry, index) => <Cell fill={entry.color} key={`cell-${index}`} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </RePieChart>
              ) : chartType === 'bar' ? (
                <ReBarChart data={chartData} layout="vertical"><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis type="number" /><YAxis dataKey="name" type="category" width={80} /><Tooltip /><Legend /><Bar dataKey="value" fill="#D4AF37" radius={[0, 4, 4, 0]} /></ReBarChart>
              ) : chartType === 'column' ? (
                <ReBarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="value" fill="#0E1B42" radius={[4, 4, 0, 0]} /></ReBarChart>
              ) : (
                <ReLineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Line dataKey="value" dot={{ r: 5 }} stroke="#D4AF37" strokeWidth={3} type="monotone" /></ReLineChart>
              )}
            </ResponsiveContainer>
          </div>
        </Surface>

        <Surface className="flex min-w-0 flex-col p-4 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand-900 dark:text-white"><Users size={14} className="text-gold-500" /> Recent Logs</h2>
          <div className="max-h-72 flex-1 space-y-3 overflow-y-auto pr-1">
            {attendanceData.slice(0, 10).map((record) => (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900" key={record.studentId}>
                <span aria-hidden="true" className={`h-10 w-2 shrink-0 rounded-full ${record.status === 'present' ? 'bg-emerald-500' : record.status === 'late' ? 'bg-amber-500' : record.status === 'absent' ? 'bg-red-500' : 'bg-slate-300'}`} />
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-brand-900 dark:text-white">{record.studentName}</p><p className="text-[10px] uppercase tracking-wider text-slate-500">{record.studentId}</p></div>
                <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-slate-500">{record.timeIn ? new Date(record.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
              </div>
            ))}
          </div>
        </Surface>
      </div>

      <Surface aria-labelledby="attendance-records-heading" className="overflow-hidden">
        <div className="border-b border-slate-200 p-4 dark:border-slate-700 sm:p-6">
          <h2 id="attendance-records-heading" className="text-sm font-black uppercase tracking-widest text-brand-900 dark:text-white">Detailed Attendance Records</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{attendanceData.length} student attendance entries</p>
        </div>
        <div className="desktop-data-table overflow-x-auto">
          <table aria-label="Attendance records" className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-900 dark:text-slate-300"><tr><th className="px-5 py-3">Student</th><th className="px-5 py-3">ID</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Section</th><th className="px-5 py-3">Level</th><th className="px-5 py-3">Time In</th></tr></thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {attendanceData.map((record) => <tr key={record.studentId}><td className="px-5 py-3 font-semibold text-brand-900 dark:text-white">{record.studentName}</td><td className="px-5 py-3 font-mono text-xs text-slate-500">{record.studentId}</td><td className="px-5 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusClasses[record.status]}`}>{formatStatus(record.status)}</span></td><td className="px-5 py-3 text-slate-600 dark:text-slate-300">{record.section}</td><td className="px-5 py-3 text-slate-600 dark:text-slate-300">{record.level}</td><td className="px-5 py-3 text-slate-600 dark:text-slate-300">{record.timeIn ? new Date(record.timeIn).toLocaleTimeString() : '-'}</td></tr>)}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 p-4 md:hidden">
          {attendanceData.map((record) => (
            <article aria-label={`${record.studentName} attendance record`} className="mobile-data-card rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900" key={record.studentId}>
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-bold text-brand-900 dark:text-white">{record.studentName}</h3><p className="font-mono text-xs text-slate-500">{record.studentId}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${statusClasses[record.status]}`}>{formatStatus(record.status)}</span></div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><dt className="font-semibold text-slate-500">Section</dt><dd className="mt-0.5 text-slate-800 dark:text-slate-200">{record.section}</dd></div><div><dt className="font-semibold text-slate-500">Level</dt><dd className="mt-0.5 text-slate-800 dark:text-slate-200">{record.level}</dd></div><div className="col-span-2"><dt className="font-semibold text-slate-500">Time In</dt><dd className="mt-0.5 text-slate-800 dark:text-slate-200">{record.timeIn ? new Date(record.timeIn).toLocaleTimeString() : '-'}</dd></div></dl>
            </article>
          ))}
        </div>
      </Surface>

      <Modal
        footer={<Button aria-label="Generate PDF report" className="sm:w-auto" onClick={handleExportPDF} variant="gold"><Printer size={16} /> PDF</Button>}
        onClose={() => setShowExportModal(false)}
        open={showExportModal}
        size="sm"
        title="Export Configuration"
      >
        <div className="space-y-5">
          <CustomSelect ariaLabel="Group data by" combobox label="Group Data By" onChange={(value) => setExportSettings({ ...exportSettings, groupBy: value as typeof exportSettings.groupBy })} options={[{ value: 'status', label: 'Attendance Status' }, { value: 'section', label: 'Section' }, { value: 'level', label: 'Level' }, { value: 'program', label: 'Program' }]} value={exportSettings.groupBy} />
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900"><input checked={exportSettings.includeCharts} className="h-4 w-4 accent-gold-500" onChange={(event) => setExportSettings({ ...exportSettings, includeCharts: event.target.checked })} type="checkbox" /><span className="text-sm font-bold text-brand-900 dark:text-white">Include Visualizations</span></label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900"><input checked={exportSettings.includeTables} className="h-4 w-4 accent-gold-500" onChange={(event) => setExportSettings({ ...exportSettings, includeTables: event.target.checked })} type="checkbox" /><span className="text-sm font-bold text-brand-900 dark:text-white">Include Detailed Tables</span></label>
        </div>
      </Modal>

      <Modal footer={<Button aria-label="Apply range" className="sm:w-auto" onClick={() => setShowTimeModal(false)} variant="gold">Apply</Button>} onClose={() => setShowTimeModal(false)} open={showTimeModal} size="sm" title="Select Date Range">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300" htmlFor="attendance-start-date">Start Date</label><input className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-brand-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" id="attendance-start-date" onChange={(event) => setDateRange({ ...dateRange, start: event.target.value })} type="date" value={dateRange.start} /></div>
          <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300" htmlFor="attendance-end-date">End Date</label><input className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-brand-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" id="attendance-end-date" onChange={(event) => setDateRange({ ...dateRange, end: event.target.value })} type="date" value={dateRange.end} /></div>
        </div>
      </Modal>
    </Page>
  );
};

export default AttendanceDashboard;
