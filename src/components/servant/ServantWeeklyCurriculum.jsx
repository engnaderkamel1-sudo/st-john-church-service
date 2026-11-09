import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar, Clock, Users, User, Phone, MessageSquare, Send, Bell, 
  CheckCircle, Plus, Edit3, Save, Trash2, ChevronLeft, ChevronRight, 
  Printer, Sparkles, AlertCircle, Share2, Eye, ShieldCheck, Check, RefreshCw
} from 'lucide-react';
import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, 
  onSnapshot, serverTimestamp, query, orderBy, addDoc 
} from 'firebase/firestore';
import { db } from '../../firebase';
import { triggerServerPush } from '../../services/webPushService';

// الأشهر باللغة العربية
const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

// ألقاب المتكلم الخارجي المعتمدة كنسياً
const EXTERNAL_TITLES = ['أبونا', 'أستاذ', 'طاسوني'];

// بيانات الخدام الحقيقية المعتمدة لربط التنبيهات
const REAL_SERVANTS = {
  aghapy: {
    id: 'vB3UKbTyDTQz3XhDIPBQ',
    name: 'طاسوني اغابي اسحق',
    phone: '01225278458'
  },
  nader: {
    id: '7QfEDKZXwTB1QdtB6slC',
    name: 'Nader Reda Labib',
    phone: '01275571569'
  },
  hanaa: {
    id: 'TEjV6XAHf3cYmGkjnnCc',
    name: 'هناء فكري شفيق',
    phone: '01226862261'
  },
  afaf: {
    id: '0zzWT0Bs2PcQdJN77C8A',
    name: 'عفاف كمال عبدالنور',
    phone: '01024682928'
  }
};

// دالة توليد أيام الجمعة لأي شهر وسنة
function generateFridaysForMonth(year, monthIndex) {
  const fridays = [];
  const date = new Date(year, monthIndex, 1);
  const mName = ARABIC_MONTHS[monthIndex];

  while (date.getMonth() === monthIndex) {
    if (date.getDay() === 5) { // 5 = Friday
      const dNum = date.getDate();
      const mStr = String(monthIndex + 1).padStart(2, '0');
      const dStr = String(dNum).padStart(2, '0');
      const dateId = `${year}-${mStr}-${dStr}`;
      
      fridays.push({
        id: `f_${dateId}`,
        date: dateId,
        displayDate: `الجمعة ${dNum} ${mName} ${year}`,
        dayNumber: dNum,
        isMerged: false,
        notes: '',
        mergedSession: {
          title: '',
          speakerType: 'internal',
          speakerId: '',
          speakerName: '',
          externalTitle: 'أستاذ',
          externalName: '',
          externalPhone: '',
          reminderSent: false,
          whatsappSent: false
        },
        session1: {
          title: '',
          speakerType: 'internal',
          speakerId: '',
          speakerName: '',
          externalTitle: 'أستاذ',
          externalName: '',
          externalPhone: '',
          reminderSent: false,
          whatsappSent: false
        },
        session2: {
          title: '',
          speakerType: 'internal',
          speakerId: '',
          speakerName: '',
          externalTitle: 'أستاذ',
          externalName: '',
          externalPhone: '',
          reminderSent: false,
          whatsappSent: false
        }
      });
    }
    date.setDate(date.getDate() + 1);
  }
  return fridays;
}

// بناء البيانات الأولية المعتمدة لشهري نوفمبر وديسمبر 2026 المطابقة للورقة الفعلية
function buildRealScheduleDocs(uploadedByName = 'أمين الخدمة') {
  // 1. شهر نوفمبر 2026
  const novFridays = generateFridaysForMonth(2026, 10); // 10 = نوفمبر
  novFridays.forEach(f => {
    if (f.date === '2026-11-06' || f.dayNumber === 6) {
      f.session1.title = 'لقاء تمهيدي وإعلان نظام دورة إعداد الخدام';
      f.session1.speakerId = REAL_SERVANTS.hanaa.id;
      f.session1.speakerName = REAL_SERVANTS.hanaa.name;
      f.session1.speakerPhone = REAL_SERVANTS.hanaa.phone;
      f.session2.title = 'توجيهات روحية ومنهجية وتوزيع المراجع';
      f.session2.speakerId = REAL_SERVANTS.nader.id;
      f.session2.speakerName = REAL_SERVANTS.nader.name;
      f.session2.speakerPhone = REAL_SERVANTS.nader.phone;
    } else if (f.date === '2026-11-13' || f.dayNumber === 13) {
      f.session1.title = 'تك 25 - 44 (دراسة سفر التكوين)';
      f.session1.speakerId = REAL_SERVANTS.aghapy.id;
      f.session1.speakerName = REAL_SERVANTS.aghapy.name;
      f.session1.speakerPhone = REAL_SERVANTS.aghapy.phone;
      f.session2.title = 'مهارات خادم إعداد خدام';
      f.session2.speakerId = REAL_SERVANTS.afaf.id;
      f.session2.speakerName = REAL_SERVANTS.afaf.name;
      f.session2.speakerPhone = REAL_SERVANTS.afaf.phone;
    } else if (f.date === '2026-11-20' || f.dayNumber === 20) {
      f.session1.title = 'تك 45 - 50 (دراسة سفر التكوين)';
      f.session1.speakerId = REAL_SERVANTS.nader.id;
      f.session1.speakerName = REAL_SERVANTS.nader.name;
      f.session1.speakerPhone = REAL_SERVANTS.nader.phone;
      f.session2.title = 'طقس الكنيسة القبطية الأرثوذكسية';
      f.session2.speakerId = REAL_SERVANTS.hanaa.id;
      f.session2.speakerName = REAL_SERVANTS.hanaa.name;
      f.session2.speakerPhone = REAL_SERVANTS.hanaa.phone;
    } else if (f.date === '2026-11-27' || f.dayNumber === 27) {
      f.session1.title = 'خر 1 - 7 (دراسة سفر الخروج)';
      f.session1.speakerId = REAL_SERVANTS.hanaa.id;
      f.session1.speakerName = REAL_SERVANTS.hanaa.name;
      f.session1.speakerPhone = REAL_SERVANTS.hanaa.phone;
      f.session2.title = 'طقس الكنيسة القبطية الأرثوذكسية';
      f.session2.speakerId = REAL_SERVANTS.afaf.id;
      f.session2.speakerName = REAL_SERVANTS.afaf.name;
      f.session2.speakerPhone = REAL_SERVANTS.afaf.phone;
    }
  });

  const novDoc = {
    id: '2026-11',
    year: 2026,
    month: 11,
    monthName: 'نوفمبر',
    title: 'منهج شهر نوفمبر 2026',
    published: true,
    fridays: novFridays,
    updatedBy: uploadedByName
  };

  // 2. شهر ديسمبر 2026
  const decFridays = generateFridaysForMonth(2026, 11); // 11 = ديسمبر
  decFridays.forEach(f => {
    if (f.date === '2026-12-04' || f.dayNumber === 4) {
      f.session1.title = 'خر 8 - 14 (دراسة سفر الخروج)';
      f.session1.speakerId = REAL_SERVANTS.afaf.id;
      f.session1.speakerName = REAL_SERVANTS.afaf.name;
      f.session1.speakerPhone = REAL_SERVANTS.afaf.phone;
      f.session2.title = 'عقيدة أرثوذكسية';
      f.session2.speakerId = REAL_SERVANTS.nader.id;
      f.session2.speakerName = REAL_SERVANTS.nader.name;
      f.session2.speakerPhone = REAL_SERVANTS.nader.phone;
    } else if (f.date === '2026-12-11' || f.dayNumber === 11) {
      f.session1.title = 'خر 15 - 21 (دراسة سفر الخروج)';
      f.session1.speakerId = REAL_SERVANTS.nader.id;
      f.session1.speakerName = REAL_SERVANTS.nader.name;
      f.session1.speakerPhone = REAL_SERVANTS.nader.phone;
      f.session2.title = 'عقيدة أرثوذكسية';
      f.session2.speakerId = REAL_SERVANTS.hanaa.id;
      f.session2.speakerName = REAL_SERVANTS.hanaa.name;
      f.session2.speakerPhone = REAL_SERVANTS.hanaa.phone;
    } else if (f.date === '2026-12-18' || f.dayNumber === 18) {
      f.session1.title = 'خر 22 - 28 (دراسة سفر الخروج)';
      f.session1.speakerId = REAL_SERVANTS.aghapy.id;
      f.session1.speakerName = REAL_SERVANTS.aghapy.name;
      f.session1.speakerPhone = REAL_SERVANTS.aghapy.phone;
      f.session2.title = 'عقيدة أرثوذكسية';
      f.session2.speakerId = REAL_SERVANTS.afaf.id;
      f.session2.speakerName = REAL_SERVANTS.afaf.name;
      f.session2.speakerPhone = REAL_SERVANTS.afaf.phone;
    } else if (f.date === '2026-12-25' || f.dayNumber === 25) {
      f.session1.title = 'خر 29 - 35 (دراسة سفر الخروج)';
      f.session1.speakerId = REAL_SERVANTS.afaf.id;
      f.session1.speakerName = REAL_SERVANTS.afaf.name;
      f.session1.speakerPhone = REAL_SERVANTS.afaf.phone;
      f.session2.title = 'عقيدة أرثوذكسية';
      f.session2.speakerId = REAL_SERVANTS.hanaa.id;
      f.session2.speakerName = REAL_SERVANTS.hanaa.name;
      f.session2.speakerPhone = REAL_SERVANTS.hanaa.phone;
    }
  });

  const decDoc = {
    id: '2026-12',
    year: 2026,
    month: 12,
    monthName: 'ديسمبر',
    title: 'منهج شهر ديسمبر 2026',
    published: true,
    fridays: decFridays,
    updatedBy: uploadedByName
  };

  return [novDoc, decDoc];
}

export default function ServantWeeklyCurriculum({ 
  user, 
  isAppAdmin, 
  isServantLeader, 
  allUsers = [] 
}) {
  // تهيئة الحالة الأولية مسبقاً بالجدول الفعلي لمنع أي شاشة فارغة
  const initialDocs = useMemo(() => buildRealScheduleDocs(user?.fullName || 'أمين الخدمة'), [user?.fullName]);
  const [curricula, setCurricula] = useState(initialDocs);
  const [loading, setLoading] = useState(false);
  const [activeMonthKey, setActiveMonthKey] = useState('2026-11');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showAddMonthModal, setShowAddMonthModal] = useState(false);
  const [newMonthYear, setNewMonthYear] = useState(new Date().getFullYear());
  const [newMonthIndex, setNewMonthIndex] = useState(new Date().getMonth());
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const hasAutoSeededRef = useRef(false);

  // استخراج قائمة خدام المنظومة المعتمدين للاختيار السريع
  const registeredServants = useMemo(() => {
    return (allUsers || []).filter(u => 
      (u.role === 'servant' || u.role === 'servant_leader' || u.role === 'admin') &&
      u.status !== 'inactive' && u.status !== 'suspended' && u.status !== 'rejected'
    );
  }, [allUsers]);

  // إظهار رسالة تأكيد مؤقتة
  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 4500);
  };

  // دالة الحفظ الذاتي لجدول نوفمبر وديسمبر في قاعدة البيانات
  const persistRealScheduleToFirestore = async (notifyUser = false) => {
    setSaving(true);
    try {
      const [novDoc, decDoc] = buildRealScheduleDocs(user?.fullName || 'أمين الخدمة');
      await setDoc(doc(db, 'service_curriculum', 'weekly_2026-11'), {
        ...novDoc,
        isWeeklyCurriculum: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      await setDoc(doc(db, 'service_curriculum', 'weekly_2026-12'), {
        ...decDoc,
        isWeeklyCurriculum: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      if (notifyUser) {
        showToast('تم تثبيت وتحديث جدول الورقة الحقيقي بنجاح 📋');
      }
    } catch (err) {
      console.warn('Auto-seed sync warning:', err);
    } finally {
      setSaving(false);
    }
  };

  // المزامنة الحية مع مجموعة المنهج المعتمدة بصلاحيات كاملة
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'service_curriculum'), (snap) => {
      const list = snap.docs
        .filter(d => d.id.startsWith('weekly_') || d.data().isWeeklyCurriculum === true)
        .map(d => {
          const rawId = d.id.startsWith('weekly_') ? d.id.replace('weekly_', '') : d.id;
          return { id: rawId, docId: d.id, ...d.data() };
        });

      list.sort((a, b) => {
        if (a.year !== b.year) return (b.year || 0) - (a.year || 0);
        return (b.month || 0) - (a.month || 0);
      });

      if (list.length === 0) {
        // إذا كانت فارغة في قاعدة البيانات، نقوم بالحفظ التلقائي فوراً
        if (!hasAutoSeededRef.current) {
          hasAutoSeededRef.current = true;
          persistRealScheduleToFirestore(false);
        }
      } else {
        // ضمان تنظيف أي أوقات قديمة تلقائياً لتظهر دائماً كفقرة أولى وثانية فقط
        const sanitizedList = list.map(item => ({
          ...item,
          fridays: (item.fridays || []).map(f => {
            const cleanF = { ...f };
            if (cleanF.session1) { delete cleanF.session1.time; }
            if (cleanF.session2) { delete cleanF.session2.time; }
            if (cleanF.mergedSession) { delete cleanF.mergedSession.time; }
            return cleanF;
          })
        }));
        setCurricula(sanitizedList);
        if (!activeMonthKey || !sanitizedList.some(c => c.id === activeMonthKey)) {
          setActiveMonthKey(sanitizedList[0]?.id || '2026-11');
        }
      }
      setLoading(false);
    }, (err) => {
      console.warn('Weekly curriculum sync warning:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [activeMonthKey]);

  // المنهج المختار حالياً
  const currentMonthData = useMemo(() => {
    return curricula.find(c => c.id === activeMonthKey) || curricula[0] || null;
  }, [curricula, activeMonthKey]);

  // تهيئة وضع التعديل عند اختيار شهر
  useEffect(() => {
    if (currentMonthData) {
      setEditData(JSON.parse(JSON.stringify(currentMonthData)));
    } else {
      setEditData(null);
    }
    setIsEditing(false);
  }, [currentMonthData]);

  // إنشاء شهر جديد
  const handleCreateNewMonth = async () => {
    const monthNum = newMonthIndex + 1;
    const monthKey = `${newMonthYear}-${String(monthNum).padStart(2, '0')}`;
    const monthName = ARABIC_MONTHS[newMonthIndex];

    const exists = curricula.some(c => c.id === monthKey);
    if (exists) {
      alert(`منهج شهر ${monthName} ${newMonthYear} مضاف بالفعل.`);
      setActiveMonthKey(monthKey);
      setShowAddMonthModal(false);
      return;
    }

    setSaving(true);
    try {
      const generatedFridays = generateFridaysForMonth(newMonthYear, newMonthIndex);
      const docKey = `weekly_${monthKey}`;
      const newDoc = {
        id: monthKey,
        docId: docKey,
        isWeeklyCurriculum: true,
        year: newMonthYear,
        month: monthNum,
        monthName: monthName,
        title: `منهج شهر ${monthName} ${newMonthYear}`,
        published: false,
        fridays: generatedFridays,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: user?.fullName || 'خادم'
      };

      await setDoc(doc(db, 'service_curriculum', docKey), newDoc);
      setActiveMonthKey(monthKey);
      setShowAddMonthModal(false);
      setIsEditing(true);
      showToast(`تم إنشاء وتوليد جمعات شهر ${monthName} ${newMonthYear} بنجاح ✨`);
    } catch (err) {
      console.error('Error creating new month:', err);
      alert('حدث خطأ أثناء إنشاء الشهر الجديد.');
    } finally {
      setSaving(false);
    }
  };

  // حفظ التعديلات
  const handleSaveCurriculum = async (publishToAll = false) => {
    if (!editData) return;
    setSaving(true);
    try {
      const docKey = editData.docId || (editData.id.startsWith('weekly_') ? editData.id : `weekly_${editData.id}`);
      const docRef = doc(db, 'service_curriculum', docKey);
      const updatedObj = {
        ...editData,
        isWeeklyCurriculum: true,
        published: publishToAll ? true : editData.published,
        updatedAt: serverTimestamp(),
        updatedBy: user?.fullName || 'أحد الخدام'
      };

      await setDoc(docRef, updatedObj, { merge: true });

      // إرسال إشعار عام للخدام عند النشر
      if (publishToAll) {
        await addDoc(collection(db, 'notifications'), {
          targetUserId: 'SERVANTS',
          title: `📢 تم رفع وتحديث توزيع منهج شهر ${editData.monthName} ${editData.year}`,
          desc: `خدامنا الأحباء، تم نشر واعتماد جدول توزيع منهج شهر ${editData.monthName} ${editData.year} في المنظومة. نتمنى لكم خدمة مثمرة ومباركة.`,
          time: 'الآن',
          type: 'weekly_curriculum',
          createdAt: serverTimestamp()
        });

        triggerServerPush({
          targetUserId: 'SERVANTS',
          title: `📢 تم رفع وتحديث توزيع منهج شهر ${editData.monthName} ${editData.year}`,
          body: `توزيع المنهج الأسبوعي ومسؤوليات الإلقاء والتحضير متاحة الآن على لوحة الخدمة.`,
          url: '/'
        }).catch(() => {});
      }

      setIsEditing(false);
      showToast(publishToAll ? 'تم حفظ ونشر المنهج وإشعار جميع الخدام بنجاح 📢' : 'تم حفظ التعديلات بنجاح 💾');
    } catch (err) {
      console.error('Error saving curriculum:', err);
      alert('حدث خطأ أثناء حفظ جدول المنهج: ' + (err?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  // حذف شهر بالكامل
  const handleDeleteMonth = async () => {
    if (!isAppAdmin && !isServantLeader) {
      alert('عفواً، حذف الشهر مقتصر على أمين الخدمة أو المشرف.');
      return;
    }
    if (!window.confirm(`هل أنت متأكد من حذف جدول شهر ${currentMonthData?.monthName} ${currentMonthData?.year} بالكامل؟`)) {
      return;
    }

    try {
      const docKey = currentMonthData?.docId || (activeMonthKey.startsWith('weekly_') ? activeMonthKey : `weekly_${activeMonthKey}`);
      await deleteDoc(doc(db, 'service_curriculum', docKey));
      setActiveMonthKey('');
      showToast('تم حذف جدول الشهر بنجاح.');
    } catch (err) {
      console.error('Error deleting month:', err);
      alert('حدث خطأ أثناء الحذف.');
    }
  };
    }
  };

  // دمج / فك دمج خانات الجمعة
  const handleToggleMergeFriday = (fridayIndex) => {
    if (!editData) return;
    const nextFridays = [...editData.fridays];
    const fr = nextFridays[fridayIndex];
    fr.isMerged = !fr.isMerged;
    setEditData({ ...editData, fridays: nextFridays });
  };

  // تعديل بيانات فقرة معينة في الجمعة
  const handleUpdateSessionField = (fridayIndex, sessionKey, field, value) => {
    if (!editData) return;
    const nextFridays = [...editData.fridays];
    const fr = nextFridays[fridayIndex];
    if (sessionKey === 'merged') {
      fr.mergedSession = { ...fr.mergedSession, [field]: value };
    } else {
      fr[sessionKey] = { ...fr[sessionKey], [field]: value };
    }
    setEditData({ ...editData, fridays: nextFridays });
  };

  // عند اختيار خادم مسجل من القائمة
  const handleSelectInternalSpeaker = (fridayIndex, sessionKey, servantId) => {
    const servant = registeredServants.find(s => s.id === servantId);
    if (!servant) return;
    handleUpdateSessionField(fridayIndex, sessionKey, 'speakerId', servant.id);
    handleUpdateSessionField(fridayIndex, sessionKey, 'speakerName', servant.fullName);
    handleUpdateSessionField(fridayIndex, sessionKey, 'speakerPhone', servant.phone || '');
  };

  // إرسال تذكير واتساب للمتكلم الخارجي (يدوياً حصراً)
  const handleSendWhatsAppToExternal = async (friday, session, sessionKey = 'session1') => {
    const title = session.externalTitle || 'أستاذ';
    const name = session.externalName || 'المتكلم';
    const topic = session.title || 'فقرة الخدمة';
    const dateText = friday.displayDate;
    const phone = (session.externalPhone || '').replace(/\D/g, '');

    if (!phone) {
      alert('يرجى التأكد من كتابة رقم الواتساب الخاص بالمتكلم أولاً.');
      return;
    }

    // الصياغة المعتمدة كنسياً وتنظيمياً
    const msg = `سلام ونعمة ${title} ${name}، نذكرك إن عليك فقرة باسم (${topic}) في إعداد خدام يوم ${dateText}، في انتظارك، وربنا يعوض تعب محبتك.`;

    let cleanPhone = phone;
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '2' + cleanPhone; // كود مصر الافتراضي
    }

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');

    // تسجيل حالة تمام الإرسال في قاعدة البيانات
    try {
      if (currentMonthData) {
        const docKey = currentMonthData.docId || (currentMonthData.id.startsWith('weekly_') ? currentMonthData.id : `weekly_${currentMonthData.id}`);
        const docRef = doc(db, 'service_curriculum', docKey);
        const nextFridays = currentMonthData.fridays.map(f => {
          if (f.id === friday.id) {
            const targetSession = sessionKey === 'merged' ? f.mergedSession : f[sessionKey];
            if (targetSession) {
              targetSession.whatsappSent = true;
            }
          }
          return f;
        });
        await updateDoc(docRef, { fridays: nextFridays }).catch(e => console.warn('Status update notice:', e));
        showToast(`تم فتح الواتساب بنجاح وإرسال التذكير لـ ${title} ${name} 💬`);
      }
    } catch (err) {
      console.warn('Notice updating whatsapp status:', err);
    }
  };

  // إرسال تذكير داخلي لخادم بالمنظومة (Web Push + In-App Notification)
  const handleSendInternalServantReminder = async (friday, session, sessionKey = 'session1') => {
    const servantId = session.speakerId;
    const servantName = session.speakerName || 'الخادم';
    const topic = session.title || 'المحاضرة';

    if (!servantId) {
      alert('يرجى اختيار الخادم المسجل أولاً لإرسال التنبيه لحسابه.');
      return;
    }

    const notifTitle = '📖 تذكير بتحضير فقرة إعداد الخدام';
    const notifDesc = `نذكرك بأن عليك تحضير يوم الجمعة القادمة في موضوع: (${topic})، برجاء التحضير وإرساله لأمين الخدمة بحد أقصى يوم الأربعاء. ربنا يبارك تعبك.`;

    try {
      // 1. إضافة إشعار داخل التطبيق لحساب الخادم
      await addDoc(collection(db, 'notifications'), {
        targetUserId: servantId,
        title: notifTitle,
        desc: notifDesc,
        time: 'الآن',
        type: 'weekly_curriculum',
        createdAt: serverTimestamp()
      });

      // 2. إرسال Push Notification للهاتف
      triggerServerPush({
        targetUserId: servantId,
        title: notifTitle,
        body: notifDesc,
        url: '/'
      }).catch(() => {});

      // 3. تحديث حالة إرسال التذكير
      if (currentMonthData) {
        const docKey = currentMonthData.docId || (currentMonthData.id.startsWith('weekly_') ? currentMonthData.id : `weekly_${currentMonthData.id}`);
        const docRef = doc(db, 'service_curriculum', docKey);
        const nextFridays = currentMonthData.fridays.map(f => {
          if (f.id === friday.id) {
            const targetSession = sessionKey === 'merged' ? f.mergedSession : f[sessionKey];
            if (targetSession) {
              targetSession.reminderSent = true;
            }
          }
          return f;
        });
        await updateDoc(docRef, { fridays: nextFridays }).catch(e => console.warn('Status update notice:', e));
      }

      showToast(`تم إرسال تذكير التحضير إلى الخادم (${servantName}) بنجاح 🔔`);
    } catch (err) {
      console.error('Error sending servant reminder:', err);
      alert('حدث خطأ أثناء إرسال التنبيه: ' + (err?.message || ''));
    }
    }
  };

  // حساب الجمعة القادمة لتسليط الضوء عليها والتنبيه الاستباقي
  const upcomingFridayInfo = useMemo(() => {
    if (!curricula || curricula.length === 0) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const c of curricula) {
      if (!c.fridays) continue;
      for (const f of c.fridays) {
        const parts = (f.date || '').split('-');
        if (parts.length === 3) {
          const fDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          if (fDate >= today) {
            return { monthData: c, friday: f, dateObj: fDate };
          }
        }
      }
    }
    return null;
  }, [curricula]);

  // إرسال تنبيه للمشرف وأمين الخدمة في حال وجود متكلم خارجي لم يتم تذكيره
  const pendingExternalSpeakers = useMemo(() => {
    if (!upcomingFridayInfo) return [];
    const f = upcomingFridayInfo.friday;
    const list = [];
    if (f.isMerged) {
      if (f.mergedSession?.speakerType === 'external' && !f.mergedSession?.whatsappSent) {
        list.push({ friday: f, session: f.mergedSession, sessionKey: 'merged' });
      }
    } else {
      if (f.session1?.speakerType === 'external' && !f.session1?.whatsappSent) {
        list.push({ friday: f, session: f.session1, sessionKey: 'session1' });
      }
      if (f.session2?.speakerType === 'external' && !f.session2?.whatsappSent) {
        list.push({ friday: f, session: f.session2, sessionKey: 'session2' });
      }
    }
    return list;
  }, [upcomingFridayInfo]);

  return (
    <div className="space-y-4 pb-12">
      {/* Toast Notification Alert */}
      {successToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-maroon-900 text-gold-200 border border-gold-400/40 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-maroon-950 via-maroon-900 to-maroon-800 text-white rounded-2xl p-4 shadow-sm border border-gold-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gold-400/10 border border-gold-400/20 text-gold-300">
                <Calendar className="w-5 h-5" />
              </div>
              <h2 className="text-base sm:text-lg font-black text-gold-100">
                توزيع المنهج الأسبوعي 📅
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              الجدول الزمني المعتمد لإعداد الخدام وتوزيع الموضوعات على الخدام والمتكلمين.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => persistRealScheduleToFirestore(true)}
              disabled={saving}
              className="px-3 py-1.5 rounded-xl bg-gold-400/20 hover:bg-gold-400/30 text-gold-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-gold-400/30"
              title="تثبيت أو إعادة تحديث جدول نوفمبر وديسمبر الفعلي في السيرفر"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
              <span>تثبيت جدول الورقة الفعلي 📋</span>
            </button>

            {curricula.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-white/10"
              >
                <Printer className="w-3.5 h-3.5 text-gold-300" />
                <span>عرض للطباعة 🖨️</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowAddMonthModal(true)}
              className="px-3 py-1.5 rounded-xl bg-gold-400 hover:bg-gold-500 text-maroon-950 text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة شهر جديد</span>
            </button>
          </div>
        </div>

        {/* Month Selector Pills */}
        {curricula.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {curricula.map((item) => {
              const isSelected = item.id === activeMonthKey;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveMonthKey(item.id);
                    setIsEditing(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-gold-400 text-maroon-950 shadow-sm scale-102'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{item.monthName} {item.year}</span>
                  {item.published ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="معتمد ومنشور" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="مسودة" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Leadership Alert: Pending External Speaker WhatsApp Notification */}
      {(isAppAdmin || isServantLeader) && pendingExternalSpeakers.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-400/40 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-900 rounded-xl shrink-0 mt-0.5">
              <Bell className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-950">
                  تنبيه أمين الخدمة والمشرف 💬
                </span>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-md font-bold">
                  تذكير الجمعة القادمة
                </span>
              </div>
              <p className="text-xs text-amber-900/90 mt-0.5 leading-relaxed">
                يوجد متكلم خارجي في لقاء الجمعة القادمة لم يتم إرسال تذكير الواتساب له بعد. اضغط بالأسفل لفتح المحادثة بلمسة واحدة:
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {pendingExternalSpeakers.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendWhatsAppToExternal(item.friday, item.session, item.sessionKey)}
                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>إرسال واتساب لـ ({item.session.externalTitle} {item.session.externalName || 'المتكلم'})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Friday Spotlight Card */}
      {upcomingFridayInfo && (
        <div className="bg-gradient-to-br from-amber-50 via-white to-gold-50/30 border border-gold-300 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between gap-2 border-b border-amber-100 pb-2 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-black text-maroon-900">
                لقاء الجمعة القادمة: {upcomingFridayInfo.friday.displayDate}
              </span>
            </div>
            <span className="text-[10px] bg-gold-400/20 text-maroon-950 border border-gold-400/40 px-2 py-0.5 rounded-md font-bold">
              اللقاء القادم ⛪
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
            {upcomingFridayInfo.friday.isMerged ? (
              <div className="md:col-span-2 p-2.5 rounded-xl bg-white border border-amber-200">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-maroon-900">
                    فقرة موحدة / ندوة: {upcomingFridayInfo.friday.mergedSession?.title || 'لم يُحدد موضوع'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100">
                  <span className="text-slate-600 font-bold">
                    المتكلم: {upcomingFridayInfo.friday.mergedSession?.speakerType === 'external'
                      ? `${upcomingFridayInfo.friday.mergedSession?.externalTitle} ${upcomingFridayInfo.friday.mergedSession?.externalName}`
                      : upcomingFridayInfo.friday.mergedSession?.speakerName || 'لم يُحدد'}
                  </span>
                  {upcomingFridayInfo.friday.mergedSession?.speakerType === 'external' ? (
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppToExternal(upcomingFridayInfo.friday, upcomingFridayInfo.friday.mergedSession, 'merged')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>{upcomingFridayInfo.friday.mergedSession?.whatsappSent ? 'إعادة إرسال واتساب' : 'إرسال واتساب 💬'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendInternalServantReminder(upcomingFridayInfo.friday, upcomingFridayInfo.friday.mergedSession, 'merged')}
                      className="px-2.5 py-1 rounded-lg bg-maroon-800 hover:bg-maroon-900 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Bell className="w-3 h-3 text-gold-300" />
                      <span>{upcomingFridayInfo.friday.mergedSession?.reminderSent ? 'تم التذكير 🔔' : 'إرسال تذكير التحضير'}</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Session 1 */}
                <div className="p-2.5 rounded-xl bg-white border border-amber-200 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] text-slate-500 pb-0.5">
                      <span className="font-black text-maroon-900">فقرة أولى:</span>
                    </div>
                    <p className="font-bold text-slate-800 mt-1">
                      {upcomingFridayInfo.friday.session1?.title || 'لم يُحدد موضوع'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100">
                    <span className="text-slate-600 font-bold truncate">
                      {upcomingFridayInfo.friday.session1?.speakerType === 'external'
                        ? `${upcomingFridayInfo.friday.session1?.externalTitle} ${upcomingFridayInfo.friday.session1?.externalName}`
                        : upcomingFridayInfo.friday.session1?.speakerName || 'لم يُحدد'}
                    </span>
                    {upcomingFridayInfo.friday.session1?.speakerType === 'external' ? (
                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppToExternal(upcomingFridayInfo.friday, upcomingFridayInfo.friday.session1, 'session1')}
                        className="px-2 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>{upcomingFridayInfo.friday.session1?.whatsappSent ? 'تذكير واتساب ✅' : 'واتساب 💬'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendInternalServantReminder(upcomingFridayInfo.friday, upcomingFridayInfo.friday.session1, 'session1')}
                        className="px-2 py-1 rounded-lg bg-maroon-800 hover:bg-maroon-900 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Bell className="w-3 h-3 text-gold-300" />
                        <span>{upcomingFridayInfo.friday.session1?.reminderSent ? 'تم التذكير ✅' : 'تذكير التحضير'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Session 2 */}
                <div className="p-2.5 rounded-xl bg-white border border-amber-200 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] text-slate-500 pb-0.5">
                      <span className="font-black text-maroon-900">فقرة ثانية:</span>
                    </div>
                    <p className="font-bold text-slate-800 mt-1">
                      {upcomingFridayInfo.friday.session2?.title || 'لم يُحدد موضوع'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100">
                    <span className="text-slate-600 font-bold truncate">
                      {upcomingFridayInfo.friday.session2?.speakerType === 'external'
                        ? `${upcomingFridayInfo.friday.session2?.externalTitle} ${upcomingFridayInfo.friday.session2?.externalName}`
                        : upcomingFridayInfo.friday.session2?.speakerName || 'لم يُحدد'}
                    </span>
                    {upcomingFridayInfo.friday.session2?.speakerType === 'external' ? (
                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppToExternal(upcomingFridayInfo.friday, upcomingFridayInfo.friday.session2, 'session2')}
                        className="px-2 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>{upcomingFridayInfo.friday.session2?.whatsappSent ? 'تذكير واتساب ✅' : 'واتساب 💬'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendInternalServantReminder(upcomingFridayInfo.friday, upcomingFridayInfo.friday.session2, 'session2')}
                        className="px-2 py-1 rounded-lg bg-maroon-800 hover:bg-maroon-900 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Bell className="w-3 h-3 text-gold-300" />
                        <span>{upcomingFridayInfo.friday.session2?.reminderSent ? 'تم التذكير ✅' : 'تذكير التحضير'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Content: Selected Month Details */}
      {currentMonthData && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Month Header Actions Bar */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-800">
                {currentMonthData.title}
              </h3>
              {currentMonthData.published ? (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  منشور للخدام 📢
                </span>
              ) : (
                <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                  مسودة تحت التعديل ✏️
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {!isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 rounded-xl bg-maroon-800 hover:bg-maroon-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-gold-300" />
                    <span>تعديل الجدول ✏️</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveCurriculum(true)}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>نشر وإشعار الخدام 📢</span>
                  </button>

                  {(isAppAdmin || isServantLeader) && (
                    <button
                      type="button"
                      onClick={handleDeleteMonth}
                      className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="حذف الشهر"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleSaveCurriculum(false)}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-xl bg-maroon-800 hover:bg-maroon-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-gold-300" />
                    <span>حفظ التعديلات 💾</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveCurriculum(true)}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>حفظ ونشر للجميع 📢</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditData(JSON.parse(JSON.stringify(currentMonthData)));
                      setIsEditing(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Fridays Cards List (Mobile-First Architecture) */}
          <div className="p-3.5 space-y-3.5">
            {((isEditing ? editData?.fridays : currentMonthData?.fridays) || []).map((friday, fIdx) => (
              <div 
                key={friday.id || fIdx}
                className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 sm:p-4 space-y-3 transition-all hover:border-gold-300"
              >
                {/* Friday Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-maroon-900 text-gold-300 flex items-center justify-center font-black text-xs shrink-0">
                      {friday.dayNumber || fIdx + 1}
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900">
                        {friday.displayDate}
                      </h4>
                      {friday.notes && (
                        <p className="text-[11px] text-amber-800 font-medium">
                          📌 {friday.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Toggle Mode: 2 Slots vs Merged Slot */}
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => handleToggleMergeFriday(fIdx)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto ${
                        friday.isMerged
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      <span>{friday.isMerged ? '🔄 فك الدمج لفقرتين' : '🔀 دمج الخانتين (ندوة / يوم خاص)'}</span>
                    </button>
                  )}
                </div>

                {/* Friday Sessions Rendering */}
                {friday.isMerged ? (
                  /* 1. Merged Unified Session */
                  <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                      <span>فقرة موحدة / ندوة / لقاء مفتوح 🌟</span>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2 pt-1">
                        <input
                          type="text"
                          value={friday.mergedSession?.title || ''}
                          onChange={(e) => handleUpdateSessionField(fIdx, 'merged', 'title', e.target.value)}
                          placeholder="عنوان الموضوع أو الندوة الموحدة..."
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-bold"
                        />

                        {/* Speaker Type Selector */}
                        <div className="flex items-center gap-3 text-xs font-bold text-slate-700 pt-1">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={`speaker_type_merged_${fIdx}`}
                              checked={friday.mergedSession?.speakerType !== 'external'}
                              onChange={() => handleUpdateSessionField(fIdx, 'merged', 'speakerType', 'internal')}
                            />
                            <span>خادم من الخدمة</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={`speaker_type_merged_${fIdx}`}
                              checked={friday.mergedSession?.speakerType === 'external'}
                              onChange={() => handleUpdateSessionField(fIdx, 'merged', 'speakerType', 'external')}
                            />
                            <span>متكلم خارجي (ضيف / كاهن)</span>
                          </label>
                        </div>

                        {friday.mergedSession?.speakerType === 'external' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">اللقب</label>
                              <select
                                value={friday.mergedSession?.externalTitle || 'أستاذ'}
                                onChange={(e) => handleUpdateSessionField(fIdx, 'merged', 'externalTitle', e.target.value)}
                                className="w-full px-2 py-1 text-xs rounded-xl border border-slate-300 bg-white font-bold"
                              >
                                {EXTERNAL_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">اسم المتكلم</label>
                              <input
                                type="text"
                                value={friday.mergedSession?.externalName || ''}
                                onChange={(e) => handleUpdateSessionField(fIdx, 'merged', 'externalName', e.target.value)}
                                placeholder="الاسم الكريم"
                                className="w-full px-2 py-1 text-xs rounded-xl border border-slate-300 bg-white font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">رقم الواتساب</label>
                              <input
                                type="tel"
                                value={friday.mergedSession?.externalPhone || ''}
                                onChange={(e) => handleUpdateSessionField(fIdx, 'merged', 'externalPhone', e.target.value)}
                                placeholder="01xxxxxxxxx"
                                className="w-full px-2 py-1 text-xs rounded-xl border border-slate-300 bg-white font-mono"
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">اختيار الخادم من المنظومة</label>
                            <select
                              value={friday.mergedSession?.speakerId || ''}
                              onChange={(e) => handleSelectInternalSpeaker(fIdx, 'merged', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-bold"
                            >
                              <option value="">-- اضغط لاختيار الخادم المسؤول --</option>
                              {registeredServants.map(s => (
                                <option key={s.id} value={s.id}>{s.fullName} ({s.phone || 'بدون هاتف'})</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                        <div>
                          <p className="text-xs font-black text-slate-800">
                            {friday.mergedSession?.title || 'لم يُحدد موضوع'}
                          </p>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            <span className="font-bold">المتكلم:</span>{' '}
                            {friday.mergedSession?.speakerType === 'external'
                              ? `${friday.mergedSession?.externalTitle} ${friday.mergedSession?.externalName} (خارجي 💬)`
                              : friday.mergedSession?.speakerName || 'لم يُحدد'}
                          </p>
                        </div>

                        {friday.mergedSession?.speakerType === 'external' ? (
                          <button
                            type="button"
                            onClick={() => handleSendWhatsAppToExternal(friday, friday.mergedSession, 'merged')}
                            className="px-2.5 py-1 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{friday.mergedSession?.whatsappSent ? 'إعادة إرسال واتساب 💬' : 'إرسال تذكير واتساب 💬'}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSendInternalServantReminder(friday, friday.mergedSession, 'merged')}
                            className="px-2.5 py-1 rounded-xl bg-maroon-800 hover:bg-maroon-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto"
                          >
                            <Bell className="w-3.5 h-3.5 text-gold-300" />
                            <span>{friday.mergedSession?.reminderSent ? 'تم إرسال التنبيه ✅' : 'إرسال تذكير التحضير 🔔'}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* 2. Standard 2-Slot Mode (فقرة أولى + فقرة ثانية) */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* الفقرة الأولى */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-maroon-950 border-b border-slate-100 pb-1.5">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-gold-400" />
                          فقرة أولى
                        </span>
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={friday.session1?.title || ''}
                            onChange={(e) => handleUpdateSessionField(fIdx, 'session1', 'title', e.target.value)}
                            placeholder="مثال: تك 25 - 44 (دراسة سفر التكوين)"
                            className="w-full px-2.5 py-1 text-xs rounded-xl border border-slate-300 font-bold"
                          />

                          <div className="flex items-center gap-3 text-[11px] font-bold text-slate-700">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name={`s1_type_${fIdx}`}
                                checked={friday.session1?.speakerType !== 'external'}
                                onChange={() => handleUpdateSessionField(fIdx, 'session1', 'speakerType', 'internal')}
                              />
                              <span>خادم بالخدمة</span>
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name={`s1_type_${fIdx}`}
                                checked={friday.session1?.speakerType === 'external'}
                                onChange={() => handleUpdateSessionField(fIdx, 'session1', 'speakerType', 'external')}
                              />
                              <span>متكلم خارجي</span>
                            </label>
                          </div>

                          {friday.session1?.speakerType === 'external' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-0.5">
                              <select
                                value={friday.session1?.externalTitle || 'أستاذ'}
                                onChange={(e) => handleUpdateSessionField(fIdx, 'session1', 'externalTitle', e.target.value)}
                                className="px-2 py-1 text-xs rounded-lg border border-slate-300 bg-white font-bold"
                              >
                                {EXTERNAL_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <input
                                type="text"
                                value={friday.session1?.externalName || ''}
                                onChange={(e) => handleUpdateSessionField(fIdx, 'session1', 'externalName', e.target.value)}
                                placeholder="الاسم"
                                className="px-2 py-1 text-xs rounded-lg border border-slate-300 font-bold"
                              />
                              <input
                                type="tel"
                                value={friday.session1?.externalPhone || ''}
                                onChange={(e) => handleUpdateSessionField(fIdx, 'session1', 'externalPhone', e.target.value)}
                                placeholder="الواتساب"
                                className="px-2 py-1 text-xs rounded-lg border border-slate-300 font-mono"
                              />
                            </div>
                          ) : (
                            <select
                              value={friday.session1?.speakerId || ''}
                              onChange={(e) => handleSelectInternalSpeaker(fIdx, 'session1', e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded-xl border border-slate-300 bg-white font-bold"
                            >
                              <option value="">-- اختيار الخادم المتكلم --</option>
                              {registeredServants.map(s => (
                                <option key={s.id} value={s.id}>{s.fullName}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <p className="text-xs font-black text-slate-800">
                            {friday.session1?.title || 'لم يُحدد موضوع'}
                          </p>
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                            <span className="text-[11px] text-slate-600 font-bold truncate">
                              المتكلم: {friday.session1?.speakerType === 'external'
                                ? `${friday.session1?.externalTitle} ${friday.session1?.externalName}`
                                : friday.session1?.speakerName || 'لم يُحدد'}
                            </span>
                            {friday.session1?.speakerType === 'external' ? (
                              <button
                                type="button"
                                onClick={() => handleSendWhatsAppToExternal(friday, friday.session1, 'session1')}
                                className="px-2 py-0.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>{friday.session1?.whatsappSent ? 'واتساب ✅' : 'واتساب 💬'}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSendInternalServantReminder(friday, friday.session1, 'session1')}
                                className="px-2 py-0.5 rounded-lg bg-maroon-800 hover:bg-maroon-900 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                              >
                                <Bell className="w-3 h-3 text-gold-300" />
                                <span>{friday.session1?.reminderSent ? 'تم التذكير ✅' : 'تذكير'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* الفقرة الثانية */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-maroon-950 border-b border-slate-100 pb-1.5">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          فقرة ثانية
                        </span>
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={friday.session2?.title || ''}
                            onChange={(e) => handleUpdateSessionField(fIdx, 'session2', 'title', e.target.value)}
                            placeholder="مثال: طقس المعمودية / عقيدة الفداء"
                            className="w-full px-2.5 py-1 text-xs rounded-xl border border-slate-300 font-bold"
                          />

                          <div className="flex items-center gap-3 text-[11px] font-bold text-slate-700">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name={`s2_type_${fIdx}`}
                                checked={friday.session2?.speakerType !== 'external'}
                                onChange={() => handleUpdateSessionField(fIdx, 'session2', 'speakerType', 'internal')}
                              />
                              <span>خادم بالخدمة</span>
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name={`s2_type_${fIdx}`}
                                checked={friday.session2?.speakerType === 'external'}
                                onChange={() => handleUpdateSessionField(fIdx, 'session2', 'speakerType', 'external')}
                              />
                              <span>متكلم خارجي</span>
                            </label>
                          </div>

                          {friday.session2?.speakerType === 'external' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-0.5">
                              <select
                                value={friday.session2?.externalTitle || 'أستاذ'}
                                onChange={(e) => handleUpdateSessionField(fIdx, 'session2', 'externalTitle', e.target.value)}
                                className="px-2 py-1 text-xs rounded-lg border border-slate-300 bg-white font-bold"
                              >
                                {EXTERNAL_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <input
                                type="text"
                                value={friday.session2?.externalName || ''}
                                onChange={(e) => handleUpdateSessionField(fIdx, 'session2', 'externalName', e.target.value)}
                                placeholder="الاسم"
                                className="px-2 py-1 text-xs rounded-lg border border-slate-300 font-bold"
                              />
                              <input
                                type="tel"
                                value={friday.session2?.externalPhone || ''}
                                onChange={(e) => handleUpdateSessionField(fIdx, 'session2', 'externalPhone', e.target.value)}
                                placeholder="الواتساب"
                                className="px-2 py-1 text-xs rounded-lg border border-slate-300 font-mono"
                              />
                            </div>
                          ) : (
                            <select
                              value={friday.session2?.speakerId || ''}
                              onChange={(e) => handleSelectInternalSpeaker(fIdx, 'session2', e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded-xl border border-slate-300 bg-white font-bold"
                            >
                              <option value="">-- اختيار الخادم المتكلم --</option>
                              {registeredServants.map(s => (
                                <option key={s.id} value={s.id}>{s.fullName}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <p className="text-xs font-black text-slate-800">
                            {friday.session2?.title || 'لم يُحدد موضوع'}
                          </p>
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                            <span className="text-[11px] text-slate-600 font-bold truncate">
                              المتكلم: {friday.session2?.speakerType === 'external'
                                ? `${friday.session2?.externalTitle} ${friday.session2?.externalName}`
                                : friday.session2?.speakerName || 'لم يُحدد'}
                            </span>
                            {friday.session2?.speakerType === 'external' ? (
                              <button
                                type="button"
                                onClick={() => handleSendWhatsAppToExternal(friday, friday.session2, 'session2')}
                                className="px-2 py-0.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>{friday.session2?.whatsappSent ? 'واتساب ✅' : 'واتساب 💬'}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSendInternalServantReminder(friday, friday.session2, 'session2')}
                                className="px-2 py-0.5 rounded-lg bg-maroon-800 hover:bg-maroon-900 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                              >
                                <Bell className="w-3 h-3 text-gold-300" />
                                <span>{friday.session2?.reminderSent ? 'تم التذكير ✅' : 'تذكير'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Month Modal */}
      {showAddMonthModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-maroon-800" />
                <span>إضافة وتوليد منهج شهر جديد</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddMonthModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اختر الشهر:
                </label>
                <select
                  value={newMonthIndex}
                  onChange={(e) => setNewMonthIndex(parseInt(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-bold bg-white"
                >
                  {ARABIC_MONTHS.map((m, idx) => (
                    <option key={idx} value={idx}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  السنة:
                </label>
                <input
                  type="number"
                  value={newMonthYear}
                  onChange={(e) => setNewMonthYear(parseInt(e.target.value) || 2026)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-bold"
                />
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2 rounded-xl">
                💡 سيقوم التطبيق تلقائياً بحساب جميع أيام الجمعة الواقعة في شهر ({ARABIC_MONTHS[newMonthIndex]} {newMonthYear}) وتجهيزها للتوزيع المباشر.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddMonthModal(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleCreateNewMonth}
                disabled={saving}
                className="px-4 py-1.5 rounded-xl bg-gold-400 hover:bg-gold-500 text-maroon-950 text-xs font-black shadow-xs cursor-pointer"
              >
                توليد وإنشاء الجمع 🗓️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print / Comprehensive Table View Modal */}
      {showPrintModal && currentMonthData && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-4 sm:p-6 space-y-4 shadow-2xl border border-slate-200 my-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-black text-maroon-950">
                  {currentMonthData.title} - كنيسة القديس ماريوحنا المعمدان
                </h3>
                <p className="text-xs text-slate-500">
                  الجدول الزمني المعتمد لأسرة إعداد الخدام
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-maroon-800 hover:bg-maroon-900 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-gold-300" />
                  <span>طباعة 🖨️</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold"
                >
                  إغلاق
                </button>
              </div>
            </div>

            {/* Print Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-maroon-950 text-gold-200 border-b border-gold-500/30">
                    <th className="p-2.5 font-black border-l border-white/10">التاريخ</th>
                    <th className="p-2.5 font-black border-l border-white/10">فقرة أولى</th>
                    <th className="p-2.5 font-black border-l border-white/10">المتكلم</th>
                    <th className="p-2.5 font-black border-l border-white/10">فقرة ثانية</th>
                    <th className="p-2.5 font-black">المتكلم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(currentMonthData.fridays || []).map((f, idx) => {
                    if (f.isMerged) {
                      return (
                        <tr key={idx} className="bg-amber-50/50 hover:bg-amber-50">
                          <td className="p-2.5 font-bold text-slate-900 border-l border-slate-200 whitespace-nowrap">
                            {f.displayDate}
                          </td>
                          <td colSpan={4} className="p-2.5 font-bold text-maroon-900 text-center">
                            🌟 {f.mergedSession?.title || 'فقرة موحدة / ندوة'} 
                            {' — '}
                            <span className="text-slate-700">
                              المتكلم: {f.mergedSession?.speakerType === 'external'
                                ? `${f.mergedSession?.externalTitle} ${f.mergedSession?.externalName}`
                                : f.mergedSession?.speakerName}
                            </span>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-900 border-l border-slate-200 whitespace-nowrap">
                          {f.displayDate}
                        </td>
                        <td className="p-2.5 font-medium text-slate-800 border-l border-slate-200">
                          {f.session1?.title || '-'}
                        </td>
                        <td className="p-2.5 font-black text-maroon-900 border-l border-slate-200 whitespace-nowrap">
                          {f.session1?.speakerType === 'external'
                            ? `${f.session1?.externalTitle} ${f.session1?.externalName}`
                            : f.session1?.speakerName || '-'}
                        </td>
                        <td className="p-2.5 font-medium text-slate-800 border-l border-slate-200">
                          {f.session2?.title || '-'}
                        </td>
                        <td className="p-2.5 font-black text-maroon-900 whitespace-nowrap">
                          {f.session2?.speakerType === 'external'
                            ? `${f.session2?.externalTitle} ${f.session2?.externalName}`
                            : f.session2?.speakerName || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
