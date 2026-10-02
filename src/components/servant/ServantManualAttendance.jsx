import React, { useState } from 'react';
import { UserCheck, Search, Clock, CheckCircle2, XCircle, AlertCircle, Sparkles, Filter, Calendar } from 'lucide-react';

export default function ServantManualAttendance({
  allUsers,
  getGradeTitle,
  handleManualAttendanceWithTime,
  handleManualAbsence,
  manualAttendLoadingId,
  manualAttendSuccessId,
  manualAbsenceLoadingId,
  manualAbsenceSuccessId,
  todayStr
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterGrade, setActiveFilterGrade] = useState('all');

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

  // Filter only students
  const studentsList = (allUsers || []).filter(u => u.role === 'student');

  const filteredStudents = studentsList.filter(st => {
    const matchesSearch = !searchQuery.trim() || 
      (st.fullName || '').toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      (st.phone || '').includes(searchQuery.trim());
    
    const matchesGrade = activeFilterGrade === 'all' || (st.grade || 'first') === activeFilterGrade;
    return matchesSearch && matchesGrade;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-6 text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-700" />
              <span>تسجيل حضور يدوي للمخدومين</span>
            </h3>
            <span className="text-xs bg-emerald-50 text-emerald-800 font-black px-2.5 py-0.5 rounded-full border border-emerald-200">
              خدمة اليوم ({todayStr})
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            تسجيل حضور أي مخدوم يدوياً في حالة عدم توفر هاتف أو انقطاع الإنترنت، مع إمكانية تحديد وتعديل وقت وصوله للخدمة بدقة.
          </p>
        </div>

        {/* Search Input Box */}
        <div className="relative w-full sm:w-72">
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
          <p className="text-xs font-bold text-slate-700">لم يتم العثور على أي مخدومين يطابقون البحث.</p>
          <p className="text-[11px] text-slate-400">تأكد من كتابة الاسم أو الرقم بصورة صحيحة.</p>
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

            return (
              <div 
                key={st.id} 
                className="bg-white border border-slate-200 hover:border-emerald-300 rounded-3xl p-4 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between space-y-3 relative group"
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
                    onClick={() => handleManualAttendanceWithTime(st, studentArrivalTime)}
                    className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs ${
                      isAttendSuccess
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
                    onClick={() => handleManualAbsence(st)}
                    className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                      isAbsentSuccess
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
