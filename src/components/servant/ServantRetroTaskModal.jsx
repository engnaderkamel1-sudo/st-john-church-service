import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Calendar, CheckCircle2, Award, Search, Sparkles, 
  Save, Loader2, Users, Check, AlertCircle, BookOpen
} from 'lucide-react';
import { db } from '../../firebase';
import { 
  collection, doc, setDoc, updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';

export const toEnglishDigits = (val) => {
  if (val === null || val === undefined) return '';
  return String(val).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
};

export default function ServantRetroTaskModal({
  isOpen,
  onClose,
  allUsers = [],
  currentGradeSubjects = [],
  user,
  fetchAllUsers,
  onSaved,
  initialTask = null,
  existingSubmissions = []
}) {
  const SERVICE_START_FRIDAY = '2026-10-02';

  // Generate dynamic service Fridays from Oct 2, 2026
  const fridaysList = useMemo(() => {
    const list = [];
    const startDate = new Date(SERVICE_START_FRIDAY + 'T12:00:00');
    const now = new Date();
    const maxDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    let cur = new Date(startDate);
    let weekNum = 1;
    while (cur <= maxDate) {
      const dateStr = cur.toISOString().split('T')[0];
      const [y, m, d] = dateStr.split('-');
      const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      const formattedArabic = dateObj.toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long' });

      list.push({
        dateStr,
        weekNum,
        label: `الأسبوع ${weekNum} (${formattedArabic})`
      });
      cur.setDate(cur.getDate() + 7);
      weekNum++;
    }
    return list;
  }, []);

  const [selectedWeekDate, setSelectedWeekDate] = useState(fridaysList[0]?.dateStr || SERVICE_START_FRIDAY);
  const [isCustomTask, setIsCustomTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [subject, setSubject] = useState(currentGradeSubjects[0]?.name || 'كتاب مقدس');
  const [maxScore, setMaxScore] = useState(20);
  const [activeStageFilter, setActiveStageFilter] = useState('all'); // 'all' | 'first' | 'second'
  const [searchQuery, setSearchQuery] = useState('');
  const [scores, setScores] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Auto-set title when week date changes
  useEffect(() => {
    if (!isOpen) return;
    if (initialTask) {
      setTaskTitle(initialTask.title || '');
      setSubject(initialTask.subject || 'كتاب مقدس');
      setMaxScore(initialTask.totalScore || 20);
      if (initialTask.date) {
        setSelectedWeekDate(initialTask.date);
      }
      setIsCustomTask(!fridaysList.some(f => f.dateStr === initialTask.date));
    } else {
      const foundWeek = fridaysList.find(f => f.dateStr === selectedWeekDate);
      if (foundWeek && !isCustomTask) {
        setTaskTitle(`تاسك ${foundWeek.label}`);
      }
    }
  }, [isOpen, initialTask, selectedWeekDate, isCustomTask, fridaysList]);

  // Pre-fill existing scores if editing an existing task or week
  useEffect(() => {
    if (!isOpen) return;
    const taskKey = initialTask?.id || `weekly_task_${selectedWeekDate}`;
    const prefilled = {};
    existingSubmissions.forEach(sub => {
      if (sub.examId === taskKey || (sub.date === selectedWeekDate && sub.examTitle === taskTitle)) {
        prefilled[sub.userId] = sub.score ?? sub.autoScore ?? '';
      }
    });
    setScores(prefilled);
    setSaveSuccessMsg('');
  }, [isOpen, initialTask, selectedWeekDate, taskTitle, existingSubmissions]);

  // Filter Servants Prep students (exclude elisha)
  const servantsPrepStudents = useMemo(() => {
    return (allUsers || []).filter(u => u.role === 'student' && u.grade !== 'elisha');
  }, [allUsers]);

  const displayedStudents = useMemo(() => {
    return servantsPrepStudents.filter(st => {
      const matchesStage = activeStageFilter === 'all'
        ? (st.grade === 'first' || st.grade === 'second')
        : st.grade === activeStageFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        (st.fullName || '').toLowerCase().includes(q) ||
        (st.phone || '').includes(q);

      return matchesStage && matchesSearch;
    });
  }, [servantsPrepStudents, activeStageFilter, searchQuery]);

  const handleScoreChange = (studentId, val) => {
    if (val === '') {
      setScores(prev => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
      return;
    }
    const num = Number(toEnglishDigits(val));
    if (isNaN(num)) return;
    const clamped = Math.max(0, Math.min(Number(maxScore) || 20, num));
    setScores(prev => ({ ...prev, [studentId]: clamped }));
  };

  const handleGiveFullScoreToAll = () => {
    const full = Number(maxScore) || 20;
    const updated = { ...scores };
    displayedStudents.forEach(st => {
      updated[st.id] = full;
    });
    setScores(updated);
  };

  const handleClearScores = () => {
    if (!window.confirm('هل تريد مسح الدرجات المدخلة في هذه القائمة؟')) return;
    const updated = { ...scores };
    displayedStudents.forEach(st => {
      delete updated[st.id];
    });
    setScores(updated);
  };

  const handleSaveSubmissions = async () => {
    if (!taskTitle.trim()) {
      alert('يرجى تحديد عنوان التاسك أو الأسبوع أولاً.');
      return;
    }
    const studentIdsWithScores = Object.keys(scores);
    if (studentIdsWithScores.length === 0) {
      alert('يرجى رصد درجة لطالب واحد على الأقل قبل الحفظ.');
      return;
    }

    setIsSaving(true);
    setSaveSuccessMsg('');

    try {
      const taskKey = initialTask?.id || `weekly_task_${selectedWeekDate}`;
      const totalScoreNum = Number(maxScore) || 20;

      // Map existing submissions to calculate points diff for each student
      const existingMap = {};
      existingSubmissions.forEach(sub => {
        if (sub.examId === taskKey && sub.userId) {
          existingMap[sub.userId] = sub;
        }
      });

      // Save submissions & synchronize user points
      for (const stId of studentIdsWithScores) {
        const student = servantsPrepStudents.find(s => s.id === stId);
        if (!student) continue;

        const newScore = Number(scores[stId]) || 0;
        const prevScore = existingMap[stId] ? (existingMap[stId].score ?? existingMap[stId].autoScore ?? 0) : 0;
        const diff = newScore - prevScore;

        const subDocId = `${stId}_${taskKey}`;
        const subRef = doc(db, 'exam_submissions', subDocId);

        await setDoc(subRef, {
          id: subDocId,
          examId: taskKey,
          examTitle: taskTitle.trim(),
          subject: subject || 'عام',
          grade: student.grade || 'first',
          userId: student.id,
          userName: student.fullName || 'مخدوم',
          userPhone: student.phone || '',
          score: newScore,
          autoScore: newScore,
          totalScore: totalScoreNum,
          type: 'manual_weekly_entry',
          isManualServantEntry: true,
          recordedBy: user?.fullName || 'الخادم المسؤول',
          date: selectedWeekDate,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Synchronize points in users/{id}
        if (diff !== 0) {
          const userRef = doc(db, 'users', student.id);
          const currentPoints = student.points || 0;
          await updateDoc(userRef, {
            points: Math.max(0, currentPoints + diff)
          }).catch(err => console.warn('Could not update user points:', err));
        }
      }

      if (fetchAllUsers) {
        fetchAllUsers();
      }
      if (onSaved) {
        onSaved();
      }

      setSaveSuccessMsg(`تم حفظ واعتماد درجات ${studentIdsWithScores.length} مخدوم بنجاح! ✨`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Error saving weekly task scores:', err);
      alert('حدث خطأ أثناء حفظ درجات التاسك.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs font-cairo text-right animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-maroon-100 text-maroon-900 rounded-xl">
              <Calendar className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-black text-slate-900 text-base">
                رصد درجات أسبوع / تاسك سابق 📝
              </h3>
              <p className="text-[11px] text-slate-500 font-bold">
                رصد مباشر لدرجات المخدومين في كشف التاسكات وإضافتها لنقاط التميز.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Week & Task Config Box */}
          <div className="bg-gradient-to-r from-amber-50/70 to-orange-50/40 border border-amber-200/80 rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">
                  أسبوع الخدمة (جمعات الخدمة)
                </label>
                <select
                  value={selectedWeekDate}
                  onChange={(e) => setSelectedWeekDate(e.target.value)}
                  disabled={isCustomTask}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-maroon-800"
                >
                  {fridaysList.map(f => (
                    <option key={f.dateStr} value={f.dateStr}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">
                  المادة الدراسية
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-maroon-800"
                >
                  <option value="كتاب مقدس">كتاب مقدس</option>
                  <option value="عقيدة">عقيدة</option>
                  <option value="طقس وألحان">طقس وألحان</option>
                  <option value="تاريخ كنيسة">تاريخ كنيسة</option>
                  <option value="خدمة ورعاية">خدمة ورعاية</option>
                  <option value="عام">عام</option>
                  {(currentGradeSubjects || []).map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-black text-slate-700 mb-1">
                  عنوان التاسك / المسابقة في الكشف
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="مثال: تاسك الأسبوع 1 - دراسة إنجيل متى"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-maroon-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">
                  الدرجة العظمى
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={maxScore}
                  onChange={(e) => setMaxScore(Number(toEnglishDigits(e.target.value)) || 20)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-800 focus:outline-none focus:border-maroon-800"
                />
              </div>
            </div>
          </div>

          {/* Cohort Tabs & Quick Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setActiveStageFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeStageFilter === 'all'
                    ? 'bg-maroon-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                الكل ({servantsPrepStudents.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveStageFilter('first')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeStageFilter === 'first'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                سنة أولى ({servantsPrepStudents.filter(s => s.grade === 'first').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveStageFilter('second')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeStageFilter === 'second'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                سنة ثانية ({servantsPrepStudents.filter(s => s.grade === 'second').length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGiveFullScoreToAll}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-black flex items-center gap-1 cursor-pointer transition-all"
                title="منح الدرجة الكاملة لجميع الطلاب الظاهرين في القائمة"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>الدرجة الكاملة للظاهرين ({maxScore})</span>
              </button>
              <button
                type="button"
                onClick={handleClearScores}
                className="px-2 py-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-rose-700 hover:bg-rose-50 text-[11px] font-bold cursor-pointer transition-all"
              >
                مسح
              </button>
            </div>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="بحث بالاسم أو الهاتف في القائمة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-maroon-800"
            />
          </div>

          {/* Students Scoring List */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white max-h-[360px] overflow-y-auto">
            {displayedStudents.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-bold text-xs">
                لا يوجد طلاب مطابقين للفلتر أو البحث.
              </div>
            ) : (
              displayedStudents.map((st, idx) => {
                const currentScore = scores[st.id];
                const isScored = currentScore !== undefined && currentScore !== '';
                const isFull = Number(currentScore) === Number(maxScore);

                return (
                  <div
                    key={st.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[11px] text-slate-400 font-mono w-5 shrink-0 text-center">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-extrabold text-xs text-slate-900 truncate">
                          {st.fullName || 'مخدوم'}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5 font-mono" dir="ltr">
                          <span className={`px-1.5 py-0.2 rounded-md font-sans font-black ${
                            st.grade === 'first' ? 'bg-emerald-50 text-emerald-800' : 'bg-blue-50 text-blue-800'
                          }`}>
                            {st.grade === 'first' ? 'سنة أولى' : 'سنة ثانية'}
                          </span>
                          <span>{st.phone || '—'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          max={maxScore}
                          placeholder="—"
                          value={currentScore ?? ''}
                          onChange={(e) => handleScoreChange(st.id, e.target.value)}
                          className={`w-16 h-8 text-center rounded-xl text-xs font-mono font-black border transition-all ${
                            isFull 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                              : isScored 
                              ? 'bg-amber-50 text-amber-900 border-amber-300' 
                              : 'bg-slate-50 text-slate-800 border-slate-200 focus:border-maroon-800'
                          }`}
                        />
                        <span className="text-[10px] text-slate-400 mr-1 font-mono">
                          /{maxScore}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleScoreChange(st.id, maxScore)}
                        className={`h-8 px-2 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                          isFull
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'
                        }`}
                        title="منح الدرجة الكاملة"
                      >
                        فل مارك
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Success Banner */}
          {saveSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-black flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-slate-500 font-bold">
            تم رصد: {Object.keys(scores).length} من {servantsPrepStudents.length} مخدوم
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-all cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSaveSubmissions}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-maroon-800 to-maroon-900 hover:from-maroon-900 hover:to-maroon-950 text-white text-xs font-black flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-gold-300" />
                  <span>جاري الاعتماد والحفظ...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-gold-300" />
                  <span>حفظ واعتماد درجات الكشف</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
