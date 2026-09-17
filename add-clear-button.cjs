const fs = require('fs');

const targets = [
  {
    file: 'src/components/common/CommandMenu.tsx',
    varName: 'query',
    setter: "setQuery('')"
  },
  {
    file: 'src/components/invoice/CustomerStatementModal.tsx',
    varName: 'customerQuery',
    setter: "setCustomerQuery('')"
  },
  {
    file: 'src/components/invoice/InvoicesListModal.tsx',
    varName: 'searchTerm',
    setter: "setSearchTerm('')"
  },
  {
    file: 'src/components/reports/InStockCostLedger.tsx',
    varName: 'searchTerm',
    setter: "setSearchTerm('')"
  },
  {
    file: 'src/components/screenProtector/ScreenProtectorFinderModal.tsx',
    varName: 'query',
    setter: "setQuery('')"
  },
  {
    file: 'src/components/stock-order/ManualOrderModal.tsx',
    varName: 'searchTerm',
    setter: "setSearchTerm('')"
  },
  {
    file: 'src/pages/BarcodeStudio.tsx',
    varName: 'batchSearchTerm',
    setter: "setBatchSearchTerm('')"
  },
  {
    file: 'src/pages/Debts.tsx',
    varName: 'searchTerm',
    setter: "setSearchTerm('')"
  },
  {
    file: 'src/pages/Installments.tsx',
    varName: 'searchTerm',
    setter: "setSearchTerm('')"
  },
  {
    file: 'src/pages/POS.tsx',
    varName: 'searchTerm',
    setter: "setSearchTerm('')"
  },
  {
    file: 'src/pages/Returns.tsx',
    varName: 'searchTerm',
    setter: "setSearchTerm('')"
  },
  {
    file: 'src/pages/ScreenProtectors.tsx',
    varName: 'searchQuery',
    setter: "setSearchQuery('')"
  },
  {
    file: 'src/pages/Suppliers.tsx',
    varName: 'searchTerm',
    setter: "setSearchTerm('')",
    secondVarName: 'returnSearchTerm',
    secondSetter: "setReturnSearchTerm('')"
  },
  {
    file: 'src/pages/admin/AdminDashboard.tsx',
    varName: 'searchQuery',
    setter: "setSearchQuery('')",
    secondVarName: 'auditSearch',
    secondSetter: "setAuditSearch('')"
  },
  {
    file: 'src/pages/admin/AuditLogs.tsx',
    varName: 'search',
    setter: "setSearch('')"
  },
  {
    file: 'src/pages/admin/RoleMatrix.tsx',
    varName: 'searchPerm',
    setter: "setSearchPerm('')"
  },
  {
    file: 'src/pages/admin/SecurityCenter.tsx',
    varName: 'searchSession',
    setter: "setSearchSession('')"
  },
  {
    file: 'src/pages/admin/Users.tsx',
    varName: 'search',
    setter: "setSearch('')"
  }
];

// Helper to inject the X icon import if missing
function ensureXImport(content) {
  if (content.includes(' X,')) return content;
  if (content.includes(' X }')) return content;
  
  // Try to find lucide-react import
  return content.replace(/import\s+\{([^}]*Search[^}]*)\}\s+from\s+['"]lucide-react['"];/, (match, group) => {
    if (group.includes('X')) return match;
    return "import { " + group + ", X } from 'lucide-react';";
  });
}

targets.forEach(({ file, varName, setter, secondVarName, secondSetter }) => {
  let content = fs.readFileSync(file, 'utf8');
  
  content = ensureXImport(content);

  // We need to replace the input and append the clear button.
  // The input looks like:
  // <input ... value={varName} ... />
  
  const regex = new RegExp("(<input[\\\\s\\\\S]*?value=\\{(?:" + varName + ")\\}[\\\\s\\\\S]*?className=\"[^\"]*?)(pe-[\\\\d\\\\.]+)([^\"]*?\"[\\\\s\\\\S]*?\\/>)", "g");
  
  content = content.replace(regex, (match, before, pe, after) => {
     const newPe = 'pe-9';
     
     const clearButton = "\n            {" + varName + " && (\n              <button \n                type=\"button\"\n                onClick={() => " + setter + "} \n                className=\"absolute end-2.5 inset-y-0 my-auto h-7 w-7 flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors cursor-pointer\"\n                title=\"Clear search\"\n              >\n                <X className=\"w-3.5 h-3.5\" />\n              </button>\n            )}";
            
     return before + newPe + after + clearButton;
  });

  if (secondVarName && secondSetter) {
    const regex2 = new RegExp("(<input[\\\\s\\\\S]*?value=\\{(?:" + secondVarName + ")\\}[\\\\s\\\\S]*?className=\"[^\"]*?)(pe-[\\\\d\\\\.]+)([^\"]*?\"[\\\\s\\\\S]*?\\/>)", "g");
    
    content = content.replace(regex2, (match, before, pe, after) => {
       const newPe = 'pe-9';
       const clearButton = "\n              {" + secondVarName + " && (\n                <button \n                  type=\"button\"\n                  onClick={() => " + secondSetter + "} \n                  className=\"absolute end-2.5 inset-y-0 my-auto h-7 w-7 flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors cursor-pointer\"\n                  title=\"Clear search\"\n                >\n                  <X className=\"w-3.5 h-3.5\" />\n                </button>\n              )}";
              
       return before + newPe + after + clearButton;
    });
  }

  fs.writeFileSync(file, content, 'utf8');
});

console.log("Added clear buttons");
