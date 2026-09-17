import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { authService, UserProfile, Permission } from '../lib/authService';
import { 
  AdminUser, 
  getStoredStaff, 
  saveStoredStaff, 
  validateUserCredentials, 
  registerStaffUser, 
  getStoredRolePermissions, 
  INITIAL_PERMISSIONS, 
  addAuditEntry,
  getMatrixForRole,
  INITIAL_STAFF,
  validateAdministratorSecretPassword,
  syncStaffAndCredentialsFromCloud,
  saveUserCredential,
  syncStaffAccountToSupabase,
  normalizeEmail
} from '../pages/admin/adminStore';
import { 
  CanonicalRole, 
  RBACModule, 
  RBACAction, 
  RolePermissionMatrix, 
  CANONICAL_ROLES, 
  DEFAULT_CANONICAL_MATRICES, 
  normalizeCanonicalRole, 
  normalizeRBACModule, 
  isActionAllowedInMatrix 
} from '../types/roles';
import { recordAndActivateDeviceSession, DetectedDevice } from '../lib/deviceDetector';
import { getStoredRevokedSessionIds } from '../pages/admin/adminStore';

interface AuthContextType {
  user: any;
  profile: UserProfile | null;
  permissions: Permission[];
  hasPermission: (module: string, action?: string) => boolean;
  can: (action: string, module?: string) => boolean;
  isAdmin: boolean;
  isManager: boolean;
  isCashier: boolean;
  isTechnician: boolean;
  canonicalRole: CanonicalRole;
  roleKey: CanonicalRole;
  canViewCostAndProfit: (module?: string) => boolean;
  canDelete: (module?: string) => boolean;
  canApplyDiscount: (percent?: number) => { allowed: boolean; maxAllowedPercent: number; reason?: string };
  permissionMatrix: RolePermissionMatrix;
  reloadPermissions: () => void;
  loading: boolean;
  loginWithCredentials: (identifier: string, passwordOrPin?: string) => Promise<{ success: boolean; error?: string; user?: any; deviceSession?: any; device?: DetectedDevice }>;
  loginAsDemo: (targetRole?: string, adminPassword?: string, targetUserId?: string) => Promise<{ success: boolean; error?: string; user?: any; deviceSession?: any; device?: DetectedDevice }>;
  registerStaffAccount: (data: {
    full_name: string;
    username?: string;
    email: string;
    phone?: string;
    role_id: string;
    branch_id?: string;
    password?: string;
    pin?: string;
  }) => Promise<{ success: boolean; error?: string; user?: any }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  permissions: [],
  hasPermission: () => false,
  can: () => false,
  isAdmin: false,
  isManager: false,
  isCashier: false,
  isTechnician: false,
  canonicalRole: 'cashier',
  roleKey: 'cashier',
  canViewCostAndProfit: () => false,
  canDelete: () => false,
  canApplyDiscount: () => ({ allowed: false, maxAllowedPercent: 0 }),
  permissionMatrix: DEFAULT_CANONICAL_MATRICES.cashier,
  reloadPermissions: () => {},
  loading: true,
  loginWithCredentials: async () => ({ success: false }),
  loginAsDemo: async () => ({ success: false }),
  registerStaffAccount: async () => ({ success: false }),
  logout: async () => {},
});

const DEMO_USER_KEY = 'nali_mobile_demo_user';
const ACTIVE_SESSION_KEY = 'nali_pos_active_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper to resolve permissions for a given role_id or role name
  const resolveRolePermissions = (roleId?: string, roleName?: string): Permission[] => {
    if (roleName === 'Administrator') {
      return INITIAL_PERMISSIONS.map(p => ({
        id: p.id,
        role_id: roleId || 'role-admin',
        module: p.module,
        action: p.action || p.id,
      }));
    }
    const rolePermsMap = getStoredRolePermissions();
    const allowedIds = (roleId && rolePermsMap[roleId]) || rolePermsMap['role-cashier'] || [];
    return INITIAL_PERMISSIONS
      .filter(p => allowedIds.includes(p.id))
      .map(p => ({
        id: p.id,
        role_id: roleId || 'role-cashier',
        module: p.module,
        action: p.action || p.id,
      }));
  };


  const loginWithCredentials = async (
    identifier: string,
    passwordOrPin: string
  ): Promise<{ success: boolean; error?: string; user?: AdminUser; deviceSession?: any; device?: DetectedDevice }> => {
    try {
      let staffList = getStoredStaff();
      const cleanId = identifier.trim().toLowerCase().replace(/^@/, '');

      // 1. If Supabase Auth is active and input could be an email, attempt cloud authentication directly
      if (isSupabaseConfigured() && passwordOrPin && passwordOrPin.trim().length >= 6) {
        let emailToAttempt = cleanId;
        if (!cleanId.includes('@')) {
          const candidate = staffList.find(u => u.username?.toLowerCase() === cleanId);
          if (candidate?.email) emailToAttempt = candidate.email.toLowerCase();
        }

        if (emailToAttempt.includes('@')) {
          try {
            const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
              email: emailToAttempt,
              password: passwordOrPin.trim()
            });

            if (!authErr && authData?.user) {
              // Successfully authenticated with Supabase Auth!
              await syncStaffAndCredentialsFromCloud();
              staffList = getStoredStaff();

              let matchedUser = staffList.find(u => 
                (u.email && u.email.toLowerCase() === emailToAttempt) ||
                (u.username && u.username.toLowerCase() === cleanId) ||
                u.id === authData.user.id
              );

              if (!matchedUser) {
                const metadata = authData.user.user_metadata || {};
                const roleName = metadata.role || 'Administrator';
                const roleId = metadata.role_id || (roleName === 'Administrator' ? 'role-admin' : 'role-cashier');
                matchedUser = {
                  id: authData.user.id,
                  full_name: metadata.full_name || authData.user.email?.split('@')[0] || 'User',
                  username: metadata.username || authData.user.email?.split('@')[0] || 'user',
                  email: authData.user.email,
                  role_id: roleId,
                  role: { id: roleId, name: roleName },
                  branch_id: 'branch-1',
                  status: 'active',
                  is_active: true,
                  created_at: new Date().toISOString()
                };
                saveStoredStaff([matchedUser, ...staffList]);
              }

              // Update credentials cache locally and in cloud
              saveUserCredential(matchedUser.id, passwordOrPin.trim());

              const sessionUser = {
                id: matchedUser.id,
                email: matchedUser.email || authData.user.email,
                user_metadata: {
                  full_name: matchedUser.full_name,
                  username: matchedUser.username,
                  role: matchedUser.role?.name || 'Administrator'
                }
              };

              const { session: deviceSession, device } = recordAndActivateDeviceSession(sessionUser, matchedUser.role?.name || 'Administrator');

              const updatedUser: AdminUser = {
                ...matchedUser,
                failed_login_attempts: 0,
                last_login_at: new Date().toISOString(),
                last_activity_at: new Date().toISOString(),
                last_device: `${device.deviceCategory} (${device.deviceName})`
              };

              const sessionProfile: UserProfile = {
                id: updatedUser.id,
                full_name: updatedUser.full_name || updatedUser.username,
                username: updatedUser.username,
                email: updatedUser.email,
                phone: updatedUser.phone,
                role_id: updatedUser.role_id,
                role: updatedUser.role,
                branch_id: updatedUser.branch_id,
                branch: updatedUser.branch,
                status: updatedUser.status as any,
                failed_login_attempts: 0,
                last_login_at: updatedUser.last_login_at,
                created_at: updatedUser.created_at,
                updated_at: new Date().toISOString()
              };

              localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({ user: sessionUser, profile: sessionProfile }));

              setUser(sessionUser);
              setProfile(sessionProfile);
              setPermissions(resolveRolePermissions(sessionProfile.role_id, sessionProfile.role?.name));

              addAuditEntry({
                user_name: updatedUser.full_name || `@${updatedUser.username}`,
                user_role: updatedUser.role?.name || 'Administrator',
                action: `Logged in via Supabase Cloud Auth on ${device.deviceCategory} (${device.deviceName})`,
                module: 'Security & Sessions',
                target: updatedUser.full_name || `@${updatedUser.username}`,
                severity: 'info',
                ip_address: device.ipAddress
              });

              return { success: true, user: updatedUser, deviceSession, device };
            }
          } catch (e) {
            // Supabase Auth network error or fallback
          }
        }
      }

      // 2. Local-first check with automatic Cloud synchronization fallback
      const normCleanId = normalizeEmail(cleanId);
      const matchUser = (u: AdminUser) => {
        if (u.email && (u.email.toLowerCase() === cleanId || normalizeEmail(u.email) === normCleanId)) return true;
        if (u.username && (u.username.toLowerCase() === cleanId || u.username.toLowerCase().replace(/^@/, '') === cleanId)) return true;
        if (u.phone && u.phone.replace(/\D/g, '') === cleanId.replace(/\D/g, '')) return true;
        if (u.full_name && u.full_name.toLowerCase() === cleanId) return true;
        return false;
      };

      let found = staffList.find(matchUser);
      let isValid = found ? validateUserCredentials(found, passwordOrPin || '') : false;

      // If not found or credentials mismatch, pull fresh data from Supabase Cloud (e.g. registered on another device)
      if (!found || !isValid) {
        const synced = await syncStaffAndCredentialsFromCloud();
        if (synced) {
          staffList = getStoredStaff();
          found = staffList.find(matchUser);
          if (found) {
            isValid = validateUserCredentials(found, passwordOrPin || '');
          }
        }
      }

      if (!found) {
        if (
          cleanId === 'admin' || 
          cleanId === 'recovery' || 
          cleanId === 'administrator' || 
          cleanId === 'admin@nalipos.com' || 
          cleanId === 'nali.admin' ||
          cleanId === 'rebwarkhdir@gmail.com'
        ) {
          const demoProfile = staffList.find(u => u.role?.name === 'Administrator' || u.role_id === 'role-admin') || INITIAL_STAFF[0];
          const validAdmin = validateUserCredentials(demoProfile, passwordOrPin || '');
          if (!validAdmin) {
            return { success: false, error: 'Incorrect administrator password or PIN. Please try again.' };
          }
          const sessionUser = {
            id: demoProfile.id,
            email: demoProfile.email,
            user_metadata: { full_name: demoProfile.full_name, role: 'Administrator' },
          };
          const { session: deviceSession, device } = recordAndActivateDeviceSession(sessionUser, 'Administrator');
          localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({ user: sessionUser, profile: demoProfile }));
          setUser(sessionUser);
          setProfile(demoProfile);
          setPermissions(resolveRolePermissions(demoProfile.role_id, demoProfile.role?.name));
          setLoading(false);
          return { success: true, user: demoProfile, deviceSession, device };
        }
        return { success: false, error: 'Staff account not found. Please verify your email or username.' };
      }

      // Check account status
      if (found.status === 'suspended') {
        return { success: false, error: 'This account has been suspended by administration. Access denied.' };
      }
      if (found.status === 'inactive' || found.is_active === false || found.deleted_at) {
        if (isValid) {
          found = { ...found, status: 'active', is_active: true, deleted_at: null };
          const updated = staffList.map(u => u.id === found!.id ? found! : u);
          saveStoredStaff(updated);
          syncStaffAccountToSupabase(updated).catch(() => {});
        } else {
          return { success: false, error: 'This account is inactive or disabled. Please contact an administrator to reactivate it.' };
        }
      }

      // Check password or PIN
      if (!isValid) {
        const updatedAttempts = (found.failed_login_attempts || 0) + 1;
        const updatedList = staffList.map(u => u.id === found.id ? { ...u, failed_login_attempts: updatedAttempts } : u);
        saveStoredStaff(updatedList);
        return { success: false, error: 'Invalid password or PIN. Please try again.' };
      }

      const sessionUser = {
        id: found.id,
        email: found.email || `${found.username}@nalipos.com`,
        user_metadata: {
          full_name: found.full_name || found.username,
          username: found.username,
          role: found.role?.name
        }
      };

      // ACTIVATE HARDWARE DEVICE SESSION (Computer / Laptop / Mobile Phone / Tablet)
      const { session: deviceSession, device } = recordAndActivateDeviceSession(sessionUser, found.role?.name);

      // Successful login -> update user status
      const updatedUser: AdminUser = {
        ...found,
        failed_login_attempts: 0,
        last_login_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        last_device: `${device.deviceCategory} (${device.deviceName})`
      };

      const updatedList = staffList.map(u => u.id === found.id ? updatedUser : u);
      saveStoredStaff(updatedList);

      const sessionProfile: UserProfile = {
        id: updatedUser.id,
        full_name: updatedUser.full_name || updatedUser.username,
        username: updatedUser.username,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role_id: updatedUser.role_id,
        role: updatedUser.role,
        branch_id: updatedUser.branch_id,
        branch: updatedUser.branch,
        status: updatedUser.status as any,
        failed_login_attempts: 0,
        last_login_at: updatedUser.last_login_at,
        created_at: updatedUser.created_at,
        updated_at: new Date().toISOString()
      };

      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({ user: sessionUser, profile: sessionProfile }));

      setUser(sessionUser);
      setProfile(sessionProfile);
      setPermissions(resolveRolePermissions(sessionProfile.role_id, sessionProfile.role?.name));

      // Add audit log safely without throwing if passwordOrPin is undefined
      const authMethod = (passwordOrPin && passwordOrPin.length <= 6 && !isNaN(Number(passwordOrPin))) ? 'PIN' : 'Password';
      addAuditEntry({
        user_name: updatedUser.full_name || `@${updatedUser.username}`,
        user_role: updatedUser.role?.name || 'Staff',
        action: `Logged in to terminal via ${authMethod} as ${updatedUser.role?.name || 'Staff'} [${device.deviceCategory} • ${device.deviceName}]`,
        module: 'Security & Sessions',
        target: updatedUser.full_name || `@${updatedUser.username}`,
        severity: 'info',
        ip_address: device.ipAddress,
        details: {
          device_category: device.deviceCategory,
          device_name: device.deviceName,
          os: device.osName,
          browser: device.browser,
          resolution: device.screenResolution
        }
      });

      return { success: true, user: updatedUser, deviceSession, device };
    } catch (err: any) {
      return { success: false, error: err.message || 'Authentication failed' };
    }
  };

  const loginAsDemo = async (targetRole: string = 'Cashier', adminPassword?: string, targetUserId?: string): Promise<{ success: boolean; error?: string; user?: any; deviceSession?: any; device?: DetectedDevice }> => {
    try {
      const staffList = getStoredStaff();
      const normalizedTarget = targetRole.toLowerCase();

      // STRICT PROTECTION: If switching or logging in as Administrator, MUST validate Administrator secret password!
      if (normalizedTarget.includes('admin')) {
        const valRes = validateAdministratorSecretPassword(adminPassword || '', targetUserId);
        if (!valRes.success) {
          return { success: false, error: valRes.error || 'Administrator password required.' };
        }
      }

      // If a specific target user ID is provided (e.g. chosen from Administrator Queue or Cashier Queue)
      let matchedUser: AdminUser | undefined;
      if (targetUserId) {
        matchedUser = staffList.find(u => u.id === targetUserId);
      }

      if (!matchedUser) {
        matchedUser = staffList.find(u => {
          const rName = (u.role?.name || '').toLowerCase();
          if (normalizedTarget.includes('admin')) return rName.includes('admin') || u.role_id === 'role-admin';
          if (normalizedTarget.includes('manager')) return rName.includes('manager') || u.role_id === 'role-manager';
          if (normalizedTarget.includes('cashier')) return rName.includes('cashier') || u.role_id === 'role-cashier';
          if (normalizedTarget.includes('user')) return rName.includes('user') || u.role_id === 'role-user';
          return false;
        }) || INITIAL_STAFF.find(u => {
          const rName = (u.role?.name || '').toLowerCase();
          if (normalizedTarget.includes('admin')) return rName.includes('admin') || u.role_id === 'role-admin';
          if (normalizedTarget.includes('manager')) return rName.includes('manager') || u.role_id === 'role-manager';
          if (normalizedTarget.includes('cashier')) return rName.includes('cashier') || u.role_id === 'role-cashier';
          if (normalizedTarget.includes('user')) return rName.includes('user') || u.role_id === 'role-user';
          return false;
        }) || staffList[0] || INITIAL_STAFF[0];
      }

      const effectiveRoleName = matchedUser.role?.name || (
        matchedUser.role_id === 'role-admin' ? 'Administrator' :
        matchedUser.role_id === 'role-manager' ? 'Manager' :
        matchedUser.role_id === 'role-cashier' ? 'Cashier' :
        matchedUser.role_id === 'role-user' ? 'User' : targetRole
      );

      const sessionUser = {
        id: matchedUser.id,
        email: matchedUser.email || `${matchedUser.username}@nalipos.com`,
        user_metadata: {
          full_name: matchedUser.full_name || matchedUser.username,
          username: matchedUser.username,
          role: effectiveRoleName
        }
      };

      // ACTIVATE HARDWARE DEVICE SESSION
      const { session: deviceSession, device } = recordAndActivateDeviceSession(sessionUser, effectiveRoleName);

      const updatedUser: AdminUser = {
        ...matchedUser,
        failed_login_attempts: 0,
        last_login_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        last_device: `${device.deviceCategory} (${device.deviceName})`
      };

      const sessionProfile: UserProfile = {
        id: updatedUser.id,
        full_name: updatedUser.full_name || updatedUser.username,
        username: updatedUser.username,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role_id: updatedUser.role_id,
        role: updatedUser.role || { id: updatedUser.role_id, name: effectiveRoleName },
        branch_id: updatedUser.branch_id,
        branch: updatedUser.branch,
        status: (updatedUser.status as any) || 'active',
        failed_login_attempts: 0,
        last_login_at: updatedUser.last_login_at,
        created_at: updatedUser.created_at,
        updated_at: new Date().toISOString()
      };

      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({ user: sessionUser, profile: sessionProfile }));

      setUser(sessionUser);
      setProfile(sessionProfile);
      setPermissions(resolveRolePermissions(sessionProfile.role_id, effectiveRoleName));
      setLoading(false);

      addAuditEntry({
        user_name: updatedUser.full_name || `@${updatedUser.username}`,
        user_role: effectiveRoleName,
        action: `Switched / Logged in as ${effectiveRoleName} on ${device.deviceCategory} (${device.deviceName})`,
        module: 'Security & Sessions',
        target: updatedUser.full_name || `@${updatedUser.username}`,
        severity: 'info',
        ip_address: device.ipAddress,
        details: {
          device_category: device.deviceCategory,
          device_name: device.deviceName,
          os: device.osName,
          browser: device.browser
        }
      });

      return { success: true, user: updatedUser, deviceSession, device };
    } catch (err: any) {
      return { success: false, error: err.message || 'Demo authentication failed' };
    }
  };

  const registerStaffAccount = async (data: {
    full_name: string;
    username?: string;
    email: string;
    phone?: string;
    role_id: string;
    branch_id?: string;
    password?: string;
    pin?: string;
  }): Promise<{ success: boolean; error?: string; user?: AdminUser }> => {
    try {
      const staffList = getStoredStaff();
      const cleanEmail = data.email.trim().toLowerCase();
      const cleanUsername = (data.username || data.full_name.toLowerCase().replace(/\s+/g, '.')).replace(/^@/, '').toLowerCase().trim();

      // Check duplicate
      const duplicate = staffList.find(u => 
        (u.email && u.email.toLowerCase() === cleanEmail) ||
        (u.username && u.username.toLowerCase() === cleanUsername)
      );

      if (duplicate && duplicate.status === 'active') {
        return { success: false, error: 'An account with this email or username already exists. Please sign in instead.' };
      }

      // Register staff user in unified store
      const newUser = registerStaffUser({
        full_name: data.full_name,
        username: cleanUsername,
        email: cleanEmail,
        phone: data.phone,
        role_id: data.role_id || 'role-cashier',
        branch_id: data.branch_id || 'branch-1',
        password: data.password || 'cashier123',
        pin: data.pin || '1234',
        notes: 'Public self-registration via mobile/web portal'
      });

      // Automatically sign in the newly registered user
      const sessionUser = {
        id: newUser.id,
        email: newUser.email,
        user_metadata: {
          full_name: newUser.full_name,
          username: newUser.username,
          role: newUser.role?.name
        }
      };

      const sessionProfile: UserProfile = {
        id: newUser.id,
        full_name: newUser.full_name,
        username: newUser.username,
        email: newUser.email,
        phone: newUser.phone,
        role_id: newUser.role_id,
        role: newUser.role,
        branch_id: newUser.branch_id,
        branch: newUser.branch,
        status: 'active',
        failed_login_attempts: 0,
        last_login_at: newUser.last_login_at,
        created_at: newUser.created_at,
        updated_at: new Date().toISOString()
      };

      
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({ user: sessionUser, profile: sessionProfile }));

      setUser(sessionUser);
      setProfile(sessionProfile);
      setPermissions(resolveRolePermissions(sessionProfile.role_id, sessionProfile.role?.name));

      // Synchronize with Supabase Cloud so other devices (Computers, Tablets, Mobile phones) can sign in immediately
      try {
        await syncStaffAccountToSupabase();
      } catch (e) {
        console.warn('Background Supabase staff sync notice:', e);
      }

      return { success: true, user: newUser };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  useEffect(() => {
    let mounted = true;

    // Immediately synchronize staff accounts and credentials across devices
    syncStaffAndCredentialsFromCloud().catch(() => {});

    // 1. Check for stored session first
    const saved = localStorage.getItem(ACTIVE_SESSION_KEY) ;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.user && parsed.profile) {
          const currentStaff = getStoredStaff();
          const liveUser = currentStaff.find(u => u.id === parsed.user.id);
          
          if (liveUser) {
            if (liveUser.status === 'suspended' || liveUser.status === 'inactive' || !liveUser.is_active) {
              localStorage.removeItem(ACTIVE_SESSION_KEY);
              
              setUser(null);
              setProfile(null);
              setPermissions([]);
              setLoading(false);
              return;
            }
            parsed.profile.role = liveUser.role;
            parsed.profile.role_id = liveUser.role_id;
            parsed.profile.full_name = liveUser.full_name;
            parsed.profile.branch = liveUser.branch;
          }

          setUser(parsed.user);
          setProfile(parsed.profile);
          setPermissions(resolveRolePermissions(parsed.profile.role_id, parsed.profile.role?.name));
          try {
            recordAndActivateDeviceSession(parsed.user, parsed.profile.role?.name);
          } catch {}
          setLoading(false);
          return;
        }
      } catch (e) {
        localStorage.removeItem(ACTIVE_SESSION_KEY);
        
      }
    }

    async function loadData(session: any) {
      if (!session?.user) {
        if (mounted) {
          setUser(null);
          setProfile(null);
          setPermissions([]);
          setLoading(false);
        }
        return;
      }

      setUser(session.user);
      const userProfile = await authService.getProfile(session.user.id);
      
      if (userProfile && mounted) {
        setProfile(userProfile);
        
        if (userProfile.status !== 'active') {
          try { await supabase.auth.signOut(); } catch {}
          setUser(null);
          setProfile(null);
          setPermissions([]);
          setLoading(false);
          return;
        }

        if (userProfile.role_id) {
          const perms = await authService.getUserPermissions(userProfile.role_id);
          setPermissions(perms);
        }
      }
      if (mounted) setLoading(false);
    }

    try {
      supabase.auth.getSession().then(({ data: { session } }) => {
        loadData(session);
      }).catch(() => {
        if (mounted) setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setLoading(true);
        loadData(session);
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } catch {
      if (mounted) setLoading(false);
    }
  }, []);

  // Live reactive synchronization for RBAC matrix modifications
  const [matrixVersion, setMatrixVersion] = useState(0);
  const reloadPermissions = useCallback(() => {
    setMatrixVersion(v => v + 1);
  }, []);

  // Live reactive synchronization for staff accounts from Supabase Cloud
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let staffChannel: any = null;
    try {
      staffChannel = supabase
        .channel('staff_accounts_live_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_accounts' }, () => {
          syncStaffAndCredentialsFromCloud().catch(() => {});
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, (payload: any) => {
          if (payload?.new?.key === 'nali_pos_admin_staff_v1' || payload?.new?.key === 'nali_pos_staff_credentials_v1') {
            syncStaffAndCredentialsFromCloud().catch(() => {});
          }
        })
        .subscribe();
    } catch {}

    return () => {
      if (staffChannel) {
        try { supabase.removeChannel(staffChannel); } catch {}
      }
    };
  }, []);

  useEffect(() => {
    const handleRBACUpdate = () => {
      reloadPermissions();
    };
    window.addEventListener('nali_rbac_updated', handleRBACUpdate);
    return () => {
      window.removeEventListener('nali_rbac_updated', handleRBACUpdate);
    };
  }, [reloadPermissions]);

  // Canonical role resolution
  const rawRoleIdentifier = profile?.role_id || profile?.role?.name || '';
  const canonicalRole: CanonicalRole = normalizeCanonicalRole(rawRoleIdentifier);
  const roleKey = canonicalRole;

  const isAdmin = canonicalRole === 'admin';
  const isManager = canonicalRole === 'manager';
  const isCashier = canonicalRole === 'cashier';
  const isTechnician = canonicalRole === 'technician';

  // Dynamic Role Permission Matrix resolution
  const permissionMatrix: RolePermissionMatrix = useMemo(() => {
    // matrixVersion ensures reactive recalculation when admin changes matrices
    if (!profile) return DEFAULT_CANONICAL_MATRICES.cashier;
    return getMatrixForRole(rawRoleIdentifier || canonicalRole);
  }, [profile, rawRoleIdentifier, canonicalRole, matrixVersion]);

  // Centralized Fine-Grained Permission Checker
  const hasPermission = useCallback((module: string, action: string = 'view'): boolean => {
    if (!profile) return false;
    if (isAdmin) return true; // Superuser unconstrained bypass

    const canonicalMod = normalizeRBACModule(module);
    const actLower = (action || 'view').toLowerCase();

    // Map string action to RBACAction
    let rbacAction: RBACAction = 'view';
    if (actLower.includes('cost') || actLower.includes('profit') || actLower === 'view_cost_profit') {
      rbacAction = 'view_cost_profit';
    } else if (actLower.includes('discount') || actLower === 'apply_discount') {
      rbacAction = 'apply_discount';
    } else if (actLower.includes('delete') || actLower.includes('remove') || actLower.includes('purge')) {
      rbacAction = 'delete';
    } else if (actLower.includes('edit') || actLower.includes('update') || actLower.includes('adjust') || actLower.includes('manage')) {
      rbacAction = 'edit';
    } else if (actLower.includes('create') || actLower.includes('add') || actLower.includes('register')) {
      rbacAction = 'create';
    } else if (actLower.includes('export') || actLower.includes('download')) {
      rbacAction = 'export';
    } else {
      rbacAction = 'view';
    }

    // Strict segregation guards:
    // 1. Cashier & Technician: strictly blocked from cost & profit
    if ((isCashier || isTechnician) && rbacAction === 'view_cost_profit') {
      return false;
    }

    // 2. Cashier: strictly blocked from deletion of records or modifying inventory directly
    if (isCashier && (rbacAction === 'delete' || (canonicalMod !== 'sales' && rbacAction === 'edit'))) {
      return false;
    }

    // 3. Cashier: strictly blocked from administrative & report suites
    if (isCashier && (canonicalMod === 'admin_users' || canonicalMod === 'admin_security' || canonicalMod === 'reports_finance' || canonicalMod === 'suppliers')) {
      return false;
    }

    // 4. Technician: strictly blocked from finance, debts, sales, suppliers, admin
    if (isTechnician && (canonicalMod === 'sales' || canonicalMod === 'debts_installments' || canonicalMod === 'suppliers' || canonicalMod === 'reports_finance' || canonicalMod === 'admin_users' || canonicalMod === 'admin_security')) {
      return false;
    }

    return isActionAllowedInMatrix(permissionMatrix, canonicalMod, rbacAction);
  }, [profile, isAdmin, isCashier, isTechnician, permissionMatrix]);

  // General `can` helper
  const can = useCallback((action: string, module?: string): boolean => {
    if (isAdmin) return true;
    if (module) return hasPermission(module, action);

    const actLower = (action || '').toLowerCase();
    if (actLower.includes('cost') || actLower.includes('profit') || actLower === 'view_cost_profit') {
      return !isCashier && !isTechnician;
    }
    if (actLower.includes('delete')) {
      return !isCashier && !isTechnician;
    }
    if (actLower.includes('discount')) {
      return hasPermission('sales', 'apply_discount');
    }
    return true;
  }, [isAdmin, isCashier, isTechnician, hasPermission]);

  // Dedicated helper to check cost & profit visibility
  const canViewCostAndProfit = useCallback((module: string = 'sales'): boolean => {
    if (isAdmin) return true;
    if (isCashier || isTechnician) return false;
    return hasPermission(module, 'view_cost_profit');
  }, [isAdmin, isCashier, isTechnician, hasPermission]);

  // Dedicated helper for record deletion authority
  const canDelete = useCallback((module: string = 'sales'): boolean => {
    if (isAdmin) return true;
    if (isCashier || isTechnician) return false;
    return hasPermission(module, 'delete');
  }, [isAdmin, isCashier, isTechnician, hasPermission]);

  // Dedicated helper for applying discounts with limits enforcement
  const canApplyDiscount = useCallback((percent?: number) => {
    const roleMeta = CANONICAL_ROLES[canonicalRole] || CANONICAL_ROLES.cashier;
    const maxAllowedPercent = roleMeta.maxDiscountPercentage;
    const hasDiscountPerm = hasPermission('sales', 'apply_discount');

    if (!hasDiscountPerm || maxAllowedPercent === 0) {
      return {
        allowed: false,
        maxAllowedPercent: 0,
        reason: `${roleMeta.displayName} does not have authority to apply discounts.`,
      };
    }

    if (percent !== undefined && percent > maxAllowedPercent) {
      return {
        allowed: false,
        maxAllowedPercent,
        reason: `Discount of ${percent}% exceeds allowed threshold (max ${maxAllowedPercent}% for ${roleMeta.displayName}). Supervisor or Admin override required.`,
      };
    }

    return {
      allowed: true,
      maxAllowedPercent,
    };
  }, [canonicalRole, hasPermission]);

  const logout = useCallback(async () => {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
    if (profile) {
      try {
        await authService.logAudit(profile.id, 'logout', 'UserSession');
      } catch {}
    }
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore signOut errors when offline
    }
    setUser(null);
    setProfile(null);
    setPermissions([]);
  }, [profile]);

  // Remote Device Session Revocation Watcher
  // When an admin revokes this terminal's session remotely, automatically log out
  useEffect(() => {
    if (!user) return;

    let deviceSessionId = '';
    try {
      deviceSessionId = localStorage.getItem('nali_device_session_id') || '';
    } catch {}

    if (!deviceSessionId) return;

    const checkRevocation = () => {
      const revokedIds = getStoredRevokedSessionIds();
      if (revokedIds.includes(deviceSessionId)) {
        logout();
      }
    };

    checkRevocation();

    const handleStorage = () => checkRevocation();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('nali_sessions_revoked_update', handleStorage);

    // Supabase Realtime channel broadcast for instantaneous revocation across devices
    let channel: any = null;
    if (isSupabaseConfigured()) {
      try {
        channel = supabase
          .channel('device_sessions_revocation')
          .on('broadcast', { event: 'session_revoked' }, (payload: any) => {
            const revokedId = payload.payload?.sessionId;
            if (revokedId === deviceSessionId) {
              logout();
            }
          })
          .on('broadcast', { event: 'all_sessions_revoked' }, (payload: any) => {
            const exceptId = payload.payload?.exceptSessionId;
            if (exceptId && exceptId !== deviceSessionId) {
              logout();
            }
          })
          .subscribe();
      } catch {
        // Non-blocking
      }
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('nali_sessions_revoked_update', handleStorage);
      if (channel) {
        try { supabase.removeChannel(channel); } catch {}
      }
    };
  }, [user, logout]);

  const authContextValue = useMemo(() => ({ 
    user, 
    profile, 
    permissions, 
    hasPermission, 
    can,
    isAdmin,
    isManager,
    isCashier,
    isTechnician,
    canonicalRole,
    roleKey,
    canViewCostAndProfit,
    canDelete,
    canApplyDiscount,
    permissionMatrix,
    reloadPermissions,
    loading, 
    loginWithCredentials, 
    loginAsDemo,
    registerStaffAccount, 
    logout 
  }), [
    user, 
    profile, 
    permissions, 
    hasPermission, 
    can,
    isAdmin,
    isManager,
    isCashier,
    isTechnician,
    canonicalRole,
    roleKey,
    canViewCostAndProfit,
    canDelete,
    canApplyDiscount,
    permissionMatrix,
    reloadPermissions,
    loading, 
    loginWithCredentials, 
    loginAsDemo,
    registerStaffAccount, 
    logout 
  ]);

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
