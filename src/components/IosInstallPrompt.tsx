import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share, PlusSquare, X } from 'lucide-react';

export default function IosInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Detect iOS
    const isIos = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };

    // Detect if already installed as PWA on iOS
    const isStandalone = () => {
      return ('standalone' in window.navigator) && (window.navigator as any).standalone === true;
    };

    // Check if user previously dismissed
    const hasDismissed = localStorage.getItem('iosInstallPromptDismissed') === 'true';

    if (isIos() && !isStandalone() && !hasDismissed) {
      setShowPrompt(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('iosInstallPromptDismissed', 'true');
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-[200] p-4 pb-8 bg-white border-t border-neutral-100 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] rounded-t-3xl"
        >
          <div className="max-w-[400px] mx-auto relative">
            <button
              onClick={handleDismiss}
              className="absolute -top-1 -right-1 p-2 text-neutral-400 hover:text-neutral-600 focus:outline-none"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
            
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#FF8A00] to-[#E07A00] rounded-2xl flex-shrink-0 shadow-lg flex items-center justify-center">
                <img src="/icon-192x192.png" alt="Kundli Nova" className="w-10 h-10 rounded-xl" />
              </div>
              <div>
                <h3 className="text-[15px] font-black text-neutral-900 tracking-tight leading-tight mb-1">
                  Install Kundli Nova
                </h3>
                <p className="text-[12px] font-medium text-neutral-500 leading-snug">
                  Add to your home screen for full-screen experience and offline access.
                </p>
              </div>
            </div>

            <div className="mt-5 bg-neutral-50 rounded-2xl p-4 border border-neutral-100/80">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0 text-neutral-400 border border-neutral-100">
                  <Share size={12} strokeWidth={2.5} />
                </div>
                <span className="text-[13px] font-semibold text-neutral-700">
                  1. Tap the <span className="font-bold text-blue-500">Share</span> button below
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0 text-neutral-400 border border-neutral-100">
                  <PlusSquare size={12} strokeWidth={2.5} />
                </div>
                <span className="text-[13px] font-semibold text-neutral-700">
                  2. Select <span className="font-bold text-neutral-900">Add to Home Screen</span>
                </span>
              </div>
            </div>
            
            {/* Pointer arrow pointing downwards towards Safari's share button */}
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce">
              <div className="w-[2px] h-6 bg-blue-500/30 rounded-full" />
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-blue-500/50 -mt-1" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
