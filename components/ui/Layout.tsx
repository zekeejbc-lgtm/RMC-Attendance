
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  QrCode, 
  ScanLine, 
  ShieldCheck, 
  LogOut,
  Bell
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { auth as firebaseAuth } from '../../firebase';
import { mockAuth } from '../../lib/mockBackend';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, isMock } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
    { label: 'Home', icon: LayoutDashboard, path: '/dashboard', roles: ['student', 'mayor', 'ssg', 'admin'] },
    { label: 'My QR', icon: QrCode, path: '/student/qr', roles: ['student', 'mayor', 'ssg', 'admin'] },
    { label: 'Scanner', icon: ScanLine, path: '/mayor/scan', roles: ['mayor', 'ssg', 'admin'] },
    { label: 'SSG Panel', icon: ShieldCheck, path: '/ssg/panel', roles: ['ssg', 'admin'] },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-24 lg:pb-0 lg:pl-64 flex flex-col">
      <header className="bg-brand-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gold-400 flex items-center justify-center">
            <span className="text-brand-900 font-bold">R</span>
          </div>
          <h1 className="font-bold text-lg tracking-tight">RMC SSG</h1>
        </div>
        <div className="flex items-center gap-4">
          {isMock && <span className="text-[8px] bg-gold-400/20 text-gold-400 px-2 py-1 rounded-full font-black">LOCAL TEST</span>}
          <button className="relative p-2 rounded-full hover:bg-brand-800 transition-colors">
            <Bell size={20} className="text-gold-100" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <div className="flex items-center gap-2 lg:hidden">
            <button onClick={handleLogout} className="p-2 text-gold-400">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-brand-900 text-white border-r border-brand-800 z-50 shadow-2xl">
        <div className="p-8 border-b border-brand-800">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-lg bg-gold-gradient flex items-center justify-center">
                <span className="text-brand-900 font-bold text-xl">R</span>
             </div>
             <div>
                <h2 className="font-bold text-xl leading-none">RMC SSG</h2>
                <p className="text-gold-400 text-xs mt-1">Project Regalia</p>
             </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 mt-4 space-y-2">
          {navItems.filter(item => item.roles.includes(profile?.role || '')).map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 ${
                location.pathname === item.path 
                ? 'bg-gold-400 text-brand-900 shadow-lg font-bold' 
                : 'text-gold-100 hover:bg-brand-800'
              }`}
            >
              <item.icon size={22} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-brand-800">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-4 p-4 text-red-400 hover:bg-brand-800 rounded-xl transition-all"
          >
            <LogOut size={22} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        {children}
      </main>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-2 pb-6 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        {navItems.filter(item => item.roles.includes(profile?.role || '')).map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              location.pathname === item.path 
              ? 'text-brand-900' 
              : 'text-slate-400'
            }`}
          >
            <item.icon size={24} className={location.pathname === item.path ? 'text-gold-500' : ''} />
            <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
