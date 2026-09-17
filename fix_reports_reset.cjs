const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/components/common/DesignSettingsModal.tsx');
let code = fs.readFileSync(p, 'utf-8');

const reportsResetOld = `                                  if (resetOptions.reports) {
                                    idbStoresToClear.push('pos_sales');
                                    lsKeysToRemove.push('nali_pos_sales_v1', 'nali_pos_sales_v2', 'nali_mobiles_cache', 'nali_mobiles_data_v2', 'nali_accessories_cache', 'nali_accessories_inventory_v1');
                                    try { await supabase.from('nali_mobiles').delete().eq('status', 'sold'); } catch(e){}
                                    try { await supabase.from('nali_accessories').update({ totalSold: 0 }).neq('id', 'null'); } catch(e){}
                                    try { 
                                      const allMobs = await idb.getAll('mobiles');
                                      for (const m of allMobs) { if (m.status === 'sold') await idb.delete('mobiles', m.id); }
                                    } catch(e){}
                                    try { 
                                      const allAcc = await idb.getAll('accessories');
                                      for (const a of allAcc) { await idb.put('accessories', { ...a, totalSold: 0 }); }
                                    } catch(e){}
                                  }`;

const reportsResetNew = `                                  if (resetOptions.reports) {
                                    idbStoresToClear.push('pos_sales');
                                    lsKeysToRemove.push('nali_pos_sales_v1', 'nali_pos_sales_v2', 'nali_mobiles_cache', 'nali_mobiles_data_v2', 'nali_accessories_cache', 'nali_accessories_inventory_v1');
                                    try { await supabase.from('nali_mobiles').delete().eq('status', 'sold'); } catch(e){}
                                    try { await supabase.from('nali_accessories').update({ totalSold: 0 }).neq('id', 'null'); } catch(e){}
                                    try { await supabase.from('pos_sales').delete().not('id', 'is', null); } catch(e){}
                                    try { await supabase.from('settings').delete().like('key', 'nali_pos_sales%'); } catch(e){}
                                    try { 
                                      const allMobs = await idb.getAll('mobiles');
                                      for (const m of allMobs) { if (m.status === 'sold') await idb.delete('mobiles', m.id); }
                                    } catch(e){}
                                    try { 
                                      const allAcc = await idb.getAll('accessories');
                                      for (const a of allAcc) { await idb.put('accessories', { ...a, totalSold: 0 }); }
                                    } catch(e){}
                                  }`;

if (code.includes(reportsResetOld)) {
    code = code.replace(reportsResetOld, reportsResetNew);
} else {
    console.log("Could not find reports reset block.");
}

fs.writeFileSync(p, code);
