import React, { useState, useMemo } from 'react';
import { 
  X, Search, Filter, Download, RotateCcw, 
  CheckCircle2, XCircle, Clock, User, Phone, FileSpreadsheet,
  Calendar, ShieldCheck
} from 'lucide-react';

export default function ServantBackupPreviewModal({ backup, onClose, onRestore, restoring }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, attended, absent
  const [gradeFilter, setGradeFilter] = useState('all');

  const records = useMemo(() => {
    return backup?.attendanceData || [];
  }, [backup]);

  // Statistics
  const stats = useMemo(() => {
    let attended = 0;
    let absent = 0;
    records.forEach(r => {
      if (r.status === 'حاضر') attended++;
      else if (r.status === 'غائب') absent++;
    });
    return {
      total: records.length,
      attended,
      absent
    };
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Search by name or phone
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (r.userName || '').toLowerCase().includes(q);
        const phoneMatch = (r.phone || '').includes(q);
        if (!nameMatch && !phoneMatch) return false;
      }
      // Filter by status
      if (statusFilter === 'attended' && r.status !== 'حاضر') return false;
      if (statusFilter === 'absent' && r.status !== 'غائب') return false;
      // Filter by grade
      if (gradeFilter !== 'all' && r.grade !== gradeFilter) return false;
      return true;
    });
  }, [records, searchQuery, statusFilter, gradeFilter]);

  // Export this snapshot to Excel (CSV)
  const handleExportThisSnapshot = () => {
    try {
      const rows = [
        ['اسم المخدوم', 'رقم الهاتف', 'المرحلة الدراسية', 'التاريخ', 'الوقت', 'الحالة', 'النقاط', 'الخادم المسؤول']
      ];

      records.forEach(data => {
        rows.push([
          `"${data.userName || ''}"`,
          `"${data.phone || ''}"`,
          `"${data.grade || ''}"`,
          `"${data.date || ''}"`,
          `"${data.time || ''}"`,
          `"${data.status || ''}"`,
          `"${data.pointsAwarded || 0}"`,
          `"${data.servantName || ''}"`
        ]);
      });

      const csvContent = "\uFEFF" + rows.map(e => e.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `معاينة_نسخة_حضور_${backup.fridayDate || backup.dateFormatted || 'الخدمة'}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error exporting snapshot:', err);
      alert('حدث خطأ أثناء تصدير ملف الإكسيل.');
    }
  };

  const getGradeArabic = (grade) => {
    if (grade === 'first') return 'سنة أولى';
    if (grade === 'second') return 'سنة ثانية';
    if (grade === 'third') return 'سنة ثالثة';
    if (grade === 'prep') return 'فصل إيليشع';
    return grade || 'عام';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-cairo animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-maroon-900 via-maroon-800 to-maroon-950 text-white p-4 sm:p-5 flex items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-gold-400/20 text-gold-300 border border-gold-400/30 px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>معاينة وفحص النسخة الاحتياطية</span>
              </span>
              <span className="text-xs text-maroon-200">
                {backup?.type === 'scheduled_friday' ? 'تلقائي أسبوعي ⚙️' : 'يدوي بواسطة المشرف 👑'}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gold-400" />
              <span>{backup?.title || 'سجلات الحضور والغياب'}</span>
              <span className="text-xs font-semibold text-slate-300">
                ({backup?.dateFormatted || backup?.fridayDate} - {backup?.timeFormatted || ''})
              </span>
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats & Actions Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Quick Stats */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-slate-700 shadow-2xs">
              الإجمالي: <strong>{stats.total}</strong> سجل
            </span>
            <span className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-emerald-800 flex items-center gap-1 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>حاضر: <strong>{stats.attended}</strong></span>
            </span>
            <span className="bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl text-rose-800 flex items-center gap-1 shadow-2xs">
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>غائب: <strong>{stats.absent}</strong></span>
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportThisSnapshot}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              title="تصدير هذه النسخة فقط إلى ملف إكسيل"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>تصدير إكسيل 📊</span>
            </button>

            <button
              type="button"
              onClick={() => onRestore(backup)}
              disabled={restoring}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-maroon-950 text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-60"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${restoring ? 'animate-spin' : ''}`} />
              <span>{restoring ? 'جارٍ الاستعادة...' : 'استعادة هذه النسخة للمنظومة 🔄'}</span>
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="p-3 sm:px-4 bg-white border-b border-slate-200/80 flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم أو رقم التليفون..."
              className="w-full pl-3 pr-9 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-maroon-700 transition-colors"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:outline-hidden focus:border-maroon-700"
          >
            <option value="all">كافة الحالات (حاضر وغائب)</option>
            <option value="attended">الحاضرين فقط ✓</option>
            <option value="absent">الغائبين فقط ✗</option>
          </select>

          {/* Grade Filter */}
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold focus:outline-hidden focus:border-maroon-700"
          >
            <option value="all">كافة الفصول والمراحل</option>
            <option value="first">سنة أولى</option>
            <option value="second">سنة ثانية</option>
            <option value="third">سنة ثالثة</option>
            <option value="prep">فصل إيليشع</option>
          </select>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto p-4">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-bold">
              لا توجد سجلات تطابق الفلتر أو البحث داخل هذه النسخة.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
                    <th className="p-2.5">المخدوم</th>
                    <th className="p-2.5">المرحلة</th>
                    <th className="p-2.5">الحالة</th>
                    <th className="p-2.5">الوقت</th>
                    <th className="p-2.5">النقاط</th>
                    <th className="p-2.5">الخادم الراصد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((r, idx) => (
                    <tr key={r.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-2.5 font-bold text-slate-900">
                        <div>{r.userName || 'غير محدد'}</div>
                        {r.phone && (
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="w-2.5 h-2.5" />
                            <span>{r.phone}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 text-slate-600 font-semibold">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px]">
                          {getGradeArabic(r.grade)}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          r.status === 'حاضر'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {r.status === 'حاضر' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          <span>{r.status || 'غير محدد'}</span>
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-500 font-mono text-[11px]">
                        {r.time || '—'}
                      </td>
                      <td className="p-2.5 font-extrabold text-maroon-800">
                        {r.pointsAwarded || 0}
                      </td>
                      <td className="p-2.5 text-slate-500 text-[11px]">
                        {r.servantName || 'النظام'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500 shrink-0">
          معاينة آمنة: فتح وتصفح هذه النسخة لا يغير أي بيانات في المنظومة إلا بعد الضغط على (استعادة هذه النسخة).
        </div>
      </div>
    </div>
  );
}
