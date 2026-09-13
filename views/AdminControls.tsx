import { RoleAssignment } from '../components/admin/RoleAssignment';
import { hasPermission } from '../lib/accessControl';
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Snowflake, Activity, DollarSign, ShieldCheck, Shield } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { Page, PageHeader, Surface } from '../components/ui/Page';
import { AdminFreezeView } from '../components/admin/AdminFreezeView';
import { AdminSystemHealthView } from '../components/admin/AdminSystemHealthView';
import { AdminPaymentReminderView } from '../components/admin/AdminPaymentReminderView';
import { AdminRBACRoleView } from '../components/admin/AdminRBACRoleView';

type TabId = 'freeze' | 'health' | 'payment' | 'rbac';

const subPages: { id: TabId; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'freeze', label: 'Freeze Controls', icon: Snowflake, description: 'Manage institutional and node-level system freezes' },
  { id: 'health', label: 'System Health', icon: Activity, description: 'Monitor system performance, database status, and audit logs' },
  { id: 'payment', label: 'Payments', icon: DollarSign, description: 'Manage subscription reminders and billing statuses' },
  { id: 'rbac', label: 'RBAC Roles', icon: ShieldCheck, description: 'Configure custom roles and institutional permissions' },
];

const AdminControls: React.FC = () => {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const getInitialTab = (): TabId => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['freeze', 'health', 'payment', 'rbac'].includes(tab)) {
      return tab as TabId;
    }
    return 'freeze';
  };

  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab());

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['freeze', 'health', 'payment', 'rbac'].includes(tab) && tab !== activeTab) {
      setActiveTab(tab as TabId);
    }
  }, [location.search]);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    navigate(`/admin/controls?tab=${tabId}`, { replace: true });
  };

  const tabPermissions = { freeze: 'system.freeze', health: 'system.health', payment: 'system.payment_reminders', rbac: 'system.manage_rbac' } as const;
  const allowedPages = subPages.filter(page => hasPermission(profile?.role, tabPermissions[page.id]));
  const selectedTab = allowedPages.some(page => page.id === activeTab) ? activeTab : allowedPages[0]?.id;
  const activeSubPage = subPages.find((p) => p.id === activeTab) || subPages[0];

  return (
    <Page>
      <PageHeader
        eyebrow="System Administration"
        title="Admin Control Operations"
        description="Comprehensive system governance, freeze controls, system health telemetry, payments, and RBAC security management."
      />

      <Surface className="relative overflow-hidden !border-brand-800 !bg-brand-900 p-5 text-white shadow-xl sm:p-6">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gold-400/15 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400/20 text-gold-400 border border-gold-400/30 shadow-md shrink-0">
              <Shield size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">System Operations Group</h2>
              <p className="mt-0.5 text-xs font-semibold text-emerald-300">{activeSubPage.description}</p>
            </div>
          </div>

          <div role="tablist" aria-label="Admin control sub pages" className="grid w-full grid-cols-2 gap-1.5 rounded-xl border border-white/10 bg-brand-950/40 p-1.5 sm:grid-cols-4 lg:w-auto">
            {allowedPages.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={activeTab === id}
                aria-label={label}
                onClick={() => handleTabChange(id)}
                className={`flex min-w-0 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition-all sm:px-4 ${
                  activeTab === id
                    ? 'bg-gold-gradient text-brand-900 shadow-md'
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

      <div className="mt-6 animate-in fade-in">
        {selectedTab === 'freeze' && <AdminFreezeView actorName={profile?.name} />}
        {selectedTab === 'health' && <AdminSystemHealthView />}
        {selectedTab === 'payment' && <AdminPaymentReminderView actorName={profile?.name} />}
        {selectedTab === 'rbac' && <div className="space-y-6"><RoleAssignment /><AdminRBACRoleView actorName={profile?.name} /></div>}
      </div>
    </Page>
  );
};

export default AdminControls;
