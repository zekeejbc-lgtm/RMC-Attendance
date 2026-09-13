import React, { useState, useEffect } from 'react';
import { CreditCard, BellRing, Calendar, Send, CheckCircle2, Clock, AlertTriangle, ShieldCheck, Mail, DollarSign, History } from 'lucide-react';
import { mockData } from '../../lib/mockBackend';
import { PaymentInfo, PaymentReminderLog } from '../../types';
import { MetricCard } from '../ui/Page';
import { Modal } from '../ui/Modal';

export const AdminPaymentReminderView: React.FC<{ actorName?: string }> = ({ actorName }) => {
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>(mockData.getPaymentInfo());
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const [reminderData, setReminderData] = useState({
    recipientEmail: 'ossa.director@rmc.edu.ph',
    subject: 'URGENT: Annual System Subscription Payment Collection Notice',
    urgency: 'urgent' as 'normal' | 'urgent' | 'critical',
    message: 'Greetings OSSA Director,\n\nThis is a payment collection reminder from System Administration regarding the annual software subscription license for Rizal Memorial Colleges Inc.\n\nPlease process or verify the pending payment collection balance before the due date to prevent system freeze.\n\nThank you,\nSystem Administration'
  });

  const [newStatus, setNewStatus] = useState<PaymentInfo['status']>(paymentInfo.status);
  const [newAmount, setNewAmount] = useState(paymentInfo.amountDue);

  const refreshData = () => {
    setPaymentInfo(mockData.getPaymentInfo());
  };

  useEffect(() => {
    refreshData();
    window.addEventListener('rmc_auth_update', refreshData);
    return () => window.removeEventListener('rmc_auth_update', refreshData);
  }, []);

  const handleSendReminder = (e: React.FormEvent) => {
    e.preventDefault();
    mockData.sendPaymentReminderToOSAS({
      subject: reminderData.subject,
      message: reminderData.message,
      urgency: reminderData.urgency,
      recipientEmail: reminderData.recipientEmail,
      actorName: actorName || 'System Admin'
    });
    setShowReminderModal(false);
    refreshData();
  };

  const handleUpdateStatus = (e: React.FormEvent) => {
    e.preventDefault();
    mockData.updatePaymentInfo({
      status: newStatus,
      amountDue: newAmount,
      lastPaymentDate: newStatus === 'paid' ? Date.now() : paymentInfo.lastPaymentDate
    });
    setShowStatusModal(false);
    refreshData();
  };

  const daysUntilDue = Math.ceil((paymentInfo.dueDate - Date.now()) / (1000 * 60 * 60 * 24));

  const statusBadge = {
    paid: { bg: 'bg-emerald-500', label: 'PAID & ACTIVE', icon: CheckCircle2 },
    due_soon: { bg: 'bg-amber-500', label: 'PAYMENT DUE SOON', icon: Clock },
    overdue: { bg: 'bg-red-600', label: 'PAYMENT OVERDUE', icon: AlertTriangle },
    unpaid: { bg: 'bg-red-700', label: 'UNPAID / FROZEN', icon: AlertTriangle },
  }[paymentInfo.status];

  const StatusIcon = statusBadge.icon;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* HERO BANNER */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl shrink-0">
              <CreditCard className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold uppercase tracking-tight">OSAS Payment Collection & Reminders</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white flex items-center gap-1 ${statusBadge.bg}`}>
                  <StatusIcon size={12} /> {statusBadge.label}
                </span>
              </div>
              <p className="text-slate-300 text-xs mt-1 max-w-2xl">
                Manage annual school subscription billing, monitor license expiration, and dispatch email reminders directly to OSSA leadership.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowStatusModal(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition"
            >
              <DollarSign size={14} /> Update Payment Status
            </button>
            <button
              onClick={() => setShowReminderModal(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-brand-950 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition shadow-lg"
            >
              <BellRing size={14} /> Send OSAS Reminder
            </button>
          </div>
        </div>
      </div>
      {/* BILLING METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          icon={<DollarSign size={20} className="text-emerald-500" />}
          label="Amount Due"
          value={`${paymentInfo.currency} ${paymentInfo.amountDue.toLocaleString()}`}
          detail={paymentInfo.billingCycle}
        />
        <MetricCard
          icon={<Calendar size={20} className="text-amber-500" />}
          label="Due Date"
          value={new Date(paymentInfo.dueDate).toLocaleDateString()}
          detail={daysUntilDue > 0 ? `${daysUntilDue} days remaining` : 'Overdue!'}
        />
        <MetricCard
          icon={<BellRing size={20} className="text-cyan-500" />}
          label="Reminders Sent"
          value={paymentInfo.reminders.length}
          detail="Official OSAS Notices"
        />
        <MetricCard
          icon={<ShieldCheck size={20} className="text-purple-500" />}
          label="Account Name"
          value={paymentInfo.accountName}
          detail={`School ID: ${paymentInfo.schoolId}`}
        />
      </div>

      {/* REMINDER HISTORY TABLE */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <History size={18} className="text-amber-500" /> Sent Payment Reminders Log
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Historical record of all payment collection notices dispatched to OSAS.
            </p>
          </div>

          <button
            onClick={() => setShowReminderModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-bold uppercase tracking-wider hover:bg-amber-100 flex items-center gap-1.5 transition"
          >
            <Send size={14} /> Send New Reminder
          </button>
        </div>

        <div className="space-y-3">
          {paymentInfo.reminders.length > 0 ? (
            paymentInfo.reminders.map(rem => (
              <div
                key={rem.id}
                className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2"
              >
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                      rem.urgency === 'critical' ? 'bg-red-500 text-white' : rem.urgency === 'urgent' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
                    }`}>
                      {rem.urgency}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">{rem.subject}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Sent: {new Date(rem.sentAt).toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 font-mono text-[11px]">
                  {rem.message}
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>To: <strong className="text-slate-700 dark:text-slate-200">{rem.recipientEmail}</strong> ({rem.recipientRole})</span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle2 size={12} /> Status: {rem.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
              No payment reminders sent yet. Click &quot;Send OSAS Reminder&quot; to notify the Office of Student Services and Affairs.
            </div>
          )}
        </div>
      </div>
      {/* REMINDER MODAL */}
      <Modal
        open={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        title="Send OSAS Payment Collection Reminder"
        description="Dispatch an official notification alert to OSAS leadership"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setShowReminderModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="reminder-form"
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase bg-amber-500 hover:bg-amber-600 text-brand-950 shadow-md flex items-center gap-1.5"
            >
              <Send size={14} /> Dispatch Reminder Notice
            </button>
          </div>
        }
      >
        <form id="reminder-form" onSubmit={handleSendReminder} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Recipient OSAS Email</label>
            <input
              type="email"
              required
              value={reminderData.recipientEmail}
              onChange={(e) => setReminderData(prev => ({ ...prev, recipientEmail: e.target.value }))}
              className="w-full h-10 px-3 mt-1 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Urgency Level</label>
              <select
                value={reminderData.urgency}
                onChange={(e) => setReminderData(prev => ({ ...prev, urgency: e.target.value as any }))}
                className="w-full h-10 px-3 mt-1 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
              >
                <option value="normal">Normal Reminder</option>
                <option value="urgent">Urgent Notice</option>
                <option value="critical">Critical - Freeze Warning</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Due Balance</label>
              <input
                type="text"
                disabled
                value={`${paymentInfo.currency} ${paymentInfo.amountDue.toLocaleString()}`}
                className="w-full h-10 px-3 mt-1 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Subject Line</label>
            <input
              type="text"
              required
              value={reminderData.subject}
              onChange={(e) => setReminderData(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full h-10 px-3 mt-1 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Message Body</label>
            <textarea
              required
              rows={5}
              value={reminderData.message}
              onChange={(e) => setReminderData(prev => ({ ...prev, message: e.target.value }))}
              className="w-full p-3 mt-1 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
            />
          </div>
        </form>
      </Modal>
      {/* UPDATE STATUS MODAL */}
      <Modal
        open={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Update Payment Status"
        description="Record payments or adjust billing collection status"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setShowStatusModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="status-form"
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
            >
              Save Payment Status
            </button>
          </div>
        }
      >
        <form id="status-form" onSubmit={handleUpdateStatus} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Payment Status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as any)}
              className="w-full h-10 px-3 mt-1 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
            >
              <option value="paid">Paid & Fully Cleared</option>
              <option value="due_soon">Payment Due Soon</option>
              <option value="overdue">Payment Overdue</option>
              <option value="unpaid">Unpaid (Frozen)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Amount Due (PHP)</label>
            <input
              type="number"
              value={newAmount}
              onChange={(e) => setNewAmount(Number(e.target.value))}
              className="w-full h-10 px-3 mt-1 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};