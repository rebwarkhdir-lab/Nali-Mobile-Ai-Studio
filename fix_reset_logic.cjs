const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/components/common/DesignSettingsModal.tsx');
let code = fs.readFileSync(p, 'utf-8');

// 1. Fix Returns logic
const returnsOld = `if (resetOptions.returns) {
                                    await truncate('supplier_returns');
                                    lsKeysToRemove.push('nali_supplier_returns_data', 'nali_pos_supplier_returns_v2');
                                  }`;
const returnsNew = `if (resetOptions.returns) {
                                    await truncate('supplier_returns');
                                    lsKeysToRemove.push('nali_supplier_returns_data', 'nali_pos_supplier_returns_v2');
                                    try { await idb.delete('app_settings', 'nali_supplier_returns_data'); } catch(e){}
                                    try { await supabase.from('settings').delete().eq('key', 'nali_supplier_returns_data'); } catch(e){}
                                  }`;

// 2. Fix Reports logic
const reportsOld = `if (resetOptions.reports) {
                                    idbStoresToClear.push('pos_sales');
                                    lsKeysToRemove.push('nali_pos_sales_v1', 'nali_pos_sales_v2');
                                    try { await supabase.from('nali_mobiles').delete().eq('status', 'sold'); } catch(e){}
                                  }`;
const reportsNew = `if (resetOptions.reports) {
                                    idbStoresToClear.push('pos_sales');
                                    lsKeysToRemove.push('nali_pos_sales_v1', 'nali_pos_sales_v2', 'nali_mobiles_cache', 'nali_mobiles_data_v2', 'nali_accessories_cache', 'nali_accessories_inventory_v1');
                                    try { await supabase.from('nali_mobiles').delete().eq('status', 'sold'); } catch(e){}
                                    try { await supabase.from('nali_accessories').update({ totalSold: 0 }).neq('id', 'null'); } catch(e){}
                                    try { 
                                      const allMobs = await idb.getAll('mobiles');
                                      for (const m of allMobs) { if (m.status === 'sold') await idb.delete('mobiles', m.id); }
                                    } catch(e){}
                                    try { 
                                      const allAcc = await idb.getAll('accessories');
                                      for (const a of allAcc) { await idb.put('accessories', { ...a, totalSold: 0 }); }
                                    } catch(e){}
                                  }`;

// 3. Fix Admin logic
const adminOld = `if (resetOptions.admin) {
                                    await truncate('profiles'); await truncate('roles'); await truncate('permissions'); await truncate('role_permissions');
                                    await delKey('nali_pos_admin_staff_v1'); await delKey('nali_pos_admin_roles_v1'); await delKey('nali_pos_admin_role_perms_v1');
                                  }`;
const adminNew = `if (resetOptions.admin) {
                                    await truncate('profiles'); await truncate('roles'); await truncate('permissions'); await truncate('role_permissions');
                                    lsKeysToRemove.push('nali_pos_admin_staff', 'nali_pos_admin_roles', 'nali_pos_admin_role_perms', 'nali_pos_admin_sessions', 'nali_pos_admin_audit_logs', 'nali_pos_rbac_matrices', 'nali_pos_staff_credentials');
                                    try { await supabase.from('settings').delete().like('key', 'nali_pos_admin%'); } catch(e){}
                                    try { await supabase.from('settings').delete().eq('key', 'nali_pos_staff_credentials'); } catch(e){}
                                    try { await supabase.from('settings').delete().eq('key', 'nali_pos_rbac_matrices'); } catch(e){}
                                  }`;

if (code.includes(returnsOld)) { code = code.replace(returnsOld, returnsNew); }
if (code.includes(reportsOld)) { code = code.replace(reportsOld, reportsNew); }
if (code.includes(adminOld)) { code = code.replace(adminOld, adminNew); }

fs.writeFileSync(p, code);
console.log("Fixed DesignSettingsModal reset logic");
