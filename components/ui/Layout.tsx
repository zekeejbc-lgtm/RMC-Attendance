
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  QrCode, 
  Calendar,
  Award,
  FileText,
  User,
  ScanLine, 
  ShieldCheck, 
  LogOut,
  Bell,
  ChevronDown,
  Users,
  BarChart3,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Building2
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { auth as firebaseAuth } from '../../firebase';
import { mockAuth } from '../../lib/mockBackend';
import { ThemeToggle } from './ThemeToggle';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, isMock } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(true);
  
  // Sidebar Collapse states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      if (isMock) {
        mockAuth.signOut();
        navigate('/login');
      } else {
        await firebaseAuth.signOut();
        navigate('/login');
      }
    } catch (err) {
      console.error("Logout failed", err);
      // Force navigation anyway
      navigate('/login');
    }
  };

  const navItems = [
    { label: 'OSSA Hub', icon: Building2, path: '/ossa/dashboard', roles: ['ossa', 'admin', 'ssg'] },
    { label: 'Home', icon: LayoutDashboard, path: '/dashboard', roles: ['student', 'mayor', 'ssg', 'admin', 'ossa'] },
    { label: 'My QR', icon: QrCode, path: '/student/qr', roles: ['student', 'mayor', 'ssg', 'admin', 'ossa'] },
    { label: 'Events', icon: Calendar, path: '/student/events', roles: ['student', 'mayor', 'ssg', 'admin', 'ossa'] },
    { label: 'Ceremonies', icon: Award, path: '/student/ceremonies', roles: ['student', 'mayor', 'ssg', 'admin', 'ossa'] },
    { label: 'Records', icon: FileText, path: '/student/records', roles: ['student', 'mayor', 'ssg', 'admin', 'ossa'] },
    { label: 'Scanner', icon: ScanLine, path: '/mayor/scan', roles: ['mayor', 'ssg', 'admin', 'ossa'] },
    { label: 'SSG Panel', icon: ShieldCheck, path: '/ssg/panel', roles: ['ssg', 'admin', 'ossa'] },
  ];

  const allowedNavItems = navItems.filter(item => item.roles.includes(profile?.role || ''));

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
      
      {/* HEADER (MOBILE ONLY) */}
      <header className="md:hidden bg-brand-900 text-white px-4 py-2.5 flex justify-between items-center sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-gold-100 hover:bg-brand-800 transition-colors"
            title="Toggle Menu"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Header Logo - Click to open/toggle sidebar */}
          <div 
            onClick={() => setIsSidebarCollapsed(prev => !prev)}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
            title={isSidebarCollapsed ? "Click to open sidebar" : "IARS"}
          >
            <img 
              src="https://i.imgur.com/K3T5yIT.jpeg" 
              alt="IARS Academic Seal" 
              className="w-8 h-8 rounded-full object-cover ring-2 ring-gold-400/50 shadow group-hover:scale-105 transition-transform shrink-0" 
            />
            <h1 className="font-extrabold text-base tracking-tight text-white">IARS</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {isMock && <span className="text-[8px] bg-gold-400/20 text-gold-400 px-2 py-0.5 rounded-full font-extrabold tracking-wider">LOCAL TEST</span>}
          <button className="relative p-1.5 rounded-full hover:bg-brand-800 transition-colors">
            <Bell size={18} className="text-gold-100" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
          </button>
        </div>
      </header>

      {/* MOBILE OVERLAY BACKDROP */}
      <div 
        onClick={() => setIsMobileMenuOpen(false)}
        className={`fixed inset-0 bg-brand-950/70 backdrop-blur-sm z-50 md:hidden transition-opacity duration-300 ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* MOBILE SIDEBAR DRAWER */}
      <aside 
        className={`fixed left-0 top-0 bottom-0 w-64 bg-brand-900 text-white border-r border-brand-800 z-50 shadow-2xl md:hidden flex flex-col transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-brand-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <img 
               src="https://i.imgur.com/K3T5yIT.jpeg" 
               alt="IARS Academic Seal" 
               className="w-10 h-10 rounded-full object-cover ring-2 ring-gold-400/60 shadow-lg" 
             />
             <div>
                <h2 className="font-extrabold text-xl leading-none text-white">IARS</h2>
                <p className="text-emerald-400 text-[10px] font-semibold uppercase tracking-wider mt-1">Attendance & Records</p>
             </div>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gold-200 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {allowedNavItems.map((item) => (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 ${
                location.pathname === item.path 
                ? 'bg-gold-400 text-brand-900 shadow-lg font-bold' 
                : 'text-gold-100 hover:bg-brand-800'
              }`}
            >
              <item.icon size={22} />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}

          {/* ADMIN GROUP MOBILE */}
          {['ssg', 'admin', 'mayor', 'ossa'].includes(profile?.role || '') && (
            <div className="pt-4 border-t border-brand-800 mt-4">
              <button 
                onClick={() => setIsDirectoryOpen(!isDirectoryOpen)}
                className="w-full flex items-center justify-between p-4 text-gold-400/70 hover:text-gold-400 transition-colors uppercase text-[10px] font-black tracking-widest"
              >
                <span>Directory</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isDirectoryOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isDirectoryOpen && (
                <div className="space-y-1 pl-2 animate-in slide-in-from-top-2 duration-200">
                  <button
                    onClick={() => {
                      navigate('/admin/attendance');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200 ${
                      location.pathname === '/admin/attendance'
                      ? 'bg-white/10 text-white font-bold border border-white/10' 
                      : 'text-gold-100/70 hover:bg-brand-800 hover:text-white'
                    }`}
                  >
                    <BarChart3 size={18} />
                    <span className="text-xs">Attendance Dashboard</span>
                  </button>
                  
                  {['ssg', 'admin', 'ossa'].includes(profile?.role || '') && (
                    <button
                      onClick={() => {
                        navigate('/admin/members');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200 ${
                        location.pathname === '/admin/members'
                        ? 'bg-white/10 text-white font-bold border border-white/10' 
                        : 'text-gold-100/70 hover:bg-brand-800 hover:text-white'
                      }`}
                    >
                      <Users size={18} />
                      <span className="text-xs">Manage Members</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-brand-800 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-gold-400/80">Appearance</span>
            <ThemeToggle size="sm" />
          </div>

          <div 
            onClick={() => {
              navigate('/student/profile');
              setIsMobileMenuOpen(false);
            }}
            className="group flex items-center gap-3 p-3 rounded-2xl bg-brand-950/80 border border-gold-400/30 cursor-pointer hover:border-gold-400/60 transition-all"
          >
            <div className="relative shrink-0">
              <img 
                src={profile?.photo_url || 'https://i.pravatar.cc/150'} 
                alt={profile?.name || 'User Profile'} 
                className="w-10 h-10 rounded-full object-cover ring-2 ring-gold-400"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-brand-900"></span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{profile?.name || 'Student Account'}</p>
              <p className="text-[10px] text-gold-400 font-mono font-bold truncate">ID: {profile?.student_id || '2024-0001'}</p>
            </div>
            <User size={18} className="text-gold-400 shrink-0" />
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition-all"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* DESKTOP SIDEBAR (ANIMATED COLLAPSIBLE) */}
      <aside 
        className={`hidden md:flex flex-col fixed left-0 top-0 bottom-0 bg-brand-900 text-white border-r border-brand-800 z-50 shadow-2xl transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-brand-800 flex items-center justify-between overflow-hidden">
          <div 
            onClick={() => setIsSidebarCollapsed(prev => !prev)}
            className="flex items-center gap-3 cursor-pointer group select-none min-w-0"
            title={isSidebarCollapsed ? "Click logo to open sidebar" : "Institution Attendance & Records System"}
          >
             <img 
               src="https://i.imgur.com/K3T5yIT.jpeg" 
               alt="IARS Academic Seal" 
               className="w-10 h-10 rounded-full object-cover ring-2 ring-gold-400/60 shadow-md group-hover:scale-105 transition-transform flex-shrink-0" 
             />
             {!isSidebarCollapsed && (
               <div className="animate-in fade-in duration-200 min-w-0 truncate">
                  <h2 className="font-extrabold text-lg leading-tight tracking-tight text-white">IARS</h2>
                  <p className="text-emerald-400 text-[10px] font-semibold uppercase tracking-wider truncate">Attendance & Records</p>
               </div>
             )}
          </div>

          {!isSidebarCollapsed && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsSidebarCollapsed(true);
              }} 
              className="p-1.5 rounded-lg text-gold-200 hover:text-white hover:bg-brand-800 transition-colors shrink-0"
              title="Collapse Sidebar"
            >
              <PanelLeftClose size={18} />
            </button>
          )}
        </div>
        
        {/* Nav Items */}
        <nav className="flex-1 p-3 mt-2 space-y-2 overflow-y-auto custom-scrollbar">
          {allowedNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                title={isSidebarCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-4 p-3.5 rounded-xl transition-all duration-200 ${
                  isSidebarCollapsed ? 'justify-center px-0' : 'px-4'
                } ${
                  isActive 
                  ? 'bg-gold-400 text-brand-900 shadow-lg font-bold' 
                  : 'text-gold-100 hover:bg-brand-800'
                }`}
              >
                <item.icon size={22} className="flex-shrink-0" />
                {!isSidebarCollapsed && (
                  <span className="truncate font-medium text-sm animate-in fade-in duration-200">{item.label}</span>
                )}
              </button>
            );
          })}

          {/* ADMIN GROUP DESKTOP */}
          {['ssg', 'admin', 'mayor', 'ossa'].includes(profile?.role || '') && (
            <div className="pt-4 border-t border-brand-800/80 mt-4">
              {!isSidebarCollapsed ? (
                <>
                  <button 
                    onClick={() => setIsDirectoryOpen(!isDirectoryOpen)}
                    className="w-full flex items-center justify-between p-3.5 text-gold-400/70 hover:text-gold-400 transition-colors uppercase text-[10px] font-black tracking-widest"
                  >
                    <span>Directory</span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${isDirectoryOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isDirectoryOpen && (
                    <div className="space-y-1 pl-2 animate-in slide-in-from-top-2 duration-200">
                      <button
                        onClick={() => navigate('/admin/attendance')}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                          location.pathname === '/admin/attendance'
                          ? 'bg-white/10 text-white font-bold border border-white/10 shadow-sm' 
                          : 'text-gold-100/70 hover:bg-brand-800 hover:text-white'
                        }`}
                      >
                        <BarChart3 size={18} className="flex-shrink-0" />
                        <span className="text-xs truncate">Attendance Dashboard</span>
                      </button>
                      
                      {['ssg', 'admin', 'ossa'].includes(profile?.role || '') && (
                        <button
                          onClick={() => navigate('/admin/members')}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                            location.pathname === '/admin/members'
                            ? 'bg-white/10 text-white font-bold border border-white/10 shadow-sm' 
                            : 'text-gold-100/70 hover:bg-brand-800 hover:text-white'
                          }`}
                        >
                          <Users size={18} className="flex-shrink-0" />
                          <span className="text-xs truncate">Manage Members</span>
                        </button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                /* Collapsed Directory view: show icons with tooltips directly */
                <div className="space-y-2 flex flex-col items-center">
                  <button
                    onClick={() => navigate('/admin/attendance')}
                    title="Attendance Dashboard"
                    className={`w-full flex items-center justify-center p-3.5 rounded-xl transition-all duration-200 ${
                      location.pathname === '/admin/attendance'
                      ? 'bg-gold-400 text-brand-900 shadow-lg font-bold' 
                      : 'text-gold-100 hover:bg-brand-800'
                    }`}
                  >
                    <BarChart3 size={22} className="flex-shrink-0" />
                  </button>

                  {['ssg', 'admin', 'ossa'].includes(profile?.role || '') && (
                    <button
                      onClick={() => navigate('/admin/members')}
                      title="Manage Members"
                      className={`w-full flex items-center justify-center p-3.5 rounded-xl transition-all duration-200 ${
                        location.pathname === '/admin/members'
                        ? 'bg-gold-400 text-brand-900 shadow-lg font-bold' 
                        : 'text-gold-100 hover:bg-brand-800'
                      }`}
                    >
                      <Users size={22} className="flex-shrink-0" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Footer / User Profile Card & Theme Toggle */}
        <div className="p-3 border-t border-brand-800 space-y-2.5">
          {!isSidebarCollapsed ? (
            <>
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-gold-400/80">Theme Mode</span>
                <ThemeToggle size="sm" />
              </div>

              <div 
                onClick={() => navigate('/student/profile')}
                className="group flex items-center gap-3 p-2.5 rounded-2xl bg-brand-950/80 hover:bg-brand-800/90 border border-gold-400/30 hover:border-gold-400/60 transition-all cursor-pointer shadow-md"
                title="View Student Profile"
              >
                <div className="relative shrink-0">
                  <img 
                    src={profile?.photo_url || 'https://i.pravatar.cc/150'} 
                    alt={profile?.name || 'User Profile'} 
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-gold-400/70 group-hover:scale-105 transition-transform"
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-brand-900"></span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold text-white truncate group-hover:text-gold-300 transition-colors">
                    {profile?.name || 'Student Account'}
                  </p>
                  <p className="text-[10px] font-mono font-bold text-gold-400/90 truncate tracking-tight">
                    ID: {profile?.student_id || '2024-0001'}
                  </p>
                </div>

                <User size={16} className="text-gold-400/80 group-hover:text-gold-300 transition-colors shrink-0" />
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition-all"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2.5">
              <ThemeToggle size="sm" />
              <button 
                onClick={() => navigate('/student/profile')}
                title={`Profile: ${profile?.name || 'User'} (ID: ${profile?.student_id || '2024-0001'})`}
                className="relative p-0.5 rounded-full ring-2 ring-gold-400/70 hover:ring-gold-300 transition-all group"
              >
                <img 
                  src={profile?.photo_url || 'https://i.pravatar.cc/150'} 
                  alt={profile?.name || 'User Profile'} 
                  className="w-10 h-10 rounded-full object-cover group-hover:scale-105 transition-transform"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-brand-900"></span>
              </button>

              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
};

export default Layout;
