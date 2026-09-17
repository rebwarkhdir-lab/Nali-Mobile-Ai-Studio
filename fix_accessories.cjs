const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/pages/Accessories.tsx');
let code = fs.readFileSync(p, 'utf-8');

// Remove import
code = code.replace("import { INITIAL_ACCESSORIES } from '../lib/initialData';", "");

// Replace fallback
const oldLogic = `      if (isMounted) {
        setAccessories(INITIAL_ACCESSORIES);
        setIsLoading(false);
      }`;
const newLogic = `      if (isMounted) {
        setAccessories([]);
        setIsLoading(false);
      }`;

if (code.includes(oldLogic)) {
  code = code.replace(oldLogic, newLogic);
  fs.writeFileSync(p, code);
  console.log("Fixed Accessories.tsx");
} else {
  console.log("Could not find logic in Accessories.tsx");
}
