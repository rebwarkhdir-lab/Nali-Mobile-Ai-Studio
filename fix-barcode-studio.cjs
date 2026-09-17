const fs = require('fs');
let content = fs.readFileSync('src/pages/BarcodeStudio.tsx', 'utf8');

const regex = /\{\/\*\s*Quick Action Buttons\s*\*\/\}[\s\S]*?<div className="w-full space-y-2 mt-4">\s*<\/div>\s*\{\/\*\s*Category Filter\s*\*\/\}/;

const replacement = `{/* Quick Action Buttons */}
                    <div className="w-full space-y-2 mt-4">
                      <button
                        type="button"
                        onClick={handlePrint}
                        disabled={!singleItemData || isPrinting}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Print Current Label</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: BATCH PRINTING */}
            {activeTab === 'batch' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                  {/* Search Bar */}
                  <div className="relative w-full sm:w-96 flex items-center">
                    <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none">
                      <Search className="w-4 h-4 text-slate-500" />
                    </div>
                    <input
                      type="search"
                      placeholder="Search items for batch print..."
                      value={batchSearchTerm}
                      onChange={(e) => setBatchSearchTerm(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 ps-10 pe-9 text-xs text-white placeholder-slate-500 focus:border-cyan-500"
                    />
                  </div>
                  {/* Category Filter */}`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('src/pages/BarcodeStudio.tsx', content, 'utf8');
  console.log('Fixed BarcodeStudio.tsx');
} else {
  console.log('Target not found');
}
