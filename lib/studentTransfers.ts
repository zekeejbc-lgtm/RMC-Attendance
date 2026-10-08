import { SchoolNode } from '../types';
import { findNodePath, flattenDirectory } from './academicDirectory';
import { parseCsvRecords } from './memberCsv';

export interface TransferStudent { uid: string; name: string; student_id: string; node_id: string; role: string; }
export interface StudentTransfer { uid: string; student_id: string; source_node_id: string; destination_node_id: string; }
export const TRANSFER_COLUMNS = ['name', 'student_id', 'institutional_unit', 'class', 'source_node_id', 'destination_node_id'] as const;
export const assignmentLabel = (nodes: SchoolNode[], id: string) => (findNodePath(nodes, id) || []).map(n => n.name).join(' / ') || 'Unassigned';
export const transferDestinations = (nodes: SchoolNode[]) => flattenDirectory(nodes).filter(n => ['section', 'block'].includes(n.type) && !(findNodePath(nodes, n.id) || []).some(p => p.metadata?.archived));
export const sortedTransferStudents = (students: TransferStudent[], nodes: SchoolNode[]) => [...students].sort((a, b) => assignmentLabel(nodes, a.node_id).localeCompare(assignmentLabel(nodes, b.node_id), undefined, { numeric: true }) || a.name.localeCompare(b.name) || a.student_id.localeCompare(b.student_id));
export const transferExportRows = (students: TransferStudent[], nodes: SchoolNode[]) => sortedTransferStudents(students, nodes).map(s => {
  const path = findNodePath(nodes, s.node_id) || [];
  return [s.name, s.student_id, path.slice(0, -1).map(n => n.name).join(' / '), path.at(-1)?.name || '', s.node_id, s.node_id];
});
export const csvText = (rows: string[][]) => '\uFEFF' + rows.map(row => row.map(value => {
  // Prevent spreadsheet formulas from executing when a CSV is opened.
  const safe = /^[\s]*[=+@-]/.test(value) ? "'" + value : value;
  return '"' + safe.replace(/"/g, '""') + '"';
}).join(',')).join('\r\n');

export function validateTransferRecords(records: string[][], students: TransferStudent[], nodes: SchoolNode[]): StudentTransfer[] {
  const header = records[0]?.map(h => h.replace(/^\uFEFF/, '').trim().toLowerCase());
  const required = ['student_id', 'source_node_id', 'destination_node_id'];
  if (!header || required.some(h => !header.includes(h)) || new Set(header).size !== header.length) throw new Error('Use the exported Students template with student_id, source_node_id, and destination_node_id columns.');
  const destinations = new Set(transferDestinations(nodes).map(n => n.id));
  const seen = new Set<string>();
  const byStudentId = new Map<string, TransferStudent[]>();
  students.forEach(student => {
    const key = student.student_id.toLowerCase();
    byStudentId.set(key, [...(byStudentId.get(key) || []), student]);
  });
  const changes: StudentTransfer[] = [];
  records.slice(1).forEach((record, index) => {
    if (!record.some(v => v.trim())) return;
    const fail = (message: string): never => { throw new Error(`Row ${index + 2}: ${message}`); };
    if (record.length !== header.length) fail('Column count does not match the template.');
    const get = (key: string) => record[header.indexOf(key)]?.trim() || '';
    const id = get('student_id');
    const matches = byStudentId.get(id.toLowerCase()) || [];
    if (matches.length !== 1) fail('Student ID is unknown, ambiguous, or outside your scope.');
    const student = matches[0];
    if (seen.has(student.uid)) fail('Duplicate student ID.');
    seen.add(student.uid);
    const source = get('source_node_id'), destination = get('destination_node_id');
    if (source !== student.node_id) fail('Current assignment changed. Export a fresh template.');
    if (source === destination) return;
    if (!destinations.has(destination)) fail('Choose a destination ID from the assignment legend.');
    changes.push({ uid: student.uid, student_id: student.student_id, source_node_id: source, destination_node_id: destination });
  });
  if (!changes.length) throw new Error('No assignment changes found. Edit destination_node_id to transfer students.');
  if (changes.length > 1000) throw new Error('Transfer at most 1,000 students per batch.');
  return changes;
}
export const parseTransferCsv = (text: string, students: TransferStudent[], nodes: SchoolNode[]) => validateTransferRecords(parseCsvRecords(text), students, nodes);

export function downloadTransferFile(data: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportTransferWorkbook(students: TransferStudent[], nodes: SchoolNode[]) {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet('Students');
  sheet.addRow([...TRANSFER_COLUMNS]);
  sheet.addRows(transferExportRows(students, nodes));
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = 'A1:F1';
  sheet.columns.forEach(c => { c.width = 30; c.numFmt = '@'; });
  const legend = workbook.addWorksheet('Assignment Legend');
  legend.addRow(['destination_node_id', 'institutional_unit / class']);
  transferDestinations(nodes).sort((a, b) => assignmentLabel(nodes, a.id).localeCompare(assignmentLabel(nodes, b.id), undefined, { numeric: true })).forEach(n => legend.addRow([n.id, assignmentLabel(nodes, n.id)]));
  legend.columns.forEach(c => { c.width = 60; });
  legend.views = [{ state: 'frozen', ySplit: 1 }];
  const instructions = workbook.addWorksheet('Instructions');
  instructions.addRow(['Edit destination_node_id in Students using IDs from Assignment Legend. Leave unchanged students as they are.']);
  instructions.addRow(['Names and IDs are reference data. Do not edit student_id or source_node_id. Import this workbook and review before applying.']);
  instructions.addRow(['Select higher or lower year classes to promote or demote. Transferred mayors become students; attendance history is retained.']);
  downloadTransferFile(await workbook.xlsx.writeBuffer() as unknown as ArrayBuffer, 'student-transfers.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
export async function readTransferWorkbook(data: ArrayBuffer): Promise<string[][]> {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  await workbook.xlsx.load(data);
  const sheet = workbook.getWorksheet('Students');
  if (!sheet) throw new Error('The workbook needs a Students tab.');
  const records: string[][] = [];
  sheet.eachRow(row => {
    const values: string[] = [];
    for (let i = 1; i <= sheet.columnCount; i++) {
      const cell = row.getCell(i);
      if (cell.type === 6) throw new Error('Use plain values, not formulas, in the Students tab.');
      values.push(cell.text);
    }
    records.push(values);
  });
  return records;
}
