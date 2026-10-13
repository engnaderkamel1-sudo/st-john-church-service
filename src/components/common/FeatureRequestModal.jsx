import React, { useState } from 'react';
import { X, Lightbulb, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function FeatureRequestModal({ isOpen, onClose, currentUser }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('مناهج ومذكرات');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const categories = [
    { id: 'مناهج ومذكرات', label: 'المناهج والمحاضرات' },
    { id: 'بنك الأسئلة والامتحانات', label: 'الامتحانات وبنك الأسئلة' },
    { id: 'النوتة الروحية', label: 'النوتة الروحية والافتقاد' },
    { id: 'حضور وغياب', label: 'الحضور والـ QR كود' },
    { id: 'ذكاء اصطناعي كنسي', label: 'استوديو الذكاء الاصطناعي' },
    { id: 'تصميم وسهولة استخدام', label: 'تحسين الواجهة والسهولة' },
    { id: 'عام', label: 'فكرة أو اقتراح عام' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMsg('يرجى ملء عنوان الاقتراح وتفاصيل الفكرة بوضوح.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      await addDoc(collection(db, 'feature_suggestions'), {
        title: title.trim(),
        category,
        description: description.trim(),
        userId: currentUser?.id || 'guest',
        userName: currentUser?.fullName || 'مستخدم مجهول',
        userPhone: currentUser?.phone || '',
        userRole: currentUser?.role || 'student',
        userGrade: currentUser?.grade || '',
        status: 'open', // open | in_review | completed
        createdAt: serverTimestamp()
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setTitle('');
        setDescription('');
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Error submitting feature request:', err);
      setErrorMsg('حدث خطأ أثناء إرسال الاقتراح، يرجى المحاولة لاحقاً.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 font-cairo text-right">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-sm sm:max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
              <Lightbulb className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">اقترح ميزة أو وظيفة جديدة</h3>
              <p className="text-[11px] text-slate-500">شاركنا أفكارك لتطوير المنصة وخدمة أفضل</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
            <h4 className="text-sm font-extrabold text-slate-900">شكراً لمشاركتك! تم تسجيل اقتراحك بنجاح</h4>
            <p className="text-xs text-slate-500">سيتم دراسة الفكرة بواسطة مشرف المنصة بعناية.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">قسم الاقتراح</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-maroon-700"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">عنوان الفكرة باختصار</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: إضافة زر لتنزيل كل ملفات المادة دفعة واحدة"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-maroon-700"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تفاصيل الفكرة وكيف تفيد الخدمة</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="اشرح الفكرة والهدف منها وكيف ستسهل على الخادم أو المخدوم..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:border-maroon-700 resize-none"
              />
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'جاري الإرسال...' : 'إرسال الاقتراح'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
