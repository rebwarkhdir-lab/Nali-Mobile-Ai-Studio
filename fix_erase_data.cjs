const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/components/common/DesignSettingsModal.tsx');
let code = fs.readFileSync(p, 'utf-8');

// We need to add state for isErasing
const stateInsert = "const [factoryResetText, setFactoryResetText] = useState('');";
if (code.includes(stateInsert) && !code.includes("const [isErasing, setIsErasing] = useState(false);")) {
  code = code.replace(stateInsert, stateInsert + "\n  const [isErasing, setIsErasing] = useState(false);");
}

// Find the Erase Data button
const oldButton = `                            <button
                              type="button"
                              disabled={factoryResetText.trim().toUpperCase() !== 'CONFIRM'}
                              onClick={() => {
                                sound.playClick();
                                localStorage.clear();
                                window.location.reload();
                              }}
                              className="flex-1 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:hover:bg-rose-600 text-white text-xs font-bold transition-all shadow-md active:scale-95"
                            >
                              Erase Data
                            </button>`;

const newButton = `                            <button
                              type="button"
                              disabled={factoryResetText.trim().toUpperCase() !== 'CONFIRM' || isErasing}
                              onClick={async () => {
                                sound.playClick();
                                setIsErasing(true);
                                try {
                                  // 1. Clear all local and session storage
                                  localStorage.clear();
                                  sessionStorage.clear();
                                  
                                  // 2. Sign out of Supabase to prevent auto-resync
                                  if (window.supabase) {
                                    await window.supabase.auth.signOut().catch(() => {});
                                  }

                                  // 3. Delete IndexedDB
                                  const req = indexedDB.deleteDatabase('nali_pos_offline_db_v2');
                                  
                                  req.onsuccess = () => {
                                    window.location.replace('/');
                                  };
                                  req.onerror = () => {
                                    window.location.replace('/');
                                  };
                                  req.onblocked = () => {
                                    window.location.replace('/');
                                  };
                                  
                                  // Fallback timeout in case IDB blocks
                                  setTimeout(() => {
                                    window.location.replace('/');
                                  }, 1500);
                                } catch (e) {
                                  window.location.replace('/');
                                }
                              }}
                              className="flex-1 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:hover:bg-rose-600 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                            >
                              {isErasing ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : null}
                              <span>{isErasing ? 'Erasing...' : 'Erase Data'}</span>
                            </button>`;

if (code.includes(oldButton)) {
  code = code.replace(oldButton, newButton);
  console.log("Replaced Erase Data button successfully.");
} else {
  console.log("Could not find the Erase Data button.");
}

fs.writeFileSync(p, code);
