const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/components/common/DesignSettingsModal.tsx');
let code = fs.readFileSync(p, 'utf-8');

// 1. Update the placeholder and validation
code = code.replace(/placeholder="Type CONFIRM"/g, 'placeholder="Type RESET-DATABASE"');
code = code.replace(/factoryResetText.trim\(\).toUpperCase\(\) !== 'CONFIRM'/g, "factoryResetText.trim().toUpperCase() !== 'RESET-DATABASE'");

// 2. Add full screen overlay for isErasing state
// We can wrap the Erase Selected Data button with something, or just put a full-screen overlay before the modal content if isErasing is true.
// The easiest is just putting it at the top of the return block of the modal.

fs.writeFileSync(p, code);
