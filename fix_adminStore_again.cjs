const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/pages/admin/adminStore.ts');
let code = fs.readFileSync(p, 'utf-8');

const correctStaff = `export const INITIAL_STAFF: AdminUser[] = [
  {
    id: 'usr-001',
    full_name: 'Nali Admin',
    username: 'nali.admin',
    email: 'admin@nalipos.com',
    phone: '+964 750 111 2233',
    role_id: 'role-admin',
    role: { id: 'role-admin', name: 'Administrator', is_system: true, color: '#6366F1' },
    branch_id: 'branch-1',
    branch: INITIAL_BRANCHES[0],
    status: 'active',
    is_active: true,
    deleted_at: null,
    failed_login_attempts: 0,
    last_login_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    updated_at: new Date().toISOString()
  }
];`;

code = code.replace(/export const INITIAL_STAFF: AdminUser\[\] = \[[\s\S]*?\];/g, correctStaff);
fs.writeFileSync(p, code);
console.log("Fixed INITIAL_STAFF");
