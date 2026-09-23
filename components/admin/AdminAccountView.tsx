import React, { useEffect, useMemo, useState } from 'react';
import { Eye, KeyRound, Plus, RefreshCw, ShieldCheck, UserRound } from 'lucide-react';
import { appData } from '../../lib/backend';
import { UserProfile } from '../../types';
import Button from '../ui/Button';
import { Modal } from '../ui/Modal';

type AccessInfo = { last_sign_in_at?: string | null; created_at?: string };
const roles = [
  { id: 'admin', label: 'Administrator' },
  { id: 'ossa', label: 'OSSA Administrator' },
  { id: 'ossa_staff', label: 'OSSA Staff' },
  { id: 'ssg', label: 'SSG Officer' },
];
const emptyForm = { name: '', email: '', username: '', student_id: '', role: 'ossa', password: '', assignment: '' };
const flatten = (nodes: any[]): any[] => nodes.flatMap(node => [node, ...flatten(node.children || [])]);

export const AdminAccountView: React.FC = () => {
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [access, setAccess] = useState<Record<string, AccessInfo>>({});
  const [reset, setReset] = useState('');
  const [createdCredential, setCreatedCredential] = useState('');
  const [message, setMessage] = useState('');
  const accounts = appData.getOfficialAccounts();
  const units = useMemo(() => flatten(appData.getSchoolStructure()).filter(node => node.type === 'campus' || node.type === 'department' || node.type === 'college' || node.type === 'education_unit'), []);
  const loadAccess = async () => { try { setAccess(await appData.getAccountAccess()); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load sign-in activity.'); } };
  useEffect(() => { loadAccess(); }, []);
  const makePassword = () => setForm(current => ({ ...current, password: `${crypto.randomUUID().replaceAll('-', '')}A!` }));
  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage('');
    try {
      const node = form.assignment || undefined;
      const profile = { uid: '', photo_url: '', name: form.name.trim(), email: form.email.trim(), username: form.username.trim(), student_id: form.student_id.trim() || form.username.trim(), role: form.role, account_status: 'active' as const, school_data: { type: 'College' as const, level: '', section: '', academic_assignment: node ? { campusId: node, terminalGroupId: node, nodePathIds: [node] } : undefined }, official_data: { body: form.role.startsWith('ossa') ? 'OSSA' as const : 'SSG' as const, assignment_node_id: node } };
      const initialPassword = form.password || `${crypto.randomUUID().replaceAll('-', '')}A!`;
      await appData.createUser(profile, initialPassword);
      setCreatedCredential(initialPassword); setMessage('Account created. Copy the initial password below and share it securely with the account holder.'); setForm(emptyForm); setOpen(false); await loadAccess();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to create account.'); }
  };
  const changePassword = async () => { if (!selected || reset.length < 12) return; try { await appData.resetAccountPassword(selected.uid, reset); setReset(''); setMessage(`Password updated for ${selected.name}.`); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update password.'); } };
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black text-brand-900 dark:text-white">Managed accounts</h2><p className="mt-1 text-sm text-slate-500">Create staff accounts, review profiles, and see whether each account has signed in.</p></div><Button onClick={() => { setForm(emptyForm); setOpen(true); }}><Plus size={16} /> Create account</Button></div>
    {message && <div role="status" className="rounded-xl bg-slate-100 px-4 py-3 text-sm dark:bg-slate-800"><p>{message}</p>{createdCredential && <code className="mt-2 block select-all rounded-lg bg-white px-3 py-2 font-bold dark:bg-slate-950">{createdCredential}</code>}</div>}
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900"><tr><th className="px-4 py-3">Account</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Access</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700">{accounts.map(account => <tr key={account.uid}><td className="px-4 py-3"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-800"><UserRound size={16} /></div><div><div className="font-bold text-slate-900 dark:text-white">{account.name}</div><div className="text-xs text-slate-500">@{account.username} · {account.email}</div></div></div></td><td className="px-4 py-3"><span className="rounded-full bg-gold-100 px-2.5 py-1 text-xs font-bold text-gold-800">{roles.find(role => role.id === account.role)?.label || account.role}</span></td><td className="px-4 py-3">{access[account.uid]?.last_sign_in_at ? <span className="text-emerald-700 dark:text-emerald-300">Accessed {new Date(access[account.uid].last_sign_in_at!).toLocaleString()}</span> : <span className="text-slate-500">Never accessed</span>}</td><td className="px-4 py-3 text-right"><Button variant="secondary" onClick={() => { setSelected(account); setReset(''); }}><Eye size={15} /> View profile</Button></td></tr>)}{!accounts.length && <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">No managed accounts yet.</td></tr>}</tbody></table></div>
    <Button variant="secondary" onClick={loadAccess}><RefreshCw size={15} /> Refresh access status</Button>
    <Modal open={open} onClose={() => setOpen(false)} title="Create managed account" description="Choose a role and either enter an initial password or generate one."><form className="space-y-4" onSubmit={create}><div className="grid gap-3 sm:grid-cols-2">{([['Full name','name'],['Email','email'],['Username','username'],['ID number','student_id']] as const).map(([label, key]) => <label key={key} className="text-sm font-semibold">{label}<input required={key !== 'student_id'} className="input-field mt-1" value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>)}<label className="text-sm font-semibold">Access role<select className="input-field mt-1" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>{roles.map(role => <option key={role.id} value={role.id}>{role.label}</option>)}</select></label><label className="text-sm font-semibold">Assigned unit<select className="input-field mt-1" required={form.role !== 'admin'} value={form.assignment} onChange={e => setForm({ ...form, assignment: e.target.value })}><option value="">{form.role === 'admin' ? 'Not assigned' : 'Select unit'}</option>{units.map(node => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label></div><label className="text-sm font-semibold">Initial password (leave blank to generate)<div className="mt-1 flex gap-2"><input className="input-field" minLength={form.password ? 12 : undefined} type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /><Button type="button" variant="secondary" onClick={makePassword}><KeyRound size={15} /> Generate</Button></div></label><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit"><ShieldCheck size={16} /> Create account</Button></div></form></Modal>
    <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.name || 'Account profile'} description="Review the account profile and set a new password.">{selected && <div className="space-y-4 text-sm"><div className="grid gap-2 rounded-xl bg-slate-50 p-4 dark:bg-slate-900"><div><b>Email:</b> {selected.email}</div><div><b>Username:</b> @{selected.username}</div><div><b>Role:</b> {roles.find(role => role.id === selected.role)?.label || selected.role}</div><div><b>Status:</b> {selected.account_status || 'active'}</div><div><b>Last access:</b> {access[selected.uid]?.last_sign_in_at ? new Date(access[selected.uid].last_sign_in_at!).toLocaleString() : 'Never accessed'}</div></div><label className="block font-semibold">New password<input className="input-field mt-1" minLength={12} type="text" value={reset} onChange={e => setReset(e.target.value)} placeholder="At least 12 characters" /></label><div className="flex justify-end"><Button onClick={changePassword} disabled={reset.length < 12}>Update password</Button></div></div>}</Modal>
  </div>;
};
