import React, { useState } from 'react';
import { Trophy, MessageSquare, Users, Save, Check, Search, Eye, UserCheck } from 'lucide-react';

export default function ServantAnalytics({
  selectedGrade,
  getGradeTitle,
  currentGradeStudents,
  totalStudents,
  avgAttendance,
  avgScore,
  redFlagsCount,
  topStudents,
  studentComments,
  handleCommentChange,
  handleSaveComment,
  savedCommentId,
  onSelectStudent
}) {
  const [searchQuery, setSearchQuery] = useState('');
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="border-b border-slate-100 pb-3">
        <h3 className="font-extrabold text-slate-900 text-base">
          الإحصائيات ولوحة الشرف والتقييم الرعوي: {getGradeTitle(selectedGrade)}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          متابعة نسب الحضور، تكريم الأوائل، كشف العلامات الحمراء (المتغيبين والمقصرين)، وكتابة تقييم وملاحظات الخدام.
        </p>
      </div>

      {/* Quick Metrics KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center">
          <span className="text-[11px] text-slate-500 font-bold block">إجمالي المخدومين</span>
          <span className="text-xl font-extrabold text-slate-900">{totalStudents}</span>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center">
          <span className="text-[11px] text-slate-500 font-bold block">متوسط الحضور</span>
          <span className="text-xl font-extrabold text-emerald-600">{avgAttendance}%</span>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center">
          <span className="text-[11px] text-slate-500 font-bold block">متوسط الامتحانات</span>
          <span className="text-xl font-extrabold text-amber-600">{avgScore} / 30</span>
        </div>

        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl text-center">
          <span className="text-[11px] text-red-700 font-bold block">علامات حمراء (افتقاد عاجل)</span>
          <span className="text-xl font-extrabold text-red-600 flex items-center justify-center gap-1">
            <span>🔴</span>
            <span>{redFlagsCount}</span>
          </span>
        </div>
      </div>

      {/* Honor Roll (Top 3 Students) */}
      <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 p-5 rounded-2xl space-y-3">
        <h4 className="font-extrabold text-amber-950 text-sm flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-600" />
          لوحة الشرف والأوائل ({getGradeTitle(selectedGrade)}) 🏆
        </h4>
        {topStudents.length === 0 ? (
          <p className="text-xs text-amber-800/80 font-bold">لا توجد سجلات مخدومين مسجلة حتى الآن لحساب لوحة الشرف.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {topStudents.map((st, rank) => (
              <div key={st.id} className="bg-white border border-amber-200/80 p-3.5 rounded-xl flex items-center justify-between text-xs shadow-2xs">
                <div>
                  <span className="font-extrabold text-slate-900 block text-xs">
                    {rank === 0 ? '🥇' : rank === 1 ? '🥈' : '🥉'} {st.fullName}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    حضور: {st.attendanceRate}% • امتحان: {st.examScore}/30
                  </span>
                </div>
                <span className="text-amber-700 font-extrabold text-xs">{st.points} نقطة</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Student Evaluation Table with Servant Comments & Red Flags */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-maroon-800" />
            <span>سجل تقييمات ومتابعة المخدومين</span>
          </h4>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث بالاسم (مثل: مينا نادر)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-maroon-800 focus:bg-white"
            />
          </div>
        </div>

        {(() => {
          const filteredStudents = currentGradeStudents.filter(st => 
            !searchQuery.trim() || (st.fullName || '').toLowerCase().includes(searchQuery.trim().toLowerCase())
          );

          if (currentGradeStudents.length === 0) {
            return (
              <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">لم يتم تسجيل مخدومين في هذه المرحلة حتى الآن.</p>
                <p className="text-[11px] text-slate-400 mt-1">عند تسجيل المخدومين لحساباتهم أو تسجيل الحضور ستظهر بياناتهم وتقييماتهم هنا تلقائياً.</p>
              </div>
            );
          }

          if (filteredStudents.length === 0) {
            return (
              <div className="text-center py-8 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-500 font-bold">
                لا يوجد مخدوم يطابق بحثك عن: "{searchQuery}"
              </div>
            );
          }

          return (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-3 px-3">المخدوم</th>
                    <th className="py-3 px-2 text-center">الملف الشامل</th>
                    <th className="py-3 px-2">الحضور</th>
                    <th className="py-3 px-2">الدرجة</th>
                    <th className="py-3 px-2">الحالة</th>
                    <th className="py-3 px-4">ملاحظات وتقييم الخادم</th>
                    <th className="py-3 px-3">حفظ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((st) => (
                    <tr key={st.id} className={`hover:bg-slate-50/80 transition-colors ${st.isRedFlag ? 'bg-red-50/30' : ''}`}>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {st.fullName}
                        <span className="text-[10px] text-slate-400 block font-normal font-mono" dir="ltr">{st.phone}</span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => onSelectStudent && onSelectStudent(st)}
                          className="px-2.5 py-1.5 bg-gradient-to-r from-maroon-800 to-maroon-900 hover:from-maroon-900 hover:to-maroon-950 text-white rounded-xl font-bold text-[11px] shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer ring-1 ring-gold-400/30 active:scale-95"
                          title="عرض ملف المخدوم الكامل (الحضور، الامتحانات، النوتة، والدرجات)"
                        >
                          <Eye className="w-3.5 h-3.5 text-gold-300" />
                          <span>الملف 360°</span>
                        </button>
                      </td>
                      <td className="py-3 px-2 font-bold text-slate-800">{st.attendanceRate}%</td>
                      <td className="py-3 px-2 font-bold text-slate-800">{st.examScore}/30</td>
                      <td className="py-3 px-2">
                        {st.isRedFlag ? (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-red-200">
                            🔴 افتقاد
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            🟢 منتظم
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder="اكتب ملاحظة رعوية، مستوى التزامه، أو ترشيحه لإعداد خدام..."
                          value={st.comment}
                          onChange={(e) => handleCommentChange(st.id, e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-maroon-800"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleSaveComment(st.id)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                            savedCommentId === st.id
                              ? 'bg-emerald-600 text-white'
                              : 'bg-maroon-800 hover:bg-maroon-700 text-white shadow-xs'
                          }`}
                        >
                          {savedCommentId === st.id ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                          <span>{savedCommentId === st.id ? 'تم الحفظ' : 'حفظ'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
