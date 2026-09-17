const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/pages/admin/adminStore.ts');
let code = fs.readFileSync(p, 'utf-8');

const oldLog = `  }
  return INITIAL_AUDIT_LOGS;`;
const newLog = `  }
  return [];`;

if (code.includes(oldLog)) {
  code = code.replace(oldLog, newLog);
  fs.writeFileSync(p, code);
  console.log("Fixed adminStore.ts");
}
