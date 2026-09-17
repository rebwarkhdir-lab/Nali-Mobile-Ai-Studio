const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/components/common/DesignSettingsModal.tsx');
let code = fs.readFileSync(p, 'utf-8');

const effectCode = `
  React.useEffect(() => {
    setExchangeRateInput(settings.exchangeRate.toString());
  }, [settings.exchangeRate]);
`;

const insertPoint = "const [binSearchQuery, setBinSearchQuery] = useState<string>('');";
if (code.includes(insertPoint) && !code.includes("setExchangeRateInput(settings.exchangeRate.toString());")) {
  code = code.replace(insertPoint, insertPoint + "\n" + effectCode);
  fs.writeFileSync(p, code);
  console.log("Added exchangeRateInput useEffect");
}
