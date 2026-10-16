import React from 'react';
import { KeyRound, Clock, CheckCircle2, AlertTriangle, CheckCircle, Wifi, WifiOff, Sparkles } from 'lucide-react';

export default function StudentAttendance({
  currentTimeStr,
  isWithinTime,
  bypassTime,
  servantOpenedAccess,
  attendanceStatus,
  inputPinCode,
  setInputPinCode,
  handlePinAttendance,
  pinLoading,
  pinError,
  attendanceRecords,
  serviceStartTime = '10:30',
  isOffline = false,
  offlineSyncMessage = ''
}) {
  const isAccessAllowed = isWithinTime || bypassTime;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-right font-cairo">
      {/* Main Attendance Card */}
      <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-maroon-800" />
              <span>تسجيل حضور الخدمة بالكود الرقمي</span>
            </h3>
            <span className="text-[11px] bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-full flex items-center gap-1 font-mono">
              <Clock className="w-3.5 h-3.5 text-maroon-800" />
              <span>{currentTimeStr}</span>
            </span>
          </div>

          {/* Offline Sync & Status Notifications */}
          {isOffline && (
            <div className="p-3.5 rounded-2xl border text-xs mb-4 flex items-center gap-2.5 bg-sky-50 border-sky-200 text-sky-800 animate-pulse">
              <WifiOff className="w-4 h-4 text-sky-600 shrink-0" />
              <div className="font-bold">
                أنت الآن غير متصل بالإنترنت (وضع أوفلاين) 📡 يمكنك إدخال الكود وتسجيل حضورك، وسيتم حفظه واعتماده تلقائياً فور توفر الشبكة!
              </div>
            </div>
          )}

          {offlineSyncMessage && (
            <div className="p-3.5 rounded-2xl border text-xs mb-4 flex items-center gap-2.5 bg-emerald-50 border-emerald-200 text-emerald-800">
              <Wifi className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="font-bold">{offlineSyncMessage}</div>
            </div>
          )}

          {/* Service Window State Banner */}
          <div className={`p-3.5 rounded-2xl border text-xs mb-6 flex items-center gap-2.5 ${
            isAccessAllowed
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            {isAccessAllowed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <div className="font-medium">
              {servantOpenedAccess ? (
                <span>
                  🎯 تم فتح تسجيل الحضور استثنائياً لك بواسطة الخادم ({servantOpenedAccess.openedBy}).
                </span>
              ) : isAccessAllowed ? (
                <span>نافذة الحضور مفتوحة الآن (من {serviceStartTime} إلى 02:00 م)</span>
              ) : (
                <span>التسجيل متاح أثناء فترة الخدمة (الجمعة من {serviceStartTime} إلى 02:00 م فقط)</span>
              )}
            </div>
          </div>

          {/* Attendance Action: Success Screen vs. PIN Entry Form */}
          {attendanceStatus === 'success' ? (
            <div className="bg-gradient-to-br from-emerald-50 to-slate-50 border-2 border-emerald-300 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm animate-bounce">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h4 className="text-lg font-black text-slate-900">تم تسجيل حضورك بنجاح! 🎉</h4>
              <p className="text-xs text-emerald-800 font-bold max-w-sm">
                تم رصد حضورك اليوم في الخدمة واحتساب درجات الحضور والانضباط طبقاً للائحة الرسمية.
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-5">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 text-maroon-900 font-extrabold text-sm sm:text-base">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>أدخل كود حضور خدمة اليوم</span>
                </div>
                <p className="text-xs text-slate-500">
                  الكود يعلنه الخادم المسؤول في القاعة أو يُعرض على الشاشة
                </p>
              </div>

              <form onSubmit={handlePinAttendance} className="max-w-xs mx-auto space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={inputPinCode}
                    onChange={(e) => setInputPinCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    disabled={!isAccessAllowed || pinLoading}
                    className="w-full bg-white border-2 border-slate-300 focus:border-maroon-800 rounded-2xl py-3 px-4 text-2xl sm:text-3xl font-mono font-black tracking-[0.35em] text-center text-slate-900 shadow-inner focus:outline-none transition-all disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!isAccessAllowed || pinLoading || !inputPinCode || inputPinCode.trim().length === 0}
                  className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm bg-maroon-800 hover:bg-maroon-900 active:scale-98 text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <KeyRound className="w-4 h-4 text-amber-300" />
                  <span>{pinLoading ? 'جاري التحقق...' : 'تسجيل الحضور الآن'}</span>
                </button>
              </form>

              {pinError && (
                <div className="p-3 rounded-2xl text-xs font-bold text-red-700 bg-red-50 border border-red-200 flex items-center justify-center gap-2 max-w-sm mx-auto text-center">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Attendance History Sidebar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h4 className="font-extrabold text-slate-900 text-sm">سجل الحضور الأخير</h4>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {attendanceRecords.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              لا توجد تسجيلات حضور سابقة مسجلة.
            </div>
          ) : (
            attendanceRecords.map((item) => (
              <div key={item.id} className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">{item.date}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{item.time}</span>
                  </div>
                </div>
                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                  حاضر ✓
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
