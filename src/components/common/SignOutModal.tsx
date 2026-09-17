import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogOut, 
  Shield, 
  ShoppingCart, 
  X, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  ShieldCheck, 
  KeyRound, 
  Check, 
  Sparkles,
  Loader2,
  Users,
  UserCheck,
  User,
  ChevronRight,
  AlertCircle,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { sound } from '../../lib/sound';
import { useToast } from './Toast';
import { 
  getStoredStaff, 
  validateAdministratorSecretPassword, 
  updateAdministratorPassword,
  syncStaffAndCredentialsFromCloud,
  AdminUser 
} from '../../pages/admin/adminStore';

interface SignOutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalView = 
  | 'main' 
  | 'select_admin' 
  | 'admin_auth' 
  | 'select_cashier' 
  | 'cashier_auth' 
  | 'no_cashier' 
  | 'change_admin_password';

export default function SignOutModal({ isOpen, onClose }: SignOutModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const { profile, user, logout, loginWithCredentials, loginAsDemo } = useAuth();

  const [view, setView] = useState<ModalView>('main');
  const [staffList, setStaffList] = useState<AdminUser[]>(() => getStoredStaff());

  // Selected Target Staff for Switching
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [selectedCashier, setSelectedCashier] = useState<AdminUser | null>(null);

  // Administrator Elevation state
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Cashier Switch state
  const [cashierPin, setCashierPin] = useState('');
  const [showCashierPin, setShowCashierPin] = useState(false);
  const [cashierAuthError, setCashierAuthError] = useState('');
  const [isVerifyingCashier, setIsVerifyingCashier] = useState(false);
  const cashierInputRef = useRef<HTMLInputElement>(null);

  // Administrator Change Password state
  const [newSecretPassword, setNewSecretPassword] = useState('');
  const [confirmSecretPassword, setConfirmSecretPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const isCurrentAdmin = Boolean(
    profile?.role?.name?.toLowerCase().includes('admin') || 
    profile?.role_id === 'role-admin'
  );

  const isCurrentCashier = Boolean(
    profile?.role?.name?.toLowerCase().includes('cashier') || 
    profile?.role_id === 'role-cashier'
  );

  // Active non-deleted staff
  const activeStaff = useMemo(() => {
    return (staffList || []).filter(u => 
      u && 
      u.status !== 'suspended' && 
      u.status !== 'inactive' && 
      u.is_active !== false && 
      !u.deleted_at
    );
  }, [staffList]);

  // Administrator Queue
  const adminStaffList = useMemo(() => {
    return activeStaff.filter(u => 
      u.role?.name?.toLowerCase().includes('admin') || u.role_id === 'role-admin'
    );
  }, [activeStaff]);

  // Cashier Queue
  const cashierStaffList = useMemo(() => {
    return activeStaff.filter(u => 
      u.role?.name?.toLowerCase().includes('cashier') || u.role_id === 'role-cashier'
    );
  }, [activeStaff]);

  // Refresh staff list & sync from cloud when opened
  useEffect(() => {
    if (isOpen) {
      setView('main');
      setSelectedAdmin(null);
      setSelectedCashier(null);
      setAdminPassword('');
      setShowPassword(false);
      setAdminAuthError('');
      setCashierPin('');
      setShowCashierPin(false);
      setCashierAuthError('');
      setPasswordChangeError('');
      setNewSecretPassword('');
      setConfirmSecretPassword('');

      // Load current local staff
      setStaffList(getStoredStaff());

      // Pull fresh data from cloud (cross-device sync)
      syncStaffAndCredentialsFromCloud().then(synced => {
        if (synced) {
          setStaffList(getStoredStaff());
        }
      });
    }
  }, [isOpen]);

  // Focus password input when elevation view opens
  useEffect(() => {
    if (view === 'admin_auth') {
      const timer = setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
    if (view === 'cashier_auth') {
      const timer = setTimeout(() => {
        cashierInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [view]);

  if (!isOpen) return null;

  const handleSignOut = async () => {
    sound.playClick();
    onClose();
    await logout();
  };

  // --- ADMINISTRATOR QUEUE SWITCHING LOGIC ---
  const handleClickAdminSwitch = () => {
    sound.playClick();

    // Directly show the administrators that created an account so user can select one
    if (adminStaffList.length > 0) {
      setView('select_admin');
      return;
    }

    // Fallback if none found
    const singleAdmin = staffList.find(s => 
      s.role?.name?.toLowerCase().includes('admin') || s.role_id === 'role-admin'
    ) || staffList[0];

    if (singleAdmin) {
      setSelectedAdmin(singleAdmin);
      setAdminPassword('');
      setAdminAuthError('');
      setView('admin_auth');
    }
  };

  const handleSelectAdminAccount = (adminUser: AdminUser) => {
    sound.playClick();
    setSelectedAdmin(adminUser);
    setAdminPassword('');
    setAdminAuthError('');
    setView('admin_auth');
  };

  const handleVerifyAndElevateAdmin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = adminPassword.trim();
    if (!trimmed) {
      setAdminAuthError('Please enter the administrator secret password.');
      sound.playError();
      return;
    }

    setIsVerifying(true);
    setAdminAuthError('');

    try {
      const targetAdmin = selectedAdmin || adminStaffList[0] || staffList.find(s => 
        (s.role?.name?.toLowerCase().includes('admin') || s.role_id === 'role-admin')
      ) || staffList[0];

      // Validate secret password against targeted admin account
      const check = validateAdministratorSecretPassword(trimmed, targetAdmin?.id);
      if (!check.success) {
        sound.playError();
        setAdminAuthError(check.error || 'Incorrect administrator password. Access denied.');
        setIsVerifying(false);
        return;
      }

      // Log in with the targeted administrator account
      const userToLogin = check.adminUser || targetAdmin;
      const res = await loginWithCredentials(userToLogin.username || userToLogin.email, trimmed);
      
      if (res.success) {
        sound.playSuccess();
        const devCategory = res.device?.deviceCategory || 'Terminal';
        const devModel = res.device?.deviceName || 'Workstation';
        toast.success(`Elevated to Administrator: ${userToLogin.full_name} • ${devCategory} (${devModel})`);
        onClose();
      } else {
        // Fallback to loginAsDemo targeting this specific administrator ID
        const demoRes = await loginAsDemo('Administrator', trimmed, userToLogin.id);
        if (demoRes.success) {
          sound.playSuccess();
          toast.success(`Elevated to Administrator: ${userToLogin.full_name}`);
          onClose();
        } else {
          sound.playError();
          setAdminAuthError(res.error || demoRes.error || 'Elevation failed. Verification unsuccessful.');
        }
      }
    } catch (err: any) {
      sound.playError();
      setAdminAuthError(err.message || 'System authentication failure.');
    } finally {
      setIsVerifying(false);
    }
  };

  // --- CASHIER QUEUE SWITCHING LOGIC ---
  const handleClickCashierSwitch = () => {
    sound.playClick();

    // REQUIREMENT 1: When there is no cashier account, it could not open and requires a cashier account
    if (cashierStaffList.length === 0) {
      setView('no_cashier');
      return;
    }

    // REQUIREMENT 2: When there is more than one cashier, require which cashier you want to log in
    if (cashierStaffList.length > 1) {
      setView('select_cashier');
      return;
    }

    // Exactly 1 cashier account exists
    const singleCashier = cashierStaffList[0];
    if (isCurrentCashier && profile?.id === singleCashier.id) {
      toast.info('You are already actively using this Cashier POS session.');
      return;
    }

    setSelectedCashier(singleCashier);
    setCashierPin('');
    setCashierAuthError('');
    setView('cashier_auth');
  };

  const handleSelectCashierAccount = (cashierUser: AdminUser) => {
    sound.playClick();
    setSelectedCashier(cashierUser);
    setCashierPin('');
    setCashierAuthError('');
    setView('cashier_auth');
  };

  const handleVerifyAndSwitchCashier = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedCashier) {
      toast.error('No cashier selected');
      return;
    }

    setIsVerifyingCashier(true);
    setCashierAuthError('');

    try {
      const pinOrPass = cashierPin.trim();
      let res: any;

      if (pinOrPass) {
        // Validate with provided PIN or password
        res = await loginWithCredentials(selectedCashier.username || selectedCashier.email || selectedCashier.id, pinOrPass);
      } else {
        // Quick switch to this specific cashier
        res = await loginAsDemo('Cashier', undefined, selectedCashier.id);
      }

      if (res && res.success) {
        sound.playSuccess();
        const role = res.user?.role?.name || 'Cashier POS';
        const devCategory = res.device?.deviceCategory || 'Active Device';
        const devModel = res.device?.deviceName || 'Terminal';
        toast.success(`Switched role to ${role} (${selectedCashier.full_name}) • ${devCategory} (${devModel})`);
        onClose();
      } else {
        sound.playError();
        setCashierAuthError(res?.error || 'Authentication failed. Please verify the PIN or password.');
      }
    } catch (err: any) {
      sound.playError();
      setCashierAuthError(err.message || 'Cashier login failure.');
    } finally {
      setIsVerifyingCashier(false);
    }
  };

  const handleSaveNewAdminPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSecretPassword || (newSecretPassword?.length || 0) < 4) {
      setPasswordChangeError('Password must be at least 4 characters long.');
      sound.playError();
      return;
    }
    if (newSecretPassword !== confirmSecretPassword) {
      setPasswordChangeError('Passwords do not match. Please re-type carefully.');
      sound.playError();
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordChangeError('');

    const res = updateAdministratorPassword(newSecretPassword);
    if (res.success) {
      sound.playSuccess();
      toast.success('Your Administrator secret password was updated successfully!');
      setView('main');
    } else {
      sound.playError();
      setPasswordChangeError(res.message);
    }
    setIsUpdatingPassword(false);
  };

  const getRoleDisplayName = (roleName?: string) => {
    if (!roleName) return t('signOutModal.staffUser', 'Staff User');
    const lower = roleName.toLowerCase();
    if (lower.includes('admin')) {
      return t('signOutModal.roleAdministrator', 'Administrator');
    }
    if (lower.includes('cashier')) {
      return t('signOutModal.roleCashier', 'Cashier POS');
    }
    return roleName;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
          onClick={() => {
            sound.playClick();
            onClose();
          }}
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md bg-[#0e1322] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden z-10"
        >
          {/* ============================================================ */}
          {/* VIEW: MAIN SWITCH MENU                                       */}
          {/* ============================================================ */}
          {view === 'main' && (
            <div>
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#13192c]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {t('signOutModal.title', 'Sign Out / Switch Account')}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {t('signOutModal.subtitle', 'Manage session or switch staff queues')}
                    </p>
                  </div>
                </div>
                <button
                  id="btn-close-signout-modal"
                  onClick={() => {
                    sound.playClick();
                    onClose();
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  aria-label={t('common.close', 'Close')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* Active User Card */}
                <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center font-bold text-white text-sm shadow-md">
                    {profile?.full_name?.substring(0, 2).toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white truncate">
                      {profile?.full_name || t('signOutModal.activeSession', 'Active User')}
                    </div>
                    <div className="text-xs text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="font-medium text-slate-300">{getRoleDisplayName(profile?.role?.name)}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-500 truncate">{user?.email || 'user@nalimobile.com'}</span>
                    </div>
                  </div>
                </div>

                {/* Switch Role / Staff Queues Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{t('signOutModal.switchRole', 'Staff Queues')}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-indigo-400" />
                      Protected Switch
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Administrator Queue Card */}
                    <button
                      id="btn-switch-admin"
                      type="button"
                      onClick={handleClickAdminSwitch}
                      className={`relative flex flex-col items-start gap-1 p-3.5 rounded-xl border transition-all text-start group ${
                        isCurrentAdmin 
                          ? 'bg-indigo-950/40 border-indigo-500/60 text-white ring-1 ring-indigo-500/40' 
                          : 'bg-slate-800/60 hover:bg-indigo-950/50 border-slate-700/70 hover:border-indigo-500/50 text-slate-200 hover:scale-[1.01] active:scale-[0.99]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-xs">
                          <Shield className="w-3.5 h-3.5" />
                          <span>{t('signOutModal.switchAdminTitle', 'Administrator')}</span>
                        </div>
                        {isCurrentAdmin ? (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Active
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold flex items-center gap-0.5 text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                            {adminStaffList.length > 1 ? `${adminStaffList.length} in Queue` : '1 in Queue'}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        {adminStaffList.length > 1 
                          ? `Choose from ${adminStaffList.length} admin accounts`
                          : isCurrentAdmin 
                            ? 'Operating with full system rights' 
                            : 'Requires secret admin password'}
                      </span>
                    </button>

                    {/* Cashier Queue Card */}
                    <button
                      id="btn-switch-cashier"
                      type="button"
                      onClick={handleClickCashierSwitch}
                      className={`relative flex flex-col items-start gap-1 p-3.5 rounded-xl border transition-all text-start group ${
                        cashierStaffList.length === 0
                          ? 'bg-slate-900/60 border-amber-500/30 text-slate-400 hover:border-amber-500/50 hover:bg-amber-500/5'
                          : isCurrentCashier 
                            ? 'bg-emerald-950/40 border-emerald-500/60 text-white ring-1 ring-emerald-500/40' 
                            : 'bg-slate-800/60 hover:bg-emerald-950/50 border-slate-700/70 hover:border-emerald-500/50 text-slate-200 hover:scale-[1.01] active:scale-[0.99]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className={`flex items-center gap-1.5 font-semibold text-xs ${
                          cashierStaffList.length === 0 ? 'text-amber-400/80' : 'text-emerald-400'
                        }`}>
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>{t('signOutModal.switchCashierTitle', 'Cashier POS')}</span>
                        </div>
                        {cashierStaffList.length === 0 ? (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            0 in Queue
                          </span>
                        ) : isCurrentCashier ? (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Active
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold flex items-center gap-0.5 text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            {cashierStaffList.length > 1 ? `${cashierStaffList.length} in Queue` : '1 in Queue'}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] leading-tight mt-0.5 text-slate-400">
                        {cashierStaffList.length === 0 
                          ? 'No cashier account • Cannot open'
                          : cashierStaffList.length > 1
                            ? `Choose from ${cashierStaffList.length} cashiers in queue`
                            : 'Fast POS register & barcode'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* If currently logged in as Administrator, offer Quick Password Change */}
                {isCurrentAdmin && (
                  <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">Administrator Secret Password</div>
                        <div className="text-[10px] text-slate-400">Keep your master access password secure</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      id="btn-open-change-admin-pass"
                      onClick={() => {
                        sound.playClick();
                        setView('change_admin_password');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 hover:text-white text-xs font-semibold border border-indigo-500/40 transition-colors"
                    >
                      Change Password
                    </button>
                  </div>
                )}

                {/* Primary Sign Out Action */}
                <div className="pt-2 border-t border-slate-800">
                  <button
                    id="btn-confirm-signout"
                    type="button"
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-lg shadow-rose-600/30 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('signOutModal.signOutBtn', 'Complete Sign Out')}</span>
                  </button>
                  <p className="text-center text-[11px] text-slate-500 mt-2">
                    {t('signOutModal.lockDesc', 'This locks the POS register and returns to the sign-in screen.')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW: SELECT ADMINISTRATOR FROM QUEUE (When multiple exist) */}
          {/* ============================================================ */}
          {view === 'select_admin' && (
            <div>
              <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#13192c]">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setView('main');
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Back"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        Administrator Queue
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                          {adminStaffList.length} Accounts
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Choose which administrator account you want to log in as:
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    sound.playClick();
                    onClose();
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  aria-label={t('common.close', 'Close')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-2.5 max-h-[380px] overflow-y-auto">
                {adminStaffList.map((admin) => {
                  const isCurrent = profile?.id === admin.id;
                  return (
                    <button
                      key={admin.id}
                      type="button"
                      onClick={() => handleSelectAdminAccount(admin)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-start transition-all ${
                        isCurrent 
                          ? 'bg-indigo-950/40 border-indigo-500/50 ring-1 ring-indigo-500/30' 
                          : 'bg-slate-900/70 hover:bg-slate-800/90 border-slate-800 hover:border-indigo-500/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-700 to-blue-500 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-sm">
                          {admin.full_name?.substring(0, 2).toUpperCase() || 'AD'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                            <span>{admin.full_name}</span>
                            {isCurrent && (
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                            <span>@{admin.username || 'admin'}</span>
                            <span className="text-slate-600">•</span>
                            <span className="truncate">{admin.email || 'administrator'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ms-2">
                        <span className="text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
                          Select
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-4 border-t border-slate-800 bg-[#0d1220] flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setView('main');
                  }}
                  className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Back to Menu
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW: SELECT CASHIER FROM QUEUE (When multiple exist)        */}
          {/* ============================================================ */}
          {view === 'select_cashier' && (
            <div>
              <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#13192c]">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setView('main');
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Back"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        Cashier Queue
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                          {cashierStaffList.length} Accounts
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Choose which cashier account you want to log in as:
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    sound.playClick();
                    onClose();
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  aria-label={t('common.close', 'Close')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-2.5 max-h-[380px] overflow-y-auto">
                {cashierStaffList.map((cashier) => {
                  const isCurrent = profile?.id === cashier.id;
                  return (
                    <button
                      key={cashier.id}
                      type="button"
                      onClick={() => handleSelectCashierAccount(cashier)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-start transition-all ${
                        isCurrent 
                          ? 'bg-emerald-950/40 border-emerald-500/50 ring-1 ring-emerald-500/30' 
                          : 'bg-slate-900/70 hover:bg-slate-800/90 border-slate-800 hover:border-emerald-500/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-sm">
                          {cashier.full_name?.substring(0, 2).toUpperCase() || 'CA'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                            <span>{cashier.full_name}</span>
                            {isCurrent && (
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                            <span>@{cashier.username || 'cashier'}</span>
                            {cashier.phone && (
                              <>
                                <span className="text-slate-600">•</span>
                                <span>{cashier.phone}</span>
                              </>
                            )}
                            {cashier.branch?.name && (
                              <>
                                <span className="text-slate-600">•</span>
                                <span className="text-slate-500">{cashier.branch.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ms-2">
                        <span className="text-xs font-semibold text-emerald-400 group-hover:text-emerald-300">
                          Select
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-4 border-t border-slate-800 bg-[#0d1220] flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setView('main');
                  }}
                  className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Back to Menu
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW: NO CASHIER ACCOUNT WARNING                             */}
          {/* ============================================================ */}
          {view === 'no_cashier' && (
            <div>
              <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#13192c]">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setView('main');
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Back"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        Cashier Account Required
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Cannot open projected Cashier POS
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    sound.playClick();
                    onClose();
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  aria-label={t('common.close', 'Close')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                  <ShoppingCart className="w-8 h-8" />
                </div>

                <div>
                  <h4 className="text-base font-bold text-white">
                    No Cashier Account Found
                  </h4>
                  <p className="text-xs text-slate-300 mt-2 max-w-xs mx-auto leading-relaxed">
                    There are currently no cashier accounts registered in the database. 
                    Opening the Cashier POS requires an existing active cashier account.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-start text-xs text-slate-400 space-y-1">
                  <div className="font-semibold text-indigo-300 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    <span>How to configure a Cashier account:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] ps-1 pt-1">
                    <li>Sign in as an <strong className="text-slate-200">Administrator</strong></li>
                    <li>Go to <strong className="text-slate-200">Administration → Staff & Roles</strong></li>
                    <li>Click <strong className="text-slate-200">+ Add Staff Member</strong> and assign role <strong className="text-slate-200">Cashier POS</strong></li>
                  </ol>
                </div>

                <div className="pt-2 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setView('main');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                  >
                    Return to Menu
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW: CASHIER AUTHENTICATION / PIN CHALLENGE                  */}
          {/* ============================================================ */}
          {view === 'cashier_auth' && selectedCashier && (
            <div>
              <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#13192c]">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      if (cashierStaffList.length > 1) {
                        setView('select_cashier');
                      } else {
                        setView('main');
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Back"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        Cashier Verification
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Switching to {selectedCashier.full_name}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    sound.playClick();
                    onClose();
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  aria-label={t('common.close', 'Close')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleVerifyAndSwitchCashier} className="p-5 space-y-4">
                {/* Target Cashier Banner */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/30 shrink-0">
                    {selectedCashier.full_name?.substring(0, 2).toUpperCase() || 'CA'}
                  </div>
                  <div className="min-w-0 flex-1 text-start">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{selectedCashier.full_name}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                        Cashier POS
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                      @{selectedCashier.username || 'cashier'} • {selectedCashier.email || selectedCashier.phone || 'Terminal Cashier'}
                    </div>
                  </div>
                </div>

                {/* Error Banner */}
                {cashierAuthError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold text-rose-200">Switch Failed</div>
                      <div className="text-[11px] text-rose-300/90 mt-0.5">{cashierAuthError}</div>
                    </div>
                  </div>
                )}

                {/* PIN / Password Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label 
                      htmlFor="input-cashier-switch-pin" 
                      className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Cashier PIN or Password</span>
                    </label>
                    <span className="text-[10px] text-slate-500">Default PIN: 1234</span>
                  </div>

                  <div className="relative flex items-center">
                    <input
                      ref={cashierInputRef}
                      id="input-cashier-switch-pin"
                      name="cashier_pin_verification_temp"
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-form-type="other"
                      type={showCashierPin ? 'text' : 'password'}
                      value={cashierPin}
                      onChange={e => {
                        setCashierPin(e.target.value);
                        if (cashierAuthError) setCashierAuthError('');
                      }}
                      placeholder="Enter 4-digit PIN (1234) or password..."
                      disabled={isVerifyingCashier}
                      className="w-full bg-[#080c16] border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl ps-3.5 pe-20 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none transition-all"
                    />
                    <div className="absolute inset-y-0 end-2 flex items-center gap-1">
                      {(cashierPin?.length || 0) > 0 && (
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => {
                            setCashierPin('');
                            cashierInputRef.current?.focus();
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors flex items-center justify-center"
                          title="Clear"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowCashierPin(!showCashierPin)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors flex items-center justify-center"
                        title={showCashierPin ? 'Hide' : 'Show'}
                      >
                        {showCashierPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Leave blank to switch directly with account default PIN.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      if (cashierStaffList.length > 1) {
                        setView('select_cashier');
                      } else {
                        setView('main');
                      }
                    }}
                    disabled={isVerifyingCashier}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    id="btn-submit-cashier-switch"
                    type="submit"
                    disabled={isVerifyingCashier}
                    className="flex-[2] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                  >
                    {isVerifyingCashier ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Logging in...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-emerald-200" />
                        <span>Switch to {selectedCashier.full_name?.split(' ')[0] || 'Cashier'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW: ADMINISTRATOR PASSWORD AUTHENTICATION CHALLENGE        */}
          {/* ============================================================ */}
          {view === 'admin_auth' && (
            <div>
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#13192c]">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      if (adminStaffList.length > 1) {
                        setView('select_admin');
                      } else {
                        setView('main');
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Back"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        Administrator Verification
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {selectedAdmin ? `Targeting ${selectedAdmin.full_name}` : 'Secret password required to elevate to Administrator'}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    sound.playClick();
                    onClose();
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  aria-label={t('common.close', 'Close')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleVerifyAndElevateAdmin} className="p-5 space-y-4">
                {/* Target Role / Account Banner */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-indigo-500/30 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/30 shrink-0">
                    {selectedAdmin?.full_name?.substring(0, 2).toUpperCase() || 'AD'}
                  </div>
                  <div className="min-w-0 flex-1 text-start">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{selectedAdmin?.full_name || 'Administrator Account'}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                        Administrator
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {selectedAdmin?.email || selectedAdmin?.username ? `@${selectedAdmin.username || 'admin'} • ${selectedAdmin.email || 'confidential'}` : 'Confidential access • Roles, security rules & system settings'}
                    </div>
                  </div>
                </div>

                {/* Error Banner */}
                {adminAuthError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold text-rose-200">Access Denied</div>
                      <div className="text-[11px] text-rose-300/90 mt-0.5">{adminAuthError}</div>
                    </div>
                  </div>
                )}

                {/* Password Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label 
                      htmlFor="input-admin-switch-password" 
                      className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Administrator Secret Password</span>
                    </label>
                    {capsLockOn && (
                      <span className="text-[10px] text-amber-400 font-semibold uppercase">
                        Caps Lock ON
                      </span>
                    )}
                  </div>

                  <div className="relative flex items-center">
                    <input
                      ref={passwordInputRef}
                      id="input-admin-switch-password"
                      name="admin_secret_verification_temp"
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-form-type="other"
                      type={showPassword ? 'text' : 'password'}
                      value={adminPassword}
                      onChange={e => {
                        setAdminPassword(e.target.value);
                        if (adminAuthError) setAdminAuthError('');
                      }}
                      onKeyUp={e => setCapsLockOn(e.getModifierState('CapsLock'))}
                      placeholder="Enter administrator password..."
                      disabled={isVerifying}
                      className="w-full bg-[#080c16] border border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl ps-3.5 pe-20 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none transition-all"
                    />
                    <div className="absolute inset-y-0 end-2 flex items-center gap-1">
                      {(adminPassword?.length || 0) > 0 && (
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => {
                            setAdminPassword('');
                            passwordInputRef.current?.focus();
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors flex items-center justify-center"
                          title="Clear password"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors flex items-center justify-center"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Switching to Administrator requires the secret password.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      if (adminStaffList.length > 1) {
                        setView('select_admin');
                      } else {
                        setView('main');
                      }
                    }}
                    disabled={isVerifying}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    id="btn-submit-admin-elevation"
                    type="submit"
                    disabled={isVerifying || !adminPassword.trim()}
                    className="flex-[2] py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-indigo-200" />
                        <span>Authorize & Switch to Admin</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW: CHANGE ADMINISTRATOR SECRET PASSWORD                   */}
          {/* ============================================================ */}
          {view === 'change_admin_password' && (
            <div>
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#13192c]">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setView('main');
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Back to accounts"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        Set Administrator Password
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Create your own secret password for admin elevation
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    sound.playClick();
                    onClose();
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveNewAdminPassword} className="p-5 space-y-4">
                {passwordChangeError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{passwordChangeError}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      New Administrator Secret Password
                    </label>
                    <div className="relative flex items-center">
                      <input
                        name="new_secret_pwd_no_save"
                        autoComplete="new-password"
                        data-lpignore="true"
                        data-form-type="other"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newSecretPassword}
                        onChange={e => setNewSecretPassword(e.target.value)}
                        placeholder="Enter your secret password (min. 4 chars)..."
                        className="w-full bg-[#080c16] border border-slate-700 focus:border-indigo-500 rounded-xl ps-3.5 pe-20 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none"
                      />
                      <div className="absolute inset-y-0 end-2 flex items-center gap-1">
                        {(newSecretPassword?.length || 0) > 0 && (
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setNewSecretPassword('')}
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors flex items-center justify-center"
                            title="Clear password"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors flex items-center justify-center"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Confirm Secret Password
                    </label>
                    <div className="relative flex items-center">
                      <input
                        name="confirm_secret_pwd_no_save"
                        autoComplete="new-password"
                        data-lpignore="true"
                        data-form-type="other"
                        type={showNewPassword ? 'text' : 'password'}
                        value={confirmSecretPassword}
                        onChange={e => setConfirmSecretPassword(e.target.value)}
                        placeholder="Re-enter secret password..."
                        className="w-full bg-[#080c16] border border-slate-700 focus:border-indigo-500 rounded-xl ps-3.5 pe-20 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none"
                      />
                      <div className="absolute inset-y-0 end-2 flex items-center gap-1">
                        {(confirmSecretPassword?.length || 0) > 0 && (
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setConfirmSecretPassword('')}
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors flex items-center justify-center"
                            title="Clear password"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors flex items-center justify-center"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400">
                  <div className="font-semibold text-slate-300 mb-0.5">Security Policy</div>
                  Once set, this password will be required every time anyone switches from Cashier to Administrator.
                </div>

                <div className="pt-2 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setView('main');
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    id="btn-save-admin-secret-password"
                    type="submit"
                    disabled={isUpdatingPassword || !newSecretPassword}
                    className="flex-[2] py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                  >
                    {isUpdatingPassword ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>Save Secret Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
