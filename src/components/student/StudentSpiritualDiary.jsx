import React from 'react';
import { Sun, Sunset, Moon, BookOpen, Check, Lock, CheckCircle2, BarChart3, TrendingUp, TrendingDown, Heart } from 'lucide-react';

export default function StudentSpiritualDiary({
  selectedDiaryDate,
  setSelectedDiaryDate,
  todayDateStr,
  yesterdayDateStr,
  isEditableDate,
  studentDiarySubTab,
  setStudentDiarySubTab,
  selectedHistoryMonth,
  setSelectedHistoryMonth,
  diaryRecords,
  handleToggleDiaryItem
}) {
  const currentDayDiary = diaryRecords[selectedDiaryDate] || {
    baker: false,
    ghoroub: false,
    nowm: false,
    bible: false,
    communion: false,
    confession: false
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 text-right">
      {/* Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <Sun className="w-5 h-5 text-amber-500" />
            النوتة الروحية اليومية والمتابعة
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            متابعة الخلوة وصلوات الأجبية وقراءة كلمة الله وسر التناول والاعتراف.
          </p>
        </div>

        {/* Sub-Tab Switcher */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStudentDiarySubTab('entry')}
            className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all ${
              studentDiarySubTab === 'entry'
                ? 'bg-maroon-800 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            تسجيل اليوم والأمس ✍️
          </button>
          <button
            type="button"
            onClick={() => setStudentDiarySubTab('history')}
            className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              studentDiarySubTab === 'history'
                ? 'bg-maroon-800 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>سجل المتابعة والشهور السابقة 📈</span>
          </button>
        </div>
      </div>

      {/* Sub-view 1: Daily Entry */}
      {studentDiarySubTab === 'entry' && (
        <div className="space-y-6">
          {/* Date Selector & Rule */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">اختر اليوم:</span>
              <select
                value={selectedDiaryDate}
                onChange={(e) => setSelectedDiaryDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-maroon-800"
              >
                <option value={todayDateStr}>اليوم ({todayDateStr})</option>
                <option value={yesterdayDateStr}>أمس ({yesterdayDateStr})</option>
              </select>
            </div>

            {isEditableDate ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-1.5 rounded-xl flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>متاح التسجيل والتعديل لهذا اليوم (اليوم أو الأمس).</span>
              </div>
            ) : (
              <div className="bg-slate-100 border border-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-xl flex items-center gap-2 font-medium">
                <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                <span>هذا اليوم للقراءة فقط (تجاوز فترة اليومين).</span>
              </div>
            )}
          </div>

          {/* Daily Prayers Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: 'baker', label: 'صلاة باكر', icon: Sun, pts: 5 },
              { key: 'ghoroub', label: 'صلاة الغروب', icon: Sunset, pts: 5 },
              { key: 'nowm', label: 'صلاة النوم', icon: Moon, pts: 5 },
              { key: 'bible', label: 'أصحاح الإنجيل', icon: BookOpen, pts: 5 }
            ].map(({ key, label, icon: Icon, pts }) => {
              const checked = currentDayDiary[key];
              return (
                <div
                  key={key}
                  onClick={() => isEditableDate && handleToggleDiaryItem(key, pts)}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between h-28 ${
                    !isEditableDate ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                  } ${
                    checked
                      ? 'bg-amber-50/60 border-amber-300 text-amber-950 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`w-5 h-5 ${checked ? 'text-amber-600' : 'text-slate-400'}`} />
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center border text-xs ${
                      checked ? 'bg-amber-500 border-amber-500 text-white font-bold' : 'border-slate-300 bg-white'
                    }`}>
                      {checked && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>
                  </div>
                  <div>
                    <div className="font-extrabold text-xs">{label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">+{pts} نقاط</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sacraments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="font-extrabold text-xs text-slate-800 block">سر التناول المقدس</span>
                <span className="text-[11px] text-slate-500">التناول الأسبوعي في القداس</span>
              </div>
              <button
                disabled={!isEditableDate}
                onClick={() => handleToggleDiaryItem('communion', 15)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                  currentDayDiary.communion
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {currentDayDiary.communion ? 'تم التناول ✓' : 'تسجيل التناول (+15)'}
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="font-extrabold text-xs text-slate-800 block">سر التوبة والاعتراف</span>
                <span className="text-[11px] text-slate-500">الجلوس مع أب الاعتراف دورياً</span>
              </div>
              <button
                disabled={!isEditableDate}
                onClick={() => handleToggleDiaryItem('confession', 20)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                  currentDayDiary.confession
                    ? 'bg-maroon-800 text-white border-maroon-800'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {currentDayDiary.confession ? 'تم الاعتراف ✓' : 'تسجيل الاعتراف (+20)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-view 2: History & Analytics */}
      {studentDiarySubTab === 'history' && (() => {
        const curMonthDays = Object.keys(diaryRecords).filter(d => d.startsWith(selectedHistoryMonth));
        const [curY, curM] = selectedHistoryMonth.split('-').map(Number);
        const prevD = new Date(curY, curM - 2, 1);
        const prevMonthStr = prevD.toISOString().substring(0, 7);
        const prevMonthDays = Object.keys(diaryRecords).filter(d => d.startsWith(prevMonthStr));

        let curBaker = 0, curGhoroub = 0, curNowm = 0, curBible = 0, curComm = 0, curConf = 0;
        curMonthDays.forEach(d => {
          const entry = diaryRecords[d] || {};
          if (entry.baker) curBaker++;
          if (entry.ghoroub) curGhoroub++;
          if (entry.nowm) curNowm++;
          if (entry.bible) curBible++;
          if (entry.communion) curComm++;
          if (entry.confession) curConf++;
        });

        let prevPrayers = 0;
        prevMonthDays.forEach(d => {
          const entry = diaryRecords[d] || {};
          if (entry.baker) prevPrayers++;
          if (entry.ghoroub) prevPrayers++;
          if (entry.nowm) prevPrayers++;
        });

        const curPrayers = curBaker + curGhoroub + curNowm;
        const diff = curPrayers - prevPrayers;

        return (
          <div className="space-y-6">
            {/* Month Picker */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-4 rounded-2xl">
              <div>
                <span className="text-xs font-bold text-slate-800 block">عرض سجل شهر سابق:</span>
                <span className="text-[11px] text-slate-500">اختر أي شهر لمتابعة مدى التزامك بالصلاة وقراءة الإنجيل</span>
              </div>
              <select
                value={selectedHistoryMonth}
                onChange={(e) => setSelectedHistoryMonth(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-maroon-800"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(offset => {
                  const d = new Date(new Date().getFullYear(), new Date().getMonth() - offset, 1);
                  const val = d.toISOString().substring(0, 7);
                  const label = d.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
                  return <option key={val} value={val}>{label}</option>;
                })}
              </select>
            </div>

            {/* Performance Comparison Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-500 font-bold block">مقارنة مستوى الصلاة مع الشهر السابق:</span>
                <div className="flex items-center gap-2 mt-1">
                  {diff > 0 ? (
                    <div className="flex items-center gap-1.5 text-emerald-700 font-extrabold text-sm">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                      <span>ما شاء الله! صليت أكثر هذا الشهر (+{diff} صلاة أجبية عن الشهر السابق) ↗️</span>
                    </div>
                  ) : diff < 0 ? (
                    <div className="flex items-center gap-1.5 text-amber-700 font-extrabold text-sm">
                      <TrendingDown className="w-5 h-5 text-amber-600" />
                      <span>صليت أقل هذا الشهر ({diff} صلاة عن الشهر السابق) - شجع نفسك على صلاة باكر والنوم ↘️</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-slate-700 font-extrabold text-sm">
                      <span>ثبات في معدل صلواتك مقارنة بالشهر السابق، استمر في النمو الروحي! ➡️</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-center shadow-2xs">
                <span className="text-[11px] text-slate-400 block font-bold">أيام سجلت فيها</span>
                <span className="text-lg font-extrabold text-maroon-900">{curMonthDays.length} يوم</span>
              </div>
            </div>

            {/* Monthly KPI Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-center">
                <Sun className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                <span className="text-lg font-extrabold text-slate-900 block">{curBaker}</span>
                <span className="text-[11px] font-bold text-slate-500">صلاة باكر</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-center">
                <Moon className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
                <span className="text-lg font-extrabold text-slate-900 block">{curNowm + curGhoroub}</span>
                <span className="text-[11px] font-bold text-slate-500">غروب ونوم</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-center">
                <BookOpen className="w-5 h-5 text-maroon-800 mx-auto mb-1" />
                <span className="text-lg font-extrabold text-slate-900 block">{curBible}</span>
                <span className="text-[11px] font-bold text-slate-500">قراءات إنجيل</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-center">
                <Heart className="w-5 h-5 text-red-600 mx-auto mb-1" />
                <span className="text-lg font-extrabold text-slate-900 block">{curComm + curConf}</span>
                <span className="text-[11px] font-bold text-slate-500">تناول واعتراف</span>
              </div>
            </div>

            {/* Days Log */}
            <div className="space-y-3">
              <h4 className="font-extrabold text-slate-900 text-xs">سجل الأيام لشهر ({selectedHistoryMonth})</h4>
              {curMonthDays.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  لم يتم تسجيل أي أيام في هذا الشهر حتى الآن.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="py-2.5 px-3">اليوم</th>
                        <th className="py-2.5 px-3 text-center">باكر ☀️</th>
                        <th className="py-2.5 px-3 text-center">غروب 🌅</th>
                        <th className="py-2.5 px-3 text-center">نوم 🌙</th>
                        <th className="py-2.5 px-3 text-center">الإنجيل 📖</th>
                        <th className="py-2.5 px-3 text-center">التناول ✝️</th>
                        <th className="py-2.5 px-3 text-center">الاعتراف 🕊️</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {curMonthDays.sort().reverse().map(dStr => {
                        const day = diaryRecords[dStr] || {};
                        return (
                          <tr key={dStr} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-3 font-bold font-mono text-slate-800">{dStr}</td>
                            <td className="py-2.5 px-3 text-center">{day.baker ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">-</span>}</td>
                            <td className="py-2.5 px-3 text-center">{day.ghoroub ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">-</span>}</td>
                            <td className="py-2.5 px-3 text-center">{day.nowm ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">-</span>}</td>
                            <td className="py-2.5 px-3 text-center">{day.bible ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">-</span>}</td>
                            <td className="py-2.5 px-3 text-center">{day.communion ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">-</span>}</td>
                            <td className="py-2.5 px-3 text-center">{day.confession ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">-</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
