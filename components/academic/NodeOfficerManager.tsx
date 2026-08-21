import { FormEvent, useMemo, useState } from 'react';
import { Plus, ShieldCheck, Trash2, UserRoundCog } from 'lucide-react';
import { roleLabels } from '../../lib/accessControl';
import { mockData } from '../../lib/mockBackend';
import { SchoolNode, UserProfile, UserRole } from '../../types';
import Button from '../ui/Button';
import { Modal } from '../ui/Modal';

const fieldClass = 'mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white';

export const officerRolesForNode = (node: SchoolNode): UserRole[] => {
  if (['campus', 'school'].includes(node.type)) return ['ossa', 'ossa_staff'];
  if (['education_unit', 'department', 'college'].includes(node.type)) return ['ssg'];
  return [];
};

export function NodeOfficerSummary({ node }: { node: SchoolNode }) {
  const officers = typeof mockData.getOfficialsForNode === 'function' ? mockData.getOfficialsForNode(node.id) : [];
  if (!officers.length) return <span className="mt-3 text-[9px] font-semibold text-slate-400">No officer assigned</span>;
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-1.5">
      {officers.slice(0, 2).map((officer) => <span className="max-w-full truncate rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" key={officer.uid}>{officer.name}</span>)}
      {officers.length > 2 ? <span className="rounded-full bg-slate-100 px-2 py-1 text-[8px] font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-300">+{officers.length - 2}</span> : null}
    </div>
  );
}

interface Props {
  node: SchoolNode;
  actor: UserProfile;
  canManage: boolean;
  onChanged: () => void;
}

export function NodeOfficerManager({ node, actor, canManage, onChanged }: Props) {
  const allowedRoles = officerRolesForNode(node);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [existingUid, setExistingUid] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', username: '', officialId: '', password: '', position: '', role: allowedRoles[0] || 'ssg' as UserRole });
  const officers = typeof mockData.getOfficialsForNode === 'function' ? mockData.getOfficialsForNode(node.id) : [];
  const eligibleExisting = useMemo(() => (typeof mockData.getOfficialAccounts === 'function' ? mockData.getOfficialAccounts() : []).filter((account) => allowedRoles.includes(account.role) && account.uid !== actor.uid && !officers.some((officer) => officer.uid === account.uid)), [node.id, officers.length]);

  if (!allowedRoles.length && !officers.length) return null;

  const close = () => {
    setOpen(false);
    setError('');
    setExistingUid('');
    setMode('new');
    setForm({ name: '', email: '', username: '', officialId: '', password: '', position: '', role: allowedRoles[0] || 'ssg' });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      if (mode === 'existing') {
        if (!existingUid) throw new Error('Select an existing officer.');
        mockData.assignOfficialToNode(actor.uid, existingUid, node.id);
      } else {
        mockData.createSchoolOfficial(actor.uid, {
          name: form.name, email: form.email, username: form.username,
          student_id: form.officialId, role: form.role, account_status: 'active',
          official_data: {
            body: form.role === 'ssg' ? 'SSG' : 'OSSA', position: form.position || roleLabels[form.role],
            scope: node.name, assignment_node_id: node.id,
          },
          school_data: {
            type: 'College', level: 'Administration', section: node.name,
            department: node.name, school_id: 'school_rmc',
          },
        }, form.password);
      }
      close();
      onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The officer could not be assigned.');
    }
  };

  const remove = () => {
    if (!deleteTarget) return;
    try {
      mockData.deleteSchoolOfficial(actor.uid, deleteTarget.uid);
      setDeleteTarget(null);
      onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The account could not be deleted.');
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="flex items-center gap-2 font-bold text-brand-900 dark:text-white"><ShieldCheck size={18} /> Assigned officers</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">These accounts can access {node.name} and everything below it, but cannot browse parent units.</p></div>
        {canManage && allowedRoles.length ? <Button className="sm:w-auto" onClick={() => setOpen(true)} size="sm"><Plus size={15} /> Assign officer</Button> : null}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {officers.map((officer) => <article className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900" key={officer.uid}><img alt="" className="h-10 w-10 rounded-full object-cover" src={officer.photo_url} /><div className="min-w-0 flex-1"><h4 className="truncate text-sm font-bold text-slate-900 dark:text-white">{officer.name}</h4><p className="truncate text-xs text-slate-500">{roleLabels[officer.role]}</p></div>{canManage ? <button aria-label={`Delete ${officer.name}`} className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40" onClick={() => setDeleteTarget(officer)}><Trash2 size={16} /></button> : null}</article>)}
        {!officers.length ? <p className="text-sm text-slate-500">No officer is assigned to this unit.</p> : null}
      </div>

      <Modal open={open} onClose={close} title={`Assign officer to ${node.name}`} description="Their workspace begins here and includes descendant units only." footer={<><Button onClick={close} variant="secondary">Cancel</Button><Button form="assign-node-officer" type="submit"><UserRoundCog size={16} /> {mode === 'new' ? 'Create and assign' : 'Assign account'}</Button></>}>
        <form className="space-y-4" id="assign-node-officer" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-900"><button className={`rounded-lg px-3 py-2 text-sm font-bold ${mode === 'new' ? 'bg-white text-brand-900 shadow dark:bg-slate-700 dark:text-white' : 'text-slate-500'}`} onClick={() => setMode('new')} type="button">New account</button><button className={`rounded-lg px-3 py-2 text-sm font-bold ${mode === 'existing' ? 'bg-white text-brand-900 shadow dark:bg-slate-700 dark:text-white' : 'text-slate-500'}`} onClick={() => setMode('existing')} type="button">Existing account</button></div>
          {mode === 'existing' ? <label className="block text-sm font-semibold">Eligible official<select className={fieldClass} onChange={(event) => setExistingUid(event.target.value)} required value={existingUid}><option value="">Select an account</option>{eligibleExisting.map((account) => <option key={account.uid} value={account.uid}>{account.name} — {roleLabels[account.role]}</option>)}</select>{!eligibleExisting.length ? <span className="mt-2 block text-xs font-normal text-slate-500">No eligible unassigned accounts are available for this unit.</span> : null}</label> : <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">Full name<input className={fieldClass} onChange={(e) => setForm({ ...form, name: e.target.value })} required value={form.name} /></label>
            <label className="text-sm font-semibold">Role<select className={fieldClass} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })} value={form.role}>{allowedRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>
            <label className="text-sm font-semibold">Email<input className={fieldClass} onChange={(e) => setForm({ ...form, email: e.target.value })} required type="email" value={form.email} /></label>
            <label className="text-sm font-semibold">Username<input className={fieldClass} onChange={(e) => setForm({ ...form, username: e.target.value })} required value={form.username} /></label>
            <label className="text-sm font-semibold">Official ID<input className={fieldClass} onChange={(e) => setForm({ ...form, officialId: e.target.value })} required value={form.officialId} /></label>
            <label className="text-sm font-semibold">Position<input className={fieldClass} onChange={(e) => setForm({ ...form, position: e.target.value })} value={form.position} /></label>
            <label className="text-sm font-semibold sm:col-span-2">Temporary password<input className={fieldClass} minLength={8} onChange={(e) => setForm({ ...form, password: e.target.value })} required type="password" value={form.password} /></label>
          </div>}
          {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200" role="alert">{error}</p> : null}
        </form>
      </Modal>

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} size="sm" title="Delete officer account" description="This permanently removes sign-in access." footer={<><Button onClick={() => setDeleteTarget(null)} variant="secondary">Cancel</Button><Button onClick={remove} variant="danger"><Trash2 size={16} /> Delete</Button></>}><p className="text-sm text-slate-600 dark:text-slate-300">Delete <strong>{deleteTarget?.name}</strong>?</p></Modal>
    </section>
  );
}
