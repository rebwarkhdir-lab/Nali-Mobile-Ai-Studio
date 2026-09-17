import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Shield, Plus, CheckCircle2, Lock, X } from 'lucide-react';
import { useToast } from '../../components/common/Toast';
import { cn } from '../../lib/utils';
import { authService } from '../../lib/authService';

export default function Roles() {
  const { t } = useTranslation();
  const toast = useToast();
  const { hasPermission, profile } = useAuth();
  
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [rolePermissions, setRolePermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedRole, setSelectedRole] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rRes, pRes, rpRes] = await Promise.all([
        supabase.from('roles').select('*').order('name'),
        supabase.from('permissions').select('*').order('module').order('action'),
        supabase.from('role_permissions').select('*')
      ]);
      
      if (rRes.data) {
        setRoles(rRes.data);
        if (!selectedRole && rRes.data?.length > 0) {
          setSelectedRole(rRes.data[0]);
        }
      }
      if (pRes.data) setPermissions(pRes.data);
      if (rpRes.data) setRolePermissions(rpRes.data);
    } catch (err) {
      toast.error(t('admin.roles.loadError', 'Failed to load roles and permissions'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTogglePermission = async (permissionId: string) => {
    if (!hasPermission('Administration', 'manage_permissions')) {
      toast.error(t('admin.roles.noPermissionToModify', 'You do not have permission to modify roles.'));
      return;
    }
    
    if (selectedRole?.name === 'Administrator') {
      toast.error(t('admin.roles.adminCannotBeModified', 'The Administrator role permissions cannot be modified.'));
      return;
    }

    const hasPerm = rolePermissions.some(rp => rp.role_id === selectedRole.id && rp.permission_id === permissionId);
    
    try {
      if (hasPerm) {
        await supabase.from('role_permissions')
          .delete()
          .match({ role_id: selectedRole.id, permission_id: permissionId });
      } else {
        await supabase.from('role_permissions')
          .insert({ role_id: selectedRole.id, permission_id: permissionId });
      }
      
      await loadData();
      toast.success(t('admin.roles.permissionsUpdated', 'Permissions updated'));
      await authService.logAudit(profile!.id, 'Updated role permissions', 'roles', selectedRole.id);
    } catch (err) {
      toast.error(t('admin.roles.updateError', 'Failed to update permission'));
    }
  };

  const groupedPermissions = permissions.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {} as Record<string, any[]>);

  // Derive standard actions to create a matrix
  const standardActions = ['view', 'create', 'edit', 'delete', 'manage'];
  
  const getMatrixHeader = (actions: any[]) => {
     // Create a unique list of simple actions for this module
     const simpleActions = new Set<string>();
     actions.forEach(a => {
        let actionStr = a.action.toLowerCase();
        if (actionStr.includes('view')) simpleActions.add('view');
        else if (actionStr.includes('create') || actionStr.includes('add')) simpleActions.add('create');
        else if (actionStr.includes('edit') || actionStr.includes('update')) simpleActions.add('edit');
        else if (actionStr.includes('delete') || actionStr.includes('remove')) simpleActions.add('delete');
        else if (actionStr.includes('manage')) simpleActions.add('manage');
        else simpleActions.add(actionStr);
     });
     return Array.from(simpleActions).sort((a, b) => {
       const aIdx = standardActions.indexOf(a);
       const bIdx = standardActions.indexOf(b);
       if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
       if (aIdx !== -1) return -1;
       if (bIdx !== -1) return 1;
       return a.localeCompare(b);
     });
  };

  return (
    <div className="flex flex-col h-full gap-6">
      
      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-[#121827] border border-white/5 rounded-2xl p-5 flex items-center justify-between shadow-lg hover:border-indigo-500/30 transition-colors">
          <div>
            <p className="text-xs font-medium text-slate-400">{t('admin.roles.totalRoles', 'Total Roles')}</p>
            <h3 className="text-3xl font-bold text-white mt-1">{roles?.length || 0}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-indigo-400" />
          </div>
        </div>
        
        <div className="bg-[#121827] border border-white/5 rounded-2xl p-5 flex items-center justify-between shadow-lg hover:border-emerald-500/30 transition-colors">
          <div>
            <p className="text-xs font-medium text-slate-400">{t('admin.roles.systemRoles', 'System Roles')}</p>
            <h3 className="text-3xl font-bold text-emerald-400 mt-1">
              {(roles || []).filter(r => r.is_system).length}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Lock className="w-6 h-6 text-emerald-400" />
          </div>
        </div>
        
        <div className="bg-[#121827] border border-white/5 rounded-2xl p-5 flex items-center justify-between shadow-lg hover:border-amber-500/30 transition-colors">
          <div>
            <p className="text-xs font-medium text-slate-400">{t('admin.roles.totalPermissions', 'Total Permissions')}</p>
            <h3 className="text-3xl font-bold text-amber-400 mt-1">
              {permissions?.length || 0}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-amber-400" />
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 gap-6 min-h-0">
        
        {/* Roles List */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">{t('admin.roles.roles', 'Roles')}</h2>
            {hasPermission('Administration', 'manage_roles') && (
              <button className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 px-2 py-1 rounded-md cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> {t('admin.roles.newRole', 'New Role')}
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto no-scrollbar pb-4">
            {loading ? (
              <div className="animate-pulse flex flex-col gap-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-14 bg-slate-800/50 rounded-xl"></div>
                ))}
              </div>
            ) : (
              (roles || []).map(role => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className={cn(
                    "flex flex-col p-3 rounded-xl transition-all text-left relative overflow-hidden group cursor-pointer",
                    selectedRole?.id === role.id 
                      ? "bg-indigo-600/10 border-indigo-500/50" 
                      : "bg-[#121827] hover:bg-slate-800 border-white/5",
                    "border"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={cn("font-semibold text-sm", selectedRole?.id === role.id ? "text-indigo-300" : "text-slate-200")}>
                      {role.name}
                    </span>
                    {role.is_system && (
                      <Lock className={cn("w-3.5 h-3.5", selectedRole?.id === role.id ? "text-indigo-400" : "text-slate-500")} />
                    )}
                  </div>
                  <div className={cn("text-xs mt-1 font-medium", selectedRole?.id === role.id ? "text-indigo-400/80" : "text-slate-500")}>
                    {(rolePermissions || []).filter(rp => rp.role_id === role.id).length} {t('admin.roles.permissionsCount', 'permissions')}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Permissions Matrix */}
        <div className="flex-1 bg-[#121827] border border-white/5 rounded-2xl overflow-hidden flex flex-col shadow-sm">
          
          <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.01]">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                {selectedRole?.name || t('admin.roles.selectRole', 'Select a role')}
                {selectedRole?.is_system && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                    {t('admin.roles.systemProtected', 'System Protected')}
                  </span>
                )}
              </h3>
              <p className="text-sm text-slate-400 mt-1 max-w-xl">
                {selectedRole?.description || t('admin.roles.defaultDesc', 'Manage access levels and permissions for this role.')}
              </p>
            </div>
            
            {hasPermission('Administration', 'manage_roles') && !selectedRole?.is_system && (
              <button className="text-sm text-slate-400 hover:text-white transition-colors border border-white/10 rounded-lg px-4 py-2 hover:bg-white/5 self-start sm:self-auto cursor-pointer">
                {t('admin.roles.editDetails', 'Edit Details')}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-6">
            {selectedRole ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {Object.entries(groupedPermissions).map(([module, perms]) => (
                  <div key={module} className="bg-[#0b0f1a] border border-white/5 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-white/[0.02] border-b border-white/5">
                      <h4 className="text-sm font-bold text-slate-200">
                        {module}
                      </h4>
                    </div>
                    <div className="p-2 flex flex-col gap-1">
                      {(perms as any[]).map(p => {
                        const hasPerm = rolePermissions.some(rp => rp.role_id === selectedRole.id && rp.permission_id === p.id);
                        const disabled = selectedRole.name === 'Administrator';
                        return (
                          <label 
                             key={p.id} 
                             className={cn(
                              "flex items-center justify-between p-2 rounded-lg transition-colors group",
                              !disabled && "cursor-pointer hover:bg-white/5",
                              hasPerm ? "bg-indigo-500/5" : ""
                            )}
                          >
                            <div className="flex flex-col min-w-0 pr-4">
                              <span className={cn("text-xs font-medium truncate", hasPerm ? "text-indigo-300" : "text-slate-300")}>
                                {p.description || p.action.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                              </span>
                            </div>
                            
                            <div className={cn(
                              "w-8 h-4 rounded-full relative transition-colors shrink-0",
                              hasPerm ? "bg-indigo-500" : "bg-slate-700",
                              disabled && "opacity-50"
                            )}>
                              <div className={cn(
                                "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
                                hasPerm ? "left-[18px]" : "left-0.5"
                              )}></div>
                            </div>
                            
                            <input 
                               type="checkbox" 
                               className="hidden" 
                               checked={hasPerm}
                               onChange={() => handleTogglePermission(p.id)}
                               disabled={disabled}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                {t('admin.roles.selectRolePrompt', 'Select a role from the left panel to manage permissions.')}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
