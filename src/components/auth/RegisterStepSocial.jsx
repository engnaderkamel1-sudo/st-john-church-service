import React from 'react';
import { GraduationCap, Briefcase, BookOpen } from 'lucide-react';

export default function RegisterStepSocial({
  education,
  setEducation,
  job,
  setJob,
  maritalStatus,
  setMaritalStatus,
  childrenCount,
  setChildrenCount,
  role
}) {
  return (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">
          المؤهل الدراسي أو الكلية / المدرسة <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            required
            value={education}
            onChange={(e) => setEducation(e.target.value)}
            placeholder="مثال: كلية هندسة حلوان، ثانوية عامة، تجارة..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 pl-8 text-xs focus:outline-none focus:border-maroon-700 focus:bg-white"
          />
          <GraduationCap className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">
          الوظيفة أو مجال العمل <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            required
            value={job}
            onChange={(e) => setJob(e.target.value)}
            placeholder="مثال: طالب، مهندس، محاسب..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 pl-8 text-xs focus:outline-none focus:border-maroon-700 focus:bg-white"
          />
          <Briefcase className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">
          الحالة الاجتماعية <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setMaritalStatus('single')}
            className={`py-2 rounded-xl text-xs font-bold transition-all border ${
              maritalStatus === 'single'
                ? 'bg-maroon-800 text-white border-maroon-800 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            أعزب / آنسة
          </button>
          <button
            type="button"
            onClick={() => setMaritalStatus('engaged')}
            className={`py-2 rounded-xl text-xs font-bold transition-all border ${
              maritalStatus === 'engaged'
                ? 'bg-maroon-800 text-white border-maroon-800 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            خاطب / مخطوبة
          </button>
          <button
            type="button"
            onClick={() => setMaritalStatus('married')}
            className={`py-2 rounded-xl text-xs font-bold transition-all border ${
              maritalStatus === 'married'
                ? 'bg-maroon-800 text-white border-maroon-800 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            متزوج / متزوجة
          </button>
        </div>
      </div>

      {maritalStatus === 'married' && (
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3">
          <label className="block text-xs font-bold text-slate-700 mb-1">
            عدد الأولاد
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="20"
              value={childrenCount}
              onChange={(e) => setChildrenCount(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-20 bg-white border border-slate-200 rounded-xl px-3 py-2 text-center text-xs font-bold focus:outline-none focus:border-maroon-700"
            />
            <span className="text-xs text-slate-500">أولاد (اتركه 0 إذا لم يوجد أولاد)</span>
          </div>
        </div>
      )}

      {role === 'servant' && (
        <div className="bg-maroon-50 border border-maroon-200 text-maroon-900 text-xs p-3 rounded-xl font-bold flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-maroon-700 shrink-0" />
          <span>حسابك كخادم سيمنحك صلاحية الإشراف والمتابعة فور الاعتماد.</span>
        </div>
      )}
    </div>
  );
}
