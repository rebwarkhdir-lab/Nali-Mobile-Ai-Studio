const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/lib/supplierService.ts');
let code = fs.readFileSync(p, 'utf-8');

const oldInvoices = `    localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(INITIAL_INVOICES));
    return INITIAL_INVOICES;`;
const newInvoices = `    return [];`;

const oldPayments = `    localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(INITIAL_PAYMENTS));
    return INITIAL_PAYMENTS;`;
const newPayments = `    return [];`;

const oldReturns = `    localStorage.setItem(RETURNS_STORAGE_KEY, JSON.stringify(INITIAL_RETURNS));
    return INITIAL_RETURNS;`;
const newReturns = `    return [];`;

code = code.replace(oldInvoices, newInvoices);
code = code.replace(oldPayments, newPayments);
code = code.replace(oldReturns, newReturns);

// Check if any auto-seed logic exists for invoices, payments, returns:
const autoSeedInvoices = `        for (const inv of INITIAL_INVOICES) {
          try {
            await supabase.from('supplier_invoices').upsert(mapInvoiceToDb(inv));
          } catch {}
        }`;
code = code.replace(autoSeedInvoices, '');

const autoSeedPayments = `        for (const pay of INITIAL_PAYMENTS) {
          try {
            await supabase.from('supplier_payments').upsert(mapPaymentToDb(pay));
          } catch {}
        }`;
code = code.replace(autoSeedPayments, '');

const autoSeedReturns = `        for (const ret of INITIAL_RETURNS) {
          try {
            await supabase.from('supplier_returns').upsert(mapReturnToDb(ret));
          } catch {}
        }`;
code = code.replace(autoSeedReturns, '');

fs.writeFileSync(p, code);
console.log("Fixed supplierService completely");
