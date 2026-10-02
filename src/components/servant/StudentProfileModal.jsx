import React, { useState, useEffect } from 'react';
import { 
  X, User, Award, CheckCircle, Calendar, FileText, Sun, Sparkles, 
  MessageSquare, Save, Check, CheckSquare, Clock, Phone, AlertCircle
} from 'lucide-react';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export default function StudentProfileModal({ student, onClose, getGradeTitle }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'attendance' | 'exams' | 'diary' | 'notes'
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [examSubmissions, setExamSubmissions] = useState([]);
  const [diaries, setDiaries] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Calculations
  const totalDaysPresent = attendanceRecords.filter(a => a.status === 'present').length;
  const totalDaysAbsent = attendanceRecords.filter(a => a.status === 'absent').length;
  const attendancePercent = (totalDaysPresent + totalDaysAbsent) > 0 
    ? Math.round((totalDaysPresent / (totalDaysPresent + totalDaysAbsent)) * 100) 
    : (student.attendanceRate || 85);

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
      <div className="relative bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 z-10 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-maroon-900 to-maroon-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-gold-400/40 text-gold-300 flex items-center justify-center font-bold text-xl shadow-xs">
              {student.fullName ? student.fullName[0] : 'م'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-white">{student.fullName}</h3>
                <span className="text-[10px] bg-gold-400 text-maroon-950 px-2 py-0.5 rounded-full font-bold">
                  {getGradeTitle ? getGradeTitle(student.grade || 'first') : student.grade}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300 mt-0.5">
                <span className="flex items-center gap-1 font-mono" dir="ltr">
                  <Phone className="w-3 h-3 text-gold-300" /> {student.phone}
                </span>
                <span>•</span>
                <span className="text-gold-300 font-bold">{student.points || 0} نقطة روحية ⭐</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-around border-b border-slate-200 bg-slate-50 p-1 text-xs font-bold overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'overview' ? 'bg-white text-maroon-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            نظرة عامة 📊
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`py-2 px-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'attendance' ? 'bg-white text-maroon-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            الحضور والغياب ({totalDaysPresent})
          </button>
          <button
            onClick={() => setActiveTab('exams')}
            className={`py-2 px-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'exams' ? 'bg-white text-maroon-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            الامتحانات والدرجات ({totalExamsSolved})
          </button>
          <button
            onClick={() => setActiveTab('diary')}
            className={`py-2 px-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'diary' ? 'bg-white text-maroon-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            النوتة الروحية ({totalDiariesLogged})
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`py-2 px-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'notes' ? 'bg-white text-maroon-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            تقييم الخادم ✍️
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* 1. OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Key Indicators */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-emerald-800 block">نسبة الحضور</span>
                  <span className="text-lg font-extrabold text-emerald-700">{attendancePercent}%</span>
                  <span className="text-[9px] text-emerald-600 block mt-0.5">{totalDaysPresent} يوم حضور</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-amber-800 block">متوسط الامتحانات</span>
                  <span className="text-lg font-extrabold text-amber-700">{avgExamScore} / 30</span>
                  <span className="text-[9px] text-amber-600 block mt-0.5">{totalExamsSolved} اختبار محلول</span>
                </div>
                <div className="bg-purple-50 border border-purple-200 p-3 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-purple-800 block">تسجيلات النوتة</span>
                  <span className="text-lg font-extrabold text-purple-700">{totalDiariesLogged} يوم</span>
                  <span className="text-[9px] text-purple-600 block mt-0.5">{totalPrayers} صلاة مسجلة</span>
                </div>
                <div className="bg-maroon-50 border border-maroon-200 p-3 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-maroon-800 block">إجمالي النقاط</span>
                  <span className="text-lg font-extrabold text-maroon-900">{student.points || 0} ⭐</span>
                  <span className="text-[9px] text-maroon-700 block mt-0.5">رصيد تشجيعي</span>
                </div>
              </div>

              {/* Status & Pastoral Notice */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">الحالة الرعوية:</span>
                  {attendancePercent < 60 ? (
                    <span className="bg-rose-100 text-rose-800 border border-rose-300 text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1">
                      🔴 علامة حمراء (يحتاج افتقاد ومتابعة مكثفة)
                    </span>
                  ) : (
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1">
                      🟢 مخدوم منتظم وملتزم
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {commentText ? `ملاحظة الخادم: "${commentText}"` : 'لا توجد ملاحظة رعوية خاصة مسجلة لهذا المخدوم بعد.'}
                </p>
              </div>

              {/* Personal Data & Stage Card (البيانات الخاصة به وفي سنة كام) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-maroon-800" />
                  <span>البيانات الشخصية والتعليمية:</span>
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
                  {student.email && (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between col-span-1 sm:col-span-2">
                      <span className="text-slate-500 font-medium">البريد الإلكتروني:</span>
                      <strong className="text-slate-700 font-mono text-[11px]" dir="ltr">{student.email}</strong>
                    </div>
                  )}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">الصفة في المنظومة:</span>
                    <strong className="text-emerald-800 font-bold">مخدوم بالخدمة</strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">تاريخ التسجيل:</span>
                    <span className="text-slate-600 font-mono">{student.createdAt?.toDate ? student.createdAt.toDate().toLocaleDateString('ar-EG') : 'مسجل'}</span>
                  </div>
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
                      {examSubmissions[0] ? `${examSubmissions[0].examTitle} - (${examSubmissions[0].autoScore}/${examSubmissions[0].totalScore})` : 'لا توجد اختبارات مسلّمة'}
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
                  {attendanceRecords.map((rec) => (
                    <div key={rec.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${rec.status === 'present' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        <span className="font-bold text-slate-800 font-mono" dir="ltr">{rec.date}</span>
                        <span className="text-[10px] text-slate-400">
                          {rec.time ? `(${rec.time})` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          rec.status === 'present' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {rec.status === 'present' ? 'حاضر ✓' : 'غائب ✗'}
                        </span>
                        {rec.method && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                            {rec.method === 'manual_servant' ? 'تسجيل خادم' : rec.method === 'qr_scan' ? 'باركود QR' : 'كود رقمي'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. EXAMS TAB */}
          {activeTab === 'exams' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-slate-900">سجل حل الامتحانات والاختبارات:</span>
                <span className="text-slate-500">{examSubmissions.length} اختبار</span>
              </div>

              {examSubmissions.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 text-xs text-slate-400 font-bold">
                  لم يسلم المخدوم أي امتحان بعد عبر التطبيق.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {examSubmissions.map((ex) => (
                    <div key={ex.id} className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900">{ex.examTitle || 'امتحان مادة'}</span>
                          <span className="text-[10px] bg-maroon-100 text-maroon-900 font-bold px-2 py-0.5 rounded-md">
                            {ex.subject || 'عام'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-1">تاريخ التسليم: {ex.date} - {ex.submittedAt}</span>
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-extrabold text-emerald-700 block">
                          {ex.autoScore} / {ex.totalScore || 30}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">الدرجة المحصلة</span>
                      </div>
                    </div>
                  ))}
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
    </div>
  );
}
