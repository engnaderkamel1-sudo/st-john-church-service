import React from 'react';
import { QrCode, KeyRound, RefreshCw, Printer, Clock, Unlock, CheckCircle, BellRing } from 'lucide-react';

export default function ServantAttendanceQR({
  todayStr,
  qrCodeData,
  setQrCodeData,
  numericPin,
  handleGenerateNewPin,
  remoteAccessTarget,
  setRemoteAccessTarget,
  remoteAccessMessage,
  selectedStudentForAccess,
  setSelectedStudentForAccess,
  handleOpenCodeAccess,
  remoteAccessLoading,
  allUsers
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
        <div className="mb-4">
          <span className="text-[11px] bg-maroon-50 text-maroon-900 border border-maroon-200 font-bold px-3 py-1 rounded-full">
            كود حضور خدمة اليوم
          </span>
          <h3 className="text-base font-extrabold text-slate-900 mt-2">{todayStr}</h3>
          <p className="text-xs text-slate-500">ساري من 10:30 صباحاً حتى 02:00 ظهراً</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center">
          <div className="w-52 h-52 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center p-2">
            <QrCode className="w-40 h-40 text-slate-900" />
          </div>
          <div className="mt-2 text-slate-600 text-[11px] font-mono font-bold" dir="ltr">
            {qrCodeData}
          </div>
        </div>

        {/* Dynamic Numeric PIN Code for Students (رقم كود متغير يقدر يديه للمخدوم) */}
        <div className="mt-5 w-full max-w-sm bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-4 shadow-xs text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-amber-900 font-extrabold text-xs">
            <KeyRound className="w-4 h-4 text-amber-700" />
            <span>كود الحضور الرقمي السريع (بدون كاميرا)</span>
          </div>
          <p className="text-[11px] text-slate-600">
            يمكن للمخدوم كتابة هذا الرقم المكون من 4 أرقام مباشرة في حسابه لتسجيل حضوره:
          </p>
          <div className="bg-white border-2 border-dashed border-amber-400 py-2.5 px-6 rounded-2xl inline-block shadow-inner">
            <span className="font-mono text-3xl font-black text-amber-900 tracking-widest" dir="ltr">
              {numericPin}
            </span>
          </div>
          <div className="pt-1 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleGenerateNewPin}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-1.5 px-3 rounded-xl transition-all shadow-2xs flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>توليد كود رقمي جديد 🔄</span>
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            onClick={() => setQrCodeData(`STJOHN-ATTENDANCE-${new Date().toISOString().split('T')[0]}-${Math.floor(1000 + Math.random() * 9000)}`)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-3.5 rounded-xl transition-all"
          >
            تحديث رمز QR
          </button>
          <button
            onClick={() => window.print()}
            className="bg-maroon-800 hover:bg-maroon-700 text-white text-xs font-bold py-2 px-4 rounded-xl transition-all flex items-center gap-1.5 shadow"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة للقاعة</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm text-right flex flex-col justify-between text-xs space-y-4">
        <div>
          <h4 className="font-extrabold text-slate-900 text-sm mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-maroon-800" />
            دليل الحضور السريع
          </h4>
          <p className="text-slate-600 leading-relaxed">
            اعرض هذا الكود عند مدخل قاعة الخدمة. يقوم المخدومون بمسحه عبر كاميرا هواتفهم المدمجة في حساباتهم وتسجيل الحضور وإضافة النقاط مباشرة.
          </p>
        </div>

        {/* Remote Code Access Control (فتح التسجيل لشخص معين أو للجميع مع إرسال إشعار) */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-200/80 p-4 rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <Unlock className="w-4 h-4 text-amber-700" />
            <span className="font-extrabold text-slate-900 text-xs">فتح التسجيل بالكود الاستثنائي</span>
          </div>
          <p className="text-[11px] text-slate-600">
            يمكنك كخادم فتح التسجيل بالكود الآن لشخص معين أو للجميع وإرسال تنبيه فوري له/لهم:
          </p>

          {remoteAccessMessage && (
            <div className="bg-emerald-100/80 border border-emerald-300 text-emerald-800 text-[11px] p-2.5 rounded-xl font-bold flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{remoteAccessMessage}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-700">لمن تريد فتح التسجيل؟</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRemoteAccessTarget('all')}
                className={`py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1 ${
                  remoteAccessTarget === 'all'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700'
                }`}
              >
                <span>📢 للجميع</span>
              </button>
              <button
                type="button"
                onClick={() => setRemoteAccessTarget('specific')}
                className={`py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1 ${
                  remoteAccessTarget === 'specific'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700'
                }`}
              >
                <span>🎯 لشخص معين</span>
              </button>
            </div>

            {remoteAccessTarget === 'specific' && (
              <div className="pt-1">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">اختر المخدوم:</label>
                <select
                  value={selectedStudentForAccess}
                  onChange={(e) => setSelectedStudentForAccess(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-600"
                >
                  <option value="">-- اضغط لاختيار المخدوم --</option>
                  {allUsers
                    .filter(u => u.role === 'student')
                    .map(st => (
                      <option key={st.id} value={st.id}>
                        {st.fullName} ({st.phone})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={handleOpenCodeAccess}
              disabled={remoteAccessLoading}
              className="w-full bg-maroon-800 hover:bg-maroon-700 text-white font-bold py-2 px-3 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 text-xs mt-2"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>
                {remoteAccessLoading
                  ? 'جاري الفتح والإشعار...'
                  : remoteAccessTarget === 'all'
                    ? 'فتح التسجيل للجميع وإرسال إشعار عام 📢'
                    : 'فتح التسجيل وإرسال تنبيه للمخدوم 🎯'}
              </span>
            </button>
          </div>
        </div>

        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-slate-500">
          النافذة المعتمدة العادية: 10:30 ص إلى 02:00 م.
        </div>
      </div>
    </div>
  );
}
