import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Shield, 
  ShoppingCart, 
  User, 
  Mail, 
  Lock, 
  Phone, 
  Building2, 
  Sparkles, 
  Check, 
  CheckCircle, 
  Eye, 
  EyeOff, 
  X, 
  ArrowRight, 
  ArrowLeft,
  Globe, 
  KeyRound, 
  UserPlus, 
  AlertCircle, 
  BadgeCheck, 
  Wrench, 
  Package, 
  Briefcase,
  ChevronDown,
  AtSign,
  Laptop,
  Smartphone,
  Tablet,
  Monitor,
  Send,
  RefreshCw,
  MailCheck,
  ShieldCheck,
  ShieldAlert,
  Users,
  UserCheck,
  ChevronRight,
  Search,
  Hash,
  Delete
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { 
  AdminUser, 
  AdminRole,
  getStoredStaff,
  getStoredRoles,
  saveStoredStaff,
  saveUserCredential,
  updateAdministratorPassword,
  validateAdministratorSecretPassword,
  syncStaffAndCredentialsFromCloud
} from './admin/adminStore';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { detectDevice } from '../lib/deviceDetector';
import { useToast } from '../components/common/Toast';
import { cn } from '../lib/utils';

type AuthView = 'sign_in' | 'forgot_password' | 'reset_sent' | 'recovery_new_password' | 'register';

export default function Login() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { loginWithCredentials, loginAsDemo, registerStaffAccount } = useAuth();

  // Active View
  const [authView, setAuthView] = useState<AuthView>('sign_in');

  // Role Target Mode: 'admin' vs 'cashier'
  const [loginTargetRole, setLoginTargetRole] = useState<'admin' | 'cashier'>('admin');

  // Sign In State
  const [identifier, setIdentifier] = useState(''); // email or username
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [inputMode, setInputMode] = useState<'password' | 'pin'>('password');
  const [rememberMe, setRememberMe] = useState(false);

  // Administrator Accounts & Selection Modal
  const [staffList, setStaffList] = useState<AdminUser[]>(() => {
    try {
      return getStoredStaff();
    } catch {
      return [];
    }
  });
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [selectedAdminUser, setSelectedAdminUser] = useState<AdminUser | null>(null);

  // Active Administrator accounts created in the system
  const adminStaffList = useMemo(() => {
    return (staffList || []).filter(u => 
      u && 
      u.status !== 'suspended' && 
      u.status !== 'inactive' && 
      u.is_active !== false && 
      !u.deleted_at &&
      (u.role?.name?.toLowerCase().includes('admin') || u.role_id === 'role-admin')
    );
  }, [staffList]);

  // Check whether current flow is an administrator login
  const isCurrentAdmin = useMemo(() => {
    return Boolean(
      loginTargetRole === 'admin' ||
      selectedAdminUser ||
      adminStaffList.some(a => 
        identifier && (
          a.email?.toLowerCase() === identifier.toLowerCase().trim() ||
          a.username?.toLowerCase() === identifier.toLowerCase().trim()
        )
      )
    );
  }, [loginTargetRole, selectedAdminUser, adminStaffList, identifier]);

  // Automatically ensure rememberMe is disabled for administrators
  useEffect(() => {
    if (isCurrentAdmin) {
      setRememberMe(false);
    }
  }, [isCurrentAdmin]);

  // Set default selected administrator if in admin mode and none chosen yet
  useEffect(() => {
    if (loginTargetRole === 'admin' && !selectedAdminUser && adminStaffList.length > 0) {
      const defaultAdmin = adminStaffList[0];
      setSelectedAdminUser(defaultAdmin);
      setIdentifier(defaultAdmin.email || defaultAdmin.username || '');
      setPassword('');
      setRememberMe(false);
    }
  }, [adminStaffList, selectedAdminUser, loginTargetRole]);

  // Filtered administrators for modal search
  const filteredAdminStaffList = useMemo(() => {
    if (!adminSearchQuery.trim()) return adminStaffList;
    const q = adminSearchQuery.trim().toLowerCase();
    return adminStaffList.filter(a => 
      a.full_name?.toLowerCase().includes(q) ||
      a.username?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.branch?.name?.toLowerCase().includes(q)
    );
  }, [adminStaffList, adminSearchQuery]);

  // Register Account State
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRoleId, setRegRoleId] = useState('role-cashier');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regAdminPassword, setRegAdminPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [showRegAdminPassword, setShowRegAdminPassword] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<AdminRole[]>(() => {
    try {
      const stored = getStoredRoles();
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  });

  // Forgot Password / Reset State
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(0);

  // Password Recovery / Set New Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // UI State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live detected hardware
  const detected = useMemo(() => detectDevice(), []);

  // Fetch available roles for registration
  useEffect(() => {
    try {
      const roles = getStoredRoles();
      if (Array.isArray(roles) && roles.length > 0) {
        setAvailableRoles(roles);
      }
    } catch {}
  }, []);

  // Language toggle handler
  const toggleLanguage = () => {
    const newLang = i18n.language === 'ku' ? 'en' : 'ku';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'ku' ? 'rtl' : 'ltr';
  };

  // Sync staff & credentials from cloud on mount, and detect recovery URL
  useEffect(() => {
    const refreshStaff = () => {
      try {
        const fresh = getStoredStaff();
        setStaffList(fresh);
      } catch {}
    };

    // 1. Cross-device sync so mobile and iPad immediately have the same accounts
    syncStaffAndCredentialsFromCloud().then(synced => {
      if (synced) refreshStaff();
    }).catch(() => {});

    window.addEventListener('storage', refreshStaff);
    window.addEventListener('nali_staff_updated', refreshStaff);
    window.addEventListener('staff-updated', refreshStaff);

    // 2. Check if URL hash contains Supabase recovery access_token or ?type=recovery
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    if (hash.includes('type=recovery') || hash.includes('access_token=') || search.includes('type=recovery')) {
      setAuthView('recovery_new_password');
    }

    // 3. Listen to Supabase Auth state changes for recovery
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthView('recovery_new_password');
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
      window.removeEventListener('storage', refreshStaff);
      window.removeEventListener('nali_staff_updated', refreshStaff);
      window.removeEventListener('staff-updated', refreshStaff);
    };
  }, []);

  // Resend countdown timer
  useEffect(() => {
    if (resetCountdown <= 0) return;
    const timer = setInterval(() => {
      setResetCountdown(c => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resetCountdown]);

  // Handle selecting an administrator account from list or modal
  const handleSelectAdminAccount = (adminUser: AdminUser) => {
    setLoginTargetRole('admin');
    setSelectedAdminUser(adminUser);
    const idVal = adminUser.email || adminUser.username || 'admin@nalipos.com';
    setIdentifier(idVal);
    setPassword('');
    setRememberMe(false);
    setErrorMessage(null);
    setIsAdminModalOpen(false);
    toast.info(
      i18n.language === 'ku'
        ? `هەژماری "${adminUser.full_name}" هەڵبژێردرا. تکایە وشەی نهێنی یان PIN بنووسە.`
        : `Selected "${adminUser.full_name}". Enter your password or PIN to sign in.`
    );
    setTimeout(() => {
      const passInput = (document.getElementById('admin_sec_ephemeral_token') || document.getElementById('password') || document.getElementById('login-password')) as HTMLInputElement;
      passInput?.focus();
    }, 150);
  };

  // Quick Demo Login
  const handleQuickDemo = async (roleName: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await loginAsDemo(roleName);
      if (!res.success) {
        setErrorMessage(res.error || `Unable to log in as ${roleName}`);
      } else {
        const role = res.user?.role?.name || roleName;
        const devCategory = res.device?.deviceCategory || detected.deviceCategory;
        const devModel = res.device?.deviceName || detected.deviceName;
        toast.success(`Logged in as ${role} • ${devCategory} (${devModel})`, { duration: 4500 });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  // Secure Sign In Authentication with Identifier and Password/PIN
  const submitWithCredentials = async (targetId: string, targetPass: string) => {
    const cleanId = targetId.trim();
    const cleanPass = targetPass.trim();

    if (!cleanId) {
      setErrorMessage(t('login.enterIdentifier', 'Please enter your email or username.'));
      return;
    }
    if (!cleanPass) {
      setErrorMessage(t('login.enterPassword', 'Please enter your password or POS PIN.'));
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await loginWithCredentials(cleanId, cleanPass);
      if (!res.success) {
        setErrorMessage(res.error || t('login.failed', 'Invalid credentials. Please verify and try again.'));
        setPassword('');
      } else {
        const role = res.user?.role?.name || (res.user?.role_id === 'role-admin' ? 'Administrator' : res.user?.role_id === 'role-manager' ? 'Manager' : 'Cashier');
        const devCategory = res.device?.deviceCategory || detected.deviceCategory;
        const devModel = res.device?.deviceName || detected.deviceName;
        toast.success(
          i18n.language === 'ku'
            ? `بەخێربێیت ${res.user?.full_name || role}! بە سەرکەوتوویی چوویە ژوورەوە • ${devCategory}`
            : `Welcome ${res.user?.full_name || role}! Signed in successfully • ${devCategory} (${devModel})`,
          { duration: 4500 }
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || t('login.error', 'An error occurred during authentication.'));
    } finally {
      setLoading(false);
    }
  };

  // Handle Sign In Submit
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitWithCredentials(identifier, password);
  };

  // Touch Keypad Digit Entry
  const handlePinDigit = (digit: string) => {
    if (loading) return;
    if (password.length >= 8) return;
    const newPin = password + digit;
    setPassword(newPin);
    if (newPin.length === 4) {
      submitWithCredentials(identifier, newPin);
    }
  };

  // Clear PIN
  const handlePinClear = () => {
    setPassword('');
    setErrorMessage(null);
  };

  // Backspace PIN
  const handlePinBackspace = () => {
    setPassword(prev => prev.slice(0, -1));
  };

  // Handle Send Password Reset Email via Supabase Auth
  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = resetEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage(i18n.language === 'ku' ? 'تکایە ئیمەیڵەکەت بنووسە.' : 'Please enter your account email address.');
      return;
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage(i18n.language === 'ku' ? 'تکایە ئیمەیڵێکی دروست بنووسە.' : 'Please enter a valid email address.');
      return;
    }

    setResetLoading(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/?type=recovery`
      });

      if (error) {
        setErrorMessage(error.message || 'Unable to dispatch reset email. Please try again.');
      } else {
        setAuthView('reset_sent');
        setResetCountdown(60);
        toast.success(i18n.language === 'ku' ? 'بەستەری ڕێکخستنەوە بە سەرکەوتوویی نێردرا!' : 'Password reset link sent to your email!');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send password reset email.');
    } finally {
      setResetLoading(false);
    }
  };

  // Handle Set New Password after clicking email link
  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.trim().length < 6) {
      setErrorMessage(i18n.language === 'ku' ? 'وشەی تێپەڕ دەبێت لانیکەم ٦ پیت یان ژمارە بێت.' : 'Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage(i18n.language === 'ku' ? 'وشە تێپەڕەکان یەکسان نین.' : 'Passwords do not match. Please verify and try again.');
      return;
    }

    setUpdatingPassword(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword.trim()
      });

      if (error) {
        setErrorMessage(error.message || 'Failed to update password.');
      } else {
        const userEmail = data.user?.email || resetEmail;
        // Update local & cloud staff credentials so it works on all devices
        const staff = getStoredStaff();
        const matched = staff.find(u => 
          (u.email && u.email.toLowerCase() === userEmail?.toLowerCase()) ||
          u.id === data.user?.id
        );

        if (matched) {
          saveUserCredential(matched.id, newPassword.trim());
          if (matched.role?.name === 'Administrator' || matched.role_id === 'role-admin') {
            updateAdministratorPassword(newPassword.trim(), undefined, matched.id);
          }
        }

        // Clean URL recovery params
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch {}

        toast.success(i18n.language === 'ku' ? 'وشەی تێپەڕ بە سەرکەوتوویی گۆڕدرا! بەخێربێیتەوە.' : 'Password updated successfully! Welcome back.');
        
        // Log in with the new password
        if (userEmail) {
          await loginWithCredentials(userEmail, newPassword.trim());
        } else {
          setAuthView('sign_in');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving new password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Handle Register Staff Account (Admin Password Required)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanFullName = regFullName.trim();
    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanPass = regPassword.trim();
    const cleanAdminPass = regAdminPassword.trim();

    if (!cleanFullName) {
      setErrorMessage(i18n.language === 'ku' ? 'تکایە ناوی تەواو بنووسە.' : 'Please enter your full name.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage(i18n.language === 'ku' ? 'تکایە ناونیشانی ئیمەیڵێکی دروست بنووسە.' : 'Please enter a valid email address.');
      return;
    }
    if (!cleanPass || cleanPass.length < 6) {
      setErrorMessage(i18n.language === 'ku' ? 'وشەی نهێنی دەبێت لانیکەم ٦ پیت یان ژمارە بێت.' : 'Account password must be at least 6 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMessage(i18n.language === 'ku' ? 'وشە نهێنییەکان هاوتا نین.' : 'Passwords do not match. Please re-enter to confirm.');
      return;
    }
    if (!cleanAdminPass) {
      setErrorMessage(i18n.language === 'ku' 
        ? 'وشەی نهێنی بەڕێوەبەر پێویستە بۆ دروستکردنی هەر هەژمارێک.' 
        : 'Administrator password is required for creating any account.');
      return;
    }

    setLoading(true);
    try {
      // 1. Check Administrator Authorization (Critical Requirement)
      let isAdminAuthorized = false;
      const localCheck = validateAdministratorSecretPassword(cleanAdminPass);
      if (localCheck.success) {
        isAdminAuthorized = true;
      } else if (isSupabaseConfigured()) {
        const staff = getStoredStaff();
        const activeAdmins = (staff || []).filter(
          s => s.status === 'active' && !s.deleted_at && (s.role?.name === 'Administrator' || s.role_id === 'role-admin') && s.email
        );
        for (const admin of activeAdmins) {
          if (admin.email) {
            try {
              const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
                email: admin.email,
                password: cleanAdminPass
              });
              if (!authErr && authData.user) {
                isAdminAuthorized = true;
                break;
              }
            } catch {}
          }
        }
      }

      if (!isAdminAuthorized) {
        setErrorMessage(i18n.language === 'ku'
          ? 'وشەی نهێنی بەڕێوەبەر هەڵەیە! دروستکردنی هەژمار پێویستی بە پەسەندکردنی بەڕێوەبەر هەیە.'
          : 'Administrator authorization failed: Incorrect administrator password. Creating any account requires administrator approval.');
        setLoading(false);
        return;
      }

      // 2. Derive username if not explicitly set
      const derivedUsername = (regUsername.trim() || cleanFullName.toLowerCase().replace(/[^a-z0-9]/g, '.')).replace(/^\.+|\.+$/g, '') || 'staff';

      // 3. Register user account
      const res = await registerStaffAccount({
        full_name: cleanFullName,
        username: derivedUsername,
        email: cleanEmail,
        phone: regPhone.trim(),
        role_id: regRoleId || 'role-cashier',
        password: cleanPass,
        pin: regPin.trim() || Math.floor(1000 + Math.random() * 9000).toString()
      });

      if (!res.success) {
        setErrorMessage(res.error || (i18n.language === 'ku' ? 'تۆمارکردن سەرکەوتوو نەبوو.' : 'Registration failed.'));
        setLoading(false);
        return;
      }

      toast.success(
        i18n.language === 'ku'
          ? `هەژماری "${cleanFullName}" بە سەرکەوتوویی دروستکرا و ڕێگەی پێدرا!`
          : `Account for "${cleanFullName}" registered and authorized successfully!`
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-start items-center font-sans relative overflow-x-hidden login-safe-container"
      style={{
        paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 1.25rem), 3.75rem)',
        paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 2rem), 3.5rem)',
        paddingLeft: 'max(calc(env(safe-area-inset-left, 0px) + 1rem), 1rem)',
        paddingRight: 'max(calc(env(safe-area-inset-right, 0px) + 1rem), 1rem)',
      }}
    >
      {/* iOS Standalone Dynamic Island & Status Bar Frosted Guard */}
      <div 
        aria-hidden="true" 
        className="fixed top-0 inset-x-0 z-40 pointer-events-none bg-[#070b14]/85 backdrop-blur-xl border-b border-white/[0.04]"
        style={{
          height: 'max(env(safe-area-inset-top, 0px), 1.25rem)'
        }}
      />

      {/* Background Decorative Ambient Lighting */}
      <div className="fixed top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[20%] w-[500px] h-[500px] rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none" />

      {/* Top Header Bar with Store Brand & Language Selector */}
      <header className="w-full max-w-xl mx-auto flex items-center justify-between mb-6 sm:mb-8 z-10 transition-all">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-white p-1 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20 shrink-0 overflow-hidden">
            <img 
              src="/apple-touch-icon.png" 
              alt="Nali Mobile Logo" 
              className="w-full h-full object-contain rounded-xl"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2 truncate">
              NALI <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-cyan-300">POS & MOBILE</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">
              {i18n.language === 'ku' ? 'سیستەمی پێشکەوتووی بەڕێوەبردنی مۆبایل و POS' : 'Professional POS, Inventory & Device Management'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-all text-xs font-semibold shadow-sm shrink-0 active:scale-95"
          title="Switch Language (English / کوردی)"
        >
          <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>{i18n.language === 'ku' ? 'کوردی' : 'English'}</span>
        </button>
      </header>

      {/* Main Form Container */}
      <main className="w-full max-w-xl mx-auto z-10">
        {/* Global Error Banner */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-5 bg-rose-500/15 border border-rose-500/30 text-rose-300 p-3.5 rounded-2xl flex items-start gap-3 shadow-lg shadow-rose-950/40"
            >
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs sm:text-sm font-medium leading-relaxed">
                {errorMessage}
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-400/80 hover:text-rose-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Card Body */}
        <div className="bg-[#111728]/95 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-5 sm:p-8 shadow-2xl shadow-black/60 relative">
          {/* Top Live Sync Ribbon */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-5 border-b border-slate-800/60 text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-400 font-medium">
                {t('login.posSystemLive', 'Terminal Ready • Administration Sync Active')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-[11px] font-medium font-mono">
                {detected.deviceCategory === 'Mobile Phone' ? (
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : detected.deviceCategory === 'Tablet' ? (
                  <Tablet className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                ) : (
                  <Laptop className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                )}
                <span className="truncate max-w-[170px] sm:max-w-none">{detected.deviceCategory} ({detected.deviceName})</span>
              </div>
            </div>
          </div>

          {/* ================= TOP TABS: SIGN IN / REGISTER ================= */}
          {(authView === 'sign_in' || authView === 'register') && (
            <div className="flex rounded-xl bg-[#090d18] p-1 border border-slate-800/80 mb-5">
              <button
                type="button"
                id="tab-sign-in"
                onClick={() => {
                  setErrorMessage(null);
                  setAuthView('sign_in');
                }}
                className={cn(
                  "flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer",
                  authView === 'sign_in'
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{i18n.language === 'ku' ? 'چوونەژوورەوە' : 'Sign In'}</span>
              </button>
              <button
                type="button"
                id="tab-register"
                onClick={() => {
                  setErrorMessage(null);
                  setAuthView('register');
                }}
                className={cn(
                  "flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer",
                  authView === 'register'
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{i18n.language === 'ku' ? 'تۆمارکردنی هەژمار' : 'Register Account'}</span>
              </button>
            </div>
          )}

          {/* ================= MODE 1: SIGN IN ================= */}
          {authView === 'sign_in' && (
            <form onSubmit={handleSignIn} className="space-y-4" autoComplete={isCurrentAdmin ? "off" : "on"}>
              {/* Invisible decoy inputs to capture aggressive browser password managers */}
              {isCurrentAdmin && (
                <div className="sr-only" aria-hidden="true">
                  <input type="text" name="fake_admin_user_decoy" tabIndex={-1} autoComplete="off" />
                  <input type="password" name="fake_admin_pass_decoy" tabIndex={-1} autoComplete="off" />
                </div>
              )}

              {/* Role Selector: Administrator vs Cashier */}
              <div className="flex rounded-xl bg-[#090d18] p-1 border border-slate-800/80 mb-3">
                <button
                  type="button"
                  id="role-tab-admin"
                  onClick={() => {
                    setLoginTargetRole('admin');
                    if (adminStaffList.length > 0) {
                      const adm = selectedAdminUser || adminStaffList[0];
                      setSelectedAdminUser(adm);
                      setIdentifier(adm.email || adm.username || '');
                    }
                    setPassword('');
                    setRememberMe(false);
                    setErrorMessage(null);
                  }}
                  className={cn(
                    "flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer",
                    loginTargetRole === 'admin'
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>{i18n.language === 'ku' ? 'بەڕێوەبەر (پارێزراو)' : 'Administrator (Protected)'}</span>
                </button>
                <button
                  type="button"
                  id="role-tab-cashier"
                  onClick={() => {
                    setLoginTargetRole('cashier');
                    setSelectedAdminUser(null);
                    setIdentifier('');
                    setPassword('');
                    setRememberMe(true);
                    setErrorMessage(null);
                  }}
                  className={cn(
                    "flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer",
                    loginTargetRole === 'cashier'
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>{i18n.language === 'ku' ? 'کاشێر / کارمەند' : 'Cashier / Staff'}</span>
                </button>
              </div>

              {/* Administrator Accounts & Fast Access Card */}
              {isCurrentAdmin ? (
                <div className="p-3.5 rounded-2xl bg-[#090e1f] border border-indigo-500/40 shadow-xl shadow-indigo-950/40 relative overflow-hidden">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2 font-bold text-xs text-indigo-300">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>{i18n.language === 'ku' ? 'هەژماری بەڕێوەبەری POS' : 'Administrator Account'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAdminModalOpen(true)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 font-semibold border border-indigo-500/40 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-indigo-300" />
                      <span>
                        {i18n.language === 'ku' 
                          ? `هەڵبژاردنی بەڕێوەبەر (${adminStaffList.length})` 
                          : `Switch Admin (${adminStaffList.length})`}
                      </span>
                    </button>
                  </div>

                  {/* Selected Administrator Display Card */}
                  {selectedAdminUser ? (
                    <div className="p-3 rounded-xl bg-black/60 border border-indigo-500/30 mb-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-cyan-500 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-md shadow-indigo-900/40 ring-1 ring-white/10">
                            {selectedAdminUser.full_name?.substring(0, 2).toUpperCase() || 'AD'}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                              <span>{selectedAdminUser.full_name}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold flex items-center gap-1">
                                <ShieldCheck className="w-2.5 h-2.5 text-indigo-400" />
                                <span>Admin</span>
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-slate-300">{selectedAdminUser.email || selectedAdminUser.username}</span>
                              {selectedAdminUser.branch?.name && (
                                <>
                                  <span className="text-slate-600">•</span>
                                  <span className="text-slate-400">{selectedAdminUser.branch.name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsAdminModalOpen(true)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium border border-slate-700 transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                        >
                          <span>{i18n.language === 'ku' ? 'گۆڕین' : 'Change'}</span>
                          <ChevronRight className="w-3 h-3 text-slate-400" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-black/40 border border-slate-800 text-slate-400 text-xs mb-2.5 flex items-center justify-between">
                      <span>{i18n.language === 'ku' ? 'تکایە بەڕێوەبەرێک هەڵبژێرە:' : 'Select an administrator profile to log in:'}</span>
                      <button
                        type="button"
                        onClick={() => setIsAdminModalOpen(true)}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold underline"
                      >
                        {i18n.language === 'ku' ? 'هەڵبژاردن' : 'Browse'}
                      </button>
                    </div>
                  )}

                  {/* Quick-switch chips for multiple admins if > 1 */}
                  {adminStaffList.length > 1 && (
                    <div className="mb-2.5">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5 flex items-center justify-between">
                        <span>{i18n.language === 'ku' ? 'هەژمارە چالاکەکانی بەڕێوەبەر:' : 'Registered Administrators:'}</span>
                        <span className="text-[10px] text-slate-500 font-normal">Click to switch</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {adminStaffList.map(adm => {
                          const isSelected = selectedAdminUser?.id === adm.id;
                          return (
                            <button
                              key={adm.id}
                              type="button"
                              onClick={() => handleSelectAdminAccount(adm)}
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer border",
                                isSelected 
                                  ? "bg-indigo-600 text-white border-indigo-400 shadow-sm" 
                                  : "bg-slate-900/80 text-slate-300 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800"
                              )}
                            >
                              <span className={cn("w-2 h-2 rounded-full", isSelected ? "bg-white" : "bg-indigo-400")} />
                              <span className="truncate max-w-[130px]">{adm.full_name}</span>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Security Guarantee Banner: Strictly Zero Password Saving */}
                  <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-300">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="leading-snug">
                      <span className="font-bold block text-amber-200">
                        {i18n.language === 'ku' ? 'ئاسایشی نهێنی بەڕێوەبەر چالاکە' : 'Admin Security: Zero Password Saving'}
                      </span>
                      <span className="text-[11px] text-amber-300/80">
                        {i18n.language === 'ku' 
                          ? 'وشەی نهێنی و ئیمەیڵی بەڕێوەبەر لەسەر هیچ مۆبایل، تابلێت، یان کۆمپیوتەرێک پاشەکەوت ناکرێت.'
                          : 'Administrator email & password will never be saved, cached, or autofilled on any mobile, tablet, or PC.'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-xs text-emerald-300 font-semibold">
                    <ShoppingCart className="w-4 h-4 text-emerald-400" />
                    <span>{i18n.language === 'ku' ? 'چوونەژوورەوەی کاشێر و فڕۆشتن' : 'Cashier Terminal Login'}</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/20">
                    POS Terminal
                  </span>
                </div>
              )}

              {/* Identifier Input */}
              <div>
                <label 
                  htmlFor={isCurrentAdmin ? "admin_terminal_account" : "identifier"} 
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
                >
                  {t('login.emailOrUsername', 'Email Address or Username')}
                </label>
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  {isCurrentAdmin ? (
                    <input
                      id="admin_terminal_account"
                      name="admin_terminal_account"
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="admin@nalipos.com or username"
                      autoComplete="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck="false"
                      className="w-full h-11 bg-[#0a0f1d] border border-slate-700/70 rounded-xl ps-10 pe-10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
                    />
                  ) : (
                    <input
                      id="identifier"
                      name="identifier"
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="cashier@nalipos.com or username"
                      autoComplete="username"
                      className="w-full h-11 bg-[#0a0f1d] border border-slate-700/70 rounded-xl ps-10 pe-10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors shadow-inner"
                    />
                  )}
                  {identifier && (
                    <div className="absolute inset-y-0 end-0 pe-2.5 flex items-center">
                      <button
                        type="button"
                        onClick={() => setIdentifier('')}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors flex items-center justify-center"
                        title="Clear"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Password or PIN Auth with Dual Input Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label 
                    htmlFor={isCurrentAdmin ? "admin_sec_ephemeral_token" : "password"} 
                    className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
                  >
                    {inputMode === 'pin' 
                      ? (i18n.language === 'ku' ? 'پینی ٤ ژمارەیی POS' : 'POS 4-Digit PIN')
                      : t('login.passwordOrPin', 'Password or PIN')}
                  </label>

                  {/* Mode Selector Toggle */}
                  <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setInputMode('password')}
                      className={cn(
                        "px-2 py-0.5 rounded text-[11px] font-medium transition-all flex items-center gap-1",
                        inputMode === 'password'
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      )}
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>{i18n.language === 'ku' ? 'وشەی نهێنی' : 'Password'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode('pin')}
                      className={cn(
                        "px-2 py-0.5 rounded text-[11px] font-medium transition-all flex items-center gap-1",
                        inputMode === 'pin'
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      )}
                    >
                      <Hash className="w-3 h-3" />
                      <span>{i18n.language === 'ku' ? 'تەختەی PIN' : 'PIN Keypad'}</span>
                    </button>
                  </div>
                </div>

                {/* Password Mode Input */}
                {inputMode === 'password' && (
                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    {isCurrentAdmin ? (
                      <input
                        id="admin_sec_ephemeral_token"
                        name="admin_sec_ephemeral_token"
                        type="text"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={i18n.language === 'ku' ? 'وشەی نهێنی یان پینی بەڕێوەبەر...' : 'Enter administrator password or PIN...'}
                        autoComplete="one-time-code"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-bwignore="true"
                        data-form-type="other"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck="false"
                        className={cn(
                          "w-full h-11 bg-[#0a0f1d] border border-slate-700/70 rounded-xl ps-10 pe-20 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors shadow-inner font-sans",
                          !showPassword && "admin-masked-input"
                        )}
                      />
                    ) : (
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={i18n.language === 'ku' ? 'وشەی نهێنی یان پینی ٤ ژمارەیی بنووسە...' : 'Enter password or 4-digit PIN...'}
                        autoComplete="current-password"
                        className="w-full h-11 bg-[#0a0f1d] border border-slate-700/70 rounded-xl ps-10 pe-20 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors shadow-inner font-sans"
                      />
                    )}
                    <div className="absolute inset-y-0 end-0 pe-2.5 flex items-center gap-1">
                      {(password?.length || 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => setPassword('')}
                          className="w-7 h-7 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors flex items-center justify-center"
                          title="Clear password"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="w-7 h-7 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors flex items-center justify-center"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* PIN Keypad Mode UI */}
                {inputMode === 'pin' && (
                  <div className="p-3.5 rounded-2xl bg-[#0a0f1d] border border-slate-800">
                    {/* Visual PIN indicator dots */}
                    <div className="flex items-center justify-center gap-3 py-2 mb-3">
                      {[0, 1, 2, 3].map((idx) => {
                        const isFilled = password.length > idx;
                        return (
                          <div
                            key={idx}
                            className={cn(
                              "w-4 h-4 rounded-full transition-all duration-200",
                              isFilled
                                ? "bg-indigo-400 ring-4 ring-indigo-500/20 scale-110"
                                : "border-2 border-slate-600 bg-slate-800/80"
                            )}
                          />
                        );
                      })}
                    </div>

                    {/* Numeric Touch Keypad */}
                    <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                        <button
                          key={digit}
                          type="button"
                          onClick={() => handlePinDigit(digit)}
                          disabled={loading}
                          className="h-11 rounded-xl bg-slate-900/90 hover:bg-indigo-950/60 active:scale-95 border border-slate-800 hover:border-indigo-500/50 text-white font-bold text-base transition-all flex items-center justify-center cursor-pointer shadow-sm disabled:opacity-50"
                        >
                          {digit}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={handlePinClear}
                        disabled={loading || password.length === 0}
                        className="h-11 rounded-xl bg-rose-950/30 hover:bg-rose-900/40 active:scale-95 border border-rose-900/40 text-rose-300 font-bold text-xs transition-all flex items-center justify-center cursor-pointer disabled:opacity-30"
                      >
                        {i18n.language === 'ku' ? 'سڕینەوە' : 'Clear'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePinDigit('0')}
                        disabled={loading}
                        className="h-11 rounded-xl bg-slate-900/90 hover:bg-indigo-950/60 active:scale-95 border border-slate-800 hover:border-indigo-500/50 text-white font-bold text-base transition-all flex items-center justify-center cursor-pointer shadow-sm disabled:opacity-50"
                      >
                        0
                      </button>
                      <button
                        type="button"
                        onClick={handlePinBackspace}
                        disabled={loading || password.length === 0}
                        className="h-11 rounded-xl bg-slate-900/90 hover:bg-slate-800 active:scale-95 border border-slate-800 text-slate-300 transition-all flex items-center justify-center cursor-pointer disabled:opacity-30"
                        title="Backspace"
                      >
                        <Delete className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-center text-[11px] text-slate-500 mt-2.5">
                      {i18n.language === 'ku'
                        ? 'تەختەکلیلەکە بۆ ئامێرەکانی دەستی و تاچ ئاسانکراوە'
                        : 'Instant auto-submit on 4th digit'}
                    </div>
                  </div>
                )}
              </div>

              {/* Remember Credentials Section */}
              <div className="flex items-center justify-between pt-1">
                {isCurrentAdmin ? (
                  <div className="flex items-center gap-2 py-1 select-none text-xs text-amber-400/90 bg-amber-950/20 px-3 py-1.5 rounded-xl border border-amber-500/20">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      {i18n.language === 'ku'
                        ? 'ئاسایشی بەڕێوەبەر: پاشەکەوتکردنی ئیمەیڵ و وشەی نهێنی ناچالاک کراوە لەسەر ئەم ئامێرە.'
                        : 'Admin Security: Password & credentials will never be saved on this device.'}
                    </span>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500"
                    />
                    <span>{t('login.rememberTerminal', 'Remember terminal session')}</span>
                  </label>
                )}

                <button
                  type="button"
                  id="btn-forgot-password-link"
                  onClick={() => {
                    setErrorMessage(null);
                    setResetEmail(identifier.includes('@') ? identifier.trim() : '');
                    setAuthView('forgot_password');
                  }}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:underline transition-colors focus:outline-none"
                >
                  {i18n.language === 'ku' ? 'وشەی تێپەڕت بیرچووە؟' : 'Forgot Password?'}
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="btn-submit-signin"
                disabled={loading}
                className={cn(
                  "w-full mt-2 py-3 px-4 rounded-xl text-white font-semibold text-sm shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer",
                  isCurrentAdmin
                    ? "bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 shadow-indigo-600/30 hover:shadow-indigo-600/50"
                    : "bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30 hover:shadow-emerald-600/50"
                )}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    <span>
                      {isCurrentAdmin
                        ? (selectedAdminUser 
                            ? (i18n.language === 'ku' ? `چوونەژوورەوە وەک ${selectedAdminUser.full_name}` : `Sign In as ${selectedAdminUser.full_name}`)
                            : (i18n.language === 'ku' ? 'چوونەژوورەوەی بەڕێوەبەر' : 'Sign In as Administrator'))
                        : (i18n.language === 'ku' ? 'چوونەژوورەوەی کاشێر' : 'Sign In to POS Cashier')}
                    </span>
                    <ArrowRight className="w-4 h-4 ms-1" />
                  </>
                )}
              </button>

              {/* Register Staff Account Link / Button */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-400">
                  {i18n.language === 'ku' ? 'هەژماری نوێت دەوێت؟' : 'Need a new account?'}
                </span>
                <button
                  type="button"
                  id="btn-switch-to-register"
                  onClick={() => {
                    setErrorMessage(null);
                    setAuthView('register');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 font-semibold border border-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{i18n.language === 'ku' ? 'تۆمارکردنی هەژمار' : 'Register Account'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ================= MODE 5: REGISTER ACCOUNT (ADMIN PASSWORD REQUIRED) ================= */}
          {authView === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Header & Security Badge */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-transparent border border-amber-500/40 text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-300 mb-1">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{i18n.language === 'ku' ? 'ڕێگەپێدانی بەڕێوەبەر مەرجە' : 'Administrator Authorization Required'}</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {i18n.language === 'ku'
                    ? 'بۆ پاراستنی سیستەم و فرۆشگا، دروستکردنی هەر هەژمارێک پێویستی بە وشەی نهێنی بەڕێوەبەرە.'
                    : 'To protect system integrity, creating any account requires authorization with the master Administrator password.'}
                </p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  {i18n.language === 'ku' ? 'ناوی تەواو' : 'Full Name'} *
                </label>
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="e.g. Ahmad Salih"
                    className="w-full h-11 bg-[#0a0f1d] border border-slate-700/70 rounded-xl ps-10 pe-10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
                  />
                  {regFullName && (
                    <div className="absolute inset-y-0 end-0 pe-2.5 flex items-center">
                      <button
                        type="button"
                        onClick={() => setRegFullName('')}
                        className="w-7 h-7 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                        title="Clear"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Email & Username Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    {i18n.language === 'ku' ? 'ئیمەیڵ' : 'Email Address'} *
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="ahmad@nalipos.com"
                      className="w-full h-11 bg-[#0a0f1d] border border-slate-700/70 rounded-xl ps-10 pe-10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
                    />
                    {regEmail && (
                      <div className="absolute inset-y-0 end-0 pe-2.5 flex items-center">
                        <button
                          type="button"
                          onClick={() => setRegEmail('')}
                          className="w-7 h-7 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
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
                    {i18n.language === 'ku' ? 'ناوی بەکارهێنەر (ئارەزوومەندانە)' : 'Username (Optional)'}
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                      <AtSign className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="e.g. ahmad.pos"
                      className="w-full h-11 bg-[#0a0f1d] border border-slate-700/70 rounded-xl ps-10 pe-10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
                    />
                    {regUsername && (
                      <div className="absolute inset-y-0 end-0 pe-2.5 flex items-center">
                        <button
                          type="button"
                          onClick={() => setRegUsername('')}
                          className="w-7 h-7 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                          title="Clear"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Role & PIN Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    {i18n.language === 'ku' ? 'ڕۆڵ لە سیستەم' : 'Assigned Role'} *
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <select
                      value={regRoleId}
                      onChange={(e) => setRegRoleId(e.target.value)}
                      className="w-full h-11 bg-[#0a0f1d] border border-slate-700/70 rounded-xl ps-10 pe-9 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors shadow-inner appearance-none cursor-pointer"
                    >
                      {((availableRoles?.length || 0) > 0 ? availableRoles : [
                        { id: 'role-cashier', name: 'Cashier' },
                        { id: 'role-manager', name: 'Manager' },
                        { id: 'role-technician', name: 'Technician' },
                        { id: 'role-admin', name: 'Administrator' }
                      ]).map((r) => (
                        <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute inset-y-0 end-3 my-auto pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    {i18n.language === 'ku' ? 'پینی ٤ ژمارەیی POS' : 'POS 4-Digit PIN'}
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      value={regPin}
                      onChange={(e) => setRegPin(e.target.value)}
                      placeholder="e.g. 5821"
                      className="w-full h-11 bg-[#0a0f1d] border border-slate-700/70 rounded-xl ps-10 pe-10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors shadow-inner font-mono tracking-widest"
                    />
                  </div>
                </div>
              </div>

              {/* New Account Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    {i18n.language === 'ku' ? 'وشەی نهێنی هەژمار' : 'Account Password'} *
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showRegPassword ? "text" : "password"}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-form-type="other"
                      className="w-full h-11 bg-[#0a0f1d] border border-slate-700/70 rounded-xl ps-10 pe-20 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
                    />
                    <div className="absolute inset-y-0 end-0 pe-2.5 flex items-center gap-1">
                      {regPassword && (
                        <button
                          type="button"
                          onClick={() => setRegPassword('')}
                          className="w-7 h-7 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                          title="Clear"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="w-7 h-7 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                      >
                        {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    {i18n.language === 'ku' ? 'دووپاتکردنەوەی وشەی نهێنی' : 'Confirm Password'} *
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showRegConfirmPassword ? "text" : "password"}
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-form-type="other"
                      className="w-full h-11 bg-[#0a0f1d] border border-slate-700/70 rounded-xl ps-10 pe-20 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
                    />
                    <div className="absolute inset-y-0 end-0 pe-2.5 flex items-center gap-1">
                      {regConfirmPassword && (
                        <button
                          type="button"
                          onClick={() => setRegConfirmPassword('')}
                          className="w-7 h-7 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                          title="Clear"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                        className="w-7 h-7 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                      >
                        {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* REQUIRED: Administrator Authorization Password Box */}
              <div className="pt-2">
                <div className="p-3.5 rounded-2xl bg-[#090d18] border border-amber-500/40 shadow-lg shadow-amber-950/20">
                  <div className="flex items-center justify-between mb-1.5">
                    <label 
                      htmlFor="reg-admin-password" 
                      className="block text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      <span>{i18n.language === 'ku' ? 'وشەی نهێنی بەڕێوەبەر (مەرجە)' : 'Administrator Password (Required)'} *</span>
                    </label>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300/80 font-medium border border-amber-500/20 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-400" />
                      <span>{i18n.language === 'ku' ? 'ڕێگەپێدانی ئاسایش' : 'Security Clearance'}</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2">
                    {i18n.language === 'ku'
                      ? 'وشەی نهێنی بەڕێوەبەر بنووسە بۆ پەسەندکردنی دروستکردنی ئەم هەژمارە.'
                      : 'Enter the administrator authorization password to approve and create this staff account.'}
                  </p>
                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-amber-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-admin-password"
                      name="admin_secret_auth_token"
                      type={showRegAdminPassword ? "text" : "password"}
                      required
                      value={regAdminPassword}
                      onChange={(e) => setRegAdminPassword(e.target.value)}
                      placeholder={i18n.language === 'ku' ? 'وشەی نهێنی بەڕێوەبەر بنووسە...' : 'Enter administrator password...'}
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-form-type="other"
                      className="w-full h-11 bg-[#060913] border border-amber-500/60 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 rounded-xl ps-10 pe-20 text-sm text-white placeholder:text-slate-500 focus:outline-none transition-all font-sans"
                    />
                    <div className="absolute inset-y-0 end-0 pe-2.5 flex items-center gap-1">
                      {regAdminPassword && (
                        <button
                          type="button"
                          onClick={() => setRegAdminPassword('')}
                          className="w-7 h-7 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                          title="Clear"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowRegAdminPassword(!showRegAdminPassword)}
                        className="w-7 h-7 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                        title={showRegAdminPassword ? "Hide password" : "Show password"}
                      >
                        {showRegAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cloud Multi-Device Sync Notice */}
                <div className="mt-2.5 p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-start gap-2.5">
                  <BadgeCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-semibold text-cyan-300">
                      {i18n.language === 'ku' ? 'هاوکاتکردن لەگەڵ هەوری Supabase چالاکە' : 'Supabase Cloud Multi-Device Sync Active'}
                    </div>
                    <div className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                      {i18n.language === 'ku'
                        ? 'کاتێک ئەم هەژمارە دروست دەکەیت، ڕاستەوخۆ لە هەوری Supabase تۆمار دەکرێت بۆ ئەوەی هەموو ئامێرەکانی تر (کۆمپیوتەر، لاپتۆپ، مۆبایل، تابلێت) بتوانن دەستبەجێ بە هەمان ئیمەیڵ و وشەی نهێنی بچنە ژوورەوە.'
                        : 'Accounts registered here are saved directly to Supabase Cloud so all other devices (PCs, laptops, tablets, and phones) can immediately log in using the exact same email and password.'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="btn-submit-register"
                disabled={loading}
                className="w-full mt-3 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>{i18n.language === 'ku' ? 'پەسەندکردن و دروستکردنی هەژمار' : 'Authorize & Register Account'}</span>
                  </>
                )}
              </button>

              {/* Return to sign in button */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setAuthView('sign_in');
                  }}
                  className="text-xs font-semibold text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{i18n.language === 'ku' ? 'هەژمارت هەیە؟ چوونەژوورەوە' : 'Already have an account? Sign In'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ================= MODE 2: FORGOT PASSWORD ================= */}
          {authView === 'forgot_password' && (
            <form onSubmit={handleSendResetEmail} className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setAuthView('sign_in');
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{i18n.language === 'ku' ? 'گەڕانەوە بۆ چوونەژوورەوە' : 'Back to Sign In'}</span>
                </button>

                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Supabase Auth
                </span>
              </div>

              <div className="text-center pt-2 pb-1">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-950/50">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {i18n.language === 'ku' ? 'دووبارە ڕێکخستنەوەی وشەی تێپەڕ' : 'Reset Your Password'}
                </h2>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  {i18n.language === 'ku' 
                    ? 'ئیمەیڵی تۆمارکراوت بنووسە. بەستەرێکی پارێزراوت بۆ دەنێرین لە ڕێگەی Supabase Auth بۆ گۆڕینی وشەی تێپەڕ.'
                    : 'Enter your registered email address. Supabase Auth will dispatch a secure password reset link to your inbox.'}
                </p>
              </div>

              <div>
                <label 
                  htmlFor="reset-email" 
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
                >
                  {i18n.language === 'ku' ? 'ناونیشانی ئیمەیڵ' : 'Account Email Address'}
                </label>
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    autoFocus
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="e.g. rebwarkhdir@gmail.com"
                    autoComplete="email"
                    className="w-full h-11 bg-[#0a0f1d] border border-slate-700/70 rounded-xl ps-10 pe-10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
                  />
                  {resetEmail && (
                    <div className="absolute inset-y-0 end-0 pe-2.5 flex items-center">
                      <button
                        type="button"
                        onClick={() => setResetEmail('')}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors flex items-center justify-center"
                        title="Clear"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                id="btn-send-reset-link"
                disabled={resetLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {resetLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{i18n.language === 'ku' ? 'ناردنی بەستەری ڕێکخستنەوە' : 'Send Password Reset Link'}</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setAuthView('sign_in');
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {i18n.language === 'ku' ? 'وشەی تێپەڕت بیرکەوتەوە؟ گەڕانەوە' : 'Remembered your password? Back to Sign In'}
                </button>
              </div>
            </form>
          )}

          {/* ================= MODE 3: RESET SENT CONFIRMATION ================= */}
          {authView === 'reset_sent' && (
            <div className="space-y-4 text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/50">
                <MailCheck className="w-7 h-7" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {i18n.language === 'ku' ? 'ئیمەیڵی ڕێکخستنەوە نێردرا!' : 'Check Your Email'}
                </h2>
                <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto leading-relaxed">
                  {i18n.language === 'ku'
                    ? 'بەستەری ڕێکخستنەوەی پارێزراو لە ڕێگەی Supabase Auth نێردرا بۆ:'
                    : 'A secure recovery link has been dispatched via Supabase Auth to:'}
                </p>
                <div className="mt-2 inline-block px-3 py-1.5 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-semibold">
                  {resetEmail}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 text-xs text-start space-y-1.5">
                <div className="flex items-center gap-2 text-slate-300 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{i18n.language === 'ku' ? 'ڕێنمایی گەیشتن بە هەژمار:' : 'Next Steps:'}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  {i18n.language === 'ku'
                    ? '١. ئیمەیڵەکەت بکەرەوە و کلیک لەسەر بەستەرەکە بکە بۆ دانانی وشەی تێپەڕی نوێ.'
                    : '1. Open the email and click the recovery link to choose your new password.'}
                </p>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  {i18n.language === 'ku'
                    ? '٢. ئەگەر لە ١-٢ خولەکدا نەگەیشت، تکایە بوخچەی سپام (Spam / Junk) پشکێنە.'
                    : '2. If not visible within 1-2 minutes, please inspect your Spam or Junk folder.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  id="btn-resend-reset-email"
                  disabled={resetCountdown > 0 || resetLoading}
                  onClick={handleSendResetEmail}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", resetLoading && "animate-spin")} />
                  <span>
                    {resetCountdown > 0 
                      ? (i18n.language === 'ku' ? `دووبارە ناردنەوە پاش (${resetCountdown} چرکە)` : `Resend in ${resetCountdown}s`)
                      : (i18n.language === 'ku' ? 'دووبارە ناردنەوە' : 'Resend Recovery Email')}
                  </span>
                </button>

                <button
                  type="button"
                  id="btn-back-to-signin-sent"
                  onClick={() => {
                    setErrorMessage(null);
                    setAuthView('sign_in');
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{i18n.language === 'ku' ? 'گەڕانەوە بۆ چوونەژوورەوە' : 'Back to Sign In'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= MODE 4: RECOVERY / SET NEW PASSWORD ================= */}
          {authView === 'recovery_new_password' && (
            <form onSubmit={handleSetNewPassword} className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-white">
                    {i18n.language === 'ku' ? 'پاراستنی هەژمار و گۆڕینی تێپەڕوشە' : 'Secure Account Recovery'}
                  </span>
                </div>

                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Verified Session
                </span>
              </div>

              <div className="text-center pt-1 pb-1">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {i18n.language === 'ku' ? 'دانانی وشەی تێپەڕی نوێ' : 'Create New Password'}
                </h2>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  {i18n.language === 'ku' 
                    ? 'وشەی تێپەڕی نوێ بنووسە. ئەم وشە تێپەڕە ڕاستەوخۆ لەگەڵ کۆمپیوتەر، ئایپاد، و مۆبایل هاوکات دەکرێت.'
                    : 'Choose a new password. It will immediately synchronize across your PC, iPad, and mobile devices.'}
                </p>
              </div>

              {/* New Password Input */}
              <div>
                <label 
                  htmlFor="new-password" 
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
                >
                  {i18n.language === 'ku' ? 'وشەی تێپەڕی نوێ' : 'New Password'}
                </label>
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    required
                    autoFocus
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    className="w-full h-11 bg-[#0a0f1d] border border-slate-700/70 rounded-xl ps-10 pe-20 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
                  />
                  <div className="absolute inset-y-0 end-0 pe-2.5 flex items-center gap-1">
                    {newPassword && (
                      <button
                        type="button"
                        onClick={() => setNewPassword('')}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors flex items-center justify-center"
                        title="Clear"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors flex items-center justify-center"
                      title={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Confirm New Password Input */}
              <div>
                <label 
                  htmlFor="confirm-new-password" 
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
                >
                  {i18n.language === 'ku' ? 'دووپاتکردنەوەی وشەی تێپەڕی نوێ' : 'Confirm New Password'}
                </label>
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="confirm-new-password"
                    type={showConfirmNewPassword ? "text" : "password"}
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    autoComplete="new-password"
                    className="w-full h-11 bg-[#0a0f1d] border border-slate-700/70 rounded-xl ps-10 pe-20 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
                  />
                  <div className="absolute inset-y-0 end-0 pe-2.5 flex items-center gap-1">
                    {confirmNewPassword && (
                      <button
                        type="button"
                        onClick={() => setConfirmNewPassword('')}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors flex items-center justify-center"
                        title="Clear"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors flex items-center justify-center"
                      title={showConfirmNewPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Match Status */}
              {newPassword && confirmNewPassword && (
                <div className="text-[11px] flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800">
                  {newPassword === confirmNewPassword ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      {i18n.language === 'ku' ? 'وشە تێپەڕەکان یەکسانن' : 'Passwords match'}
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1">
                      <X className="w-3.5 h-3.5" />
                      {i18n.language === 'ku' ? 'وشە تێپەڕەکان یەکسان نین' : 'Passwords do not match yet'}
                    </span>
                  )}
                </div>
              )}

              {/* Save Button */}
              <button
                type="submit"
                id="btn-update-password"
                disabled={updatingPassword}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 hover:from-emerald-500 hover:to-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {updatingPassword ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>{i18n.language === 'ku' ? 'تۆمارکردنی وشەی تێپەڕ و چوونەژوورەوە' : 'Save Password & Sign In'}</span>
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setAuthView('sign_in');
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {i18n.language === 'ku' ? 'هەڵوەشاندنەوە و گەڕانەوە' : 'Cancel and Return to Sign In'}
                </button>
              </div>
            </form>
          )}

            {/* Quick Demo Staff Logins */}
            {authView === 'sign_in' && (
              <div className="mt-6 pt-5 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Terminal Staff Access
                  </span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-indigo-400" />
                    Admin Protected
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    id="btn-quick-admin"
                    onClick={() => {
                      setLoginTargetRole('admin');
                      setIsAdminModalOpen(true);
                    }}
                    className="p-3 rounded-xl bg-slate-900/90 hover:bg-indigo-950/60 border border-indigo-500/30 hover:border-indigo-400/50 text-indigo-200 text-xs font-semibold flex items-center justify-between transition-all group shadow-sm hover:scale-[1.01] active:scale-[0.99] text-start cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                        <Shield className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      </div>
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>Administrator</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                            {adminStaffList.length > 1 ? `${adminStaffList.length} Accounts` : 'Protected'}
                          </span>
                        </div>
                        <div className="text-[10px] text-indigo-300/70">
                          {i18n.language === 'ku' ? 'هەڵبژاردنی هەژماری بەڕێوەبەر' : 'Select Administrator Account'}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    type="button"
                    id="btn-quick-cashier"
                    onClick={() => handleQuickDemo('Cashier')}
                    disabled={loading}
                    className="p-3 rounded-xl bg-slate-900/90 hover:bg-emerald-950/60 border border-emerald-500/30 hover:border-emerald-400/50 text-emerald-200 text-xs font-semibold flex items-center justify-between transition-all disabled:opacity-50 group shadow-sm hover:scale-[1.01] active:scale-[0.99] text-start"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <ShoppingCart className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      </div>
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>Cashier POS</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                            Fast Sign-In
                          </span>
                        </div>
                        <div className="text-[10px] text-emerald-300/70">Sales & Invoice Terminal</div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            )}
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center text-xs text-slate-500 font-medium">
          NALI MOBILE OS v2.6 • Multi-Terminal Cloud Synchronization & Local Fallback
        </div>
      </main>

      {/* ================= ADMINISTRATOR ACCOUNTS SELECTION MODAL ================= */}
      <AnimatePresence>
        {isAdminModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-[#0f1523] border border-indigo-500/40 rounded-3xl shadow-2xl shadow-black/90 overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-800 bg-[#13192c] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>{i18n.language === 'ku' ? 'هەژمارەکانی بەڕێوەبەر' : 'Administrator Accounts'}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {adminStaffList.length}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      {i18n.language === 'ku'
                        ? 'یەکێک لە هەژمارەکانی بەڕێوەبەر هەڵبژێرە بۆ چوونەژوورەوە:'
                        : 'Select an administrator account that created an account:'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Bar if multiple admins exist */}
              {adminStaffList.length > 2 && (
                <div className="p-3 border-b border-slate-800/80 bg-[#090d18]">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-slate-400 absolute inset-y-0 start-3 my-auto pointer-events-none" />
                    <input
                      type="text"
                      value={adminSearchQuery}
                      onChange={(e) => setAdminSearchQuery(e.target.value)}
                      placeholder={i18n.language === 'ku' ? 'گەڕان بەپێی ناو یان ئیمەیڵ...' : 'Search by name, username, or email...'}
                      className="w-full h-9 bg-slate-900 border border-slate-800 rounded-xl ps-9 pe-8 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    {adminSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setAdminSearchQuery('')}
                        className="absolute inset-y-0 end-2 my-auto p-1 text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* List of Created Administrator Accounts */}
              <div className="p-4 sm:p-5 space-y-2.5 overflow-y-auto flex-1">
                {filteredAdminStaffList.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    {i18n.language === 'ku' ? 'هیچ بەڕێوەبەرێک نەدۆزرایەوە.' : 'No administrator accounts found.'}
                  </div>
                ) : (
                  filteredAdminStaffList.map((admin) => {
                    const isSelected = selectedAdminUser?.id === admin.id || 
                      (identifier && (identifier.toLowerCase() === admin.email?.toLowerCase() || identifier.toLowerCase() === admin.username?.toLowerCase()));
                    return (
                      <button
                        key={admin.id}
                        type="button"
                        onClick={() => handleSelectAdminAccount(admin)}
                        className={cn(
                          "w-full flex items-center justify-between p-3.5 rounded-2xl border text-start transition-all cursor-pointer group",
                          isSelected
                            ? "bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-950/50 ring-1 ring-indigo-500/40"
                            : "bg-[#0c111e] hover:bg-slate-800/80 border-slate-800 hover:border-indigo-500/40"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-sm">
                            {admin.full_name?.substring(0, 2).toUpperCase() || 'AD'}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-white truncate flex items-center gap-2">
                              <span>{admin.full_name}</span>
                              {isSelected && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>{i18n.language === 'ku' ? 'هەڵبژێردراو' : 'Selected'}</span>
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 truncate flex items-center gap-1.5 mt-0.5 font-mono">
                              <span>@{admin.username || 'admin'}</span>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-300 truncate">{admin.email}</span>
                            </div>
                            {admin.branch?.name && (
                              <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-sans">
                                <Building2 className="w-3 h-3 text-slate-500" />
                                <span>{admin.branch.name}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ms-2">
                          <span className={cn(
                            "text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all",
                            isSelected 
                              ? "bg-indigo-600 text-white border-indigo-500 shadow-sm" 
                              : "bg-slate-800 text-slate-300 border-slate-700 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500"
                          )}>
                            {isSelected 
                              ? (i18n.language === 'ku' ? 'چالاکە' : 'Active') 
                              : (i18n.language === 'ku' ? 'هەڵبژاردن' : 'Select Account')}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-800 bg-[#090d18] flex items-center justify-between gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdminModalOpen(false);
                    setAuthView('register');
                    setRegRoleId('role-admin');
                  }}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{i18n.language === 'ku' ? 'دروستکردنی هەژماری بەڕێوەبەری نوێ' : 'Create New Admin Account'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {i18n.language === 'ku' ? 'داخستن' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
