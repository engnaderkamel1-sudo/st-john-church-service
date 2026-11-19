import React, { useState, useMemo } from 'react';
import { 
  RefreshCw, X, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, 
  Calendar, Layers, FastForward, User, BookOpen, Clock, ShieldCheck
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

export default function ServantCurriculumShiftModal({
  isOpen,
  onClose,
  curricula = [],
  initialFridayId = null,
  onApplyShift,
  saving = false
}) {
  // تجميع كافة جمعات الشهور المسجلة في مصفوفة واحدة متسلسلة زمنياً
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

  // الجمعة المحددة كنقطة بداية للترحيل
  const [selectedFridayId, setSelectedFridayId] = useState(initialFridayId || (allFridays[0]?.friday?.id || ''));
  // نطاق الترحيل: 'session1' (فقرة 1 فقط) | 'session2' (فقرة 2 فقط) | 'all' (اليوم بالكامل)
  const [shiftScope, setShiftScope] = useState('session1');
  // اتجاه الترحيل: 'forward' (+أسبوع للأمام) | 'backward' (-أسبوع للخلف)
  const [direction, setDirection] = useState('forward');
  // تخطي الجمعات التي تحتوي على ندوة عامة
  const [skipMerged, setSkipMerged] = useState(true);

  // تحديث الجمعة المحددة عند فتح النافذة
  React.useEffect(() => {
    if (initialFridayId) {
      setSelectedFridayId(initialFridayId);
    } else if (allFridays.length > 0 && !selectedFridayId) {
      setSelectedFridayId(allFridays[0]?.friday?.id || '');
    }
  }, [initialFridayId, allFridays]);

  // حساب النتيجة المعاينة للترحيل (Preview Engine)
  const previewData = useMemo(() => {
    if (!allFridays.length || !selectedFridayId) return null;

    // استنساخ عميق لكافة الشهور
    const clonedCurricula = JSON.parse(JSON.stringify(curricula));

    // إعادة تسطيح الجمعات من النسخة المستنسخة للتعامل مع المراجع
    const clonedFlat = [];
    clonedCurricula.forEach((monthDoc, mIdx) => {
      (monthDoc.fridays || []).forEach((f, fIdx) => {
        clonedFlat.push({
          monthDoc,
          mIdx,
          fIdx,
          friday: f
        });
      });
    });

    const startFlatIdx = clonedFlat.findIndex(item => item.friday.id === selectedFridayId);
    if (startFlatIdx === -1) return null;

    // تصفية الجمعات المتأثرة بالترحيل بدءاً من الجمعة المختارة
    const affectedFridays = clonedFlat.slice(startFlatIdx);

    // إذا كان الترحيل لفقرة واحدة وتخطي الندوات مفعلاً:
    let chain = affectedFridays;
    if (shiftScope !== 'all' && skipMerged) {
      chain = affectedFridays.filter(item => !item.friday.isMerged);
    }

    if (chain.length === 0) return null;

    // تسجيل الوضع قبل الترحيل للمقارنة
    const beforeSnapshots = chain.map(item => ({
      fridayId: item.friday.id,
      displayDate: item.friday.displayDate,
      isMerged: item.friday.isMerged,
      mergedSummary: getSessionSummary(item.friday.mergedSession),
      session1Summary: getSessionSummary(item.friday.session1),
      session2Summary: getSessionSummary(item.friday.session2)
    }));

    let extraFridayCreated = null;

    // تطبيق منطق الترحيل للأمام (+1 أسبوع)
    if (direction === 'forward') {
      const lastChainItem = chain[chain.length - 1];
      const lastMonth = clonedCurricula[clonedCurricula.length - 1];

      // فحص إذا كان هناك محتوى في آخر جمعة يحتاج إضافة جمعة جديدة حتى لا يضيع
      let needsExtraFriday = false;
      if (shiftScope === 'session1') {
        needsExtraFriday = Boolean(lastChainItem.friday.session1?.title || lastChainItem.friday.session1?.speakerName);
      } else if (shiftScope === 'session2') {
        needsExtraFriday = Boolean(lastChainItem.friday.session2?.title || lastChainItem.friday.session2?.speakerName);
      } else {
        needsExtraFriday = Boolean(
          lastChainItem.friday.session1?.title || 
          lastChainItem.friday.session2?.title ||
          lastChainItem.friday.mergedSession?.title
        );
      }

      if (needsExtraFriday && lastMonth) {
        const extraCount = (lastMonth.fridays || []).length + 1;
        const newExtraFriday = {
          id: `f_${lastMonth.id}_extra_shift_${Date.now()}`,
          date: `${lastMonth.id}-${String(extraCount).padStart(2, '0')}`,
          displayDate: `جمعة إضافية (${lastMonth.monthName} ${lastMonth.year})`,
          dayNumber: extraCount,
          isMerged: false,
          notes: 'مضافة تلقائياً لاستيعاب الترحيل دون فقدان أي درس 📌',
          mergedSession: { subject: 'ندوة عامة', title: '', speakerType: 'internal', speakerId: '', speakerName: '', externalTitle: 'أستاذ', externalName: '', externalPhone: '', reminderSent: false, whatsappSent: false },
          session1: { subject: 'كتاب مقدس', title: '', speakerType: 'internal', speakerId: '', speakerName: '', externalTitle: 'طاسوني', externalName: '', externalPhone: '', reminderSent: false, whatsappSent: false },
          session2: { subject: 'طقس', title: '', speakerType: 'internal', speakerId: '', speakerName: '', externalTitle: 'طاسوني', externalName: '', externalPhone: '', reminderSent: false, whatsappSent: false }
        };

        lastMonth.fridays.push(newExtraFriday);
        const extraChainItem = {
          monthDoc: lastMonth,
          mIdx: clonedCurricula.length - 1,
          fIdx: lastMonth.fridays.length - 1,
          friday: newExtraFriday
        };
        chain.push(extraChainItem);
        extraFridayCreated = newExtraFriday;

        beforeSnapshots.push({
          fridayId: newExtraFriday.id,
          displayDate: newExtraFriday.displayDate,
          isMerged: false,
          mergedSummary: '— جمعة جديدة مضافة —',
          session1Summary: '— جمعة جديدة مضافة —',
          session2Summary: '— جمعة جديدة مضافة —'
        });
      }

      // تنفيذ الزحلقة للأمام من النهاية للبداية مع تصفير التذكيرات للأسابيع القادمة
      for (let i = chain.length - 1; i >= 1; i--) {
        const currentF = chain[i].friday;
        const prevF = chain[i - 1].friday;

        if (shiftScope === 'session1') {
          currentF.session1 = JSON.parse(JSON.stringify(prevF.session1));
          currentF.session1.reminderSent = false;
          currentF.session1.wednesdayReminderSent = false;
          currentF.session1.whatsappSent = false;
          currentF.session1.whatsappWednesdaySent = false;
        } else if (shiftScope === 'session2') {
          currentF.session2 = JSON.parse(JSON.stringify(prevF.session2));
          currentF.session2.reminderSent = false;
          currentF.session2.wednesdayReminderSent = false;
          currentF.session2.whatsappSent = false;
          currentF.session2.whatsappWednesdaySent = false;
        } else if (shiftScope === 'all') {
          currentF.session1 = JSON.parse(JSON.stringify(prevF.session1));
          currentF.session2 = JSON.parse(JSON.stringify(prevF.session2));
          currentF.isMerged = prevF.isMerged;
          currentF.mergedSession = JSON.parse(JSON.stringify(prevF.mergedSession));
          currentF.session1.reminderSent = false;
          currentF.session1.wednesdayReminderSent = false;
          currentF.session1.whatsappSent = false;
          currentF.session1.whatsappWednesdaySent = false;
          currentF.session2.reminderSent = false;
          currentF.session2.wednesdayReminderSent = false;
          currentF.session2.whatsappSent = false;
          currentF.session2.whatsappWednesdaySent = false;
          if (currentF.mergedSession) {
            currentF.mergedSession.reminderSent = false;
            currentF.mergedSession.wednesdayReminderSent = false;
            currentF.mergedSession.whatsappSent = false;
            currentF.mergedSession.whatsappWednesdaySent = false;
          }
        }
      }

      // اعتماد إرسال التنبيه التلقائي للجمعة القادمة مباشرة
      if (chain[1]?.friday) {
        if (shiftScope === 'session1' || shiftScope === 'all') {
          chain[1].friday.session1.reminderSent = true;
          chain[1].friday.session1.wednesdayReminderSent = true;
        }
        if (shiftScope === 'session2' || shiftScope === 'all') {
          chain[1].friday.session2.reminderSent = true;
          chain[1].friday.session2.wednesdayReminderSent = true;
        }
      }

      // إفراغ خانة الجمعة الأولى التي تأجلت
      const firstF = chain[0].friday;
      if (shiftScope === 'session1') {
        const origSubject = firstF.session1?.subject || 'كتاب مقدس';
        firstF.session1 = {
          subject: origSubject,
          title: '',
          speakerType: 'internal',
          speakerId: '',
          speakerName: '',
          speakerPhone: '',
          externalTitle: 'طاسوني',
          externalName: '',
          externalPhone: '',
          reminderSent: false,
          whatsappSent: false
        };
        firstF.notes = firstF.notes 
          ? `${firstF.notes} | تأجلت فقرة ${origSubject}` 
          : `تأجلت فقرة ${origSubject} للأسبوع التالي`;
      } else if (shiftScope === 'session2') {
        const origSubject = firstF.session2?.subject || 'طقس';
        firstF.session2 = {
          subject: origSubject,
          title: '',
          speakerType: 'internal',
          speakerId: '',
          speakerName: '',
          speakerPhone: '',
          externalTitle: 'طاسوني',
          externalName: '',
          externalPhone: '',
          reminderSent: false,
          whatsappSent: false
        };
        firstF.notes = firstF.notes 
          ? `${firstF.notes} | تأجلت فقرة ${origSubject}` 
          : `تأجلت فقرة ${origSubject} للأسبوع التالي`;
      } else if (shiftScope === 'all') {
        firstF.session1 = { subject: 'كتاب مقدس', title: '', speakerType: 'internal', speakerId: '', speakerName: '', speakerPhone: '', externalTitle: 'طاسوني', externalName: '', externalPhone: '', reminderSent: false, whatsappSent: false };
        firstF.session2 = { subject: 'طقس', title: '', speakerType: 'internal', speakerId: '', speakerName: '', speakerPhone: '', externalTitle: 'طاسوني', externalName: '', externalPhone: '', reminderSent: false, whatsappSent: false };
        firstF.isMerged = false;
        firstF.notes = firstF.notes 
          ? `${firstF.notes} | تأجل لقاء الخدمة بالكامل` 
          : 'تأجل لقاء الخدمة للأسبوع التالي';
      }
    } else {
      // ترحيل للخلف (-1 أسبوع)
      for (let i = 0; i < chain.length - 1; i++) {
        const currentF = chain[i].friday;
        const nextF = chain[i + 1].friday;

        if (shiftScope === 'session1') {
          currentF.session1 = JSON.parse(JSON.stringify(nextF.session1));
        } else if (shiftScope === 'session2') {
          currentF.session2 = JSON.parse(JSON.stringify(nextF.session2));
        } else if (shiftScope === 'all') {
          currentF.session1 = JSON.parse(JSON.stringify(nextF.session1));
          currentF.session2 = JSON.parse(JSON.stringify(nextF.session2));
          currentF.isMerged = nextF.isMerged;
          currentF.mergedSession = JSON.parse(JSON.stringify(nextF.mergedSession));
        }
      }

      // إفراغ الخانة الأخيرة
      const lastF = chain[chain.length - 1].friday;
      if (shiftScope === 'session1') {
        lastF.session1 = { subject: 'كتاب مقدس', title: '', speakerType: 'internal', speakerId: '', speakerName: '', speakerPhone: '', externalTitle: 'طاسوني', externalName: '', externalPhone: '', reminderSent: false, whatsappSent: false };
      } else if (shiftScope === 'session2') {
        lastF.session2 = { subject: 'طقس', title: '', speakerType: 'internal', speakerId: '', speakerName: '', speakerPhone: '', externalTitle: 'طاسوني', externalName: '', externalPhone: '', reminderSent: false, whatsappSent: false };
      }
    }

    // تجهيز مصفوفة المقارنة للعرض
    const comparisons = chain.map((item, idx) => {
      const before = beforeSnapshots[idx];
      let beforeText = '';
      let afterText = '';

      if (shiftScope === 'session1') {
        beforeText = before?.session1Summary || '—';
        afterText = getSessionSummary(item.friday.session1);
      } else if (shiftScope === 'session2') {
        beforeText = before?.session2Summary || '—';
        afterText = getSessionSummary(item.friday.session2);
      } else {
        beforeText = item.friday.isMerged ? before?.mergedSummary : `${before?.session1Summary} + ${before?.session2Summary}`;
        afterText = item.friday.isMerged ? getSessionSummary(item.friday.mergedSession) : `${getSessionSummary(item.friday.session1)} + ${getSessionSummary(item.friday.session2)}`;
      }

      return {
        fridayId: item.friday.id,
        displayDate: item.friday.displayDate,
        beforeText,
        afterText,
        isFirst: idx === 0,
        isExtra: item.friday.id === extraFridayCreated?.id
      };
    });

    // تجهيز حمولة الإشعارات التلقائية الفورية
    const upcomingF = chain[1]?.friday || null;
    const postponedServants = [];
    for (let i = 2; i < chain.length; i++) {
      const f = chain[i].friday;
      if (shiftScope === 'session1' || shiftScope === 'all') {
        const s = f.session1;
        if (s?.speakerId && s?.speakerType === 'internal') {
          postponedServants.push({
            servantId: s.speakerId,
            servantName: s.speakerName,
            topic: [s.subject, s.title].filter(Boolean).join(' - ') || 'كلمة الخدمة',
            dateText: f.displayDate
          });
        }
      }
      if (shiftScope === 'session2' || shiftScope === 'all') {
        const s = f.session2;
        if (s?.speakerId && s?.speakerType === 'internal') {
          postponedServants.push({
            servantId: s.speakerId,
            servantName: s.speakerName,
            topic: [s.subject, s.title].filter(Boolean).join(' - ') || 'كلمة الخدمة',
            dateText: f.displayDate
          });
        }
      }
    }

    const notificationPayload = {
      startFridayDisplayDate: chain[0]?.friday?.displayDate || '',
      upcomingFriday: upcomingF,
      upcomingSessionKey: shiftScope,
      postponedServants
    };

    return {
      updatedCurricula: clonedCurricula,
      comparisons,
      extraFridayCreated,
      totalShiftedWeeks: chain.length,
      notificationPayload
    };
  }, [allFridays, selectedFridayId, shiftScope, direction, skipMerged, curricula]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!previewData || !previewData.updatedCurricula) return;
    onApplyShift(previewData.updatedCurricula, previewData.notificationPayload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="max-w-3xl w-full bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col text-right">
        
        {/* شريط العنوان */}
        <div className="p-4 sm:p-5 bg-gradient-to-l from-maroon-900 via-maroon-800 to-maroon-950 text-white flex items-center justify-between border-b border-gold-400/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-gold-300">
              <RefreshCw className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-gold-200 flex items-center gap-2">
                <span>ترحيل وإعادة تدوير المنهج الذكي</span>
                <span className="text-[10px] bg-amber-500 text-maroon-950 px-2 py-0.5 rounded-full font-bold">
                  تلقائي عابر للشهور
                </span>
              </h3>
              <p className="text-xs text-gold-300/80 font-medium">
                ترحيل الفقرات المتأخرة للأسبوع التالي مع الخادم والموضوع وحفظ تسلسل الجدول
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

        {/* محتوى الإعدادات والمعاينة */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          
          {/* قسم ضبط معايير الترحيل */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            
            {/* اختيار جمعة البداية */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-maroon-800" />
                <span>بداية الترحيل من جمعة:</span>
              </label>
              <select
                value={selectedFridayId}
                onChange={(e) => setSelectedFridayId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-maroon-800"
              >
                {allFridays.map((item) => (
                  <option key={item.friday.id} value={item.friday.id}>
                    {item.friday.displayDate} {item.friday.isMerged ? '★ (ندوة عامة)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* تحديد نطاق الترحيل */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-maroon-800" />
                <span>نطاق الفقرات المراد ترحيلها:</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setShiftScope('session1')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                    shiftScope === 'session1'
                      ? 'bg-maroon-800 text-gold-300 border-maroon-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  الفقرة 1 فقط
                </button>
                <button
                  type="button"
                  onClick={() => setShiftScope('session2')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                    shiftScope === 'session2'
                      ? 'bg-maroon-800 text-gold-300 border-maroon-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  الفقرة 2 فقط
                </button>
                <button
                  type="button"
                  onClick={() => setShiftScope('all')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                    shiftScope === 'all'
                      ? 'bg-maroon-800 text-gold-300 border-maroon-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  اليوم بالكامل
                </button>
              </div>
            </div>

            {/* اتجاه الترحيل وتخطي الندوات */}
            <div className="sm:col-span-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/80">
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDirection('forward')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all border ${
                    direction === 'forward'
                      ? 'bg-amber-100 text-amber-950 border-amber-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <ArrowRight className="w-3.5 h-3.5 text-amber-800" />
                  <span>تأجيل للأمام (+أسبوع)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDirection('backward')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all border ${
                    direction === 'backward'
                      ? 'bg-amber-100 text-amber-950 border-amber-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-amber-800" />
                  <span>تقديم للخلف (-أسبوع)</span>
                </button>
              </div>

              {shiftScope !== 'all' && (
                <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 select-none">
                  <input
                    type="checkbox"
                    checked={skipMerged}
                    onChange={(e) => setSkipMerged(e.target.checked)}
                    className="rounded text-maroon-800 focus:ring-maroon-800 cursor-pointer"
                  />
                  <span>تخطي الجمعات التي تحتوي على ندوة عامة تلقائياً</span>
                </label>
              )}
            </div>
          </div>

          {/* تنبيه حماية المنهج */}
          {previewData?.extraFridayCreated && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-3 flex items-start gap-2.5 text-xs font-medium">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-black text-emerald-950 block">تم توليد جمعة إضافية في نهاية الجدول تلقائياً:</span>
                نظراً لوجود درس في آخر جمعة، تمت إضافة جمعة جديدة لاستيعاب الدرس المرحل وحماية المنهج من ضياع أي موضوع.
              </div>
            </div>
          )}

          {/* تنبيه الإشعارات التلقائية الفورية */}
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-950 rounded-2xl p-3 flex items-start gap-2.5 text-xs font-medium">
            <Bell className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
            <div>
              <span className="font-black text-amber-950 block">إشعارات وتنبيهات تلقائية فورية عند الاعتماد:</span>
              سيتم فوراً إرسال إشعار عاجل للخادم المكلف بالجمعة القادمة، وإشعارات تأجيل للخدام المؤجلين، وإشعار تقرير لأمين الخدمة والمشرف العام.
            </div>
          </div>

          {/* جدول المعاينة الحية قبل الاعتماد */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-black text-slate-800 px-1">
              <span className="flex items-center gap-1.5">
                <FastForward className="w-4 h-4 text-maroon-800" />
                <span>المعاينة الحية للتعديلات (قبل الاعتماد):</span>
              </span>
              <span className="text-slate-500 font-bold">
                عدد الأسابيع المتأثرة بالترحيل: {previewData?.totalShiftedWeeks || 0}
              </span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 bg-white">
                {previewData?.comparisons?.map((comp, idx) => (
                  <div 
                    key={comp.fridayId || idx}
                    className={`p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
                      comp.isFirst 
                        ? 'bg-amber-50/70 border-r-4 border-r-amber-500' 
                        : comp.isExtra
                        ? 'bg-emerald-50/70 border-r-4 border-r-emerald-500'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="sm:w-44 shrink-0 font-black text-slate-900 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span>{comp.displayDate}</span>
                      {comp.isFirst && (
                        <span className="text-[10px] bg-amber-500 text-maroon-950 px-1.5 py-0.2 rounded font-bold">
                          المتأخرة
                        </span>
                      )}
                      {comp.isExtra && (
                        <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">
                          إضافية
                        </span>
                      )}
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-slate-100 p-2 rounded-xl text-slate-600 border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold block mb-0.5">الحالي:</span>
                        <span className="font-semibold">{comp.beforeText}</span>
                      </div>
                      <div className="bg-amber-50 p-2 rounded-xl text-amber-950 border border-amber-200">
                        <span className="text-[10px] text-amber-700 font-bold block mb-0.5">بعد الترحيل ⬅:</span>
                        <span className="font-black">{comp.afterText}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
            disabled={saving || !previewData}
            className="px-5 py-2.5 rounded-xl bg-maroon-800 hover:bg-maroon-900 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-md cursor-pointer transition-all disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4 text-gold-300" />
            <span>{saving ? 'جارٍ الاعتماد والحفظ...' : 'اعتماد وحفظ الترحيل في المنظومة 🚀'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
