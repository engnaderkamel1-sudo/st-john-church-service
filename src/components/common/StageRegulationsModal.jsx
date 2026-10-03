import React, { useState, useEffect } from 'react';
import { 
  X, Award, BookOpen, Clock, CheckCircle2, ShieldCheck, 
  Edit3, Save, Plus, Trash2, RotateCcw, AlertCircle, FileText, ChevronRight, Sliders,
  Send, Globe, Lock
} from 'lucide-react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { DEFAULT_STAGE_REGULATIONS, recalculateItemProperties, calculateStudentStandingToDate } from '../../utils/regulationsService';

const STAGE_KEYS = [
  { key: 'first', label: 'سنة أولى' },
  { key: 'second', label: 'سنة ثانية' },
  { key: 'third', label: 'سنة ثالثة' },
  { key: 'elisha', label: 'فصل أليشع' }
];

const mergeStageWithDefaults = (remoteStage, defaultStage) => {
  if (!remoteStage) return defaultStage;
  const baseItems = (remoteStage.items && remoteStage.items.length > 0)
    ? remoteStage.items
    : (defaultStage?.items || []);

  const mergedItems = baseItems.map(remoteItem => {
    const defaultItem = (defaultStage?.items || []).find(d => d.id === remoteItem.id);
    if (!defaultItem) return remoteItem;
    return {
      ...defaultItem,
      ...remoteItem,
      configType: remoteItem.configType || defaultItem.configType,
      config: {
        ...(defaultItem.config || {}),
        ...(remoteItem.config || {})
      }
    };
  });
  return {
    ...defaultStage,
    ...remoteStage,
    items: mergedItems.length > 0 ? mergedItems : (defaultStage?.items || [])
  };
};

export default function StageRegulationsModal({
  isOpen,
  onClose,
  currentUser = null,
  isStudent = false,
  studentGrade = null,
  isAdmin = false
}) {
  const [activeStage, setActiveStage] = useState(studentGrade || initialStage);
  const [regulations, setRegulations] = useState(DEFAULT_STAGE_REGULATIONS);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [studentStanding, setStudentStanding] = useState(null);

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
          setRegulations({
            first: mergeStageWithDefaults(remoteData.first, DEFAULT_STAGE_REGULATIONS.first),
            second: mergeStageWithDefaults(remoteData.second, DEFAULT_STAGE_REGULATIONS.second),
            third: mergeStageWithDefaults(remoteData.third, DEFAULT_STAGE_REGULATIONS.third),
            elisha: mergeStageWithDefaults(remoteData.elisha, DEFAULT_STAGE_REGULATIONS.elisha)
          });
        }
      } catch (err) {
        console.error('Error fetching stage regulations:', err);
      }
    };
    fetchRegs();
  }, [isOpen]);

  // Fetch student cumulative standing to date if student
  useEffect(() => {
    if (!isOpen || !isStudent || !currentUser?.id) return;
    const fetchStudentStanding = async () => {
      try {
        // 1. Fetch holidays
        const hSnap = await getDoc(doc(db, 'service_settings', 'service_holidays'));
        const holidays = hSnap.exists() ? (hSnap.data().holidays || []) : [];

        // 2. Fetch attendance docs
        const attSnap = await getDocs(query(collection(db, 'attendance'), where('userId', '==', currentUser.id)));
        const attDocs = [];
        attSnap.forEach(d => attDocs.push(d.data()));

        // 3. Fetch diary docs
        const diaSnap = await getDocs(query(collection(db, 'spiritual_diaries'), where('userId', '==', currentUser.id)));
        const diaDocs = [];
        diaSnap.forEach(d => diaDocs.push(d.data()));

        // 4. Fetch exam submissions
        const exSnap = await getDocs(query(collection(db, 'exam_submissions'), where('userId', '==', currentUser.id)));
        const exDocs = [];
        exSnap.forEach(d => exDocs.push(d.data()));

        const standing = calculateStudentStandingToDate({
          studentGrade: currentUser.grade || studentGrade || 'first',
          stageRegulations: regulations,
          attendanceRecords: attDocs,
          diaryRecords: diaDocs,
          examSubmissions: exDocs,
          holidays,
          currentPoints: currentUser.points || 0
        });

        setStudentStanding(standing);
      } catch (err) {
        console.warn('Error calculating student standing:', err);
      }
    };
    fetchStudentStanding();
  }, [isOpen, isStudent, currentUser?.id, studentGrade, regulations]);

  if (!isOpen) return null;

  const currentStageData = isEditing && editData ? editData : (regulations[activeStage] || DEFAULT_STAGE_REGULATIONS[activeStage]);

  // Determine publication and items visibility
  const isStagePublished = Boolean(currentStageData.isPublished);
  // For students or viewers: show only items with max > 0 if published; during admin editing: show all 13 items
  const visibleItems = isEditing 
    ? (currentStageData.items || [])
    : (currentStageData.items || []).filter(it => (Number(it.max) || 0) > 0);

  const shouldShowEmptyWaitingScreen = !isEditing && (!isStagePublished || visibleItems.length === 0);

  const handleStartEdit = () => {
    setEditData(JSON.parse(JSON.stringify(regulations[activeStage] || DEFAULT_STAGE_REGULATIONS[activeStage])));
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

  const handleConfigChange = (idx, configKey, configValue) => {
    setEditData(prev => {
      const newItems = [...prev.items];
      const currItem = newItems[idx];
      const newConfig = {
        ...(currItem.config || {}),
        [configKey]: configValue
      };
      const updatedItem = recalculateItemProperties({
        ...currItem,
        config: newConfig
      });
      newItems[idx] = updatedItem;
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

  const handleSaveToFirestore = async (publish = false) => {
    setSaving(true);
    try {
      const dataToSave = {
        ...editData,
        isPublished: publish ? true : (editData.isPublished || false)
      };
      const updatedRegs = {
        ...regulations,
        [activeStage]: dataToSave
      };
      await setDoc(doc(db, 'service_settings', 'stage_regulations'), {
        ...updatedRegs,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setRegulations(updatedRegs);
      setIsEditing(false);
      setEditData(null);
      setSaveSuccess(publish ? 'تم اعتماد ونشر اللائحة رسمياً للمخدومين بنجاح! 🚀' : 'تم حفظ اللائحة كمسودة في السيرفر بنجاح! 💾');
      setTimeout(() => setSaveSuccess(null), 3500);
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
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black tracking-wider text-amber-800 uppercase block">المرحلة الحالية</span>
                {isAdmin && (
                  isStagePublished ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      منشورة للمخدومين
                    </span>
                  ) : (
                    <span className="text-[10px] bg-slate-200 text-slate-700 border border-slate-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      مسودة (غير منشورة)
                    </span>
                  )
                )}
              </div>
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

          {/* Student Standing to Date Card (Personal Performance Summary) */}
          {isStudent && studentStanding && (
            <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-white border-2 border-emerald-300 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100 pb-2.5">
                <div>
                  <span className="text-[11px] font-black text-emerald-800 uppercase block tracking-wider">
                    موقفي التراكمي في اللائحة حتى تاريخه 🎯
                  </span>
                  <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    محقق حتى اليوم: {studentStanding.standingPercentage}% من المطلوب حتى تاريخه
                  </h4>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-lg sm:text-xl font-black font-mono text-emerald-800">
                    {studentStanding.earnedPoints} <span className="text-xs font-normal text-slate-500">/ {studentStanding.accruedMax} درجة مطلوبة</span>
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200">
                  <div 
                    className="bg-gradient-to-r from-emerald-600 to-teal-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(5, studentStanding.standingPercentage))}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  تم احتساب {studentStanding.elapsedFridays} أسابيع خدمة انقضت (مع استبعاد الجمع المعفاة). الامتحانات التي لم تعقد بعد غير محسوبة عليك كرسوب حتى يتم امتحانها.
                </p>
              </div>
            </div>
          )}

          {/* Alert Message for Un-published or Empty Stages */}
          {shouldShowEmptyWaitingScreen ? (
            <div className="py-12 px-6 text-center bg-slate-50 border border-dashed border-slate-300 rounded-3xl space-y-3">
              <Clock className="w-12 h-12 text-amber-500 mx-auto animate-pulse" />
              <h4 className="font-extrabold text-slate-800 text-base">
                {currentStageData.emptyMessage || 'لائحة تقييم المرحلة قيد الإعداد والاعتماد ⏳'}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                لم يتم اعتماد أو نشر لائحة هذه المرحلة للمخدومين حتى الآن، سيتم إتاحة وتفعيل توزيع الدرجات فور اعتمادها من أمانة الخدمة.
              </p>
              {isAdmin && (
                <div className="pt-2">
                  <button
                    onClick={handleStartEdit}
                    className="px-4 py-2 bg-maroon-800 hover:bg-maroon-900 text-white text-xs font-bold rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5"
                  >
                    <Edit3 className="w-4 h-4" />
                    بدء إعداد وتعديل اللائحة لهذه المرحلة الآن ✏️
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Mobile View: High readability cards with large text (visible < md) */}
              <div className="md:hidden space-y-3.5">
                {visibleItems.map((item, idx) => (
                  <div 
                    key={item.id || idx} 
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3 transition-all"
                  >
                    {/* Header Row: Index + Title + Delete/Badge */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-6 h-6 rounded-lg bg-maroon-50 text-maroon-900 border border-maroon-200 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                          {idx + 1}
                        </span>
                        {isEditing ? (
                          <div className="flex-1 min-w-0">
                            <label className="text-[10px] text-slate-500 font-bold block mb-1">اسم البند:</label>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-maroon-800"
                              placeholder="اسم بند التقييم..."
                            />
                          </div>
                        ) : (
                          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                            {item.name}
                          </h4>
                        )}
                      </div>

                      {/* Right Action: Delete if editing, or Max Grade Badge if viewing */}
                      <div className="shrink-0 flex items-center gap-1.5">
                        {!isEditing && (
                          Number(item.max) > 0 ? (
                            <span className="bg-amber-100 text-amber-950 border border-amber-300 px-2.5 py-1 rounded-xl text-xs font-black font-mono">
                              {item.max} درجة
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2.5 py-1 rounded-xl text-[11px] font-bold">
                              غير محدد (0)
                            </span>
                          )
                        )}
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(idx)}
                            className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition-all cursor-pointer border border-rose-200"
                            title="حذف هذا البند"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: Frequency & Max Points */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[11px] text-slate-500 font-bold block mb-1">الدورية:</span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={item.freq}
                            onChange={(e) => handleItemChange(idx, 'freq', e.target.value)}
                            className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 text-center focus:outline-none focus:border-maroon-800"
                            placeholder="أسبوعي / فصلي"
                          />
                        ) : (
                          <span className="text-xs font-bold text-slate-800">
                            {item.freq || '—'}
                          </span>
                        )}
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[11px] text-slate-500 font-bold block mb-1">الدرجة العظمى:</span>
                        {isEditing ? (
                          <input
                            type="number"
                            value={item.max}
                            onChange={(e) => handleItemChange(idx, 'max', Number(e.target.value))}
                            className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-black text-maroon-800 text-center focus:outline-none focus:border-maroon-800 font-mono"
                          />
                        ) : (
                          <span className="text-xs font-black text-maroon-800 font-mono">
                            {item.max} درجة
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dynamic Calculation Engine Inputs (Active during edit) */}
                    {isEditing && item.config && (
                      <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-300/80 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-amber-900 flex items-center gap-1.5">
                            <Sliders className="w-3.5 h-3.5 text-amber-700" />
                            <span>إعدادات الحساب البرمجي الفعلي</span>
                          </span>
                          <span className="text-[10px] text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full font-bold">
                            تطبيق فوري بالسيستم ⚡
                          </span>
                        </div>

                        {item.configType === 'attendance' && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div className="bg-white p-2 rounded-xl border border-amber-200">
                              <label className="text-[10px] text-slate-600 font-bold block mb-1">درجات المبكر</label>
                              <input
                                type="number"
                                value={item.config?.earlyPoints ?? 3}
                                onChange={(e) => handleConfigChange(idx, 'earlyPoints', Number(e.target.value))}
                                className="w-full p-1 bg-amber-50/50 border border-amber-300 rounded-lg text-xs font-black text-center text-maroon-800 font-mono"
                              />
                            </div>
                            <div className="bg-white p-2 rounded-xl border border-amber-200">
                              <label className="text-[10px] text-slate-600 font-bold block mb-1">درجات المتأخر</label>
                              <input
                                type="number"
                                value={item.config?.latePoints ?? 2}
                                onChange={(e) => handleConfigChange(idx, 'latePoints', Number(e.target.value))}
                                className="w-full p-1 bg-amber-50/50 border border-amber-300 rounded-lg text-xs font-black text-center text-maroon-800 font-mono"
                              />
                            </div>
                            <div className="bg-white p-2 rounded-xl border border-amber-200">
                              <label className="text-[10px] text-slate-600 font-bold block mb-1">مهلة المبكر (دقيقة)</label>
                              <input
                                type="number"
                                value={item.config?.thresholdMins ?? 15}
                                onChange={(e) => handleConfigChange(idx, 'thresholdMins', Number(e.target.value))}
                                className="w-full p-1 bg-amber-50/50 border border-amber-300 rounded-lg text-xs font-black text-center text-maroon-800 font-mono"
                              />
                            </div>
                            <div className="bg-white p-2 rounded-xl border border-amber-200">
                              <label className="text-[10px] text-slate-600 font-bold block mb-1">عدد الأسابيع</label>
                              <input
                                type="number"
                                value={item.config?.weeksCount ?? 47}
                                onChange={(e) => handleConfigChange(idx, 'weeksCount', Number(e.target.value))}
                                className="w-full p-1 bg-amber-50/50 border border-amber-300 rounded-lg text-xs font-black text-center text-maroon-800 font-mono"
                              />
                            </div>
                          </div>
                        )}

                        {item.configType === 'weekly' && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-white p-2 rounded-xl border border-amber-200">
                                <label className="text-[10px] text-slate-600 font-bold block mb-1">درجة الأسبوع</label>
                                <input
                                  type="number"
                                  value={item.config?.weeklyPoints ?? 0}
                                  onChange={(e) => handleConfigChange(idx, 'weeklyPoints', Number(e.target.value))}
                                  className="w-full p-1 bg-amber-50/50 border border-amber-300 rounded-lg text-xs font-black text-center text-maroon-800 font-mono"
                                />
                              </div>
                              <div className="bg-white p-2 rounded-xl border border-amber-200">
                                <label className="text-[10px] text-slate-600 font-bold block mb-1">عدد الأسابيع</label>
                                <input
                                  type="number"
                                  value={item.config?.weeksCount ?? 47}
                                  onChange={(e) => handleConfigChange(idx, 'weeksCount', Number(e.target.value))}
                                  className="w-full p-1 bg-amber-50/50 border border-amber-300 rounded-lg text-xs font-black text-center text-maroon-800 font-mono"
                                />
                              </div>
                            </div>
                            {item.id === '2' && (
                              <div className="bg-amber-100/70 border border-amber-300/80 rounded-xl p-2 text-[10px] text-amber-950 flex items-center justify-between font-medium">
                                <span>📖 الحساب النسبي اليومي التلقائي:</span>
                                <span className="font-black font-mono bg-white px-2 py-0.5 rounded-lg border border-amber-300 text-maroon-800">
                                  {Number(item.config?.weeklyPoints) > 0 
                                    ? `(${(Number(item.config?.weeklyPoints) / 7).toFixed(2)} د/يوم × 7 أيام = ${item.config?.weeklyPoints} درجات)` 
                                    : '0 درجة / يوم'}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {item.configType === 'multi_session' && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white p-2 rounded-xl border border-amber-200">
                              <label className="text-[10px] text-slate-600 font-bold block mb-1">درجة كل جلسة / تكليف</label>
                              <input
                                type="number"
                                value={item.config?.sessionPoints ?? 15}
                                onChange={(e) => handleConfigChange(idx, 'sessionPoints', Number(e.target.value))}
                                className="w-full p-1 bg-amber-50/50 border border-amber-300 rounded-lg text-xs font-black text-center text-maroon-800 font-mono"
                              />
                            </div>
                            <div className="bg-white p-2 rounded-xl border border-amber-200">
                              <label className="text-[10px] text-slate-600 font-bold block mb-1">عدد المرات بالسنة</label>
                              <input
                                type="number"
                                value={item.config?.targetCount ?? 6}
                                onChange={(e) => handleConfigChange(idx, 'targetCount', Number(e.target.value))}
                                className="w-full p-1 bg-amber-50/50 border border-amber-300 rounded-lg text-xs font-black text-center text-maroon-800 font-mono"
                              />
                            </div>
                          </div>
                        )}

                        {item.configType === 'bishopric' && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white p-2 rounded-xl border border-amber-200">
                              <label className="text-[10px] text-slate-600 font-bold block mb-1">درجة يوم المطرانية</label>
                              <input
                                type="number"
                                value={item.config?.dayPoints ?? 30}
                                onChange={(e) => handleConfigChange(idx, 'dayPoints', Number(e.target.value))}
                                className="w-full p-1 bg-amber-50/50 border border-amber-300 rounded-lg text-xs font-black text-center text-maroon-800 font-mono"
                              />
                            </div>
                            <div className="bg-white p-2 rounded-xl border border-amber-200">
                              <label className="text-[10px] text-slate-600 font-bold block mb-1">درجة كورس المطرانية</label>
                              <input
                                type="number"
                                value={item.config?.coursePoints ?? 80}
                                onChange={(e) => handleConfigChange(idx, 'coursePoints', Number(e.target.value))}
                                className="w-full p-1 bg-amber-50/50 border border-amber-300 rounded-lg text-xs font-black text-center text-maroon-800 font-mono"
                              />
                            </div>
                          </div>
                        )}

                        {item.configType === 'subjects_exam' && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white p-2 rounded-xl border border-amber-200">
                              <label className="text-[10px] text-slate-600 font-bold block mb-1">درجة امتحان كل مادة</label>
                              <input
                                type="number"
                                value={item.config?.subjectExamPoints ?? 40}
                                onChange={(e) => handleConfigChange(idx, 'subjectExamPoints', Number(e.target.value))}
                                className="w-full p-1 bg-amber-50/50 border border-amber-300 rounded-lg text-xs font-black text-center text-maroon-800 font-mono"
                              />
                            </div>
                            <div className="bg-white p-2 rounded-xl border border-amber-200">
                              <label className="text-[10px] text-slate-600 font-bold block mb-1">عدد المواد الدراسية</label>
                              <input
                                type="number"
                                value={item.config?.subjectsCount ?? 6}
                                onChange={(e) => handleConfigChange(idx, 'subjectsCount', Number(e.target.value))}
                                className="w-full p-1 bg-amber-50/50 border border-amber-300 rounded-lg text-xs font-black text-center text-maroon-800 font-mono"
                              />
                            </div>
                          </div>
                        )}

                        {item.configType === 'subjects_activity' && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white p-2 rounded-xl border border-amber-200">
                              <label className="text-[10px] text-slate-600 font-bold block mb-1">درجة نشاط المادة</label>
                              <input
                                type="number"
                                value={item.config?.subjectActivityPoints ?? 10}
                                onChange={(e) => handleConfigChange(idx, 'subjectActivityPoints', Number(e.target.value))}
                                className="w-full p-1 bg-amber-50/50 border border-amber-300 rounded-lg text-xs font-black text-center text-maroon-800 font-mono"
                              />
                            </div>
                            <div className="bg-white p-2 rounded-xl border border-amber-200">
                              <label className="text-[10px] text-slate-600 font-bold block mb-1">عدد المواد</label>
                              <input
                                type="number"
                                value={item.config?.subjectsCount ?? 6}
                                onChange={(e) => handleConfigChange(idx, 'subjectsCount', Number(e.target.value))}
                                className="w-full p-1 bg-amber-50/50 border border-amber-300 rounded-lg text-xs font-black text-center text-maroon-800 font-mono"
                              />
                            </div>
                          </div>
                        )}

                        {item.configType === 'single_value' && (
                          <div className="bg-white p-2 rounded-xl border border-amber-200">
                            <label className="text-[10px] text-slate-600 font-bold block mb-1">الدرجة المحددة</label>
                            <input
                              type="number"
                              value={item.config?.singlePoints ?? 0}
                              onChange={(e) => handleConfigChange(idx, 'singlePoints', Number(e.target.value))}
                              className="w-full p-1 bg-amber-50/50 border border-amber-300 rounded-lg text-xs font-black text-center text-maroon-800 font-mono"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Formula & Explanation Field */}
                    <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[11px] text-slate-500 font-bold block">طريقة الحساب والشرح:</span>
                      {isEditing ? (
                        <textarea
                          rows={2}
                          value={item.formula}
                          onChange={(e) => handleItemChange(idx, 'formula', e.target.value)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-maroon-800 resize-none leading-relaxed"
                          placeholder="طريقة توزيع وحساب الدرجة..."
                        />
                      ) : (
                        <p className="text-xs text-slate-700 leading-relaxed font-medium">
                          {item.formula || '—'}
                        </p>
                      )}
                    </div>

                    {/* Tracking Method Field */}
                    <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500 font-bold shrink-0">طريقة الرصد:</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={item.note}
                          onChange={(e) => handleItemChange(idx, 'note', e.target.value)}
                          className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-maroon-800"
                          placeholder="رصد تلقائي / رصد يدوي من الخادم..."
                        />
                      ) : (
                        <span className="text-[11px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          {item.note || 'تلقائي'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View (visible on screens >= md) */}
              <div className="hidden md:block border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
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
                      {visibleItems.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3 text-center font-bold text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-900">
                            {isEditing ? (
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg text-sm font-bold"
                              />
                            ) : item.name}
                          </td>
                          <td className="p-3 text-center">
                            {isEditing ? (
                              <input
                                type="text"
                                value={item.freq}
                                onChange={(e) => handleItemChange(idx, 'freq', e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg text-xs text-center font-bold"
                              />
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-semibold text-[11px]">
                                {item.freq}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-600">
                            {isEditing ? (
                              <textarea
                                rows={2}
                                value={item.formula}
                                onChange={(e) => handleItemChange(idx, 'formula', e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg text-xs leading-relaxed"
                              />
                            ) : item.formula}
                          </td>
                          <td className="p-3 text-center font-black font-mono text-sm">
                            {isEditing ? (
                              <input
                                type="number"
                                value={item.max}
                                onChange={(e) => handleItemChange(idx, 'max', Number(e.target.value))}
                                className="w-20 p-2 border border-slate-300 rounded-lg text-sm text-center font-bold font-mono"
                              />
                            ) : (
                              Number(item.max) > 0 ? (
                                <span className="text-maroon-800">{item.max}</span>
                              ) : (
                                <span className="text-slate-400 font-normal">0 (غير محدد)</span>
                              )
                            )}
                          </td>
                          <td className="p-3 text-[11px] text-slate-500 font-medium">
                            {isEditing ? (
                              <input
                                type="text"
                                value={item.note}
                                onChange={(e) => handleItemChange(idx, 'note', e.target.value)}
                                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                              />
                            ) : item.note}
                          </td>
                          {isEditing && (
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleDeleteItem(idx)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all"
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
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all"
                >
                  إلغاء التعديل
                </button>
                <button
                  onClick={() => handleSaveToFirestore(false)}
                  disabled={saving}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                  title="حفظ التعديلات في السيرفر كمسودة فقط دون أن تظهر للمخدومين"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'جاري الحفظ...' : 'حفظ كمسودة 💾'}
                </button>
                <button
                  onClick={() => handleSaveToFirestore(true)}
                  disabled={saving}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                  title="نشر اللائحة رسمياً وإتاحة البنود المحددة للمخدومين"
                >
                  <Send className="w-3.5 h-3.5" />
                  {saving ? 'جاري النشر...' : 'اعتماد ونشر للمخدومين 🚀'}
                </button>
              </div>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccess}</span>
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
