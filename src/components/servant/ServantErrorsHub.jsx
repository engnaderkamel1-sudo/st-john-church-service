import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, CheckCircle2, Trash2, Copy, Check, Clock, User, Smartphone, RefreshCw, Eye, ChevronDown 
} from 'lucide-react';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, limit } from 'firebase/firestore';

export default function ServantErrorsHub() {
  const [errorsList, setErrorsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'unresolved' | 'resolved'

  useEffect(() => {
    const q = query(
      collection(db, 'app_errors'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setErrorsList(list);
      setLoading(false);
    }, (err) => {
      console.error('Error listening to app_errors:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCopyDetails = (item) => {
    const details = `[تقرير خطأ من التطبيق]
- الرسالة: ${item.errorMessage || 'Unknown'}
- النوع: ${item.errorName || 'Error'}
- الوقت: ${item.timestampFormatted || 'غير محدد'}
- المستخدم: ${item.user?.fullName || 'زائر'} (${item.user?.phone || 'بدون هاتف'}) - الدور: ${item.user?.role || 'غير معروف'}
- رابط الصفحة: ${item.url || ''}
- أبعاد الشاشة: ${item.screenWidth}x${item.screenHeight}
- المتصفح/الجهاز: ${item.userAgent || ''}

تفاصيل الكود والـ Stack:
${item.errorStack || item.componentStack || 'لا توجد تفاصيل إضافية'}`;

    navigator.clipboard.writeText(details);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleToggleStatus = async (item) => {
    try {
      const newStatus = item.status === 'resolved' ? 'unresolved' : 'resolved';
      await updateDoc(doc(db, 'app_errors', item.id), { status: newStatus });
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleDeleteError = async (id) => {
    if (!window.confirm('هل تريد حذف هذا التقرير نهائياً؟')) return;
    try {
      await deleteDoc(doc(db, 'app_errors', id));
    } catch (err) {
      console.error('Error deleting error report:', err);
    }
  };

  const filteredErrors = errorsList.filter(e => {
    if (filterStatus === 'all') return true;
    return (e.status || 'unresolved') === filterStatus;
  });

  const unresolvedCount = errorsList.filter(e => (e.status || 'unresolved') === 'unresolved').length;

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                سجل أخطاء التطبيق والبلاغات
              </h2>
              {unresolvedCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                  {unresolvedCount} غير محلول
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              الأخطاء المرسلة من المستخدمين لحظياً، يمكنك نسخ التفاصيل وإرسالها للمطور لحلها فوراً.
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl self-start sm:self-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              filterStatus === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            الكل ({errorsList.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('unresolved')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              filterStatus === 'unresolved' ? 'bg-red-600 text-white shadow-2xs' : 'text-slate-500 hover:text-red-600'
            }`}
          >
            النشطة ({unresolvedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('resolved')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              filterStatus === 'resolved' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-emerald-600'
            }`}
          >
            المحلولة ({errorsList.length - unresolvedCount})
          </button>
        </div>
      </div>

      {/* List of Error Reports */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-400 text-xs font-bold">
          جاري تحميل سجل البلاغات...
        </div>
      ) : filteredErrors.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">لا توجد أخطاء مسجلة حالياً! 🎉</h3>
          <p className="text-xs text-slate-400">التطبيق يعمل بكفاءة تامة دون أخطاء غير معالجة.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredErrors.map((item) => {
            const isResolved = item.status === 'resolved';
            const isExpanded = expandedId === item.id;
            const isCopied = copiedId === item.id;

            return (
              <div 
                key={item.id} 
                className={`bg-white border rounded-3xl p-4 sm:p-5 transition-all shadow-xs ${
                  isResolved ? 'border-slate-200 opacity-75' : 'border-red-200 bg-red-50/20'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 font-bold ${
                      isResolved ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {isResolved ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-extrabold ${isResolved ? 'text-slate-700 line-through' : 'text-red-700'}`}>
                          {item.errorMessage || 'خطأ غير مسمى'}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isResolved ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {isResolved ? 'تم الحل ✅' : 'بحاجة للمراجعة ⚠️'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.user?.fullName || 'مستخدم غير مسجل'}</span>
                          {item.user?.phone && <span className="font-mono text-[10px]">({item.user.phone})</span>}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.timestampFormatted || 'منذ قليل'}</span>
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Smartphone className="w-3 h-3" />
                          <span>{item.screenWidth ? `${item.screenWidth}x${item.screenHeight}` : 'شاشة غير محددة'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 pt-2 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => handleCopyDetails(item)}
                      className={`text-xs font-bold py-1.5 px-3 rounded-xl transition-all flex items-center gap-1 cursor-pointer border ${
                        isCopied
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                      title="نسخ تفاصيل الخطأ لإرسالها للذكاء الاصطناعي للمساعدة"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-maroon-800" />}
                      <span>{isCopied ? 'تم النسخ!' : 'نسخ الخطأ 📋'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item)}
                      className={`text-xs font-bold py-1.5 px-2.5 rounded-xl transition-all cursor-pointer border ${
                        isResolved
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                      }`}
                      title="تبديل الحالة"
                    >
                      {isResolved ? 'إعادة فتح ↩' : 'تم الحل ✅'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
                      title="عرض التفاصيل التقنية"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteError(item.id)}
                      className="p-1.5 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                      title="حذف التقرير"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Technical Details */}
                {isExpanded && (
                  <div className="mt-3.5 pt-3 border-t border-slate-100 text-xs space-y-2">
                    <div className="bg-slate-900 text-slate-200 p-3 rounded-2xl font-mono text-[11px] overflow-x-auto max-h-48 leading-relaxed" dir="ltr">
                      <div className="text-amber-400 font-bold mb-1">Stack Trace:</div>
                      {item.errorStack || item.componentStack || 'No stack trace available.'}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono" dir="ltr">
                      <span className="font-bold text-slate-700">User-Agent: </span>{item.userAgent}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
