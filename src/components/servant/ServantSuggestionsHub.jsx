import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, CheckCircle2, Clock, Trash2, Filter, Sparkles, User, Tag, Phone
} from 'lucide-react';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';

export default function ServantSuggestionsHub() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // all | open | in_review | completed
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    const q = query(
      collection(db, 'feature_suggestions'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSuggestions(list);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching suggestions:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'feature_suggestions', id), { status: newStatus });
    } catch (err) {
      console.error('Error updating suggestion status:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل تريد حذف هذا الاقتراح نهائياً؟')) return;
    try {
      await deleteDoc(doc(db, 'feature_suggestions', id));
    } catch (err) {
      console.error('Error deleting suggestion:', err);
    }
  };

  const filteredSuggestions = suggestions.filter(s => {
    const matchStatus = filterStatus === 'all' || (s.status || 'open') === filterStatus;
    const matchCategory = filterCategory === 'all' || s.category === filterCategory;
    return matchStatus && matchCategory;
  });

  const openCount = suggestions.filter(s => (s.status || 'open') === 'open').length;

  return (
    <div className="space-y-4 font-cairo text-right">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <Lightbulb className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                سجل اقتراحات وتطوير المنظومة
              </h2>
              {openCount > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                  {openCount} جديد
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              الأفكار والمقترحات المرسلة من الخدام والمخدومين لتطوير المنصة والخدمة.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-amber-600"
          >
            <option value="all">كل الحالات ({suggestions.length})</option>
            <option value="open">قيد الانتظار ({openCount})</option>
            <option value="in_review">قيد الدراسة</option>
            <option value="completed">تم التنفيذ ✓</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500">جاري تحميل الاقتراحات...</div>
      ) : filteredSuggestions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-2">
          <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
          <h4 className="text-sm font-extrabold text-slate-700">لا توجد مقترحات في هذا التصنيف</h4>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSuggestions.map((item) => {
            const isCompleted = item.status === 'completed';
            const isInReview = item.status === 'in_review';

            return (
              <div 
                key={item.id}
                className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3 transition-all hover:border-amber-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        <span>{item.category || 'عام'}</span>
                      </span>
                      <h3 className="text-sm font-extrabold text-slate-900">{item.title}</h3>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.userName}</span>
                        <span className="text-[10px] text-slate-400">({item.userRole === 'student' ? 'مخدوم' : 'خادم'})</span>
                      </span>
                      {item.userPhone && (
                        <span className="flex items-center gap-1 dir-ltr font-mono text-[10px] text-slate-600">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{item.userPhone}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions & Status Badge */}
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={item.status || 'open'}
                      onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border transition-colors cursor-pointer ${
                        isCompleted 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                          : isInReview 
                          ? 'bg-blue-50 text-blue-800 border-blue-300' 
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      <option value="open">⏳ قيد الانتظار</option>
                      <option value="in_review">🔍 قيد الدراسة</option>
                      <option value="completed">✓ تم التنفيذ</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="حذف الاقتراح"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl text-xs text-slate-700 leading-relaxed font-medium">
                  {item.description}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
