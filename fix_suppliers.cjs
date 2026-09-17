const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/lib/supplierService.ts');
let code = fs.readFileSync(p, 'utf-8');

// We just remove the auto-seed loop in supplierService
const autoSeedLogic = `        // If both empty, seed initial suppliers
        for (const s of INITIAL_SUPPLIERS) {
          try {
            await supabase.from('suppliers').upsert(mapSupplierToDb(s));
          } catch {}
        }
        await supabase.from('settings').upsert({ key: SUPPLIERS_STORAGE_KEY, value: INITIAL_SUPPLIERS as any }, { onConflict: 'key' });
        localStorage.setItem(SUPPLIERS_STORAGE_KEY, JSON.stringify(INITIAL_SUPPLIERS));
        return INITIAL_SUPPLIERS;`;

const emptyLogic = `        // If both empty, return empty
        localStorage.setItem(SUPPLIERS_STORAGE_KEY, JSON.stringify([]));
        return [];`;

if (code.includes(autoSeedLogic)) {
  code = code.replace(autoSeedLogic, emptyLogic);
  
  // also fix fallback at bottom of getSuppliers
  const fallback = `    localStorage.setItem(SUPPLIERS_STORAGE_KEY, JSON.stringify(INITIAL_SUPPLIERS));
    return INITIAL_SUPPLIERS;`;
  const newFallback = `    return [];`;
  code = code.replace(fallback, newFallback);
  
  fs.writeFileSync(p, code);
  console.log("Fixed supplier auto-seeding");
} else {
  console.log("Could not find auto-seed in supplierService");
}
