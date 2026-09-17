const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/pages/admin/adminStore.ts');
let code = fs.readFileSync(p, 'utf-8');

code = code.replace('Object.values(matrix.permissions).forEach(mod => {', 'Object.values(matrix.permissions).forEach((mod: any) => {');

fs.writeFileSync(p, code);
console.log('Fixed adminStore.ts typescript errors part 2');
