import React, { useEffect, useState } from 'react';
import { SchoolNode } from '../../types';
import { appData } from '../../lib/backend';
import { Modal } from '../ui/Modal';
import Button from '../ui/Button';
import CustomSelect from '../ui/CustomSelect';
import { assignmentLabel, csvText, downloadTransferFile, exportTransferWorkbook, parseTransferCsv, readTransferWorkbook, sortedTransferStudents, StudentTransfer, TransferStudent, TRANSFER_COLUMNS, transferDestinations, transferExportRows, validateTransferRecords } from '../../lib/studentTransfers';

export default function StudentTransferModal({ nodes, initialNodeId, onClose }: { nodes: SchoolNode[]; initialNodeId?: string; onClose: () => void }) {
  const [students, setStudents] = useState<TransferStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [source, setSource] = useState(initialNodeId || 'all');
  const [destination, setDestination] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<StudentTransfer[]>([]);
  const [page, setPage] = useState(0);
  const destinations = transferDestinations(nodes).sort((a, b) => assignmentLabel(nodes, a.id).localeCompare(assignmentLabel(nodes, b.id), undefined, { numeric: true }));
  useEffect(() => {
    let active = true;
    appData.getTransferRoster().then(data => { if (active) setStudents(data); }).catch(e => { if (active) setError(e.message || 'Could not load students.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const filtered = sortedTransferStudents(students, nodes).filter(s => (source === 'all' || s.node_id === source) && `${s.name} ${s.student_id}`.toLowerCase().includes(search.toLowerCase()));
  const displayed = filtered.slice(page * 50, (page + 1) * 50);
  const perform = async (task: () => Promise<void>) => {
    setBusy(true); setError(''); setMessage('');
    try { await task(); } catch (e) { setError(e instanceof Error ? e.message : 'The operation failed.'); } finally { setBusy(false); }
  };
  const toggle = (uid: string) => setSelected(previous => { const next = new Set(previous); next.has(uid) ? next.delete(uid) : next.add(uid); return next; });
  const prepare = () => {
    setError(''); setMessage('');
    try {
      const rows = students.filter(s => selected.has(s.uid)).map(s => [s.student_id, s.node_id, destination]);
      setPreview(validateTransferRecords([['student_id', 'source_node_id', 'destination_node_id'], ...rows], students, nodes));
    } catch (e) { setError((e as Error).message); }
  };
  const apply = () => perform(async () => {
    const count = await appData.transferStudents(preview);
    // Clear the submitted preview immediately so a refresh failure cannot cause resubmission.
    setPreview([]); setSelected(new Set()); setMessage(`${count} student${count === 1 ? '' : 's'} transferred.`);
    setLoading(true);
    try { setStudents(await appData.getTransferRoster()); } finally { setLoading(false); }
  });
  return <Modal open onClose={() => { if (!busy) onClose(); }} title="Transfer students" size="xl" description="Transfer, move up, or move down students by choosing their destination class. Attendance records and balances stay with each student.">
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Export all students in your assigned scope, grouped by institutional unit and class. Edit only destination_node_id using the legend, then import and review. Transferred mayors become students; appoint a mayor separately in the new class. Maximum 1,000 changes per batch.</p>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{error}</p>}
      {message && <p role="status" className="text-sm text-emerald-600 dark:text-emerald-300">{message}</p>}
      <fieldset disabled={busy || loading} className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" className="w-auto" onClick={() => perform(() => exportTransferWorkbook(students, nodes))}>Export workbook (with tabs)</Button>
        <Button variant="secondary" className="w-auto" onClick={() => downloadTransferFile(csvText([[...TRANSFER_COLUMNS], ...transferExportRows(students, nodes)]), 'student-transfers.csv', 'text/csv;charset=utf-8')}>Export students CSV</Button>
        <Button variant="secondary" className="w-auto" onClick={() => downloadTransferFile(csvText([['destination_node_id', 'institutional_unit / class'], ...destinations.map(n => [n.id, assignmentLabel(nodes, n.id)])]), 'assignment-legend.csv', 'text/csv;charset=utf-8')}>Export legend CSV</Button>
        <label className="block text-sm font-semibold">Import CSV or workbook<input aria-label="Import student transfers" type="file" accept=".csv,.xlsx" className="mt-1 block max-w-full text-sm" onChange={event => {
          const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
          setPreview([]);
          void perform(async () => {
            if (file.size > 10 * 1024 * 1024) throw new Error('Choose a file of 10 MB or smaller.');
            const changes = file.name.toLowerCase().endsWith('.xlsx') ? validateTransferRecords(await readTransferWorkbook(await file.arrayBuffer()), students, nodes) : parseTransferCsv(await file.text(), students, nodes);
            setPreview(changes);
          });
        }} /></label>
      </fieldset>
      {preview.length ? <>
        <h3 className="font-bold">Review {preview.length} assignment changes</h3>
        <div className="max-h-80 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Student</th><th className="p-2">From</th><th className="p-2">To</th></tr></thead><tbody>{preview.map(change => <tr key={change.uid} className="border-t border-slate-200 dark:border-slate-700"><td className="p-2">{students.find(s => s.uid === change.uid)?.name}<span className="block font-mono text-xs">{change.student_id}</span></td><td className="p-2">{assignmentLabel(nodes, change.source_node_id)}</td><td className="p-2">{assignmentLabel(nodes, change.destination_node_id)}</td></tr>)}</tbody></table></div>
        <p className="text-sm text-slate-500">All changes will be applied together. Any invalid or outdated assignment will reject the entire batch.</p>
        <div className="flex gap-2"><Button disabled={busy} onClick={apply}>{busy ? 'Applying…' : `Apply ${preview.length} transfers`}</Button><Button disabled={busy} variant="secondary" onClick={() => setPreview([])}>Back</Button></div>
      </> : <>
        <fieldset disabled={busy || loading} className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">Search student name or ID<input className="app-control mt-1 w-full p-2" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} /></label>
          <CustomSelect label="Current class" value={source} onChange={value => { setSource(String(value)); setPage(0); }} options={[{ value: 'all', label: 'All classes' }, ...Array.from(new Set(students.map(s => s.node_id))).map(id => ({ value: id, label: assignmentLabel(nodes, id) }))]} />
          <CustomSelect label="Destination class (higher or lower year)" value={destination} onChange={value => setDestination(String(value))} options={[{ value: '', label: 'Choose destination' }, ...destinations.map(n => ({ value: n.id, label: assignmentLabel(nodes, n.id) }))]} />
          <Button disabled={!destination || !selected.size} onClick={prepare}>Review selected students ({selected.size})</Button>
        </fieldset>
        {loading ? <p role="status">Loading students…</p> : <>
          <div className="flex flex-wrap items-center gap-3 text-sm"><Button variant="secondary" className="w-auto" disabled={busy} onClick={() => setSelected(new Set(filtered.map(s => s.uid)))}>Select all filtered ({filtered.length})</Button><Button variant="secondary" className="w-auto" disabled={busy} onClick={() => setSelected(new Set())}>Clear selection</Button><span>{selected.size} selected</span></div>
          <div className="max-h-80 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Select</th><th className="p-2">Name / ID</th><th className="p-2">Institutional unit / class</th></tr></thead><tbody>{displayed.map(s => <tr key={s.uid} className="border-t border-slate-200 dark:border-slate-700"><td className="p-2"><input type="checkbox" disabled={busy} aria-label={`Select ${s.name} (${s.student_id})`} checked={selected.has(s.uid)} onChange={() => toggle(s.uid)} /></td><td className="p-2">{s.name}<span className="block font-mono text-xs">{s.student_id}</span></td><td className="p-2">{assignmentLabel(nodes, s.node_id)}</td></tr>)}</tbody></table>{!filtered.length && <p className="p-4 text-sm">No students match these filters.</p>}</div>
          <div className="flex items-center gap-3 text-sm"><Button className="w-auto" variant="secondary" disabled={!page || busy} onClick={() => setPage(p => p - 1)}>Previous</Button><span>Page {page + 1} of {Math.max(1, Math.ceil(filtered.length / 50))}</span><Button className="w-auto" variant="secondary" disabled={(page + 1) * 50 >= filtered.length || busy} onClick={() => setPage(p => p + 1)}>Next</Button></div>
        </>}
      </>}
    </div>
  </Modal>;
}
