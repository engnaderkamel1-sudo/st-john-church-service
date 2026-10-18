import React, { useState } from 'react';
import { KeyRound, RefreshCw, Printer, Clock, Unlock, CheckCircle, BellRing, CalendarOff, Plus, Trash2, ShieldCheck, Sparkles } from 'lucide-react';
import { getDailyServicePin } from '../../utils/security';

export default function ServantAttendanceQR({
  todayStr,
  numericPin,
  handleGenerateNewPin,
  remoteAccessTarget,
  setRemoteAccessTarget,
  remoteAccessMessage,
  selectedStudentForAccess,
  setSelectedStudentForAccess,
  handleOpenCodeAccess,
  remoteAccessLoading,
  allUsers,
  serviceStartTime = '10:30',
  handleUpdateServiceStartTime,
  serviceHolidays = [],
  handleAddHoliday,
  handleRemoveHoliday
}) {
  const [isEditingStartTime, setIsEditingStartTime] = useState(false);
  const [inputStartTime, setInputStartTime] = useState(serviceStartTime);
  const [showAddHolidayForm, setShowAddHolidayForm] = useState(false);
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayLabel, setHolidayLabel] = useState('');

  // Fallback to offline deterministic PIN if numericPin is not yet loaded from Firestore
  const todayDateOnly = new Date().toISOString().split('T')[0];
  const activePinCode = numericPin || getDailyServicePin(todayDateOnly);

  const submitAddHoliday = (e) => {
    e.preventDefault();
    if (!holidayDate) return;
    if (handleAddHoliday) {
      handleAddHoliday(holidayDate, holidayLabel || 'إجازة خدمة / جمعة معفاة');
    }
    setHolidayDate('');
    setHolidayLabel('');
    setShowAddHolidayForm(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-cairo">
      {/* Main Hero Card: Numeric Attendance PIN */}
      <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col items-center justify-between text-center space-y-6">
        <div className="w-full">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-xs bg-maroon-50 text-maroon-900 border border-maroon-200 font-extrabold px-3.5 py-1 rounded-full flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-maroon-800" />
              <span>كود حضور خدمة اليوم</span>
            </span>
          </div>

          <h3 className="text-lg font-black text-slate-900">{todayStr}</h3>

          {/* Dynamic Service Start Time Setting */}
          <div className="mt-3 flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 font-bold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-maroon-800" />
                <span>موعد بدء خدمة اليوم:</span>
              </span>
              <span className="font-mono font-black text-xs text-maroon-900 bg-maroon-50 border border-maroon-200 px-2.5 py-0.5 rounded-lg">
                {serviceStartTime} ص
              </span>
            </div>

            {/* Quick Presets & Custom Time */}
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {['10:30', '10:45', '11:00', '11:15'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    if (handleUpdateServiceStartTime) {
                      handleUpdateServiceStartTime(t);
                    }
                    setIsEditingStartTime(false);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shadow-2xs active:scale-95 ${
                    serviceStartTime === t
                      ? 'bg-maroon-900 text-white ring-2 ring-gold-400 font-black'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {t} ص
                </button>
              ))}

              {isEditingStartTime ? (
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-0.5 rounded-xl">
                  <input
                    type="time"
                    value={inputStartTime}
                    onChange={(e) => setInputStartTime(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-xs font-mono font-bold text-slate-800 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (inputStartTime && handleUpdateServiceStartTime) {
                        handleUpdateServiceStartTime(inputStartTime);
                      }
                      setIsEditingStartTime(false);
                    }}
                    className="bg-maroon-800 text-white text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer"
                  >
                    حفظ ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingStartTime(false)}
                    className="text-slate-400 text-[10px] px-1 cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setInputStartTime(serviceStartTime);
                    setIsEditingStartTime(true);
                  }}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                >
                  <span>وقت آخر ✏️</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Hero PIN Display Box */}
        <div className="w-full max-w-md bg-gradient-to-br from-amber-50/80 via-white to-amber-50/60 border-2 border-amber-300/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-center gap-2 text-amber-950 font-black text-sm">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>كود الحضور الرقمي الرسمي للقاعة</span>
          </div>

          <div className="bg-white border-2 border-dashed border-amber-400 py-4 px-8 rounded-3xl inline-block shadow-inner">
            <span className="font-mono text-5xl sm:text-6xl font-black text-amber-950 tracking-[0.25em]" dir="ltr">
              {activePinCode}
            </span>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-emerald-800 bg-emerald-50 border border-emerald-200/80 py-1.5 px-3 rounded-xl text-xs font-bold max-w-xs mx-auto">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>تسجيل فوري دون الحاجة لاتصال بالإنترنت</span>
          </div>

          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            يُعرض هذا الكود للمخدومين في القاعة لتسجيل الحضور مباشرة من حساباتهم.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleGenerateNewPin}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>توليد كود رقمي جديد</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-maroon-800 hover:bg-maroon-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة كود اليوم</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar Controls */}
      <div className="space-y-6">
        {/* Remote Code Access Control */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm text-right flex flex-col justify-between text-xs space-y-4">
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm mb-1 flex items-center gap-2">
              <Unlock className="w-4 h-4 text-amber-700" />
              <span>فتح التسجيل الاستثنائي</span>
            </h4>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              فتح التسجيل بالكود خارج الوقت الرسمي لشخص معين أو لجميع الطلاب:
            </p>
          </div>

          {remoteAccessMessage && (
            <div className="bg-emerald-100/80 border border-emerald-300 text-emerald-800 text-[11px] p-2.5 rounded-xl font-bold flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{remoteAccessMessage}</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRemoteAccessTarget('all')}
                className={`py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  remoteAccessTarget === 'all'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>📢 للجميع</span>
              </button>
              <button
                type="button"
                onClick={() => setRemoteAccessTarget('specific')}
                className={`py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  remoteAccessTarget === 'specific'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
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
                  <option value="">-- اختيار المخدوم --</option>
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
              className="w-full bg-maroon-800 hover:bg-maroon-700 text-white font-bold py-2.5 px-3 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 text-xs mt-2 cursor-pointer disabled:bg-slate-200 disabled:text-slate-400"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>
                {remoteAccessLoading
                  ? 'جاري الفتح والإشعار...'
                  : remoteAccessTarget === 'all'
                    ? 'فتح التسجيل للجميع وإرسال إشعار 📢'
                    : 'فتح التسجيل وإرسال تنبيه للمخدوم 🎯'}
              </span>
            </button>
          </div>
        </div>

        {/* Holidays & Service Off-Days Manager */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm text-right text-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
              <CalendarOff className="w-4 h-4 text-maroon-800" />
              <span>الإجازات الرسمية والجمع المعفاة</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowAddHolidayForm(!showAddHolidayForm)}
              className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all"
            >
              <Plus className="w-3 h-3" />
              <span>إضافة</span>
            </button>
          </div>

          {showAddHolidayForm && (
            <form onSubmit={submitAddHoliday} className="bg-slate-50 p-3 rounded-xl space-y-2 border border-slate-200">
              <input
                type="date"
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
                required
                className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs"
              />
              <input
                type="text"
                placeholder="اسم المناسبة (مثلاً: جمعة ختام الصوم)"
                value={holidayLabel}
                onChange={(e) => setHolidayLabel(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs"
              />
              <button
                type="submit"
                className="w-full bg-maroon-800 text-white font-bold py-1.5 rounded-lg text-xs"
              >
                حفظ الإجازة ✓
              </button>
            </form>
          )}

          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {serviceHolidays.length === 0 ? (
              <p className="text-slate-400 text-[11px] py-2 text-center">لا توجد إجازات مسجلة حالياً.</p>
            ) : (
              serviceHolidays.map((h, i) => {
                const dateStr = typeof h === 'string' ? h : h.date;
                const label = typeof h === 'string' ? 'جمعة معفاة' : (h.label || 'جمعة معفاة');
                return (
                  <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2 rounded-xl text-[11px]">
                    <div>
                      <span className="font-bold text-slate-800 block">{label}</span>
                      <span className="text-slate-400 font-mono text-[10px]">{dateStr}</span>
                    </div>
                    {handleRemoveHoliday && (
                      <button
                        type="button"
                        onClick={() => handleRemoveHoliday(dateStr)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-md"
                        title="حذف الإجازة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
