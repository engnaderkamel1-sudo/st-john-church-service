import React from 'react';
import { FileText, CheckCircle, Send } from 'lucide-react';

export default function StudentExams({
  user,
  getGradeTitle,
  availableExams,
  completedExams,
  activeExam,
  setActiveExam,
  examAnswers,
  setExamAnswers,
  examResult,
  setExamResult,
  handleSubmitExam
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5 text-right">
      <div>
        <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
          <FileText className="w-5 h-5 text-maroon-800" />
          الامتحانات المتاحة ({getGradeTitle(user.grade)})
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">امتحانات معينة من الخدام لمرحلتك الدراسية.</p>
      </div>

      {!activeExam ? (
        availableExams.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">لا توجد أي امتحانات مجدولة لمرحلتك حالياً.</p>
            <p className="text-[11px] text-slate-400 mt-1">عند نشر الخدام لأي اختبار ستظهر تفاصيله هنا مباشرة.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {availableExams.map((exam) => {
              const isCompleted = completedExams[exam.id];
              return (
                <div
                  key={exam.id}
                  className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-maroon-800 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                        {exam.subject}
                      </span>
                      <span className="text-xs text-slate-500">{exam.durationMinutes} دقيقة • {exam.totalScore} درجة</span>
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">{exam.title}</h4>
                  </div>

                  {isCompleted ? (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2 rounded-xl font-bold">
                      تم التسليم (الموضوعي: {isCompleted.autoScore}/20)
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setActiveExam(exam);
                        setExamAnswers({});
                        setExamResult(null);
                      }}
                      className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-xs py-2.5 px-5 rounded-xl transition-all shadow"
                    >
                      بدء الامتحان
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Taking Exam Screen */
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="font-extrabold text-slate-900 text-base">{activeExam.title}</h4>
            <button onClick={() => setActiveExam(null)} className="text-xs text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-xl">
              إلغاء والعودة
            </button>
          </div>

          {examResult ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
              <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
              <h4 className="text-base font-extrabold text-slate-900">تم تسليم إجاباتك بنجاح!</h4>
              <div className="text-xs text-slate-600">
                درجة الأسئلة الموضوعية: <strong className="text-maroon-800 text-sm">{examResult.autoScore} / 20</strong> (المقالي قيد مراجعة الخادم)
              </div>
              <button onClick={() => setActiveExam(null)} className="mt-3 bg-white border border-slate-300 text-slate-700 text-xs font-bold py-2 px-5 rounded-xl">
                العودة لصفحة الامتحانات
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {activeExam.questions.map((q, idx) => (
                <div key={q.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-500 font-bold">
                    <span>السؤال {idx + 1} ({q.points} درجات)</span>
                    <span>{q.type === 'essay' ? 'سؤال مقالي' : 'تصحيح تلقائي'}</span>
                  </div>
                  <p className="font-bold text-slate-800 leading-relaxed text-sm">{q.questionText}</p>

                  {q.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt) => (
                        <label
                          key={opt}
                          className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                            examAnswers[q.id] === opt ? 'bg-maroon-50 border-maroon-800 text-maroon-900 font-bold' : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            value={opt}
                            checked={examAnswers[q.id] === opt}
                            onChange={() => setExamAnswers({ ...examAnswers, [q.id]: opt })}
                            className="accent-maroon-800"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {q.type === 'essay' && (
                    <textarea
                      rows={3}
                      placeholder="اكتب إجابتك هنا بوضوح لتصحيحها من قبل الخادم..."
                      value={examAnswers[q.id] || ''}
                      onChange={(e) => setExamAnswers({ ...examAnswers, [q.id]: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-maroon-800"
                    />
                  )}
                </div>
              ))}

              <button
                onClick={() => handleSubmitExam(activeExam)}
                className="w-full bg-maroon-800 hover:bg-maroon-700 text-white font-bold py-3 px-4 rounded-xl text-xs shadow flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>تسليم الاختبار النهائي</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
