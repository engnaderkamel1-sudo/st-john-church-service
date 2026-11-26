import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle,
  Send,
  Calendar,
  Clock,
  Trophy,
  Eye,
  ChevronDown,
  ChevronUp,
  Save,
  AlertCircle,
  Award
} from 'lucide-react';
import {
  getExamScheduleState,
  getRecordedExamStartMs,
  recordExamStartIfNeeded,
  formatCairoDateTime
} from '../../utils/examSchedule';
import { formatExamAnswerValue } from '../../services/geminiService';

export default function StudentExams({
  user,
  getGradeTitle,
  availableExams = [],
  completedExams = {},
  activeExam,
  setActiveExam,
  examAnswers,
  setExamAnswers,
  examResult,
  setExamResult,
  handleSubmitExam
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [reviewingExamId, setReviewingExamId] = useState(null);

  // تحديث الوقت كل 15 ثانية لفتح وإغلاق الامتحانات المجدولة تلقائياً
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const getDraftKey = (examId) => `st_john_exam_draft_${user?.id || 'guest'}_${examId}`;

  const saveDraftAnswers = (examId, nextAnswers) => {
    try {
      if (!nextAnswers || Object.keys(nextAnswers).length === 0) {
        localStorage.removeItem(getDraftKey(examId));
      } else {
        localStorage.setItem(getDraftKey(examId), JSON.stringify(nextAnswers));
      }
    } catch {}
  };

  const loadDraftAnswers = (examId) => {
    try {
      const saved = localStorage.getItem(getDraftKey(examId));
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  };

  const handleOpenExam = (exam) => {
    const startedMs = recordExamStartIfNeeded(user?.id, exam.id, Date.now());
    const sched = getExamScheduleState(exam, Date.now(), startedMs);
    if (!sched.canStart && !sched.canSubmit) {
      alert('عفواً، هذا الامتحان غير متاح حالياً.');
      return;
    }
    const draft = loadDraftAnswers(exam.id);
    setActiveExam(exam);
    setExamAnswers(draft);
    setExamResult(null);
  };

  const handleUpdateAnswer = (qId, value) => {
    const next = { ...examAnswers, [qId]: value };
    setExamAnswers(next);
    if (activeExam?.id) {
      saveDraftAnswers(activeExam.id, next);
    }
  };

  const handleUpdateBlankAnswer = (qId, blankIdx, value) => {
    const prevObj = examAnswers[qId] && typeof examAnswers[qId] === 'object' && !Array.isArray(examAnswers[qId])
      ? examAnswers[qId]
      : {};
    const nextBlankObj = { ...prevObj, [`blank_${blankIdx}`]: value };
    handleUpdateAnswer(qId, nextBlankObj);
  };

  // تصفية الامتحانات المرئية حسب الجدولة التلقائية
  const visibleExams = (availableExams || []).filter((exam) => {
    if (!exam) return false;
    if (completedExams && completedExams[exam.id]) return true;
    const startedMs = getRecordedExamStartMs(user?.id, exam.id);
    const sched = getExamScheduleState(exam, nowMs, startedMs);
    return sched.isVisibleToStudent;
  });

  const activeQuestions = activeExam?.questions || [];
  const activeTotalScore = activeExam?.totalScore || activeQuestions.reduce((sum, q) => sum + (Number(q.points) || 1), 0) || 20;
  const activeSchedule = activeExam
    ? getExamScheduleState(activeExam, nowMs, getRecordedExamStartMs(user?.id, activeExam.id))
    : null;

  const isQuestionAnswered = (q) => {
    const val = examAnswers?.[q.id];
    if (q.type === 'fill_blank' && (q.blanksCount || 1) > 1) {
      if (!val || typeof val !== 'object') return false;
      for (let i = 0; i < (q.blanksCount || 1); i++) {
        if (!String(val[`blank_${i}`] || '').trim()) return false;
      }
      return true;
    }
    return Boolean(formatExamAnswerValue(val));
  };

  const answeredCount = activeQuestions.filter(isQuestionAnswered).length;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm space-y-5 text-right font-cairo">
      <div>
        <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
          <Trophy className="w-5 h-5 text-maroon-800" />
          <span>الامتحانات الرسمية ({getGradeTitle ? getGradeTitle(user?.grade) : 'المرحلة الدراسية'})</span>
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">الامتحانات الرسمية المقررة للمواد الدراسية في مرحلتك.</p>
      </div>

      {!activeExam ? (
        visibleExams.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">لا توجد امتحانات متاحة لمرحلتك حالياً.</p>
            <p className="text-[11px] text-slate-400 mt-1">عند إتاحة أي امتحان رسمي في موعده سيظهر لك هنا مباشرة.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleExams.map((exam) => {
              const sub = completedExams ? completedExams[exam.id] : null;
              const isCompleted = Boolean(sub);
              const isApproved = Boolean(
                sub && (
                  sub.isApproved === true ||
                  (!sub.requiresApproval && sub.gradingStatus !== 'pending_ai' && sub.gradingStatus !== 'ai_graded')
                )
              );
              const startedMs = getRecordedExamStartMs(user?.id, exam.id);
              const sched = getExamScheduleState(exam, nowMs, startedMs);
              const examQuestionsCount = exam.questions?.length || exam.questionsCount || 0;
              const totalScore = exam.totalScore || 20;
              const finalScore = sub ? (sub.finalScore ?? sub.autoScore ?? 0) : 0;
              const percent = totalScore > 0 ? Math.round((finalScore / totalScore) * 100) : 0;
              const isReviewOpen = reviewingExamId === exam.id;

              return (
                <div
                  key={exam.id}
                  className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl space-y-3 hover:border-slate-300 transition-all"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-maroon-800 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                          {exam.subject || 'عام'}
                        </span>
                        <span className="text-xs text-slate-500 font-bold">
                          {examQuestionsCount > 0 ? `${examQuestionsCount} أسئلة` : ''}
                          {!exam.hideDuration && exam.durationMinutes > 0 ? ` • ${exam.durationMinutes} دقيقة` : ''}
                          {` • الدرجة: ${totalScore}`}
                        </span>
                        {exam.closeAt && !isCompleted && (
                          <span className="bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-amber-700" />
                            <span>يغلق: {formatCairoDateTime(exam.closeAt)}</span>
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">{exam.title}</h4>
                    </div>

                    {isCompleted ? (
                      isApproved ? (
                        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
                          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs px-3.5 py-2 rounded-xl font-black flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-emerald-600" />
                            <span>النتيجة: {finalScore} / {totalScore} ({percent}%)</span>
                          </div>
                          {exam.questions && exam.questions.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setReviewingExamId(isReviewOpen ? null : exam.id)}
                              className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
                            >
                              <Eye className="w-3.5 h-3.5 text-maroon-800" />
                              <span>{isReviewOpen ? 'إخفاء التصحيح' : 'عرض إجاباتي والتصحيح'}</span>
                              {isReviewOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-4 py-2.5 rounded-xl font-black shrink-0 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <span>تم التسليم ✓ — بانتظار المراجعة والاعتماد</span>
                        </div>
                      )
                    ) : sched.canStart || sched.canSubmit ? (
                      <button
                        type="button"
                        onClick={() => handleOpenExam(exam)}
                        className="w-full sm:w-auto bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-xs py-2.5 px-6 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                      >
                        {sched.inGrace ? 'استكمال وتسليم الامتحان (فترة السماح) ⏳' : 'بدء الامتحان 🚀'}
                      </button>
                    ) : sched.phase === 'before_open' ? (
                      <div className="bg-slate-100 border border-slate-200 text-slate-600 text-xs px-4 py-2 rounded-xl font-bold shrink-0">
                        يفتح: {formatCairoDateTime(exam.openAt)}
                      </div>
                    ) : (
                      <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-4 py-2 rounded-xl font-bold shrink-0">
                        انتهى موعد الامتحان
                      </div>
                    )}
                  </div>

                  {/* مراجعة إجابات المخدوم وتصحيح الخادم بعد الاعتماد */}
                  {isCompleted && isApproved && isReviewOpen && exam.questions && (
                    <div className="pt-3 border-t border-slate-200 space-y-2.5 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between text-xs font-black text-slate-700">
                        <span>تفاصيل إجاباتك وتصحيح الأسئلة:</span>
                        <span className="text-emerald-700">معتمد من: {sub.approvedBy || 'الخادم المسؤول'}</span>
                      </div>

                      {exam.questions.map((q, qIdx) => {
                        const maxPts = Number(q.points) || 1;
                        const studentAnsText = formatExamAnswerValue(sub.answers?.[q.id]);
                        const qScore = sub.questionScores?.[q.id] ?? (
                          (q.type === 'mcq' || q.type === 'multiple_choice' || q.type === 'true_false')
                            ? (studentAnsText === String(q.correctAnswer || '').trim() ? maxPts : 0)
                            : 0
                        );
                        const isFull = qScore >= maxPts;
                        const isPartial = qScore > 0 && qScore < maxPts;
                        const feedback = sub.servantNotes?.[q.id] || sub.aiEvaluation?.[q.id]?.feedback;

                        return (
                          <div key={q.id || `rev_${qIdx}`} className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-1.5 text-xs">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-black text-slate-900 leading-relaxed">
                                {qIdx + 1}. {q.questionText}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full font-black text-[11px] shrink-0 ${
                                isFull
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : isPartial
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}>
                                {qScore} / {maxPts}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-700">
                              <span className="font-bold text-slate-500">إجابتك: </span>
                              <span className="font-bold text-slate-900">{studentAnsText || 'لم تُجب'}</span>
                            </div>

                            <div className="text-[11px] text-emerald-800 bg-emerald-50/70 border border-emerald-100 rounded-xl px-2.5 py-1.5">
                              <span className="font-extrabold">الإجابة النموذجية: </span>
                              <span>{q.correctAnswer}</span>
                            </div>

                            {feedback && (
                              <div className="text-[11px] text-indigo-900 bg-indigo-50/70 border border-indigo-100 rounded-xl px-2.5 py-1.5">
                                <span className="font-extrabold">ملاحظة التصحيح: </span>
                                <span>{feedback}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* شاشة أداء الامتحان */
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md -mx-4 px-4 sm:-mx-6 sm:px-6 pt-2 pb-3 border-b border-slate-200 rounded-t-3xl space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="bg-maroon-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {activeExam.subject || 'عام'}
                  </span>
                  <span className="text-xs text-slate-500 font-bold">
                    تمت الإجابة: {answeredCount} من {activeQuestions.length} • الدرجة الكلية: {activeTotalScore}
                  </span>
                </div>
                <h4 className="font-black text-slate-900 text-sm sm:text-base truncate">{activeExam.title}</h4>
              </div>

              {!examResult && (
                <button
                  type="button"
                  onClick={() => setActiveExam(null)}
                  className="text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-emerald-700" />
                  <span>حفظ وخروج</span>
                </button>
              )}
            </div>

            {!examResult && (
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${activeQuestions.length > 0 ? (answeredCount / activeQuestions.length) * 100 : 0}%` }}
                />
              </div>
            )}
          </div>

          {activeSchedule?.inGrace && !examResult && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-bold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                انتهى الوقت الأساسي للامتحان، ومتاح لك حالياً فترة سماح لمدة {activeExam.graceMinutes} دقيقة لاستكمال التسليم قبل الساعة {formatCairoDateTime(activeSchedule.graceEndAtMs)}.
              </span>
            </div>
          )}

          {examResult ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-3xl text-center space-y-3">
              <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
              <h4 className="text-lg font-black text-slate-900">تم استلام إجاباتك بنجاح ✓</h4>
              {examResult.requiresApproval ? (
                <div className="space-y-2 max-w-md mx-auto">
                  <p className="text-xs sm:text-sm text-amber-950 font-bold bg-amber-50 border border-amber-200 p-3 rounded-2xl leading-relaxed">
                    الامتحان قيد المراجعة والاعتماد من الخدام حالياً. سيصلك إشعار فوري فور اعتماد وإعلان النتيجة.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-emerald-800 font-bold">
                  تم رصد تسليمك في سجلات الخدمة المباركة.
                </p>
              )}
              <button
                type="button"
                onClick={() => setActiveExam(null)}
                className="mt-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold py-2.5 px-6 rounded-xl transition-all shadow-2xs cursor-pointer"
              >
                العودة لقائمة الامتحانات
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {(activeQuestions || []).map((q, idx) => {
                const prevSection = idx > 0 ? activeQuestions[idx - 1]?.section : null;
                const showSectionHeader = Boolean(q.section && q.section !== prevSection);
                const blanksCount = Number(q.blanksCount) || 1;
                const qPoints = Number(q.points) || 1;

                return (
                  <React.Fragment key={q?.id || `q_${idx}`}>
                    {showSectionHeader && (
                      <div className="pt-2 pb-1 px-1">
                        <h5 className="font-black text-maroon-900 text-sm border-r-4 border-maroon-800 pr-2.5">
                          {q.section}
                        </h5>
                      </div>
                    )}

                    <div className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl space-y-3 text-xs">
                      <div className="flex items-center justify-between text-slate-500 font-bold gap-2">
                        <span className="font-extrabold text-slate-900 text-xs">
                          السؤال {idx + 1}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                            {q.type === 'true_false'
                              ? 'صح أو خطأ'
                              : q.type === 'fill_blank'
                              ? 'أكمل الفراغ'
                              : q.type === 'essay'
                              ? 'سؤال مقالي'
                              : 'اختيار متعدد'}
                          </span>
                          <span className="text-[10px] bg-maroon-50 text-maroon-900 border border-maroon-200 px-2 py-0.5 rounded-full font-black">
                            {qPoints === 1 ? 'درجة واحدة' : qPoints === 2 ? 'درجتان' : `${qPoints} درجات`}
                          </span>
                        </div>
                      </div>

                      <p className="font-black text-slate-900 leading-relaxed text-sm sm:text-base">
                        {q.questionText}
                      </p>

                      {/* صح أو خطأ */}
                      {q.type === 'true_false' && (
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateAnswer(q.id, 'صح')}
                            className={`p-3.5 rounded-2xl font-black text-sm border transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                              examAnswers[q.id] === 'صح'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300'
                                : 'bg-white border-slate-200 text-emerald-800 hover:bg-emerald-50'
                            }`}
                          >
                            <span>✓ صـح</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateAnswer(q.id, 'خطأ')}
                            className={`p-3.5 rounded-2xl font-black text-sm border transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                              examAnswers[q.id] === 'خطأ'
                                ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-300'
                                : 'bg-white border-slate-200 text-rose-800 hover:bg-rose-50'
                            }`}
                          >
                            <span>✗ خـطـأ</span>
                          </button>
                        </div>
                      )}

                      {/* اختيار متعدد */}
                      {(q.type === 'mcq' || q.type === 'multiple_choice') && q.options && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt) => (
                            <label
                              key={opt}
                              className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                                examAnswers[q.id] === opt
                                  ? 'bg-maroon-50 border-maroon-800 text-maroon-900 font-bold shadow-2xs'
                                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name={q.id}
                                value={opt}
                                checked={examAnswers[q.id] === opt}
                                onChange={() => handleUpdateAnswer(q.id, opt)}
                                className="accent-maroon-800 w-4 h-4 cursor-pointer"
                              />
                              <span className="text-xs font-bold">{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* أكمل الفراغات */}
                      {q.type === 'fill_blank' && (
                        blanksCount > 1 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                            {Array.from({ length: blanksCount }).map((_, bIdx) => (
                              <div key={bIdx} className="space-y-1">
                                <label className="block text-[11px] font-bold text-slate-600">
                                  {(q.blankLabels && q.blankLabels[bIdx]) || `الفراغ ${bIdx + 1}`}
                                </label>
                                <input
                                  type="text"
                                  placeholder="اكتب الكلمة هنا..."
                                  value={(examAnswers[q.id] && examAnswers[q.id][`blank_${bIdx}`]) || ''}
                                  onChange={(e) => handleUpdateBlankAnswer(q.id, bIdx, e.target.value)}
                                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-maroon-800"
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <input
                            type="text"
                            placeholder="اكتب الإجابة المختصرة هنا..."
                            value={typeof examAnswers[q.id] === 'string' ? examAnswers[q.id] : ''}
                            onChange={(e) => handleUpdateAnswer(q.id, e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-maroon-800"
                          />
                        )
                      )}

                      {/* سؤال مقالي */}
                      {q.type === 'essay' && (
                        <textarea
                          rows={4}
                          placeholder="اكتب إجابتك هنا بوضوح..."
                          value={examAnswers[q.id] || ''}
                          onChange={(e) => handleUpdateAnswer(q.id, e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 font-bold focus:outline-none focus:border-maroon-800 leading-relaxed"
                        />
                      )}
                    </div>
                  </React.Fragment>
                );
              })}

              <button
                type="button"
                onClick={() => handleSubmitExam(activeExam)}
                className="w-full bg-maroon-800 hover:bg-maroon-700 text-white font-black py-3.5 px-4 rounded-2xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>تسليم الإجابات النهائية</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
