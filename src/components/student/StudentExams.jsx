import React from 'react';
import { FileText, CheckCircle, Send, Calendar, Clock, Trophy, ArrowRight } from 'lucide-react';

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
  const activeQuestions = activeExam?.questions || [];
  const activeTotalScore = activeExam?.totalScore || activeQuestions.reduce((sum, q) => sum + (Number(q.points) || 1), 0) || 20;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm space-y-5 text-right font-cairo">
      <div>
        <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
          <Trophy className="w-5 h-5 text-maroon-800" />
          <span>المسابقات والامتحانات المتاحة ({getGradeTitle ? getGradeTitle(user?.grade) : 'المرحلة الدراسية'})</span>
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">مسابقات وأنشطة أسبوعية معينة من الخدام لمرحلتك الدراسية.</p>
      </div>

      {!activeExam ? (
        (!availableExams || availableExams.length === 0) ? (
          <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">لا توجد أي مسابقات أو امتحانات مجدولة لمرحلتك حالياً.</p>
            <p className="text-[11px] text-slate-400 mt-1">عند نشر الخدام لأي مسابقة ستظهر تفاصيلها هنا مباشرة.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(availableExams || []).map((exam) => {
              const isCompleted = completedExams && exam && completedExams[exam.id];
              const examQuestionsCount = exam.questions?.length || exam.questionsCount || 0;
              const totalScore = exam.totalScore || 20;

              return (
                <div
                  key={exam.id}
                  className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-300 transition-all"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-maroon-800 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                        {exam.subject || 'عام'}
                      </span>
                      <span className="text-xs text-slate-500">
                        {examQuestionsCount > 0 ? `${examQuestionsCount} أسئلة` : ''} • {exam.durationMinutes ? `${exam.durationMinutes} دقيقة` : 'وقت مفتوح'}
                      </span>
                      {exam.deadline && (
                        <span className="bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-amber-700" />
                          <span>ينتهي: {new Date(exam.deadline).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                      )}
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">{exam.title}</h4>
                  </div>

                  {isCompleted ? (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-xl font-black shrink-0 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>تم التسليم بنجاح ✓</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setActiveExam(exam);
                        setExamAnswers({});
                        setExamResult(null);
                      }}
                      className="w-full sm:w-auto bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-xs py-2.5 px-6 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                    >
                      بدء المسابقة 🚀
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Taking Exam Screen (Google Forms style) */
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="bg-maroon-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {activeExam.subject || 'عام'}
                </span>
                <span className="text-xs text-slate-500">
                  {activeQuestions.length} أسئلة
                </span>
              </div>
              <h4 className="font-black text-slate-900 text-base sm:text-lg">{activeExam.title}</h4>
            </div>

            <button 
              onClick={() => setActiveExam(null)} 
              className="text-xs font-bold text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-xl transition-colors"
            >
              إلغاء والعودة
            </button>
          </div>

          {examResult ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-3xl text-center space-y-3">
              <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
              <h4 className="text-lg font-black text-slate-900">تم تسليم إجاباتك بنجاح! 🎉</h4>
              <div className="text-sm text-slate-700 font-bold">
                تم حفظ وتسليم الامتحان بنجاح ✓
              </div>
              <p className="text-xs text-emerald-800 font-bold">
                تم رصد تسليمك في سجلات الخدمة المباركة.
              </p>
              <button 
                onClick={() => setActiveExam(null)} 
                className="mt-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold py-2 px-6 rounded-xl transition-all shadow-2xs"
              >
                العودة لقائمة المسابقات
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {(activeQuestions || []).map((q, idx) => (
                <div key={q?.id || `q_${idx}`} className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl space-y-3 text-xs">
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

                  {/* True / False Mobile-First Big Buttons */}
                  {q.type === 'true_false' && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setExamAnswers({ ...examAnswers, [q.id]: 'صح' })}
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
                        onClick={() => setExamAnswers({ ...examAnswers, [q.id]: 'خطأ' })}
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

                  {/* Multiple Choice Options */}
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
                            onChange={() => setExamAnswers({ ...examAnswers, [q.id]: opt })}
                            className="accent-maroon-800 w-4 h-4 cursor-pointer"
                          />
                          <span className="text-xs font-bold">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Essay Question */}
                  {q.type === 'essay' && (
                    <textarea
                      rows={3}
                      placeholder="اكتب إجابتك هنا بوضوح..."
                      value={examAnswers[q.id] || ''}
                      onChange={(e) => setExamAnswers({ ...examAnswers, [q.id]: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-bold focus:outline-none focus:border-maroon-800"
                    />
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() => handleSubmitExam(activeExam)}
                className="w-full bg-maroon-800 hover:bg-maroon-700 text-white font-black py-3.5 px-4 rounded-2xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>تسليم الإجابات النهائية وتأكيد الدرجات</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
