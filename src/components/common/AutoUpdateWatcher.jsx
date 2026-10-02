import React, { useState, useEffect } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';

export default function AutoUpdateWatcher() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [currentScriptSrc, setCurrentScriptSrc] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // 1. Identify the current running main script in the DOM
    const currentScript = document.querySelector('script[src*="assets/"], script[src*="src/main"]');
    const initialSrc = currentScript ? currentScript.getAttribute('src') : '';
    setCurrentScriptSrc(initialSrc);

    // 2. Function to check server for new index.html with cache-busting
    const checkForUpdates = async () => {
      try {
        const response = await fetch(`/?_updateCheck=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });

        if (!response.ok) return;

        const htmlText = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        const remoteScript = doc.querySelector('script[src*="assets/"]');
        const remoteSrc = remoteScript ? remoteScript.getAttribute('src') : '';

        // If a new hashed asset is deployed on Vercel
        if (remoteSrc && initialSrc && remoteSrc !== initialSrc) {
          console.log('[AutoUpdateWatcher] New version detected:', remoteSrc, 'Current:', initialSrc);
          setUpdateAvailable(true);
        }
      } catch (err) {
        // Silent catch: network offline or minor fetch error
      }
    };

    // Check on tab focus / visibility change (when user returns to the app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkForUpdates);

    // Check periodically every 2 minutes
    const interval = setInterval(checkForUpdates, 120000);

    // Initial check after 10 seconds
    const initialTimer = setTimeout(checkForUpdates, 10000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkForUpdates);
      clearInterval(interval);
      clearTimeout(initialTimer);
    };
  }, []);

  const handleApplyUpdate = () => {
    setIsUpdating(true);
    // Hard reload bypassing cache
    if ('caches' in window) {
      caches.keys().then((names) => {
        Promise.all(names.map((name) => caches.delete(name))).then(() => {
          window.location.reload(true);
        });
      }).catch(() => {
        window.location.reload(true);
      });
    } else {
      window.location.reload(true);
    }
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-gradient-to-r from-maroon-950 via-slate-900 to-maroon-900 border border-gold-500/40 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3 text-right">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gold-400 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5 fill-slate-950" />
          </div>
          <div>
            <h5 className="font-extrabold text-xs text-white">تحديث جديد متوفر للمنظومة! 🚀</h5>
            <p className="text-[11px] text-slate-300 mt-0.5">اضغط للتحديث الفوري لضمان ظهور أحدث الميزات.</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleApplyUpdate}
            disabled={isUpdating}
            className="bg-gold-400 hover:bg-gold-500 text-slate-950 font-extrabold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition-all shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? 'جاري...' : 'تحديث الآن'}</span>
          </button>
          <button
            onClick={() => setUpdateAvailable(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            title="إخفاء"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
