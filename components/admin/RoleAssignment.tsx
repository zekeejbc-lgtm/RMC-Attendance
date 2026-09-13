import { useState } from 'react';
import { mockData } from '../../lib/mockBackend';
import { useAuth } from '../AuthContext';
import Button from '../ui/Button';

export function RoleAssignment() {
  const { profile } = useAuth();
  const [uid, setUid] = useState('');
  const [roleId, setRoleId] = useState('');
  const [message, setMessage] = useState('');
  const accounts = [...mockData.getOfficialAccounts(), ...mockData.getAllStudents()].filter((account, index, all) => all.findIndex(item => item.uid === account.uid) === index);
  const roles = [...Object.values(mockData.getCoreRoles()), ...Object.values(mockData.getCustomRoles())].filter(role => role.id !== 'admin');
  return <form className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800" onSubmit={event => {
    event.preventDefault();
    try { mockData.assignAccountRole(profile!.uid, uid, roleId); setMessage('Assignment saved. Position-only roles preserve the existing access role.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to assign role.'); }
  }}>
    <h2 className="mb-3 font-bold text-brand-900 dark:text-white">Assign access role or position</h2>
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="app-field-label">Account<select required className="input-field mt-2" value={uid} onChange={event => setUid(event.target.value)}><option value="">Select account</option>{accounts.filter(account => account.role !== 'admin').map(account => <option key={account.uid} value={account.uid}>{account.name}</option>)}</select></label>
      <label className="app-field-label">Role or position<select required className="input-field mt-2" value={roleId} onChange={event => setRoleId(event.target.value)}><option value="">Select role</option>{roles.map(role => <option key={role.id} value={role.id}>{role.name}{role.isPositionOnly ? ' (position)' : ''}</option>)}</select></label>
      <Button type="submit" className="self-end" disabled={!uid || !roleId}>Save assignment</Button>
    </div>
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
  </form>;
}
