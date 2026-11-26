import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Download, Search, CheckCircle, 
  ChevronDown, ChevronUp, Clock, Trash2, Sparkles, Loader2, Award
} from 'lucide-react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { formatExamAnswerValue, gradeExamSubmissionWithAi } from '../../services/geminiService';
import { triggerServerPush } from '../../services/webPushService';

export default function ServantQuizResponsesModal({
  isOpen,
  onClose,
  exam,
  getGradeTitle,
  currentUser
}) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedStudentId, setExpandedStudentId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [draftScores, setDraftScores] = useState({});
  const [draftNotes, setDraftNotes] = useState({});
  const [approvingId, setApprovingId] = useState(null);
  const [autoGradingCount, setAutoGradingCount] = useState(0);
  const gradingInProgressRef = useRef(new Set());

  const hasSubjectiveExam = Boolean(
    exam?.requiresManualApproval ||
    (exam?.questions || []).some(q => q.type === 'essay' || q.type === 'fill_blank')
  );

  const buildInitialQuestionScores = (sub) => {
    const map = {};
    (exam?.questions || []).forEach((q) => {
      const maxPts = Number(q.points) || 1;
      if (sub.questionScores && sub.questionScores[q.id] !== undefined) {
        map[q.id] = Number(sub.questionScores[q.id]);
      } else if (sub.aiEvaluation && sub.aiEvaluation[q.id] && sub.aiEvaluation[q.id].score !== undefined) {
        map[q.id] = Number(sub.aiEvaluation[q.id].score);
      } else if (q.type === 'mcq' || q.type === 'multiple_choice' || q.type === 'true_false') {
        const ans = formatExamAnswerValue(sub.answers?.[q.id]);
        map[q.id] = ans === String(q.correctAnswer || '').trim() ? maxPts : 0;
      } else {
        map[q.id] = 0;
      }
    });
    return map;
  };

  const handleDeleteOwnSubmission = async (sub) => {
    if (!window.confirm('هل أنت متأكد من حذف مشاركتك التجريبية من هذه المسابقة؟')) return;
    setDeletingId(sub.id);
    try {
      await deleteDoc(doc(db, 'exam_submissions', sub.id));
      setSubmissions(prev => prev.filter(s => s.id !== sub.id));
    } catch (err) {
      console.error('Error deleting submission:', err);
      alert('حدث خطأ أثناء محاولة حذف الرد.');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (!isOpen || !exam?.id) return;
    let isCancelled = false;
    gradingInProgressRef.current = new Set();

    const fetchAndAutoGrade = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'exam_submissions'), 
          where('examId', '==', exam.id)
        );
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        if (isCancelled) return;
        setSubmissions(list);

        // Initialize draft score/note maps
        const initScores = {};
        const initNotes = {};
        list.forEach(sub => {
          initScores[sub.id] = buildInitialQuestionScores(sub);
          initNotes[sub.id] = sub.servantNotes || {};
        });
        setDraftScores(initScores);
        setDraftNotes(initNotes);
        setLoading(false);

        // استكمال التقييم بالذكاء الاصطناعي تلقائياً في الخلفية لأي تسليم لم يُقيّم بعد
        if (hasSubjectiveExam) {
          const pendingSubs = list.filter(
            sub => !sub.isApproved && sub.gradingStatus !== 'ai_graded' && !sub.aiEvaluation
          );
          if (pendingSubs.length > 0) {
            setAutoGradingCount(pendingSubs.length);
            for (const sub of pendingSubs) {
              if (isCancelled || gradingInProgressRef.current.has(sub.id)) continue;
              gradingInProgressRef.current.add(sub.id);
              try {
                const aiPatch = await gradeExamSubmissionWithAi(exam, sub);
                await updateDoc(doc(db, 'exam_submissions', sub.id), aiPatch);
                if (!isCancelled) {
                  setSubmissions(prev => prev.map(item => item.id === sub.id ? { ...item, ...aiPatch } : item));
                  setDraftScores(prev => ({ ...prev, [sub.id]: aiPatch.questionScores }));
                }
              } catch (aiErr) {
                console.warn('Auto fallback AI grading skipped for submission:', sub.id, aiErr);
              } finally {
                if (!isCancelled) {
                  setAutoGradingCount(prev => Math.max(0, prev - 1));
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching quiz submissions:', err);
        setLoading(false);
      }
    };

    fetchAndAutoGrade();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, exam?.id]);

  if (!isOpen || !exam) return null;

  const filtered = submissions.filter(s => 
    (s.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.userPhone || '').includes(searchTerm)
  );

  const totalScore = exam.totalScore || (exam.questions || []).reduce((sum, q) => sum + (Number(q.points) || 1), 0) || 20;
  const getDisplayScore = (sub) => {
    if (sub.finalScore !== null && sub.finalScore !== undefined) return Number(sub.finalScore);
    if (sub.aiSuggestedScore !== null && sub.aiSuggestedScore !== undefined) return Number(sub.aiSuggestedScore);
    return Number(sub.autoScore || 0);
  };

  const avgScore = submissions.length > 0 
    ? (submissions.reduce((acc, s) => acc + getDisplayScore(s), 0) / submissions.length).toFixed(1)
    : 0;

  const handleScoreChange = (subId, qId, value, maxPts) => {
    const parsed = Number(value);
    const safeVal = Number.isFinite(parsed)
      ? Math.max(0, Math.min(maxPts, Math.round(parsed * 2) / 2))
      : 0;
    setDraftScores(prev => ({
      ...prev,
      [subId]: {
        ...(prev[subId] || {}),
        [qId]: safeVal
      }
    }));
  };

  const handleNoteChange = (subId, qId, text) => {
    setDraftNotes(prev => ({
      ...prev,
      [subId]: {
        ...(prev[subId] || {}),
        [qId]: text
      }
    }));
  };

  const computeDraftTotal = (sub) => {
    const scoresMap = draftScores[sub.id] || buildInitialQuestionScores(sub);
    return Math.round(
      Object.values(scoresMap).reduce((sum, v) => sum + (Number(v) || 0), 0) * 2
    ) / 2;
  };

  const handleApproveSubmission = async (sub) => {
    const scoresMap = draftScores[sub.id] || buildInitialQuestionScores(sub);
    const notesMap = draftNotes[sub.id] || {};
    const finalScore = computeDraftTotal(sub);
    const wasAlreadyApproved = Boolean(sub.isApproved);

    setApprovingId(sub.id);
    try {
      const updateFields = {
        questionScores: scoresMap,
        servantNotes: notesMap,
        finalScore,
        autoScore: finalScore,
        isApproved: true,
        gradingStatus: 'approved',
        approvedBy: currentUser?.fullName || 'الخادم المسؤول',
        approvedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'exam_submissions', sub.id), updateFields);
      setSubmissions(prev => prev.map(item => item.id === sub.id ? { ...item, ...updateFields } : item));

      // إرسال إشعار فوري للمخدوم بظهور النتيجة عند الاعتماد
      if (sub.userId) {
        const notifTitle = wasAlreadyApproved
          ? `📝 تم تحديث نتيجتك في: ${exam.title}`
          : `🎉 ظهرت نتيجتك في: ${exam.title}`;
        const notifBody = `تم اعتماد نتيجتك بواسطة الخادم: حصلت على ${finalScore} من ${totalScore} درجة. يمكنك الآن مراجعة إجاباتك وتصحيحها من قسم الامتحانات.`;

        addDoc(collection(db, 'notifications'), {
          targetUserId: sub.userId,
          title: notifTitle,
          desc: notifBody,
          time: 'الآن',
          type: 'exam_result_approved',
          examId: exam.id,
          createdAt: serverTimestamp()
        }).catch(() => {});

        triggerServerPush({
          targetUserId: sub.userId,
          title: notifTitle,
          body: notifBody,
          url: '/'
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Error approving exam submission:', err);
      alert('حدث خطأ أثناء حفظ واعتماد النتيجة، يرجى المحاولة مرة أخرى.');
    } finally {
      setApprovingId(null);
    }
  };

  // Export to CSV with UTF-8 BOM for perfect Excel Arabic support
  const handleExportCsv = () => {
    if (submissions.length === 0) {
      alert('لا توجد ردود لتصديرها حالياً.');
      return;
    }

    const headers = ['م', 'اسم الطالب', 'رقم الهاتف', 'المرحلة', 'الدرجة المحصلة', 'الدرجة الكلية', 'الحالة', 'تاريخ التسليم', 'وقت التسليم'];
    const rows = submissions.map((s, idx) => [
      idx + 1,
      `"${s.userName || 'مخدوم'}"`,
      `"${s.userPhone || ''}"`,
      `"${getGradeTitle ? getGradeTitle(s.grade) : s.grade}"`,
      getDisplayScore(s),
      totalScore,
      `"${s.isApproved ? 'معتمد' : s.gradingStatus === 'ai_graded' ? 'تقييم ذكي بانتظار الاعتماد' : 'بانتظار التقييم'}"`,
      `"${s.date || ''}"`,
      `"${s.submittedAt || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ردود_${exam.title || 'مسابقة'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 font-cairo text-right">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-l from-slate-900 via-slate-800 to-maroon-900 text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-gold-400 text-maroon-950 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                {hasSubjectiveExam ? 'مراجعة واعتماد الدرجات' : 'ردود المسابقة'}
              </span>
              <span className="text-xs text-slate-300">
                {getGradeTitle ? getGradeTitle(exam.grade) : exam.grade}
              </span>
            </div>
            <h3 className="font-black text-sm sm:text-base mt-1 text-white">
              {exam.title}
            </h3>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2.5 p-4 bg-slate-50 border-b border-slate-200 text-center shrink-0">
          <div className="bg-white p-3 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 block">عدد المشاركين</span>
            <span className="text-base sm:text-lg font-black text-maroon-900">{submissions.length}</span>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 block">متوسط الدرجات</span>
            <span className="text-base sm:text-lg font-black text-indigo-700">{avgScore} / {totalScore}</span>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 block">الدرجة النهائية</span>
            <span className="text-base sm:text-lg font-black text-emerald-700">{totalScore} نقطة</span>
          </div>
        </div>

        {/* Auto AI Grading Background Banner */}
        {autoGradingCount > 0 && (
          <div className="px-4 py-2.5 bg-indigo-50 border-b border-indigo-200 text-indigo-900 text-xs font-bold flex items-center gap-2 shrink-0">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-700 shrink-0" />
            <span>جاري استكمال التصحيح التلقائي بالذكاء الاصطناعي لـ ({autoGradingCount}) تسليمات في الخلفية...</span>
          </div>
        )}

        {/* Controls: Search & Excel Export */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input 
              type="text"
              placeholder="بحث باسم الطالب أو الهاتف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-maroon-800"
            />
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>تصدير كشف درجات إكسيل</span>
          </button>
        </div>

        {/* Submissions List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-bold">
              جاري تحميل إجابات وردود الطلاب...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 font-bold">
              لا توجد ردود مسجلة لهذا التقييم حتى الآن.
            </div>
          ) : (
            filtered.map((sub, idx) => {
              const isExpanded = expandedStudentId === sub.id;
              const liveTotal = hasSubjectiveExam ? computeDraftTotal(sub) : getDisplayScore(sub);
              const percent = totalScore > 0 ? Math.round((liveTotal / totalScore) * 100) : 0;
              const isMyOwnSubmission = Boolean(
                currentUser && (
                  (currentUser.id && sub.userId === currentUser.id) ||
                  (currentUser.phone && sub.userPhone && String(sub.userPhone).replace(/\s+/g, '') === String(currentUser.phone).replace(/\s+/g, '')) ||
                  (currentUser.name && sub.userName && sub.userName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) ||
                  (sub.userPhone && (sub.userPhone === '01275571569' || sub.userPhone === currentUser.phone))
                )
              );

              return (
                <div 
                  key={sub.id}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5 transition-all hover:border-slate-300"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-xs text-slate-900 truncate">
                            {sub.userName || 'مخدوم'}
                          </span>
                          {isMyOwnSubmission && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
                              (حسابك)
                            </span>
                          )}
                          {hasSubjectiveExam && (
                            sub.isApproved ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black inline-flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                <span>تم الاعتماد</span>
                              </span>
                            ) : sub.gradingStatus === 'ai_graded' ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-black inline-flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                <span>تقييم ذكي — بانتظار الاعتماد</span>
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-black inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>بانتظار التقييم</span>
                              </span>
                            )
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          {sub.userPhone || 'بدون هاتف'} • {sub.submittedAt || ''} {sub.date || ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 justify-end">
                      {isMyOwnSubmission && (
                        <button
                          type="button"
                          disabled={deletingId === sub.id}
                          onClick={() => handleDeleteOwnSubmission(sub)}
                          className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                          title="حذف مشاركتي التجريبية"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>حذف الرد</span>
                        </button>
                      )}

                      <div className={`px-2.5 py-1 rounded-xl text-xs font-black border ${
                        percent >= 80 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                          : percent >= 50 
                          ? 'bg-amber-50 text-amber-800 border-amber-200' 
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}>
                        {liveTotal} / {totalScore} ({percent}%)
                      </div>

                      {sub.answers && (
                        <button
                          type="button"
                          onClick={() => setExpandedStudentId(isExpanded ? null : sub.id)}
                          className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isExpanded ? 'إخفاء' : (hasSubjectiveExam ? 'مراجعة' : 'التفاصيل')}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Answers Breakdown & AI Review / Manual Adjustment */}
                  {isExpanded && sub.answers && exam.questions && (
                    <div className="pt-3 border-t border-slate-200 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-[11px] font-extrabold text-slate-600">
                          إجابات الطالب وتقييم الذكاء الاصطناعي:
                        </span>
                        {hasSubjectiveExam && sub.aiSuggestedScore !== undefined && (
                          <span className="text-[11px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                            مقترح الذكاء الاصطناعي: {sub.aiSuggestedScore} / {totalScore}
                          </span>
                        )}
                      </div>

                      {exam.questions.map((q, qIdx) => {
                        const maxPts = Number(q.points) || 1;
                        const studentAns = formatExamAnswerValue(sub.answers[q.id]);
                        const currentQScore = draftScores[sub.id]?.[q.id] ?? 0;
                        const aiEval = sub.aiEvaluation?.[q.id];
                        const isSubjectiveQ = q.type === 'fill_blank' || q.type === 'essay';
                        const isFull = currentQScore >= maxPts;
                        const isZero = currentQScore <= 0;

                        return (
                          <div key={q.id} className="p-3 rounded-2xl bg-white border border-slate-200 space-y-2">
                            <div className="flex items-start justify-between gap-2 text-[11px] font-bold">
                              <span className="text-slate-900 leading-relaxed">
                                س {qIdx + 1}: {q.questionText}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full shrink-0 font-black ${
                                isFull
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : isZero
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}>
                                {currentQScore} / {maxPts}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-700 space-y-1">
                              <div>
                                <span className="font-bold text-slate-500">إجابة الطالب: </span>
                                <strong className="text-slate-900">{studentAns || 'لم يجب'}</strong>
                              </div>
                              <div>
                                <span className="font-bold text-slate-500">الإجابة النموذجية: </span>
                                <strong className="text-emerald-800">{q.correctAnswer}</strong>
                              </div>
                            </div>

                            {aiEval?.feedback && (
                              <div className="p-2 rounded-xl bg-indigo-50/70 border border-indigo-100 text-[11px] text-indigo-900 flex items-start gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                                <span><strong>تقييم الذكاء الاصطناعي:</strong> {aiEval.feedback}</span>
                              </div>
                            )}

                            {/* أدوات تعديل الدرجة للخادم */}
                            {hasSubjectiveExam && (
                              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-extrabold text-slate-500">درجة الخادم:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max={maxPts}
                                    step="0.5"
                                    value={currentQScore}
                                    onChange={(e) => handleScoreChange(sub.id, q.id, e.target.value, maxPts)}
                                    className="w-16 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-center text-xs font-black text-slate-900 focus:outline-none focus:border-maroon-800"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleScoreChange(sub.id, q.id, 0, maxPts)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                                      currentQScore === 0 ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    0
                                  </button>
                                  {maxPts === 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleScoreChange(sub.id, q.id, 0.5, maxPts)}
                                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                                        currentQScore === 0.5 ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                      }`}
                                    >
                                      0.5
                                    </button>
                                  )}
                                  {maxPts > 1 && Array.from({ length: maxPts - 1 }).map((_, stepIdx) => {
                                    const stepVal = stepIdx + 1;
                                    return (
                                      <button
                                        key={stepVal}
                                        type="button"
                                        onClick={() => handleScoreChange(sub.id, q.id, stepVal, maxPts)}
                                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                                          currentQScore === stepVal ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                        }`}
                                      >
                                        {stepVal}
                                      </button>
                                    );
                                  })}
                                  <button
                                    type="button"
                                    onClick={() => handleScoreChange(sub.id, q.id, maxPts, maxPts)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                                      currentQScore === maxPts ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    كاملة ({maxPts})
                                  </button>
                                </div>

                                {isSubjectiveQ && (
                                  <input
                                    type="text"
                                    placeholder="ملاحظة للمخدوم (اختياري)..."
                                    value={draftNotes[sub.id]?.[q.id] || ''}
                                    onChange={(e) => handleNoteChange(sub.id, q.id, e.target.value)}
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] text-slate-800 font-medium focus:outline-none focus:border-maroon-800"
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* زر اعتماد ونشر النتيجة النهائية */}
                      {hasSubjectiveExam && (
                        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-emerald-200 rounded-2xl p-3.5">
                          <div className="text-xs font-black text-slate-800 flex items-center gap-2">
                            <Award className="w-4 h-4 text-emerald-700" />
                            <span>الدرجة النهائية للاعتماد: {liveTotal} من {totalScore} ({percent}%)</span>
                          </div>
                          <button
                            type="button"
                            disabled={approvingId === sub.id}
                            onClick={() => handleApproveSubmission(sub)}
                            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm cursor-pointer active:scale-95 disabled:opacity-60"
                          >
                            {approvingId === sub.id ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>جاري الاعتماد...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                <span>{sub.isApproved ? 'حفظ التعديلات وتحديث النتيجة' : 'اعتماد ونشر النتيجة للمخدوم'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-left shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
}
