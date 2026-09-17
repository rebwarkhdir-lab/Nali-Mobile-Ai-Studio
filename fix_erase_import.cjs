const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/components/common/DesignSettingsModal.tsx');
let code = fs.readFileSync(p, 'utf-8');

if (!code.includes("import { supabase } from '../../lib/supabase';")) {
  code = code.replace("import { sound } from '../../lib/sound';", "import { sound } from '../../lib/sound';\nimport { supabase } from '../../lib/supabase';");
  
  // Also fix window.supabase to just supabase
  code = code.replace("if (window.supabase) {\n                                    await window.supabase.auth.signOut().catch(() => {});\n                                  }", "try { await supabase.auth.signOut(); } catch (e) {}");
  
  fs.writeFileSync(p, code);
  console.log("Added supabase import and fixed usage.");
}
