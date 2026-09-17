const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/pages/admin/adminStore.ts');
let code = fs.readFileSync(p, 'utf-8');

const rolesRegex = /export const INITIAL_ROLES: AdminRole\[\] = \[([\s\S]*?)\];/;
const rolesMatch = code.match(rolesRegex);
if (rolesMatch) {
  const adminRoleMatch = rolesMatch[1].match(/\{\s*id:\s*'role-admin'[\s\S]*?\},/);
  if (adminRoleMatch) {
    code = code.replace(rolesRegex, "export const INITIAL_ROLES: AdminRole[] = [\n  " + adminRoleMatch[0] + "\n];");
  }
}

const mapRegex = /return \{\n    'role-admin': INITIAL_PERMISSIONS.map\(p => p.id\),\n([\s\S]*?)  \};/;
const mapMatch = code.match(mapRegex);
if (mapMatch) {
    code = code.replace(mapRegex, "return {\n    'role-admin': INITIAL_PERMISSIONS.map(p => p.id)\n  };");
}

const mapRegex2 = /export const INITIAL_RBAC_MATRICES = \{([\s\S]*?)\};/;
code = code.replace(mapRegex2, "export const INITIAL_RBAC_MATRICES = {};");


fs.writeFileSync(p, code);
