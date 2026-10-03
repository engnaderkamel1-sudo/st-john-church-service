import React, { useState } from 'react';
import { QrCode, KeyRound, RefreshCw, Printer, Clock, Unlock, CheckCircle, BellRing, CalendarOff, Plus, Trash2 } from 'lucide-react';

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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
        <div className="mb-4">
          <span className="text-[11px] bg-maroon-50 text-maroon-900 border border-maroon-200 font-bold px-3 py-1 rounded-full">
            كود حضور خدمة اليوم
          </span>
          <h3 className="text-base font-extrabold text-slate-900 mt-2">{todayStr}</h3>
          
          {/* Dynamic Service Start Time Setting */}
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="text-xs text-slate-600 font-bold">موعد بدء الخدمة:</span>
            {isEditingStartTime ? (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl">
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
                className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 rounded-xl text-xs font-bold font-mono flex items-center gap-1 cursor-pointer shadow-2xs"
                title="اضغط لتعديل موعد بدء خدمة اليوم (مثلاً 10:45 أو 11:00)"
              >
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                <span>{serviceStartTime} ص</span>
                <span className="text-[10px]">✏️</span>
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            أول ربع ساعة (حتى {serviceStartTime ? (() => {
              const [h, m] = serviceStartTime.split(':').map(Number);
              const endM = (m + 15) % 60;
              const endH = endM < m ? h + 1 : h;
              return `${endH}:${endM < 10 ? '0' + endM : endM}`;
            })() : '10:45'} ص) = 3 درجات، وبعدها درجتان طبقاً للائحة.
          </p>
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

      <div className="space-y-6">
        {/* Right Card 1: Remote Code Access & Quick Guide */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm text-right flex flex-col justify-between text-xs space-y-4">
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-maroon-800" />
              دليل الحضور السريع
            </h4>
            <p className="text-slate-600 leading-relaxed">
              اعرض هذا الكود عند مدخل قاعة الخدمة. يقوم المخدومون بمسحه عبر كاميرا هواتفهم وتسجيل الحضور مباشرة.
            </p>
          </div>

          {/* Remote Code Access Control */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-200/80 p-4 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <Unlock className="w-4 h-4 text-amber-700" />
              <span className="font-extrabold text-slate-900 text-xs">فتح التسجيل بالكود الاستثنائي</span>
            </div>
            <p className="text-[11px] text-slate-600">
              فتح التسجيل بالكود الآن لشخص معين أو للجميع مع إرسال إشعار فوري:
            </p>

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
                      ? 'فتح التسجيل للجميع وإرسال إشعار 📢'
                      : 'فتح التسجيل وإرسال تنبيه للمخدوم 🎯'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Card 2: Holidays & Cancelled Fridays Management */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm text-right space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <CalendarOff className="w-4 h-4 text-rose-700" />
              <span>إجازات الخدمة والجمع المعفاة 🗓️</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowAddHolidayForm(!showAddHolidayForm)}
              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>استثناء جمعة</span>
            </button>
          </div>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            الجمع المسجلة هنا (مثل جمعة ختام الصوم أو الإجازات الطارئة) تُستبعد تلقائياً من حسبة أسابيع الخدمة ولا تخصم من تقييم المخدومين.
          </p>

          {showAddHolidayForm && (
            <form onSubmit={submitAddHoliday} className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-2.5 animate-in fade-in">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ الجمعة المعفاة:</label>
                <input
                  type="date"
                  required
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-rose-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">سبب الاستثناء / المناسبة:</label>
                <input
                  type="text"
                  placeholder="مثال: جمعة ختام الصوم / عطلة رسمية"
                  value={holidayLabel}
                  onChange={(e) => setHolidayLabel(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-600"
                />
              </div>
              <div className="flex justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddHolidayForm(false)}
                  className="px-3 py-1 bg-white border border-slate-200 text-slate-600 text-xs rounded-lg font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-rose-700 hover:bg-rose-800 text-white text-xs rounded-lg font-bold shadow-2xs"
                >
                  حفظ الاستثناء ✓
                </button>
              </div>
            </form>
          )}

          {/* List of declared holidays */}
          {serviceHolidays.length === 0 ? (
            <div className="text-center py-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-[11px]">
              لا توجد جمع معفاة مضافة حالياً.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {serviceHolidays.map((h, i) => {
                const dateVal = typeof h === 'string' ? h : h.date;
                const labelVal = typeof h === 'string' ? 'جمعة معفاة' : (h.label || 'جمعة معفاة');
                return (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-rose-50/50 border border-rose-100 rounded-xl text-xs">
                    <div>
                      <span className="font-bold text-rose-950 block">{labelVal}</span>
                      <span className="text-[10px] text-slate-500 font-mono" dir="ltr">{dateVal}</span>
                    </div>
                    {handleRemoveHoliday && (
                      <button
                        type="button"
                        onClick={() => handleRemoveHoliday(dateVal)}
                        className="p-1 text-slate-400 hover:text-rose-700 transition-colors"
                        title="حذف الاستثناء"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
