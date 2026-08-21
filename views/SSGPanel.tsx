
import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { mockData } from '../lib/mockBackend';
import { Application, AppEvent, UserProfile, SchoolNode, UserStats } from '../types';
import Button from '../components/ui/Button';
import CustomSelect from '../components/ui/CustomSelect';
import { Modal } from '../components/ui/Modal';
import { Page, PageHeader, Surface } from '../components/ui/Page';
import { DirectoryNodeModal } from '../components/academic/DirectoryNodeModal';
import { PresetPickerModal } from '../components/academic/PresetPickerModal';
import { getAcademicNodeLabel } from '../lib/academicDirectory';
import { createEventAudienceTarget, serializeAcademicAssignment } from '../lib/academicDirectory';
import { AcademicPathPicker } from '../components/academic/AcademicPathPicker';
import { NodeOfficerManager, NodeOfficerSummary } from '../components/academic/NodeOfficerManager';
import { hasPermission, roleLabels } from '../lib/accessControl';
import { 
  Users, Check, X, Shield, Plus, UserCheck, Search, Filter,
  ChevronRight, School, BookOpen, Grid, List, ShieldAlert,
  Mail, Phone, User as UserIcon, Minus, ImageIcon, LayoutGrid,
  Upload, Trash2, Home, Clock, Lock, CalendarPlus, MapPin, Target,
  AlignLeft, Info, Users2, AlertTriangle, Compass, Crosshair, Map,
  Globe, ChevronDown, FileText, Fingerprint, Trash, Building2, CalendarDays, Inbox, Pencil, Archive, WandSparkles
} from 'lucide-react';

const memberFieldClass = 'mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white';

const SSGPanel: React.FC = () => {
  const { profile, isMock } = useAuth();
  const [tab, setTab] = useState<'hub' | 'applicants' | 'events'>('hub');
  const [apps, setApps] = useState<Application[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [structure, setStructure] = useState<SchoolNode[]>([]);
  
  const [path, setPath] = useState<SchoolNode[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<(UserProfile & { stats: UserStats }) | null>(null);

  const [nodeEditor, setNodeEditor] = useState<{ parentId: string | null; node?: SchoolNode } | null>(null);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [pendingAdjustment, setPendingAdjustment] = useState<{ delta: number; action: string } | null>(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [memberData, setMemberData] = useState({ name: '', email: '', username: '', studentId: '', password: 'password123' });
  
  // Specific Asset Input State
  const [assetInput, setAssetInput] = useState('');
  const [audienceMode, setAudienceMode] = useState<'all' | 'directory_node' | 'specific'>('all');
  const [eventAudiencePath, setEventAudiencePath] = useState<SchoolNode[]>([]);

  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    radius: 100,
    penaltyValue: 1,
    penaltyUnit: 'hours' as 'hours' | 'minutes',
    
    specificPeople: [] as string[],
    
    lat: 7.0736,
    lng: 125.6126,
    isLocating: false
  });

  const isPresident = profile?.role === 'ssg' || profile?.role === 'admin' || profile?.role === 'ossa';
  const canManageStructure = hasPermission(profile?.role, 'directory.manage_structure');
  const canManageMembers = hasPermission(profile?.role, 'directory.manage_members');
  const canManageOfficers = profile?.role === 'admin';
  const canReviewApplicants = profile?.role === 'admin' || profile?.role === 'ossa' || profile?.role === 'ssg';

  // Fix: Enhanced refresh to update selected student details if a modal is active
  const refresh = () => {
    setApps(profile && typeof mockData.getVisibleApplications === 'function' ? mockData.getVisibleApplications(profile.uid) : mockData.getApplications());
    setStructure(profile && typeof mockData.getVisibleSchoolStructure === 'function'
      ? mockData.getVisibleSchoolStructure(profile.uid)
      : mockData.getSchoolStructure());
    setEvents(profile && typeof mockData.getVisibleEvents === 'function' ? mockData.getVisibleEvents(profile.uid) : mockData.getEvents());
    
    // Check if the current user has selected student open to refresh their data
    if (selectedStudent) {
      const freshUser = mockData.getUserDetail(selectedStudent.uid);
      if (freshUser) {
        setSelectedStudent({ ...freshUser.profile, stats: freshUser.stats });
      }
    }
  };

  // Fix: Implemented missing handleApprove function for the applicants tab
  const handleApprove = (id: string, asMayor: boolean = false) => {
    mockData.approveApplication(id, asMayor ? 'mayor' : 'student');
    refresh();
  };

  // Fix: Implemented missing handleAdjustSanctionHours function for student detail modal
  const handleAdjustSanctionHours = (uid: string, delta: number) => {
    mockData.adjustSanctionHours(uid, delta, `Administrative Adjustment: ${profile?.name}`);
    refresh();
  };

  const handleAssignRole = (uid: string, role: 'student' | 'mayor') => {
    if (role === 'mayor' && currentNode) mockData.assignSectionMayor(uid, currentNode.id, currentNode.name);
    else mockData.assignRole(uid, role);
    const freshUser = mockData.getUserDetail(uid);
    if (freshUser) setSelectedStudent({ ...freshUser.profile, stats: freshUser.stats });
    refresh();
  };

  const confirmAdjustment = () => {
    if (!selectedStudent || !pendingAdjustment) return;
    handleAdjustSanctionHours(selectedStudent.uid, pendingAdjustment.delta);
    setPendingAdjustment(null);
  };

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 5000);
    return () => clearInterval(i);
  }, []);

  const handleAddAsset = () => {
    if (assetInput.trim() && !eventData.specificPeople.includes(assetInput.trim())) {
      setEventData(prev => ({ ...prev, specificPeople: [...prev.specificPeople, assetInput.trim()] }));
      setAssetInput('');
    }
  };

  const handleRemoveAsset = (id: string) => {
    setEventData(prev => ({ ...prev, specificPeople: prev.specificPeople.filter(p => p !== id) }));
  };

  const handleCaptureLocation = () => {
    setEventData(prev => ({ ...prev, isLocating: true }));
    navigator.geolocation.getCurrentPosition(pos => {
      setEventData(prev => ({ ...prev, lat: pos.coords.latitude, lng: pos.coords.longitude, isLocating: false }));
    }, () => {
      alert("Location Denied.");
      setEventData(prev => ({ ...prev, isLocating: false }));
    }, { enableHighAccuracy: true });
  };

  const handleCreateEvent = () => {
    const directoryAudience = audienceMode === 'directory_node' ? createEventAudienceTarget(eventAudiencePath) : null;
    const participantsType: AppEvent['participantsType'] = audienceMode === 'specific' ? 'specific' : directoryAudience?.participantsType || 'all';
    const finalTargetValue = audienceMode === 'specific' ? 'Specific people' : directoryAudience?.targetValue || 'All Students';
    const audienceTarget: AppEvent['audienceTarget'] = audienceMode === 'specific'
      ? { mode: 'specific_people', specificUserIds: eventData.specificPeople }
      : directoryAudience?.audienceTarget || { mode: 'all' };

    mockData.createEvent({
      title: eventData.title,
      description: eventData.description,
      status: 'active',
      created_by: profile?.name || 'System',
      startTime: new Date(eventData.startTime).getTime(),
      endTime: new Date(eventData.endTime).getTime(),
      penaltyValue: eventData.penaltyValue,
      penaltyUnit: eventData.penaltyUnit,
      participantsType,
      targetValue: finalTargetValue,
      audienceTarget,
      specificParticipants: eventData.specificPeople,
      target: { all: audienceMode === 'all' },
      location: { lat: eventData.lat, lng: eventData.lng, radius_meters: eventData.radius },
      timestamp: Date.now()
    } as any);

    setShowEventModal(false);
    setAudienceMode('all');
    setEventAudiencePath([]);
    setEventData({ 
      title: '', description: '', startTime: '', endTime: '', radius: 100, penaltyValue: 1, penaltyUnit: 'hours',
      specificPeople: [], lat: 7.0736, lng: 125.6126, isLocating: false
    });
    refresh();
  };

  const navigateTo = (node: SchoolNode) => setPath([...path, node]);
  const goBackTo = (index: number) => setPath(index === -1 ? [] : path.slice(0, index + 1));

  const handleSaveNode = (savedNode: SchoolNode) => {
    if (!nodeEditor) return;
    if (nodeEditor.node) mockData.updateSchoolNode(nodeEditor.node.id, savedNode);
    else mockData.addSchoolNode(nodeEditor.parentId, savedNode);
    setNodeEditor(null);
    refresh();
  };

  const handleApplyPreset = (preset: SchoolNode) => {
    const parentId = currentNode && ['campus', 'school'].includes(currentNode.type) ? currentNode.id : null;
    mockData.addSchoolNode(parentId, preset);
    setShowPresetModal(false);
    refresh();
  };

  const handleArchiveNode = (node: SchoolNode) => {
    mockData.archiveSchoolNode(node.id);
    refresh();
  };

  const handleDeleteNode = (node: SchoolNode) => {
    if (!window.confirm(`Delete ${node.name}? Units with children or active references cannot be deleted.`)) return;
    if (!mockData.deleteSchoolNode(node.id)) window.alert('This unit has children or active references. Archive it instead.');
    refresh();
  };

  const currentNode = path.length > 0 ? path[path.length - 1] : null;
  const subUnits = currentNode ? (currentNode.children || []) : structure;
  const isAtSection = currentNode?.type === 'section' || currentNode?.type === 'block';
  const students = isAtSection ? mockData.getStudentsBySection(currentNode.name, currentNode.id) : [];

  const createMember = () => {
    if (!currentNode) return;
    setMemberError('');
    try {
      if (memberData.password.length < 8) throw new Error('Temporary password must contain at least 8 characters.');
      const fullPath = mockData.getSchoolNodePath(currentNode.id);
      const serialized = serializeAcademicAssignment(fullPath);
      mockData.createSectionMembers([{
        makeMayor: false,
        profile: {
          name: memberData.name, email: memberData.email, username: memberData.username,
          student_id: memberData.studentId, role: 'student',
          school_data: { ...serialized.schoolData, school_id: serialized.assignment.campusId || 'school_rmc', academic_assignment: serialized.assignment },
        },
      }], currentNode.id, currentNode.name, memberData.password);
      setMemberData({ name: '', email: '', username: '', studentId: '', password: 'password123' });
      setShowMemberModal(false);
      refresh();
    } catch (caught) {
      setMemberError(caught instanceof Error ? caught.message : 'The member could not be created.');
    }
  };

  const tabs = [
    { id: 'hub' as const, label: 'Directory', icon: Building2, count: structure.length },
    ...(canReviewApplicants ? [{ id: 'applicants' as const, label: 'Applicants', icon: UserCheck, count: apps.length }] : []),
  ];

  const mapUrl = `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d15844.0!2d${eventData.lng}!3d${eventData.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!3m2!1sen!2sph!4v1620000000000!5m2!1sen!2sph&maptype=satellite`;
  const isOSSA = profile?.role === 'ossa' || profile?.role === 'ossa_staff';
  const workspaceName = profile?.role === 'admin' ? 'System Owner' : isOSSA ? 'OSSA' : profile?.role === 'mayor' ? 'Classroom' : 'SSG';

  return (
    <Page>
      <PageHeader
        eyebrow={`${workspaceName} administration`}
        title={profile?.role === 'admin' ? 'School Hierarchy & Accounts' : isOSSA ? 'OSSA Control Panel' : profile?.role === 'mayor' ? 'My Classroom' : 'Institution Control Hub'}
        description={isOSSA
          ? 'Manage student services and everything inside your assigned school scope.'
          : profile?.role === 'admin'
            ? 'Manage campuses, departments, classrooms, members, and officer accounts from one hierarchy.'
            : profile?.role === 'mayor'
              ? 'View only your assigned classroom and its member registry.'
              : 'Manage only the departments, classrooms, members, and events inside your assigned scope.'}
      />
      <Surface className="relative overflow-hidden !border-brand-800 !bg-brand-900 p-5 text-white shadow-xl sm:p-6">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gold-400/15 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="https://i.imgur.com/K3T5yIT.jpeg" 
              alt="IARS Academic Seal" 
              className="w-9 h-9 rounded-full object-cover ring-2 ring-gold-400/50 shadow-md shrink-0" 
            />
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">{workspaceName} Control Hub</h2>
              <p className="mt-0.5 text-xs font-semibold text-emerald-300">{isOSSA ? 'Student services operations' : 'Administrative operations'}</p>
            </div>
          </div>
          <div role="tablist" aria-label={`${workspaceName} panel sections`} className={`grid w-full ${tabs.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-1.5 rounded-xl border border-white/10 bg-brand-950/40 p-1.5 lg:w-auto`}>
            {tabs.map(({ id, label, icon: Icon, count }) => (
              <button key={id} aria-label={label} aria-pressed={tab === id} onClick={() => setTab(id)} className={`flex min-w-0 items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-xs font-bold transition-all sm:px-4 ${tab === id ? 'bg-gold-gradient text-brand-900 shadow-md' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                <Icon size={15} className="hidden sm:block" />
                <span className="truncate">{label}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${tab === id ? 'bg-brand-900/10' : 'bg-white/10'}`}>{count}</span>
              </button>
            ))}
          </div>
        </div>
      </Surface>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: profile?.role === 'admin' ? 'Campuses' : 'Visible roots', value: structure.length, detail: profile?.role === 'admin' ? 'Directory roots' : 'Assigned scope only', icon: Building2, tone: 'text-brand-700 bg-brand-50 dark:bg-brand-900/40 dark:text-brand-200' },
          { label: 'Pending review', value: apps.length, detail: apps.length === 1 ? 'Application waiting' : 'Applications waiting', icon: UserCheck, tone: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-200' },
          { label: 'Attendance events', value: events.length, detail: 'Institution records', icon: CalendarDays, tone: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-200' },
        ].map(({ label, value, detail, icon: Icon, tone }) => (
          <section key={label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={20} /></div>
            <div><p className="text-2xl font-bold leading-none text-brand-900 dark:text-white">{value}</p><p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">{label}</p><p className="text-xs text-slate-500 dark:text-slate-400">{detail}</p></div>
          </section>
        ))}
      </div>

      {/* HUB CONTENT */}
      <div className="min-h-[60vh]">
        {tab === 'hub' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2 overflow-x-auto no-scrollbar">
                <button onClick={() => goBackTo(-1)} className={`flex items-center gap-1.5 whitespace-nowrap text-[9px] font-bold uppercase tracking-widest ${path.length === 0 ? 'text-brand-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-400'}`}><Home size={14} /> {profile?.role === 'admin' ? 'Campus' : 'My scope'}</button>
                {path.map((node, i) => <React.Fragment key={node.id}><ChevronRight size={12} className="shrink-0 text-slate-200 dark:text-slate-600" /><button onClick={() => goBackTo(i)} className={`whitespace-nowrap text-[9px] font-bold uppercase tracking-widest ${i === path.length - 1 ? 'text-brand-900 dark:text-slate-100 font-black' : 'text-slate-400 dark:text-slate-400'}`}>{node.name}</button></React.Fragment>)}
              </div>
              {canManageStructure && currentNode && ['campus', 'school'].includes(currentNode.type) && <button onClick={() => setShowPresetModal(true)} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-50 px-3 text-xs font-bold text-brand-900 hover:bg-gold-50 dark:bg-brand-900/40 dark:text-brand-200"><WandSparkles size={15} /> Add template</button>}
            </div>

            {currentNode && <NodeOfficerManager actor={profile!} canManage={canManageOfficers} node={currentNode} onChanged={refresh} />}

            {!isAtSection ? (
              <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
                {subUnits.filter((node) => !node.metadata?.archived).map(node => (
                  <article key={node.id} className="group relative flex min-h-44 flex-col rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-gold-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
                    {canManageStructure && <div className="absolute right-2 top-2 flex gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus-within:opacity-100"><button aria-label="Edit unit" title={`Edit ${node.name}`} onClick={() => setNodeEditor({ parentId: currentNode?.id || null, node })} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:text-brand-900 dark:bg-slate-700 dark:text-slate-300"><Pencil size={13} /></button><button aria-label="Archive unit" title={`Archive ${node.name}`} onClick={() => handleArchiveNode(node)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:text-amber-700 dark:bg-slate-700 dark:text-slate-300"><Archive size={13} /></button><button aria-label="Delete unit" title={`Delete ${node.name}`} onClick={() => handleDeleteNode(node)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-950/40"><Trash2 size={13} /></button></div>}
                    <button onClick={() => navigateTo(node)} className="flex flex-1 flex-col items-center justify-center px-3 pt-5">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-brand-100 bg-brand-50 text-brand-900 transition-transform group-hover:scale-105 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300">{['school', 'campus'].includes(node.type) ? <School size={22} /> : ['section', 'block'].includes(node.type) ? <LayoutGrid size={22} /> : <BookOpen size={22} />}</div>
                      <h4 className="flex min-h-8 items-center text-[11px] font-bold uppercase tracking-tight text-brand-900 dark:text-slate-100">{node.name}</h4>
                      <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-slate-400">{getAcademicNodeLabel(node.type)}</p>
                      <NodeOfficerSummary node={node} />
                    </button>
                  </article>
                ))}
                {canManageStructure && <button aria-label="Add unit" onClick={() => setNodeEditor({ parentId: currentNode?.id || null })} className="group flex min-h-44 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-5 transition-all hover:border-gold-400 hover:bg-white dark:border-slate-700 dark:bg-slate-900/40 dark:hover:bg-slate-800">
                   <Plus size={20} className="text-slate-300 dark:text-slate-500 mb-1" />
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Add</p>
                </button>}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-lg overflow-hidden">
                 <div className="p-5 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="text-xs font-black text-brand-900 dark:text-slate-100 uppercase tracking-widest">{currentNode.name} Registry</h3>
                    <div className="flex items-center gap-2">
                       <span className="bg-white dark:bg-slate-800 px-3 py-1 rounded-lg text-[8px] font-bold text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-700">{students.length} Personnel</span>
                       {canManageMembers && <Button className="w-auto" onClick={() => { setMemberError(''); setShowMemberModal(true); }} size="sm"><Plus size={14} /> Add member</Button>}
                    </div>
                 </div>
                 <div className="hidden overflow-x-auto p-4 md:block">
                   <table aria-label={`${currentNode.name} personnel registry`} className="w-full table-fixed text-left text-sm">
                     <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:text-slate-300">
                       <tr><th className="w-1/4 p-3">Name</th><th className="w-1/4 p-3">Email</th><th className="w-1/5 p-3">Student ID</th><th className="w-1/6 p-3">Role</th><th className="p-3">Actions</th></tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                       {students.map((student) => (
                         <tr key={student.uid}>
                           <td className="p-3 font-semibold text-brand-900 [overflow-wrap:anywhere] dark:text-white">{student.name}</td>
                           <td className="p-3 text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300">{student.email}</td>
                           <td className="p-3 font-mono text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300">{student.student_id}</td>
                           <td className="p-3 text-slate-600 dark:text-slate-300">{roleLabels[student.role]}</td>
                           <td className="p-3"><button aria-label={`Manage ${student.name}`} className="font-semibold text-brand-900 underline-offset-4 hover:underline dark:text-gold-300" onClick={() => setSelectedStudent(student)}>Manage</button></td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
                 <div className="grid gap-3 p-4 md:hidden">
                   {students.map((student) => (
                     <article aria-label={student.name} className="mobile-data-card space-y-3" key={student.uid}>
                       <div className="flex min-w-0 items-center gap-3">
                         <img alt="" src={student.photo_url || undefined} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                         <div className="min-w-0"><h4 className="font-bold text-brand-900 [overflow-wrap:anywhere] dark:text-white">{student.name}</h4><p className="mt-1 text-sm text-slate-500 [overflow-wrap:anywhere] dark:text-slate-300">{student.student_id}</p><p className="mt-1 text-sm text-slate-500 [overflow-wrap:anywhere] dark:text-slate-300">{student.email}</p></div>
                       </div>
                       <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="font-semibold text-slate-500 dark:text-slate-400">Role</dt><dd className="text-slate-700 dark:text-slate-200">{roleLabels[student.role]}</dd></div><div><dt className="font-semibold text-slate-500 dark:text-slate-400">Sanctions</dt><dd className="text-red-600 dark:text-red-300">{student.stats.sanction_hours}h</dd></div></dl>
                       <Button aria-label={`Manage ${student.name}`} variant="secondary" onClick={() => setSelectedStudent(student)}>Manage</Button>
                     </article>
                   ))}
                 </div>
              </div>
            )}
          </div>
        )}

        {tab === 'applicants' && (
          <div className="grid grid-cols-1 gap-4 animate-in fade-in sm:grid-cols-2 xl:grid-cols-3">
            {apps.map(app => (
              <div key={app.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                <img alt="" src={app.form_data.photo_url || undefined} className="w-12 h-12 rounded-xl object-cover shadow-sm border border-slate-100 dark:border-slate-700" />
                <div className="flex-1 min-w-0">
                  <h4 className="mb-2 text-[11px] font-bold uppercase tracking-tight text-brand-900 [overflow-wrap:anywhere] dark:text-slate-100">{app.form_data.name}</h4>
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(app.id)} className="flex-1 py-1.5 bg-green-500 text-white text-[8px] font-black rounded-lg uppercase tracking-widest hover:bg-green-600">Verify</button>
                    <button onClick={() => handleApprove(app.id, true)} className="flex-1 py-1.5 bg-brand-900 text-white text-[8px] font-black rounded-lg uppercase tracking-widest hover:bg-brand-800">Mayor</button>
                  </div>
                </div>
              </div>
            ))}
            {apps.length === 0 && <EmptyState icon={Inbox} title="No pending applications" description="New student and mayor applications will appear here for review." />}
          </div>
        )}

        {tab === 'events' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-center sm:justify-between">
               <h3 className="text-[10px] font-black text-brand-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                 <Target size={14} className="text-gold-500" /> Operational Log
               </h3>
               <button aria-label="Create event" onClick={() => setShowEventModal(true)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold-gradient px-4 py-3 text-[9px] font-black uppercase tracking-widest text-brand-900 shadow-md transition-all hover:brightness-110 active:scale-95 sm:w-auto sm:py-2">
                 <CalendarPlus size={14} /> Create
               </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
               {events.map(ev => (
                 <div key={ev.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-4">
                       <div className="w-9 h-9 bg-brand-50 dark:bg-brand-900/40 rounded-lg flex items-center justify-center text-brand-900 dark:text-brand-300 border border-brand-100 dark:border-brand-800">
                          <MapPin size={18} />
                       </div>
                       <span className="text-[7px] font-black bg-green-50 dark:bg-green-950/60 text-green-600 dark:text-green-400 px-2.5 py-1 rounded-full uppercase tracking-widest border border-green-100 dark:border-green-800/60">{ev.status}</span>
                    </div>
                    <h4 className="text-sm font-black text-brand-900 dark:text-slate-100 uppercase tracking-tight mb-1">{ev.title}</h4>
                    <div className="flex items-center gap-1.5 text-[8px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-widest">
                       <Target size={12} className="text-slate-300 dark:text-slate-500" /> {ev.location.radius_meters}m 
                       <span className="mx-1 opacity-30">|</span>
                       <Users size={12} className="text-slate-300 dark:text-slate-500" /> {ev.participantsType}
                    </div>
                 </div>
               ))}
               {events.length === 0 && <EmptyState icon={CalendarDays} title="No events yet" description="Create the first attendance event for your institution." />}
            </div>
          </div>
        )}
      </div>

      {/* CREATE EVENT MODAL - THREADED TARGETING & FULL DESCRIPTION */}
      <Modal
        open={showEventModal}
        onClose={() => setShowEventModal(false)}
        closeOnBackdrop={false}
        title="Strategic deployment"
        description="Create an institution event, define its attendance window, audience, location, and penalty."
        size="xl"
        footer={(
          <Button
            aria-label="Authorize deployment protocol"
            variant="gold"
            className="sm:w-auto"
            onClick={handleCreateEvent}
            disabled={!eventData.title || !eventData.startTime || !eventData.endTime || (audienceMode === 'directory_node' && eventAudiencePath.length === 0) || (audienceMode === 'specific' && eventData.specificPeople.length === 0)}
          >
            Deploy
          </Button>
        )}
      >
              <div className="space-y-10 bg-slate-50/40 dark:bg-slate-900/40">
                 {/* CORE INFO */}
                 <div className="space-y-6">
                    <div className="space-y-2">
                       <label htmlFor="deployment-title" className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-2">
                         <Target size={14} className="text-gold-500" /> Deployment Title
                       </label>
                       <input 
                         id="deployment-title"
                         placeholder="e.g. 2nd Semester Institutional Assembly" 
                         className="w-full p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-brand-900 dark:text-slate-100 text-sm shadow-sm focus:border-gold-400 outline-none" 
                         value={eventData.title}
                         onChange={e => setEventData({...eventData, title: e.target.value})}
                       />
                    </div>
                    
                    <div className="space-y-2">
                       <label htmlFor="deployment-description" className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-2">
                         <FileText size={14} className="text-brand-900 dark:text-slate-100" /> Administrative Description (No Truncation)
                       </label>
                       <textarea 
                         id="deployment-description"
                         placeholder="Detail the full instructional parameters, objectives, and any prerequisites for this event here..." 
                         rows={5}
                         className="w-full p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl font-bold text-brand-900 dark:text-slate-100 text-sm shadow-sm focus:border-gold-400 outline-none resize-none whitespace-pre-wrap leading-relaxed" 
                         value={eventData.description}
                         onChange={e => setEventData({...eventData, description: e.target.value})}
                       />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                       <div className="space-y-2">
                          <label htmlFor="deployment-start" className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Window Open</label>
                          <input id="deployment-start" type="datetime-local" className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-brand-900 dark:text-slate-100 text-xs shadow-sm" value={eventData.startTime} onChange={e => setEventData({...eventData, startTime: e.target.value})} />
                       </div>
                       <div className="space-y-2">
                          <label htmlFor="deployment-end" className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Window Close</label>
                          <input id="deployment-end" type="datetime-local" className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-brand-900 dark:text-slate-100 text-xs shadow-sm" value={eventData.endTime} onChange={e => setEventData({...eventData, endTime: e.target.value})} />
                       </div>
                    </div>
                 </div>

                 {/* SATELLITE MAP */}
                 <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-brand-900 dark:text-slate-100 tracking-widest flex items-center gap-2">
                       <Map size={16} className="text-gold-500" /> Operational Perimeter
                    </h4>
                    <div className="bg-brand-950 rounded-[3rem] overflow-hidden border-2 border-slate-200 shadow-xl relative aspect-video">
                       <iframe title="Event perimeter map" src={mapUrl} className="w-full h-full opacity-90" style={{ border: 0, filter: 'grayscale(0.1)' }} loading="lazy"></iframe>
                       <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="border-4 border-gold-400/20 bg-gold-400/5 rounded-full animate-pulse" style={{ width: '150px', height: '150px' }}></div>
                          <Crosshair size={40} className="text-gold-400 absolute opacity-40" />
                       </div>
                       <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end pointer-events-none">
                          <button aria-label="Capture current event location" onClick={handleCaptureLocation} className="p-4 bg-brand-900 text-gold-400 rounded-2xl shadow-xl pointer-events-auto hover:bg-gold-400 hover:text-brand-900 transition-all border border-gold-400/20">
                             <Crosshair size={24} className={eventData.isLocating ? 'animate-spin' : ''} />
                          </button>
                          <div className="bg-brand-900/90 backdrop-blur-md p-5 rounded-[2rem] border border-white/10 pointer-events-auto min-w-[160px] shadow-2xl">
                             <div className="flex justify-between items-center mb-2">
                                <label htmlFor="event-radius" className="text-[8px] font-black text-gold-400/50 uppercase tracking-widest">Radius</label>
                                <span className="text-[10px] text-white font-black">{eventData.radius}m</span>
                             </div>
                             <input id="event-radius" type="range" min="50" max="2000" step="50" className="w-full accent-gold-400" value={eventData.radius} onChange={e => setEventData({...eventData, radius: parseInt(e.target.value)})} />
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* THREADED TARGETING SYSTEM */}
                 <div className="space-y-6">
                    <h4 className="text-xs font-black uppercase text-brand-900 dark:text-slate-100 tracking-widest flex items-center gap-2">
                       <Users2 size={16} className="text-gold-500" /> Target Population Thread
                    </h4>
                    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-8">
                       <CustomSelect label="Audience type" options={[{ value: 'all', label: 'All institution members' }, { value: 'directory_node', label: 'Academic directory group' }, { value: 'specific', label: 'Specific people or IDs' }]} value={audienceMode} onChange={(value) => { setAudienceMode(value as typeof audienceMode); setEventAudiencePath([]); }} />
                       {audienceMode === 'directory_node' && <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50"><p className="mb-3 text-sm font-bold text-brand-900 dark:text-white">Choose any academic unit</p><AcademicPathPicker roots={structure} value={eventAudiencePath.map((node) => node.id)} onChange={setEventAudiencePath} purpose="events" /></div>}

                       {/* SPECIFIC ASSET UIDs (MANUAL) */}
                       {audienceMode === 'specific' && (
                          <div className="space-y-4 animate-in slide-in-from-top-2">
                             <label htmlFor="asset-identifier" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                               <Fingerprint size={14} className="text-brand-900 dark:text-slate-100"/> Asset ID Registry
                             </label>
                             <div className="flex flex-col gap-2 sm:flex-row">
                                <input 
                                  id="asset-identifier"
                                  placeholder="Enter Student ID or UID..." 
                                  className="flex-1 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-brand-900 dark:text-slate-100 text-xs focus:border-gold-400 outline-none" 
                                  value={assetInput}
                                  onChange={e => setAssetInput(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && handleAddAsset()}
                                />
                                <button onClick={handleAddAsset} className="rounded-xl bg-brand-900 px-6 py-3 text-[10px] font-black uppercase text-gold-400 transition-colors hover:bg-brand-800">Add ID</button>
                             </div>
                             <div className="flex flex-wrap gap-2 pt-2">
                                {eventData.specificPeople.map(id => (
                                   <span key={id} className="bg-slate-100 dark:bg-slate-700 text-brand-900 dark:text-slate-100 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight flex items-center gap-2 border border-slate-200 dark:border-slate-600">
                                      {id} <button aria-label={`Remove asset ${id}`} onClick={() => handleRemoveAsset(id)}><X size={12} className="text-red-500" /></button>
                                   </span>
                                ))}
                                {eventData.specificPeople.length === 0 && <p className="text-[8px] text-slate-300 dark:text-slate-500 font-bold uppercase tracking-widest italic p-2">Queue empty: Add identifiers above</p>}
                             </div>
                          </div>
                       )}
                    </div>
                 </div>

                 {/* PENALTY LOGIC */}
                 <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-brand-900 dark:text-slate-100 tracking-widest flex items-center gap-2">
                       <AlertTriangle size={16} className="text-red-500" /> Attendance Penalty Logic
                    </h4>
                    <div className="flex h-full flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-end sm:p-8">
                       <div className="flex-1 space-y-1.5">
                          <label htmlFor="service-value" className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Service Value</label>
                          <input id="service-value" type="number" min="1" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl font-bold text-brand-900 dark:text-slate-100 text-sm outline-none" value={eventData.penaltyValue} onChange={e => setEventData({...eventData, penaltyValue: parseInt(e.target.value)})} />
                       </div>
                       <div className="w-full space-y-1.5 sm:w-28">
                          <CustomSelect 
                            label="Temporal Unit"
                            options={[
                              { value: 'hours', label: 'Hours' },
                              { value: 'minutes', label: 'Minutes' }
                            ]}
                            value={eventData.penaltyUnit}
                            onChange={val => setEventData({...eventData, penaltyUnit: val as any})}
                          />
                       </div>
                    </div>
                 </div>
              </div>
      </Modal>

      <Modal
        open={showMemberModal}
        onClose={() => setShowMemberModal(false)}
        title={`Add member to ${currentNode?.name || 'classroom'}`}
        description="Create the student inside this classroom. You can designate the classroom mayor from the member details afterward."
        footer={<><Button onClick={() => setShowMemberModal(false)} variant="secondary">Cancel</Button><Button onClick={createMember}><Plus size={16} /> Create member</Button></>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">Full name<input className={memberFieldClass} onChange={(event) => setMemberData({ ...memberData, name: event.target.value })} required value={memberData.name} /></label>
          <label className="text-sm font-semibold">Student ID<input className={memberFieldClass} onChange={(event) => setMemberData({ ...memberData, studentId: event.target.value })} required value={memberData.studentId} /></label>
          <label className="text-sm font-semibold">Email<input className={memberFieldClass} onChange={(event) => setMemberData({ ...memberData, email: event.target.value })} required type="email" value={memberData.email} /></label>
          <label className="text-sm font-semibold">Username<input className={memberFieldClass} onChange={(event) => setMemberData({ ...memberData, username: event.target.value })} required value={memberData.username} /></label>
          <label className="text-sm font-semibold sm:col-span-2">Temporary password<input className={memberFieldClass} minLength={8} onChange={(event) => setMemberData({ ...memberData, password: event.target.value })} required type="password" value={memberData.password} /></label>
          {memberError ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:col-span-2 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200" role="alert">{memberError}</p> : null}
        </div>
      </Modal>

      <DirectoryNodeModal open={Boolean(nodeEditor)} parent={currentNode} node={nodeEditor?.node} onClose={() => setNodeEditor(null)} onSave={handleSaveNode} />
      <PresetPickerModal open={showPresetModal} campusName={currentNode?.name || 'Campus'} onClose={() => setShowPresetModal(false)} onApply={handleApplyPreset} />

      {/* REGAL USER DETAIL MODAL */}
      <Modal
        open={Boolean(selectedStudent)}
        onClose={() => setSelectedStudent(null)}
        title={`Member details: ${selectedStudent?.name || ''}`}
        description="Review attendance standing and manage authorized member actions."
        size="lg"
      >
        {selectedStudent ? (
          <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 sm:flex-row">
            <div className="sm:w-[42%] bg-brand-900 p-6 flex flex-col items-center text-center border-b-2 sm:border-b-0 sm:border-r-2 border-gold-400/20">
               <div className="relative mb-5 mt-4">
                  <img alt={`${selectedStudent.name} profile`} src={selectedStudent.photo_url || undefined} className="w-28 h-28 rounded-2xl object-cover border-4 border-gold-400/30 shadow-lg" />
                  <div className="absolute -bottom-2 -right-2 bg-gold-400 p-2 rounded-lg border-2 border-brand-900 shadow-lg text-brand-900">
                     <Shield size={16} />
                  </div>
               </div>
               <h3 className="text-white text-lg font-black uppercase tracking-tight mb-1 leading-tight [overflow-wrap:anywhere]">{selectedStudent.name}</h3>
               <p className="text-gold-300 text-xs font-bold uppercase tracking-widest mb-8 [overflow-wrap:anywhere]">ID-{selectedStudent.student_id}</p>
               <div className="w-full space-y-2">
                  <div className="flex items-center gap-2 bg-white/5 px-3 py-2.5 rounded-lg text-white/70 text-xs font-bold border border-white/5 overflow-hidden">
                     <Mail size={12} className="text-gold-400/70 shrink-0" /> <span className="min-w-0 [overflow-wrap:anywhere]">{selectedStudent.email}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 px-3 py-2.5 rounded-lg text-white/40 text-[7px] font-bold uppercase tracking-widest border border-white/5">
                     <Phone size={12} className="text-gold-400/70 shrink-0" /> {selectedStudent.phone || 'UNLINKED'}
                  </div>
               </div>
            </div>
            <div className="sm:w-[58%] p-8 space-y-8 bg-white dark:bg-slate-800 flex flex-col justify-center">
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                     <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest mb-1">Success Score</p>
                     <p className="text-3xl font-black text-brand-900 dark:text-slate-100">98%</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950/60 p-4 rounded-xl border border-red-100 dark:border-red-900/50 text-center shadow-sm">
                     <p className="text-[7px] font-black uppercase text-red-400 tracking-widest mb-1">Service Hours</p>
                     <p className="text-3xl font-black text-red-600 dark:text-red-400">{selectedStudent.stats.sanction_hours}</p>
                  </div>
               </div>
               {canManageMembers && <div className="space-y-4">
                  <h4 className="text-[8px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <ShieldAlert size={12} /> Hour Modification
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                     <button aria-label="Add one sanction hour" onClick={() => setPendingAdjustment({ delta: 1, action: 'add hour' })} className="py-4 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-200 dark:hover:bg-red-900 transition-all flex items-center justify-center gap-1.5 shadow-sm">
                        <Plus size={16} /> Add
                     </button>
                     <button aria-label="Clear one sanction hour" disabled={!isPresident} onClick={() => setPendingAdjustment({ delta: -1, action: 'clear hour' })} className={`py-4 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-sm ${isPresident ? 'bg-green-50 dark:bg-green-950/80 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900 border border-green-200 dark:border-green-800' : 'bg-slate-50 dark:bg-slate-900 text-slate-300 dark:text-slate-600 opacity-40 cursor-not-allowed'}`}>
                        {isPresident ? <Minus size={16} /> : <Lock size={12} />} Clear
                     </button>
                  </div>
               </div>}
               {canManageMembers && <div className="space-y-4">
                  <h4 className="text-[8px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <UserIcon size={12} /> Designation Control
                  </h4>
                  <div className="flex bg-slate-50 dark:bg-slate-900 p-1.5 rounded-xl gap-1.5 border border-slate-100 dark:border-slate-700 shadow-inner">
                     <button onClick={() => handleAssignRole(selectedStudent.uid, 'student')} className={`flex-1 py-3 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${selectedStudent.role === 'student' ? 'bg-brand-900 text-white shadow-md' : 'text-slate-400'}`}>Regular</button>
                     <button onClick={() => handleAssignRole(selectedStudent.uid, 'mayor')} className={`flex-1 py-3 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${selectedStudent.role === 'mayor' ? 'bg-gold-gradient text-brand-900 shadow-md' : 'text-slate-400'}`}>Mayor</button>
                  </div>
               </div>}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(pendingAdjustment)}
        onClose={() => setPendingAdjustment(null)}
        closeOnBackdrop={false}
        title="Confirm sanction change"
        description={`This will ${pendingAdjustment?.action || 'change sanctions'} for ${selectedStudent?.name || 'the selected member'}.`}
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setPendingAdjustment(null)}>Cancel</Button>
            <Button aria-label={`Confirm ${pendingAdjustment?.action}`} variant="gold" onClick={confirmAdjustment}>Confirm</Button>
          </>
        )}
      >
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">The adjustment is recorded as an administrative action and updates the member's service-hour total immediately.</p>
      </Modal>
    </Page>
  );
};

const EmptyState = ({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) => (
  <div className="col-span-full flex min-h-56 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-800/50">
    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-300"><Icon size={22} /></div>
    <h3 className="font-bold text-brand-900 dark:text-white">{title}</h3>
    <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
  </div>
);

export default SSGPanel;
