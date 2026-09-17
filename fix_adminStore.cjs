const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/pages/admin/adminStore.ts');
let code = fs.readFileSync(p, 'utf-8');

code = code.replace('getStoredRolePermissionsMap()', 'getStoredRolePermissions()');
code = code.replace('Object.entries(matrices).forEach(([roleId, matrix]) => {', 'Object.entries(matrices).forEach(([roleId, matrix]: [string, any]) => {');

fs.writeFileSync(p, code);
console.log('Fixed adminStore.ts typescript errors');
