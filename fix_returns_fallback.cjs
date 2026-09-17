const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/lib/supplierService.ts');
let code = fs.readFileSync(p, 'utf-8');

const oldReturnsFallback = `    localStorage.setItem(RETURNS_STORAGE_KEY, JSON.stringify(INITIAL_RETURNS));
    try {
      await idb.put('app_settings', { key: RETURNS_STORAGE_KEY, value: INITIAL_RETURNS });
    } catch {}
    return INITIAL_RETURNS;`;

const newReturnsFallback = `    return [];`;

if (code.includes(oldReturnsFallback)) {
  code = code.replace(oldReturnsFallback, newReturnsFallback);
  fs.writeFileSync(p, code);
  console.log("Fixed supplierService returns fallback");
} else {
  console.log("Could not find returns fallback block");
}
