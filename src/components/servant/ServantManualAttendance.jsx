import React, { useState, useEffect, useMemo } from 'react';
import { UserCheck, Search, Clock, CheckCircle2, XCircle, AlertCircle, Sparkles, Filter, Calendar, ChevronDown, Check } from 'lucide-react';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function ServantManualAttendance({
  allUsers,
  getGradeTitle,
  handleManualAttendanceWithTime,
  handleManualAbsence,
  manualAttendLoadingId,
  manualAttendSuccessId,
  manualAbsenceLoadingId,
  manualAbsenceSuccessId,
  todayStr,
  onOpenHolidays,
  onSwitchToTotals
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterGrade, setActiveFilterGrade] = useState('all');
  const [attendanceFilterStatus, setAttendanceFilterStatus] = useState('all'); // 'all' | 'unrecorded' | 'attended' | 'absent'
  const [dateRecords, setDateRecords] = useState({});
  const [showCustomDateInput, setShowCustomDateInput] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState(false);

  // Official Start Friday of the service year (الجمعة الأولى: 2 أكتوبر 2026)
  const SERVICE_START_FRIDAY = '2026-10-02';

  // Dynamic Calculation of most recent Friday (today if Friday, or last Friday)
  const getMostRecentFriday = () => {
    const d = new Date();
    const day = d.getDay(); // 0: Sun, 1: Mon, ..., 5: Fri, 6: Sat
    const diff = (day >= 5) ? (day - 5) : (day + 2);
    d.setDate(d.getDate() - diff);
    const calculated = d.toISOString().split('T')[0];
    return calculated < SERVICE_START_FRIDAY ? SERVICE_START_FRIDAY : calculated;
  };

  const mostRecentFriday = useMemo(() => getMostRecentFriday(), []);
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState(mostRecentFriday);

  // Generate dynamic list of Fridays starting strictly from 2026-10-02 (الجمعة 1)
  const fridaysList = useMemo(() => {
    const list = [];
    const startDate = new Date(SERVICE_START_FRIDAY + 'T12:00:00');
    const now = new Date();
    // Include up to next upcoming Friday (+7 days from now)
    const maxDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let cur = new Date(startDate);
    let weekNum = 1;
    while (cur <= maxDate) {
      list.push({
        dateStr: cur.toISOString().split('T')[0],
        weekNum: weekNum
      });
      cur.setDate(cur.getDate() + 7);
      weekNum++;
    }

    if (list.length === 0) {
      list.push({ dateStr: SERVICE_START_FRIDAY, weekNum: 1 });
    }

    // Return reversed so latest Friday is at the top of the dropdown
    return list.slice().reverse();
  }, []);

  // Format date in Arabic (e.g. الجمعة 17 أكتوبر 2026)
  const formatFridayArabic = (dateStr) => {
    if (!dateStr) return '';
    try {
      if (typeof dateStr === 'object' && dateStr.seconds) {
        return new Date(dateStr.seconds * 1000).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      }
      if (typeof dateStr === 'string' && dateStr.includes('-')) {
        const [year, month, day] = dateStr.split('-');
        const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
        return d.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      }
      return String(dateStr);
    } catch {
      return '';
    }
  };

  // Realtime subscription to attendance records for the selected date
  useEffect(() => {
    if (!selectedAttendanceDate) return;
    const q = query(
      collection(db, 'attendance'),
      where('date', '==', selectedAttendanceDate)
    );
    const unsub = onSnapshot(q, (snap) => {
      const map = {};
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.userId) {
          map[data.userId] = {
            id: d.id,
            status: data.status,
            time: data.time,
            pointsAwarded: data.pointsAwarded
          };
        }
      });
      setDateRecords(map);
    }, (err) => {
      console.error('Error fetching date attendance:', err);
    });

    return () => unsub();
  }, [selectedAttendanceDate]);

  // Filter only students of Servants Prep (exclude Elisha stage which has its own independent service)
  const studentsList = (allUsers || []).filter(u => u.role === 'student' && u.grade !== 'elisha');

  const attendedCount = studentsList.filter(st => dateRecords[st.id]?.status === 'حاضر').length;
  const absentCount = studentsList.filter(st => dateRecords[st.id]?.status === 'غائب').length;
  const unrecordedCount = studentsList.filter(st => !dateRecords[st.id]).length;

  const filteredStudents = studentsList.filter(st => {
    const matchesSearch = !searchQuery.trim() || 
      (st.fullName || '').toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      (st.phone || '').includes(searchQuery.trim());
    
    const matchesGrade = activeFilterGrade === 'all' || (st.grade || 'first') === activeFilterGrade;

    let matchesStatus = true;
    if (attendanceFilterStatus === 'unrecorded') matchesStatus = !dateRecords[st.id];
    else if (attendanceFilterStatus === 'attended') matchesStatus = dateRecords[st.id]?.status === 'حاضر';
    else if (attendanceFilterStatus === 'absent') matchesStatus = dateRecords[st.id]?.status === 'غائب';

    return matchesSearch && matchesGrade && matchesStatus;
  });

  // Mark all unrecorded students as present in bulk
  const handleMarkAllPresent = async () => {
    const targets = filteredStudents.filter(st => dateRecords[st.id]?.status !== 'حاضر');
    if (targets.length === 0) {
      alert('جميع الطلاب في هذه القائمة مسجلين حاضر بالفعل لهذا التاريخ.');
      return;
    }

    if (!window.confirm(`هل تريد تسجيل (${targets.length}) مخدومين حاضرين لتاريخ ${formatFridayArabic(selectedAttendanceDate)}؟`)) {
      return;
    }

    setBulkLoading(true);
    try {
      for (const st of targets) {
        await handleManualAttendanceWithTime(st, '10:30 ص', selectedAttendanceDate);
      }
      setBulkSuccess(true);
      setTimeout(() => setBulkSuccess(false), 3000);
    } catch (err) {
      console.error('Error in bulk attendance:', err);
      alert('حدث خطأ أثناء رصد الحضور.');
    } finally {
      setBulkLoading(false);
    }
  };

  const isSelectedDateToday = selectedAttendanceDate === new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-6 text-right">
      {/* Top Header: Title & Dropdown Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-700" />
              <span>كشف تسجيل الحضور والغياب للخدمة</span>
            </h3>
            <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
              isSelectedDateToday 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-amber-50 text-amber-900 border-amber-300'
            }`}>
              {isSelectedDateToday ? `خدمة اليوم (${todayStr})` : `رصد جمعة سابقة 🗓️`}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            اختر الجمعة المراد رصدها من القائمة، وسجّل الحضور والغياب بلمسة واحدة دون الحاجة لإدخال وقت بالدقائق.
          </p>
        </div>

        {/* Friday Selector Dropdown & Custom Date Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {!showCustomDateInput ? (
            <div className="relative min-w-[250px] bg-amber-50/70 border-2 border-amber-300 hover:border-amber-500 rounded-2xl p-2 transition-all shadow-2xs">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-maroon-800 shrink-0" />
                <div className="flex-1 text-right">
                  <span className="text-[10px] font-extrabold text-amber-950 block leading-tight">
                    اختر جمعة الخدمة للرصد:
                  </span>
                  <select
                    value={selectedAttendanceDate}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setShowCustomDateInput(true);
                      } else {
                        setSelectedAttendanceDate(e.target.value);
                      }
                    }}
                    className="w-full bg-transparent text-xs font-black text-slate-900 focus:outline-none cursor-pointer pt-0.5"
                  >
                    {fridaysList.map(({ dateStr, weekNum }) => {
                      const isRecent = dateStr === mostRecentFriday;
                      const isToday = dateStr === new Date().toISOString().split('T')[0];
                      const label = formatFridayArabic(dateStr);
                      return (
                        <option key={dateStr} value={dateStr}>
                          الجمعة ({weekNum}): {label} {isToday ? '⭐️ (اليوم)' : isRecent ? '📌 (الأحدث تلقائياً)' : ''}
                        </option>
                      );
                    })}
                    <option value="custom">📅 اختيار تاريخ مخصص آخر من التقويم...</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-50 border-2 border-maroon-800 rounded-2xl p-2 min-h-[46px]">
              <Calendar className="w-4 h-4 text-maroon-800 shrink-0" />
              <input
                type="date"
                value={selectedAttendanceDate}
                onChange={(e) => setSelectedAttendanceDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 font-mono focus:outline-none cursor-pointer"
              />
              <button
                type="button"
                onClick={() => {
                  setShowCustomDateInput(false);
                  setSelectedAttendanceDate(mostRecentFriday);
                }}
                className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-800 px-2 py-1 rounded-lg font-bold"
              >
                العودة للجمعات ↩
              </button>
            </div>
          )}

          {onSwitchToTotals && (
            <button
              type="button"
              onClick={onSwitchToTotals}
              className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 min-h-[46px] cursor-pointer shadow-2xs shrink-0"
              title="كشف الحضور والإجماليات الشامل"
            >
              <span>📊 كشف الإجماليات (Totals)</span>
            </button>
          )}

          {onOpenHolidays && (
            <button
              type="button"
              onClick={onOpenHolidays}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-h-[46px] cursor-pointer shadow-2xs shrink-0"
              title="إدارة الجمع المعفاة والإجازات"
            >
              <span>إجازات الخدمة 🗓️</span>
            </button>
          )}
        </div>
      </div>

      {/* Date Attendance Summary Cards & Status Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          type="button"
          onClick={() => setAttendanceFilterStatus('all')}
          className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
            attendanceFilterStatus === 'all'
              ? 'bg-maroon-900 text-white border-maroon-950 shadow-xs'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <span className="text-[10px] font-bold block opacity-80">إجمالي المخدومين</span>
          <span className="text-lg font-black">{studentsList.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setAttendanceFilterStatus('attended')}
          className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
            attendanceFilterStatus === 'attended'
              ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
          }`}
        >
          <span className="text-[10px] font-bold block opacity-80">حاضر لهذا التاريخ 🟢</span>
          <span className="text-lg font-black">{attendedCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setAttendanceFilterStatus('absent')}
          className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
            attendanceFilterStatus === 'absent'
              ? 'bg-rose-700 text-white border-rose-800 shadow-xs'
              : 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100'
          }`}
        >
          <span className="text-[10px] font-bold block opacity-80">غائب لهذا التاريخ 🔴</span>
          <span className="text-lg font-black">{absentCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setAttendanceFilterStatus('unrecorded')}
          className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
            attendanceFilterStatus === 'unrecorded'
              ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
              : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
          }`}
        >
          <span className="text-[10px] font-bold block opacity-80">لم يُرصد بعد ⏳</span>
          <span className="text-lg font-black">{unrecordedCount}</span>
        </button>
      </div>

      {/* Action Bar: Grade Tabs + Search + Mark All Present Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        {/* Grade Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveFilterGrade('all')}
            className={`px-3 py-1.5 min-h-[38px] rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeFilterGrade === 'all'
                ? 'bg-maroon-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            القاعة المشتركة (سنة أولى + ثانية) ({studentsList.length})
          </button>

          {['first', 'second'].map((g) => {
            const count = studentsList.filter(s => (s.grade || 'first') === g).length;
            const label = g === 'first' ? 'السنة الأولى' : 'السنة الثانية';
            return (
              <button
                key={g}
                type="button"
                onClick={() => setActiveFilterGrade(g)}
                className={`px-3 py-1.5 min-h-[38px] rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  activeFilterGrade === g
                    ? 'bg-maroon-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeFilterGrade === g ? 'bg-gold-400 text-maroon-950' : 'bg-slate-200 text-slate-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-60 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ابحث بالاسم أو الرقم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 min-h-[38px] text-xs text-slate-800 focus:outline-none focus:border-maroon-800 focus:bg-white transition-all font-bold"
          />
        </div>
      </div>

      {/* One-Click Mark All Present Bar */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-700 shrink-0" />
          <div>
            <span className="text-xs font-black text-emerald-950 block">
              رصد سريع لكامل القاعة ({formatFridayArabic(selectedAttendanceDate)}):
            </span>
            <span className="text-[11px] text-emerald-700">
              يمكنك رصد القاعة كلها حاضر بنقرة واحدة، ثم الضغط على الغائبين فقط لاستثنائهم.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleMarkAllPresent}
          disabled={bulkLoading || unrecordedCount === 0}
          className="min-h-[44px] bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 hover:from-emerald-700 hover:to-emerald-900 text-white font-black text-xs px-5 py-2 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {bulkLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>جاري رصد الكل...</span>
            </>
          ) : bulkSuccess ? (
            <>
              <Check className="w-4 h-4 text-gold-300" />
              <span>تم رصد القاعة كلها بنجاح ✓</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 text-gold-300" />
              <span>رصد القاعة كلها حاضر ✨ ({unrecordedCount} متبقي)</span>
            </>
          )}
        </button>
      </div>

      {/* Students Cards Grid */}
      {filteredStudents.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-6 space-y-2">
          <UserCheck className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-700">لم يتم العثور على أي مخدومين يطابقون الفلتر المختار.</p>
          <p className="text-[11px] text-slate-400">يمكنك تغيير فلتر المرحلة أو حالة الرصد من الأعلى.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredStudents.map((st) => {
            const gradeName = getGradeTitle ? getGradeTitle(st.grade || 'first') : (st.grade || 'سنة أولى');
            const isAttending = manualAttendLoadingId === st.id;
            const isAttendSuccess = manualAttendSuccessId === st.id;
            const isAbsenting = manualAbsenceLoadingId === st.id;
            const isAbsentSuccess = manualAbsenceSuccessId === st.id;
            const existingRecord = dateRecords[st.id];

            return (
              <div 
                key={st.id} 
                className={`bg-white border-2 rounded-3xl p-4 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between space-y-3 relative group ${
                  existingRecord?.status === 'حاضر'
                    ? 'border-emerald-400 bg-emerald-50/20 shadow-xs'
                    : existingRecord?.status === 'غائب'
                    ? 'border-rose-300 bg-rose-50/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Top Info */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 shadow-xs ${
                      existingRecord?.status === 'حاضر'
                        ? 'bg-emerald-600 text-white'
                        : existingRecord?.status === 'غائب'
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-800 text-gold-300'
                    }`}>
                      {st.fullName ? st.fullName[0] : 'م'}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-maroon-900 transition-colors">
                        {st.fullName || 'بدون اسم'}
                      </h4>
                      <span className="text-[11px] text-slate-500 font-mono block" dir="ltr">
                        {st.phone || 'بدون هاتف'}
                      </span>
                    </div>
                  </div>

                  <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-lg text-[10px] shrink-0">
                    {gradeName}
                  </span>
                </div>

                {/* Status Indicator for Selected Friday */}
                {existingRecord ? (
                  <div className={`p-2 rounded-xl text-xs flex items-center justify-between border ${
                    existingRecord.status === 'حاضر'
                      ? 'bg-emerald-100/70 text-emerald-900 border-emerald-300'
                      : 'bg-rose-100/70 text-rose-900 border-rose-300'
                  }`}>
                    <div className="flex items-center gap-1.5 font-black text-[11px]">
                      {existingRecord.status === 'حاضر' ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span>مسجل حاضر ✓</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-rose-700 shrink-0" />
                          <span>مسجل غائب لهذا التاريخ</span>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-2 rounded-xl text-[11px] text-amber-900 bg-amber-50 border border-amber-200 text-center font-extrabold">
                    لم يُرصد لهذا التاريخ بعد ⏳
                  </div>
                )}

                {/* Action Buttons: State-aware to eliminate clutter & confusion */}
                {existingRecord ? (
                  <div className="pt-1">
                    {existingRecord.status === 'حاضر' ? (
                      <button
                        type="button"
                        disabled={isAttending || isAbsenting || bulkLoading}
                        onClick={() => handleManualAbsence(st, selectedAttendanceDate)}
                        className="w-full min-h-[42px] px-3 py-2 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 border border-rose-200 text-rose-800 bg-rose-50/60 hover:bg-rose-100 disabled:opacity-60"
                      >
                        {isAbsenting ? (
                          <span className="inline-block w-4 h-4 border-2 border-rose-700 border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>تغيير الحالة إلى غائب</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isAttending || isAbsenting || bulkLoading}
                        onClick={() => handleManualAttendanceWithTime(st, '10:30 ص', selectedAttendanceDate)}
                        className="w-full min-h-[42px] px-3 py-2 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 border border-emerald-300 text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100 disabled:opacity-60"
                      >
                        {isAttending ? (
                          <span className="inline-block w-4 h-4 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>تغيير الحالة إلى حاضر</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isAttending || isAbsenting || bulkLoading}
                      onClick={() => handleManualAttendanceWithTime(st, '10:30 ص', selectedAttendanceDate)}
                      className="min-h-[48px] px-3 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
                    >
                      {isAttending ? (
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-gold-300" />
                          <span>تسجيل حاضر</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isAttending || isAbsenting || bulkLoading}
                      onClick={() => handleManualAbsence(st, selectedAttendanceDate)}
                      className="min-h-[48px] px-3 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs bg-rose-50 hover:bg-rose-100 text-rose-800 border-2 border-rose-200 disabled:opacity-60"
                    >
                      {isAbsenting ? (
                        <span className="inline-block w-4 h-4 border-2 border-rose-700 border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-rose-600" />
                          <span>تسجيل غياب</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
