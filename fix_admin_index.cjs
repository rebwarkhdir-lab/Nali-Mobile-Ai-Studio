const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/pages/admin/adminStore.ts');
let code = fs.readFileSync(p, 'utf-8');

code = code.replace(/INITIAL_ROLES\[2\]/g, "INITIAL_ROLES[0]");

fs.writeFileSync(p, code);
