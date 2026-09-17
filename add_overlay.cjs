const fs = require('fs');
const path = require('path');

const p = path.join(process.cwd(), 'src/components/common/DesignSettingsModal.tsx');
let code = fs.readFileSync(p, 'utf-8');

const returnStatement = `  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[95] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">`;

const overlayCode = `  return (
    <>
      {isErasing && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center text-white">
          <div className="w-16 h-16 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin mb-6 shadow-[0_0_30px_rgba(244,63,94,0.3)]" />
          <h2 className="text-2xl font-bold tracking-tight mb-2">Erasing Selected Databases</h2>
          <p className="text-slate-400 text-sm max-w-sm text-center">
            Waiting for empty state acknowledgment from the server. Please do not close this window or refresh the page...
          </p>
        </div>
      )}
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[95] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">`;

if (code.includes(returnStatement)) {
    code = code.replace(returnStatement, overlayCode);
}

// Add the closing `</>` for the fragment at the end.
const endOfModal = `    </div>
  );
}`;

const endOfModalReplacement = `    </div>
    </>
  );
}`;

if (code.includes(endOfModal)) {
    code = code.replace(endOfModal, endOfModalReplacement);
}

fs.writeFileSync(p, code);
