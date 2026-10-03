import React, { useState } from 'react';
import { 
  Sun, Moon, Sparkles, Check, Edit3, BarChart3, TrendingUp, TrendingDown, X, ShieldCheck, User 
} from 'lucide-react';

export default function ServantSpiritualDiary({
  user,
  servantDiary,
  selectedDiaryDate,
  setSelectedDiaryDate,
  todayDateStr,
  yesterdayDateStr,
  selectedDiaryMonth,
  setSelectedDiaryMonth,
  handleToggleServantDiaryItem,
  handleServantDiaryNoteChange,
  spiritualDiaryTab,
  setSpiritualDiaryTab,
  studentTrackingGrade,
  setStudentTrackingGrade,
  studentTrackingMonth,
  setStudentTrackingMonth,
  allUsers,
  studentsDiariesList,
  servantsDiariesList = [],
  isServantLeader = false,
  selectedStudentDetail,
  setSelectedStudentDetail,
  onSelectStudent
}) {
  const [myDiarySubTab, setMyDiarySubTab] = useState('entry'); // 'entry' | 'history'
  const [servantTrackingMonth, setServantTrackingMonth] = useState(studentTrackingMonth || new Date().toISOString().substring(0, 7));
  const [selectedServantDetail, setSelectedServantDetail] = useState(null);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 text-right">
      {/* Main Sub-Navigation: My Diary vs Students Tracking */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSpiritualDiaryTab('my_diary')}
            className={`text-xs px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
              spiritualDiaryTab === 'my_diary'
                ? 'bg-maroon-800 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sun className="w-4 h-4 text-gold-300" />
            <span>نوتتي الروحية الشخصية (كخادم)</span>
          </button>

          <button
            type="button"
            onClick={() => setSpiritualDiaryTab('students_tracking')}
            className={`text-xs px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
              spiritualDiaryTab === 'students_tracking'
                ? 'bg-maroon-800 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-gold-300" />
            <span>متابعة النوتة الروحية للمخدومين</span>
          </button>

          {isServantLeader && (
            <button
              type="button"
              onClick={() => setSpiritualDiaryTab('servants_tracking')}
              className={`text-xs px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
                spiritualDiaryTab === 'servants_tracking'
                  ? 'bg-purple-800 text-white shadow-sm ring-1 ring-gold-400/40'
                  : 'bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>متابعة نوتة الخدام (أمين الخدمة) 🛡️</span>
            </button>
          )}
        </div>

        <div className="text-[11px] font-bold text-slate-400">
          {spiritualDiaryTab === 'my_diary' 
            ? 'سجل محاسبة النفس والخلوة الفردية' 
            : spiritualDiaryTab === 'servants_tracking'
            ? 'متابعة التزام الخدام روحياً (خاص بأمين الخدمة)'
            : 'متابعة افتقاد التزام مخدومي المرحلة'}
        </div>
      </div>

      {/* TAB 1: SERVANT'S PERSONAL DIARY */}
      {spiritualDiaryTab === 'my_diary' && (
        <div className="space-y-6">
          {/* Sub-Tabs: Daily Entry vs History & Comparison */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-3 rounded-2xl">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMyDiarySubTab('entry')}
                className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                  myDiarySubTab === 'entry'
                    ? 'bg-maroon-50 text-maroon-900 border border-maroon-200'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                تسجيل اليوم والأمس ✍️
              </button>
              <button
                type="button"
                onClick={() => setMyDiarySubTab('history')}
                className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                  myDiarySubTab === 'history'
                    ? 'bg-maroon-50 text-maroon-900 border border-maroon-200'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>سجل المتابعة والشهور السابقة 📈</span>
              </button>
            </div>

            {myDiarySubTab === 'entry' ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">اليوم المحدد:</span>
                <select
                  value={selectedDiaryDate}
                  onChange={(e) => setSelectedDiaryDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-maroon-800"
                >
                  <option value={todayDateStr}>اليوم ({todayDateStr})</option>
                  <option value={yesterdayDateStr}>أمس ({yesterdayDateStr})</option>
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">اختر الشهر للمتابعة:</span>
                <select
                  value={selectedDiaryMonth}
                  onChange={(e) => setSelectedDiaryMonth(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-maroon-800"
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(offset => {
                    const d = new Date(new Date().getFullYear(), new Date().getMonth() - offset, 1);
                    const val = d.toISOString().substring(0, 7);
                    const label = d.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
                    return <option key={val} value={val}>{label}</option>;
                  })}
                </select>
              </div>
            )}
          </div>

          {/* Sub-view 1: Daily Entry */}
          {myDiarySubTab === 'entry' && (
            <div className="space-y-6">
              {/* Daily Canonical Prayers */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>الصلوات والأجبية والإنجيل ({selectedDiaryDate})</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { key: 'baker', label: 'صلاة باكر 🌅', desc: 'بدء اليوم مع المسيح ومزامير باكر' },
                    { key: 'ghoroub', label: 'صلاة الغروب 🌇', desc: 'شكر الله على بركات اليوم' },
                    { key: 'nowm', label: 'صلاة النوم 🌙', desc: 'فحص الضمير وتسليم النفس' },
                    { key: 'bible', label: 'قراءة الإنجيل 📖', desc: 'أصحاح على الأقل بتأمل' },
                  ].map(({ key, label, desc }) => {
                    const checked = servantDiary[selectedDiaryDate]?.[key] || false;
                    return (
                      <div
                        key={key}
                        onClick={() => handleToggleServantDiaryItem(key)}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                          checked
                            ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <span className="font-extrabold text-xs block">{label}</span>
                          <span className="text-[11px] text-slate-500 mt-0.5">{desc}</span>
                        </div>
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center border text-xs shrink-0 mr-3 ${
                          checked ? 'bg-amber-600 border-amber-600 text-white font-bold' : 'border-slate-300 bg-white'
                        }`}>
                          {checked && <Check className="w-4 h-4 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Service Duties & Sacraments */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                  <Sun className="w-4 h-4 text-maroon-800" />
                  <span>الأسرار الكنسية وأمانة الخدمة ({selectedDiaryDate})</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { key: 'lessonPrep', label: 'تحضير الدرس 📝', desc: 'صلاة وتأمل وتحضير موضوع الخدمة' },
                    { key: 'visitation', label: 'الافتقاد والسؤال 📞', desc: 'متابعة مخدومي الفصل تليفونياً أو منزلياً' },
                    { key: 'communion', label: 'التناول المقدس 🍞🍷', desc: 'الاتحاد بجسد الرب ودمه بالقداس' },
                    { key: 'confession', label: 'سر الاعتراف 🕊️', desc: 'جلسة الاعتراف مع أب الاعتراف' },
                  ].map(({ key, label, desc }) => {
                    const checked = servantDiary[selectedDiaryDate]?.[key] || false;
                    return (
                      <div
                        key={key}
                        onClick={() => handleToggleServantDiaryItem(key)}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                          checked
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <span className="font-extrabold text-xs block">{label}</span>
                          <span className="text-[11px] text-slate-500 mt-0.5">{desc}</span>
                        </div>
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center border text-xs shrink-0 mr-3 ${
                          checked ? 'bg-emerald-600 border-emerald-600 text-white font-bold' : 'border-slate-300 bg-white'
                        }`}>
                          {checked && <Check className="w-4 h-4 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-maroon-800" />
                  <span>تأملات، صلوات شخصية، وملاحظات روحية</span>
                </h4>
                <textarea
                  rows={3}
                  value={servantDiary[selectedDiaryDate]?.notes || ''}
                  onChange={(e) => handleServantDiaryNoteChange(e.target.value)}
                  placeholder="اكتب ما لمسه قلبك اليوم من كلمة الله، أو أسماء المخدومين الذين وضعتهم في صلاتك الخاصة..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 focus:outline-none focus:border-maroon-800 focus:bg-white transition-all"
                />
              </div>
            </div>
          )}

          {/* Sub-view 2: History & Analytics */}
          {myDiarySubTab === 'history' && (() => {
            const curMonthDays = Object.keys(servantDiary).filter(d => d.startsWith(selectedDiaryMonth));
            const [curY, curM] = selectedDiaryMonth.split('-').map(Number);
            const prevD = new Date(curY, curM - 2, 1);
            const prevMonthStr = prevD.toISOString().substring(0, 7);
            const prevMonthDays = Object.keys(servantDiary).filter(d => d.startsWith(prevMonthStr));

            let curBaker = 0, curGhoroub = 0, curNowm = 0, curBible = 0, curComm = 0, curConf = 0, curPrep = 0, curVisit = 0;
            curMonthDays.forEach(d => {
              const entry = servantDiary[d] || {};
              if (entry.baker) curBaker++;
              if (entry.ghoroub) curGhoroub++;
              if (entry.nowm) curNowm++;
              if (entry.bible) curBible++;
              if (entry.communion) curComm++;
              if (entry.confession) curConf++;
              if (entry.lessonPrep) curPrep++;
              if (entry.visitation) curVisit++;
            });

            let prevPrayersTotal = 0;
            prevMonthDays.forEach(d => {
              const entry = servantDiary[d] || {};
              if (entry.baker) prevPrayersTotal++;
              if (entry.ghoroub) prevPrayersTotal++;
              if (entry.nowm) prevPrayersTotal++;
            });

            const curPrayersTotal = curBaker + curGhoroub + curNowm;
            const prayersDiff = curPrayersTotal - prevPrayersTotal;

            return (
              <div className="space-y-6">
                {/* Performance Comparison Banner */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-slate-500 font-bold block">مقارنة الالتزام بالصلوات مع الشهر السابق:</span>
                    <div className="flex items-center gap-2 mt-1">
                      {prayersDiff > 0 ? (
                        <div className="flex items-center gap-1.5 text-emerald-700 font-extrabold text-sm">
                          <TrendingUp className="w-5 h-5 text-emerald-600" />
                          <span>صليت أكثر هذا الشهر (+{prayersDiff} صلاة أجبية مقارنة بالشهر السابق) ↗️</span>
                        </div>
                      ) : prayersDiff < 0 ? (
                        <div className="flex items-center gap-1.5 text-amber-700 font-extrabold text-sm">
                          <TrendingDown className="w-5 h-5 text-amber-600" />
                          <span>صليت أقل هذا الشهر ({prayersDiff} صلاة أجبية عن الشهر السابق) - تحتاج لتكثيف خلوتك ↘️</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-700 font-extrabold text-sm">
                          <span>ثبات في معدل الصلوات مقارنة بالشهر السابق (مواظبة جيدة) ➡️</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-center shadow-2xs">
                    <span className="text-[11px] text-slate-400 block font-bold">أيام التسجيل</span>
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
                    <Sparkles className="w-5 h-5 text-maroon-800 mx-auto mb-1" />
                    <span className="text-lg font-extrabold text-slate-900 block">{curBible}</span>
                    <span className="text-[11px] font-bold text-slate-500">قراءات الإنجيل</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-center">
                    <Check className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                    <span className="text-lg font-extrabold text-slate-900 block">{curPrep + curVisit}</span>
                    <span className="text-[11px] font-bold text-slate-500">تحضير وافتقاد</span>
                  </div>
                </div>

                {/* Logged Days Table for Current Month */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-slate-800 text-xs">سجل الأيام المسجلة في هذا الشهر:</h4>
                  {curMonthDays.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200">
                      لم تسجل أي أيام في هذا الشهر بعد.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                          <tr>
                            <th className="py-2.5 px-3">التاريخ</th>
                            <th className="py-2.5 px-3">باكر</th>
                            <th className="py-2.5 px-3">غروب ونوم</th>
                            <th className="py-2.5 px-3">إنجيل</th>
                            <th className="py-2.5 px-3">تحضير وافتقاد</th>
                            <th className="py-2.5 px-3">أسرار كنسية</th>
                            <th className="py-2.5 px-3">ملاحظات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {curMonthDays.sort().reverse().map(d => {
                            const entry = servantDiary[d] || {};
                            return (
                              <tr key={d} className="hover:bg-slate-50/80">
                                <td className="py-2 px-3 font-mono font-bold text-slate-800">{d}</td>
                                <td className="py-2 px-3">{entry.baker ? '✅' : '—'}</td>
                                <td className="py-2 px-3">{(entry.ghoroub || entry.nowm) ? '✅' : '—'}</td>
                                <td className="py-2 px-3">{entry.bible ? '✅' : '—'}</td>
                                <td className="py-2 px-3">{(entry.lessonPrep || entry.visitation) ? '✅' : '—'}</td>
                                <td className="py-2 px-3">
                                  {entry.communion && '🍞 تناول '}
                                  {entry.confession && '🕊️ اعتراف'}
                                  {!entry.communion && !entry.confession && '—'}
                                </td>
                                <td className="py-2 px-3 text-slate-500 max-w-xs truncate">{entry.notes || '—'}</td>
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
      )}

      {/* TAB 2: STUDENTS PASTORAL TRACKING */}
      {spiritualDiaryTab === 'students_tracking' && (
        <div className="space-y-6">
          {/* Filter Controls: Grade & Month */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm">متابعة التزام مخدومي المرحلة</h4>
              <p className="text-xs text-slate-500 mt-0.5">استعراض مدى مواظبة الطلبة على النوتة الروحية والصلوات والأسرار لمتابعتهم وافتقادهم.</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={studentTrackingGrade}
                onChange={(e) => setStudentTrackingGrade(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-maroon-800"
              >
                <option value="first">سنة أولى</option>
                <option value="second">سنة ثانية</option>
                <option value="third">سنة ثالثة</option>
                <option value="elisha">فصل أليشع (إعداد خدام)</option>
              </select>

              <select
                value={studentTrackingMonth}
                onChange={(e) => setStudentTrackingMonth(e.target.value)}
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
          </div>

          {/* Students Table with Spiritual Commitment Metrics */}
          {(() => {
            const gradeStudents = allUsers.filter(u => u.role === 'student' && (u.grade || 'first') === studentTrackingGrade);

            if (gradeStudents.length === 0) {
              return (
                <div className="text-center py-12 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200">
                  لا يوجد مخدومين مسجلين في هذه المرحلة بعد.
                </div>
              );
            }

            return (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-3 px-3">المخدوم</th>
                      <th className="py-3 px-3 text-center">أيام التسجيل</th>
                      <th className="py-3 px-3 text-center">صلوات الأجبية</th>
                      <th className="py-3 px-3 text-center">الإنجيل</th>
                      <th className="py-3 px-3 text-center">الأسرار (تناول/اعتراف)</th>
                      <th className="py-3 px-3 text-center">مستوى الالتزام</th>
                      <th className="py-3 px-3 text-center">تقرير كامل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {gradeStudents.map((st) => {
                      const studentEntries = studentsDiariesList.filter(d => d.userId === st.id);
                      const daysCount = studentEntries.length;

                      let totalPrayers = 0, totalBible = 0, totalComm = 0, totalConf = 0;
                      studentEntries.forEach(en => {
                        if (en.baker) totalPrayers++;
                        if (en.ghoroub) totalPrayers++;
                        if (en.nowm) totalPrayers++;
                        if (en.bible) totalBible++;
                        if (en.communion) totalComm++;
                        if (en.confession) totalConf++;
                      });

                      let statusLabel = 'يحتاج افتقاد ⚠️';
                      let statusClass = 'bg-rose-50 text-rose-700 border-rose-200';
                      if (daysCount >= 15) {
                        statusLabel = 'ممتاز ومواظب 🌟';
                        statusClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                      } else if (daysCount >= 7) {
                        statusLabel = 'متوسط 🔄';
                        statusClass = 'bg-amber-50 text-amber-800 border-amber-200';
                      }

                      return (
                        <tr key={st.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-3 font-bold text-slate-900">
                            <div>
                              <span>{st.fullName || 'بدون اسم'}</span>
                              <span className="text-[10px] text-slate-400 block font-normal font-mono" dir="ltr">{st.phone}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-800">{daysCount} يوم</td>
                          <td className="py-3 px-3 text-center font-bold text-amber-700">{totalPrayers} صلاة</td>
                          <td className="py-3 px-3 text-center font-bold text-maroon-800">{totalBible} أصحاح</td>
                          <td className="py-3 px-3 text-center text-slate-600 font-bold">
                            {totalComm > 0 && <span className="text-emerald-700">تناول ({totalComm}) </span>}
                            {totalConf > 0 && <span className="text-maroon-800">• اعتراف ({totalConf})</span>}
                            {totalComm === 0 && totalConf === 0 && <span className="text-slate-400">لم يسجل</span>}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedStudentDetail({
                                student: st,
                                entries: studentEntries,
                                daysCount,
                                totalPrayers,
                                totalBible,
                                totalComm,
                                totalConf
                              })}
                              className="bg-maroon-50 hover:bg-maroon-100 text-maroon-900 border border-maroon-200 font-bold px-2.5 py-1 rounded-lg text-[11px] transition-colors"
                            >
                              عرض التقرير 📄
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* Detail Modal for Selected Student */}
          {selectedStudentDetail && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-base">{selectedStudentDetail.student.fullName}</h4>
                    <span className="text-xs text-slate-500">تقرير النوتة الروحية لشهر ({studentTrackingMonth})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedStudentDetail(null)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] font-bold">أيام التسجيل</span>
                    <strong className="text-slate-900 text-sm">{selectedStudentDetail.daysCount} يوم</strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] font-bold">صلوات الأجبية</span>
                    <strong className="text-amber-800 text-sm">{selectedStudentDetail.totalPrayers} صلاة</strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] font-bold">قراءات الإنجيل</span>
                    <strong className="text-maroon-800 text-sm">{selectedStudentDetail.totalBible} أصحاح</strong>
                  </div>
                </div>

                <div className="space-y-2">
                  <h5 className="font-bold text-xs text-slate-800">سجل الأيام المسجلة لهذا المخدوم:</h5>
                  {selectedStudentDetail.entries.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-xl">
                      لم يسجل المخدوم أي نوتة في هذا الشهر بعد.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto border border-slate-200 rounded-xl">
                      {selectedStudentDetail.entries.sort((a,b) => b.date.localeCompare(a.date)).map(en => (
                        <div key={en.id || en.date} className="p-2.5 text-xs flex items-center justify-between hover:bg-slate-50">
                          <span className="font-bold font-mono text-slate-800">{en.date}</span>
                          <div className="flex items-center gap-1.5 text-[11px]">
                            {en.baker && <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold">باكر</span>}
                            {en.ghoroub && <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold">غروب</span>}
                            {en.nowm && <span className="bg-indigo-100 text-indigo-900 px-1.5 py-0.5 rounded font-bold">نوم</span>}
                            {en.bible && <span className="bg-maroon-100 text-maroon-900 px-1.5 py-0.5 rounded font-bold">إنجيل</span>}
                            {en.communion && <span className="bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-bold">تناول</span>}
                            {en.confession && <span className="bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded font-bold">اعتراف</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center gap-2">
                  {onSelectStudent && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetStudent = selectedStudentDetail.student;
                        setSelectedStudentDetail(null);
                        onSelectStudent(targetStudent);
                      }}
                      className="flex-1 py-2.5 bg-gradient-to-r from-maroon-900 to-maroon-800 text-white font-bold rounded-xl text-xs shadow-xs hover:from-maroon-950 hover:to-maroon-900 transition-all cursor-pointer ring-1 ring-gold-400/30"
                    >
                      فتح الملف الشامل (360°) 🔍
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedStudentDetail(null)}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SERVANTS SPIRITUAL TRACKING (EXCLUSIVE TO SERVANT LEADERS & ADMIN) */}
      {isServantLeader && spiritualDiaryTab === 'servants_tracking' && (
        <div className="space-y-6">
          {/* Header & Month Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-50/60 border border-purple-200 p-4 rounded-2xl">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-purple-900 text-gold-300 flex items-center justify-center font-bold shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">متابعة النوتة الروحية لخدام الأسرة</h4>
                <p className="text-xs text-slate-500 mt-0.5">خاص بأمين الخدمة: متابعة الخلوة الفردية والصلوات والأسرار للخدام للاطمئنان عليهم وافتقادهم.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">الشهر:</span>
              <select
                value={servantTrackingMonth}
                onChange={(e) => setServantTrackingMonth(e.target.value)}
                className="bg-white border border-purple-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-800"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(offset => {
                  const d = new Date(new Date().getFullYear(), new Date().getMonth() - offset, 1);
                  const val = d.toISOString().substring(0, 7);
                  const label = d.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
                  return <option key={val} value={val}>{label}</option>;
                })}
              </select>
            </div>
          </div>

          {/* Servants Table with Metrics */}
          {(() => {
            const registeredServants = allUsers.filter(u => u.role === 'servant' || u.role === 'servant_leader');

            if (registeredServants.length === 0) {
              return (
                <div className="text-center py-12 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200">
                  لا يوجد خدام مسجلين في المنظومة بعد.
                </div>
              );
            }

            return (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-purple-50/70 border-b border-purple-200 text-purple-950 font-extrabold">
                    <tr>
                      <th className="py-3 px-3">الخادم</th>
                      <th className="py-3 px-3 text-center">الصفة</th>
                      <th className="py-3 px-3 text-center">أيام التسجيل</th>
                      <th className="py-3 px-3 text-center">صلوات الأجبية</th>
                      <th className="py-3 px-3 text-center">الكتاب المقدس</th>
                      <th className="py-3 px-3 text-center">تحضير الدرس / الافتقاد</th>
                      <th className="py-3 px-3 text-center">الأسرار (تناول/اعتراف)</th>
                      <th className="py-3 px-3 text-center">مستوى المواظبة</th>
                      <th className="py-3 px-3 text-center">سجل الأيام</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {registeredServants.map((srv) => {
                      const servantEntries = (servantsDiariesList || []).filter(d => d.userId === srv.id && (!d.date || d.date.startsWith(servantTrackingMonth)));
                      const daysCount = servantEntries.length;

                      let totalPrayers = 0, totalBible = 0, totalPrep = 0, totalComm = 0, totalConf = 0;
                      servantEntries.forEach(en => {
                        if (en.baker) totalPrayers++;
                        if (en.ghoroub) totalPrayers++;
                        if (en.nowm) totalPrayers++;
                        if (en.bible) totalBible++;
                        if (en.lessonPrep) totalPrep++;
                        if (en.visitation) totalPrep++;
                        if (en.communion) totalComm++;
                        if (en.confession) totalConf++;
                      });

                      let statusLabel = 'يحتاج افتقاد ⚠️';
                      let statusClass = 'bg-rose-50 text-rose-700 border-rose-200';
                      if (daysCount >= 15) {
                        statusLabel = 'مواظب وممتاز 🌟';
                        statusClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                      } else if (daysCount >= 7) {
                        statusLabel = 'متوسط 🔄';
                        statusClass = 'bg-amber-50 text-amber-800 border-amber-200';
                      }

                      return (
                        <tr key={srv.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{srv.fullName || 'بدون اسم'}</div>
                            <div className="text-[10px] text-slate-400 font-mono" dir="ltr">{srv.phone}</div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              srv.role === 'servant_leader' 
                                ? 'bg-purple-100 text-purple-900 border border-purple-200' 
                                : 'bg-maroon-100 text-maroon-900 border border-maroon-200'
                            }`}>
                              {srv.role === 'servant_leader' ? 'أمين خدمة' : 'خادم'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-800 font-mono">
                            {daysCount} يوم
                          </td>
                          <td className="py-3 px-3 text-center text-amber-900 font-mono font-bold">
                            {totalPrayers} صلاة
                          </td>
                          <td className="py-3 px-3 text-center text-maroon-900 font-mono font-bold">
                            {totalBible} أصحاح
                          </td>
                          <td className="py-3 px-3 text-center text-cyan-900 font-mono font-bold">
                            {totalPrep} نشاط
                          </td>
                          <td className="py-3 px-3 text-center text-emerald-800 font-mono font-bold">
                            {totalComm + totalConf} أسرار
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedServantDetail({
                                servant: srv,
                                entries: servantEntries,
                                daysCount,
                                totalPrayers,
                                totalBible,
                                totalPrep,
                                totalComm,
                                totalConf
                              })}
                              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-lg font-bold text-[11px] transition-colors cursor-pointer shadow-2xs"
                            >
                              عرض السجل 📖
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* Servant Detailed View Modal */}
          {selectedServantDetail && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-purple-200 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                      <span>سجل نوتة الخادم:</span>
                      <span className="text-purple-900">{selectedServantDetail.servant.fullName}</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">تفاصيل أيام الخلوة الفردية والصلوات لشهر {servantTrackingMonth}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedServantDetail(null)}
                    className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Quick Summary Cards */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] font-bold">أيام التسجيل</span>
                    <strong className="text-slate-900 text-sm">{selectedServantDetail.daysCount} يوم</strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] font-bold">صلوات الأجبية</span>
                    <strong className="text-amber-800 text-sm">{selectedServantDetail.totalPrayers}</strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] font-bold">قراءات الإنجيل</span>
                    <strong className="text-maroon-800 text-sm">{selectedServantDetail.totalBible}</strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] font-bold">تحضير وافتقاد</span>
                    <strong className="text-cyan-800 text-sm">{selectedServantDetail.totalPrep}</strong>
                  </div>
                </div>

                <div className="space-y-2">
                  <h5 className="font-bold text-xs text-slate-800">الأيام المسجلة للخادم:</h5>
                  {selectedServantDetail.entries.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-xl">
                      لم يسجل الخادم أي نوتة في هذا الشهر بعد.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto border border-slate-200 rounded-xl">
                      {selectedServantDetail.entries.sort((a,b) => b.date.localeCompare(a.date)).map(en => (
                        <div key={en.id || en.date} className="p-2.5 text-xs flex items-center justify-between hover:bg-slate-50">
                          <span className="font-bold font-mono text-slate-800">{en.date}</span>
                          <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
                            {en.baker && <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold">باكر</span>}
                            {en.ghoroub && <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold">غروب</span>}
                            {en.nowm && <span className="bg-indigo-100 text-indigo-900 px-1.5 py-0.5 rounded font-bold">نوم</span>}
                            {en.bible && <span className="bg-maroon-100 text-maroon-900 px-1.5 py-0.5 rounded font-bold">إنجيل</span>}
                            {en.lessonPrep && <span className="bg-cyan-100 text-cyan-900 px-1.5 py-0.5 rounded font-bold">تحضير</span>}
                            {en.visitation && <span className="bg-sky-100 text-sky-900 px-1.5 py-0.5 rounded font-bold">افتقاد</span>}
                            {en.communion && <span className="bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-bold">تناول</span>}
                            {en.confession && <span className="bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded font-bold">اعتراف</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedServantDetail(null)}
                    className="py-2.5 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
