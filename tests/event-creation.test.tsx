import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SSGCreateCeremony from '../views/SSGCreateCeremony';
import SSGCreateEvent from '../views/SSGCreateEvent';
import SSGEventCreation from '../views/SSGEventCreation';
import userEvent from '@testing-library/user-event';

const state = vi.hoisted(() => ({
  auth: { profile: { uid: 'officer', role: 'ssg', official_data: { assignment_node_id: 'school' } }, revision: 0, loading: false },
  events: [] as any[], create: vi.fn(), createCeremonies: vi.fn(), update: vi.fn(), extend: vi.fn(), attendance: {} as Record<string, unknown>,
}));
vi.mock('../components/AuthContext', () => ({ useAuth: () => state.auth }));
vi.mock('../components/events/GeofenceMap', () => ({ GeofenceMap: () => <div /> }));
vi.mock('../lib/backend', () => ({ appData: {
  getEvents: () => state.events, getVisibleEvents: () => state.events,
  getSchoolStructure: () => [{ id: 'school', name: 'Assigned school', type: 'school' }, { id: 'other', name: 'Other school', type: 'school' }], isUserScopeFrozen: () => false,
  getAttendanceLogs: () => state.attendance, extendService: state.extend, getVisibleStudents: () => [], createCeremonies: state.createCeremonies, createEvent: state.create, updateEvent: state.update,
} }));
beforeEach(() => { vi.resetAllMocks(); state.events = []; state.attendance = {}; state.auth.revision = 0; state.auth.profile.role = 'ssg'; state.auth.profile.official_data.assignment_node_id = 'school'; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function mount(path = '/ssg/events/create') {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/ssg/ceremonies/create" element={<SSGCreateCeremony />} />
    <Route path="/ssg/ceremonies/:eventId/edit" element={<SSGCreateCeremony />} />
    <Route path="/ssg/events/create" element={<SSGCreateEvent />} />
    <Route path="/ssg/events/:eventId/edit" element={<SSGCreateEvent />} />
    <Route path="/ssg/events" element={<p>Event registry</p>} />
    <Route path="/student/ceremonies" element={<p>Ceremony registry</p>} />
  </Routes></MemoryRouter>);
}
function next() { fireEvent.click(screen.getByRole('button', { name: /^Next:/ })); }
function review() { next(); next(); next(); }
function ceremonySchedule() {
  fireEvent.change(screen.getByLabelText('Ceremony Title'), { target: { value: 'Flag raising' } });
  fireEvent.change(screen.getByLabelText('Ceremony Details and Instructions'), { target: { value: 'Instructions' } });
  next();
}
function fill() {
  for (const [label, value] of [
    [/(?:event|ceremony) title/i, 'Assembly'], [/(?:event|ceremony) details/i, 'School assembly'], [/^start date$/i, '2026-11-10'],
    [/^end date$/i, '2026-11-10'], [/time in 1/i, '08:00'], [/time out 1/i, '10:00'],
  ] as const) fireEvent.change(screen.getByLabelText(label), { target: { value } });
  if (screen.queryByRole('progressbar')) next();
}
it.each(['event', 'ceremony'])('guides %s creation through visible phases and preserves entries on Back', async purpose => {
  const user = userEvent.setup();
  mount(purpose === 'ceremony' ? '/ssg/ceremonies/create' : '/ssg/events/create');
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  expect(screen.getByLabelText('Start Date')).not.toBeVisible();
  expect(screen.getByLabelText('Time In 1')).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Next: Schedule' }));
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await user.type(screen.getByRole('textbox', { name: /title/i }), 'Phase test');
  await user.type(screen.getByRole('textbox', { name: /details/i }), 'Bring your student ID.');
  await user.click(screen.getByRole('button', { name: 'Next: Schedule' }));
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
  expect(screen.getByLabelText('Time In 1')).toBeVisible();
  expect(screen.getByLabelText('Time In 1')).toBeEnabled();
  expect(screen.getByLabelText(/(?:event|ceremony) title/i)).not.toBeVisible();
  fireEvent.change(screen.getByLabelText('Time In 1'), { target: { value: '08:00' } });
  await user.click(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByRole('textbox', { name: /title/i })).toHaveValue('Phase test');
  await user.click(screen.getByRole('button', { name: 'Next: Schedule' }));
  expect(screen.getByLabelText('Time In 1')).toHaveValue('08:00');
  fireEvent.submit(screen.getByRole('form'));
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
  expect(screen.queryByRole('button', { name: /^Schedule (Event|Ceremonies)$/ })).not.toBeInTheDocument();
  expect(state.create).not.toHaveBeenCalled();
  expect(state.createCeremonies).not.toHaveBeenCalled();
});

it('reviews the full event and requires final confirmation before saving', async () => {
  const user = userEvent.setup();
  mount();
  await user.type(screen.getByRole('textbox', { name: 'Event Title' }), 'Assembly');
  await user.type(screen.getByRole('textbox', { name: 'Event Details and Information' }), 'School assembly');
  await user.click(screen.getByRole('button', { name: 'Next: Schedule' }));
  for (const [label, value] of [['Start Date', '2026-11-10'], ['End Date', '2026-11-10'], ['Time In 1', '08:00'], ['Time Out 1', '10:00']]) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
  await user.click(screen.getByRole('button', { name: 'Next: Attendees' }));
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  expect(screen.getByRole('heading', { name: 'Event recipients' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Next: Rules & Location' }));
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75');
  fireEvent.change(screen.getByLabelText('Late Sanction Value'), { target: { value: '45' } });
  await user.click(screen.getByRole('button', { name: 'Next: Review' }));
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  expect(screen.getByText('Late: 45 minutes; absent: 1 hours')).toBeVisible();
  expect(state.create).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Submit for OSSA Approval' }));
  await screen.findByText('Event registry');
  expect(state.create).toHaveBeenCalledTimes(1);
});

it('sets standard flag retreat to Friday afternoon while keeping school times editable', () => {
  state.auth.profile.role = 'admin';
  mount('/ssg/ceremonies/create');
  fireEvent.click(screen.getByLabelText('Use Philippine standard ceremony week'));
  ceremonySchedule();
  expect(screen.getByLabelText('Time In 1')).toHaveValue('07:00');
  expect(screen.getByLabelText('Monday')).toBeChecked();
  expect(screen.getByLabelText('Monday')).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  fireEvent.click(screen.getByRole('button', { name: /flag ceremony type/i }));
  fireEvent.click(screen.getByRole('option', { name: 'Flag retreat / lowering' }));
  next();
  expect(screen.getByLabelText('Friday')).toBeChecked();
  expect(screen.getByLabelText('Time In 1')).toHaveValue('16:30');
  expect(screen.getByLabelText('Time In 1')).toBeEnabled();
});
it('creates service from the event form with duration, windows, and OSAS overflow policy', async () => {
  state.auth.profile.role = 'ossa';
  state.create.mockResolvedValueOnce('service');
  mount();
  fireEvent.click(screen.getByRole('button', { name: /activity type/i }));
  fireEvent.click(screen.getByRole('option', { name: 'Sanction / Cleaning Service' }));
  fireEvent.click(screen.getByLabelText('Save excess service hours as earned merit'));
  fill();
  fireEvent.change(screen.getByLabelText(/duration in days/i), { target: { value: '3' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add Attendance Window' }));
  fireEvent.change(screen.getByLabelText('Time In 2'), { target: { value: '13:00' } });
  fireEvent.change(screen.getByLabelText('Time Out 2'), { target: { value: '15:00' } });
  review();
  fireEvent.submit(screen.getByRole('form'));
  await screen.findByText('Event registry');
  expect(state.create).toHaveBeenCalledWith(expect.objectContaining({kind:'service',ceremony:null,service:{overflow:'merit'},endDate:'2026-11-12',penaltyValue:0,attendanceWindows:expect.arrayContaining([expect.objectContaining({timeIn:'13:00',timeOut:'15:00'})])}));
});
it('lets SSG choose merit but reserves the service overflow toggle for OSAS', () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: /activity type/i }));
  fireEvent.click(screen.getByRole('option', { name: 'Sanction / Cleaning Service' }));
  expect(screen.getByLabelText('Save excess service hours as earned merit')).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: /activity type/i }));
  fireEvent.click(screen.getByRole('option', { name: 'Merit activity' }));
  expect(screen.getByLabelText('Fixed merit hours')).toBeInTheDocument();
  expect(screen.queryByLabelText('Late Sanction Value')).not.toBeInTheDocument();
});
it.each(['ossa', 'ssg'])('shows only the assigned unit for %s', role => {
  state.auth.profile.role = role;
  mount(); fill(); next();
  fireEvent.click(screen.getByRole('button', { name: /^Campus/ }));
  expect(screen.getByRole('option', { name: 'Assigned school' })).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: 'Other school' })).not.toBeInTheDocument();
  expect(screen.getByText(/All recipient choices/)).toHaveTextContent('Assigned school');
});
it('blocks event creation when the officer has no assigned unit', () => {
  state.auth.profile.official_data.assignment_node_id = '';
  mount(); fill(); next();
  expect(screen.getByRole('alert')).toHaveTextContent('assigned school unit is required');
  fireEvent.submit(screen.getByRole('form'));
  expect(state.create).not.toHaveBeenCalled();
});
it('lets an admin predict, edit, and save ceremony dates in a dedicated form', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-01T00:00:00+08:00'));
  state.auth.profile.role = 'admin';
  state.createCeremonies.mockResolvedValueOnce(['ceremony']);
  mount('/ssg/ceremonies/create');
  expect(screen.getByRole('heading', { name: 'Create Ceremony' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /activity type/i })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Weekly occurrences')).not.toBeInTheDocument();
  fill();
  fireEvent.click(screen.getByLabelText('Tuesday'));
  fireEvent.click(screen.getByRole('button', { name: /automatically predict dates/i }));
  expect(screen.getByRole('button', { name: 'Remove 2026-11-10' })).toBeInTheDocument();
  review();
  fireEvent.submit(screen.getByRole('form'));
  await screen.findByText('Ceremony registry');
  expect(state.createCeremonies).toHaveBeenCalledWith(expect.objectContaining({
    kind: 'flag_ceremony', scopeNodeId: undefined, title: 'Assembly',
    ceremony: expect.objectContaining({ allowVolunteerMerit: false, exemptStudentIds: [] }),
  }), ['2026-11-10']);
  expect(state.create).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});
it('blocks preview-only dates from being saved', () => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-01T00:00:00+08:00'));
  state.auth.profile.role = 'admin';
  mount('/ssg/ceremonies/create'); fill();
  fireEvent.click(screen.getByLabelText('Tuesday'));
  fireEvent.click(screen.getByRole('button', { name: /automatically predict dates/i }));
  fireEvent.submit(screen.getByRole('form'));
  expect(state.createCeremonies).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Schedule Ceremonies' })).not.toBeInTheDocument();
  vi.restoreAllMocks();
});
it('waits for the backend before navigating and prevents a second submission', async () => {
  let resolve!: (id: string) => void;
  state.create.mockImplementation(() => new Promise(r => { resolve = r; }));
  mount(); fill(); review();
  fireEvent.submit(screen.getByRole('form'));
  expect(screen.getByRole('button', { name: /submit for ossa approval/i })).toBeDisabled();
  fireEvent.submit(screen.getByRole('form'));
  expect(state.create).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Event registry')).not.toBeInTheDocument();
  resolve('saved');
  await screen.findByText('Event registry');
  expect(state.create).toHaveBeenCalledWith(expect.objectContaining({
    scopeNodeId: 'school', created_by: 'officer', startTime: Date.parse('2026-11-10T08:00:00+08:00'),
  }));
});
it('keeps entered data and displays plain Supabase error objects for a retry', async () => {
  state.create.mockRejectedValueOnce({ message: 'Your school is frozen.' }).mockResolvedValueOnce('saved');
  mount(); fill(); review(); fireEvent.submit(screen.getByRole('form'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Your school is frozen.');
  expect(screen.getByLabelText(/(?:event|ceremony) title/i)).toHaveValue('Assembly');
  await waitFor(() => expect(screen.getByRole('button', { name: /submit for ossa approval/i })).toBeEnabled());
  fireEvent.submit(screen.getByRole('form'));
  await screen.findByText('Event registry');
});
it('does not turn a missing edit record into a newly created event', () => {
  mount('/ssg/events/missing/edit'); fill();
  expect(screen.getByRole('alert')).toHaveTextContent('not found');
  fireEvent.submit(screen.getByRole('form'));
  expect(state.create).not.toHaveBeenCalled();
});
it('rejects invalid geofence coordinates even when submitted programmatically', () => {
  mount(); fill(); next(); next(); fireEvent.click(screen.getByRole('switch', { name: /enable geofencing/i }));
  fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '91' } });
  fireEvent.submit(screen.getByRole('form'));
  expect(state.create).not.toHaveBeenCalled();
  expect(screen.getAllByRole('alert').some(alert => alert.textContent?.includes('valid coordinates'))).toBe(true);
});
it('updates the open registry and details when the backend snapshot changes', async () => {
  const view = render(<MemoryRouter><SSGEventCreation /></MemoryRouter>);
  state.events = [{ id: 'event', title: 'Saved assembly', status: 'active', startTime: Date.now(), endTime: Date.now() + 100000,
    penaltyValue: 1, penaltyUnit: 'hours', recipientGroups: ['All Students'], geofenceEnabled: false,
    location: { lat: 0, lng: 0, radius_meters: 0 } }];
  state.auth.revision++;
  view.rerender(<MemoryRouter><SSGEventCreation /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: /open saved assembly details/i }));
  expect(screen.getByRole('dialog', { name: 'Saved assembly' })).toBeInTheDocument();
  state.events = [{ ...state.events[0], title: 'Updated assembly' }]; state.auth.revision++;
  view.rerender(<MemoryRouter><SSGEventCreation /></MemoryRouter>);
  expect(await screen.findByRole('dialog', { name: 'Updated assembly' })).toBeInTheDocument();
});

it('keeps ceremony options out of event creation', () => {
  mount();
  expect(screen.queryByLabelText('Use Philippine standard ceremony week')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /activity type/i }));
  expect(screen.queryByRole('option', { name: 'Flag ceremony' })).not.toBeInTheDocument();
});
it('redirects bookmarked ceremony creation links to the dedicated form', () => {
  mount('/ssg/events/create?kind=flag_ceremony');
  expect(screen.getByRole('form', { name: 'Schedule ceremony' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /activity type/i })).not.toBeInTheDocument();
});
it('opens existing ceremonies in the ceremony editor from legacy event links', () => {
  state.events = [{ id: 'flag', kind: 'flag_ceremony', title: 'Flag raising', description: 'Instructions', status: 'upcoming', startTime: Date.parse('2026-11-10T07:00:00+08:00'), endTime: Date.parse('2026-11-10T08:00:00+08:00'), location: { lat: 0, lng: 0, radius_meters: 0 } }];
  mount('/ssg/events/flag/edit');
  expect(screen.getByRole('form', { name: 'Edit ceremony' })).toBeInTheDocument();
  expect(screen.getByLabelText('Ceremony Title')).toHaveValue('Flag raising');
  expect(screen.queryByRole('button', { name: /activity type/i })).not.toBeInTheDocument();
});
it('excludes ceremonies from the event registry', () => {
  state.events = [{ id: 'flag', kind: 'flag_ceremony', title: 'Flag raising', status: 'active', recipientGroups: ['All Students'] }];
  render(<MemoryRouter><SSGEventCreation /></MemoryRouter>);
  expect(screen.queryByText('Flag raising')).not.toBeInTheDocument();
});

it('previews the full next month with blank filters and saves only dates allowed now', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-29T00:00:00+08:00'));
  state.auth.profile.role = 'admin';
  state.createCeremonies.mockResolvedValueOnce(['ceremony']);
  mount('/ssg/ceremonies/create');
  fireEvent.change(screen.getByLabelText('Ceremony Title'), {target:{value:'Flag raising'}});
  fireEvent.change(screen.getByLabelText('Ceremony Details and Instructions'), {target:{value:'Assembly'}});
  fireEvent.click(screen.getByLabelText('Use Philippine standard ceremony week'));
  next();
  expect(screen.getByLabelText('Start Date')).not.toBeRequired();
  fireEvent.click(screen.getByRole('button', {name:'Automatically predict dates'}));
  expect(screen.getByRole('button', {name:'Remove 2026-10-05'})).toBeInTheDocument();
  expect(screen.getByLabelText('Calendar month')).toHaveValue('2026-10');
  for (const day of ['2026-10-05','2026-10-12','2026-10-19','2026-10-26']) expect(screen.getByRole('button', {name:`Remove ${day}`})).toBeInTheDocument();
  next();
  expect(screen.queryByRole('button', {name:'Schedule Ceremonies'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name:'Keep only dates allowed now'}));
  review();
  expect(screen.getByRole('button', {name:'Schedule Ceremonies'})).toBeEnabled();
  fireEvent.submit(screen.getByRole('form'));
  await screen.findByText('Ceremony registry');
  expect(state.createCeremonies).toHaveBeenCalledWith(expect.objectContaining({startDate:'2026-10-05',endDate:'2026-10-05',startTime:Date.parse('2026-10-05T07:00:00+08:00')}), ['2026-10-05']);
});
it('keeps selected dates and explains incomplete ranges and empty weekdays', () => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-29T00:00:00+08:00'));
  mount('/ssg/ceremonies/create');
  ceremonySchedule();
  const predict = screen.getByRole('button', {name:'Automatically predict dates'});
  fireEvent.click(predict);
  fireEvent.change(screen.getByLabelText('Start Date'), {target:{value:'2026-10-01'}});
  fireEvent.click(predict);
  expect(screen.getByRole('status', {name:'Date prediction result'})).toHaveTextContent('Enter both dates');
  expect(screen.getByRole('button', {name:'Remove 2026-10-05'})).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Start Date'), {target:{value:''}});
  fireEvent.click(screen.getByLabelText('Monday'));
  fireEvent.click(predict);
  expect(screen.getByRole('status', {name:'Date prediction result'})).toHaveTextContent('Select at least one day');
  expect(screen.getByRole('button', {name:'Remove 2026-10-05'})).toBeInTheDocument();
});

it('uses the navigated calendar month when predicting dates', () => {
 vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-29T00:00:00+08:00'));
 mount('/ssg/ceremonies/create');
 ceremonySchedule();
 fireEvent.click(screen.getByRole('button', {name:'Next month'}));
 expect(screen.getByLabelText('Calendar month')).toHaveValue('2026-11');
 fireEvent.click(screen.getByRole('button', {name:'Automatically predict dates'}));
 for (const day of ['2026-11-02','2026-11-09','2026-11-16','2026-11-23']) expect(screen.getByRole('button', {name:`Remove ${day}`})).toBeInTheDocument();
 expect(screen.queryByRole('button', {name:'Remove 2026-11-30'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button', {name:'Previous month'}));
 fireEvent.click(screen.getByRole('button', {name:'Automatically predict dates'}));
 expect(screen.getByRole('button', {name:'Remove 2026-10-26'})).toBeInTheDocument();
});
