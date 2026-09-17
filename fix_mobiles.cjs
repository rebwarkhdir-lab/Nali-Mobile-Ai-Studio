const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/pages/Mobiles.tsx');
let code = fs.readFileSync(p, 'utf-8');

// Remove the import of INITIAL_MOBILES
code = code.replace("import { INITIAL_MOBILES } from '../lib/initialData';", "");

// Replace the fallback logic
const oldLogic = `      // 3. Default to initial sample mobiles
      if (isMounted) {
        setMobiles(INITIAL_MOBILES);
        setIsLoading(false);
      }`;

const newLogic = `      // 3. Default to empty array if no data found
      if (isMounted) {
        setMobiles([]);
        setIsLoading(false);
      }`;

if (code.includes(oldLogic)) {
  code = code.replace(oldLogic, newLogic);
  fs.writeFileSync(p, code);
  console.log("Fixed Mobiles.tsx");
} else {
  console.log("Could not find the fallback logic in Mobiles.tsx");
}
