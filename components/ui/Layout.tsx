import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Award, BarChart3, Bell, Building2, Calendar, ChevronDown, FileText,
  LayoutDashboard, LogOut, Menu, PanelLeftClose, PanelLeftOpen, QrCode,
  ScanLine, ShieldCheck, User, Users, X,
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { auth as firebaseAuth } from '../../firebase';
import { mockAuth } from '../../lib/mockBackend';
import { ThemeToggle } from './ThemeToggle';

const mobileDrawerId = 'mobile-main-navigation';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, isMock } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileDrawerRef = useRef<HTMLElement>(null);
  const drawerWasOpen = useRef(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const desktopViewport = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setIsMobileMenuOpen(false);
    };

    if (desktopViewport.matches) setIsMobileMenuOpen(false);
    desktopViewport.addEventListener('change', closeOnDesktop);
    return () => desktopViewport.removeEventListener('change', closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      if (drawerWasOpen.current) mobileMenuButtonRef.current?.focus();
      drawerWasOpen.current = false;
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false);
    };

    drawerWasOpen.current = true;
    document.body.classList.add('app-scroll-lock');
    window.addEventListener('keydown', closeOnEscape);
    mobileDrawerRef.current?.querySelector<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')?.focus();
    return () => {
      document.body.classList.remove('app-scroll-lock');
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isMobileMenuOpen]);

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

  const trapDrawerFocus = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab') return;

    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )).filter((element) => element.tabIndex >= 0);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
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
  const role = profile?.role || '';
  const allowedNavItems = navItems.filter((item) => item.roles.includes(role));
  const hasDirectory = ['ssg', 'admin', 'mayor', 'ossa'].includes(role);
  const canManageMembers = ['ssg', 'admin', 'ossa'].includes(role);

  const navigateAndClose = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const navButtonClass = (isActive: boolean, compact = false) => (
    `w-full min-h-11 flex items-center gap-4 rounded-xl transition-all duration-200 ${
      compact ? 'justify-center px-2 py-3' : 'px-4 py-3.5'
    } ${isActive ? 'bg-gold-400 text-brand-900 shadow-lg font-bold' : 'text-gold-100 hover:bg-brand-800'}`
  );

  const renderDirectory = (mobile = false) => {
    const controlsId = mobile ? 'mobile-directory-links' : 'desktop-directory-links';
    const itemClass = (path: string) => `w-full min-h-11 flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
      location.pathname === path
        ? 'bg-white/10 text-white font-bold border border-white/10 shadow-sm'
        : 'text-gold-100/70 hover:bg-brand-800 hover:text-white'
    }`;

    if (!hasDirectory) return null;
    return (
      <div className="pt-4 mt-4 border-t border-brand-800/80">
        <button
          type="button"
          aria-label="Toggle directory navigation"
          aria-expanded={isDirectoryOpen}
          aria-controls={controlsId}
          onClick={() => setIsDirectoryOpen((open) => !open)}
          className="w-full min-h-11 flex items-center justify-between px-3 py-3 text-gold-400/70 hover:text-gold-400 transition-colors uppercase text-[10px] font-black tracking-widest"
        >
          <span>Directory</span>
          <ChevronDown size={14} className={`transition-transform duration-200 ${isDirectoryOpen ? 'rotate-180' : ''}`} />
        </button>
        {isDirectoryOpen && (
          <div id={controlsId} className="space-y-1 pl-2">
            <button
              type="button"
              aria-current={location.pathname === '/admin/attendance' ? 'page' : undefined}
              onClick={() => mobile ? navigateAndClose('/admin/attendance') : navigate('/admin/attendance')}
              className={itemClass('/admin/attendance')}
            >
              <BarChart3 size={18} />
              <span className="text-xs">Attendance Dashboard</span>
            </button>
            {canManageMembers && (
              <button
                type="button"
                aria-current={location.pathname === '/admin/members' ? 'page' : undefined}
                onClick={() => mobile ? navigateAndClose('/admin/members') : navigate('/admin/members')}
                className={itemClass('/admin/members')}
              >
                <Users size={18} />
                <span className="text-xs">Manage Members</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-dvh bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row transition-[padding] duration-300 ease-in-out ${
      isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'
    }`}>
      <header className="md:hidden sticky top-0 z-40 min-h-14 bg-brand-900 text-white px-4 pt-[max(0.625rem,env(safe-area-inset-top))] pb-2.5 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <button
            ref={mobileMenuButtonRef}
            type="button"
            aria-label={isMobileMenuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={isMobileMenuOpen}
            aria-controls={mobileDrawerId}
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-gold-100 hover:bg-brand-800 transition-colors"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2.5 select-none">
            <img src="https://i.imgur.com/K3T5yIT.jpeg" alt="IARS Academic Seal" className="w-8 h-8 rounded-full object-cover ring-2 ring-gold-400/50 shadow shrink-0" />
            <h1 className="font-extrabold text-base tracking-tight text-white">IARS</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle className="min-h-11 min-w-11" />
          {isMock && <span className="text-[8px] bg-gold-400/20 text-gold-400 px-2 py-0.5 rounded-full font-extrabold tracking-wider">LOCAL TEST</span>}
          <button type="button" aria-label="Notifications" className="relative min-h-11 min-w-11 inline-flex items-center justify-center rounded-full hover:bg-brand-800 transition-colors">
            <Bell size={18} className="text-gold-100" />
            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          </button>
        </div>
      </header>

      {isMobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-brand-950/70 backdrop-blur-sm md:hidden"
        />
      )}

      {isMobileMenuOpen && (
        <aside
          ref={mobileDrawerRef}
          id={mobileDrawerId}
          role="dialog"
          aria-modal="true"
          aria-label="Main navigation"
          onKeyDown={trapDrawerFocus}
          className="fixed inset-y-0 left-0 z-50 w-72 max-w-[calc(100vw-env(safe-area-inset-left))] bg-brand-900 text-white border-r border-brand-800 shadow-2xl md:hidden flex flex-col pl-[env(safe-area-inset-left)]"
        >
          <div className="shrink-0 p-5 pt-[max(1.25rem,env(safe-area-inset-top))] border-b border-brand-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img src="https://i.imgur.com/K3T5yIT.jpeg" alt="IARS Academic Seal" className="w-10 h-10 rounded-full object-cover ring-2 ring-gold-400/60 shadow-lg" />
              <div><h2 className="font-extrabold text-xl leading-none">IARS</h2><p className="text-emerald-400 text-[10px] font-semibold uppercase tracking-wider mt-1">Attendance &amp; Records</p></div>
            </div>
            <button type="button" aria-label="Close navigation" onClick={() => setIsMobileMenuOpen(false)} className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-gold-200 hover:text-white hover:bg-brand-800">
              <X size={20} />
            </button>
          </div>
          <nav aria-label="Main navigation" className="min-h-0 flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
            {allowedNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return <button type="button" key={item.path} aria-current={isActive ? 'page' : undefined} onClick={() => navigateAndClose(item.path)} className={navButtonClass(isActive)}><Icon size={22} /><span className="font-medium text-sm">{item.label}</span></button>;
            })}
            {renderDirectory(true)}
          </nav>
          <div className="shrink-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-brand-800 space-y-3">
            <div className="flex items-center justify-between px-1"><span className="text-[10px] font-black uppercase tracking-widest text-gold-400/80">Appearance</span><ThemeToggle size="sm" className="min-h-11 min-w-11" /></div>
            <button type="button" aria-label="View profile" onClick={() => navigateAndClose('/student/profile')} className="w-full min-h-14 group flex items-center gap-3 p-3 rounded-2xl bg-brand-950/80 border border-gold-400/30 hover:border-gold-400/60 transition-all text-left">
              <img src={profile?.photo_url || 'https://i.pravatar.cc/150'} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-gold-400" />
              <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-white truncate">{profile?.name || 'Student Account'}</span><span className="block text-[10px] text-gold-400 font-mono font-bold truncate">ID: {profile?.student_id || '2024-0001'}</span></span><User size={18} className="text-gold-400 shrink-0" />
            </button>
            <button type="button" onClick={handleLogout} className="w-full min-h-11 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold"><LogOut size={16} /><span>Sign Out</span></button>
          </div>
        </aside>
      )}

      <aside className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-30 bg-brand-900 text-white border-r border-brand-800 shadow-2xl transition-[width] duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="shrink-0 p-4 border-b border-brand-800 flex items-center justify-between overflow-hidden">
          <div className="flex items-center gap-3 min-w-0"><img src="https://i.imgur.com/K3T5yIT.jpeg" alt="IARS Academic Seal" className="w-10 h-10 rounded-full object-cover ring-2 ring-gold-400/60 shadow-md shrink-0" />{!isSidebarCollapsed && <div className="min-w-0 truncate"><h2 className="font-extrabold text-lg leading-tight">IARS</h2><p className="text-emerald-400 text-[10px] font-semibold uppercase tracking-wider truncate">Attendance &amp; Records</p></div>}</div>
          <button type="button" aria-label="Collapse sidebar" onClick={() => setIsSidebarCollapsed(true)} className={`min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-gold-200 hover:text-white hover:bg-brand-800 ${isSidebarCollapsed ? 'hidden' : 'inline-flex'}`}><PanelLeftClose size={18} /></button>
        </div>
        <nav aria-label="Desktop navigation" className="min-h-0 flex-1 p-3 mt-2 space-y-2 overflow-y-auto custom-scrollbar">
          {allowedNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return <button type="button" key={item.path} aria-label={isSidebarCollapsed ? item.label : undefined} aria-current={isActive ? 'page' : undefined} onClick={() => navigate(item.path)} className={navButtonClass(isActive, isSidebarCollapsed)}><Icon size={22} />{!isSidebarCollapsed && <span className="truncate font-medium text-sm">{item.label}</span>}</button>;
          })}
          {isSidebarCollapsed && hasDirectory ? <div className="pt-4 mt-4 border-t border-brand-800/80 space-y-2"><button type="button" aria-label="Attendance dashboard" aria-current={location.pathname === '/admin/attendance' ? 'page' : undefined} onClick={() => navigate('/admin/attendance')} className={navButtonClass(location.pathname === '/admin/attendance', true)}><BarChart3 size={22} /></button>{canManageMembers && <button type="button" aria-label="Manage members" aria-current={location.pathname === '/admin/members' ? 'page' : undefined} onClick={() => navigate('/admin/members')} className={navButtonClass(location.pathname === '/admin/members', true)}><Users size={22} /></button>}</div> : renderDirectory()}
        </nav>
        <div className="shrink-0 p-3 border-t border-brand-800 space-y-2.5">
          {!isSidebarCollapsed ? <><div className="flex items-center justify-between px-1"><span className="text-[10px] font-black uppercase tracking-widest text-gold-400/80">Theme Mode</span><ThemeToggle size="sm" className="min-h-11 min-w-11" /></div><button type="button" aria-label="View profile" onClick={() => navigate('/student/profile')} className="w-full min-h-14 group flex items-center gap-3 p-2.5 rounded-2xl bg-brand-950/80 hover:bg-brand-800/90 border border-gold-400/30 hover:border-gold-400/60 transition-all text-left"><img src={profile?.photo_url || 'https://i.pravatar.cc/150'} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-gold-400/70" /><span className="min-w-0 flex-1"><span className="block text-xs font-extrabold text-white truncate">{profile?.name || 'Student Account'}</span><span className="block text-[10px] font-mono font-bold text-gold-400/90 truncate">ID: {profile?.student_id || '2024-0001'}</span></span><User size={16} className="text-gold-400/80 shrink-0" /></button><button type="button" onClick={handleLogout} className="w-full min-h-11 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold"><LogOut size={16} /><span>Sign Out</span></button></> : <div className="flex flex-col items-center gap-2.5"><button type="button" aria-label="Expand sidebar" onClick={() => setIsSidebarCollapsed(false)} className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-gold-200 hover:text-white hover:bg-brand-800"><PanelLeftOpen size={18} /></button><ThemeToggle size="sm" className="min-h-11 min-w-11" /><button type="button" aria-label="View profile" onClick={() => navigate('/student/profile')} className="min-h-11 min-w-11 relative rounded-full ring-2 ring-gold-400/70"><img src={profile?.photo_url || 'https://i.pravatar.cc/150'} alt="" className="w-10 h-10 rounded-full object-cover" /></button><button type="button" aria-label="Sign out" onClick={handleLogout} className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"><LogOut size={18} /></button></div>}
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
};

export default Layout;
