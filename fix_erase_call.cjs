const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/components/common/DesignSettingsModal.tsx');
let code = fs.readFileSync(p, 'utf-8');

const oldCall = `
                                  // 3. Delete IndexedDB
                                  const req = indexedDB.deleteDatabase('nali_pos_offline_db_v2');
                                  
                                  req.onsuccess = () => {
                                    window.location.replace('/');
                                  };
                                  req.onerror = () => {
                                    window.location.replace('/');
                                  };
                                  req.onblocked = () => {
                                    window.location.replace('/');
                                  };
`;

const newCall = `
                                  // 3. Safely Delete IndexedDB via idbService
                                  try {
                                    await idb.factoryReset();
                                  } catch (err) {
                                    console.error('Factory reset error:', err);
                                  }
                                  
                                  setTimeout(() => {
                                    window.location.replace('/');
                                  }, 500);
`;

if (code.includes("const req = indexedDB.deleteDatabase('nali_pos_offline_db_v2');")) {
  code = code.replace(oldCall, newCall);
  
  // Also ensure idb is imported
  if (!code.includes("import { idb } from '../../lib/idbService';")) {
    code = code.replace("import { supabase } from '../../lib/supabase';", "import { supabase } from '../../lib/supabase';\nimport { idb } from '../../lib/idbService';");
  }
  
  fs.writeFileSync(p, code);
  console.log("Updated Factory Reset to use idb.factoryReset()");
} else {
  console.log("Could not find oldCall block.");
}
