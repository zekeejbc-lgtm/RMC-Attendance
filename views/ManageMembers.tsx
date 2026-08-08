
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../components/AuthContext';
import { mockData } from '../lib/mockBackend';
import { SchoolNode, UserProfile } from '../types';
import { 
  ChevronRight, Plus, Users, School, GraduationCap, 
  BookOpen, Layers, UserPlus, ArrowLeft, Building2 
} from 'lucide-react';
import CustomSelect from '../components/ui/CustomSelect';

const ManageMembers: React.FC = () => {
  const { isMock } = useAuth();
  const [structure, setStructure] = useState<SchoolNode[]>([]);
  const [currentPath, setCurrentPath] = useState<SchoolNode[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Create Modal State
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState('');
  const [assignOfficer, setAssignOfficer] = useState(false);
  const [officerData, setOfficerData] = useState({ name: '', email: '', username: '' });

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
        school_data: {
          type: 'College', // Default, should be dynamic
          level: '',
          section: type === 'section' ? newItemName : '',
          school_id: 'school_rmc'
        }
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

  if (!currentNode) return <div className="p-6">Loading...</div>;

  const childType = getChildType(currentNode.type, currentNode.name);
  const isSection = currentNode.type === 'section';

  // Determine if we need to ask for specific types (e.g. Major vs Level)
  const needsTypeSelection = ['program', 'strand'].includes(currentNode.type);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-in fade-in">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-900 dark:text-slate-100 uppercase tracking-tight">Directory & Management</h1>
          <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest">Manage School Structure & Members</p>
        </div>
        {!isSection && (
          <button 
            onClick={() => {
              setNewItemType(''); // Reset type
              setShowCreateModal(true);
            }} 
            className="flex items-center gap-2 px-4 py-2 bg-brand-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-brand-800 transition-all shadow-lg"
          >
            <Plus size={16} /> Add {needsTypeSelection ? 'Item' : childType.replace('_', ' ')}
          </button>
        )}
      </div>

      {/* BREADCRUMBS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
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
      </div>

      {/* CONTENT */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm min-h-[400px]">
        {isSection ? (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
            <h3 className="text-lg font-black text-brand-900 dark:text-slate-100 uppercase tracking-widest">Student List</h3>
            <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider mb-6">
              Manage students in {currentNode.name}
            </p>
            <button className="px-6 py-3 bg-gold-gradient text-brand-900 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:brightness-110">
              Add Student
            </button>
            {/* List of students would go here */}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {currentNode.children && currentNode.children.length > 0 ? (
              currentNode.children.map(child => (
                <div 
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
                </div>
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
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-brand-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border-2 border-gold-400 overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-brand-900 p-6 text-white border-b-2 border-gold-400 flex justify-between items-center">
               <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                 <Plus size={18} className="text-gold-400" /> Create New {needsTypeSelection ? 'Item' : childType.replace('_', ' ')}
               </h3>
               <button onClick={() => setShowCreateModal(false)} className="text-white/50 hover:text-white"><ArrowLeft size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</label>
                  <input 
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
                        type="text" 
                        placeholder="Officer Name" 
                        className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-brand-900 dark:text-slate-100 outline-none focus:border-gold-400"
                        value={officerData.name}
                        onChange={(e) => setOfficerData({...officerData, name: e.target.value})}
                      />
                      <input 
                        type="email" 
                        placeholder="Email Address" 
                        className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-brand-900 dark:text-slate-100 outline-none focus:border-gold-400"
                        value={officerData.email}
                        onChange={(e) => setOfficerData({...officerData, email: e.target.value})}
                      />
                      <input 
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

              <button 
                onClick={handleCreate}
                disabled={!newItemName || (childType === 'department' && !newItemType)}
                className="w-full py-4 bg-gold-gradient text-brand-900 text-xs font-black rounded-xl uppercase tracking-widest shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create {childType}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageMembers;
