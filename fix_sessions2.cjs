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
    device_name: 'Main POS Terminal A',
    device_type: 'desktop',
    browser: 'Chrome 122 / MacOS',
    ip_address: '192.168.1.105',
    location: 'Erbil HQ',
    login_time: new Date().toISOString(),
    last_active: new Date().toISOString(),
    is_current: true,
    status: 'active'
  }
];`;

code = code.replace(/export const INITIAL_SESSIONS: DeviceSession\[\] = \[[\s\S]*?\];/g, correctSessions);
fs.writeFileSync(p, code);
