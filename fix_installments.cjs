const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/lib/installmentService.ts');
let code = fs.readFileSync(p, 'utf-8');

const oldLogic = `  } catch (e) {
    console.warn('Failed to parse installments from localStorage:', e);
  }
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_SAMPLE_INSTALLMENTS));
  return INITIAL_SAMPLE_INSTALLMENTS;`;
  
const newLogic = `  } catch (e) {
    console.warn('Failed to parse installments from localStorage:', e);
  }
  return [];`;

if (code.includes(oldLogic)) {
  code = code.replace(oldLogic, newLogic);
}

// Remove the auto-seed logic:
const autoSeed = `          } else if (local && local.length > 0) {
            // Cloud table is empty, auto-seed with local data
            console.log('Seeding Supabase with local installments...');
            pushLocalInstallmentsToCloud(local).catch(console.warn);
            return local;
          }`;
          
const emptyLogic = `          } else if (local && local.length > 0) {
            // Wait, if local has data but cloud is empty, should we push?
            // Yes, because if they wipe CLOUD but not local, they want it.
            // But if they wiped both, local is [], so it won't trigger this.
            // But let's be safe and just return local.
            console.log('Seeding Supabase with local installments...');
            pushLocalInstallmentsToCloud(local).catch(console.warn);
            return local;
          }`;
          
// Actually, I don't need to touch the auto-seed if local is empty ([]).
// Because local && local.length > 0 will be false. So it will fall through to return [].

fs.writeFileSync(p, code);
console.log("Fixed installmentService.ts");
