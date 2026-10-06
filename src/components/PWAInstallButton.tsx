import React, { useState } from 'react';
import { Download, Smartphone, X, Share, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running inside an installed PWA standalone instance, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 active:scale-95 text-xs font-medium transition cursor-pointer"
        title="Install Velocity app to home screen"
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 hover:bg-slate-700/60 active:scale-95 text-xs font-medium transition cursor-pointer"
          title="How to install on iOS Safari"
        >
          <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl relative">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base">Install on iPhone / iPad</h3>
                  <p className="text-xs text-slate-400">Runs full-screen like a native app</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-300 mb-6 bg-slate-800/50 p-4 rounded-xl border border-slate-800">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                  <span>Tap the <strong className="text-white flex inline-flex items-center gap-1">Share <Share className="w-3.5 h-3.5 inline text-cyan-400" /></strong> button in Safari's bottom toolbar.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                  <span>Scroll down and select <strong className="text-white flex inline-flex items-center gap-1">Add to Home Screen <PlusSquare className="w-3.5 h-3.5 inline text-cyan-400" /></strong>.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                  <span>Tap <strong>Add</strong> in the top-right corner to finish.</span>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition"
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
