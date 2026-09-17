const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/pages/admin/adminStore.ts');
let code = fs.readFileSync(p, 'utf-8');

const oldCreds = `    'usr-001': { userId: 'usr-001', password: 'admin123', pin: '1234' },
    'usr-002': { userId: 'usr-002', password: 'cashier123', pin: '1234' },
    'usr-003': { userId: 'usr-003', password: 'manager123', pin: '1234' },
    'usr-004': { userId: 'usr-004', password: 'repair123', pin: '1234' },
    'usr-005': { userId: 'usr-005', password: 'stock123', pin: '1234' },
    'usr-006': { userId: 'usr-006', password: 'cashier123', pin: '1234' }`;

const newCreds = `    'usr-001': { userId: 'usr-001', password: 'admin123', pin: '1234' }`;

if (code.includes(oldCreds)) {
  code = code.replace(oldCreds, newCreds);
  fs.writeFileSync(p, code);
  console.log("Fixed dummy creds");
}

