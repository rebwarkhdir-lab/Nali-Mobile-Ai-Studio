const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/pages/POS.tsx');
let code = fs.readFileSync(p, 'utf-8');

// Remove import
code = code.replace("import { INITIAL_MOBILES, INITIAL_ACCESSORIES } from '../lib/initialData';", "");

// Replace fallback
code = code.replace("setMobiles(INITIAL_MOBILES.filter(m => m.status === 'in_stock'));", "setMobiles([]);");
code = code.replace("setAccessories(INITIAL_ACCESSORIES.filter(a => a.quantity > 0));", "setAccessories([]);");
code = code.replace("setMobiles(INITIAL_MOBILES.filter(m => m.status === 'in_stock'));", "setMobiles([]);");
code = code.replace("setAccessories(INITIAL_ACCESSORIES.filter(a => a.quantity > 0));", "setAccessories([]);");

fs.writeFileSync(p, code);
console.log("Fixed POS.tsx");
