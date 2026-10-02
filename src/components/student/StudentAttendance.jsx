import React from 'react';
import { Camera, Clock, CheckCircle2, AlertTriangle, QrCode, CheckCircle, KeyRound, Wifi, WifiOff } from 'lucide-react';

export default function StudentAttendance({
  currentTimeStr,
  isWithinTime,
  bypassTime,
  servantOpenedAccess,
  scanning,
  attendanceStatus,
  handleSimulateScan,
  inputPinCode,
  setInputPinCode,
  handlePinAttendance,
  pinLoading,
  pinError,
  attendanceRecords,
  isOffline = false,
  offlineSyncMessage = ''
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-right">
      <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Camera className="w-5 h-5 text-maroon-800" />
              تسجيل الحضور بالكيو آر (QR Code)
            </h3>
            <span className="text-[11px] bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-full flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-maroon-800" />
              الوقت الآن: {currentTimeStr}
            </span>
          </div>

          {/* Offline Sync Banner */}
          {isOffline && (
            <div className="p-3 rounded-2xl border text-xs mb-3 flex items-center gap-2.5 bg-sky-50 border-sky-200 text-sky-800 animate-pulse">
              <WifiOff className="w-4 h-4 text-sky-600 shrink-0" />
              <div className="font-bold">
                أنت الآن غير متصل بالإنترنت (وضع أوفلاين) 📡 يمكنك التسجيل بشكل طبيعي وسيتم رفع حضورك تلقائياً فور توفر الشبكة!
              </div>
            </div>
          )}

          {offlineSyncMessage && (
            <div className="p-3 rounded-2xl border text-xs mb-3 flex items-center gap-2.5 bg-emerald-50 border-emerald-200 text-emerald-800">
              <Wifi className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="font-bold">
                {offlineSyncMessage}
              </div>
            </div>
          )}

          <div className={`p-3.5 rounded-2xl border text-xs mb-4 flex items-center gap-2.5 ${
            isWithinTime || bypassTime
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            {isWithinTime || bypassTime ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
            <div className="font-medium">
              {servantOpenedAccess ? (
                <span>
                  🎯 تم فتح تسجيل الحضور استثنائياً لك بواسطة الخادم ({servantOpenedAccess.openedBy}). يمكنك تسجيل حضورك الآن!
                </span>
              ) : isWithinTime || bypassTime ? (
                <span>نافذة الحضور مفتوحة الآن (10:30 ص إلى 02:00 م)</span>
              ) : (
                <span>التسجيل متاح أثناء فترة الخدمة (الجمعة 10:30 ص إلى 02:00 م فقط)</span>
              )}
            </div>
          </div>

          <div className="relative bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl h-60 flex flex-col items-center justify-center overflow-hidden">
            {scanning ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-3 border-maroon-800 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-bold text-maroon-900">جاري قراءة الكود...</span>
              </div>
            ) : attendanceStatus === 'success' ? (
              <div className="flex flex-col items-center gap-2 p-6 text-center">
                <CheckCircle className="w-14 h-14 text-emerald-600 animate-bounce" />
                <span className="text-sm font-extrabold text-slate-900">تم تسجيل حضورك بنجاح!</span>
                <span className="text-xs text-emerald-700 font-bold">+10 نقاط إنجاز أضيفت لرصيدك</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center px-4">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-maroon-800 border border-slate-200 shadow-xs">
                  <QrCode className="w-7 h-7" />
                </div>
                <p className="text-xs font-bold text-slate-700">وجه الكاميرا نحو كود الخدمة المطبوع أو هاتف الخادم</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <button
            onClick={handleSimulateScan}
            disabled={(!isWithinTime && !bypassTime) || scanning || attendanceStatus === 'success'}
            className={`w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
              attendanceStatus === 'success'
                ? 'bg-emerald-100 text-emerald-800 cursor-not-allowed'
                : (isWithinTime || bypassTime)
                ? 'bg-maroon-800 hover:bg-maroon-700 text-white shadow-md'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>
              {attendanceStatus === 'success' ? 'تم تسجيل حضور اليوم' : scanning ? 'جاري المسح...' : 'فتح الكاميرا ومسح الكود'}
            </span>
          </button>

          {/* Quick PIN Code Fallback Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-maroon-800" />
                كود الحضور السريع (بديل الكاميرا)
              </span>
              <span className="text-[10px] text-slate-500 font-medium">اسأل الخادم عن كود اليوم (4 أرقام)</span>
            </div>

            <form onSubmit={handlePinAttendance} className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={inputPinCode}
                onChange={(e) => setInputPinCode(e.target.value)}
                placeholder="أدخل الكود الرقمي..."
                disabled={(!isWithinTime && !bypassTime) || pinLoading || attendanceStatus === 'success'}
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 min-h-[44px] text-xs sm:text-sm font-mono font-bold tracking-widest text-center text-slate-900 focus:outline-none focus:border-maroon-800 disabled:bg-slate-100 disabled:text-slate-400"
              />
              <button
                type="submit"
                disabled={(!isWithinTime && !bypassTime) || pinLoading || attendanceStatus === 'success'}
                className="bg-maroon-800 hover:bg-maroon-700 active:scale-95 text-white px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all disabled:bg-slate-200 disabled:text-slate-400 shrink-0 cursor-pointer"
              >
                {pinLoading ? 'جاري...' : 'تسجيل بالكود'}
              </button>
            </form>

            {pinError && (
              <div className="text-[11px] font-bold text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                {pinError}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attendance History Sidebar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h4 className="font-extrabold text-slate-900 text-sm">سجل الحضور الأخير</h4>
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
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
                    <span className="text-[10px] text-slate-400">{item.time}</span>
                  </div>
                </div>
                <span className="text-maroon-800 font-bold text-[11px]">+{item.points} نقاط</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
