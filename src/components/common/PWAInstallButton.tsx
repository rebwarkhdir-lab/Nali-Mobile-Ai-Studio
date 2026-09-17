import React, { useState } from 'react';
import { Download, Share, PlusSquare, Smartphone, X, CheckCircle2, Copy, Check } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [copied, setCopied] = useState(false);

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-aje5ynxorrjp35enpdo3wh-149769069644.europe-west2.run.app';

  const copyUrl = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // If already running inside standalone app mode, hide button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md transition-all active:scale-95"
        title="Install Nali Mobile as Standalone App"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-semibold shadow-sm transition-all active:scale-95"
          title="Install on iPhone Home Screen"
        >
          <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
          <span>Install on iPhone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Install on iPhone</h3>
                    <p className="text-[11px] text-slate-400">Run as a real standalone app</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 shrink-0">
                    <Share className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-white">1. Tap the Share button</p>
                    <p className="text-slate-400 mt-0.5">In the bottom toolbar of Apple Safari, tap the Share icon (square with arrow).</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-white">2. Select &quot;Add to Home Screen&quot;</p>
                    <p className="text-slate-400 mt-0.5">Scroll down the menu options and tap &quot;Add to Home Screen&quot;.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-white">3. Tap &quot;Add&quot; in top right</p>
                    <p className="text-slate-400 mt-0.5">Confirm by tapping Add. It will now launch full-screen without Safari browser bars.</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-2.5 rounded-lg bg-slate-800/80 border border-slate-700">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-300 truncate select-all font-mono">{appUrl}</span>
                  <button
                    onClick={copyUrl}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-medium shrink-0 transition"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 leading-relaxed">
                💡 <strong>Important:</strong> Must be opened in <strong>Apple Safari</strong> directly (not inside Telegram, WhatsApp, or Chrome for iOS).
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-lg"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
