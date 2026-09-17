import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, User, Shield, Building2, Phone, Mail, Lock, Unlock, 
  KeyRound, RefreshCw, Copy, Check, Smartphone, AlertTriangle, 
  CheckCircle2, Laptop, Globe, Clock, ShieldCheck, FileText, Sparkles,
  Monitor, Tablet, AtSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AdminUser, Branch, UserStatus } from './types';
import { cn } from '../../lib/utils';
import { useToast } from '../../components/common/Toast';
import { INITIAL_BRANCHES, INITIAL_ROLES, INITIAL_SESSIONS, getStoredRoles, getStoredSessions } from './adminStore';
import { useAuth } from '../../context/AuthContext';

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUser | null;
  initialTab?: 'profile' | 'security' | 'sessions';
  onSaveUser: (userData: Partial<AdminUser>, password?: string, pin?: string) => void;
  onRevokeSession?: (sessionId: string) => void;
}

export default function UserEditModal({
  isOpen,
  onClose,
  user,
  initialTab = 'profile',
  onSaveUser,
  onRevokeSession
}: UserEditModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'sessions'>(initialTab);

  // Form state
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState('role-cashier');
  const [branchId, setBranchId] = useState('branch-1');
  const [status, setStatus] = useState<UserStatus>('active');
  const [notes, setNotes] = useState('');
  const [mustChangePassword, setMustChangePassword] = useState(false);

  // Security password state
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [posPin, setPosPin] = useState('');
  const [showPasswordInForm, setShowPasswordInForm] = useState(false);
  const [copiedCredential, setCopiedCredential] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('strong');

  // Active sessions list
  const [userSessions, setUserSessions] = useState(() => getStoredSessions());

  useEffect(() => {
    const allSessions = getStoredSessions();
    if (user) {
      setFullName(user.full_name || '');
      setUsername(user.username || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setRoleId(user.role_id || user.role?.id || 'role-cashier');
      setBranchId(user.branch_id || user.branch?.id || 'branch-1');
      setStatus(user.status || 'active');
      setNotes(user.notes || '');
      setMustChangePassword(user.must_change_password || false);
      const filtered = (allSessions || []).filter(s => s && (s.user_id === user.id || s.user_name === user.full_name || s.user_name === user.username));
      setUserSessions((filtered?.length || 0) > 0 ? filtered : allSessions);
    } else {
      setFullName('');
      setUsername('');
      setEmail('');
      setPhone('');
      setRoleId('role-cashier');
      setBranchId('branch-1');
      setStatus('active');
      setNotes('');
      setMustChangePassword(false);
      setGeneratedPassword('cashier123');
      setPosPin('1234');
      setUserSessions(allSessions);
    }
    setActiveTab(initialTab);
  }, [user, isOpen, initialTab]);

  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let result = '';
    for (let i = 0; i < 14; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPassword(result);
    setPasswordStrength('strong');
  };

  const generateRandomPin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setPosPin(pin);
  };

  const copyCredentialsSlip = () => {
    const roleName = getStoredRoles().find(r => r.id === roleId)?.name || 'Cashier';
    const cleanUser = username.replace(/^@/, '').trim() || email.split('@')[0] || 'staff';
    const slip = `🔐 NALI POS - Staff Login Credentials
----------------------------------
Username: @${cleanUser}
Email: ${email.trim()}
Phone: ${phone.trim() || 'N/A'}
Security Role: ${roleName}
Temporary Password: ${generatedPassword || '(Unchanged)'}
POS Quick PIN: ${posPin || '1234'}
Must Reset on Login: ${mustChangePassword ? 'YES' : 'NO'}
----------------------------------
Please keep your credentials confidential.`;

    navigator.clipboard.writeText(slip);
    setCopiedCredential(true);
    toast.success('Credentials slip copied to clipboard!');
    setTimeout(() => setCopiedCredential(false), 2500);
  };

  const handleRevokeSingleSession = (sessId: string) => {
    setUserSessions(prev => prev.filter(s => s.id !== sessId));
    if (onRevokeSession) onRevokeSession(sessId);
    toast.success('Session revoked. User will be logged out on that device.');
  };

  const handleForceLogoutAll = () => {
    setUserSessions([]);
    toast.success('All active sessions terminated for this account.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanUsername = username.replace(/^@/, '').trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanUsername) {
      toast.error('Username is required.');
      return;
    }
    if (!cleanEmail) {
      toast.error('Email address is required.');
      return;
    }

    const autoFullName = (fullName && fullName.trim()) || cleanUsername
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || cleanUsername;

    // Safety checks
    if (user?.role?.name === 'Administrator' && roleId !== 'role-admin' && user.id === profile?.id) {
      toast.error('You cannot revoke your own Administrator privileges.');
      return;
    }

    const selectedRole = getStoredRoles().find(r => r.id === roleId);
    const selectedBranch = INITIAL_BRANCHES.find(b => b.id === branchId) || INITIAL_BRANCHES[0];

    const updatedData: Partial<AdminUser> = {
      full_name: autoFullName,
      username: cleanUsername,
      email: cleanEmail,
      phone: phone.trim() || undefined,
      role_id: roleId,
      role: selectedRole ? {
        id: selectedRole.id,
        name: selectedRole.name,
        is_system: selectedRole.is_system,
        color: selectedRole.color
      } : undefined,
      branch_id: branchId || 'branch-1',
      branch: selectedBranch,
      status,
      notes: notes.trim() || undefined,
      must_change_password: mustChangePassword
    };

    onSaveUser(updatedData, generatedPassword || undefined, posPin || undefined);
    toast.success(user ? 'Staff details updated successfully' : 'New staff member registered');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-2xl bg-[#0F172A] border border-[#334155] sm:rounded-3xl shadow-2xl z-10 flex flex-col max-h-screen sm:max-h-[90vh] overflow-hidden my-auto"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">
                {user ? t('admin.users.editStaff', 'Edit Staff: {{name}}', { name: user.full_name }) : t('admin.users.addStaff', 'Register New Staff Member')}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('admin.users.modalSubtitle', 'Configure role permissions, branch assignments & security credentials.')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/[0.08] px-6 bg-slate-950/40 gap-6 text-sm font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={cn(
              "py-3 relative flex items-center gap-2 transition-colors",
              activeTab === 'profile' ? "text-white" : "text-slate-400 hover:text-slate-200"
            )}
          >
            <User className="w-4 h-4" />
            {t('admin.users.tabs.account', 'Staff Account')}
            {activeTab === 'profile' && (
              <motion.div layoutId="modal-tab-indicator" className="absolute bottom-0 inset-x-0 h-0.5 bg-indigo-500 rounded-t-full shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={cn(
              "py-3 relative flex items-center gap-2 transition-colors",
              activeTab === 'security' ? "text-white" : "text-slate-400 hover:text-slate-200"
            )}
          >
            <KeyRound className="w-4 h-4" />
            {t('admin.users.tabs.security', 'Password & Security')}
            {activeTab === 'security' && (
              <motion.div layoutId="modal-tab-indicator" className="absolute bottom-0 inset-x-0 h-0.5 bg-indigo-500 rounded-t-full shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sessions')}
            className={cn(
              "py-3 relative flex items-center gap-2 transition-colors",
              activeTab === 'sessions' ? "text-white" : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Smartphone className="w-4 h-4" />
            {t('admin.users.tabs.sessions', 'Device Sessions')}
            {(userSessions?.length || 0) > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                {(userSessions?.length || 0)}
              </span>
            )}
            {activeTab === 'sessions' && (
              <motion.div layoutId="modal-tab-indicator" className="absolute bottom-0 inset-x-0 h-0.5 bg-indigo-500 rounded-t-full shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
            )}
          </button>
        </div>

        {/* Modal Form Body */}
        <form id="user-edit-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* TAB 1: Staff Account */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    {t('admin.users.username', 'Username')} <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                      <AtSign className="w-4 h-4" />
                    </div>
                    <input
                      required
                      type="text"
                      placeholder="e.g. ali.pos"
                      value={username}
                      onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '.'))}
                      className="w-full h-11 bg-[#111827] border border-[#334155] rounded-xl ps-10 pe-10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    {username && (
                      <div className="absolute inset-y-0 end-0 pe-2.5 flex items-center">
                        <button
                          type="button"
                          onClick={() => setUsername('')}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors flex items-center justify-center"
                          title="Clear"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    {t('admin.users.email', 'Email Address')} <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      required
                      type="email"
                      placeholder="staff@nalipos.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full h-11 bg-[#111827] border border-[#334155] rounded-xl ps-10 pe-10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    {email && (
                      <div className="absolute inset-y-0 end-0 pe-2.5 flex items-center">
                        <button
                          type="button"
                          onClick={() => setEmail('')}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors flex items-center justify-center"
                          title="Clear"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  {t('admin.users.phone', 'Phone Contact')} <span className="text-slate-500 text-[11px] lowercase">({t('common.optional', 'optional')})</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    placeholder="+964 750 123 4567"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full h-11 bg-[#111827] border border-[#334155] rounded-xl ps-10 pe-10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  {phone && (
                    <div className="absolute inset-y-0 end-0 pe-2.5 flex items-center">
                      <button
                        type="button"
                        onClick={() => setPhone('')}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors flex items-center justify-center"
                        title="Clear"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Security Role (RBAC) */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    {t('admin.users.securityRole', 'Security Role')} <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-xs text-indigo-400 font-medium">Administrator, Manager, Cashier, User</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {getStoredRoles().map(role => {
                    const isSelected = roleId === role.id || roleId === role.name;
                    return (
                      <div
                        key={role.id}
                        onClick={() => setRoleId(role.id)}
                        className={cn(
                          "p-3 rounded-xl border cursor-pointer transition-all text-start relative select-none",
                          isSelected 
                            ? "bg-indigo-600/15 border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.2)]" 
                            : "bg-[#111827] border-[#334155] hover:border-slate-500"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm font-bold text-white">{role.name}</span>
                          <div className={cn(
                            "w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
                            isSelected ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-600"
                          )}>
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {role.description || `${role.name} security role permissions`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  {t('admin.users.accountStatus', 'Account Status')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus('active')}
                    className={cn(
                      "py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all",
                      status === 'active' 
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.2)]" 
                        : "bg-[#111827] text-slate-400 border-white/5 hover:border-white/10"
                    )}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {t('admin.users.active', 'Active')}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus('suspended')}
                    className={cn(
                      "py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all",
                      status === 'suspended' 
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]" 
                        : "bg-[#111827] text-slate-400 border-white/5 hover:border-white/10"
                    )}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    {t('admin.users.suspended', 'Suspended')}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus('inactive')}
                    className={cn(
                      "py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all",
                      status === 'inactive' 
                        ? "bg-slate-700/40 text-slate-300 border-slate-500/50" 
                        : "bg-[#111827] text-slate-400 border-white/5 hover:border-white/10"
                    )}
                  >
                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                    {t('admin.users.inactive', 'Inactive')}
                  </button>
                </div>
              </div>

              {/* Login Credentials & Quick PIN Access */}
              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {t('admin.users.loginCredentials', 'POS Terminal & Sign-In Credentials')}
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Ready for Instant Sign-In
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      {t('admin.users.accountPassword', 'Password')}
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-500">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type={showPasswordInForm ? 'text' : 'password'}
                        value={generatedPassword}
                        onChange={e => setGeneratedPassword(e.target.value)}
                        placeholder="cashier123"
                        className="w-full h-10 bg-[#0d121f] border border-slate-700/80 rounded-lg ps-8 pe-16 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                      <div className="absolute inset-y-0 end-0 pe-2 flex items-center gap-1">
                        {generatedPassword && (
                          <button
                            type="button"
                            onClick={() => setGeneratedPassword('')}
                            className="p-1 text-slate-400 hover:text-white text-xs cursor-pointer flex items-center justify-center"
                            title="Clear"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowPasswordInForm(!showPasswordInForm)}
                          className="p-1 text-slate-400 hover:text-white text-xs cursor-pointer flex items-center justify-center"
                          title={showPasswordInForm ? 'Hide' : 'Show'}
                        >
                          {showPasswordInForm ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      {t('admin.users.posPin', '4-Digit POS PIN')}
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-500">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={posPin}
                        onChange={e => setPosPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="1234"
                        className="w-full h-10 bg-[#0d121f] border border-slate-700/80 rounded-lg ps-8 pe-8 text-xs font-mono tracking-widest text-emerald-400 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-bold"
                      />
                      {posPin && (
                        <div className="absolute inset-y-0 end-0 pe-2 flex items-center">
                          <button
                            type="button"
                            onClick={() => setPosPin('')}
                            className="p-1 text-slate-400 hover:text-white text-xs cursor-pointer flex items-center justify-center"
                            title="Clear"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Default password: <code className="text-indigo-300 font-mono bg-indigo-950/60 px-1 py-0.5 rounded">cashier123</code> & PIN: <code className="text-emerald-300 font-mono bg-emerald-950/60 px-1 py-0.5 rounded">1234</code></span>
                  <button
                    type="button"
                    onClick={copyCredentialsSlip}
                    className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCredential ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCredential ? 'Copied' : 'Copy Slip'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  {t('admin.users.notes', 'Administrative Notes')}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={t('admin.users.notesPlaceholder', 'e.g. Assigned to morning register shift. Hardware tools issued.')}
                  className="w-full bg-[#111827] border border-[#334155] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Password & Credentials Generator */}
          {activeTab === 'security' && (
            <div className="space-y-5">
              <div className="bg-[#111827] border border-[#334155] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      {t('admin.users.passwordGenerator', 'Secure Password Generator')}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t('admin.users.passwordGeneratorDesc', 'Generate high-entropy password for new onboarded staff or emergency resets.')}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={generateStrongPassword}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold border border-indigo-500/30 transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {t('admin.security.generateNew', 'Generate New')}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={generatedPassword}
                    onChange={e => setGeneratedPassword(e.target.value)}
                    placeholder="Type custom password or click Generate New..."
                    className="flex-1 bg-slate-950/80 border border-white/10 rounded-xl px-4 py-2.5 font-mono text-sm text-emerald-400 placeholder:text-slate-600 tracking-wider focus:outline-none focus:border-indigo-500 transition-colors"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      if (!generatedPassword) return;
                      navigator.clipboard.writeText(generatedPassword);
                      toast.success(t('admin.security.passwordCopied', 'Password copied'));
                    }}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors border border-white/10"
                    title={t('admin.security.copyPassword', 'Copy Password')}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">{t('admin.users.strength', 'Strength')}:</span>
                  <div className="flex-1 flex items-center gap-1.5">
                    <div className="h-1.5 flex-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <div className="h-1.5 flex-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <div className="h-1.5 flex-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  </div>
                  <span className="text-emerald-400 font-semibold uppercase">{t('admin.users.highSecurity', 'High Security')}</span>
                </div>
              </div>

              {/* POS Quick Terminal PIN */}
              <div className="bg-[#111827] border border-[#334155] rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-400" />
                      {t('admin.users.terminalPin', 'POS Terminal 4-Digit Quick PIN')}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t('admin.users.terminalPinDesc', 'Used for fast cashier terminal unlock and discount authorization.')}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={generateRandomPin}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {t('admin.users.randomPin', 'Random PIN')}
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={posPin}
                    onChange={e => setPosPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="1234"
                    className="w-36 bg-slate-950/80 border border-white/10 rounded-xl px-4 py-2 text-center font-mono text-lg font-bold text-amber-400 tracking-widest focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-xs text-slate-400">
                    {t('admin.users.terminalPinHint', 'Staff enters this PIN on the touch register keypad.')}
                  </span>
                </div>
              </div>

              {/* Security Flags */}
              <div className="bg-[#111827] border border-[#334155] rounded-2xl p-5 space-y-4">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={mustChangePassword}
                    onChange={e => setMustChangePassword(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-indigo-600 bg-slate-900 border-white/20 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {t('admin.users.forcePasswordReset', 'Force Password Reset on Next Login')}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {t('admin.users.forcePasswordResetDesc', 'User will be required to set their personal private password upon signing in.')}
                    </div>
                  </div>
                </label>
              </div>

              {/* 1-Click Copy Onboarding Slip */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={copyCredentialsSlip}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600/20 to-blue-600/20 hover:from-indigo-600/30 hover:to-blue-600/30 border border-indigo-500/40 text-indigo-200 text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
                >
                  {copiedCredential ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>{t('admin.users.credentialsCopied', 'Credentials Slip Copied!')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-indigo-400" />
                      <span>{t('admin.users.copyCredentialsSlip', 'Copy Full Credentials Slip for Staff Member')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Active Device Sessions */}
          {activeTab === 'sessions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">{t('admin.users.authHardwareSessions', 'Authenticated Hardware Sessions')}</h4>
                  <p className="text-xs text-slate-400">
                    {t('admin.users.authHardwareSessionsDesc', 'Devices currently signed into this staff account.')}
                  </p>
                </div>

                {(userSessions?.length || 0) > 0 && (
                  <button
                    type="button"
                    onClick={handleForceLogoutAll}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-colors"
                  >
                    {t('admin.users.forceLogoutAll', 'Force Logout All')}
                  </button>
                )}
              </div>

              {(userSessions?.length || 0) === 0 ? (
                <div className="p-8 text-center bg-[#111827] border border-[#334155] rounded-2xl">
                  <Smartphone className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-60" />
                  <p className="text-sm font-semibold text-slate-300">{t('admin.users.noActiveSessions', 'No Active Sessions')}</p>
                  <p className="text-xs text-slate-500 mt-1">{t('admin.users.noActiveSessionsDesc', 'This user is not currently logged into any terminal or mobile register.')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userSessions.map(sess => {
                    const isMobile = sess.device_category === 'Mobile Phone' || sess.device_type === 'mobile';
                    const isTablet = sess.device_category === 'Tablet' || sess.device_type === 'tablet';
                    const isTerminal = sess.device_category === 'POS Terminal' || sess.device_type === 'terminal';
                    
                    const roleColor = sess.user_role === 'Administrator'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      : sess.user_role === 'Manager'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      : sess.user_role === 'Cashier'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-purple-500/20 text-purple-300 border-purple-500/30';

                    return (
                      <div
                        key={sess.id}
                        className="bg-[#111827] border border-[#334155] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5 sm:mt-0">
                            {isMobile ? (
                              <Smartphone className="w-5 h-5 text-emerald-400" />
                            ) : isTablet ? (
                              <Tablet className="w-5 h-5 text-sky-400" />
                            ) : isTerminal ? (
                              <Monitor className="w-5 h-5 text-amber-400" />
                            ) : (
                              <Laptop className="w-5 h-5 text-indigo-400" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-white">{sess.device_name}</span>
                              
                              {/* Device Type Badge */}
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                {sess.device_category || (isMobile ? 'Mobile Phone' : 'Computer / Laptop')}
                              </span>

                              {/* Role Badge */}
                              <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border", roleColor)}>
                                Logged in as: {sess.user_role || 'Staff'}
                              </span>

                              {sess.is_current && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  {t('admin.users.currentSession', 'Current Device')}
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-slate-400 flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-slate-300">{sess.browser}</span>
                              {sess.os_name && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-400">{sess.os_name}</span>
                                </>
                              )}
                              <span>•</span>
                              <span className="font-mono text-slate-500">{sess.ip_address}</span>
                            </div>

                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-600" />
                                <span>{sess.last_active}</span>
                              </span>
                              <span>({sess.location})</span>
                            </div>
                          </div>
                        </div>

                        {!sess.is_current && (
                          <button
                            type="button"
                            onClick={() => handleRevokeSingleSession(sess.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-colors shrink-0 self-end sm:self-center"
                          >
                            {t('admin.security.revoke', 'Revoke')}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            {t('common.cancel', 'Cancel')}
          </button>

          <div className="flex items-center gap-3">
            <button
              form="user-edit-form"
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              {user ? t('common.saveChanges', 'Save Changes') : t('admin.users.createStaff', 'Create Staff Member')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
