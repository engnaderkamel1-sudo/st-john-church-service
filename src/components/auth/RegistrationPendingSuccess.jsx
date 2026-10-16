import React from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function RegistrationPendingSuccess({ registrationPendingSuccess, onBackToLogin }) {
  if (!registrationPendingSuccess) return null;

  return (
    <div className="p-6 space-y-5 text-center">
      <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-xs">
        <CheckCircle2 className="w-9 h-9" />
      </div>

      <div className="space-y-2">
        <h3 className="font-extrabold text-base text-slate-900">
          تم تسجيل بياناتك بنجاح
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
          أهلاً بك <span className="font-bold text-slate-800">{registrationPendingSuccess.fullName}</span>. 
          حسابك الآن <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">قيد المراجعة والاعتماد</span> من قِبل أمين الخدمة.
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-right text-xs space-y-1 mt-3">
          <div className="flex justify-between items-center text-slate-600">
            <span className="font-medium">الرتبة المطلوبة:</span>
            <span className="font-bold text-maroon-800">
              {registrationPendingSuccess.role === 'servant' ? 'خادم ✝️' : 'مخدوم 🎓'}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span className="font-medium">رقم الهاتف:</span>
            <span className="font-bold font-mono text-slate-800" dir="ltr">{registrationPendingSuccess.phone}</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 pt-1">
          سيتم تفعيل حسابك مباشرة من لوحة الإدارة فور مراجعته لتتمكن من تسجيل الدخول.
        </p>
      </div>

      <button
        type="button"
        onClick={onBackToLogin}
        className="w-full min-h-[44px] bg-maroon-800 hover:bg-maroon-900 text-white rounded-2xl font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
      >
        <span>العودة لشاشة الدخول</span>
        <ArrowRight className="w-4 h-4 rotate-180" />
      </button>
    </div>
  );
}
