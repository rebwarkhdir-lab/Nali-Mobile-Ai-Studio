const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/components/common/DesignSettingsModal.tsx');
let code = fs.readFileSync(p, 'utf-8');

const oldReportsLogic = `                                  if (resetOptions.reports) {
                                    idbStoresToClear.push('pos_sales');
                                    lsKeysToRemove.push('nali_pos_sales_v1', 'nali_pos_sales_v2');
                                  }`;

const newReportsLogic = `                                  if (resetOptions.reports) {
                                    idbStoresToClear.push('pos_sales');
                                    lsKeysToRemove.push('nali_pos_sales_v1', 'nali_pos_sales_v2');
                                    try { await supabase.from('nali_mobiles').delete().eq('status', 'sold'); } catch(e){}
                                  }`;

if (code.includes(oldReportsLogic)) {
  code = code.replace(oldReportsLogic, newReportsLogic);
  fs.writeFileSync(p, code);
  console.log("Fixed reports wipe");
} else {
  console.log("Could not find reports wipe block");
}
