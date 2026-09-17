import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  full_name: string;
  username?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  role_id?: string;
  branch_id?: string;
  branch?: any;
  status: 'active' | 'inactive' | 'suspended' | 'locked';
  failed_login_attempts: number;
  last_login_at?: string;
  last_activity_at?: string;
  created_at: string;
  updated_at: string;
  role?: {
    id: string;
    name: string;
    is_system?: boolean;
    color?: string;
  };
}

export interface Permission {
  id: string;
  module: string;
  action: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUUID(str?: string | null): boolean {
  return typeof str === 'string' && UUID_REGEX.test(str);
}

export class AuthService {
  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        role:roles(id, name, is_system)
      `)
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01') {
        // Table doesn't exist - migration not run yet. 
        // Fallback to a mock administrator to avoid locking the user out.
        console.warn('Profiles table not found. Please run the database migration. Granting temporary fallback access.');
        return {
          id: userId,
          full_name: 'Fallback Admin',
          status: 'active',
          failed_login_attempts: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          role: { id: 'fallback', name: 'Administrator', is_system: true }
        } as UserProfile;
      }
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  }

  async getUserPermissions(roleId: string): Promise<Permission[]> {
    const { data, error } = await supabase
      .from('role_permissions')
      .select(`
        permission:permissions(*)
      `)
      .eq('role_id', roleId);

    if (error || !data) {
      console.error('Error fetching permissions:', error);
      return [];
    }
    return data.map(dp => dp.permission) as unknown as Permission[];
  }

  async checkPermission(userId: string, module: string, action: string): Promise<boolean> {
    const profile = await this.getProfile(userId);
    if (!profile || profile.status !== 'active' || !profile.role_id) return false;
    
    // If Admin, grant all (this is a shortcut, but ideally we check actual role_permissions)
    if (profile.role?.name === 'Administrator') return true;

    const permissions = await this.getUserPermissions(profile.role_id);
    return permissions.some(p => p.module === module && p.action === action);
  }

  async logAudit(userId: string, action: string, entity: string, entityId?: string, details?: any) {
    try {
      const validUserId = isValidUUID(userId) ? userId : null;
      const validEntityId = isValidUUID(entityId) ? entityId : null;

      const payload: Record<string, any> = {
        action,
        entity,
        details: {
          ...details,
          actor_id: userId,
          target_entity_id: entityId
        }
      };

      if (validUserId) payload.user_id = validUserId;
      if (validEntityId) payload.entity_id = validEntityId;

      const { error } = await supabase.from('audit_logs').insert(payload);
      if (error && error.code !== 'PGRST205' && error.code !== '42P01' && error.code !== '22P02') {
        console.warn('Audit log remote notice:', error.message || error);
      }
    } catch {
      // Gracefully handle network or insert issues
    }
  }
}

export const authService = new AuthService();
