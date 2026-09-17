const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/components/common/DesignSettingsModal.tsx');
let code = fs.readFileSync(p, 'utf-8');

const adminResetOld = `                                  if (resetOptions.admin) {
                                    await truncate('profiles'); await truncate('roles'); await truncate('permissions'); await truncate('role_permissions');
                                    lsKeysToRemove.push('nali_pos_admin_staff', 'nali_pos_admin_roles', 'nali_pos_admin_role_perms', 'nali_pos_admin_sessions', 'nali_pos_admin_audit_logs', 'nali_pos_rbac_matrices', 'nali_pos_staff_credentials');
                                    lsKeysToRemove.push('nali_pos_admin_staff_v1', 'nali_pos_admin_roles_v1', 'nali_pos_admin_role_perms_v1', 'nali_pos_admin_sessions_v1');
                                    try { await supabase.from('settings').delete().like('key', 'nali_pos_admin%'); } catch(e){}
                                    try { await supabase.from('settings').delete().eq('key', 'nali_pos_staff_credentials'); } catch(e){}
                                    try { await supabase.from('settings').delete().eq('key', 'nali_pos_rbac_matrices'); } catch(e){}
                                    try { await supabase.from('settings').delete().like('key', 'nali_admin_audit_logs%'); } catch(e){}
                                  }`;

const adminResetNew = `                                  if (resetOptions.admin) {
                                    await truncate('profiles'); await truncate('roles'); await truncate('permissions'); await truncate('role_permissions');
                                    lsKeysToRemove.push('nali_pos_admin_staff', 'nali_pos_admin_roles', 'nali_pos_admin_role_perms', 'nali_pos_admin_sessions', 'nali_pos_admin_audit_logs', 'nali_pos_rbac_matrices', 'nali_pos_staff_credentials');
                                    lsKeysToRemove.push('nali_pos_admin_staff_v1', 'nali_pos_admin_roles_v1', 'nali_pos_admin_role_perms_v1', 'nali_pos_admin_sessions_v1');
                                    try { await supabase.from('settings').delete().like('key', 'nali_pos_admin%'); } catch(e){}
                                    try { await supabase.from('settings').delete().eq('key', 'nali_pos_staff_credentials'); } catch(e){}
                                    try { await supabase.from('settings').delete().eq('key', 'nali_pos_rbac_matrices'); } catch(e){}
                                    try { await supabase.from('settings').delete().like('key', 'nali_admin_audit_logs%'); } catch(e){}
                                    
                                    // Make sure we wipe out settings in IDB as well for admin
                                    try { await idb.delete('app_settings', 'nali_pos_admin_staff_v1'); } catch(e){}
                                    try { await idb.delete('app_settings', 'nali_pos_admin_roles_v1'); } catch(e){}
                                    try { await idb.delete('app_settings', 'nali_pos_admin_role_perms_v1'); } catch(e){}
                                    try { await idb.delete('app_settings', 'nali_pos_rbac_matrices'); } catch(e){}
                                  }`;

if (code.includes(adminResetOld)) {
    code = code.replace(adminResetOld, adminResetNew);
} else {
    console.log("Could not find admin reset block 2.");
}

fs.writeFileSync(p, code);
