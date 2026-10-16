import React, { useState, useEffect } from 'react';
import { UserCheck, Search, Clock, CheckCircle2, XCircle, AlertCircle, Sparkles, Filter, Calendar } from 'lucide-react';
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
  onOpenHolidays
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterGrade, setActiveFilterGrade] = useState('all');
  const [attendanceFilterStatus, setAttendanceFilterStatus] = useState('all'); // 'all' | 'unrecorded' | 'attended' | 'absent'
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dateRecords, setDateRecords] = useState({});

  // Helper: Get formatted current time in Arabic (مثلاً: 11:30 ص)
  const getCurrentTimeFormatted = () => {
    return new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  // State to hold custom arrival time per student (keyed by student ID)
  const [arrivalTimes, setArrivalTimes] = useState({});

  const handleTimeChange = (studentId, timeVal) => {
    setArrivalTimes(prev => ({
      ...prev,
      [studentId]: timeVal
    }));
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

  // Filter only students
  const studentsList = (allUsers || []).filter(u => u.role === 'student');

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

  const isSelectedDateToday = selectedAttendanceDate === new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-6 text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-700" />
              <span>تسجيل حضور يدوي للمخدومين</span>
            </h3>
            <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
              isSelectedDateToday 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-amber-50 text-amber-900 border-amber-300'
            }`}>
              {isSelectedDateToday ? `خدمة اليوم (${todayStr})` : `رصد يدوي لتاريخ: ${selectedAttendanceDate} 🗓️`}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            تسجيل حضور أي مخدوم يدوياً في حالة عدم توفر هاتف، أو رصد أسابيع سابقة لم تُسجل، مع تحديد وقت الوصول بدقة.
          </p>
        </div>

        {/* Date Selector for Retroactive Attendance & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl min-h-[44px]">
            <Calendar className="w-4 h-4 text-maroon-800 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500">تاريخ الخدمة:</span>
              <input
                type="date"
                value={selectedAttendanceDate}
                onChange={(e) => setSelectedAttendanceDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 font-mono focus:outline-none cursor-pointer"
              />
            </div>
            {!isSelectedDateToday && (
              <button
                type="button"
                onClick={() => setSelectedAttendanceDate(new Date().toISOString().split('T')[0])}
                className="text-[10px] font-bold text-emerald-700 hover:underline px-1 cursor-pointer"
                title="العودة لليوم"
              >
                اليوم
              </button>
            )}
          </div>

          {onOpenHolidays && (
            <button
              type="button"
              onClick={onOpenHolidays}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer shadow-2xs shrink-0"
              title="إدارة الجمع المعفاة والإجازات"
            >
              <span>إجازات الخدمة 🗓️</span>
            </button>
          )}

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث بالاسم أو رقم الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pr-9 pl-3 py-2.5 min-h-[44px] text-xs text-slate-800 focus:outline-none focus:border-maroon-800 focus:bg-white transition-all shadow-2xs font-bold"
            />
          </div>
        </div>
      </div>

      {/* Date Attendance Quick Summary & Status Filter */}
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

      {/* Grade Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveFilterGrade('all')}
          className={`px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeFilterGrade === 'all'
              ? 'bg-maroon-800 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          كافة المراحل ({studentsList.length})
        </button>

        {['first', 'second', 'third', 'elisha'].map((g) => {
          const count = studentsList.filter(s => (s.grade || 'first') === g).length;
          return (
            <button
              key={g}
              type="button"
              onClick={() => setActiveFilterGrade(g)}
              className={`px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                activeFilterGrade === g
                  ? 'bg-maroon-800 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{getGradeTitle(g)}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeFilterGrade === g ? 'bg-gold-400 text-maroon-950' : 'bg-slate-200 text-slate-700'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
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
            const gradeName = getGradeTitle(st.grade || 'first');
            const studentArrivalTime = arrivalTimes[st.id] !== undefined ? arrivalTimes[st.id] : getCurrentTimeFormatted();
            const isAttending = manualAttendLoadingId === st.id;
            const isAttendSuccess = manualAttendSuccessId === st.id;
            const isAbsenting = manualAbsenceLoadingId === st.id;
            const isAbsentSuccess = manualAbsenceSuccessId === st.id;
            const existingRecord = dateRecords[st.id];

            return (
              <div 
                key={st.id} 
                className={`bg-white border rounded-3xl p-4 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between space-y-3 relative group ${
                  existingRecord?.status === 'حاضر'
                    ? 'border-emerald-300 ring-1 ring-emerald-200'
                    : existingRecord?.status === 'غائب'
                    ? 'border-rose-300 ring-1 ring-rose-200'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Top Info */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-gold-300 flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                      {st.fullName ? st.fullName[0] : 'م'}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-emerald-900 transition-colors">
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

                {/* Status for Chosen Date Indicator */}
                {existingRecord ? (
                  <div className={`p-2 rounded-xl text-xs flex items-center justify-between border ${
                    existingRecord.status === 'حاضر'
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      : 'bg-rose-50 text-rose-900 border-rose-300'
                  }`}>
                    <div className="flex items-center gap-1.5 font-extrabold text-[11px]">
                      {existingRecord.status === 'حاضر' ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>مسجل حاضر ({existingRecord.time || 'في الموعد'})</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>مسجل غائب لهذا التاريخ</span>
                        </>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-600">
                      {existingRecord.status === 'حاضر' ? `+${existingRecord.pointsAwarded || 10}⭐` : '0⭐'}
                    </span>
                  </div>
                ) : (
                  <div className="p-1.5 rounded-xl text-[11px] text-amber-800 bg-amber-50/80 border border-amber-200 text-center font-bold">
                    لم يُرصد لهذا التاريخ بعد ⏳
                  </div>
                )}

                {/* Time of Arrival Field */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-maroon-800" />
                      وقت الوصول للخدمة:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleTimeChange(st.id, getCurrentTimeFormatted())}
                      className="text-[10px] font-bold text-maroon-800 hover:underline cursor-pointer"
                      title="ضبط على الوقت الحالي الآن"
                    >
                      (الآن ⏱️)
                    </button>
                  </div>
                  <input
                    type="text"
                    value={studentArrivalTime}
                    onChange={(e) => handleTimeChange(st.id, e.target.value)}
                    placeholder="مثلاً: 11:30 ص"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-center text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>

                {/* Action Buttons: Present or Absent */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isAttending || isAbsenting}
                    onClick={() => handleManualAttendanceWithTime(st, studentArrivalTime, selectedAttendanceDate)}
                    className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs ${
                      isAttendSuccess || existingRecord?.status === 'حاضر'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    } disabled:opacity-60`}
                  >
                    {isAttending ? (
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : isAttendSuccess ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>تم الحضور ✓</span>
                      </>
                    ) : existingRecord?.status === 'حاضر' ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>تحديث الحضور ✓</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>حاضر (+10⭐)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isAttending || isAbsenting}
                    onClick={() => handleManualAbsence(st, selectedAttendanceDate)}
                    className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                      isAbsentSuccess || existingRecord?.status === 'غائب'
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200'
                    } disabled:opacity-60`}
                  >
                    {isAbsenting ? (
                      <span className="inline-block w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></span>
                    ) : isAbsentSuccess ? (
                      <>
                        <XCircle className="w-4 h-4" />
                        <span>تم غائب</span>
                      </>
                    ) : existingRecord?.status === 'غائب' ? (
                      <>
                        <XCircle className="w-4 h-4" />
                        <span>مسجل غياب</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        <span>تسجيل غياب</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
