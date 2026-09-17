const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/components/common/DesignSettingsModal.tsx');
let code = fs.readFileSync(p, 'utf-8');

const states = `
  const [confirmResetSettings, setConfirmResetSettings] = useState(false);
  const [confirmFactoryReset, setConfirmFactoryReset] = useState(false);
  const [factoryResetText, setFactoryResetText] = useState('');
`;

const insertAfter = "const [isStorageCleanupOpen, setIsStorageCleanupOpen] = useState(false);";
if (code.includes(insertAfter)) {
  code = code.replace(insertAfter, insertAfter + "\n" + states);
}

fs.writeFileSync(p, code);
console.log('States added');
