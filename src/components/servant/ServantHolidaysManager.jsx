import React, { useState } from 'react';
import { CalendarOff, Plus, Trash2, Calendar, ShieldCheck, AlertCircle } from 'lucide-react';

export default function ServantHolidaysManager({
  serviceHolidays = [],
  handleAddHoliday,
  handleRemoveHoliday
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayLabel, setHolidayLabel] = useState('');

  const submitAddHoliday = (e) => {
    e.preventDefault();
    if (!holidayDate) return;
    if (handleAddHoliday) {
      handleAddHoliday(holidayDate, holidayLabel || 'جمعة معفاة / إجازة رسمية');
    }
    setHolidayDate('');
    setHolidayLabel('');
    setShowAddForm(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-6 text-right font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2">
              <CalendarOff className="w-5 h-5 text-rose-700" />
              <span>إجازات الخدمة والجمع المعفاة 🗓️</span>
            </h3>
            <span className="text-xs bg-rose-50 text-rose-900 font-black px-2.5 py-0.5 rounded-full border border-rose-200">
              {serviceHolidays.length} جمعة مستثناة
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            الجمع المسجلة هنا (مثل جمعة ختام الصوم أو الإجازات والظروف الطارئة) تُستبعد تلقائياً من حسبة أسابيع الخدمة ولا تخصم من تقييم المخدومين.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة جمعة معفاة جديدة</span>
        </button>
      </div>

      {/* Add Holiday Form */}
      {showAddForm && (
        <form onSubmit={submitAddHoliday} className="bg-rose-50/50 border border-rose-200 p-4 sm:p-5 rounded-2xl space-y-3.5 animate-in fade-in">
          <h4 className="font-extrabold text-xs text-rose-950 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-rose-700" />
            <span>بيانات الجمعة المعفاة من الحسبة</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ الجمعة:</label>
              <input
                type="date"
                required
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-rose-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">سبب الاستثناء / المناسبة:</label>
              <input
                type="text"
                placeholder="مثال: جمعة ختام الصوم / عطلة الأعياد"
                value={holidayLabel}
                onChange={(e) => setHolidayLabel(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1 border-t border-rose-100">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs rounded-xl font-bold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs rounded-xl font-bold shadow-2xs cursor-pointer"
            >
              حفظ واستثناء الجمعة ✓
            </button>
          </div>
        </form>
      )}

      {/* Holidays List */}
      {serviceHolidays.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 space-y-2 p-6">
          <CalendarOff className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-600">لا توجد أي جمع معفاة مسجلة حالياً.</p>
          <p className="text-[11px] text-slate-400">جميع أسابيع الخدمة تُحسب كأيام خدمة عادية طبقاً للتقويم الدراسي.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {serviceHolidays.map((h, i) => {
            const dateVal = typeof h === 'string' ? h : h.date;
            const labelVal = typeof h === 'string' ? 'جمعة معفاة' : (h.label || 'جمعة معفاة');
            return (
              <div 
                key={i} 
                className="bg-white border border-rose-100 hover:border-rose-300 rounded-2xl p-3.5 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-3 group"
              >
                <div className="min-w-0">
                  <span className="font-extrabold text-xs text-rose-950 block truncate">{labelVal}</span>
                  <span className="text-[11px] text-slate-500 font-mono mt-0.5 block" dir="ltr">{dateVal}</span>
                </div>
                {handleRemoveHoliday && (
                  <button
                    type="button"
                    onClick={() => handleRemoveHoliday(dateVal)}
                    className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
                    title="حذف الاستثناء وإعادة الحسبة"
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
  );
}
