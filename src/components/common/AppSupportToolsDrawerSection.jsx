import React, { useState, useEffect } from 'react';
import { 
  Bell, Lightbulb, Smartphone, AlertTriangle, Rocket, Sparkles, Check, Camera
} from 'lucide-react';
import InstallPromptModal from './InstallPromptModal';
import FeatureRequestModal from './FeatureRequestModal';
import ErrorReportModal from './ErrorReportModal';
import UpdatesChangelogModal from './UpdatesChangelogModal';
import { checkIsAppAdmin } from '../../utils/security';
import { playNotificationChime, triggerBrowserNotification } from '../../utils/notificationSystem';
import { registerServiceWorkerAndSubscribe } from '../../services/webPushService';

export default function AppSupportToolsDrawerSection({ user, onCloseDrawer }) {
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showFeatureRequestModal, setShowFeatureRequestModal] = useState(false);
  const [showErrorReportModal, setShowErrorReportModal] = useState(false);
  const [showUpdatesModal, setShowUpdatesModal] = useState(false);
  
  const [hasNotificationPermission, setHasNotificationPermission] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });

  const [hasCameraPermission, setHasCameraPermission] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions.query({ name: 'camera' }).then(result => {
        setHasCameraPermission(result.state === 'granted');
        result.onchange = () => {
          setHasCameraPermission(result.state === 'granted');
        };
      }).catch(() => {
        // quiet fail on browsers that don't support camera permission query
      });
    }
  }, []);

  const isAppAdmin = checkIsAppAdmin(user);

  const handleToggleNotification = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('متصفحك لا يدعم الإشعارات المباشرة.');
      return;
    }
    if (Notification.permission === 'granted') {
      setHasNotificationPermission(true);
      playNotificationChime();
      await registerServiceWorkerAndSubscribe(user);
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      const isGranted = perm === 'granted';
      setHasNotificationPermission(isGranted);
      if (isGranted) {
        playNotificationChime();
        await registerServiceWorkerAndSubscribe(user);
      }
    } catch {
      // quiet fail
    }
  };

  const handleRequestCameraPermission = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      alert('متصفحك لا يدعم الوصول المباشر إلى الكاميرا.');
      return;
    }
    if (hasCameraPermission) {
      alert('صلاحية الكاميرا مفعلة بالفعل وجاهزة للاستخدام.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      stream.getTracks().forEach(track => track.stop());
      setHasCameraPermission(true);
      alert('تم منح صلاحية الكاميرا بنجاح! يمكنك الآن مسح كود الـ QR لتسجيل الحضور.');
    } catch (err) {
      console.warn('Camera permission request denied or failed', err);
      alert('تعذر الوصول إلى الكاميرا. يرجى السماح بالوصول إليها من إعدادات المتصفح أو الهاتف.');
    }
  };

  return (
    <>
      <div className="pt-3 pb-2 border-t border-slate-200/80 mt-2 space-y-1.5 font-cairo">
        {/* 1. Install App (Priority #1 on Mobile) */}
        <button
          type="button"
          onClick={() => setShowInstallModal(true)}
          className="w-full text-right py-2.5 px-3 rounded-xl flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-4 h-4 text-slate-600 shrink-0" />
            <span>تثبيت التطبيق على الهاتف</span>
          </div>
        </button>

        {/* 2. Toggle Notifications (Clean Unified Styling) */}
        <button
          type="button"
          onClick={handleToggleNotification}
          className="w-full text-right py-2.5 px-3 rounded-xl flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-slate-600 shrink-0" />
            <span>تفعيل الإشعارات الفورية</span>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
            hasNotificationPermission 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : 'bg-slate-100 text-slate-600 border border-slate-200/80'
          }`}>
            {hasNotificationPermission ? 'مفعلة ✓' : 'تفعيل'}
          </span>
        </button>

        {/* 3. Camera Permission (QR Code Attendance) */}
        <button
          type="button"
          onClick={handleRequestCameraPermission}
          className="w-full text-right py-2.5 px-3 rounded-xl flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Camera className="w-4 h-4 text-slate-600 shrink-0" />
            <span>صلاحية الكاميرا (مسح الـ QR)</span>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
            hasCameraPermission 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : 'bg-slate-100 text-slate-600 border border-slate-200/80'
          }`}>
            {hasCameraPermission ? 'مفعلة ✓' : 'تفعيل'}
          </span>
        </button>

        {/* 3. Suggest Feature */}
        <button
          type="button"
          onClick={() => setShowFeatureRequestModal(true)}
          className="w-full text-right py-2.5 px-3 rounded-xl flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-900 transition-all cursor-pointer"
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
          className="w-full text-right py-2.5 px-3 rounded-xl flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-900 transition-all cursor-pointer"
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
