import React, { useState } from 'react';
import { 
  Bell, Lightbulb, Smartphone, AlertTriangle, Rocket, Sparkles, Check
} from 'lucide-react';
import InstallPromptModal from './InstallPromptModal';
import FeatureRequestModal from './FeatureRequestModal';
import ErrorReportModal from './ErrorReportModal';
import UpdatesChangelogModal from './UpdatesChangelogModal';

export default function AppSupportToolsDrawerSection({ user, onCloseDrawer }) {
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showFeatureRequestModal, setShowFeatureRequestModal] = useState(false);
  const [showErrorReportModal, setShowErrorReportModal] = useState(false);
  const [showUpdatesModal, setShowUpdatesModal] = useState(false);
  
  const [hasNotificationPermission, setHasNotificationPermission] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });

  const isAppAdmin = Boolean(
    user && 
    !user.isPreviewMode &&
    (
      user.role === 'admin' || 
      (user.phone && user.phone.replace(/\D/g, '').endsWith('1275571569')) || 
      (user.email && (
        user.email.toLowerCase().includes('nader.reda') || 
        user.email.toLowerCase().includes('nader.kamel') || 
        user.email.toLowerCase().includes('st.johnmaadiservantsprep')
      ))
    )
  );

  const handleToggleNotification = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('متصفحك لا يدعم الإشعارات المباشرة.');
      return;
    }
    if (Notification.permission === 'granted') {
      setHasNotificationPermission(true);
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setHasNotificationPermission(perm === 'granted');
    } catch {
      // quiet fail
    }
  };

  return (
    <>
      <div className="pt-3 pb-2 border-t border-slate-200/80 mt-2 space-y-1.5 font-cairo">
        {/* Section Header */}
        <div className="px-3 pb-1 flex items-center justify-between">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
            أدوات المنظومة والدعم
          </span>
          <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full border border-slate-200/60">
            خدمات
          </span>
        </div>

        {/* 1. Toggle Notifications */}
        <button
          type="button"
          onClick={handleToggleNotification}
          className={`w-full text-right py-2.5 px-3 rounded-xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
            hasNotificationPermission
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200/70'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 shrink-0" />
            <span>{hasNotificationPermission ? 'الإشعارات مفعلة بنجاح' : 'تفعيل الإشعارات الفورية'}</span>
          </div>
          <span className="text-[11px] font-mono">
            {hasNotificationPermission ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : '👈'}
          </span>
        </button>

        {/* 2. Install PWA App */}
        <button
          type="button"
          onClick={() => setShowInstallModal(true)}
          className="w-full text-right py-2.5 px-3 rounded-xl flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-4 h-4 text-slate-600 shrink-0" />
            <span>تثبيت التطبيق على الهاتف</span>
          </div>
          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">PWA</span>
        </button>

        {/* 3. Suggest Feature */}
        <button
          type="button"
          onClick={() => setShowFeatureRequestModal(true)}
          className="w-full text-right py-2.5 px-3 rounded-xl flex items-center justify-between text-xs font-bold text-amber-900 hover:bg-amber-50 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
            <span>اقترح ميزة أو فكرة جديدة 💡</span>
          </div>
        </button>

        {/* 4. Report Bug */}
        <button
          type="button"
          onClick={() => setShowErrorReportModal(true)}
          className="w-full text-right py-2.5 px-3 rounded-xl flex items-center justify-between text-xs font-bold text-rose-800 hover:bg-rose-50 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>إبلاغ عن عطل فني ⚠️</span>
          </div>
        </button>

        {/* 5. Admin Only: Platform Changelog */}
        {isAppAdmin && (
          <button
            type="button"
            onClick={() => setShowUpdatesModal(true)}
            className="w-full text-right py-2.5 px-3 rounded-xl flex items-center justify-between text-xs font-bold text-indigo-900 bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-200/70 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Rocket className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>سجل تحديثات المنظومة 🚀</span>
            </div>
            <span className="text-[10px] bg-indigo-200/70 text-indigo-900 font-bold px-1.5 py-0.2 rounded">
              مشرف
            </span>
          </button>
        )}
      </div>

      {/* Tools Modals */}
      <InstallPromptModal
        isOpen={showInstallModal}
        onClose={() => {
          setShowInstallModal(false);
          onCloseDrawer?.();
        }}
        deferredPrompt={typeof window !== 'undefined' ? window.deferredPrompt : null}
      />
      <FeatureRequestModal
        isOpen={showFeatureRequestModal}
        onClose={() => {
          setShowFeatureRequestModal(false);
          onCloseDrawer?.();
        }}
        currentUser={user}
      />
      <ErrorReportModal
        isOpen={showErrorReportModal}
        onClose={() => {
          setShowErrorReportModal(false);
          onCloseDrawer?.();
        }}
        currentUser={user}
      />
      {isAppAdmin && (
        <UpdatesChangelogModal
          isOpen={showUpdatesModal}
          onClose={() => {
            setShowUpdatesModal(false);
            onCloseDrawer?.();
          }}
        />
      )}
    </>
  );
}
