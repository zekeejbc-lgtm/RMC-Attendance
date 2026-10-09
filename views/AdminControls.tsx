import { RoleAssignment } from '../components/admin/RoleAssignment';
import { hasPermission } from '../lib/accessControl';
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { legalLinks } from '../lib/legal';
import { Snowflake, Activity, DollarSign, ShieldCheck, Shield, Users, Video } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { Page, PageHeader, Surface } from '../components/ui/Page';
import { AdminFreezeView } from '../components/admin/AdminFreezeView';
import { AdminSystemHealthView } from '../components/admin/AdminSystemHealthView';
import { AdminPaymentReminderView } from '../components/admin/AdminPaymentReminderView';
import { AdminRBACRoleView } from '../components/admin/AdminRBACRoleView';
import { AdminAccountView } from '../components/admin/AdminAccountView';
import LegalPage from './LegalPage';
import AdminHomepageVideoView from '../components/admin/AdminHomepageVideoView';
import { LegalKind } from '../lib/legalPages';

type TabId = 'freeze' | 'health' | 'payment' | 'rbac' | 'accounts' | 'legal' | 'video';

const subPages: { id: TabId; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'freeze', label: 'Freeze Controls', icon: Snowflake, description: 'Manage institutional and node-level system freezes' },
  { id: 'health', label: 'System Health', icon: Activity, description: 'Monitor system performance, database status, and audit logs' },
  { id: 'payment', label: 'Payments', icon: DollarSign, description: 'Manage subscription reminders and billing statuses' },
  { id: 'rbac', label: 'RBAC Roles', icon: ShieldCheck, description: 'Configure custom roles and institutional permissions' },
  { id: 'accounts', label: 'Accounts', icon: Users, description: 'Create managed accounts, review profiles, and manage passwords' },
  { id: 'video', label: 'Homepage Video', icon: Video, description: 'Choose and preview the video shown on the public homepage' },
  { id: 'legal', label: 'Legal pages', icon: Shield, description: 'Preview and edit the current saved legal pages' },
];

const AdminControls: React.FC = () => {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const getInitialTab = (): TabId => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['freeze', 'health', 'payment', 'rbac', 'accounts', 'legal', 'video'].includes(tab)) {
      return tab as TabId;
    }
    return 'freeze';
  };

  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab());

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['freeze', 'health', 'payment', 'rbac', 'accounts', 'legal', 'video'].includes(tab) && tab !== activeTab) {
      setActiveTab(tab as TabId);
    }
  }, [location.search]);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    navigate(`/admin/controls?tab=${tabId}`);
  };

  const tabPermissions = { freeze: 'system.freeze', health: 'system.health', payment: 'system.payment_reminders', rbac: 'system.manage_rbac', accounts: 'system.manage_accounts' } as const;
  const allowedPages = subPages.filter(page => (page.id === 'legal' || page.id === 'video') ? profile?.role === 'admin' : hasPermission(profile?.role, tabPermissions[page.id]));
  const requestedPage = new URLSearchParams(location.search).get('page');
  const legalKinds: LegalKind[] = ['privacy', 'deletion', 'agreement', 'terms'];
  const legalKind = legalKinds.includes(requestedPage as LegalKind) ? requestedPage as LegalKind : 'privacy';
  const selectedTab = allowedPages.some(page => page.id === activeTab) ? activeTab : allowedPages[0]?.id;
  const activeSubPage = subPages.find((p) => p.id === selectedTab) || subPages[0];

  return (
    <Page className="max-w-none space-y-8 px-5 py-6 sm:px-8 sm:py-8 xl:px-12">
      <PageHeader
        eyebrow="System Administration"
        title="Admin Control Operations"
        description="A focused workspace for system governance, access controls, payment workflows, and security operations."
        className="max-w-[96rem]"
      />

      <Surface className="relative max-w-[96rem] overflow-hidden !border-brand-800 !bg-brand-900 p-6 text-white shadow-brand-elevated sm:p-8">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold-400/15 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gold-400/30 bg-gold-400/15 text-gold-300 shadow-md">
              <Shield size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-300">Operations center</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">System Operations Group</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-300">{activeSubPage.description}</p>
            </div>
          </div>

          <div role="tablist" aria-label="Admin control sub pages" className="grid w-full grid-cols-2 gap-1.5 rounded-2xl border border-white/10 bg-brand-950/45 p-1.5 sm:grid-cols-4">
            {allowedPages.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={selectedTab === id}
                aria-label={label}
                onClick={() => handleTabChange(id)}
                className={`flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-bold transition-all sm:text-xs ${
                  selectedTab === id
                    ? 'app-button--gold text-brand-900 shadow-md'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={16} className="shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </Surface>

      {selectedTab === 'legal' && <Surface className="max-w-[96rem] space-y-3 p-6">
        <h2 className="text-xl font-bold">Legal pages</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">Open a saved page to preview it, then choose Edit page to make changes.</p>
        <nav aria-label="Legal pages" className="flex flex-wrap gap-3">{legalLinks.map((link, index) => <Link key={link.path} to={`/admin/controls?tab=legal&page=${legalKinds[index]}`} aria-current={legalKind === legalKinds[index] ? 'page' : undefined} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${legalKind === legalKinds[index] ? 'border-brand-900 bg-brand-900 text-white' : 'border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'}`}>{link.title}</Link>)}</nav>
        <LegalPage key={legalKind} kind={legalKind} adminPreview />
      </Surface>}

      <div className="max-w-[96rem] animate-in fade-in">
        {selectedTab === 'freeze' && <AdminFreezeView actorName={profile?.name} />}
        {selectedTab === 'health' && <AdminSystemHealthView />}
        {selectedTab === 'payment' && <AdminPaymentReminderView actorName={profile?.name} />}
        {selectedTab === 'rbac' && <div className="space-y-6"><RoleAssignment /><AdminRBACRoleView actorName={profile?.name} /></div>}
        {selectedTab === 'accounts' && <AdminAccountView />}
        {selectedTab === 'video' && <AdminHomepageVideoView />}
      </div>
    </Page>
  );
};

export default AdminControls;
