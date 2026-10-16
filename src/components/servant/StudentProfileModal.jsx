import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, User, Award, CheckCircle, Calendar, FileText, Sun, Sparkles, 
  MessageSquare, Save, Check, CheckSquare, Clock, Phone, AlertCircle,
  GraduationCap, Briefcase, Heart, MapPin, Users, MessageCircle, ZoomIn, Edit2
} from 'lucide-react';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import StudentOfficialReportCard from './StudentOfficialReportCard';

export default function StudentProfileModal({ student, onClose, getGradeTitle }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'attendance' | 'exams' | 'diary' | 'notes'
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [examSubmissions, setExamSubmissions] = useState([]);
  const [diaries, setDiaries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Photo Lightbox modal state
  const [isEnlargedPhotoOpen, setIsEnlargedPhotoOpen] = useState(false);

  // Service join date state & editing
  const initialJoinDate = student?.serviceJoinDate || student?.joinDate || '2026-10-02';
  const [serviceJoinDate, setServiceJoinDate] = useState(initialJoinDate);
  const [isEditingJoinDate, setIsEditingJoinDate] = useState(false);
  const [tempJoinDate, setTempJoinDate] = useState(initialJoinDate);
  const [isSavingJoinDate, setIsSavingJoinDate] = useState(false);

  // Servant evaluation note state
  const [commentText, setCommentText] = useState(student?.comment || '');
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [commentSaved, setCommentSaved] = useState(false);

  useEffect(() => {
    if (!student?.id) return;

    setLoading(true);

    // 1. Listen to student's attendance records
    const qAttend = query(collection(db, 'attendance'), where('userId', '==', student.id));
    const unsubAttend = onSnapshot(qAttend, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setAttendanceRecords(list);
    }, (err) => console.log('Student attend err:', err));

    // 2. Listen to student's exam submissions
    const qExams = query(collection(db, 'exam_submissions'), where('userId', '==', student.id));
    const unsubExams = onSnapshot(qExams, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setExamSubmissions(list);
    }, (err) => console.log('Student exams err:', err));

    // 3. Listen to student's spiritual diaries
    const qDiary = query(collection(db, 'spiritual_diaries'), where('userId', '==', student.id));
    const unsubDiary = onSnapshot(qDiary, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setDiaries(list);
      setLoading(false);
    }, (err) => {
      console.log('Student diary err:', err);
      setLoading(false);
    });

    return () => {
      unsubAttend();
      unsubExams();
      unsubDiary();
    };
  }, [student?.id]);

  const handleSaveComment = async () => {
    if (!student?.id) return;
    setIsSavingComment(true);
    try {
      await updateDoc(doc(db, 'users', student.id), {
        comment: commentText,
        commentUpdatedAt: serverTimestamp()
      });
      setCommentSaved(true);
      setTimeout(() => setCommentSaved(false), 2000);
    } catch (err) {
      console.error('Error saving student comment:', err);
    } finally {
      setIsSavingComment(false);
    }
  };

  const handleSaveJoinDate = async () => {
    if (!student?.id || !tempJoinDate) return;
    setIsSavingJoinDate(true);
    try {
      await updateDoc(doc(db, 'users', student.id), {
        serviceJoinDate: tempJoinDate
      });
      setServiceJoinDate(tempJoinDate);
      setIsEditingJoinDate(false);
    } catch (err) {
      console.error('Error saving join date:', err);
      alert('حدث خطأ أثناء حفظ تاريخ الالتحاق بالخدمة.');
    } finally {
      setIsSavingJoinDate(false);
    }
  };

  // Calculations
  const isPresent = (st) => st === 'حاضر' || st === 'present';
  const isAbsent = (st) => st === 'غائب' || st === 'absent';

  // Calculate actual service Fridays since this student's join date up to today
  const serviceFridaysSinceJoin = useMemo(() => {
    const list = [];
    const start = new Date(serviceJoinDate + 'T12:00:00');
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    let cur = new Date(start);
    while (cur <= now) {
      if (cur.getDay() === 5) {
        list.push(cur.toISOString().split('T')[0]);
      }
      cur.setDate(cur.getDate() + 1);
    }
    return list.length > 0 ? list : [serviceJoinDate];
  }, [serviceJoinDate]);

  const totalWeeksSinceJoin = Math.max(1, serviceFridaysSinceJoin.length);
  const totalDaysPresent = attendanceRecords.filter(a => isPresent(a.status)).length;
  const attendancePercent = Math.min(100, Math.round((totalDaysPresent / totalWeeksSinceJoin) * 100));

  // Determine if student missed the last 2 consecutive service Fridays
  const needsPastoralVisit = useMemo(() => {
    if (serviceFridaysSinceJoin.length < 2) return false;
    const lastTwoFridays = serviceFridaysSinceJoin.slice(-2);
    const attendedDates = new Set(
      attendanceRecords
        .filter(a => isPresent(a.status))
        .map(a => a.date)
    );
    const attendedAnyOfLastTwo = lastTwoFridays.some(date => attendedDates.has(date));
    return !attendedAnyOfLastTwo;
  }, [serviceFridaysSinceJoin, attendanceRecords]);

  const formatJoinDate = (dStr) => {
    if (!dStr) return '';
    try {
      const [y, m, d] = dStr.split('-');
      const dt = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      return dt.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dStr;
    }
  };

  const totalExamsSolved = examSubmissions.length;
  const avgExamScore = totalExamsSolved > 0 
    ? Math.round(examSubmissions.reduce((acc, curr) => acc + (curr.autoScore || 0), 0) / totalExamsSolved) 
    : (student.examScore || 0);

  // Diary Stats
  const totalDiariesLogged = diaries.length;
  let totalPrayers = 0, totalBible = 0, totalCommunion = 0, totalConfession = 0;
  diaries.forEach(d => {
    if (d.baker) totalPrayers++;
    if (d.ghoroub) totalPrayers++;
    if (d.nowm) totalPrayers++;
    if (d.bible) totalBible++;
    if (d.communion) totalCommunion++;
    if (d.confession) totalConfession++;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-cairo flex items-center justify-center p-3 sm:p-4 text-right">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity" 
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 z-10 overflow-hidden mx-2 sm:mx-auto">
        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-maroon-900 to-maroon-950 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setIsEnlargedPhotoOpen(true)}
              className="relative w-14 h-14 sm:w-16 sm:h-16 min-w-[56px] min-h-[56px] max-w-[56px] max-h-[56px] sm:min-w-[64px] sm:min-h-[64px] sm:max-w-[64px] sm:max-h-[64px] rounded-2xl bg-white/10 border-2 border-gold-400/40 text-gold-300 flex items-center justify-center font-bold text-xl shadow-xs overflow-hidden shrink-0 cursor-pointer active:scale-95 group transition-transform"
              title="اضغط لتكبير صورة المخدوم 🔍"
            >
              {student.photoUrl ? (
                <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover object-top" />
              ) : (
                <span>{student.fullName ? student.fullName[0] : 'م'}</span>
              )}
              <span className="absolute bottom-1 left-1 bg-black/60 text-white rounded-md p-0.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                <ZoomIn className="w-2.5 h-2.5 text-gold-300" />
              </span>
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-extrabold text-white truncate max-w-[200px] sm:max-w-none">{student.fullName}</h3>
                <span className="text-[10px] bg-gold-400 text-maroon-950 px-2 py-0.5 rounded-full font-bold shrink-0">
                  {getGradeTitle ? getGradeTitle(student.grade || 'first') : student.grade}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 mt-1">
                {student.phone ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <a
                      href={`tel:${student.phone}`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-blue-600 text-white font-mono transition-colors text-[11px]"
                      title="اتصال هاتفي مباشر 📞"
                    >
                      <Phone className="w-3 h-3 text-gold-300" />
                      <span dir="ltr">{student.phone}</span>
                    </a>
                    <a
                      href={`https://wa.me/20${student.phone.replace(/^0+/, '')}?text=${encodeURIComponent(`سلام ونعمة يا ${student.fullName}، أسرة خدمة القديس يوحنا المعمدان بتطمن عليك 🌹`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white font-bold transition-colors shadow-2xs text-[11px]"
                      title="محادثة واتساب مباشرة 💬"
                    >
                      <MessageCircle className="w-3 h-3" />
                      <span>واتساب</span>
                    </a>
                  </div>
                ) : (
                  <span className="text-slate-400">بدون هاتف مسجل</span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer shrink-0 active:scale-95"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher (Horizontally scrollable with smooth touch) */}
        <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-50 p-1.5 text-xs font-bold overflow-x-auto shrink-0 scrollbar-none">
          {/* Note: Official Report Tab is placed on hold until centralized scoring is finalized */}
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-3 rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'overview' ? 'bg-maroon-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            نظرة عامة 📊
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`py-2 px-3 rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'attendance' ? 'bg-maroon-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            الحضور ({totalDaysPresent})
          </button>
          <button
            onClick={() => setActiveTab('exams')}
            className={`py-2 px-3 rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'exams' ? 'bg-maroon-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            الامتحانات ({totalExamsSolved})
          </button>
          <button
            onClick={() => setActiveTab('diary')}
            className={`py-2 px-3 rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'diary' ? 'bg-maroon-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            النوتة الروحية ({totalDiariesLogged})
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`py-2 px-3 rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'notes' ? 'bg-maroon-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            تقييم الخادم ✍️
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* 0. OFFICIAL REGULATION REPORT CARD (13 ITEMS) */}
          {activeTab === 'official_report' && (
            <StudentOfficialReportCard
              student={student}
              attendanceRecords={attendanceRecords}
              examSubmissions={examSubmissions}
              diaries={diaries}
            />
          )}

          {/* 1. OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Key Indicators */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-center flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 block">سجل الحضور بالخدمة</span>
                    <span className="text-sm sm:text-base font-black text-emerald-700 block mt-1 leading-snug">
                      حضر {totalDaysPresent} من {totalWeeksSinceJoin} {totalWeeksSinceJoin === 1 ? 'جمعة' : 'جمعات'} ({attendancePercent}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-1 text-[10px] text-emerald-800/90 mt-1.5 pt-1.5 border-t border-emerald-200/60 font-bold">
                    <span>منذ {formatJoinDate(serviceJoinDate)}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setTempJoinDate(serviceJoinDate);
                        setIsEditingJoinDate(!isEditingJoinDate);
                      }}
                      className="text-emerald-700 hover:text-emerald-950 p-0.5 rounded transition-colors"
                      title="تعديل تاريخ التحاقه بالخدمة"
                    >
                      <Edit2 className="w-2.5 h-2.5 inline" />
                    </button>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 p-3 rounded-2xl text-center flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-purple-800 block">تسجيلات النوتة الروحية</span>
                    <span className="text-base sm:text-lg font-black text-purple-700 block mt-1">
                      {totalDiariesLogged} <span className="text-xs font-bold text-purple-600">يوماً</span>
                    </span>
                  </div>
                  <div className="text-[10px] text-purple-800/90 mt-1.5 pt-1.5 border-t border-purple-200/60 font-bold">
                    {totalPrayers} صلاة أجبية مسجلة
                  </div>
                </div>
              </div>

              {/* Inline Join Date Editor (When clicked) */}
              {isEditingJoinDate && (
                <div className="bg-emerald-50/60 border border-emerald-300 p-3 rounded-2xl space-y-2 animate-in fade-in text-xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-extrabold text-emerald-950 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                      <span>تعديل تاريخ بدء الحضور بالخدمة:</span>
                    </span>
                    <input
                      type="date"
                      value={tempJoinDate}
                      onChange={(e) => setTempJoinDate(e.target.value)}
                      className="bg-white border border-emerald-300 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-maroon-800"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-emerald-200/60">
                    <div className="flex items-center gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setTempJoinDate('2026-10-02')}
                        className="px-2 py-0.5 rounded bg-white border border-emerald-200 text-emerald-900 font-bold hover:bg-emerald-100"
                      >
                        2 أكتوبر
                      </button>
                      <button
                        type="button"
                        onClick={() => setTempJoinDate(new Date().toISOString().split('T')[0])}
                        className="px-2 py-0.5 rounded bg-white border border-emerald-200 text-emerald-900 font-bold hover:bg-emerald-100"
                      >
                        اليوم
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingJoinDate(false)}
                        className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        disabled={isSavingJoinDate}
                        onClick={handleSaveJoinDate}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        {isSavingJoinDate ? 'جاري الحفظ...' : 'حفظ التاريخ ✓'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Actionable Pastoral Alert (ONLY shown if missed 2 consecutive Fridays) */}
              {needsPastoralVisit && (
                <div className="bg-rose-50 border border-rose-300 p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping shrink-0" />
                    <span className="text-xs font-black text-rose-900">
                      🔴 يحتاج افتقاد (غائب لجمعتين متتاليتين)
                    </span>
                  </div>
                  {student.phone && (
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <a
                        href={`https://wa.me/20${student.phone.replace(/^0+/, '')}?text=${encodeURIComponent(`سلام ونعمة يا ${student.fullName}، أسرة خدمة القديس يوحنا المعمدان بتطمن عليك وبنفتقدك لأننا مشفناكش بقالنا جمعتين 🌹`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>افتقاد واتساب</span>
                      </a>
                      <a
                        href={`tel:${student.phone}`}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-gold-300" />
                        <span>اتصال</span>
                      </a>
                    </div>
                  )}
                </div>
              )}

              {commentText && (
                <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl text-xs text-slate-600 flex items-center gap-2">
                  <span className="font-extrabold text-slate-800 shrink-0">ملاحظة الخادم:</span>
                  <span className="font-medium italic truncate">"{commentText}"</span>
                </div>
              )}

              {/* Personal Data & Comprehensive Pastoral Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
                <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-maroon-800" />
                  <span>البيانات الشاملة للمخدوم:</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">السنة الدراسية / المرحلة:</span>
                    <strong className="text-maroon-900 bg-maroon-50 px-2.5 py-0.5 rounded-lg border border-maroon-200 font-extrabold">
                      {getGradeTitle ? getGradeTitle(student.grade || 'first') : student.grade}
                    </strong>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">رقم التليفون:</span>
                    <strong className="text-slate-900 font-mono" dir="ltr">{student.phone || 'غير مسجل'}</strong>
                  </div>

                  {student.birthDate && (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-500 font-medium">تاريخ الميلاد:</span>
                      <strong className="text-slate-800 font-mono">{student.birthDate}</strong>
                    </div>
                  )}

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">النوع:</span>
                    <strong className="text-slate-800">{student.gender === 'female' ? 'شابة' : 'شاب'}</strong>
                  </div>

                  {/* College & University */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between col-span-1 sm:col-span-2">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-maroon-700" />
                      <span>الكلية / الجامعة / الدراسة:</span>
                    </span>
                    <strong className="text-maroon-950 font-bold">{student.education || 'لم تُسجل بعد'}</strong>
                  </div>

                  {/* Job */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between col-span-1 sm:col-span-2">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-amber-700" />
                      <span>الوظيفة / العمل:</span>
                    </span>
                    <strong className="text-slate-800 font-bold">{student.job || 'طالب / لم يُحدد'}</strong>
                  </div>

                  {/* Marital Status & Family */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between col-span-1 sm:col-span-2">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-rose-600" />
                      <span>الحالة الاجتماعية:</span>
                    </span>
                    <div className="text-left">
                      <span className="font-bold text-slate-800">
                        {student.maritalStatus === 'married' ? 'متزوج / متزوجة' : student.maritalStatus === 'engaged' ? 'خاطب / مخطوبة' : 'أعزب / آنسة'}
                      </span>
                      {student.maritalStatus === 'married' && student.spouseName && (
                        <span className="text-slate-500 text-[11px] block">شريك الحياة: {student.spouseName}</span>
                      )}
                      {student.maritalStatus === 'married' && (student.childrenCount > 0 || student.hasChildren) && (
                        <span className="text-amber-800 text-[11px] font-bold block">
                          الأولاد: {student.childrenCount ? `${student.childrenCount} أولاد` : (student.childrenDetails || 'يوجد أولاد')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Address */}
                  {student.address && (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between col-span-1 sm:col-span-2">
                      <span className="text-slate-500 font-medium flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                        <span>العنوان للافتقاد:</span>
                      </span>
                      <strong className="text-slate-800 font-bold text-left">{student.address}</strong>
                    </div>
                  )}

                  {/* Confession Father & Church */}
                  {(student.confessionFather || student.confessionChurch) && (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between col-span-1 sm:col-span-2">
                      <span className="text-slate-500 font-medium">أب الاعتراف والكنيسة:</span>
                      <strong className="text-maroon-900 font-bold text-left">
                        {student.confessionFather || ''}
                        {student.confessionChurch ? ` (${student.confessionChurch})` : ''}
                      </strong>
                    </div>
                  )}

                  {student.email && (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between col-span-1 sm:col-span-2">
                      <span className="text-slate-500 font-medium">البريد الإلكتروني:</span>
                      <strong className="text-slate-700 font-mono text-[11px]" dir="ltr">{student.email}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activity Mini-List */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-slate-900">آخر أنشطة مسجلة للمخدوم:</h4>
                <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 text-xs bg-white">
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-700">آخر حضور بالكنيسة:</span>
                    <span className="font-bold text-maroon-900">
                      {attendanceRecords[0] ? `${attendanceRecords[0].date} (${attendanceRecords[0].method === 'manual_servant' ? 'تسجيل خادم' : 'مسح QR'})` : 'لم يسجل حضور بعد'}
                    </span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-700">آخر اختبار قام بحله:</span>
                    <span className="font-bold text-amber-800">
                      {examSubmissions[0] ? `${examSubmissions[0].examTitle} (تم التسليم بنجاح ✓)` : 'لا توجد اختبارات مسلّمة'}
                    </span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-700">آخر تسجيل نوتة روحية:</span>
                    <span className="font-bold text-purple-800">
                      {diaries[0] ? diaries[0].date : 'لم يسجل نوتة بعد'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. ATTENDANCE TAB */}
          {activeTab === 'attendance' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-slate-900">سجل تواريخ الحضور والغياب:</span>
                <span className="text-slate-500">{attendanceRecords.length} سجل مسجل</span>
              </div>

              {attendanceRecords.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 text-xs text-slate-400 font-bold">
                  لم يتم تسجيل أي سجل حضور أو غياب لهذا المخدوم حتى الآن.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 text-xs max-h-72 overflow-y-auto">
                  {attendanceRecords.map((rec) => {
                    const isAttended = isPresent(rec.status);
                    return (
                      <div key={rec.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isAttended ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          <span className="font-bold text-slate-800 font-mono" dir="ltr">{rec.date}</span>
                          <span className="text-[10px] text-slate-400">
                            {rec.time ? `(${rec.time})` : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isAttended ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {isAttended ? 'حاضر ✓' : 'غائب ✗'}
                          </span>
                          {(rec.method || rec.type) && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                              {rec.type === 'manual_by_servant' || rec.method === 'manual_servant'
                                ? 'رصد خادم'
                                : rec.type === 'qr' || rec.method === 'qr_scan'
                                ? 'باركود QR'
                                : 'كود رقمي'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 3. EXAMS TAB */}
          {activeTab === 'exams' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-slate-900">سجل حل الامتحانات والتاسكات الأسبوعية:</span>
                <span className="text-slate-500">{examSubmissions.length} اختبار مسلّم</span>
              </div>

              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-800 block">التاسكات والمسابقات المسلّمة</span>
                  <strong className="text-sm text-amber-900 font-black">{examSubmissions.length} تاسكات</strong>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-800 block">إجمالي درجات التاسكات</span>
                  <strong className="text-sm text-emerald-900 font-black">
                    {examSubmissions.reduce((acc, e) => acc + (e.autoScore ?? e.score ?? 0), 0)} نقطة
                  </strong>
                </div>
              </div>

              {examSubmissions.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 text-xs text-slate-400 font-bold">
                  لم يسلم المخدوم أي امتحان أو تاسك بعد عبر التطبيق.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {examSubmissions.map((ex) => {
                    const score = ex.autoScore ?? ex.score;
                    const maxScore = ex.totalScore || 20;
                    const percent = score != null ? Math.round((score / maxScore) * 100) : null;

                    return (
                      <div key={ex.id} className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex items-center justify-between text-xs hover:border-slate-300 transition-all">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900">{ex.examTitle || 'امتحان مادة'}</span>
                            <span className="text-[10px] bg-maroon-100 text-maroon-900 font-bold px-2 py-0.5 rounded-md">
                              {ex.subject || 'عام'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-1">تاريخ التسليم: {ex.date} - {ex.submittedAt}</span>
                        </div>
                        <div className="text-left flex items-center gap-2 shrink-0">
                          {score != null ? (
                            <span className={`text-xs font-black font-mono px-2.5 py-1 rounded-xl border ${
                              percent >= 80
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : percent >= 50
                                ? 'bg-amber-50 text-amber-900 border-amber-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}>
                              {score} / {maxScore} ({percent}%)
                            </span>
                          ) : (
                            <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-xl inline-block">
                              تم التسليم ✓
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 4. SPIRITUAL DIARY TAB */}
          {activeTab === 'diary' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-800 block">صلوات الأجبية</span>
                  <strong className="text-sm text-amber-900">{totalPrayers} صلاة</strong>
                </div>
                <div className="bg-maroon-50 p-2.5 rounded-xl border border-maroon-200">
                  <span className="text-[10px] font-bold text-maroon-800 block">قراءات الإنجيل</span>
                  <strong className="text-sm text-maroon-900">{totalBible} أصحاح</strong>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-800 block">الأسرار</span>
                  <strong className="text-sm text-emerald-900">تناول: {totalCommunion} • اعتراف: {totalConfession}</strong>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 text-xs max-h-60 overflow-y-auto">
                {diaries.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-bold">
                    لم يسجل المخدوم نوتته الروحية بعد.
                  </div>
                ) : (
                  diaries.map(d => (
                    <div key={d.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                      <span className="font-bold text-slate-800 font-mono" dir="ltr">{d.date}</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {d.baker && <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[10px] font-bold">باكر</span>}
                        {d.ghoroub && <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[10px] font-bold">غروب</span>}
                        {d.nowm && <span className="bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded text-[10px] font-bold">نوم</span>}
                        {d.bible && <span className="bg-maroon-100 text-maroon-900 px-2 py-0.5 rounded text-[10px] font-bold">إنجيل</span>}
                        {d.communion && <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded text-[10px] font-bold">تناول</span>}
                        {d.confession && <span className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded text-[10px] font-bold">اعتراف</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 5. NOTES TAB */}
          {activeTab === 'notes' && (
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-maroon-800" />
                <span>ملاحظات الخادم وتقييم ترشيح إعداد خدام:</span>
              </h4>
              <textarea
                rows={4}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="اكتب تقييمك للمخدوم: مستوى التزامه، اهتمامه الروحي، ملاحظات الافتقاد، أو ترشيحه لدخول إعداد خدام..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 focus:outline-none focus:border-maroon-800 focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={handleSaveComment}
                disabled={isSavingComment}
                className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                  commentSaved ? 'bg-emerald-600 text-white' : 'bg-maroon-800 hover:bg-maroon-700 text-white'
                }`}
              >
                {commentSaved ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>تم حفظ الملاحظة بنجاح ✓</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{isSavingComment ? 'جاري الحفظ...' : 'حفظ التقييم والملاحظة في ملف المخدوم'}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">كنيسة القديس ماريوحنا المعمدان بالمعراج</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            إغلاق الملف
          </button>
        </div>
      </div>

      {/* Enlarged Photo Lightbox Modal */}
      {isEnlargedPhotoOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsEnlargedPhotoOpen(false)}
        >
          <div 
            className="relative bg-gradient-to-b from-slate-900 via-maroon-950 to-slate-950 rounded-3xl p-3 sm:p-4 max-w-sm w-full border border-gold-400/40 shadow-2xl flex flex-col items-center gap-3 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsEnlargedPhotoOpen(false)}
              className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-full max-h-[65vh] rounded-2xl overflow-hidden border-2 border-gold-400/50 bg-black/40 flex items-center justify-center">
              {student.photoUrl ? (
                <img 
                  src={student.photoUrl} 
                  alt={student.fullName} 
                  className="w-full h-auto max-h-[65vh] object-contain"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-gold-300 font-black text-6xl">
                  {student.fullName ? student.fullName[0] : 'م'}
                </div>
              )}
            </div>

            <div className="text-center w-full">
              <h3 className="text-base sm:text-lg font-black text-white">{student.fullName}</h3>
              <span className="text-xs text-gold-300 font-bold block mt-0.5">
                {getGradeTitle ? getGradeTitle(student.grade || 'first') : student.grade}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
