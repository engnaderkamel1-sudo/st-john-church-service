import React from 'react';
import { X, Smartphone, Share2, PlusSquare, Sparkles, CheckCircle2 } from 'lucide-react';

export default function InstallPromptModal({ isOpen, onClose, deferredPrompt, onInstalled }) {
  if (!isOpen) return null;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult?.outcome === 'accepted' && onInstalled) {
        onInstalled();
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 font-cairo text-right">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-sm sm:max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <img 
              src="/church_logo.jpg" 
              alt="شعار التطبيق" 
              className="w-10 h-10 rounded-2xl shadow-xs object-cover border border-amber-200 shrink-0" 
            />
            <div>
              <h3 className="text-base font-extrabold text-slate-900">تثبيت تطبيق المنظومة</h3>
              <p className="text-[11px] text-slate-500">إعداد خدام بولس الرسول وأليشع النبي</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="text-xs text-slate-600 leading-relaxed space-y-3">
          <p className="text-slate-700">
            يمكنك تثبيت المنظومة كتطبيق أصيل على هاتفك للوصول السريع، مسح كود الحضور، ومتابعة المحاضرات والنوتة الروحية بسلاسة دون متصفح.
          </p>

          {isIOS ? (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-950 space-y-2.5">
              <div className="font-extrabold text-xs flex items-center gap-1.5 text-amber-900">
                <Smartphone className="w-4 h-4 text-amber-700 shrink-0" />
                <span>خطوات التثبيت على هواتف آبل (iPhone / iPad):</span>
              </div>
              <div className="space-y-1.5 text-[11px] text-amber-900/90 font-medium pr-1">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-[10px]">١</span>
                  <span>اضغط على زر المشاركة أسفل متصفح سفاري</span>
                  <Share2 className="w-3.5 h-3.5 inline text-amber-700" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-[10px]">٢</span>
                  <span>اختر «إضافة إلى الشاشة الرئيسية»</span>
                  <PlusSquare className="w-3.5 h-3.5 inline text-amber-700" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-[10px]">٣</span>
                  <span>اضغط «إضافة» (Add) في الزاوية العلوية</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-[11px] text-slate-700">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>مزايا التطبيق المثبت:</span>
              </div>
              <ul className="space-y-1 pr-1 font-medium text-slate-600">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>فتح فوري بلمسة واحدة وشاشة كاملة ومريحة.</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>سرعة فائقة واستجابة أفضل وتوفير لباقة الإنترنت.</span>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 pt-1">
          {deferredPrompt && !isIOS && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-maroon-800 to-maroon-900 hover:from-maroon-900 hover:to-maroon-950 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-amber-300" />
              <span>تثبيت التطبيق الآن</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer text-center"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
