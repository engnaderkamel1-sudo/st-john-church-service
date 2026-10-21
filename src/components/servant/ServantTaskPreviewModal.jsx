import React from 'react';
import { X, Trophy, CheckCircle, Clock, Calendar, Edit3, HelpCircle, BookOpen, Award } from 'lucide-react';

export default function ServantTaskPreviewModal({
  isOpen,
  onClose,
  exam,
  onEditQuiz
}) {
  if (!isOpen || !exam) return null;

  const questions = exam.questions || [];
  const totalPoints = exam.totalScore || questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0) || 20;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs font-cairo">
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-l from-maroon-900 via-maroon-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-gold-400 text-maroon-950 font-black text-[10px]">
                {exam.subject || 'عام'}
              </span>
              <span className="text-[11px] text-amber-200 font-bold">
                {questions.length} أسئلة • الدرجة الكلية: {totalPoints} نقطة
              </span>
              {exam.durationMinutes > 0 ? (
                <span className="text-[11px] text-amber-100 flex items-center gap-1 font-bold">
                  <Clock className="w-3 h-3 text-gold-300" />
                  <span>{exam.durationMinutes} دقيقة</span>
                </span>
              ) : (
                <span className="text-[11px] text-amber-200/90 font-bold">
                  وقت مفتوح
                </span>
              )}
            </div>
            <h3 className="font-black text-sm sm:text-base text-white truncate">
              {exam.title}
            </h3>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs">
            <span className="text-amber-900 font-bold">
              معاينة خاصة بالخادم: تظهر الإجابات النموذجية الصحيحة مظللة باللون الأخضر مع علامة ✓.
            </span>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onEditQuiz) onEditQuiz(exam);
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold shrink-0 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>تعديل الأسئلة</span>
            </button>
          </div>

          {questions.length === 0 ? (
            <div className="text-center py-10 bg-white border border-dashed border-slate-200 rounded-2xl p-6">
              <p className="text-xs font-bold text-slate-500">لا توجد أسئلة مضافة في هذه المسابقة بعد.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {questions.map((q, idx) => {
                const isTrueFalse = q.type === 'true_false';
                const options = q.options || (isTrueFalse ? ['صح', 'خطأ'] : []);

                return (
                  <div 
                    key={q.id || `q_${idx}`} 
                    className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3"
                  >
                    {/* Question Header */}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-maroon-100 text-maroon-900 font-black text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-[11px] text-slate-500">
                          {isTrueFalse ? 'صح أو خطأ' : 'اختيار من متعدد'}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                        {q.points || 2} درجات
                      </span>
                    </div>

                    {/* Question Text */}
                    <p className="font-black text-slate-900 text-xs sm:text-sm leading-relaxed">
                      {q.questionText}
                    </p>

                    {/* Options Preview */}
                    <div className={`grid gap-2 pt-1 ${isTrueFalse ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {options.map((opt, oIdx) => {
                        const isCorrect = String(q.correctAnswer).trim() === String(opt).trim();

                        return (
                          <div
                            key={oIdx}
                            className={`p-2.5 sm:p-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                              isCorrect
                                ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-black ring-1 ring-emerald-300'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span>{opt}</span>
                            {isCorrect && (
                              <span className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>إجابة صحيحة</span>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Optional Explanation */}
                    {q.explanation && (
                      <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-1.5">
                        <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <span><strong>توضيح الإجابة:</strong> {q.explanation}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
          >
            إغلاق المعاينة
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              if (onEditQuiz) onEditQuiz(exam);
            }}
            className="px-4 py-2 rounded-xl bg-maroon-800 hover:bg-maroon-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Edit3 className="w-4 h-4" />
            <span>تعديل بيانات المسابقة</span>
          </button>
        </div>
      </div>
    </div>
  );
}
