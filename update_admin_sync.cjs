const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/pages/admin/adminStore.ts');
let code = fs.readFileSync(p, 'utf-8');

const relPushFn = `
// Background relational push for Profiles, Roles, and Role Permissions
async function pushRelationalAdminData() {
  if (!isSupabaseConfigured()) return;
  try {
    const staff = getStoredStaff();
    const roles = getStoredRoles();
    const matrices = getStoredRolePermissionsMap();

    // 1. Push Profiles
    if (staff && staff.length > 0) {
      const profileRows = staff.map(s => ({
        id: s.id.startsWith('staff-') ? undefined : s.id, // Supabase UUID usually required
        full_name: s.full_name,
        username: s.username,
        email: s.email,
        phone: s.phone,
        role_id: s.role_id,
        branch_id: s.branch_id,
        status: s.status,
        failed_login_attempts: s.failed_login_attempts,
        last_login_at: s.last_login_at,
        created_at: s.created_at,
        updated_at: s.updated_at
      })).filter(s => s.id); // Only push if ID is a valid UUID matching auth.users

      if (profileRows.length > 0) {
        // Skip profiles for now since they are FK restricted to auth.users, 
        // we'll push them to settings safely, but try pushing to profiles if user wants
        const { error } = await supabase.from('profiles').upsert(profileRows, { onConflict: 'id' }).select('id').limit(1);
        if (error && error.code !== 'PGRST205' && error.code !== '42P01') {
           // FK violation is expected if no auth.user exists
        }
      }
    }

    // 2. Push Roles
    if (roles && roles.length > 0) {
      const roleRows = roles.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        is_system: r.is_system,
        color: r.color
      }));
      await supabase.from('roles').upsert(roleRows, { onConflict: 'id' }).select('id').limit(1);
    }

    // 3. Push Permissions (Seed from INITIAL_PERMISSIONS)
    const permRows = INITIAL_PERMISSIONS.map(p => ({
      id: p.id,
      module: p.module,
      action: p.action,
      label: p.label,
      description: p.description,
      category: p.category
    }));
    await supabase.from('permissions').upsert(permRows, { onConflict: 'id' }).select('id').limit(1);

    // 4. Push Role Permissions
    if (matrices && typeof matrices === 'object') {
      const rpRows = [];
      Object.entries(matrices).forEach(([roleId, matrix]) => {
        if (matrix.permissions) {
          Object.values(matrix.permissions).forEach(mod => {
            if (mod.actions) {
               Object.keys(mod.actions).forEach(actionKey => {
                 if (mod.actions[actionKey]) {
                   const permId = INITIAL_PERMISSIONS.find(p => p.module.toLowerCase() === mod.module.toLowerCase() && p.action === actionKey)?.id;
                   if (permId) {
                     rpRows.push({ role_id: roleId, permission_id: permId });
                   }
                 }
               });
            }
          });
        }
      });
      if (rpRows.length > 0) {
        // We do a bulk insert, on conflict do nothing for unique (role_id, permission_id) constraint
        await supabase.from('role_permissions').upsert(rpRows, { onConflict: 'role_id,permission_id' }).select('id').limit(1);
      }
    }

  } catch (e) {
    // Non-blocking
  }
}
`;

// Insert the new function before syncAdminSetting
const targetStr = "async function syncAdminSetting";
if (code.includes(targetStr)) {
  code = code.replace(targetStr, relPushFn + "\n\n" + targetStr);
}

// Trigger it when saving roles or staff
const roleStr = "syncAdminSetting(LOCAL_STORAGE_ROLES_KEY, roles);";
if (code.includes(roleStr)) {
  code = code.replace(roleStr, roleStr + "\n  pushRelationalAdminData();");
}
const staffStr = "syncAdminSetting(LOCAL_STORAGE_STAFF_KEY, staff);";
if (code.includes(staffStr)) {
  code = code.replace(staffStr, staffStr + "\n  pushRelationalAdminData();");
}
const permsStr = "syncAdminSetting(LOCAL_STORAGE_PERMS_MAP_KEY, map);";
if (code.includes(permsStr)) {
  code = code.replace(permsStr, permsStr + "\n  pushRelationalAdminData();");
}

fs.writeFileSync(p, code);
console.log("adminStore.ts relational sync injected");
