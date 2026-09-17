const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/pages/admin/adminStore.ts');
let code = fs.readFileSync(p, 'utf-8');

const correctSessions = `export const INITIAL_SESSIONS: DeviceSession[] = [
  {
    id: 'sess-01',
    user_id: 'usr-001',
    user_name: 'Nali Admin',
    user_role: 'Administrator',
    device_info: 'Chrome on Mac OS X',
    ip_address: '192.168.1.100',
    started_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    last_active_at: new Date().toISOString(),
    is_current: true,
    status: 'active'
  }
];`;

code = code.replace(/export const INITIAL_SESSIONS: DeviceSession\[\] = \[[\s\S]*?\];/g, correctSessions);
fs.writeFileSync(p, code);
