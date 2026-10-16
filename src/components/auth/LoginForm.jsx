import React from 'react';
import { Phone, Lock, ShieldAlert } from 'lucide-react';

export default function LoginForm({
  phone,
  setPhone,
  password,
  setPassword,
  loading,
  error,
  handleSubmit,
  onForgotPassword,
  onSwitchToRegister
}) {
  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-3.5 animate-in fade-in duration-200">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            رقم الهاتف
          </label>
          <div className="relative">
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              dir="ltr"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pl-10 text-xs text-right focus:outline-none focus:border-maroon-700 focus:bg-white transition-colors"
            />
            <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700">
              كلمة المرور
            </label>
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-[11px] text-maroon-700 hover:text-maroon-900 font-bold hover:underline"
            >
              نسيت كلمة السر؟
            </button>
          </div>
          <div className="relative">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pl-10 text-xs focus:outline-none focus:border-maroon-700 focus:bg-white transition-colors"
            />
            <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="pt-2 space-y-2">
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-maroon-800 hover:bg-maroon-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs"
        >
          {loading ? <span>جاري التحقق...</span> : <span>تسجيل الدخول</span>}
        </button>
      </div>

      <div className="text-center pt-1">
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-xs text-maroon-800 hover:text-maroon-900 font-semibold underline"
        >
          ليس لديك حساب؟ إنشاء حساب جديد
        </button>
      </div>
    </form>
  );
}
