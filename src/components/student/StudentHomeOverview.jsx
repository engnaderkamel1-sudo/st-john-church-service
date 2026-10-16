import React, { useMemo } from 'react';
import { 
  Sparkles, Award, CheckCircle2, QrCode, Sun, BookOpen, 
  FileText, ArrowLeft, Calendar, Flame, TrendingUp, AlertCircle, CheckSquare 
} from 'lucide-react';

export default function StudentHomeOverview({
  user,
  points = 0,
  getGradeTitle,
  attendanceRecords = [],
  diaryRecords = {},
  availableExams = [],
  completedExams = {},
  isWithinTime = false,
  bypassTime = false,
  onNavigateTab,
  onOpenRegulations
}) {
  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const currentMonthStr = useMemo(() => todayDateStr.substring(0, 7), [todayDateStr]);

  // 1. Attendance stats for this month
  const currentMonthAttendanceCount = useMemo(() => {
    return attendanceRecords.filter(r => r.date && r.date.startsWith(currentMonthStr)).length;
  }, [attendanceRecords, currentMonthStr]);

  // 2. Spiritual diary stats
  const isTodayDiaryLogged = useMemo(() => {
    const todayRec = diaryRecords[todayDateStr];
    if (!todayRec) return false;
    return Boolean(
      todayRec.baker || todayRec.ghoroub || todayRec.nowm || 
      todayRec.bible || todayRec.communion || todayRec.confession
    );
  }, [diaryRecords, todayDateStr]);

  const currentMonthDiariesCount = useMemo(() => {
    return Object.keys(diaryRecords).filter(date => {
      if (!date.startsWith(currentMonthStr)) return false;
      const rec = diaryRecords[date];
      return Boolean(rec && (rec.baker || rec.ghoroub || rec.nowm || rec.bible || rec.communion || rec.confession));
    }).length;
  }, [diaryRecords, currentMonthStr]);

  // 3. Exams stats
  const completedCount = useMemo(() => {
    return Object.keys(completedExams).length;
  }, [completedExams]);

  const pendingExamsCount = useMemo(() => {
    return Math.max(0, availableExams.length - completedCount);
  }, [availableExams.length, completedCount]);

  // 4. Spiritual encouragement rank
  const spiritualRank = useMemo(() => {
    if (points >= 300) return { title: 'قدوة مباركة في الأسرة 👑', color: 'from-amber-600 to-gold-500' };
    if (points >= 150) return { title: 'شعلة خدمة ونشاط 🔥', color: 'from-maroon-800 to-amber-700' };
    if (points >= 60) return { title: 'مجاهد روحي ملتزم ✝️', color: 'from-emerald-700 to-teal-800' };
    return { title: 'خادم واعد في بداية الطريق 🌱', color: 'from-slate-700 to-slate-900' };
  }, [points]);

  return (
    <div className="space-y-4 sm:space-y-5 text-right font-cairo animate-in fade-in duration-200">
      {/* 1. Welcome & Encouragement Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-maroon-950 via-maroon-900 to-slate-900 text-white p-5 sm:p-6 shadow-md border border-gold-500/30">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-gold-400/20 text-gold-300 border border-gold-400/30 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                {getGradeTitle ? getGradeTitle(user.grade) : 'المخدوم'}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white truncate">
              سلام ونعمة يا {user.fullName || 'مخدوم'} 👋
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-300 font-medium leading-relaxed max-w-xl">
              «لَيْسَ أَنْتُمُ اخْتَرْتُمُونِي بَلْ أَنَا اخْتَرْتُكُمْ وَأَقَمْتُكُمْ لِتَذْهَبُوا وَتَأْتُوا بِثَمَرٍ» (يوحنا ١٥: ١٦)
            </p>
          </div>
        </div>
      </div>

      {/* 3. Live Analytics Snapshot (3 Core Cards) */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h3 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-maroon-800" />
            <span>مؤشرات التزامي ونموي الروحي</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          
          {/* A. Attendance Card */}
          <button
            type="button"
            onClick={() => onNavigateTab('attendance')}
            className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs text-right hover:border-maroon-700/40 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 font-mono">حضور الشهر</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
              {currentMonthAttendanceCount} <span className="text-xs font-bold text-slate-500">جمعات</span>
            </div>
            <span className="text-[10px] text-emerald-700 font-extrabold block mt-0.5">
              {currentMonthAttendanceCount > 0 ? 'مواظب على الحضور ✓' : 'لم تسجل حضور هذا الشهر'}
            </span>
          </button>

          {/* B. Spiritual Diary Card */}
          <button
            type="button"
            onClick={() => onNavigateTab('spiritual_diary')}
            className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs text-right hover:border-maroon-700/40 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Sun className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 font-mono">نوتة الشهر</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-amber-700 transition-colors">
              {currentMonthDiariesCount} <span className="text-xs font-bold text-slate-500">يوماً</span>
            </div>
            <span className={`text-[10px] font-extrabold block mt-0.5 ${isTodayDiaryLogged ? 'text-emerald-700' : 'text-amber-800'}`}>
              {isTodayDiaryLogged ? 'سجلت صلوات اليوم ✓' : 'نوتة اليوم بانتظارك ✍️'}
            </span>
          </button>

          {/* C. Tasks & Quizzes Card */}
          <button
            type="button"
            onClick={() => onNavigateTab('tasks')}
            className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs text-right hover:border-maroon-700/40 hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <CheckSquare className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 font-mono">تاسكات ومسابقات</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-purple-700 transition-colors">
              {completedCount} <span className="text-xs font-bold text-slate-500">من {availableExams.length}</span>
            </div>
            <span className={`text-[10px] font-extrabold block mt-0.5 ${pendingExamsCount === 0 ? 'text-emerald-700' : 'text-purple-800'}`}>
              {pendingExamsCount === 0 ? 'أتممت كافة التكليفات ✓' : `${pendingExamsCount} مسابقة متاحة`}
            </span>
          </button>


        </div>
      </div>

      {/* 4. Quick Actions (1-Tap Fast Hub) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
        <h3 className="text-xs sm:text-sm font-black text-slate-800">
          الوصول السريع للأقسام
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* 1. Register Attendance */}
          <button
            type="button"
            onClick={() => onNavigateTab('attendance')}
            className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200 flex items-center justify-between transition-all cursor-pointer group text-right"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-maroon-900 text-gold-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-900 block group-hover:text-maroon-800 transition-colors">
                  تسجيل الحضور والـ PIN
                </span>
                <span className="text-[10px] text-slate-500">مسح كاميرا الـ QR وكود الجلسة الأسبوعي</span>
              </div>
            </div>
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-maroon-800 transition-colors shrink-0" />
          </button>

          {/* 2. Spiritual Diary */}
          <button
            type="button"
            onClick={() => onNavigateTab('spiritual_diary')}
            className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200 flex items-center justify-between transition-all cursor-pointer group text-right"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-maroon-950 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-900 block group-hover:text-maroon-800 transition-colors">
                  تدوين النوتة الروحية
                </span>
                <span className="text-[10px] text-slate-500">صلوات الأجبية، قراءة الإنجيل، والاعتراف والتناول</span>
              </div>
            </div>
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-maroon-800 transition-colors shrink-0" />
          </button>

          {/* 3. Curriculum & References */}
          <button
            type="button"
            onClick={() => onNavigateTab('curriculum')}
            className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200 flex items-center justify-between transition-all cursor-pointer group text-right"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-900 text-blue-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-900 block group-hover:text-maroon-800 transition-colors">
                  المناهج والمحاضرات الدراسية
                </span>
                <span className="text-[10px] text-slate-500">مذكرات، ملفات درايف، وتسجيلات مرحلتك</span>
              </div>
            </div>
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-maroon-800 transition-colors shrink-0" />
          </button>

          {/* 4. Tasks & Competitions */}
          <button
            type="button"
            onClick={() => onNavigateTab('tasks')}
            className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200 flex items-center justify-between transition-all cursor-pointer group text-right"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-900 text-purple-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-900 block group-hover:text-maroon-800 transition-colors">
                  التاسكات والمسابقات الأسبوعية
                </span>
                <span className="text-[10px] text-slate-500">حل الأسئلة والمسابقات والاطلاع الفوري على النتائج</span>
              </div>
            </div>
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-maroon-800 transition-colors shrink-0" />
          </button>
        </div>
      </div>

    </div>
  );
}
