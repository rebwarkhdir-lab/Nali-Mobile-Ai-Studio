import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase, getSupabaseConfig } from '../../lib/supabase';
import { UserProfile, authService } from '../../lib/authService';
import { useAuth } from '../../context/AuthContext';
import { 
  X, Loader2, Mail, Phone, Shield, Eye, EyeOff, ShieldCheck, 
  FileText, Info, AtSign, KeyRound, Sparkles, Check, Copy
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { useToast } from '../../components/common/Toast';
import { cn } from '../../lib/utils';
import { registerStaffUser, getStoredRoles } from './adminStore';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  roles: any[];
  onSuccess: () => void;
}

const CANONICAL_ROLE_DEFS = [
  { 
    id: 'role-admin', 
    name: 'Administrator', 
    label: 'Administrator', 
    description: 'Full root access to all system modules, security, staff & configuration', 
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' 
  },
  { 
    id: 'role-manager', 
    name: 'Manager', 
    label: 'Manager', 
    description: 'Complete store oversight: Sales, inventory, stock adjustments & debts', 
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30' 
  },
  { 
    id: 'role-cashier', 
    name: 'Cashier', 
    label: 'Cashier', 
    description: 'Front-desk point of sale: scan barcodes, checkout sales & receipts', 
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
  },
  { 
    id: 'role-user', 
    name: 'User', 
    label: 'User', 
    description: 'Standard operational staff: inventory catalog & customer lookup', 
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' 
  },
];

export default function UserModal({ isOpen, onClose, user, roles = [], onSuccess }: UserModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedSlip, setCopiedSlip] = useState(false);

  // Compute canonical roles ensuring Administrator, Manager, Cashier, User are ALWAYS present
  const availableRoles = useMemo(() => {
    const list = CANONICAL_ROLE_DEFS.map(def => ({ ...def }));
    if (roles && Array.isArray(roles) && roles.length > 0) {
      for (const r of roles) {
        const found = list.find(cr => cr.name.toLowerCase() === r.name.toLowerCase());
        if (found) {
          found.id = r.id; // Map to database UUID if existing
        } else {
          list.push({
            id: r.id,
            name: r.name,
            label: r.name,
            description: r.description || 'System access role',
            badgeColor: 'bg-slate-700/40 text-slate-300 border-slate-600'
          });
        }
      }
    }
    return list;
  }, [roles]);

  const defaultRoleId = useMemo(() => {
    const cashier = availableRoles.find(r => r.name.toLowerCase() === 'cashier');
    if (cashier) return cashier.id;
    const userRole = availableRoles.find(r => r.name.toLowerCase() === 'user');
    if (userRole) return userRole.id;
    return availableRoles[0]?.id || 'role-cashier';
  }, [availableRoles]);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    role_id: '',
    status: 'active',
    password: '',
    pos_pin: '1234',
    notes: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || user.email?.split('@')[0] || '',
        email: user.email || '',
        phone: user.phone || '',
        role_id: user.role_id || (user.role?.name || defaultRoleId),
        status: user.status || 'active',
        password: '',
        pos_pin: (user as any).pin || '1234',
        notes: (user as any).notes || ''
      });
    } else {
      setFormData({
        username: '',
        email: '',
        phone: '',
        role_id: defaultRoleId,
        status: 'active',
        password: 'cashier123',
        pos_pin: '1234',
        notes: ''
      });
    }
  }, [user, defaultRoleId, isOpen]);

  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password: result }));
    setShowPassword(true);
    toast.success('Generated strong secure password');
  };

  const copySlip = () => {
    const roleObj = availableRoles.find(r => r.id === formData.role_id) || availableRoles[0];
    const slip = `🔐 NALI POS - Staff Login Credentials
----------------------------------
Username: @${formData.username.replace(/^@/, '').trim()}
Email: ${formData.email.trim()}
Phone: ${formData.phone.trim() || 'N/A'}
Role: ${roleObj?.name || 'Staff'}
Temporary Password: ${formData.password || 'cashier123'}
POS Touch PIN: ${formData.pos_pin || '1234'}
----------------------------------
Confidential staff credentials slip.`;

    navigator.clipboard.writeText(slip);
    setCopiedSlip(true);
    toast.success('Credentials slip copied to clipboard!');
    setTimeout(() => setCopiedSlip(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanUsername = formData.username.replace(/^@/, '').trim().toLowerCase();
    const cleanEmail = formData.email.trim().toLowerCase();

    if (!cleanUsername) {
      toast.error('Username is required.');
      return;
    }
    if (!cleanEmail) {
      toast.error('Email address is required.');
      return;
    }

    setLoading(true);

    try {
      let finalRoleId = formData.role_id || defaultRoleId;

      // Match against available roles
      const matchedRole = availableRoles.find(r => r.id === finalRoleId || r.name.toLowerCase() === finalRoleId.toLowerCase());
      const roleName = matchedRole ? matchedRole.name : 'Cashier';

      // Check for UUID resolution if talking to Supabase database
      if (finalRoleId.startsWith('role-')) {
        const { data: roleData } = await supabase.from('roles').select('id').eq('name', roleName).maybeSingle();
        if (roleData?.id) {
          finalRoleId = roleData.id;
        }
      }

      // Automatically construct a clean display name from username
      const autoFullName = cleanUsername
        .split(/[._-]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || cleanUsername;

      if (user) {
        // --- Edit User ---
        if (user.role?.name === 'Administrator' && roleName !== 'Administrator') {
          // Prevent removing own admin role
          if (user.id === profile?.id) {
            toast.error("You cannot remove your own Administrator role.");
            setLoading(false);
            return;
          }
          // Prevent removing the last active admin
          const { data: admins } = await supabase.from('profiles').select('id').eq('status', 'active');
          if (admins && (admins?.length || 0) <= 1) {
            toast.error("Cannot demote the last active Administrator.");
            setLoading(false);
            return;
          }
        }

        const { error } = await supabase.from('profiles').update({
          full_name: autoFullName,
          username: cleanUsername,
          email: cleanEmail,
          phone: formData.phone.trim() || null,
          role_id: finalRoleId || null,
          status: formData.status,
          notes: formData.notes
        }).eq('id', user.id);

        if (error) {
          console.warn('[UserModal] Supabase update notice:', error);
        }

        if (formData.password && user.id === profile?.id) {
          const { error: pwError } = await supabase.auth.updateUser({ password: formData.password });
          if (pwError) toast.error('Password update notice: ' + pwError.message);
        }

        if (profile?.id) {
          await authService.logAudit(profile.id, `Edited staff profile @${cleanUsername}`, 'profiles', user.id);
        }
        toast.success(`Staff account @${cleanUsername} updated successfully`);

      } else {
        // --- Create New Staff Member ---
        // Register in local & synchronized staff store first
        const newStaff = registerStaffUser({
          full_name: autoFullName,
          username: cleanUsername,
          email: cleanEmail,
          phone: formData.phone.trim() || undefined,
          role_id: finalRoleId,
          password: formData.password || 'cashier123',
          pin: formData.pos_pin || '1234',
          notes: formData.notes
        });

        // Supabase background sync attempt
        try {
          if (cleanEmail && formData.password) {
            const cfg = getSupabaseConfig();
            const tempClient = createClient(
              cfg.supabaseUrl,
              cfg.supabaseAnonKey,
              { auth: { persistSession: false, autoRefreshToken: false } }
            );

            const { data: signUpData } = await tempClient.auth.signUp({
              email: cleanEmail,
              password: formData.password,
              options: {
                data: { full_name: autoFullName, username: cleanUsername }
              }
            });

            if (signUpData?.user) {
              await supabase.from('profiles').upsert({
                id: signUpData.user.id,
                full_name: autoFullName,
                username: cleanUsername,
                email: cleanEmail,
                phone: formData.phone.trim() || null,
                role_id: finalRoleId || null,
                status: formData.status,
                notes: formData.notes
              });
            }
          }
        } catch (syncErr) {
          console.warn('[UserModal] Supabase sync notice:', syncErr);
        }

        if (profile?.id) {
          await authService.logAudit(profile.id, `Created new staff account @${cleanUsername} (${roleName})`, 'profiles', newStaff.id);
        }
        toast.success(`Staff member @${cleanUsername} registered as ${roleName}!`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-[#0F172A] border border-[#334155] rounded-3xl shadow-2xl z-10 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">
                {user ? t('admin.users.editStaff', 'Edit Staff: @{{username}}', { username: formData.username || user.username }) : t('admin.users.addStaff', 'Register New Staff Member')}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('admin.users.modalSubtitleStreamlined', 'Configure credentials and security access role.')}
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

        {/* Modal Form Body */}
        <form id="user-register-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Section: Account Identity */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-400" />
              {t('admin.users.accountInfo', 'Staff Credentials')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Username */}
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
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '.') })}
                    className="w-full h-11 bg-[#111827] border border-[#334155] rounded-xl ps-10 pe-10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  {formData.username && (
                    <div className="absolute inset-y-0 end-0 pe-2.5 flex items-center">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, username: '' })}
                        className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                        title="Clear"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Used for POS register and portal sign in</p>
              </div>

              {/* Email Address */}
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
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full h-11 bg-[#111827] border border-[#334155] rounded-xl ps-10 pe-10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  {formData.email && (
                    <div className="absolute inset-y-0 end-0 pe-2.5 flex items-center">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, email: '' })}
                        className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                        title="Clear"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">For account recovery and notifications</p>
              </div>
            </div>

            {/* Phone Contact */}
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
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full h-11 bg-[#111827] border border-[#334155] rounded-xl ps-10 pe-10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                {formData.phone && (
                  <div className="absolute inset-y-0 end-0 pe-2.5 flex items-center">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, phone: '' })}
                      className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                      title="Clear"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section: Security Role (RBAC) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {t('admin.users.securityRole', 'Security Role (RBAC)')} <span className="text-rose-400">*</span>
              </label>
              <span className="text-xs text-indigo-400 font-medium">Administrator, Manager, Cashier, User</span>
            </div>

            {/* Interactive Role Selector Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableRoles.map(roleItem => {
                const isSelected = formData.role_id === roleItem.id || formData.role_id === roleItem.name;
                return (
                  <div
                    key={roleItem.id}
                    onClick={() => setFormData({ ...formData, role_id: roleItem.id })}
                    className={cn(
                      "p-3.5 rounded-2xl border cursor-pointer transition-all text-start relative select-none",
                      isSelected 
                        ? "bg-indigo-600/15 border-indigo-500 shadow-[0_0_16px_rgba(99,102,241,0.2)]" 
                        : "bg-[#111827] border-[#334155] hover:border-slate-500 hover:bg-slate-800/40"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{roleItem.name}</span>
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border", roleItem.badgeColor)}>
                          {roleItem.name}
                        </span>
                      </div>
                      <div className={cn(
                        "w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
                        isSelected ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-600"
                      )}>
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {roleItem.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Password, Touch PIN & Status */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              {t('admin.security.credentials', 'Password & POS Terminal PIN')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    {user ? t('admin.users.resetPassword', 'Password') : t('admin.users.password', 'Password')} <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={generateStrongPassword}
                    className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    {t('admin.users.generate', 'Generate')}
                  </button>
                </div>
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required={!user}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full h-11 bg-[#111827] border border-[#334155] rounded-xl ps-10 pe-10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                  />
                  <div className="absolute inset-y-0 end-0 pe-2.5 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* POS Touch PIN */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  {t('admin.users.posPin', 'POS Touch PIN (4 Digits)')}
                </label>
                <div className="relative flex items-center">
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={formData.pos_pin}
                    onChange={e => setFormData({ ...formData, pos_pin: e.target.value.replace(/\D/g, '') })}
                    placeholder="1234"
                    className="w-full h-11 bg-[#111827] border border-[#334155] rounded-xl px-4 text-center font-mono text-base font-bold text-amber-400 tracking-widest focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">For 1-touch register keypad unlock</p>
              </div>
            </div>

            {/* Account Status Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {t('admin.users.accountStatus', 'Account Status')}
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: 'active' })}
                  className={cn(
                    "py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all",
                    formData.status === 'active' 
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.2)]" 
                      : "bg-[#111827] text-slate-400 border-[#334155] hover:border-slate-500"
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {t('admin.users.active', 'Active')}
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: 'suspended' })}
                  className={cn(
                    "py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all",
                    formData.status === 'suspended' 
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]" 
                      : "bg-[#111827] text-slate-400 border-[#334155] hover:border-slate-500"
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  {t('admin.users.suspended', 'Suspended')}
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: 'inactive' })}
                  className={cn(
                    "py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all",
                    formData.status === 'inactive' 
                      ? "bg-slate-700/40 text-slate-300 border-slate-500/50" 
                      : "bg-[#111827] text-slate-400 border-[#334155] hover:border-slate-500"
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  {t('admin.users.inactive', 'Inactive')}
                </button>
              </div>
            </div>

            {/* Quick Copy Credentials Slip Button */}
            {formData.username && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={copySlip}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  {copiedSlip ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>{t('admin.users.credentialsCopied', 'Staff Credentials Slip Copied!')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-indigo-400" />
                      <span>{t('admin.users.copyCredentialsSlip', 'Copy Staff Login Slip (Username, Password & PIN)')}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
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

          <button
            form="user-register-form"
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('common.saving', 'Saving...')}</span>
              </>
            ) : (
              <span>{user ? t('common.saveChanges', 'Save Changes') : t('admin.users.registerStaff', 'Register Staff')}</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
