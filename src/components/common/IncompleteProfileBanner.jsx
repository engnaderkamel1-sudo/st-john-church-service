import React from 'react';
import { AlertCircle, Edit3, X } from 'lucide-react';
import { getMissingProfileFields } from '../../utils/profileCompleteness';

/**
 * شريط تنبيه مرن يظهر للخادم عند وجود بيانات ناقصة في حسابه.
 * يختفي تلقائياً عند استكمال البيانات أو مؤقتاً في الجلسة الحالية عند الضغط على زر الإغلاق.
 */
export default function IncompleteProfileBanner({
  user,
  dismissed,
  onDismiss,
  onOpenProfile,
}) {
  if (!user || dismissed) return null;

  const { missingFields, isComplete } = getMissingProfileFields(user);
  if (isComplete) return null;

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 sm:p-4 shadow-xs font-cairo animate-in fade-in duration-200">
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <p className="text-xs sm:text-sm font-extrabold text-maroon-950 leading-snug">
                بيانات حسابك غير مكتملة
              </p>
              <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5">
                يرجى استكمال الحقول التالية لتحديث سجل الخدمة وأعياد الميلاد:
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {missingFields.map((field) => (
                <span
                  key={field.key}
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white text-amber-900 border border-amber-300"
                >
                  {field.label}
                </span>
              ))}
            </div>

            <div className="pt-0.5">
              <button
                type="button"
                onClick={onOpenProfile}
                className="min-h-[40px] px-3.5 py-1.5 bg-maroon-800 hover:bg-maroon-900 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <Edit3 className="w-3.5 h-3.5 text-gold-300" />
                <span>استكمال البيانات الآن</span>
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="إغلاق التنبيه مؤقتاً"
          className="w-8 h-8 rounded-xl bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 border border-amber-200 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
