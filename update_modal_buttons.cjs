const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/components/common/DesignSettingsModal.tsx');
let code = fs.readFileSync(p, 'utf-8');

// Replace the Reset Settings block
const oldResetSettings = `
                    <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="text-sm font-bold text-white">Reset to Default</div>
                        <p className="text-xs text-slate-400 mt-1">Revert all design settings (colors, themes, density) back to their original state.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to reset all design settings to default?')) {
                            sound.playClick();
                            resetToDefaults();
                            success('Design settings reset to default');
                          }
                        }}
                        className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Reset Settings</span>
                      </button>
                    </div>`;

const newResetSettings = `
                    {/* Reset Settings */}
                    <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col justify-between space-y-3">
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

// Replace the Factory Reset block
const oldFactoryReset = `
                    <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/50 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="text-sm font-bold text-rose-300">Factory Reset</div>
                        <p className="text-xs text-rose-400/70 mt-1">Permanently erase all application data, invoices, and settings. This cannot be undone.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('WARNING: Are you absolutely sure you want to factory reset? All data will be permanently lost!')) {
                            if (window.confirm('Final Confirmation: Type OK to proceed with factory reset.')) {
                              sound.playClick();
                              localStorage.clear();
                              window.location.reload();
                            }
                          }
                        }}
                        className="w-full py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-rose-900/40 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Factory Reset</span>
                      </button>
                    </div>`;

const newFactoryReset = `
                    {/* Factory Reset */}
                    <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/50 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="text-sm font-bold text-rose-300">Factory Reset</div>
                        <p className="text-xs text-rose-400/70 mt-1">Permanently erase all application data, invoices, and settings. This cannot be undone.</p>
                      </div>
                      
                      {confirmFactoryReset ? (
                        <div className="flex flex-col gap-3 animate-in fade-in zoom-in duration-200 p-3 bg-rose-950/40 rounded-xl border border-rose-900/50">
                          <div className="flex items-start gap-2 text-rose-400">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <p className="text-xs leading-relaxed">
                              This will irreversibly delete all local data. Type <strong className="text-white select-none">CONFIRM</strong> below to proceed.
                            </p>
                          </div>
                          <input
                            type="text"
                            value={factoryResetText}
                            onChange={(e) => setFactoryResetText(e.target.value)}
                            placeholder="Type CONFIRM"
                            className="w-full bg-[#0a0f18] border border-rose-900/50 rounded-lg px-3 py-2 text-xs text-rose-200 placeholder:text-rose-900 focus:outline-none focus:border-rose-500 transition-colors uppercase"
                          />
                          <div className="flex items-center gap-2 pt-1">
                            <button
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
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmFactoryReset(false);
                                setFactoryResetText('');
                              }}
                              className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmFactoryReset(true)}
                          className="w-full py-2 px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-600/30 text-rose-400 hover:text-rose-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Factory Reset</span>
                        </button>
                      )}
                    </div>`;

// Strip out existing blocks safely by matching substrings
const rxReset = /<div className="p-4 rounded-2xl bg-slate-900\/40 border border-slate-800 flex flex-col justify-between space-y-3">[\s\S]*?Reset Settings<\/span>\s*<\/button>\s*<\/div>/;
const rxFactory = /<div className="p-4 rounded-2xl bg-rose-950\/20 border border-rose-900\/50 flex flex-col justify-between space-y-3">[\s\S]*?Factory Reset<\/span>\s*<\/button>\s*<\/div>/;

if (rxReset.test(code)) {
  code = code.replace(rxReset, newResetSettings);
  console.log("Replaced Reset Settings");
} else {
  console.log("Could not match Reset Settings block");
}

if (rxFactory.test(code)) {
  code = code.replace(rxFactory, newFactoryReset);
  console.log("Replaced Factory Reset");
} else {
  console.log("Could not match Factory Reset block");
}

fs.writeFileSync(p, code);
