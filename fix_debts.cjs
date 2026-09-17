const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/lib/debtService.ts');
let code = fs.readFileSync(p, 'utf-8');

const oldLogic = `  } catch (e) {
    console.warn('Failed to parse debts from localStorage:', e);
  }
  return INITIAL_SAMPLE_DEBTS;`;
const newLogic = `  } catch (e) {
    console.warn('Failed to parse debts from localStorage:', e);
  }
  return [];`;

if (code.includes(oldLogic)) {
  code = code.replace(oldLogic, newLogic);
  fs.writeFileSync(p, code);
  console.log("Fixed debtService.ts");
} else {
  console.log("Could not find debtService logic");
}
