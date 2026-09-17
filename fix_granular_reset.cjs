const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/components/common/DesignSettingsModal.tsx');
let code = fs.readFileSync(p, 'utf-8');

// 1. Insert Reset Options State
const stateInsert = "const [factoryResetText, setFactoryResetText] = useState('');";
if (code.includes(stateInsert) && !code.includes("const [resetOptions, setResetOptions]")) {
  code = code.replace(stateInsert, stateInsert + `
  const [resetOptions, setResetOptions] = useState<Record<string, boolean>>({
    mobiles: true, accessories: true, debts: true, installments: true,
    suppliers: true, returns: true, screen_protectors: true, barcodes: true,
    reports: true, admin: false, settings: false, notifications: true
  });
`);
}

// 2. Define the RESET_CATEGORIES outside or inside
const categoriesCode = `
const RESET_CATEGORIES = [
  { id: 'mobiles', label: 'Mobile Devices' },
  { id: 'accessories', label: 'Accessories' },
  { id: 'debts', label: 'Customer Debts' },
  { id: 'installments', label: 'Installments' },
  { id: 'suppliers', label: 'Suppliers & Invoices' },
  { id: 'returns', label: 'Returns & Refunds' },
  { id: 'screen_protectors', label: 'Screen Protectors' },
  { id: 'barcodes', label: 'Barcode Studio' },
  { id: 'reports', label: 'Reports & Sales' },
  { id: 'admin', label: 'Staff & Roles' },
  { id: 'settings', label: 'Design Settings' },
  { id: 'notifications', label: 'Alerts & Audit Logs' },
];
`;

if (!code.includes("RESET_CATEGORIES")) {
  code = code.replace("export default function DesignSettingsModal", categoriesCode + "\nexport default function DesignSettingsModal");
}

// 3. Replace the Erase block
const oldEraseBlockRegex = /\{\/\* Factory Reset \*\/\}.*?(?=\{\/\* TAB: RECYCLE BIN & RECOVERY \*\/\})/s;

const newEraseBlock = `{/* Factory Reset */}
                    <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/50 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="text-sm font-bold text-rose-300">Selective Data Wipe</div>
                        <p className="text-xs text-rose-400/70 mt-1">Permanently erase selected application data and sync it with the cloud. This cannot be undone.</p>
                      </div>
                      
                      {confirmFactoryReset ? (
                        <div className="flex flex-col gap-3 animate-in fade-in zoom-in duration-200 p-3 bg-rose-950/40 rounded-xl border border-rose-900/50">
                          <div className="flex items-start gap-2 text-rose-400 mb-2">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <p className="text-xs leading-relaxed">
                              Select the modules you want to completely erase from the cloud and local storage:
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 mb-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                            {RESET_CATEGORIES.map(cat => (
                              <label key={cat.id} className="flex items-center gap-2 p-2 rounded-lg bg-[#0a0f18]/50 border border-rose-900/30 cursor-pointer hover:bg-rose-900/20 transition-colors">
                                <input 
                                  type="checkbox" 
                                  checked={!!resetOptions[cat.id]}
                                  onChange={() => setResetOptions(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                                  className="accent-rose-500 w-3 h-3"
                                />
                                <span className="text-[10px] font-bold text-rose-200">{cat.label}</span>
                              </label>
                            ))}
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
                              disabled={factoryResetText.trim().toUpperCase() !== 'CONFIRM' || isErasing || !Object.values(resetOptions).some(v => v)}
                              onClick={async () => {
                                sound.playClick();
                                setIsErasing(true);
                                try {
                                  const truncate = async (table: string) => {
                                    try { await supabase.from(table).delete().not('id', 'is', null); } catch(e){}
                                  };
                                  const delKey = async (key: string) => {
                                    try { await supabase.from('settings').delete().eq('key', key); } catch(e){}
                                    localStorage.removeItem(key);
                                  };

                                  const idbStoresToClear = [];
                                  const lsKeysToRemove = [];

                                  if (resetOptions.mobiles) {
                                    await truncate('nali_mobiles');
                                    idbStoresToClear.push('mobiles'); lsKeysToRemove.push('nali_mobiles_cache', 'nali_mobiles_data_v2');
                                  }
                                  if (resetOptions.accessories) {
                                    await truncate('nali_accessories');
                                    idbStoresToClear.push('accessories'); lsKeysToRemove.push('nali_accessories_cache', 'nali_accessories_data_v2');
                                  }
                                  if (resetOptions.debts) {
                                    await truncate('nali_debts'); await truncate('nali_debt_payments');
                                    idbStoresToClear.push('debts'); lsKeysToRemove.push('nali_debts_data', 'nali_pos_debts_v2');
                                  }
                                  if (resetOptions.installments) {
                                    await truncate('nali_installments'); await truncate('nali_installment_payments');
                                    idbStoresToClear.push('installments'); lsKeysToRemove.push('nali_installments_data', 'nali_pos_installments_v2');
                                  }
                                  if (resetOptions.suppliers) {
                                    await truncate('suppliers'); await truncate('supplier_invoices'); await truncate('supplier_payments');
                                    idbStoresToClear.push('suppliers'); lsKeysToRemove.push('nali_pos_suppliers_v2', 'nali_pos_supplier_invoices_v2', 'nali_pos_supplier_payments_v2');
                                  }
                                  if (resetOptions.returns) {
                                    await truncate('supplier_returns');
                                    lsKeysToRemove.push('nali_supplier_returns_data', 'nali_pos_supplier_returns_v2');
                                  }
                                  if (resetOptions.screen_protectors) {
                                    await delKey('nali_screen_protectors_groups_v1');
                                    lsKeysToRemove.push('nali_screen_protectors_history_v1');
                                  }
                                  if (resetOptions.barcodes) {
                                    await delKey('nali_pos_barcode_settings');
                                  }
                                  if (resetOptions.reports) {
                                    idbStoresToClear.push('pos_sales');
                                    lsKeysToRemove.push('nali_pos_sales_v1', 'nali_pos_sales_v2');
                                  }
                                  if (resetOptions.admin) {
                                    await truncate('profiles'); await truncate('roles'); await truncate('permissions'); await truncate('role_permissions');
                                    await delKey('nali_pos_admin_staff_v1'); await delKey('nali_pos_admin_roles_v1'); await delKey('nali_pos_admin_role_perms_v1');
                                  }
                                  if (resetOptions.notifications) {
                                    await truncate('notifications'); await truncate('notification_references'); await truncate('audit_logs');
                                    await delKey('nali_pos_notifications_v2'); await delKey('nali_pos_notification_prefs_v1'); await delKey('nali_admin_audit_logs');
                                  }
                                  if (resetOptions.settings) {
                                    await delKey('nali_design_settings_v2');
                                    lsKeysToRemove.push('nali_exchange_rate');
                                  }

                                  // Clear IDB
                                  for (const s of idbStoresToClear) {
                                    try { await idb.clear(s as any); } catch(e){}
                                  }
                                  // Clear LS
                                  for (const k of lsKeysToRemove) {
                                    localStorage.removeItem(k);
                                  }

                                  // Always clear recycle bin
                                  try { await idb.clear('recycle_bin'); } catch(e){}
                                  try { await supabase.from('settings').delete().like('key', '%recycle_bin%'); } catch(e){}
                                  localStorage.removeItem('nali_recycle_bin_v1');
                                  
                                  // If settings or admin were wiped, completely reset IDB and signOut
                                  if (resetOptions.admin || resetOptions.settings) {
                                    try { await supabase.auth.signOut(); } catch (e) {}
                                    try { await idb.factoryReset(); } catch(e){}
                                  }

                                  setTimeout(() => {
                                    window.location.replace('/');
                                  }, 500);

                                } catch (e) {
                                  console.error(e);
                                  window.location.replace('/');
                                }
                              }}
                              className="flex-1 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:hover:bg-rose-600 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                            >
                              {isErasing ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : null}
                              <span>{isErasing ? 'Erasing...' : 'Erase Selected Data'}</span>
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
                          <span>Selective Data Wipe</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

`;

if (oldEraseBlockRegex.test(code)) {
  code = code.replace(oldEraseBlockRegex, newEraseBlock);
  fs.writeFileSync(p, code);
  console.log("Successfully injected selective reset block.");
} else {
  console.log("Failed to match erase block.");
}

