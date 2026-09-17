const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/pages/admin/adminStore.ts');
let code = fs.readFileSync(p, 'utf-8');

code = code.replace(/device_info/g, 'device_name');
fs.writeFileSync(p, code);
