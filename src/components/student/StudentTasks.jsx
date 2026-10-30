import React, { useState } from 'react';
import { 
  CheckSquare, CheckCircle, Clock, Calendar, Send, 
  HelpCircle, AlertCircle, BookOpen, Trophy, ArrowRight, Eye, ChevronDown, ChevronUp 
} from 'lucide-react';

export default function StudentTasks({
  user,
  getGradeTitle,
  allQuizzes = [],
  completedTasks = {},
  onSubmitTask
}) {
  const [subTab, setSubTab] = useState('current'); // 'current' | 'archive'
  const [activeTask, setActiveTask] = useState(null);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [taskAnswers, setTaskAnswers] = useState({});
  const [taskResult, setTaskResult] = useState(null);
  const [viewingAnswersTaskId, setViewingAnswersTaskId] = useState(null);

  const now = new Date();

  const getQuizTime = (q) => {
    if (q.createdAt?.seconds) return q.createdAt.seconds * 1000;
    if (q.createdAt instanceof Date) return q.createdAt.getTime();
    if (typeof q.createdAt === 'string') {
      const parsed = Date.parse(q.createdAt);
      if (!isNaN(parsed)) return parsed;
    }
    if (q.publishedAt?.seconds) return q.publishedAt.seconds * 1000;
    if (q.id === 'quiz_genesis_22_28') return 1730270000000;
    if (q.id === 'quiz_genesis_15_21') return 1729000000000;
    return 0;
  };

  // Separate tasks into Active (Current) vs Past (Archive) - sorted newest first
  const activeTasksList = (allQuizzes || []).filter(q => {
    if (!q) return false;
    const isCompleted = Boolean(completedTasks && completedTasks[q.id]);
    if (isCompleted) return false;
    if (q.status !== 'active') return false;
    if (q.deadline && new Date(q.deadline) < now) return false;
    return true;
  }).sort((a, b) => getQuizTime(b) - getQuizTime(a));

  const archiveTasksList = (allQuizzes || []).filter(q => {
    if (!q) return false;
    const isCompleted = Boolean(completedTasks && completedTasks[q.id]);
    if (isCompleted) return true;
    if (q.status === 'closed' || q.status === 'draft') return true;
    if (q.deadline && new Date(q.deadline) < now) return true;
    return false;
  }).sort((a, b) => getQuizTime(b) - getQuizTime(a));

  const handleStartTask = (task, practice = false) => {
    setActiveTask(task);
    setIsPracticeMode(practice);
    setTaskAnswers({});
    setTaskResult(null);
  };

  const handleFinishSubmit = async () => {
    if (!activeTask) return;
    const questions = activeTask.questions || [];
    let autoScore = 0;
    questions.forEach(q => {
      if ((q.type === 'mcq' || q.type === 'true_false') && taskAnswers[q.id] === q.correctAnswer) {
        autoScore += (Number(q.points) || 1);
      }
    });

    const totalScore = activeTask.totalScore || questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0) || 20;

    const result = {
      taskId: activeTask.id,
      taskTitle: activeTask.title,
      autoScore,
      totalScore,
      answers: taskAnswers,
      isPractice: isPracticeMode
    };

    setTaskResult(result);

    if (onSubmitTask) {
      await onSubmitTask(activeTask, taskAnswers, autoScore, totalScore, isPracticeMode);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm space-y-5 text-right font-cairo">
      {/* Header */}
      <div>
        <h3 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-maroon-800" />
          <span>التاسكات والمسابقات الأسبوعية ({getGradeTitle ? getGradeTitle(user?.grade) : (user?.grade || 'المرحلة الدراسية')})</span>
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">حل مسابقات وتاسكات الخدمة للمتابعة الأسبوعية والتطبيق الروحي والنمو في كلمة الله.</p>
      </div>

      {!activeTask ? (
        <div className="space-y-4">
          {/* Sub-Tabs: Current vs Archive */}
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <button
              type="button"
              onClick={() => setSubTab('current')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                subTab === 'current'
                  ? 'bg-maroon-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>المطلوب حالياً</span>
              {activeTasksList.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  subTab === 'current' ? 'bg-gold-400 text-maroon-950' : 'bg-slate-200 text-slate-700'
                }`}>
                  {activeTasksList.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSubTab('archive')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                subTab === 'archive'
                  ? 'bg-maroon-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>سجل الأسابيع السابقة والأرشيف</span>
              {archiveTasksList.length > 0 && (
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full font-bold">
                  {archiveTasksList.length}
                </span>
              )}
            </button>
          </div>

          {/* Current Tasks Tab */}
          {subTab === 'current' && (
            activeTasksList.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
                <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">لا توجد تاسكات مطلوبة منك حالياً.</p>
                <p className="text-[11px] text-slate-400 mt-1">عند نشر الخدام لمسابقة الأسبوع ستظهر لك هنا مباشرة.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeTasksList.map((task) => (
                  <div
                    key={task.id}
                    className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-300 transition-all"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-maroon-800 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                          {task.subject || 'عام'}
                        </span>
                        <span className="text-xs text-slate-500 font-bold">
                          {task.questions?.length || 0} أسئلة
                        </span>
                        {task.deadline && (
                          <span className="bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-amber-700" />
                            <span>ينتهي: {new Date(task.deadline).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </span>
                        )}
                      </div>
                      <h4 className="font-black text-slate-900 text-sm sm:text-base">{task.title}</h4>
                      {task.createdAt && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium pt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>تاريخ النشر: {new Date(task.createdAt?.seconds ? task.createdAt.seconds * 1000 : task.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartTask(task, false)}
                      className="w-full sm:w-auto bg-maroon-800 hover:bg-maroon-700 text-white font-black text-xs py-2.5 px-6 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                    >
                      بدء حل التاسك 🚀
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Archive / Past Tasks Tab */}
          {subTab === 'archive' && (
            archiveTasksList.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">لا توجد تاسكات سابقة في الأرشيف حتى الآن.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {archiveTasksList.map((task) => {
                  const completed = completedTasks[task.id];
                  const totalScore = task.totalScore || 20;
                  const isViewingAnswers = viewingAnswersTaskId === task.id;

                  return (
                    <div
                      key={task.id}
                      className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              {task.subject || 'عام'}
                            </span>
                            <span className="text-xs text-slate-500 font-bold">
                              {task.questions?.length || 0} أسئلة
                            </span>
                          </div>
                          <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">{task.title}</h4>
                          {task.createdAt && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                              <Clock className="w-3 h-3" />
                              <span>تاريخ النشر: {new Date(task.createdAt?.seconds ? task.createdAt.seconds * 1000 : task.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}</span>
                            </div>
                          )}
                        </div>

                        {completed ? (
                          <div className="flex items-center gap-2">
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-1.5 rounded-xl font-black flex items-center gap-1.5">
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                              <span>تم التسليم بنجاح ✓</span>
                            </div>
                            {completed.answers && (
                              <button
                                type="button"
                                onClick={() => setViewingAnswersTaskId(isViewingAnswers ? null : task.id)}
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors"
                                title="مراجعة إجاباتي"
                              >
                                {isViewingAnswers ? <ChevronUp className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                            <span className="bg-amber-50 text-amber-900 border border-amber-200 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-700" />
                              <span>انتهى الموعد الرسمي (متاح للتدريب)</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleStartTask(task, true)}
                              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>📖 حل تدريبي للمراجعة الذاتية</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Expandable answers review for completed task */}
                      {isViewingAnswers && completed && task.questions && (
                        <div className="pt-3 border-t border-slate-200 space-y-2 text-xs animate-in fade-in">
                          <span className="text-[11px] font-black text-slate-700 block">إجاباتك المسجلة:</span>
                          {task.questions.map((q, qIdx) => {
                            const studentAns = completed.answers?.[q.id];
                            const isCorrect = studentAns === q.correctAnswer;
                            return (
                              <div key={q.id} className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1">
                                <div className="flex items-center justify-between font-bold">
                                  <span>س {qIdx + 1}: {q.questionText}</span>
                                  <span className={isCorrect ? 'text-emerald-700' : 'text-rose-700'}>
                                    {isCorrect ? '✓ صحيح' : '✗ غير صحيح'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-600 flex items-center gap-3">
                                  <span>إجابتك: <strong>{studentAns || 'لم يجب'}</strong></span>
                                  <span>الإجابة النموذجية: <strong className="text-emerald-800">{q.correctAnswer}</strong></span>
                                </div>
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
          )}
        </div>
      ) : (
        /* Taking Task Form Screen */
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="bg-maroon-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {activeTask.subject || 'عام'}
                </span>
                {isPracticeMode && (
                  <span className="bg-indigo-100 text-indigo-900 border border-indigo-200 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                    وضع المراجعة والتدريب الذاتي 📖
                  </span>
                )}
              </div>
              <h4 className="font-black text-slate-900 text-base sm:text-lg">{activeTask.title}</h4>
            </div>

            <button 
              type="button"
              onClick={() => setActiveTask(null)} 
              className="text-xs font-bold text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              إلغاء والعودة
            </button>
          </div>

          {taskResult ? (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl text-center space-y-3">
              <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
              <h4 className="text-lg font-black text-slate-900">
                {isPracticeMode ? 'أحسنت! أتممت المراجعة الذاتية بنجاح 👏' : 'تم تسليم التاسك الرسمي بنجاح! 🎉'}
              </h4>
              <div className="text-sm text-slate-700 font-bold">
                تم حفظ وتسليم إجاباتك بنجاح ✓
              </div>
              {isPracticeMode ? (
                <p className="text-xs text-indigo-800 font-bold bg-indigo-50 border border-indigo-200 p-2.5 rounded-xl max-w-md mx-auto">
                  💡 تم حفظ إجاباتك لأغراض المراجعة والتعلم الذاتي.
                </p>
              ) : (
                <p className="text-xs text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl max-w-md mx-auto">
                  تم رصد وحفظ تسليمك بنجاح في سجلات الخدمة المباركة.
                </p>
              )}
              <button 
                type="button"
                onClick={() => setActiveTask(null)} 
                className="mt-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold py-2.5 px-6 rounded-xl transition-all shadow-2xs cursor-pointer"
              >
                العودة للتاسكات
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {(activeTask.questions || []).map((q, idx) => (
                <div key={q.id} className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl space-y-3 text-xs">
                  <div className="flex items-center justify-between text-slate-500 font-bold">
                    <span className="font-extrabold text-slate-900 text-xs">
                      السؤال {idx + 1}
                    </span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                      {q.type === 'true_false' ? 'صح أو خطأ' : q.type === 'essay' ? 'سؤال مقالي' : 'اختيار متعدد'}
                    </span>
                  </div>

                  <p className="font-black text-slate-900 leading-relaxed text-sm sm:text-base">
                    {q.questionText}
                  </p>

                  {/* True / False Big Buttons */}
                  {q.type === 'true_false' && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setTaskAnswers({ ...taskAnswers, [q.id]: 'صح' })}
                        className={`p-3.5 rounded-2xl font-black text-sm border transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                          taskAnswers[q.id] === 'صح'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300'
                            : 'bg-white border-slate-200 text-emerald-800 hover:bg-emerald-50'
                        }`}
                      >
                        <span>✓ صـح</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTaskAnswers({ ...taskAnswers, [q.id]: 'خطأ' })}
                        className={`p-3.5 rounded-2xl font-black text-sm border transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                          taskAnswers[q.id] === 'خطأ'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-300'
                            : 'bg-white border-slate-200 text-rose-800 hover:bg-rose-50'
                        }`}
                      >
                        <span>✗ خـطـأ</span>
                      </button>
                    </div>
                  )}

                  {/* MCQ Options */}
                  {q.type === 'mcq' && q.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt) => (
                        <label
                          key={opt}
                          className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                            taskAnswers[q.id] === opt 
                              ? 'bg-maroon-50 border-maroon-800 text-maroon-900 font-bold shadow-2xs' 
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            value={opt}
                            checked={taskAnswers[q.id] === opt}
                            onChange={() => setTaskAnswers({ ...taskAnswers, [q.id]: opt })}
                            className="accent-maroon-800 w-4 h-4 cursor-pointer"
                          />
                          <span className="text-xs font-bold">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Essay */}
                  {q.type === 'essay' && (
                    <textarea
                      rows={3}
                      placeholder="اكتب إجابتك هنا..."
                      value={taskAnswers[q.id] || ''}
                      onChange={(e) => setTaskAnswers({ ...taskAnswers, [q.id]: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-bold focus:outline-none focus:border-maroon-800"
                    />
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={handleFinishSubmit}
                className="w-full bg-maroon-800 hover:bg-maroon-700 text-white font-black py-3.5 px-4 rounded-2xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{isPracticeMode ? 'إرسال للتقييم الذاتي ومعرفة النتيجة' : 'تسليم التاسك الرسمي وتأكيد الدرجات'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
