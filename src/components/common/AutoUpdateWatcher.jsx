import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Sparkles, X, CheckCircle2 } from 'lucide-react';

const JUST_UPDATED_KEY = 'app_just_updated_at';
const AUTO_RELOAD_GUARD_KEY = 'app_auto_reload_guard_at';
const LAST_ASSET_SRC_KEY = 'app_last_asset_src';

export default function AutoUpdateWatcher() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const applyUpdate = useCallback((isAuto = false) => {
    setIsUpdating(true);
    try {
      localStorage.setItem(JUST_UPDATED_KEY, String(Date.now()));
      if (isAuto) {
        localStorage.setItem(AUTO_RELOAD_GUARD_KEY, String(Date.now()));
      }
    } catch {
      // ignore storage errors
    }

    fetch(`/version.json?_t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.version) localStorage.setItem('app_version', d.version);
      })
      .catch(() => {})
      .finally(() => {
        const cleanUrl = window.location.origin + window.location.pathname + '?_v=' + Date.now() + (window.location.hash || '');
        if ('caches' in window) {
          caches.keys().then((names) => {
            Promise.all(names.map((name) => caches.delete(name))).then(() => {
              window.location.href = cleanUrl;
            });
          }).catch(() => {
            window.location.href = cleanUrl;
          });
        } else {
          window.location.href = cleanUrl;
        }
      });
  }, []);

  useEffect(() => {
    // Show confirmation toast if the app just reloaded after an update
    try {
      const updatedAt = Number(localStorage.getItem(JUST_UPDATED_KEY) || 0);
      if (updatedAt && Date.now() - updatedAt < 30000) {
        localStorage.removeItem(JUST_UPDATED_KEY);
        setJustUpdated(true);
      } else if (updatedAt) {
        localStorage.removeItem(JUST_UPDATED_KEY);
      }
    } catch {
      // ignore storage errors
    }

    // Clean ?_v= query param from URL bar after reload
    if (window.location.search.includes('_v=')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('_v');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    }
  }, []);

  useEffect(() => {
    if (!justUpdated) return;
    const hideTimer = setTimeout(() => setJustUpdated(false), 4500);
    return () => clearTimeout(hideTimer);
  }, [justUpdated]);

  useEffect(() => {
    const mountTime = Date.now();

    // 1. Identify the current running main script & stylesheet in the DOM
    const currentScript = document.querySelector('script[src*="assets/"], script[src*="src/main"]');
    const currentLink = document.querySelector('link[rel="stylesheet"][href*="assets/"]');
    const initialSrc = (currentScript ? currentScript.getAttribute('src') : '') + '|' + (currentLink ? currentLink.getAttribute('href') : '');

    // Detect if the browser loaded a newer version directly on open (without going through applyUpdate)
    if (initialSrc && initialSrc.includes('assets/')) {
      try {
        const prevAssetSrc = localStorage.getItem(LAST_ASSET_SRC_KEY);
        if (prevAssetSrc && prevAssetSrc !== initialSrc) {
          setJustUpdated(true);
        }
        localStorage.setItem(LAST_ASSET_SRC_KEY, initialSrc);
      } catch {
        // ignore storage errors
      }
    }

    const handleDetectedUpdate = () => {
      const isStartupWindow = Date.now() - mountTime < 8000;
      let canAutoReload = isStartupWindow;

      if (canAutoReload) {
        try {
          const lastAuto = Number(localStorage.getItem(AUTO_RELOAD_GUARD_KEY) || 0);
          if (lastAuto && Date.now() - lastAuto < 60000) {
            canAutoReload = false;
          }
        } catch {
          canAutoReload = false;
        }
      }

      if (canAutoReload) {
        applyUpdate(true);
      } else {
        setUpdateAvailable(true);
      }
    };

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
        const remoteLink = doc.querySelector('link[rel="stylesheet"][href*="assets/"]');
        const remoteSrc = (remoteScript ? remoteScript.getAttribute('src') : '') + '|' + (remoteLink ? remoteLink.getAttribute('href') : '');

        // If a new hashed asset or stylesheet is deployed on Vercel
        if (remoteSrc && initialSrc && remoteSrc !== initialSrc) {
          console.log('[AutoUpdateWatcher] New version detected:', remoteSrc, 'Current:', initialSrc);
          handleDetectedUpdate();
          return;
        }

        // Secondary check: version.json
        try {
          const verRes = await fetch(`/version.json?_t=${Date.now()}`, { cache: 'no-store' });
          if (verRes.ok) {
            const verData = await verRes.json();
            const currentLocalVer = localStorage.getItem('app_version');
            if (currentLocalVer && verData.version && verData.version !== currentLocalVer) {
              handleDetectedUpdate();
            }
          }
        } catch {
          // ignore
        }
      } catch {
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

    // Immediate startup check (500ms) + follow-up check (30s)
    const initialTimer1 = setTimeout(checkForUpdates, 500);
    const initialTimer2 = setTimeout(checkForUpdates, 30000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkForUpdates);
      clearInterval(interval);
      clearTimeout(initialTimer1);
      clearTimeout(initialTimer2);
    };
  }, [applyUpdate]);

  const handleApplyUpdate = () => applyUpdate(false);

  return (
    <>
      {justUpdated && (
        <div className="fixed top-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-auto sm:min-w-[300px] z-[60] animate-in slide-in-from-top duration-300">
          <div className="bg-slate-900/95 backdrop-blur-md border border-emerald-500/40 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 text-right">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-bold text-xs sm:text-sm text-white">تم تحديث التطبيق لأحدث نسخة</span>
            </div>
            <button
              onClick={() => setJustUpdated(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors shrink-0"
              aria-label="إغلاق"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {updateAvailable && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in slide-in-from-bottom duration-300">
          <div className="bg-gradient-to-r from-maroon-950 via-slate-900 to-maroon-900 border border-gold-500/40 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3 text-right">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gold-400 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5 fill-slate-950" />
              </div>
              <div>
                <h5 className="font-extrabold text-xs text-white">تحديث متاح للمنظومة</h5>
                <p className="text-[11px] text-slate-300 mt-0.5">يتوفر إصدار أحدث يتضمن تحسينات الأداء والخدمة.</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleApplyUpdate}
                disabled={isUpdating}
                className="bg-gold-400 hover:bg-gold-500 text-slate-950 font-extrabold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition-all shadow-xs cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
                <span>{isUpdating ? 'جاري التحديث...' : 'تحديث الآن'}</span>
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
      )}
    </>
  );
}
