import React, { useState, useMemo } from 'react';
import { 
  ArrowLeftRight, X, CheckCircle, Calendar, Layers, User, 
  BookOpen, Bell, ArrowRight, ArrowLeft
} from 'lucide-react';

// دالة مساعدة لتنسيق اسم المتكلم
function getSpeakerText(session) {
  if (!session) return 'فارغ';
  if (session.speakerType === 'external') {
    const title = session.externalTitle || 'أستاذ';
    const name = session.externalName || session.speakerName || '';
    return name ? `${title} ${name}` : 'متكلم خارجي';
  }
  return session.speakerName || session.externalName || 'لم يُحدد';
}

// دالة وصف مختصر للفقرة
function getSessionSummary(session) {
  if (!session || (!session.title && !session.speakerName && !session.externalName)) {
    return '— فارغ —';
  }
  const title = session.title ? `«${session.title}»` : 'بدون عنوان';
  const speaker = getSpeakerText(session);
  return `${session.subject || 'فقرة'}: ${title} (${speaker})`;
}

export default function ServantCurriculumSwapModal({
  isOpen,
  onClose,
  curricula = [],
  initialFridayId = null,
  initialSessionKey = 'session2',
  onApplySwap,
  saving = false
}) {
  // تجميع كافة جمعات الشهور المسجلة في مصفوفة مسطحة
  const allFridays = useMemo(() => {
    const list = [];
    (curricula || []).forEach((monthDoc, mIdx) => {
      (monthDoc.fridays || []).forEach((f, fIdx) => {
        list.push({
          monthDocId: monthDoc.docId || monthDoc.id,
          monthId: monthDoc.id,
          monthName: monthDoc.monthName,
          year: monthDoc.year,
          monthIndex: mIdx,
          fridayIndex: fIdx,
          friday: f
        });
      });
    });
    return list;
  }, [curricula]);

  // الطرف الأول
  const [sourceFridayId, setSourceFridayId] = useState(initialFridayId || (allFridays[0]?.friday?.id || ''));
  const [sourceSessionKey, setSourceSessionKey] = useState(initialSessionKey || 'session2');

  // الطرف الثاني
  const [targetFridayId, setTargetFridayId] = useState('');
  const [targetSessionKey, setTargetSessionKey] = useState('session2');

  // تحديث الطرف الأول عند فتح النافذة
  React.useEffect(() => {
    if (initialFridayId) {
      setSourceFridayId(initialFridayId);
    } else if (allFridays.length > 0 && !sourceFridayId) {
      setSourceFridayId(allFridays[0]?.friday?.id || '');
    }
    if (initialSessionKey) {
      setSourceSessionKey(initialSessionKey);
    }
  }, [initialFridayId, initialSessionKey, allFridays]);

  // تعيين طرف ثانٍ افتراضي مختلف عن الطرف الأول
  React.useEffect(() => {
    if (allFridays.length > 1) {
      const other = allFridays.find(f => f.friday.id !== sourceFridayId);
      if (other && (!targetFridayId || targetFridayId === sourceFridayId)) {
        setTargetFridayId(other.friday.id);
      }
    }
  }, [sourceFridayId, allFridays]);

  // كائن الجمعة للطرفين
  const sourceItem = useMemo(() => {
    return allFridays.find(item => item.friday.id === sourceFridayId) || null;
  }, [allFridays, sourceFridayId]);

  const targetItem = useMemo(() => {
    return allFridays.find(item => item.friday.id === targetFridayId) || null;
  }, [allFridays, targetFridayId]);

  const sourceSession = sourceItem?.friday ? sourceItem.friday[sourceSessionKey] : null;
  const targetSession = targetItem?.friday ? targetItem.friday[targetSessionKey] : null;

  // التحقق من صلاحية التبديل (جمعتين مختلفتين)
  const isValidSwap = Boolean(
    sourceItem && targetItem && 
    sourceItem.friday.id !== targetItem.friday.id &&
    sourceSession && targetSession
  );

  // حساب النتيجة المعاينة للتبديل
  const previewData = useMemo(() => {
    if (!isValidSwap) return null;

    const clonedCurricula = JSON.parse(JSON.stringify(curricula));

    // تحديد مكان الجمعتين داخل النسخة المستنسخة
    let clonedSourceFriday = null;
    let clonedTargetFriday = null;

    clonedCurricula.forEach(mDoc => {
      (mDoc.fridays || []).forEach(f => {
        if (f.id === sourceItem.friday.id) clonedSourceFriday = f;
        if (f.id === targetItem.friday.id) clonedTargetFriday = f;
      });
    });

    if (!clonedSourceFriday || !clonedTargetFriday) return null;

    // استنساخ الفقرتين
    const originalSource = JSON.parse(JSON.stringify(clonedSourceFriday[sourceSessionKey] || {}));
    const originalTarget = JSON.parse(JSON.stringify(clonedTargetFriday[targetSessionKey] || {}));

    // التبديل
    clonedSourceFriday[sourceSessionKey] = JSON.parse(JSON.stringify(originalTarget));
    clonedTargetFriday[targetSessionKey] = JSON.parse(JSON.stringify(originalSource));

    // ضبط التذكيرات: الجمعة الأسبق زمنياً تُعتبر الحالية/القادمة وتُعلّم بالتذكير، بينما الجمعة المستقبلية تُصفر
    const isSourceEarlier = (clonedSourceFriday.date || '') <= (clonedTargetFriday.date || '');

    if (isSourceEarlier) {
      clonedSourceFriday[sourceSessionKey].reminderSent = true;
      clonedSourceFriday[sourceSessionKey].wednesdayReminderSent = true;

      clonedTargetFriday[targetSessionKey].reminderSent = false;
      clonedTargetFriday[targetSessionKey].wednesdayReminderSent = false;
      clonedTargetFriday[targetSessionKey].whatsappSent = false;
      clonedTargetFriday[targetSessionKey].whatsappWednesdaySent = false;
    } else {
      clonedTargetFriday[targetSessionKey].reminderSent = true;
      clonedTargetFriday[targetSessionKey].wednesdayReminderSent = true;

      clonedSourceFriday[sourceSessionKey].reminderSent = false;
      clonedSourceFriday[sourceSessionKey].wednesdayReminderSent = false;
      clonedSourceFriday[sourceSessionKey].whatsappSent = false;
      clonedSourceFriday[sourceSessionKey].whatsappWednesdaySent = false;
    }

    // إعداد حمولة التنبيهات
    const notificationPayload = {
      sourceDisplayDate: sourceItem.friday.displayDate,
      sourceDate: sourceItem.friday.date,
      targetDisplayDate: targetItem.friday.displayDate,
      targetDate: targetItem.friday.date,
      // الخادم الذي انتقل إلى الطرف الأول
      incomingToSource: {
        servantId: originalTarget.speakerId,
        servantName: originalTarget.speakerName,
        topic: [originalTarget.subject, originalTarget.title].filter(Boolean).join(' - ') || 'كلمة الخدمة',
        newDateText: sourceItem.friday.displayDate
      },
      // الخادم الذي انتقل إلى الطرف الثاني
      movedToTarget: {
        servantId: originalSource.speakerId,
        servantName: originalSource.speakerName,
        topic: [originalSource.subject, originalSource.title].filter(Boolean).join(' - ') || 'كلمة الخدمة',
        newDateText: targetItem.friday.displayDate
      }
    };

    return {
      updatedCurricula: clonedCurricula,
      notificationPayload
    };
  }, [isValidSwap, curricula, sourceItem, targetItem, sourceSessionKey, targetSessionKey]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!previewData || !previewData.updatedCurricula) return;
    onApplySwap(previewData.updatedCurricula, previewData.notificationPayload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="max-w-2xl w-full bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col text-right">
        
        {/* شريط العنوان */}
        <div className="p-4 sm:p-5 bg-gradient-to-l from-maroon-900 via-maroon-800 to-maroon-950 text-white flex items-center justify-between border-b border-gold-400/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-gold-300">
              <ArrowLeftRight className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-gold-200 flex items-center gap-2">
                <span>تبديل فقرتين بين جمعتين</span>
                <span className="text-[10px] bg-amber-500 text-maroon-950 px-2 py-0.5 rounded-full font-bold">
                  تبادلي مباشر
                </span>
              </h3>
              <p className="text-xs text-gold-300/80 font-medium">
                تبديل خادم وموضوع فقرة معينة مع فقرة في جمعة أخرى مع ضبط المواعيد والتنبيهات
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* محتوى الاختيار والمعاينة */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          
          {/* الطرف الأول */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-black text-maroon-950 border-b border-slate-200/80 pb-1.5">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-maroon-800" />
                الطرف الأول (الجمعة الحالية / المعتذر عنها):
              </span>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
                الفقرة المراد استبدالها
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">الجمعة:</label>
                <select
                  value={sourceFridayId}
                  onChange={(e) => setSourceFridayId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-maroon-800"
                >
                  {allFridays.map(item => (
                    <option key={item.friday.id} value={item.friday.id}>
                      {item.friday.displayDate}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">الفقرة:</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSourceSessionKey('session1')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                      sourceSessionKey === 'session1'
                        ? 'bg-maroon-800 text-gold-300 border-maroon-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    فقرة أولى
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceSessionKey('session2')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                      sourceSessionKey === 'session2'
                        ? 'bg-maroon-800 text-gold-300 border-maroon-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    فقرة ثانية
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white p-2 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
              <span className="text-slate-500 font-bold">محتوى الفقرة الحالية:</span>
              <span className="font-black text-maroon-950">{getSessionSummary(sourceSession)}</span>
            </div>
          </div>

          {/* أيقونة التبديل الفاصلة */}
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900 shadow-2xs">
              <ArrowLeftRight className="w-4 h-4 rotate-90 sm:rotate-0" />
            </div>
          </div>

          {/* الطرف الثاني */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-black text-maroon-950 border-b border-slate-200/80 pb-1.5">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                الطرف الثاني (الجمعة البديلة المراد التبديل معها):
              </span>
              <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md">
                الفقرة التي ستبدّل مكانها
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">الجمعة البديلة:</label>
                <select
                  value={targetFridayId}
                  onChange={(e) => setTargetFridayId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-maroon-800"
                >
                  {allFridays.filter(f => f.friday.id !== sourceFridayId).map(item => (
                    <option key={item.friday.id} value={item.friday.id}>
                      {item.friday.displayDate}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">الفقرة البديلة:</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTargetSessionKey('session1')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                      targetSessionKey === 'session1'
                        ? 'bg-maroon-800 text-gold-300 border-maroon-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    فقرة أولى
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetSessionKey('session2')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                      targetSessionKey === 'session2'
                        ? 'bg-maroon-800 text-gold-300 border-maroon-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    فقرة ثانية
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white p-2 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
              <span className="text-slate-500 font-bold">محتوى الفقرة البديلة:</span>
              <span className="font-black text-amber-950">{getSessionSummary(targetSession)}</span>
            </div>
          </div>

          {/* المعاينة الحية للنتيجة بعد التبديل */}
          {isValidSwap && (
            <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-3.5 space-y-2 text-xs">
              <span className="font-black text-amber-950 block">المعاينة الحية للنتيجة بعد التبديل:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                  <span className="text-[10px] text-slate-400 font-bold block mb-0.5">{sourceItem.friday.displayDate}:</span>
                  <span className="font-black text-maroon-950">{getSessionSummary(targetSession)}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                  <span className="text-[10px] text-slate-400 font-bold block mb-0.5">{targetItem.friday.displayDate}:</span>
                  <span className="font-black text-maroon-950">{getSessionSummary(sourceSession)}</span>
                </div>
              </div>
            </div>
          )}

          {/* تنبيه التنبيهات التلقائية */}
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-950 rounded-2xl p-3 flex items-start gap-2.5 text-xs font-medium">
            <Bell className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
            <div>
              <span className="font-black text-amber-950 block">إرسال إشعارات تلقائية فورية عند الاعتماد:</span>
              سيتم فوراً إرسال إشعار تقديم موعد للخادم البديل، وإشعار بالموعد الجديد للخادم المعتذر، وإخطار قيادة الخدمة بتقرير التبديل.
            </div>
          </div>

        </div>

        {/* شريط الإجراءات السفلي */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs sm:text-sm cursor-pointer transition-all"
          >
            إلغاء الأمر ✕
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving || !isValidSwap}
            className="px-5 py-2.5 rounded-xl bg-maroon-800 hover:bg-maroon-900 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-md cursor-pointer transition-all disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4 text-gold-300" />
            <span>{saving ? 'جارٍ الاعتماد والتبديل...' : 'تأكيد التبديل وحفظ الجدول 🔁'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
