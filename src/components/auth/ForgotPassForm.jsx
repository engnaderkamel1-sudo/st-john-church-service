import React from 'react';
import { KeyRound, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';

export default function ForgotPassForm({
  resetIdentifier,
  setResetIdentifier,
  handleResetPassword,
  loading,
  error,
  resetSuccess,
  onBackToLogin
}) {
  return (
    <form onSubmit={handleResetPassword} className="p-6 space-y-4">
      <div className="text-center pb-1">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2 border border-amber-200">
          <KeyRound className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-sm text-slate-800">نسيت كلمة السر؟</h3>
        <p className="text-xs text-slate-500 mt-1">
          اكتب رقم هاتفك أو بريدك الإلكتروني المسجل لدينا وسنساعدك في استعادة كلمة المرور فوراً.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {resetSuccess && (
        resetSuccess.type === 'email' ? (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3.5 rounded-xl flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span className="leading-relaxed font-medium">{resetSuccess.message}</span>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-300 text-amber-950 text-xs p-4 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-sm text-maroon-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>أهلاً بك يا {resetSuccess.fullName} 👋</span>
            </div>
            <p className="text-[11px] text-slate-700 leading-relaxed">
              حسابك مسجل برقم الهاتف ({resetSuccess.phone}) بدون بريد إلكتروني.
              لإعادة تعيين كلمة المرور فوراً، يمكنك التواصل مباشرة مع أمين الخدمة أو المشرف:
            </p>
            <a
              href={`https://wa.me/201275571569?text=${encodeURIComponent(`سلام ونعمة، أنا الخادم/المخدوم (${resetSuccess.fullName}) ورقم هاتفي هو (${resetSuccess.phone})، نسيت كلمة المرور الخاصة بحسابي وأحتاج إعادة تعيينها.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-all shadow-xs"
            >
              <span>تواصل مع أمين الخدمة عبر واتساب لإعادة التعيين 💬</span>
            </a>
          </div>
        )
      )}

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">
          رقم الهاتف أو البريد الإلكتروني المسجل
        </label>
        <div className="relative">
          <input
            type="text"
            required
            value={resetIdentifier}
            onChange={(e) => setResetIdentifier(e.target.value)}
            placeholder="01XXXXXXXXX أو name@example.com"
            dir="ltr"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pl-10 text-xs text-right focus:outline-none focus:border-maroon-700 focus:bg-white transition-colors"
          />
          <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-maroon-800 hover:bg-maroon-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-4 text-xs"
      >
        {loading ? <span>جاري البحث والتحقق...</span> : <span>استعادة كلمة المرور</span>}
      </button>

      <div className="text-center pt-2">
        <button
          type="button"
          onClick={onBackToLogin}
          className="text-xs text-slate-600 hover:text-maroon-800 font-bold flex items-center justify-center gap-1 mx-auto transition-colors"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span>العودة لتسجيل الدخول</span>
        </button>
      </div>
    </form>
  );
}
