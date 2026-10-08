import { formatManilaDate, formatManilaTime, formatManilaDateTime } from '../lib/dateTime';
import { Modal } from '../components/ui/Modal';
import { AppEvent } from '../types';
import { attendanceWindowTitle, eventDisplayTitle } from '../lib/eventGroups';
import { toast } from '../lib/toast';
import { appData } from '../lib/backend';
import React, { useState, useMemo } from 'react';
import { useAuth } from '../components/AuthContext';
import { 
  FileText, Filter, CheckCircle2, Clock, XCircle, FileSpreadsheet,
  Download, ShieldAlert, Award, Calendar, AlertCircle, ArrowUpRight, Sparkles
} from 'lucide-react';
import Button from '../components/ui/Button';
import { MetricCard, Page, PageHeader, Surface } from '../components/ui/Page';
import CustomSelect from '../components/ui/CustomSelect';
import SearchInput from '../components/ui/SearchInput';

interface AttendanceRecord {
  id: string;
  title: string;
  category: 'Event' | 'Ceremony';
  date: string;
  timeIn: string;
  status: 'present' | 'late' | 'absent' | 'excused';
  scannedBy: string;
  sanctionIncurred?: number; // hours
  event?: AppEvent;
  slot: string;
  timeOut: string;
  recordedAt: string;
  renderedHours?: number;
  deductedHours?: number;
  meritHours?: number;
  completionPending?: boolean;
}

interface SanctionEntry {
  id: string;
  reason: string;
  hours: number;
  dateAssigned: string;
  status: 'active' | 'resolved' | 'waived';
  approvedBy: string;
  assignedAt: string;
}

const StudentRecords: React.FC = () => {
  const { profile, revision, stats: userStats } = useAuth();
  const activityCredits = useMemo(() => appData.getAttendanceRecords(profile?.uid || '').filter(r => ['service', 'merit'].includes(r.event?.kind || '')), [profile?.uid, revision]);
  const records: AttendanceRecord[] = useMemo(() => appData.getAttendanceRecords(profile?.uid || '').map(r => ({
    id: r.id, title: r.event ? [eventDisplayTitle(r.event, appData.getEvents()), attendanceWindowTitle(r.event, r.slot)].filter(Boolean).join(' / ') : 'Archived event', category: r.event?.kind === 'flag_ceremony' ? 'Ceremony' : 'Event',
    date: /^\d{4}-\d{2}-\d{2}/.test(r.slot) ? r.slot.split(':')[0] : formatManilaDate(r.event?.startTime || r.time_in || r.recorded_at),
    timeIn: r.time_in ? formatManilaTime(r.time_in) : 'Not recorded', status: r.status, scannedBy: r.scanned_by_name || 'System',
    event: r.event, slot: r.slot, timeOut: r.time_out ? formatManilaDateTime(r.time_out) : 'Not recorded',
    recordedAt: r.recorded_at ? formatManilaDateTime(r.recorded_at) : 'Not recorded',
    renderedHours: r.rendered_hours, deductedHours: r.deducted_hours, meritHours: r.merit_earned_hours,
    completionPending: r.completion_pending,
  })), [profile?.uid, revision]);
  const sanctions: SanctionEntry[] = (appData.getUserDetail(profile?.uid || '')?.sanction_logs || []).map(s => ({
    id: s.id, reason: s.reason, hours: s.change, dateAssigned: formatManilaDate(s.timestamp),
    status: s.change < 0 ? 'resolved' : 'active', approvedBy: s.performed_by,
    assignedAt: formatManilaDateTime(s.timestamp),
  }));

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedSanctionId, setSelectedSanctionId] = useState<string | null>(null);
  const selectedRecord = records.find(record => record.id === selectedRecordId);
  const selectedSanction = sanctions.find(sanction => sanction.id === selectedSanctionId);

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const matchesSearch = record.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            record.scannedBy.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' ? true : record.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' ? true : record.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [searchTerm, statusFilter, categoryFilter, records]);

  // Statistics
  const stats = useMemo(() => {
    const presentCount = records.filter(r => r.status === 'present').length;
    const lateCount = records.filter(r => r.status === 'late').length;
    const absentCount = records.filter(r => r.status === 'absent').length;
    const excusedCount = records.filter(r => r.status === 'excused').length;
    const total = records.length;
    const rate = total ? Math.round(((presentCount + lateCount + excusedCount) / total) * 100) : 0;
    const totalSanctionHours = userStats?.sanction_hours || 0;
    return { presentCount, lateCount, absentCount, excusedCount, rate, totalSanctionHours };
  }, [records, revision]);

  const [exporting, setExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!profile || exporting) return;
    setExporting(true);
    const progress = toast.start('Export PDF', ['Preparing transcript', 'Creating PDF']);
    try {
      const { downloadAttendanceTranscript } = await import('../lib/attendanceTranscript');
      progress.step(1);
      await downloadAttendanceTranscript({
        student: {
          name: profile.name, id: profile.student_id || '',
          department: profile.school_data?.department || '',
          section: profile.school_data?.section || '',
        },
        attendanceRate: stats.rate,
        sanctionHours: stats.totalSanctionHours,
        records,
        sanctions,
      });
      progress.complete('PDF download started');
    } catch (error) {
      progress.fail(error, 'Could not export the PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Page className="max-w-6xl animate-in fade-in duration-fast">
      
      {/* HEADER & PDF EXPORT */}
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-1.5"><FileText size={14} /> Verified History</span>}
        title="Attendance & Sanction Records"
        description="Consolidated attendance history for mandatory campus events, ceremonies, and sanction hour balances."
        actions={
          <div className="w-[calc(100vw-2rem)] max-w-full sm:w-auto">
            <Button onClick={handleExportPDF} disabled={exporting || !profile} className="border border-gold-400/30 uppercase tracking-wider sm:w-auto">
              <Download size={15} className="text-gold-400" /> {exporting ? 'Preparing PDF...' : 'Export PDF'}
            </Button>
          </div>
        }
      />

      {/* KPI METRICS OVERVIEW */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Attendance summary">
        <MetricCard icon={<CheckCircle2 size={20} />} label="Attendance Rate" value={`${stats.rate}%`} detail="Present, late, and excused" />
        <MetricCard icon={<Clock size={20} />} label="Late Check-Ins" value={stats.lateCount} detail="Recorded tardy arrivals" />
        <MetricCard icon={<XCircle size={20} />} label="Unexcused Absences" value={stats.absentCount} detail="Attendance violations" />
        <MetricCard icon={<ShieldAlert size={20} />} label="Active Sanctions" value={`${stats.totalSanctionHours} Hours`} detail="Community service balance" />
      </div>

      {/* SEARCH AND FILTERS */}
      <MetricCard icon={<Award size={20} />} label="Earned Merit" value={`${(userStats?.merit_hours || 0).toFixed(2)} Hours`} detail="Saved credit remaining after activity awards clear existing sanctions. This is separate from your sanction balance." />
      {activityCredits.length > 0 && <Surface className="overflow-hidden p-4">
        <h2 className="mb-3 text-lg font-bold">Service and merit credits</h2>
        <p className="mb-3 text-sm text-slate-500">Completed sessions show actual rendered time, sanctions cleared, and any earned merit. Pending sessions earn no credit.</p>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Activity / session</th><th className="p-2">Rendered hours</th><th className="p-2">Sanctions cleared</th><th className="p-2">Merit earned</th></tr></thead><tbody>{activityCredits.map(r => <tr key={r.id} className="border-t"><td className="p-2">{r.event?.title}<span className="block text-xs text-slate-500">{r.slot}{!r.time_out ? ' - awaiting scan-out' : r.completion_pending ? ' - fixed merit pending completion' : ''}</span></td><td className="p-2">{Number(r.rendered_hours || 0).toFixed(2)}</td><td className="p-2">{Number(r.deducted_hours || 0).toFixed(2)}</td><td className="p-2">{Number(r.merit_earned_hours || 0).toFixed(2)}</td></tr>)}</tbody></table></div>
      </Surface>}
      <Surface className="flex flex-col items-stretch justify-between gap-3 p-4 md:flex-row md:items-center">
        <SearchInput ariaLabel="Search attendance records" className="flex-1" onChange={setSearchTerm} placeholder="Search event/ceremony title..." value={searchTerm} />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <CustomSelect ariaLabel="Filter by category" combobox label="Category" onChange={(value) => setCategoryFilter(value as string)} options={[{ value: 'all', label: 'All Categories' }, { value: 'Event', label: 'Events Only' }, { value: 'Ceremony', label: 'Ceremonies Only' }]} value={categoryFilter} />
          <CustomSelect ariaLabel="Filter by status" combobox label="Status" onChange={(value) => setStatusFilter(value as string)} options={[{ value: 'all', label: 'All Statuses' }, { value: 'present', label: 'Present' }, { value: 'late', label: 'Late' }, { value: 'absent', label: 'Absent' }, { value: 'excused', label: 'Excused' }]} value={statusFilter} />
        </div>
      </Surface>

      {/* ATTENDANCE RECORDS TABLE */}
      <Surface className="overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <h2 className="text-sm font-black text-brand-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
            <Calendar size={18} className="text-gold-600 dark:text-gold-400" /> Attendance Ledger ({filteredRecords.length})
          </h2>
        </div>

        <div className="mobile-data-card space-y-3 p-4" aria-label="Mobile attendance ledger">
          {filteredRecords.map(record => (
            <article
              key={record.id}
              aria-labelledby={`mobile-record-${record.id}`}
              role="button" tabIndex={0} aria-haspopup="dialog"
              onClick={() => setSelectedRecordId(record.id)}
              onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedRecordId(record.id); } }}
              className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:border-gold-500 focus-visible:outline-gold-500 dark:border-slate-700 dark:bg-slate-900/60"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <time className="font-mono text-sm font-bold text-slate-500 dark:text-slate-400" dateTime={record.date}>{record.date}</time>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${
                  record.status === 'present' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-400' :
                  record.status === 'late' ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/60 dark:text-amber-400' :
                  record.status === 'absent' ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800/60 dark:bg-red-950/60 dark:text-red-400' :
                  'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/60 dark:text-blue-400'
                }`}>
                  {record.status === 'present' && <CheckCircle2 size={12} />}
                  {record.status === 'late' && <Clock size={12} />}
                  {record.status === 'absent' && <XCircle size={12} />}
                  {record.status === 'excused' && <FileText size={12} />}
                  {record.status === 'absent' ? 'Unexcused' : record.status}
                </span>
              </div>
              <div className="mt-3">
                <h3 id={`mobile-record-${record.id}`} className="text-sm font-black uppercase tracking-tight text-brand-900 dark:text-slate-100">{record.title}</h3>
                <p className="mt-1 text-xs font-bold text-gold-700 dark:text-gold-300">{record.category}</p>
              </div>
              <dl className="mt-3 grid gap-2 border-t border-slate-200 pt-3 text-xs dark:border-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <dt className="font-semibold text-slate-500 dark:text-slate-400">Time-In</dt>
                  <dd className="font-mono font-bold text-slate-700 dark:text-slate-200">{record.timeIn}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 font-semibold text-slate-500 dark:text-slate-400">Verified By</dt>
                  <dd className="min-w-0 text-right font-medium text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300">{record.scannedBy}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs font-semibold text-gold-700 dark:text-gold-300">View details <ArrowUpRight size={12} className="inline" /></p>
            </article>
          ))}
          {filteredRecords.length === 0 ? <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">No attendance records match these filters.</p> : null}
        </div>

        <div className="desktop-data-table overflow-x-auto">
          <table className="w-full border-collapse text-left" aria-label="Attendance ledger">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/50 dark:bg-slate-900/30">
                <th className="p-4 pl-6">Date</th>
                <th className="p-4">Activity Title</th>
                <th className="p-4">Type</th>
                <th className="p-4">Time-In</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6">Verified By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
              {filteredRecords.map(record => (
                <tr key={record.id} onClick={() => setSelectedRecordId(record.id)} className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors">
                  <td className="p-4 pl-6 font-mono font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">{record.date}</td>
                  <td className="p-4 font-black text-brand-900 dark:text-slate-100 uppercase tracking-tight"><button type="button" aria-haspopup="dialog" className="text-left hover:underline focus-visible:outline-gold-500" onClick={event => { event.stopPropagation(); setSelectedRecordId(record.id); }}>{record.title}<span className="mt-1 block text-[10px] font-semibold text-gold-700 dark:text-gold-300">View details</span></button></td>
                  <td className="p-4 whitespace-nowrap">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                      {record.category}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">{record.timeIn}</td>
                  <td className="p-4 whitespace-nowrap">
                    {record.status === 'present' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 size={12} /> Present
                      </span>
                    )}
                    {record.status === 'late' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-2.5 py-0.5 rounded-full">
                        <Clock size={12} /> Late
                      </span>
                    )}
                    {record.status === 'absent' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/60 px-2.5 py-0.5 rounded-full">
                        <XCircle size={12} /> Unexcused
                      </span>
                    )}
                    {record.status === 'excused' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 px-2.5 py-0.5 rounded-full">
                        <FileText size={12} /> Excused
                      </span>
                    )}
                  </td>
                  <td className="p-4 pr-6 text-slate-500 dark:text-slate-400 font-medium text-[11px] whitespace-nowrap">{record.scannedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Surface>

      {/* SANCTION RECORDS SECTION */}
      <Surface className="overflow-hidden">
        <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-200 bg-red-50/50 p-5 dark:border-slate-700 dark:bg-red-950/30 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <ShieldAlert size={20} className="text-red-600 dark:text-red-400" />
            <h2 className="text-sm font-black text-red-900 dark:text-red-300 uppercase tracking-widest">Sanctions & Demerits Ledger</h2>
          </div>
          <span className="text-xs font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/50 px-3 py-1 rounded-full">
            Active Balance: {stats.totalSanctionHours} Hours
          </span>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sanctions.map(sanc => (
              <div 
                key={sanc.id}
                role="button" tabIndex={0} aria-haspopup="dialog" aria-label={`View sanction details: ${sanc.reason}`}
                onClick={() => setSelectedSanctionId(sanc.id)}
                onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedSanctionId(sanc.id); } }}
                className={`cursor-pointer p-5 rounded-2xl border hover:border-gold-500 focus-visible:outline-gold-500 ${
                  sanc.status === 'active' ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50' : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-md ${
                    sanc.status === 'active' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                  }`}>
                    {sanc.status}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{sanc.dateAssigned}</span>
                </div>

                <h4 className="text-xs font-black text-brand-900 dark:text-slate-100 uppercase tracking-tight">{sanc.reason}</h4>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-2">
                  Impact: <span className={sanc.hours > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                    {sanc.hours > 0 ? `+${sanc.hours} Hours` : `${sanc.hours} Hours`}
                  </span>
                </p>

                <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium mt-1">Authorized by: {sanc.approvedBy}</p>
                <p className="mt-3 text-xs font-semibold text-gold-700 dark:text-gold-300">View details</p>
              </div>
            ))}
          </div>
        </div>
      </Surface>

      <Modal open={Boolean(selectedRecord)} onClose={() => setSelectedRecordId(null)} title="Attendance details" description="All times are in Manila local time (UTC+8)." size="lg">
        {selectedRecord && <div className="space-y-5 text-sm">
          <div><h3 className="font-bold text-brand-900 dark:text-white">{selectedRecord.title}</h3><p className="mt-1 capitalize text-slate-500">{selectedRecord.category} · {selectedRecord.status}</p></div>
          <dl className="grid gap-4 sm:grid-cols-2">
            {[
              ['Attendance date', selectedRecord.date], ['Time-In', selectedRecord.timeIn],
              ['Time-Out', selectedRecord.timeOut], ['Verified by', selectedRecord.scannedBy],
              ['Recorded at', selectedRecord.recordedAt],
              ['Session', selectedRecord.event ? attendanceWindowTitle(selectedRecord.event, selectedRecord.slot) || 'Default session' : selectedRecord.slot],
              ['Event starts', selectedRecord.event ? formatManilaDateTime(selectedRecord.event.startTime) : 'Unavailable'],
              ['Event ends', selectedRecord.event ? formatManilaDateTime(selectedRecord.event.endTime) : 'Unavailable'],
              ['Location', selectedRecord.event?.venue || 'Not specified'],
              ...(selectedRecord.renderedHours != null ? [['Rendered hours', Number(selectedRecord.renderedHours).toFixed(2)]] : []),
              ...(selectedRecord.deductedHours != null ? [['Sanctions cleared', `${Number(selectedRecord.deductedHours).toFixed(2)} hours`]] : []),
              ...(selectedRecord.meritHours != null ? [['Merit earned', `${Number(selectedRecord.meritHours).toFixed(2)} hours`]] : []),
            ].map(([label, value]) => <div key={label}><dt className="font-semibold text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 break-words text-slate-800 dark:text-slate-100">{value}</dd></div>)}
          </dl>
          {selectedRecord.event?.description && <div><h4 className="font-semibold">Activity description</h4><p className="mt-1 whitespace-pre-line text-slate-600 dark:text-slate-300">{selectedRecord.event.description}</p></div>}
          {selectedRecord.completionPending && <p role="status" className="rounded-xl bg-amber-50 p-3 text-amber-800 dark:bg-amber-950 dark:text-amber-200">Merit is pending activity completion.</p>}
        </div>}
      </Modal>
      <Modal open={Boolean(selectedSanction)} onClose={() => setSelectedSanctionId(null)} title="Sanction details" description="All times are in Manila local time (UTC+8)." size="md">
        {selectedSanction && <dl className="grid gap-4 text-sm">{[
          ['Reason', selectedSanction.reason], ['Assigned at', selectedSanction.assignedAt],
          ['Impact', `${selectedSanction.hours > 0 ? '+' : ''}${selectedSanction.hours} hours`],
          ['Status', selectedSanction.status], ['Authorized by', selectedSanction.approvedBy || 'System'],
        ].map(([label, value]) => <div key={label}><dt className="font-semibold text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 break-words text-slate-800 dark:text-slate-100">{value}</dd></div>)}</dl>}
      </Modal>
    </Page>
  );
};

export default StudentRecords;
