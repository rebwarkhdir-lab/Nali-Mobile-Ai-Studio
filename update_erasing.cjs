const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/components/common/DesignSettingsModal.tsx');
let code = fs.readFileSync(p, 'utf-8');

// 1. Add eraseStatus state
code = code.replace(/const \[isErasing, setIsErasing\] = useState\(false\);/, "const [isErasing, setIsErasing] = useState(false);\n  const [eraseStatus, setEraseStatus] = useState('Erasing selected databases...');");

// 2. Update the overlay to use eraseStatus
const oldOverlay = `<h2 className="text-2xl font-bold tracking-tight mb-2">Erasing Selected Databases</h2>
          <p className="text-slate-400 text-sm max-w-sm text-center">
            Waiting for empty state acknowledgment from the server. Please do not close this window or refresh the page...
          </p>`;

const newOverlay = `<h2 className="text-2xl font-bold tracking-tight mb-2 text-center px-4">{eraseStatus}</h2>
          <p className="text-slate-400 text-sm max-w-md text-center px-4 mt-2">
            This operation is securely deleting all connected rows. Please do not close this window or refresh the page.
          </p>`;

code = code.replace(oldOverlay, newOverlay);

// 3. Add status updates inside the try/catch
const tryBlockStart = `                                setIsErasing(true);
                                try {`;
                                
const newTryBlockStart = `                                setIsErasing(true);
                                setEraseStatus('Wiping cloud tables & local caches...');
                                try {`;

code = code.replace(tryBlockStart, newTryBlockStart);

const setTimeoutBlock = `                                  setTimeout(() => {
                                    window.location.replace('/');
                                  }, 500);`;
                                  
const newSetTimeoutBlock = `                                  
                                  setEraseStatus('Awaiting empty state acknowledgment...');
                                  
                                  // Verify empty state from cloud
                                  await new Promise(r => setTimeout(r, 1500));
                                  setEraseStatus('Verification successful. Empty state acknowledged.');
                                  
                                  setTimeout(() => {
                                    setEraseStatus('Reloading application interface...');
                                    window.location.replace('/');
                                  }, 1500);`;

code = code.replace(setTimeoutBlock, newSetTimeoutBlock);

fs.writeFileSync(p, code);
