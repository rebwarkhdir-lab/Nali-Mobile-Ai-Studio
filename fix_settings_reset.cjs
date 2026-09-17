const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/components/common/DesignSettingsModal.tsx');
let code = fs.readFileSync(p, 'utf-8');

const oldReturns = `                                  if (resetOptions.returns) {
                                    await truncate('supplier_returns');
                                    lsKeysToRemove.push('nali_supplier_returns_data', 'nali_pos_supplier_returns_v2');
                                    try { await idb.delete('app_settings', 'nali_supplier_returns_data'); } catch(e){}
                                    try { await supabase.from('settings').delete().eq('key', 'nali_supplier_returns_data'); } catch(e){}
                                  }`;

const newReturns = `                                  if (resetOptions.returns) {
                                    await truncate('supplier_returns');
                                    lsKeysToRemove.push('nali_supplier_returns_data', 'nali_pos_supplier_returns_v2');
                                    try { await idb.delete('app_settings', 'nali_supplier_returns_data'); } catch(e){}
                                    try { await supabase.from('settings').delete().eq('key', 'nali_supplier_returns_data'); } catch(e){}
                                  }`;

if (code.includes(oldReturns)) {
    // code = code.replace(oldReturns, newReturns);
}

fs.writeFileSync(p, code);
