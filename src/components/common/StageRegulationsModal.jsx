import React, { useState, useEffect } from 'react';
import { 
  X, Award, BookOpen, Clock, CheckCircle2, ShieldCheck, 
  Edit3, Save, Plus, Trash2, RotateCcw, AlertCircle, FileText, ChevronRight 
} from 'lucide-react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const DEFAULT_REGULATIONS = {
  first: {
    title: 'لائحة تقييم سنة أولى (إعداد خدام)',
    totalMax: 1285,
    items: [
      { id: '1', name: 'الحضور والانصراف بالخدمة', freq: 'أسبوعي', formula: '3 مبكر (أول 15 د) / درجتان متأخر × 47 أسبوع', max: 141, note: 'مسجل تلقائياً عبر الكاميرا/الكود' },
      { id: '2', name: 'قراءة الكتاب المقدس', freq: 'أسبوعي', formula: '3 درجات للأسبوع (حساب نسبي يومي 3/7 د/يوم)', max: 141, note: 'تلقائي من النوتة الروحية' },
      { id: '3', name: 'القداس الإلهي', freq: 'أسبوعي', formula: 'درجتان أسبوعياً × 47 أسبوع', max: 94, note: 'تلقائي من النوتة الروحية' },
      { id: '4', name: 'التناول من الأسرار المقدسة', freq: 'أسبوعي', formula: 'درجتان أسبوعياً × 47 أسبوع', max: 94, note: 'تلقائي من النوتة الروحية' },
      { id: '5', name: 'الصوم والانقطاع', freq: 'أسبوعي', formula: 'درجتان أسبوعياً × 47 أسبوع', max: 94, note: 'تلقائي من النوتة الروحية' },
      { id: '6', name: 'النوتة والصلوات الشخصية', freq: 'أسبوعي', formula: 'درجتان للأسبوع (50% تدوين + 50% صلوات أجبية)', max: 94, note: 'تلقائي من النوتة الروحية' },
      { id: '7', name: 'اجتماع المرحلة', freq: 'أسبوعي', formula: 'درجة أسبوعياً × 47 أسبوع', max: 47, note: 'تقييم خدام المرحلة' },
      { id: '8', name: 'سر الاعتراف والإرشاد', freq: 'دوري', formula: '15 درجة × 6 مرات في السنة', max: 90, note: 'تقييم أب الاعتراف والخدام' },
      { id: '9', name: 'الأبحاث التكليفية', freq: 'سنوي', formula: '40 درجة × بحثين', max: 80, note: 'تقييم أساتذة المواد' },
      { id: '10', name: 'أنشطة وكورس المطرانية', freq: 'سنوي', formula: 'يوم المطرانية 30 + كورس المطرانية 80', max: 110, note: 'اعتماد مطرانية المعادي' },
      { id: '11', name: 'المواد الدراسية والامتحانات', freq: 'سنوي', formula: '6 مواد دراسية × 40 درجة', max: 240, note: 'امتحانات المنصة والتحريري' },
      { id: '12', name: 'الأنشطة التطبيقية للمواد', freq: 'سنوي', formula: '10 درجات لكل مادة × 6 مواد', max: 60, note: 'تكليفات وورش العمل' },
      { id: '13', name: 'مشروع التخرج', freq: 'سنوي', formula: 'غير مطلوب لسنة أولى (مخصص لسنة ثانية فقط)', max: 0, note: 'سنة ثانية فقط' }
    ]
  },
  second: {
    title: 'لائحة تقييم سنة ثانية (إعداد خدام)',
    totalMax: 1485,
    items: [
      { id: '1', name: 'الحضور والانصراف بالخدمة', freq: 'أسبوعي', formula: '3 مبكر (أول 15 د) / درجتان متأخر × 47 أسبوع', max: 141, note: 'مسجل تلقائياً عبر الكاميرا/الكود' },
      { id: '2', name: 'قراءة الكتاب المقدس', freq: 'أسبوعي', formula: '3 درجات للأسبوع (حساب نسبي يومي 3/7 د/يوم)', max: 141, note: 'تلقائي من النوتة الروحية' },
      { id: '3', name: 'القداس الإلهي', freq: 'أسبوعي', formula: 'درجتان أسبوعياً × 47 أسبوع', max: 94, note: 'تلقائي من النوتة الروحية' },
      { id: '4', name: 'التناول من الأسرار المقدسة', freq: 'أسبوعي', formula: 'درجتان أسبوعياً × 47 أسبوع', max: 94, note: 'تلقائي من النوتة الروحية' },
      { id: '5', name: 'الصوم والانقطاع', freq: 'أسبوعي', formula: 'درجتان أسبوعياً × 47 أسبوع', max: 94, note: 'تلقائي من النوتة الروحية' },
      { id: '6', name: 'النوتة والصلوات الشخصية', freq: 'أسبوعي', formula: 'درجتان للأسبوع (50% تدوين + 50% صلوات أجبية)', max: 94, note: 'تلقائي من النوتة الروحية' },
      { id: '7', name: 'اجتماع المرحلة', freq: 'أسبوعي', formula: 'درجة أسبوعياً × 47 أسبوع', max: 47, note: 'تقييم خدام المرحلة' },
      { id: '8', name: 'سر الاعتراف والإرشاد', freq: 'دوري', formula: '15 درجة × 6 مرات في السنة', max: 90, note: 'تقييم أب الاعتراف والخدام' },
      { id: '9', name: 'الأبحاث التكليفية', freq: 'سنوي', formula: '40 درجة × بحثين', max: 80, note: 'تقييم أساتذة المواد' },
      { id: '10', name: 'أنشطة وكورس المطرانية', freq: 'سنوي', formula: 'يوم المطرانية 30 + كورس المطرانية 80', max: 110, note: 'اعتماد مطرانية المعادي' },
      { id: '11', name: 'المواد الدراسية والامتحانات', freq: 'سنوي', formula: '9 مواد دراسية × 40 درجة', max: 360, note: 'امتحانات المنصة والتحريري' },
      { id: '12', name: 'الأنشطة التطبيقية للمواد', freq: 'سنوي', formula: '10 درجات لكل مادة × 9 مواد', max: 90, note: 'تكليفات وورش العمل' },
      { id: '13', name: 'مشروع التخرج', freq: 'سنوي', formula: 'مشروع تخرج شامل بنهاية الدورة', max: 50, note: 'مناقشة لجنة الخدام' }
    ]
  },
  third: {
    title: 'لائحة تقييم سنة ثالثة',
    totalMax: 0,
    items: [],
    emptyMessage: 'لائحة سنة ثالثة قيد الإعداد والاعتماد من قِبل إدارة الخدمة ⏳'
  },
  elisha: {
    title: 'لائحة تقييم فصل أليشع (تمهيدي إعداد خدام)',
    totalMax: 0,
    items: [],
    emptyMessage: 'لائحة فصل أليشع قيد الإعداد والاعتماد من قِبل إدارة الخدمة ⏳'
  }
};

const STAGE_KEYS = [
  { key: 'first', label: 'سنة أولى' },
  { key: 'second', label: 'سنة ثانية' },
  { key: 'third', label: 'سنة ثالثة' },
  { key: 'elisha', label: 'فصل أليشع' }
];

export default function StageRegulationsModal({
  isOpen,
  onClose,
  initialStage = 'first',
  isStudent = false,
  studentGrade = null,
  isAdmin = false
}) {
  const [activeStage, setActiveStage] = useState(studentGrade || initialStage);
  const [regulations, setRegulations] = useState(DEFAULT_REGULATIONS);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (studentGrade) {
      setActiveStage(studentGrade);
    }
  }, [studentGrade]);

  // Sync saved regulations from Firestore
  useEffect(() => {
    if (!isOpen) return;
    const fetchRegs = async () => {
      try {
        const snap = await getDoc(doc(db, 'service_settings', 'stage_regulations'));
        if (snap.exists()) {
          const remoteData = snap.data();
          setRegulations(prev => ({
            first: remoteData.first || prev.first,
            second: remoteData.second || prev.second,
            third: remoteData.third || prev.third,
            elisha: remoteData.elisha || prev.elisha
          }));
        }
      } catch (err) {
        console.error('Error fetching stage regulations:', err);
      }
    };
    fetchRegs();
  }, [isOpen]);

  if (!isOpen) return null;

  const currentStageData = isEditing && editData ? editData : (regulations[activeStage] || DEFAULT_REGULATIONS[activeStage]);

  const handleStartEdit = () => {
    setEditData(JSON.parse(JSON.stringify(regulations[activeStage] || DEFAULT_REGULATIONS[activeStage])));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData(null);
  };

  const handleItemChange = (idx, field, value) => {
    setEditData(prev => {
      const newItems = [...prev.items];
      newItems[idx] = { ...newItems[idx], [field]: value };
      const newTotal = newItems.reduce((acc, curr) => acc + (Number(curr.max) || 0), 0);
      return { ...prev, items: newItems, totalMax: newTotal };
    });
  };

  const handleAddItem = () => {
    setEditData(prev => {
      const newItems = [
        ...(prev.items || []),
        { id: Date.now().toString(), name: 'بند تقييم جديد', freq: 'أسبوعي', formula: 'طريقة الحساب', max: 0, note: 'ملاحظة' }
      ];
      return { ...prev, items: newItems };
    });
  };

  const handleDeleteItem = (idx) => {
    setEditData(prev => {
      const newItems = prev.items.filter((_, i) => i !== idx);
      const newTotal = newItems.reduce((acc, curr) => acc + (Number(curr.max) || 0), 0);
      return { ...prev, items: newItems, totalMax: newTotal };
    });
  };

  const handleSaveToFirestore = async () => {
    setSaving(true);
    try {
      const updatedRegs = {
        ...regulations,
        [activeStage]: editData
      };
      await setDoc(doc(db, 'service_settings', 'stage_regulations'), {
        ...updatedRegs,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setRegulations(updatedRegs);
      setIsEditing(false);
      setEditData(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Save regulation error:', err);
      alert('حدث خطأ أثناء حفظ اللائحة في السيرفر.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] text-right font-sans">
        
        {/* Header */}
        <div className="bg-gradient-to-l from-maroon-900 via-maroon-800 to-amber-950 text-white p-5 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-300">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
                لائحة التقييم والدرجات المعتمدة 📜
                {isAdmin && <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">صلاحية المشرف</span>}
              </h2>
              <p className="text-xs text-amber-200/80 font-medium">
                {isStudent ? 'اللائحة الرسمية لتقييم مرحلتك وتوزيع الدرجات السنوية' : 'الدليل الإرشادي والتنظيمي لدرجات المراحل بلائحة الخدمة'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stage Tabs (Hidden for student to keep them focused on their stage) */}
        {!isStudent && (
          <div className="bg-slate-50 border-b border-slate-200 p-2 sm:px-5 flex items-center gap-2 overflow-x-auto shrink-0">
            {STAGE_KEYS.map(tab => (
              <button
                key={tab.key}
                disabled={isEditing}
                onClick={() => setActiveStage(tab.key)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                  activeStage === tab.key
                    ? 'bg-maroon-800 text-white shadow-sm shadow-maroon-900/20'
                    : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
                } ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Stage Banner */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/70 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-black tracking-wider text-amber-800 uppercase block">المرحلة الحالية</span>
              <h3 className="text-base font-extrabold text-slate-900 mt-0.5">{currentStageData.title}</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-left sm:text-right">
                <span className="text-[11px] font-bold text-slate-500 block">إجمالي الدرجات العظمى</span>
                <span className="text-lg font-black font-mono text-maroon-800">{currentStageData.totalMax || 0} درجة</span>
              </div>
              {isAdmin && !isEditing && (
                <button
                  onClick={handleStartEdit}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  تعديل اللائحة
                </button>
              )}
            </div>
          </div>

          {/* Alert Message for Empty Stages */}
          {(!currentStageData.items || currentStageData.items.length === 0) ? (
            <div className="py-12 px-6 text-center bg-slate-50 border border-dashed border-slate-300 rounded-3xl space-y-3">
              <Clock className="w-12 h-12 text-amber-500 mx-auto animate-pulse" />
              <h4 className="font-extrabold text-slate-800 text-base">
                {currentStageData.emptyMessage || 'اللائحة قيد الإعداد والاعتماد ⏳'}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                سيتم نشر وتفعيل توزيع الدرجات فور اعتمادها من أمانة الخدمة والمطرانية.
              </p>
              {isAdmin && (
                <button
                  onClick={handleStartEdit}
                  className="mt-3 px-4 py-2 bg-maroon-800 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-maroon-900 transition-all inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  إضافة بنود تقييم لهذه المرحلة الآن
                </button>
              )}
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-extrabold border-b border-slate-200">
                      <th className="p-3 text-center w-12">#</th>
                      <th className="p-3">بند التقييم</th>
                      <th className="p-3 text-center w-24">الدورية</th>
                      <th className="p-3">طريقة الحساب والشرح</th>
                      <th className="p-3 text-center w-24">الدرجة العظمى</th>
                      <th className="p-3">طريقة الرصد</th>
                      {isEditing && <th className="p-3 text-center w-12">حذف</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {currentStageData.items.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 text-center font-bold text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-900">
                          {isEditing ? (
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                              className="w-full p-1.5 border border-slate-300 rounded-lg text-xs"
                            />
                          ) : item.name}
                        </td>
                        <td className="p-3 text-center">
                          {isEditing ? (
                            <input
                              type="text"
                              value={item.freq}
                              onChange={(e) => handleItemChange(idx, 'freq', e.target.value)}
                              className="w-full p-1.5 border border-slate-300 rounded-lg text-xs text-center"
                            />
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-semibold text-[11px]">
                              {item.freq}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600">
                          {isEditing ? (
                            <input
                              type="text"
                              value={item.formula}
                              onChange={(e) => handleItemChange(idx, 'formula', e.target.value)}
                              className="w-full p-1.5 border border-slate-300 rounded-lg text-xs"
                            />
                          ) : item.formula}
                        </td>
                        <td className="p-3 text-center font-black font-mono text-maroon-800 text-sm">
                          {isEditing ? (
                            <input
                              type="number"
                              value={item.max}
                              onChange={(e) => handleItemChange(idx, 'max', Number(e.target.value))}
                              className="w-16 p-1.5 border border-slate-300 rounded-lg text-xs text-center font-bold"
                            />
                          ) : item.max}
                        </td>
                        <td className="p-3 text-[11px] text-slate-500 font-medium">
                          {isEditing ? (
                            <input
                              type="text"
                              value={item.note}
                              onChange={(e) => handleItemChange(idx, 'note', e.target.value)}
                              className="w-full p-1.5 border border-slate-300 rounded-lg text-xs"
                            />
                          ) : item.note}
                        </td>
                        {isEditing && (
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleDeleteItem(idx)}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Admin Edit Controls Bar */}
          {isEditing && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={handleAddItem}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-emerald-600" />
                إضافة بند جديد
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all"
                >
                  إلغاء التعديل
                </button>
                <button
                  onClick={handleSaveToFirestore}
                  disabled={saving}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'جاري الحفظ...' : 'حفظ اللائحة في السيرفر 💾'}
                </button>
              </div>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              تم حفظ وتحديث اللائحة بنجاح في قاعدة البيانات!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between shrink-0 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>نظام التقييم المعتمد لكنيسة القديس ماريوحنا المعمدان بالمعراج</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
}
