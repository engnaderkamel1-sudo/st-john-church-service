import React, { useState, useEffect } from 'react';
import { 
  X, Users, Award, Download, Search, CheckCircle, XCircle, 
  ChevronDown, ChevronUp, Clock, Calendar, FileText, Trash2 
} from 'lucide-react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';

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
    const fetchSubmissions = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'exam_submissions'), 
          where('examId', '==', exam.id)
        );
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setSubmissions(list);
      } catch (err) {
        console.error('Error fetching quiz submissions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, [isOpen, exam?.id]);

  if (!isOpen || !exam) return null;

  const filtered = submissions.filter(s => 
    (s.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.userPhone || '').includes(searchTerm)
  );

  const totalScore = exam.totalScore || 20;
  const avgScore = submissions.length > 0 
    ? (submissions.reduce((acc, s) => acc + (s.autoScore || 0), 0) / submissions.length).toFixed(1)
    : 0;

  // Export to CSV with UTF-8 BOM for perfect Excel Arabic support
  const handleExportCsv = () => {
    if (submissions.length === 0) {
      alert('لا توجد ردود لتصديرها حالياً.');
      return;
    }

    const headers = ['م', 'اسم الطالب', 'رقم الهاتف', 'المرحلة', 'الدرجة المحصلة', 'الدرجة الكلية', 'تاريخ التسليم', 'وقت التسليم'];
    const rows = submissions.map((s, idx) => [
      idx + 1,
      `"${s.userName || 'مخدوم'}"`,
      `"${s.userPhone || ''}"`,
      `"${getGradeTitle ? getGradeTitle(s.grade) : s.grade}"`,
      s.autoScore || 0,
      totalScore,
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
            <div className="flex items-center gap-2">
              <span className="bg-gold-400 text-maroon-950 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                ردود المسابقة (Google Forms)
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
            <span>تصدير كشف درجات إكسيل (Excel CSV)</span>
          </button>
        </div>

        {/* Submissions List */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-bold">
              جاري تحميل إجابات وردود الطلاب...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 font-bold">
              لا توجد ردود مسجلة لهذه المسابقة حتى الآن.
            </div>
          ) : (
            filtered.map((sub, idx) => {
              const isExpanded = expandedStudentId === sub.id;
              const percent = Math.round(((sub.autoScore || 0) / totalScore) * 100);
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
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 transition-all hover:border-slate-300"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-extrabold text-xs text-slate-900 block truncate">
                          {sub.userName || 'مخدوم'}
                          {isMyOwnSubmission && (
                            <span className="mr-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
                              (حسابك)
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {sub.userPhone || 'بدون هاتف'} • {sub.submittedAt || ''} {sub.date || ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isMyOwnSubmission && (
                        <button
                          type="button"
                          disabled={deletingId === sub.id}
                          onClick={() => handleDeleteOwnSubmission(sub)}
                          className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                          title="حذف مشاركتي التجريبية من المسابقة"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>حذف ردي التجريبي</span>
                        </button>
                      )}

                      <div className={`px-2.5 py-1 rounded-xl text-xs font-black border ${
                        percent >= 80 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                          : percent >= 50 
                          ? 'bg-amber-50 text-amber-800 border-amber-200' 
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}>
                        {sub.autoScore || 0} / {totalScore} ({percent}%)
                      </div>

                      {sub.answers && (
                        <button
                          type="button"
                          onClick={() => setExpandedStudentId(isExpanded ? null : sub.id)}
                          className="p-1 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Answers Breakdown if available */}
                  {isExpanded && sub.answers && exam.questions && (
                    <div className="pt-2 border-t border-slate-200 space-y-2 text-xs">
                      <span className="text-[10px] font-extrabold text-slate-500 block">
                        تفاصيل إجابات الطالب:
                      </span>
                      {exam.questions.map((q, qIdx) => {
                        const studentAns = sub.answers[q.id];
                        const isCorrect = studentAns === q.correctAnswer;
                        return (
                          <div key={q.id} className="p-2 rounded-xl bg-white border border-slate-200 space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span>س {qIdx + 1}: {q.questionText}</span>
                              <span className={isCorrect ? 'text-emerald-700' : 'text-rose-700'}>
                                {isCorrect ? '✓ صحيح' : '✗ غير صحيح'}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-600 flex items-center gap-3">
                              <span>إجابة الطالب: <strong>{studentAns || 'لم يجب'}</strong></span>
                              <span>الإجابة النموذجية: <strong className="text-emerald-800">{q.correctAnswer}</strong></span>
                            </div>
                          </div>
                        );
                      })}
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
