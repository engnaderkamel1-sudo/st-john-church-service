import React from 'react';
import { Award, BookOpen, Clock, FileCheck, HelpCircle, PenTool, Sparkles, CheckCircle2 } from 'lucide-react';

export default function ServantSubjectExams({
  selectedGrade,
  getGradeTitle,
  currentGradeSubjects = []
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-maroon-50 text-maroon-800">
              <FileCheck className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-black text-slate-900">
              امتحانات المواد الدراسية: {getGradeTitle ? getGradeTitle(selectedGrade) : ''}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            التقييم الشامل للمخدومين في ختام دراسة كل مادة من مواد منهج إعداد الخدام.
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 w-fit">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>مرحلة التجهيز والاعتماد</span>
        </span>
      </div>

      {/* Purpose Banner */}
      <div className="bg-gradient-to-br from-maroon-900 via-maroon-800 to-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-gold-400 shrink-0" />
          <h4 className="font-bold text-sm text-gold-200">الهدف من امتحانات المواد</h4>
        </div>
        <p className="text-xs text-slate-200 leading-relaxed font-medium">
          عقد امتحان تقييمي رسمي لطلبة إعداد الخدام فور الانتهاء من تدريس محاضرات كل مادة، لقياس استيعاب المخدوم للمحتوى الروحي والعقيدي والطقسي قبل الانتقال للمادة التالية.
        </p>

        {/* Future evaluation options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-maroon-700/60">
          <div className="bg-maroon-950/50 border border-maroon-700/50 rounded-xl p-3 flex items-start gap-2.5">
            <PenTool className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h5 className="text-xs font-bold text-white">الامتحان الورقي بالقاعة</h5>
              <p className="text-[11px] text-slate-300 leading-normal">
                عقد الامتحان حضورياً بالقاعة مع توفير كشف رصد إلكتروني فوري للدرجات داخل المنظومة.
              </p>
            </div>
          </div>

          <div className="bg-maroon-950/50 border border-maroon-700/50 rounded-xl p-3 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h5 className="text-xs font-bold text-white">الامتحان الإلكتروني (أونلاين)</h5>
              <p className="text-[11px] text-slate-300 leading-normal">
                فتح الامتحان للمخدومين من هواتفهم في وقت محدد داخل القاعة وتصحيحه تلقائياً.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Subjects Overview */}
      <div className="space-y-3">
        <h4 className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-maroon-700" />
          <span>المواد الدراسية المقررة لهذا الفصل ({currentGradeSubjects.length})</span>
        </h4>

        {currentGradeSubjects.length === 0 ? (
          <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-bold">لا توجد مواد مسجلة حالياً لهذه المرحلة.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentGradeSubjects.map((subject, idx) => (
              <div
                key={subject.id || idx}
                className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl p-4 transition-all flex flex-col justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-maroon-100 text-maroon-800">
                      مادة {idx + 1}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {subject.lectures?.length || 0} محاضرات
                    </span>
                  </div>
                  <h5 className="font-extrabold text-slate-900 text-sm mt-1">{subject.name}</h5>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>امتحان نهاية المادة</span>
                  </span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full">
                    قيد الإعداد
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
