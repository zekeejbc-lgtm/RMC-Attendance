import { SelectField } from '../ui/SelectField';
﻿import { useState } from 'react';
import { ClassWeekSchedule, SchoolNode } from '../../types';
import { weekDays } from '../../lib/classSchedules';
import { appData } from '../../lib/backend';
import Button from '../ui/Button';
import { Surface } from '../ui/Page';

export function ClassScheduleEditor({ node, onSaved }: { node: SchoolNode; onSaved: () => void }) {
  const [schedule, setSchedule] = useState<ClassWeekSchedule>(node.metadata?.classSchedule || {});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const valid = Object.values(schedule).every(day => day && (day.status === 'no_class' || /^([01]\d|2[0-3]):[0-5]\d$/.test(day.timeIn) && /^([01]\d|2[0-3]):[0-5]\d$/.test(day.timeOut) && day.timeOut > day.timeIn));
  return <Surface className="space-y-4 p-4 sm:p-6">
    <h2 className="text-lg font-bold">Weekly class schedule</h2>
    <p className="text-sm text-slate-500">OSAS and admins set the first class start and last class end for {node.name}, in Philippine time. These times help filter ceremony exemptions. Mark no-class days explicitly; unconfigured days never count as no classes. Saving here does not change exemptions in existing ceremonies.</p>
    {weekDays.map((name, index) => {
      const day = schedule[index];
      return <fieldset key={name} className="grid min-w-0 gap-3 rounded-xl border p-3 sm:grid-cols-3"><legend className="px-1 font-semibold">{name}</legend>
        <label className="app-field-label">Day status<SelectField aria-label={`${name} class status`} className="mt-1 min-w-0" value={day?.status || ''} onChange={e => { const next = {...schedule}; if (!e) delete next[index]; else next[index] = e === 'no_class' ? {status:'no_class'} : {status:'classes',timeIn:'08:00',timeOut:'17:00'}; setSchedule(next); setMessage(''); }}><option value="">Not configured</option><option value="classes">Has classes</option><option value="no_class">No classes</option></SelectField></label>
        {day?.status === 'classes' && (['timeIn','timeOut'] as const).map(field => <label className="app-field-label" key={field}>{field === 'timeIn' ? 'First class starts' : 'Last class ends'}<input aria-label={`${name} ${field}`} type="time" className="input-field mt-2" value={day[field]} onChange={e => {setSchedule({...schedule,[index]:{...day,[field]:e.target.value}}); setMessage('');}} /></label>)}
      </fieldset>;
    })}
    {!valid && <p role="alert">Each class day needs a valid start time and a later end time.</p>}
    {message && <p role="status">{message}</p>}
    <Button type="button" disabled={saving || !valid} onClick={async () => { setSaving(true); setMessage(''); try { await appData.setClassSchedule(node.id,schedule); setMessage('Class schedule saved.'); onSaved(); } catch (error) { setMessage(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unable to save the class schedule.'); } finally {setSaving(false);} }}>Save class schedule</Button>
  </Surface>;
}
