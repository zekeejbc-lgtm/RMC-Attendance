
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../components/AuthContext';
import { mockData } from '../lib/mockBackend';
import { SchoolNode, UserProfile } from '../types';
import { 
  ChevronRight, Plus, Users, School, GraduationCap, 
  BookOpen, Layers, UserPlus, Building2, Search
} from 'lucide-react';
import CustomSelect from '../components/ui/CustomSelect';
import Button from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Page, PageHeader, Surface } from '../components/ui/Page';

const deriveSchoolData = (path: SchoolNode[]): UserProfile['school_data'] => {
  const school = path.find((node) => node.type === 'school');
  const rootDepartment = path.find((node) => node.type === 'department');
  const college = path.find((node) => node.type === 'college');
  const track = path.find((node) => node.type === 'track');
  const strand = path.find((node) => node.type === 'strand');
  const program = path.find((node) => node.type === 'program');
  const level = path.find((node) => node.type === 'level');
  const section = [...path].reverse().find((node) => node.type === 'section');
  const isCollege = path.some((node) => node.type === 'college' || (node.type !== 'school' && /\bcollege\b/i.test(node.name)));

  if (isCollege) {
    return {
      type: 'College',
      department: college?.name || track?.name || rootDepartment?.name,
      ...((program?.name || strand?.name) ? { program: program?.name || strand?.name } : {}),
      level: level?.name || '',
      section: section?.name || '',
      school_id: school?.id || 'school_rmc',
    };
  }

  return {
    type: 'High School',
    department: rootDepartment?.name,
    ...(track?.name ? { track: track.name } : {}),
    ...(strand?.name ? { strand: strand.name } : {}),
    level: level?.name || '',
    section: section?.name || '',
    school_id: school?.id || 'school_rmc',
  };
};

const ManageMembers: React.FC = () => {
  const { isMock } = useAuth();
  const [structure, setStructure] = useState<SchoolNode[]>([]);
  const [currentPath, setCurrentPath] = useState<SchoolNode[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberRole, setMemberRole] = useState<'all' | UserProfile['role']>('all');
  
  // Create Modal State
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState('');
  const [assignOfficer, setAssignOfficer] = useState(false);
  const [officerData, setOfficerData] = useState({ name: '', email: '', username: '' });
  const [memberData, setMemberData] = useState({ name: '', email: '', username: '', studentId: '', role: 'student' as UserProfile['role'] });

  useEffect(() => {
    if (isMock) {
      const data = mockData.getSchoolStructure();
      setStructure(data);
      if (data.length > 0 && currentPath.length === 0) {
        setCurrentPath([data[0]]); // Start at root
      }
    }
  }, [isMock]);

  const currentNode = useMemo(() => {
    if (currentPath.length === 0) return null;
    return currentPath[currentPath.length - 1];
  }, [currentPath]);

  const handleNavigate = (node: SchoolNode) => {
    setCurrentPath([...currentPath, node]);
  };

  const handleBreadcrumbClick = (index: number) => {
    setCurrentPath(currentPath.slice(0, index + 1));
  };

  const getChildType = (parentType: string, parentName?: string): string => {
    switch (parentType) {
      case 'school': return 'department';
      case 'department': return 'college'; // Default fallback
      case 'college': return 'program';
      case 'secondary': return 'sub_department'; // Junior/Senior High School
      case 'sub_department': 
        if (parentName?.toLowerCase().includes('senior')) return 'strand';
        return 'level'; // Junior High School -> Level
      case 'strand': return 'level'; // Or specialization (optional)
      case 'elementary': return 'level';
      case 'special': return 'level';
      case 'program': return 'level'; // Or major (optional)
      case 'level': return 'section';
      case 'track': return 'strand';
      default: return 'node';
    }
  };

  const handleCreate = () => {
    if (!currentNode) return;
    
    // If user selected a specific type in modal (e.g., Major vs Level), use that
    const type = newItemType || getChildType(currentNode.type, currentNode.name);
    
    // Create Node
    const newNode: SchoolNode = {
      id: `${type}_${Date.now()}`,
      name: newItemName,
      type: type as any,
      children: []
    };

    // Add Node to Backend
    mockData.addSchoolNode(currentNode.id, newNode);

    // Create Officer if needed
    if (assignOfficer && officerData.name) {
      const role = type === 'section' ? 'mayor' : 'ssg'; // Governor/Council as SSG for now
      mockData.createUser({
        name: officerData.name,
        email: officerData.email,
        username: officerData.username,
        role: role,
        student_id: `OFF-${Date.now()}`,
        school_data: deriveSchoolData([...currentPath, newNode]),
      });
    }

    // Refresh Structure
    const data = mockData.getSchoolStructure();
    setStructure(data);
    
    // Re-build current path with new data references
    const newPath: SchoolNode[] = [];
    let searchNodes = data;
    
    for (const pathNode of currentPath) {
      const found = searchNodes.find(n => n.id === pathNode.id);
      if (found) {
        newPath.push(found);
        if (found.children) {
          searchNodes = found.children;
        }
      }
    }
    setCurrentPath(newPath);
    
    setShowCreateModal(false);
    setNewItemName('');
    setNewItemType('');
    setAssignOfficer(false);
    setOfficerData({ name: '', email: '', username: '' });
  };

  const handleCreateMember = () => {
    if (!currentNode || !memberData.name || !memberData.email || !memberData.username || !memberData.studentId) return;
    mockData.createUser({
      name: memberData.name,
      email: memberData.email,
      username: memberData.username,
      role: memberData.role,
      student_id: memberData.studentId,
      school_data: deriveSchoolData(currentPath),
    });
    setMemberData({ name: '', email: '', username: '', studentId: '', role: 'student' });
    setShowMemberModal(false);
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'school': return <School className="text-brand-900 dark:text-gold-400" />;
      case 'department': return <Building2 className="text-brand-900 dark:text-gold-400" />;
      case 'college': return <GraduationCap className="text-brand-900 dark:text-gold-400" />;
      case 'secondary': return <School className="text-brand-900 dark:text-gold-400" />;
      case 'elementary': return <School className="text-brand-900 dark:text-gold-400" />;
      case 'special': return <School className="text-brand-900 dark:text-gold-400" />;
      case 'program': return <BookOpen className="text-brand-900 dark:text-gold-400" />;
      case 'level': return <Layers className="text-brand-900 dark:text-gold-400" />;
      case 'section': return <Users className="text-brand-900 dark:text-gold-400" />;
      default: return <ChevronRight className="text-brand-900 dark:text-gold-400" />;
    }
  };

  if (!currentNode) return <Page><p>Loading directory…</p></Page>;

  const childType = getChildType(currentNode.type, currentNode.name);
  const isSection = currentNode.type === 'section';

  // Determine if we need to ask for specific types (e.g. Major vs Level)
  const needsTypeSelection = ['program', 'strand'].includes(currentNode.type);
  const sectionMembers = isSection
    ? mockData.getStudentsBySection(currentNode.name) as Array<UserProfile & { stats?: { sanction_hours: number } }>
    : [];
  const filteredMembers = sectionMembers.filter((member) => {
    const query = memberSearch.trim().toLowerCase();
    const matchesQuery = !query || [member.name, member.email, member.student_id, member.username]
      .some((value) => value.toLowerCase().includes(query));
    return matchesQuery && (memberRole === 'all' || member.role === memberRole);
  });

  return (
    <Page>
      <PageHeader
        eyebrow="Staff tools"
        title="Directory & Management"
        description="Manage school structure, member records, and attendance officers."
        actions={!isSection ? (
          <Button
            onClick={() => {
              setNewItemType('');
              setShowCreateModal(true);
            }}
            className="sm:w-auto"
          >
            <Plus size={16} /> Add {needsTypeSelection ? 'Item' : childType.replace('_', ' ')}
          </Button>
        ) : undefined}
      />

      {/* BREADCRUMBS */}
      <nav aria-label="Directory breadcrumb" className="flex items-center gap-2 overflow-x-auto pb-2">
        {currentPath.map((node, index) => (
          <React.Fragment key={node.id}>
            {index > 0 && <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />}
            <button 
              onClick={() => handleBreadcrumbClick(index)}
              className={`text-xs font-bold uppercase tracking-wider whitespace-nowrap ${
                index === currentPath.length - 1 
                  ? 'text-brand-900 dark:text-gold-400 bg-gold-50 dark:bg-gold-950/40 px-3 py-1 rounded-full border border-gold-200 dark:border-gold-800' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-brand-900 dark:hover:text-slate-200'
              }`}
            >
              {node.name}
            </button>
          </React.Fragment>
        ))}
      </nav>

      {/* CONTENT */}
      <Surface className="min-h-[400px] p-4 sm:p-6">
        {isSection ? (
          <div className="space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-brand-900 dark:text-white">{currentNode.name} member registry</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{sectionMembers.length} members in this section</p>
              </div>
              <div className="grid w-full gap-3 sm:grid-cols-2 lg:flex lg:w-auto lg:flex-wrap">
                <label className="relative block min-w-0 lg:w-64">
                  <span className="sr-only">Search section members</span>
                  <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    aria-label="Search section members"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-brand-900 outline-none focus:border-gold-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    onChange={(event) => setMemberSearch(event.target.value)}
                    placeholder="Search name, email, or ID"
                    type="search"
                    value={memberSearch}
                  />
                </label>
                <label className="min-w-0">
                  <span className="sr-only">Filter members by role</span>
                  <select
                    aria-label="Filter members by role"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-brand-900 outline-none focus:border-gold-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    onChange={(event) => setMemberRole(event.target.value as typeof memberRole)}
                    value={memberRole}
                  >
                    <option value="all">All roles</option>
                    <option value="student">Students</option>
                    <option value="mayor">Mayors</option>
                  </select>
                </label>
                <Button variant="gold" className="sm:col-span-2 lg:w-auto" onClick={() => setShowMemberModal(true)}>
                  <UserPlus size={16} /> Add member
                </Button>
              </div>
            </div>

            {filteredMembers.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">No members match the selected filters.</p>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table aria-label={`${currentNode.name} member registry`} className="w-full table-fixed text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:text-slate-300">
                      <tr><th className="w-1/4 p-3">Name</th><th className="w-1/4 p-3">Email</th><th className="w-1/4 p-3">Student ID</th><th className="w-1/4 p-3">Role</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {filteredMembers.map((member) => (
                        <tr key={member.uid}>
                          <td className="p-3 font-semibold text-brand-900 [overflow-wrap:anywhere] dark:text-white">{member.name}</td>
                          <td className="p-3 text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300">{member.email}</td>
                          <td className="p-3 font-mono text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300">{member.student_id}</td>
                          <td className="p-3 capitalize text-slate-600 dark:text-slate-300">{member.role}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="grid gap-3 md:hidden">
                  {filteredMembers.map((member) => (
                    <article aria-label={member.name} className="mobile-data-card space-y-3" key={member.uid}>
                      <h3 className="font-bold text-brand-900 [overflow-wrap:anywhere] dark:text-white">{member.name}</h3>
                      <dl className="grid gap-3 text-sm">
                        <div><dt className="font-semibold text-slate-500 dark:text-slate-400">Email</dt><dd className="mt-1 text-slate-700 [overflow-wrap:anywhere] dark:text-slate-200">{member.email}</dd></div>
                        <div><dt className="font-semibold text-slate-500 dark:text-slate-400">Student ID</dt><dd className="mt-1 font-mono text-slate-700 [overflow-wrap:anywhere] dark:text-slate-200">{member.student_id}</dd></div>
                        <div><dt className="font-semibold text-slate-500 dark:text-slate-400">Role</dt><dd className="mt-1 capitalize text-slate-700 dark:text-slate-200">{member.role}</dd></div>
                      </dl>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {currentNode.children && currentNode.children.length > 0 ? (
              currentNode.children.map(child => (
                <button
                  key={child.id}
                  onClick={() => handleNavigate(child)}
                  className="group p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl cursor-pointer hover:border-gold-400 dark:hover:border-gold-400 hover:shadow-md transition-all flex flex-col items-center text-center gap-4"
                >
                  <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center group-hover:border-gold-400 transition-colors">
                    {renderIcon(child.type)}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-brand-900 dark:text-slate-100 uppercase tracking-tight group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors">
                      {child.name}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                      {child.type}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div className="col-span-full text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest">No {childType}s found</p>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 text-brand-900 dark:text-gold-400 text-xs font-black uppercase tracking-widest hover:text-gold-600 dark:hover:text-gold-300"
                >
                  Create First {childType}
                </button>
              </div>
            )}
          </div>
        )}
      </Surface>

      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={`Create new ${needsTypeSelection ? 'item' : childType.replace('_', ' ')}`}
        description={`Add a unit beneath ${currentNode.name}.`}
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button variant="gold" onClick={handleCreate} disabled={!newItemName || (childType === 'department' && !newItemType)}>
              Create {childType.replace('_', ' ')}
            </Button>
          </>
        )}
      >
        <div className="space-y-4">
              {childType === 'department' && (
                <div className="space-y-2">
                   <CustomSelect
                      label="Department Type"
                      options={[
                        { value: 'college', label: 'College (Tertiary)' },
                        { value: 'secondary', label: 'Secondary (High School)' },
                        { value: 'elementary', label: 'Elementary' },
                        { value: 'special', label: 'Special' }
                      ]}
                      value={newItemType}
                      onChange={(val) => setNewItemType(val as string)}
                      placeholder="Select Department Type..."
                   />
                </div>
              )}

              {childType === 'sub_department' && (
                <div className="space-y-2">
                   <CustomSelect
                      label="School Unit"
                      options={[
                        { value: 'Senior High School', label: 'Senior High School' },
                        { value: 'Junior High School', label: 'Junior High School' }
                      ]}
                      value={newItemName}
                      onChange={(val) => setNewItemName(val as string)}
                      placeholder="Select Unit..."
                   />
                </div>
              )}

              {currentNode.type === 'program' && (
                <div className="space-y-2">
                   <CustomSelect
                      label="Item Type"
                      options={[
                        { value: 'major', label: 'Major' },
                        { value: 'level', label: 'Year Level' }
                      ]}
                      value={newItemType}
                      onChange={(val) => setNewItemType(val as string)}
                      placeholder="Select Type..."
                   />
                </div>
              )}

              {currentNode.type === 'strand' && (
                <div className="space-y-2">
                   <CustomSelect
                      label="Item Type"
                      options={[
                        { value: 'specialization', label: 'Specialization' },
                        { value: 'level', label: 'Year Level' }
                      ]}
                      value={newItemType}
                      onChange={(val) => setNewItemType(val as string)}
                      placeholder="Select Type..."
                   />
                </div>
              )}

              {childType !== 'sub_department' && (
                <div className="space-y-2">
                  <label htmlFor="new-unit-name" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</label>
                  <input 
                    id="new-unit-name"
                    type="text" 
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-brand-900 dark:text-slate-100 outline-none focus:border-gold-400"
                    placeholder={`Enter ${newItemType || childType} name...`}
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                  />
                </div>
              )}

              {/* Conditional Officer Creation */}
              {(childType === 'college' || childType === 'section') && (
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 accent-gold-400"
                      checked={assignOfficer}
                      onChange={(e) => setAssignOfficer(e.target.checked)}
                    />
                    <span className="text-xs font-bold text-brand-900 dark:text-slate-100 uppercase tracking-wide">
                      {childType === 'section' ? 'Assign Mayor / Attendance Officer' : 'Assign Governor / Local Council'}
                    </span>
                  </label>

                  {assignOfficer && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                      <input
                        aria-label="Officer name"
                        type="text" 
                        placeholder="Officer Name" 
                        className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-brand-900 dark:text-slate-100 outline-none focus:border-gold-400"
                        value={officerData.name}
                        onChange={(e) => setOfficerData({...officerData, name: e.target.value})}
                      />
                      <input
                        aria-label="Officer email address"
                        type="email" 
                        placeholder="Email Address" 
                        className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-brand-900 dark:text-slate-100 outline-none focus:border-gold-400"
                        value={officerData.email}
                        onChange={(e) => setOfficerData({...officerData, email: e.target.value})}
                      />
                      <input
                        aria-label="Officer username"
                        type="text" 
                        placeholder="Username" 
                        className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-brand-900 dark:text-slate-100 outline-none focus:border-gold-400"
                        value={officerData.username}
                        onChange={(e) => setOfficerData({...officerData, username: e.target.value})}
                      />
                    </div>
                  )}
                </div>
              )}

        </div>
      </Modal>

      <Modal
        open={showMemberModal}
        onClose={() => setShowMemberModal(false)}
        closeOnBackdrop={false}
        title={`Add member to ${currentNode.name}`}
        description="Create a member record and assign its initial directory role."
        size="md"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setShowMemberModal(false)}>Cancel</Button>
            <Button
              variant="gold"
              onClick={handleCreateMember}
              disabled={!memberData.name || !memberData.email || !memberData.username || !memberData.studentId}
            >
              Create member
            </Button>
          </>
        )}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ['member-name', 'Legal full name', 'name', 'text'],
            ['member-email', 'Email address', 'email', 'email'],
            ['member-username', 'Username', 'username', 'text'],
            ['member-student-id', 'Student ID', 'studentId', 'text'],
          ].map(([id, label, key, type]) => (
            <label className="space-y-1.5" htmlFor={id} key={id}>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-brand-900 outline-none focus:border-gold-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                id={id}
                onChange={(event) => setMemberData({ ...memberData, [key]: event.target.value })}
                required
                type={type}
                value={memberData[key as keyof typeof memberData]}
              />
            </label>
          ))}
          <label className="space-y-1.5 sm:col-span-2" htmlFor="member-role">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Initial role</span>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-brand-900 outline-none focus:border-gold-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              id="member-role"
              onChange={(event) => setMemberData({ ...memberData, role: event.target.value as UserProfile['role'] })}
              value={memberData.role}
            >
              <option value="student">Student</option>
              <option value="mayor">Mayor / attendance officer</option>
            </select>
          </label>
        </div>
      </Modal>
    </Page>
  );
};

export default ManageMembers;
