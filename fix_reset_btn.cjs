const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/components/common/DesignSettingsModal.tsx');
let code = fs.readFileSync(p, 'utf-8');

const rxReset = /<div className="p-4 rounded-2xl bg-slate-900\/60 border border-slate-800 flex flex-col justify-between space-y-3">[\s\S]*?Reset Settings<\/span>\s*<\/button>\s*<\/div>/;

const newResetSettings = `
                    {/* Reset to Default */}
                    <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="text-sm font-bold text-white">Reset to Default</div>
                        <p className="text-xs text-slate-400 mt-1">Revert all design settings (colors, themes, density) back to their original state.</p>
                      </div>
                      
                      {confirmResetSettings ? (
                        <div className="flex flex-col gap-2 animate-in fade-in zoom-in duration-200">
                          <p className="text-xs text-amber-400 font-medium text-center">Are you sure?</p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                sound.playClick();
                                resetToDefaults();
                                success('Design settings reset to default');
                                setConfirmResetSettings(false);
                              }}
                              className="flex-1 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-xs font-bold border border-amber-500/20 transition-colors"
                            >
                              Yes, Reset
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmResetSettings(false)}
                              className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmResetSettings(true)}
                          className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Reset Settings</span>
                        </button>
                      )}
                    </div>`;

if (rxReset.test(code)) {
  code = code.replace(rxReset, newResetSettings);
  console.log("Replaced Reset Settings");
} else {
  console.log("Could not match Reset Settings block");
}

fs.writeFileSync(p, code);
