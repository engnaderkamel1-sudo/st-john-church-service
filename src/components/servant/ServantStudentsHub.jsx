import React, { useState } from 'react';
import { Users, Search, Phone, Eye, Award, CheckCircle, AlertCircle, Sparkles, Filter, Calendar, MessageCircle, BookOpen } from 'lucide-react';

export default function ServantStudentsHub({
  allUsers,
  selectedGrade,
  setSelectedGrade,
  getGradeTitle,
  activeAcademicCycle = 'cycle_1',
  academicYear = '2026-2027',
  onSelectStudent
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterGrade, setActiveFilterGrade] = useState(selectedGrade || 'all');

  // Helper: Get enrolled curriculum title for student
  const getEnrolledCurriculumBadge = (grade) => {
    if (grade === 'elisha') {
      return { text: 'منهج فصل أليشع (تمهيدي)', color: 'bg-amber-50 text-amber-900 border-amber-200' };
    }
    if (activeAcademicCycle === 'cycle_2') {
      return { text: `يدرس: المرحلة الثانية (${academicYear})`, color: 'bg-purple-50 text-purple-900 border-purple-200' };
    }
    return { text: `يدرس: المرحلة الأولى (${academicYear})`, color: 'bg-sky-50 text-sky-900 border-sky-200' };
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
              <Users className="w-5 h-5 text-maroon-800" />
              <span>بيانات ومتابعة المخدومين</span>
            </h3>
            <span className="text-xs bg-gold-100 text-maroon-950 font-black px-2.5 py-0.5 rounded-full border border-gold-300">
              {filteredStudents.length} مخدوم
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            البحث عن أي مخدوم بالاسم أو الهاتف، معرفة سنته الدراسية، ومتابعة حضوره وامتحاناته ودرجاته ونوتته الروحية.
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
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pr-9 pl-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-maroon-800 focus:bg-white transition-all shadow-2xs font-bold"
          />
        </div>
      </div>

      {/* Grade Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveFilterGrade('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
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
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
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
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-700">لم يتم العثور على أي مخدومين يطابقون البحث.</p>
          <p className="text-[11px] text-slate-400">تأكد من كتابة الاسم أو الرقم بصورة صحيحة أو اختر "كافة المراحل".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredStudents.map((st) => {
            const gradeName = getGradeTitle(st.grade || 'first');
            const points = st.points || 0;
            const attendRate = typeof st.attendanceRate === 'number' ? st.attendanceRate : 85;
            const currBadge = getEnrolledCurriculumBadge(st.grade || 'first');

            return (
              <div 
                key={st.id} 
                className="bg-white border border-slate-200 hover:border-maroon-300 rounded-3xl p-4 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between space-y-3 relative group"
              >
                {/* Top Info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-maroon-800 to-maroon-950 text-gold-300 flex items-center justify-center font-bold text-lg shrink-0 shadow-xs border border-gold-400/20">
                      {st.fullName ? st.fullName[0] : 'م'}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-maroon-900 transition-colors">
                        {st.fullName || 'بدون اسم'}
                      </h4>
                      <span className="text-xs text-slate-500 font-mono block mt-0.5" dir="ltr">
                        {st.phone || 'بدون هاتف'}
                      </span>
                    </div>
                  </div>

                  {/* Stage Pill */}
                  <span className="bg-maroon-50 text-maroon-900 border border-maroon-200 font-bold px-2.5 py-1 rounded-xl text-[11px] shrink-0">
                    {gradeName}
                  </span>
                </div>

                {/* Enrolled Curriculum Badge for Current Academic Year */}
                <div className={`p-2 rounded-xl border text-[11px] font-bold flex items-center justify-between gap-1.5 ${currBadge.color}`}>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 shrink-0" />
                    <span>{currBadge.text}</span>
                  </span>
                  <span className="text-[10px] font-mono opacity-80">{academicYear}</span>
                </div>

                {/* Quick Indicators Bar */}
                <div className="grid grid-cols-2 gap-2 text-center text-xs bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">النقاط الروحية</span>
                    <span className="font-extrabold text-maroon-900">{points} ⭐</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">نسبة الحضور</span>
                    <span className="font-extrabold text-emerald-700">{attendRate}%</span>
                  </div>
                </div>

                {/* Quick Action Buttons: WhatsApp & Call & 360 Profile */}
                <div className="flex items-center gap-2 pt-1">
                  {st.phone ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`https://wa.me/20${st.phone.replace(/^0+/, '')}?text=${encodeURIComponent(`سلام ونعمة يا ${st.fullName}، أسرة خدمة القديس يوحنا المعمدان بتطمن عليك 🌹`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-10 px-3 rounded-2xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 flex items-center justify-center gap-1.5 text-xs font-bold transition-all shadow-2xs"
                        title="محادثة واتساب مباشرة 💬"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="hidden xs:inline">واتساب</span>
                      </a>
                      <a
                        href={`tel:${st.phone}`}
                        className="h-10 px-3 rounded-2xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 flex items-center justify-center gap-1.5 text-xs font-bold transition-all shadow-2xs"
                        title="اتصال هاتفي مباشر 📞"
                      >
                        <Phone className="w-4 h-4" />
                        <span className="hidden xs:inline">اتصال</span>
                      </a>
                    </div>
                  ) : null}

                  {/* 360 Degree Profile Action Button */}
                  <button
                    type="button"
                    onClick={() => onSelectStudent && onSelectStudent(st)}
                    className="flex-1 min-h-[40px] bg-gradient-to-r from-maroon-900 via-maroon-800 to-maroon-900 hover:from-maroon-950 hover:to-maroon-900 text-white rounded-2xl font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all ring-1 ring-gold-400/30"
                  >
                    <Eye className="w-4 h-4 text-gold-300" />
                    <span>الملف الشامل 🔍</span>
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
