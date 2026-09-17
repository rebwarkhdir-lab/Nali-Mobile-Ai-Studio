const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/components/common/DesignSettingsModal.tsx');
let code = fs.readFileSync(p, 'utf-8');

const returnsResetOld = `                                  if (resetOptions.returns) {
                                    await truncate('supplier_returns');
                                    lsKeysToRemove.push('nali_supplier_returns_data', 'nali_pos_supplier_returns_v2');
                                    try { await idb.delete('app_settings', 'nali_supplier_returns_data'); } catch(e){}
                                    try { await supabase.from('settings').delete().eq('key', 'nali_supplier_returns_data'); } catch(e){}
                                  }`;

const returnsResetNew = `                                  if (resetOptions.returns) {
                                    await truncate('supplier_returns');
                                    lsKeysToRemove.push('nali_supplier_returns_data', 'nali_pos_supplier_returns_v2', 'nali_pos_supplier_returns_v1');
                                    try { await idb.delete('app_settings', 'nali_supplier_returns_data'); } catch(e){}
                                    try { await supabase.from('settings').delete().eq('key', 'nali_supplier_returns_data'); } catch(e){}
                                    try { await supabase.from('settings').delete().like('key', 'nali_pos_supplier_returns%'); } catch(e){}
                                    try { await supabase.from('settings').delete().like('key', '%supplier_returns%'); } catch(e){}
                                  }`;

if (code.includes(returnsResetOld)) {
    code = code.replace(returnsResetOld, returnsResetNew);
} else {
    console.log("Could not find returns reset block.");
}

fs.writeFileSync(p, code);
