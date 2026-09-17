const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/pages/admin/adminStore.ts');
let code = fs.readFileSync(p, 'utf-8');

const staffRegex = /export const INITIAL_STAFF: AdminUser\[\] = \[([\s\S]*?)\];/;
const staffMatch = code.match(staffRegex);
if (staffMatch) {
  const usr1Match = staffMatch[1].match(/\{\s*id:\s*'usr-001'[\s\S]*?\},/);
  if (usr1Match) {
    code = code.replace(staffRegex, "export const INITIAL_STAFF: AdminUser[] = [\n  " + usr1Match[0] + "\n];");
  }
}

const sessionsRegex = /export const INITIAL_SESSIONS: DeviceSession\[\] = \[([\s\S]*?)\];/;
const sessionsMatch = code.match(sessionsRegex);
if (sessionsMatch) {
  const usr1Session = sessionsMatch[1].match(/\{\s*id:\s*'sess-01'[\s\S]*?\},/);
  if (usr1Session) {
    code = code.replace(sessionsRegex, "export const INITIAL_SESSIONS: DeviceSession[] = [\n  " + usr1Session[0] + "\n];");
  } else {
    code = code.replace(sessionsRegex, "export const INITIAL_SESSIONS: DeviceSession[] = [];");
  }
}

const logsRegex = /export const INITIAL_AUDIT_LOGS: AuditLog\[\] = \[([\s\S]*?)\];/;
code = code.replace(logsRegex, "export const INITIAL_AUDIT_LOGS: AuditLog[] = [];");

const credsRegex = /const DEFAULT_CREDENTIALS: Record<string, any> = \{([\s\S]*?)\};/;
code = code.replace(credsRegex, "const DEFAULT_CREDENTIALS: Record<string, any> = {\n  'usr-001': { userId: 'usr-001', password: 'admin123', pin: '1234' }\n};");

fs.writeFileSync(p, code);
console.log("Fixed admin dummy users");
