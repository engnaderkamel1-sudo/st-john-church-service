import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileSpreadsheet, Award, TrendingUp, Search, Download, 
  CheckCircle2, XCircle, Users, Sparkles, Filter, ChevronRight, Eye,
  Calendar, Edit3, Plus, Trash2, Check, X, Loader2
} from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import ServantRetroTaskModal, { toEnglishDigits } from './ServantRetroTaskModal';

export default function ServantTasksTotals({
  allUsers = [],
  createdExams = [],
  getGradeTitle,
  onSelectStudent,
  onOpenResponses,
  user,
  fetchAllUsers,
  currentGradeSubjects = []
}) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStageFilter, setActiveStageFilter] = useState('all'); // 'all' | 'first' | 'second'

  // Modal & Quick Cell Grading State
  const [showRetroModal, setShowRetroModal] = useState(false);
  const [retroModalTask, setRetroModalTask] = useState(null);
  const [editingCell, setEditingCell] = useState(null); // { student, task, currentSub, scoreInput }
  const [cellSaving, setCellSaving] = useState(false);

  // Listen to all exam/task submissions
  useEffect(() => {
    setLoading(true);
    const q = collection(db, 'exam_submissions');
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSubmissions(list);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching submissions for tasks totals:', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Filter relevant students of Servants Prep
  const servantsPrepStudents = useMemo(() => {
    return (allUsers || []).filter(u => u.role === 'student' && u.grade !== 'elisha');
  }, [allUsers]);

  // Aggregate tasks: online quizzes + manual weekly tasks recorded in submissions
  const tasksList = useMemo(() => {
    const map = new Map();

    // 1. Online quizzes
    (createdExams || []).filter(e => e.type !== 'paper').forEach(e => {
      map.set(e.id, {
        id: e.id,
        title: e.title || 'مسابقة أونلاين',
        subject: e.subject || 'عام',
        grade: e.grade || 'all',
        totalScore: Number(e.totalScore) || 20,
        type: 'online_quiz',
        date: e.date || (e.createdAt?.toDate ? e.createdAt.toDate().toISOString().split('T')[0] : null)
      });
    });

    // 2. Weekly manual tasks from submissions
    submissions.forEach(sub => {
      if (!sub.examId) return;
      if (!map.has(sub.examId)) {
        map.set(sub.examId, {
          id: sub.examId,
          title: sub.examTitle || 'تاسك أسبوعي',
          subject: sub.subject || 'عام',
          grade: sub.grade || 'all',
          totalScore: Number(sub.totalScore) || 20,
          type: sub.type || 'manual_weekly_entry',
          date: sub.date || null
        });
      }
    });

    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      if (a.date && b.date) return a.date.localeCompare(b.date);
      if (a.date) return 1;
      if (b.date) return -1;
      return 0;
    });
    return arr;
  }, [createdExams, submissions]);

  // Filter tasks matching current stage filter
  const currentStageTasks = useMemo(() => {
    if (activeStageFilter === 'all') return tasksList;
    return tasksList.filter(t => 
      !t.grade || 
      t.grade === 'all' || 
      t.grade === 'common_hall' || 
      t.grade === 'cycle_1' || 
      t.grade === activeStageFilter ||
      (activeStageFilter === 'second' && t.grade === 'first')
    );
  }, [tasksList, activeStageFilter]);

  // Submissions map: [studentId][examId] = submission
  const submissionsMap = useMemo(() => {
    const map = {};
    submissions.forEach(sub => {
      if (!sub.userId || !sub.examId) return;
      if (!map[sub.userId]) map[sub.userId] = {};
      const cur = map[sub.userId][sub.examId];
      const curScore = cur ? (cur.score ?? cur.autoScore ?? 0) : -1;
      const newScore = sub.score ?? sub.autoScore ?? 0;
      // In case of multiple submissions, keep the one with higher score or manual servant entry
      if (!cur || sub.isManualServantEntry || newScore > curScore) {
        map[sub.userId][sub.examId] = sub;
      }
    });
    return map;
  }, [submissions]);

  // Filter students based on active stage filter and search query
  const filteredStudents = useMemo(() => {
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

  // Compute overall executive stats
  const stats = useMemo(() => {
    const year1Students = servantsPrepStudents.filter(s => s.grade === 'first');
    const year2Students = servantsPrepStudents.filter(s => s.grade === 'second');

    const computeCohortRate = (studentsList) => {
      if (studentsList.length === 0 || tasksList.length === 0) return 0;
      let totalPossible = 0;
      let totalSolved = 0;

      studentsList.forEach(st => {
        const studentTasks = tasksList.filter(t => 
          !t.grade || 
          t.grade === 'all' || 
          t.grade === 'common_hall' || 
          t.grade === 'cycle_1' || 
          t.grade === 'first' || 
          t.grade === st.grade
        );
        totalPossible += studentTasks.length;
        studentTasks.forEach(t => {
          if (submissionsMap[st.id]?.[t.id]) {
            totalSolved += 1;
          }
        });
      });

      return totalPossible > 0 ? Math.round((totalSolved / totalPossible) * 100) : 0;
    };

    // Task breakdown stats
    const perTaskStats = tasksList.map(task => {
      const eligibleStudents = servantsPrepStudents.filter(s => 
        !task.grade || 
        task.grade === 'all' || 
        task.grade === 'common_hall' || 
        task.grade === 'cycle_1' || 
        task.grade === 'first' || 
        task.grade === s.grade
      );
      const solvedList = eligibleStudents.filter(s => submissionsMap[s.id]?.[task.id]);
      const solvedCount = solvedList.length;
      const rate = eligibleStudents.length > 0 ? Math.round((solvedCount / eligibleStudents.length) * 100) : 0;
      
      const avgScore = solvedCount > 0 
        ? (solvedList.reduce((acc, s) => acc + (submissionsMap[s.id][task.id].autoScore || 0), 0) / solvedCount).toFixed(1)
        : 0;

      return {
        task,
        eligibleCount: eligibleStudents.length,
        solvedCount,
        rate,
        avgScore
      };
    });

    return {
      overallRate: computeCohortRate(servantsPrepStudents.filter(s => s.grade === 'first' || s.grade === 'second')),
      year1Rate: computeCohortRate(year1Students),
      year2Rate: computeCohortRate(year2Students),
      totalTasks: tasksList.length,
      perTaskStats
    };
  }, [servantsPrepStudents, tasksList, submissionsMap]);

  // Handle in-place single cell save/update
  const handleSaveCellScore = async (student, task, scoreVal) => {
    if (scoreVal === '' || scoreVal === null || scoreVal === undefined) return;
    const num = Number(toEnglishDigits(scoreVal));
    if (isNaN(num)) return;
    const maxScore = task.totalScore || 20;
    const clamped = Math.max(0, Math.min(maxScore, num));

    const subKey = `${student.id}_${task.id}`;
    const existingSub = submissionsMap[student.id]?.[task.id];
    const prevScore = existingSub ? (existingSub.score ?? existingSub.autoScore ?? 0) : 0;
    const diff = clamped - prevScore;

    setCellSaving(true);
    try {
      const subRef = doc(db, 'exam_submissions', subKey);
      await setDoc(subRef, {
        id: subKey,
        examId: task.id,
        examTitle: task.title || 'تاسك أسبوعي',
        subject: task.subject || 'عام',
        grade: student.grade || 'first',
        userId: student.id,
        userName: student.fullName || 'مخدوم',
        userPhone: student.phone || '',
        score: clamped,
        autoScore: clamped,
        totalScore: maxScore,
        type: 'manual_weekly_entry',
        isManualServantEntry: true,
        recordedBy: user?.fullName || 'الخادم المسؤول',
        date: task.date || new Date().toISOString().split('T')[0],
        updatedAt: serverTimestamp()
      }, { merge: true });

      if (diff !== 0) {
        const userRef = doc(db, 'users', student.id);
        await updateDoc(userRef, {
          points: Math.max(0, (student.points || 0) + diff)
        }).catch(err => console.warn('Could not update user points:', err));
      }

      if (fetchAllUsers) fetchAllUsers();
      setEditingCell(null);
    } catch (err) {
      console.error('Error saving cell score:', err);
      alert('حدث خطأ أثناء حفظ درجة الطالب.');
    } finally {
      setCellSaving(false);
    }
  };

  // Handle in-place single cell delete/clear
  const handleDeleteCellScore = async (student, task) => {
    const existingSub = submissionsMap[student.id]?.[task.id];
    if (!existingSub) {
      setEditingCell(null);
      return;
    }
    if (!window.confirm(`هل أنت متأكد من مسح درجة ${student.fullName || 'الطالب'} في هذا التاسك؟`)) return;

    setCellSaving(true);
    const prevScore = existingSub.score ?? existingSub.autoScore ?? 0;
    try {
      const subRef = doc(db, 'exam_submissions', existingSub.id || `${student.id}_${task.id}`);
      await deleteDoc(subRef);

      if (prevScore > 0) {
        const userRef = doc(db, 'users', student.id);
        await updateDoc(userRef, {
          points: Math.max(0, (student.points || 0) - prevScore)
        }).catch(err => console.warn('Could not update user points:', err));
      }

      if (fetchAllUsers) fetchAllUsers();
      setEditingCell(null);
    } catch (err) {
      console.error('Error deleting cell score:', err);
      alert('حدث خطأ أثناء مسح الدرجة.');
    } finally {
      setCellSaving(false);
    }
  };

  // Export comprehensive Master Tasks CSV to Excel
  const handleExportCsv = () => {
    if (filteredStudents.length === 0 || currentStageTasks.length === 0) {
      alert('لا توجد بيانات لتصديرها.');
      return;
    }

    const taskHeaders = currentStageTasks.map(t => `"${t.title || 'تاسك'}"`);
    const headers = ['م', 'اسم الطالب', 'رقم الهاتف', 'المرحلة', 'نسبة الالتزام %', 'التاسكات المحلولة', ...taskHeaders];

    const rows = filteredStudents.map((st, idx) => {
      const studentTasks = currentStageTasks.filter(t => 
        !t.grade || 
        t.grade === 'all' || 
        t.grade === 'common_hall' || 
        t.grade === 'cycle_1' || 
        t.grade === 'first' || 
        t.grade === st.grade
      );
      const solvedCount = studentTasks.filter(t => submissionsMap[st.id]?.[t.id]).length;
      const percent = studentTasks.length > 0 ? Math.round((solvedCount / studentTasks.length) * 100) : 0;

      const taskScores = currentStageTasks.map(t => {
        const sub = submissionsMap[st.id]?.[t.id];
        return sub ? `${sub.autoScore || 0}/${t.totalScore || 20}` : 'لم يحل';
      });

      return [
        idx + 1,
        `"${st.fullName || 'مخدوم'}"`,
        `"${st.phone || ''}"`,
        `"${getGradeTitle ? getGradeTitle(st.grade) : st.grade}"`,
        `${percent}%`,
        `"${solvedCount} من ${studentTasks.length}"`,
        ...taskScores.map(score => `"${score}"`)
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `كشف_إجماليات_التاسكات_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-cairo text-right animate-in fade-in duration-200">
      
      {/* 1. Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-maroon-50 text-maroon-800 rounded-2xl border border-maroon-100">
            <FileSpreadsheet className="w-5 h-5 text-maroon-800" />
          </span>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              كشف إجماليات ونسب حل التاسكات والمسابقات 📊
            </h3>
            <p className="text-xs text-slate-500 font-bold mt-0.5">
              متابعة شاملة لمدى التزام مخدومي القاعة المشتركة بحل كافة التاسكات والمسابقات الأسبوعية.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setRetroModalTask(null);
              setShowRetroModal(true);
            }}
            className="min-h-[40px] px-4 py-2 bg-gradient-to-r from-amber-600 via-amber-500 to-gold-500 hover:from-amber-700 hover:to-amber-600 text-maroon-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer shrink-0"
          >
            <Calendar className="w-4 h-4 text-maroon-950" />
            <span>+ رصد درجات أسبوع / تاسك 📅✨</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="min-h-[40px] px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>تصدير إكسيل (CSV)</span>
          </button>
        </div>
      </div>

      {/* 2. Top Executive Percentage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Card 1: Overall Average */}
        <div className="bg-gradient-to-br from-slate-900 via-maroon-950 to-slate-900 text-white rounded-3xl p-4 shadow-sm border border-maroon-800/40 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-black text-gold-300 uppercase tracking-wider block">
                متوسط التزام القاعة المشتركة
              </span>
              <h4 className="text-lg font-black mt-1 text-white">
                حل التاسكات (الكل)
              </h4>
            </div>
            <span className="p-2 bg-white/10 rounded-2xl text-gold-300">
              <TrendingUp className="w-5 h-5" />
            </span>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-gold-300 font-mono">
                {stats.overallRate}%
              </span>
              <span className="text-[11px] text-slate-300 mr-2 font-bold">
                نسبة الإنجاز
              </span>
            </div>
            <span className="text-xs bg-white/15 px-2.5 py-1 rounded-xl font-black text-slate-200">
              {stats.totalTasks} تاسكات منشورة
            </span>
          </div>
        </div>

        {/* Card 2: Year 1 Cohort */}
        <div className="bg-white border-2 border-emerald-200 rounded-3xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider block">
                دفعة السنة الأولى
              </span>
              <h4 className="text-base font-black mt-0.5 text-slate-900">
                السنة الأولى لإعداد خدام
              </h4>
            </div>
            <span className="p-2 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100">
              <Award className="w-5 h-5" />
            </span>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-emerald-600 font-mono">
                {stats.year1Rate}%
              </span>
              <span className="text-[11px] text-slate-500 mr-2 font-bold">
                نسبة الالتزام
              </span>
            </div>
            <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-xl font-black">
              {servantsPrepStudents.filter(s => s.grade === 'first').length} مخدوم
            </span>
          </div>
        </div>

        {/* Card 3: Year 2 Cohort */}
        <div className="bg-white border-2 border-blue-200 rounded-3xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-black text-blue-800 uppercase tracking-wider block">
                دفعة السنة الثانية
              </span>
              <h4 className="text-base font-black mt-0.5 text-slate-900">
                السنة الثانية لإعداد خدام
              </h4>
            </div>
            <span className="p-2 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100">
              <Sparkles className="w-5 h-5" />
            </span>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-blue-600 font-mono">
                {stats.year2Rate}%
              </span>
              <span className="text-[11px] text-slate-500 mr-2 font-bold">
                نسبة الالتزام
              </span>
            </div>
            <span className="text-xs bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-xl font-black">
              {servantsPrepStudents.filter(s => s.grade === 'second').length} مخدوم
            </span>
          </div>
        </div>
      </div>

      {/* 3. Per-Task Summary Cards Carousel */}
      {stats.perTaskStats.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <span>تفاصيل ونسب كل تاسك على حدة:</span>
            </h4>
            <span className="text-[11px] text-slate-500 font-bold">
              ({stats.perTaskStats.length}) مسابقات منشورة
            </span>
          </div>

          <div className="flex items-stretch gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {stats.perTaskStats.map(({ task, eligibleCount, solvedCount, rate, avgScore }, idx) => (
              <div 
                key={task.id}
                className="min-w-[220px] max-w-[260px] bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl p-3 flex flex-col justify-between shrink-0 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-maroon-100 text-maroon-900">
                      تاسك {idx + 1}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold truncate">
                      {task.subject || 'عام'}
                    </span>
                  </div>
                  <h5 className="font-extrabold text-xs text-slate-900 line-clamp-1" title={task.title}>
                    {task.title}
                  </h5>

                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-black text-maroon-900 font-mono">
                        {rate}%
                      </span>
                      <span className="text-[10px] text-slate-500 mr-1.5 font-bold">
                        نسبة الحل
                      </span>
                    </div>
                    <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-lg">
                      {solvedCount} / {eligibleCount}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-600 font-bold">
                    متوسط: <strong className="text-indigo-800">{avgScore} / {task.totalScore || 20}</strong>
                  </span>
                  {onOpenResponses && (
                    <button
                      type="button"
                      onClick={() => onOpenResponses(task)}
                      className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>الردود 👥</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Master Student Matrix Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-4">
        
        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActiveStageFilter('all')}
              className={`px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeStageFilter === 'all'
                  ? 'bg-maroon-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              القاعة المشتركة (سنة أولى + ثانية) ({servantsPrepStudents.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveStageFilter('first')}
              className={`px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeStageFilter === 'first'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              السنة الأولى ({servantsPrepStudents.filter(s => s.grade === 'first').length})
            </button>

            <button
              type="button"
              onClick={() => setActiveStageFilter('second')}
              className={`px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeStageFilter === 'second'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              السنة الثانية ({servantsPrepStudents.filter(s => s.grade === 'second').length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="بحث باسم الطالب أو الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-maroon-800"
            />
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-black">
                <th className="p-3 text-center w-10">م</th>
                <th className="p-3 min-w-[160px]">اسم المخدوم</th>
                <th className="p-3 text-center min-w-[90px]">المرحلة</th>
                <th className="p-3 text-center min-w-[110px]">نسبة الالتزام</th>
                {currentStageTasks.map((t, idx) => (
                  <th key={t.id} className="p-2.5 text-center min-w-[125px] bg-slate-50 border-r border-slate-200" title={t.title}>
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-[10px] font-black text-maroon-900">تاسك {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setRetroModalTask(t);
                          setShowRetroModal(true);
                        }}
                        className="p-1 text-slate-400 hover:text-maroon-800 hover:bg-slate-200/60 rounded-md transition-all cursor-pointer"
                        title="رصد وتعديل درجات هذا التاسك للأسبوع"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-[10px] text-slate-800 font-extrabold truncate max-w-[110px] mx-auto">
                      {t.title}
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono mt-0.5 flex items-center justify-center gap-1">
                      <span>{t.subject || 'عام'}</span>
                      <span>•</span>
                      <span>{t.totalScore || 20} د</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-bold">
              {loading ? (
                <tr>
                  <td colSpan={4 + currentStageTasks.length} className="p-10 text-center text-slate-400 font-bold">
                    جاري تحميل كشف تفاعل وإجماليات التاسكات...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={4 + currentStageTasks.length} className="p-10 text-center text-slate-400 font-bold">
                    لا يوجد مخدومين مطابقين للبحث أو الفلتر المحدد.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => {
                  const studentTasks = currentStageTasks.filter(t => 
                    !t.grade || 
                    t.grade === 'all' || 
                    t.grade === 'common_hall' || 
                    t.grade === 'cycle_1' || 
                    t.grade === 'first' || 
                    t.grade === st.grade
                  );
                  const solvedCount = studentTasks.filter(t => submissionsMap[st.id]?.[t.id]).length;
                  const percent = studentTasks.length > 0 ? Math.round((solvedCount / studentTasks.length) * 100) : 0;

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => onSelectStudent && onSelectStudent(st)}
                          className="font-extrabold text-slate-900 hover:text-maroon-800 text-right flex flex-col cursor-pointer group"
                        >
                          <span className="group-hover:underline flex items-center gap-1">
                            <span>{st.fullName || 'مخدوم'}</span>
                            <Eye className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono" dir="ltr">
                            {st.phone || 'بدون هاتف'}
                          </span>
                        </button>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          st.grade === 'first' 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}>
                          {getGradeTitle ? getGradeTitle(st.grade) : st.grade}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-xl font-mono font-black text-[11px] border ${
                          percent >= 75 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : percent >= 50 
                            ? 'bg-amber-50 text-amber-900 border-amber-200' 
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          {percent}% ({solvedCount}/{studentTasks.length})
                        </span>
                      </td>
                      {currentStageTasks.map((t) => {
                        const sub = submissionsMap[st.id]?.[t.id];
                        const isOnline = sub && sub.type === 'online_quiz' && !sub.isManualServantEntry;

                        return (
                          <td key={t.id} className="p-2 text-center border-r border-slate-100">
                            {sub ? (
                              <button
                                type="button"
                                onClick={() => setEditingCell({
                                  student: st,
                                  task: t,
                                  currentSub: sub,
                                  scoreInput: sub.score ?? sub.autoScore ?? 0
                                })}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black font-mono border transition-all cursor-pointer shadow-xs active:scale-95 ${
                                  isOnline 
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100' 
                                    : 'bg-indigo-50 text-indigo-900 border-indigo-300 hover:bg-indigo-100'
                                }`}
                                title={isOnline ? 'حل أوتوماتيكي عبر التطبيق (انقر للتعديل)' : 'رصد يدوي بواسطة الخادم (انقر للتعديل)'}
                              >
                                {isOnline ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Edit3 className="w-3 h-3 text-indigo-600" />
                                )}
                                <span>{sub.score ?? sub.autoScore ?? 0}/{t.totalScore || 20}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditingCell({
                                  student: st,
                                  task: t,
                                  currentSub: null,
                                  scoreInput: ''
                                })}
                                className="inline-flex items-center justify-center w-8 h-7 rounded-lg bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-400 hover:border hover:border-amber-300 text-[11px] font-black transition-all cursor-pointer"
                                title="انقر لرصد درجة هذا الطالب"
                              >
                                <span>—</span>
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Quick Cell Grading Popover Modal */}
      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs font-cairo text-right animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-maroon-100 text-maroon-900 rounded-lg">
                  <Edit3 className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="font-black text-xs text-slate-900">
                    رصد درجة الطالب
                  </h4>
                  <p className="text-[10px] text-slate-500 font-bold truncate max-w-[200px]">
                    {editingCell.task.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3.5">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="font-black text-xs text-slate-900">
                  {editingCell.student.fullName || 'مخدوم'}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {editingCell.student.phone || 'بدون هاتف'} • {getGradeTitle ? getGradeTitle(editingCell.student.grade) : editingCell.student.grade}
                </div>
                {editingCell.currentSub && editingCell.currentSub.type === 'online_quiz' && !editingCell.currentSub.isManualServantEntry && (
                  <div className="mt-1 text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>تم الحل أوتوماتيكياً على التطبيق</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">
                  الدرجة (من {editingCell.task.totalScore || 20})
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max={editingCell.task.totalScore || 20}
                    placeholder="0"
                    value={editingCell.scoreInput}
                    onChange={(e) => setEditingCell({ ...editingCell, scoreInput: e.target.value })}
                    className="w-24 h-10 text-center font-mono font-black text-sm bg-white border-2 border-slate-200 rounded-xl focus:border-maroon-800 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setEditingCell({ ...editingCell, scoreInput: editingCell.task.totalScore || 20 })}
                    className="h-10 px-3 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-black cursor-pointer transition-all"
                  >
                    الدرجة النهائية ★
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
              {editingCell.currentSub ? (
                <button
                  type="button"
                  disabled={cellSaving}
                  onClick={() => handleDeleteCellScore(editingCell.student, editingCell.task)}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer disabled:opacity-50"
                >
                  مسح الدرجة
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={cellSaving}
                  onClick={() => setEditingCell(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={cellSaving || editingCell.scoreInput === ''}
                  onClick={() => handleSaveCellScore(editingCell.student, editingCell.task, editingCell.scoreInput)}
                  className="px-4 py-1.5 rounded-xl bg-maroon-800 hover:bg-maroon-900 text-white text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {cellSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-gold-300" />
                  ) : (
                    <Save className="w-3.5 h-3.5 text-gold-300" />
                  )}
                  <span>حفظ</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Retroactive Weekly Task Scoring Modal */}
      <ServantRetroTaskModal
        isOpen={showRetroModal}
        onClose={() => {
          setShowRetroModal(false);
          setRetroModalTask(null);
        }}
        allUsers={allUsers}
        currentGradeSubjects={currentGradeSubjects}
        user={user}
        fetchAllUsers={fetchAllUsers}
        onSaved={() => {}}
        initialTask={retroModalTask}
        existingSubmissions={submissions}
      />

    </div>
  );
}
