export type UserStatus = 'active' | 'suspended' | 'inactive' | 'locked';

export interface Branch {
  id: string;
  name: string;
  code: string;
  is_headquarters?: boolean;
  location?: string;
}

export interface AdminRole {
  id: string;
  name: string;
  description: string;
  is_system?: boolean;
  color?: string;
  user_count?: number;
  deleted_at?: string | null;
}

export type Role = AdminRole;

export interface AdminUser {
  id: string;
  full_name: string;
  username?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  role_id: string;
  role?: {
    id: string;
    name: string;
    is_system?: boolean;
    color?: string;
  };
  branch_id?: string;
  branch?: Branch;
  status: UserStatus;
  is_active?: boolean;
  deleted_at?: string | null;
  failed_login_attempts?: number;
  last_login_at?: string;
  last_activity_at?: string;
  last_device?: string;
  last_ip?: string;
  created_at: string;
  updated_at?: string;
  notes?: string;
  must_change_password?: boolean;
  is_new?: boolean;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  label: string;
  description: string;
  is_sensitive?: boolean;
  category: 'Sales & POS' | 'Inventory & Stock' | 'Repairs & Services' | 'Finance & Debts' | 'Settings & System';
}

export interface DeviceSession {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  user_avatar?: string;
  device_name: string;
  device_type: 'desktop' | 'mobile' | 'tablet' | 'terminal';
  device_category?: 'Computer / Laptop' | 'Mobile Phone' | 'Tablet' | 'POS Terminal';
  device_model?: string;
  os_name?: string;
  browser: string;
  ip_address: string;
  location: string;
  last_active: string;
  created_at: string;
  is_current: boolean;
  trusted: boolean;
  revoked?: boolean;
  revoked_at?: string;
  auth_method?: string;
  branch_name?: string;
  last_active_timestamp?: number;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  user_role?: string;
  user_avatar?: string;
  action: string;
  module: string;
  target?: string;
  severity: 'info' | 'warning' | 'danger' | 'success';
  created_at: string;
  details?: Record<string, any>;
  ip_address?: string;
}
