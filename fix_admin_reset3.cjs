const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/pages/admin/adminStore.ts');
let code = fs.readFileSync(p, 'utf-8');

// There is one last place where the admin system might inject hardcoded data:
// if local storage is completely wiped, it calls getStoredStaff() which returns INITIAL_STAFF.
// If the app completely resets, INITIAL_STAFF is still there in the code, injecting 'usr-001'.
// BUT earlier we modified INITIAL_STAFF to just have usr-001. So there should only be ONE user (the admin).
// Is there any other place?
// Let's check getStoredAuditLogs()
const logsRegex = /export const INITIAL_AUDIT_LOGS: AuditLog\[\] = \[([\s\S]*?)\];/;
const m = code.match(logsRegex);
console.log("Audit Logs size:", m ? m[1].length : "not found");

