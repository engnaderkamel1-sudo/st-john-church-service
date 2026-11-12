import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar, Users, User, Phone, MessageSquare, Send, Bell, 
  CheckCircle, Plus, Edit3, Save, Trash2, ChevronLeft, ChevronRight, 
  Printer, Sparkles, AlertCircle, Share2, Eye, ShieldCheck, Check, RefreshCw, X,
  Camera, UploadCloud, FileText, Loader2
} from 'lucide-react';
import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, 
  onSnapshot, serverTimestamp, query, orderBy, addDoc 
} from 'firebase/firestore';
import { db } from '../../firebase';
import { triggerServerPush } from '../../services/webPushService';
import { extractCurriculumFromPaperImage } from '../../services/geminiService';

// الأشهر باللغة العربية
const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

// المواد الأساسية المعتمدة في منهج إعداد الخدام
const STANDARD_SUBJECTS = [
  'كتاب مقدس',
  'طقس',
  'عقيدة',
  'مهارات',
  'تاريخ كنيسة',
  'ندوة عامة',
  'أخرى'
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

// دالة مساعدة للحصول على اسم المتكلم بوضوح مهما كان نوعه
function getSpeakerDisplayName(session) {
  if (!session) return 'لم يُحدد';
  if (session.speakerType === 'external') {
    const title = session.externalTitle || 'أستاذ';
    const name = session.externalName || session.speakerName || 'المتكلم';
    return `${title} ${name}`;
  }
  return session.speakerName || session.externalName || 'لم يُحدد';
}

// دالة توليد أيام الجمعة لأي شهر وسنة بأرقام غربية (1, 2, 3...)
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
          subject: 'ندوة عامة',
          title: '',
          speakerType: 'internal',
          speakerId: '',
          speakerName: '',
          speakerPhone: '',
          externalTitle: 'أستاذ',
          externalName: '',
          externalPhone: '',
          reminderSent: false,
          whatsappSent: false
        },
        session1: {
          subject: 'كتاب مقدس',
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
        },
        session2: {
          subject: 'طقس',
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
        }
      });
    }
    date.setDate(date.getDate() + 1);
  }
  return fridays;
}

// بناء البيانات المعتمدة لشهري نوفمبر وديسمبر 2026 بالأرقام الإنجليزية (1, 2, 3...)
function buildRealScheduleDocs(uploadedByName = 'أمين الخدمة') {
  // 1. شهر نوفمبر 2026 (الجدول يبدأ رسمياً من 13 نوفمبر كما بالورقة المعتمدة)
  const novFridays = [
    {
      id: 'f_2026_11_13',
      date: '2026-11-13',
      displayDate: 'الجمعة 13 نوفمبر 2026',
      dayNumber: 13,
      isMerged: false,
      notes: '',
      mergedSession: {
        subject: 'ندوة عامة',
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
        subject: 'كتاب مقدس',
        title: 'تك 25 - 44',
        speakerType: 'internal',
        speakerId: REAL_SERVANTS.aghapy.id,
        speakerName: REAL_SERVANTS.aghapy.name,
        speakerPhone: REAL_SERVANTS.aghapy.phone,
        externalTitle: 'طاسوني',
        externalName: '',
        externalPhone: '',
        reminderSent: false,
        whatsappSent: false
      },
      session2: {
        subject: 'طقس',
        title: '',
        speakerType: 'internal',
        speakerId: REAL_SERVANTS.afaf.id,
        speakerName: REAL_SERVANTS.afaf.name,
        speakerPhone: REAL_SERVANTS.afaf.phone,
        externalTitle: 'طاسوني',
        externalName: '',
        externalPhone: '',
        reminderSent: false,
        whatsappSent: false
      }
    },
    {
      id: 'f_2026_11_20',
      date: '2026-11-20',
      displayDate: 'الجمعة 20 نوفمبر 2026',
      dayNumber: 20,
      isMerged: false,
      notes: '',
      mergedSession: {
        subject: 'ندوة عامة',
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
        subject: 'كتاب مقدس',
        title: 'تك 42 - 50',
        speakerType: 'internal',
        speakerId: REAL_SERVANTS.nader.id,
        speakerName: REAL_SERVANTS.nader.name,
        speakerPhone: REAL_SERVANTS.nader.phone,
        externalTitle: 'أستاذ',
        externalName: '',
        externalPhone: '',
        reminderSent: false,
        whatsappSent: false
      },
      session2: {
        subject: 'طقس',
        title: '',
        speakerType: 'internal',
        speakerId: REAL_SERVANTS.afaf.id,
        speakerName: REAL_SERVANTS.afaf.name,
        speakerPhone: REAL_SERVANTS.afaf.phone,
        externalTitle: 'طاسوني',
        externalName: '',
        externalPhone: '',
        reminderSent: false,
        whatsappSent: false
      }
    },
    {
      id: 'f_2026_11_27',
      date: '2026-11-27',
      displayDate: 'الجمعة 27 نوفمبر 2026',
      dayNumber: 27,
      isMerged: false,
      notes: '',
      mergedSession: {
        subject: 'ندوة عامة',
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
        subject: 'كتاب مقدس',
        title: 'خر 1 - 7',
        speakerType: 'internal',
        speakerId: REAL_SERVANTS.hanaa.id,
        speakerName: REAL_SERVANTS.hanaa.name,
        speakerPhone: REAL_SERVANTS.hanaa.phone,
        externalTitle: 'طاسوني',
        externalName: '',
        externalPhone: '',
        reminderSent: false,
        whatsappSent: false
      },
      session2: {
        subject: 'طقس',
        title: '',
        speakerType: 'internal',
        speakerId: REAL_SERVANTS.afaf.id,
        speakerName: REAL_SERVANTS.afaf.name,
        speakerPhone: REAL_SERVANTS.afaf.phone,
        externalTitle: 'طاسوني',
        externalName: '',
        externalPhone: '',
        reminderSent: false,
        whatsappSent: false
      }
    }
  ];

  const novDoc = {
    id: '2026-11',
    docId: 'weekly_2026-11',
    isWeeklyCurriculum: true,
    year: 2026,
    month: 11,
    monthName: 'نوفمبر',
    title: 'منهج شهر نوفمبر 2026',
    published: true,
    fridays: novFridays,
    updatedBy: uploadedByName
  };

  // 2. شهر ديسمبر 2026 (مطابق تماماً لورقة الخدمة)
  const decFridays = [
    {
      id: 'f_2026_12_04',
      date: '2026-12-04',
      displayDate: 'الجمعة 4 ديسمبر 2026',
      dayNumber: 4,
      isMerged: false,
      notes: '',
      mergedSession: {
        subject: 'ندوة عامة',
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
        subject: 'كتاب مقدس',
        title: 'خر 8 - 14',
        speakerType: 'internal',
        speakerId: REAL_SERVANTS.afaf.id,
        speakerName: REAL_SERVANTS.afaf.name,
        speakerPhone: REAL_SERVANTS.afaf.phone,
        externalTitle: 'طاسوني',
        externalName: '',
        externalPhone: '',
        reminderSent: false,
        whatsappSent: false
      },
      session2: {
        subject: 'عقيدة',
        title: '',
        speakerType: 'internal',
        speakerId: REAL_SERVANTS.hanaa.id,
        speakerName: REAL_SERVANTS.hanaa.name,
        speakerPhone: REAL_SERVANTS.hanaa.phone,
        externalTitle: 'طاسوني',
        externalName: '',
        externalPhone: '',
        reminderSent: false,
        whatsappSent: false
      }
    },
    {
      id: 'f_2026_12_11',
      date: '2026-12-11',
      displayDate: 'الجمعة 11 ديسمبر 2026',
      dayNumber: 11,
      isMerged: false,
      notes: '',
      mergedSession: {
        subject: 'ندوة عامة',
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
        subject: 'كتاب مقدس',
        title: 'خر 15 - 21',
        speakerType: 'internal',
        speakerId: REAL_SERVANTS.nader.id,
        speakerName: REAL_SERVANTS.nader.name,
        speakerPhone: REAL_SERVANTS.nader.phone,
        externalTitle: 'أستاذ',
        externalName: '',
        externalPhone: '',
        reminderSent: false,
        whatsappSent: false
      },
      session2: {
        subject: 'عقيدة',
        title: '',
        speakerType: 'internal',
        speakerId: REAL_SERVANTS.hanaa.id,
        speakerName: REAL_SERVANTS.hanaa.name,
        speakerPhone: REAL_SERVANTS.hanaa.phone,
        externalTitle: 'طاسوني',
        externalName: '',
        externalPhone: '',
        reminderSent: false,
        whatsappSent: false
      }
    },
    {
      id: 'f_2026_12_18',
      date: '2026-12-18',
      displayDate: 'الجمعة 18 ديسمبر 2026',
      dayNumber: 18,
      isMerged: false,
      notes: '',
      mergedSession: {
        subject: 'ندوة عامة',
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
        subject: 'كتاب مقدس',
        title: 'خر 22 - 28',
        speakerType: 'internal',
        speakerId: REAL_SERVANTS.aghapy.id,
        speakerName: REAL_SERVANTS.aghapy.name,
        speakerPhone: REAL_SERVANTS.aghapy.phone,
        externalTitle: 'طاسوني',
        externalName: '',
        externalPhone: '',
        reminderSent: false,
        whatsappSent: false
      },
      session2: {
        subject: 'عقيدة',
        title: '',
        speakerType: 'internal',
        speakerId: REAL_SERVANTS.hanaa.id,
        speakerName: REAL_SERVANTS.hanaa.name,
        speakerPhone: REAL_SERVANTS.hanaa.phone,
        externalTitle: 'طاسوني',
        externalName: '',
        externalPhone: '',
        reminderSent: false,
        whatsappSent: false
      }
    },
    {
      id: 'f_2026_12_25',
      date: '2026-12-25',
      displayDate: 'الجمعة 25 ديسمبر 2026',
      dayNumber: 25,
      isMerged: false,
      notes: '',
      mergedSession: {
        subject: 'ندوة عامة',
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
        subject: 'كتاب مقدس',
        title: 'خر 29 - 35',
        speakerType: 'internal',
        speakerId: REAL_SERVANTS.afaf.id,
        speakerName: REAL_SERVANTS.afaf.name,
        speakerPhone: REAL_SERVANTS.afaf.phone,
        externalTitle: 'طاسوني',
        externalName: '',
        externalPhone: '',
        reminderSent: false,
        whatsappSent: false
      },
      session2: {
        subject: 'عقيدة',
        title: '',
        speakerType: 'internal',
        speakerId: REAL_SERVANTS.hanaa.id,
        speakerName: REAL_SERVANTS.hanaa.name,
        speakerPhone: REAL_SERVANTS.hanaa.phone,
        externalTitle: 'طاسوني',
        externalName: '',
        externalPhone: '',
        reminderSent: false,
        whatsappSent: false
      }
    }
  ];

  const decDoc = {
    id: '2026-12',
    docId: 'weekly_2026-12',
    isWeeklyCurriculum: true,
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
  
  // حالة تعديل كارت جمعة محدد على حدة
  const [editingFridayId, setEditingFridayId] = useState(null);
  const [singleFridayEdit, setSingleFridayEdit] = useState(null);

  // حالة نافذة قراءة الورقة بالذكاء الاصطناعي
  const [showAIScanModal, setShowAIScanModal] = useState(false);
  const [aiSelectedFile, setAiSelectedFile] = useState(null);
  const [aiPreviewUrl, setAiPreviewUrl] = useState(null);
  const [aiScanning, setAiScanning] = useState(false);
  const [aiExtractedData, setAiExtractedData] = useState(null);
  const [aiTargetMonthKey, setAiTargetMonthKey] = useState('2026-11');
  const [aiError, setAiError] = useState('');

  const [showAddMonthModal, setShowAddMonthModal] = useState(false);
  const [newMonthYear, setNewMonthYear] = useState(new Date().getFullYear());
  const [newMonthIndex, setNewMonthIndex] = useState(new Date().getMonth());
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const hasAutoSeededRef = useRef(false);

  // استخراج قائمة خدام المنظومة المعتمدين مع دمج الخدام الأساسيين لضمان تواجدهم دائماً
  const registeredServants = useMemo(() => {
    const baseServants = [
      { id: 'vB3UKbTyDTQz3XhDIPBQ', fullName: 'طاسوني اغابي اسحق', phone: '01225278458' },
      { id: '7QfEDKZXwTB1QdtB6slC', fullName: 'Nader Reda Labib', phone: '01275571569' },
      { id: 'TEjV6XAHf3cYmGkjnnCc', fullName: 'هناء فكري شفيق', phone: '01226862261' },
      { id: '0zzWT0Bs2PcQdJN77C8A', fullName: 'عفاف كمال عبدالنور', phone: '01024682928' }
    ];

    const map = new Map();
    baseServants.forEach(s => map.set(s.id, s));

    (allUsers || []).forEach(u => {
      const isServant = u.role === 'servant' || u.role === 'servant_leader' || u.role === 'admin';
      const isActive = u.status !== 'inactive' && u.status !== 'suspended' && u.status !== 'rejected';
      if (isServant && isActive && u.id) {
        map.set(u.id, {
          id: u.id,
          fullName: u.fullName || u.name || 'خادم',
          phone: u.phone || ''
        });
      }
    });

    return Array.from(map.values());
  }, [allUsers]);

  // إظهار رسالة تأكيد مؤقتة
  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 4500);
  };

  // المزامنة الحية مع مجموعة المنهج المعتمدة بصلاحيات كاملة
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'service_curriculum'), (snap) => {
      const list = snap.docs
        .filter(d => (d.id.startsWith('weekly_') || d.data().isWeeklyCurriculum === true) && d.id !== 'weekly_curriculum_2026_11')
        .map(d => {
          const rawId = d.id.startsWith('weekly_') ? d.id.replace('weekly_', '') : d.id;
          return { id: rawId, docId: d.id, ...d.data() };
        });

      // ترتيب تصاعدي من الأقدم للأحدث (نوفمبر أولاً ثم ديسمبر) ليظهر من اليمين للشمال في الواجهة العربية
      list.sort((a, b) => {
        if (a.year !== b.year) return (a.year || 0) - (b.year || 0);
        return (a.month || 0) - (b.month || 0);
      });

      if (list.length > 0) {
        // تنظيف أية حقول قديمة وتعيين المواد الافتراضية
        const sanitizedList = list.map(item => ({
          ...item,
          fridays: (item.fridays || []).map(f => {
            const cleanF = { ...f };
            if (cleanF.session1) {
              delete cleanF.session1.time;
              if (!cleanF.session1.subject) cleanF.session1.subject = 'كتاب مقدس';
            }
            if (cleanF.session2) {
              delete cleanF.session2.time;
              if (!cleanF.session2.subject) cleanF.session2.subject = 'طقس';
            }
            if (cleanF.mergedSession) {
              delete cleanF.mergedSession.time;
              if (!cleanF.mergedSession.subject) cleanF.mergedSession.subject = 'ندوة عامة';
            }
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

  // تهيئة وضع التعديل العام عند اختيار شهر
  useEffect(() => {
    if (currentMonthData) {
      setEditData(JSON.parse(JSON.stringify(currentMonthData)));
    } else {
      setEditData(null);
    }
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

  // حفظ التعديلات العامة لكامل الشهر
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

      // تحديث الحالة محلياً فوراً
      setCurricula(prev => prev.map(c => (c.id === editData.id || c.docId === docKey) ? { ...updatedObj } : c));

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

  // === وظائف تعديل كارت جمعة محدد على حدة ===
  const handleStartEditFriday = (friday) => {
    setEditingFridayId(friday.id);
    setSingleFridayEdit(JSON.parse(JSON.stringify(friday)));
  };

  const handleCancelEditFriday = () => {
    setEditingFridayId(null);
    setSingleFridayEdit(null);
  };

  // حفظ تعديل الجمعة المنفردة وتحديث قاعدة البيانات والحالة المحلية ذرّياً
  const handleSaveSingleFriday = async () => {
    if (!singleFridayEdit || !currentMonthData) return;
    setSaving(true);
    try {
      const docKey = currentMonthData.docId || (currentMonthData.id.startsWith('weekly_') ? currentMonthData.id : `weekly_${currentMonthData.id}`);
      const docRef = doc(db, 'service_curriculum', docKey);
      
      const nextFridays = (currentMonthData.fridays || []).map(f => 
        f.id === singleFridayEdit.id ? JSON.parse(JSON.stringify(singleFridayEdit)) : f
      );

      await updateDoc(docRef, {
        fridays: nextFridays,
        updatedAt: serverTimestamp(),
        updatedBy: user?.fullName || 'أحد الخدام'
      });

      // تحديث الحالة المحلية فوراً
      setCurricula(prev => prev.map(c => {
        if (c.id === currentMonthData.id || c.docId === docKey) {
          return { ...c, fridays: nextFridays };
        }
        return c;
      }));

      setEditingFridayId(null);
      setSingleFridayEdit(null);
      showToast('تم حفظ وتحديث اسم المتكلم والبيانات بنجاح 💾');
    } catch (err) {
      console.error('Error saving single friday:', err);
      alert('حدث خطأ أثناء حفظ تعديلات الجمعة: ' + (err?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  // حذف أسبوع (جمعة محددة) من المنهج
  const handleDeleteFriday = async (fridayId, fridayDisplayDate) => {
    if (!currentMonthData) return;
    const confirmMsg = `هل أنت متأكد من حذف لقاء (${fridayDisplayDate || 'هذا الأسبوع'}) من جدول المنهج؟`;
    if (!window.confirm(confirmMsg)) return;

    setSaving(true);
    try {
      const docKey = currentMonthData.docId || (currentMonthData.id.startsWith('weekly_') ? currentMonthData.id : `weekly_${currentMonthData.id}`);
      const docRef = doc(db, 'service_curriculum', docKey);
      const nextFridays = (currentMonthData.fridays || []).filter(f => f.id !== fridayId);

      await updateDoc(docRef, {
        fridays: nextFridays,
        updatedAt: serverTimestamp(),
        updatedBy: user?.fullName || 'أحد الخدام'
      });

      setCurricula(prev => prev.map(c => {
        if (c.id === currentMonthData.id || c.docId === docKey) {
          return { ...c, fridays: nextFridays };
        }
        return c;
      }));

      if (editingFridayId === fridayId) {
        setEditingFridayId(null);
        setSingleFridayEdit(null);
      }

      showToast('تم حذف لقاء الجمعة من جدول المنهج بنجاح 🗑️');
    } catch (err) {
      console.error('Error deleting friday:', err);
      alert('حدث خطأ أثناء حذف الجمعة: ' + (err?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  // إضافة جمعة جديدة للشهر
  const handleAddFridayToCurrentMonth = async () => {
    if (!currentMonthData) return;
    const count = (currentMonthData.fridays || []).length;
    const newFridayId = `f_${currentMonthData.id}_extra_${Date.now()}`;
    const newFriday = {
      id: newFridayId,
      date: `${currentMonthData.id}-${String(count + 1).padStart(2, '0')}`,
      displayDate: `جمعة إضافية (${currentMonthData.monthName} ${currentMonthData.year})`,
      dayNumber: count + 1,
      isMerged: false,
      notes: '',
      mergedSession: {
        subject: 'ندوة عامة',
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
        subject: 'كتاب مقدس',
        title: '',
        speakerType: 'internal',
        speakerId: '',
        speakerName: '',
        externalTitle: 'طاسوني',
        externalName: '',
        externalPhone: '',
        reminderSent: false,
        whatsappSent: false
      },
      session2: {
        subject: 'طقس',
        title: '',
        speakerType: 'internal',
        speakerId: '',
        speakerName: '',
        externalTitle: 'طاسوني',
        externalName: '',
        externalPhone: '',
        reminderSent: false,
        whatsappSent: false
      }
    };

    setSaving(true);
    try {
      const docKey = currentMonthData.docId || (currentMonthData.id.startsWith('weekly_') ? currentMonthData.id : `weekly_${currentMonthData.id}`);
      const nextFridays = [...(currentMonthData.fridays || []), newFriday];
      await updateDoc(docRef, {
        fridays: nextFridays,
        updatedAt: serverTimestamp()
      });
      setCurricula(prev => prev.map(c => {
        if (c.id === currentMonthData.id || c.docId === docKey) {
          return { ...c, fridays: nextFridays };
        }
        return c;
      }));
      setEditingFridayId(newFridayId);
      setSingleFridayEdit(newFriday);
      showToast('تمت إضافة الجمعة، يمكنك كتابة تفاصيلها وحفظها الآن ✏️');
    } catch (err) {
      console.error('Error adding friday:', err);
      alert('حدث خطأ أثناء إضافة الجمعة.');
    } finally {
      setSaving(false);
    }
  };

  // دمج / فك دمج خانات الجمعة
  const handleToggleMergeFriday = (fridayIndex) => {
    setEditData(prev => {
      if (!prev || !prev.fridays) return prev;
      const nextFridays = [...prev.fridays];
      const fr = { ...nextFridays[fridayIndex] };
      fr.isMerged = !fr.isMerged;
      nextFridays[fridayIndex] = fr;
      return { ...prev, fridays: nextFridays };
    });
  };

  const handleToggleMergeSingleFriday = () => {
    setSingleFridayEdit(prev => {
      if (!prev) return prev;
      return { ...prev, isMerged: !prev.isMerged };
    });
  };

  // تعديل بيانات فقرة معينة في وضع التعديل العام
  const handleUpdateSessionField = (fridayIndex, sessionKey, field, value) => {
    setEditData(prev => {
      if (!prev || !prev.fridays) return prev;
      const nextFridays = [...prev.fridays];
      const fr = { ...nextFridays[fridayIndex] };
      if (sessionKey === 'merged') {
        fr.mergedSession = { ...fr.mergedSession, [field]: value };
      } else {
        fr[sessionKey] = { ...fr[sessionKey], [field]: value };
      }
      nextFridays[fridayIndex] = fr;
      return { ...prev, fridays: nextFridays };
    });
  };

  // اختيار خادم من القائمة في التعديل العام ذرّياً
  const handleSelectInternalSpeaker = (fridayIndex, sessionKey, servantId) => {
    const servant = registeredServants.find(s => s.id === servantId);
    if (!servant) return;
    const cleanName = servant.fullName || servant.name || '';
    const cleanPhone = servant.phone || '';

    setEditData(prev => {
      if (!prev || !prev.fridays) return prev;
      const nextFridays = [...prev.fridays];
      const fr = { ...nextFridays[fridayIndex] };
      const updatedSession = {
        ...(sessionKey === 'merged' ? fr.mergedSession : fr[sessionKey]),
        speakerType: 'internal',
        speakerId: servant.id,
        speakerName: cleanName,
        speakerPhone: cleanPhone
      };

      if (sessionKey === 'merged') {
        fr.mergedSession = updatedSession;
      } else {
        fr[sessionKey] = updatedSession;
      }
      nextFridays[fridayIndex] = fr;
      return { ...prev, fridays: nextFridays };
    });
  };

  // تعديل بيانات فقرة معينة في وضع تعديل الكارت المنفرد باستخدام الحالة الدالية
  const handleUpdateSingleSessionField = (sessionKey, field, value) => {
    setSingleFridayEdit(prev => {
      if (!prev) return prev;
      const targetSession = sessionKey === 'merged' ? prev.mergedSession : prev[sessionKey];
      const updatedSession = {
        ...targetSession,
        [field]: value
      };
      if (sessionKey === 'merged') {
        return { ...prev, mergedSession: updatedSession };
      }
      return { ...prev, [sessionKey]: updatedSession };
    });
  };

  // اختيار خادم من القائمة في تعديل الكارت المنفرد وتحديث اسمه وهاتفه ومعرفه ذرّياً
  const handleSelectSingleInternalSpeaker = (sessionKey, servantId) => {
    const servant = registeredServants.find(s => s.id === servantId);
    if (!servant) return;
    const cleanName = servant.fullName || servant.name || '';
    const cleanPhone = servant.phone || '';

    setSingleFridayEdit(prev => {
      if (!prev) return prev;
      const targetSession = sessionKey === 'merged' ? prev.mergedSession : prev[sessionKey];
      const updatedSession = {
        ...targetSession,
        speakerType: 'internal',
        speakerId: servant.id,
        speakerName: cleanName,
        speakerPhone: cleanPhone
      };

      if (sessionKey === 'merged') {
        return { ...prev, mergedSession: updatedSession };
      }
      return { ...prev, [sessionKey]: updatedSession };
    });
  };

  // === وظائف قراءة وتفريغ جدول المنهج من صورة بالذكاء الاصطناعي ===
  const handleAIFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAiSelectedFile(file);
    setAiError('');
    setAiExtractedData(null);
    const url = URL.createObjectURL(file);
    setAiPreviewUrl(url);
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleRunAIScan = async () => {
    if (!aiSelectedFile) {
      setAiError('يرجى اختيار أو التقاط صورة لورقة المنهج أولاً.');
      return;
    }
    setAiScanning(true);
    setAiError('');
    try {
      const base64 = await fileToBase64(aiSelectedFile);
      const mimeType = aiSelectedFile.type || 'image/jpeg';
      const targetMonthDoc = curricula.find(c => c.id === aiTargetMonthKey) || currentMonthData;

      const result = await extractCurriculumFromPaperImage({
        fileBase64: base64,
        mimeType: mimeType,
        customInstructions: `الشهر المستهدف: ${targetMonthDoc?.monthName || ''} لسنة ${targetMonthDoc?.year || 2026}. اكتب جميع الأرقام بالأرقام الإنجليزية (1, 2, 3...) حصراً.`
      });

      if (!result || !result.fridays || !Array.isArray(result.fridays) || result.fridays.length === 0) {
        throw new Error('لم يتمكن الذكاء الاصطناعي من قراءة أي جمعات صالحة من الصورة. يرجى التأكد من وضوح الصورة وتناسق الأعمدة.');
      }

      // ربط أسماء الخدام المستخرجة بالخدام المسجلين في المنظومة
      const matchServant = (name) => {
        if (!name) return null;
        const clean = name.trim().toLowerCase();
        return registeredServants.find(s => {
          const sName = (s.fullName || s.name || '').toLowerCase();
          return sName.includes(clean) || clean.includes(sName);
        });
      };

      const mappedFridays = result.fridays.map((extractedF, idx) => {
        const dNum = extractedF.dayNumber || idx + 1;
        const year = targetMonthDoc?.year || 2026;
        const month = String(targetMonthDoc?.month || 11).padStart(2, '0');
        const dayStr = String(dNum).padStart(2, '0');
        const dateStr = extractedF.date || `${year}-${month}-${dayStr}`;

        const s1Servant = matchServant(extractedF.session1?.speakerName);
        const s2Servant = matchServant(extractedF.session2?.speakerName);
        const mergedServant = matchServant(extractedF.mergedSession?.speakerName);

        return {
          id: `f_${dateStr}`,
          date: dateStr,
          displayDate: extractedF.displayDate || `الجمعة ${dNum} ${targetMonthDoc?.monthName || ''} ${year}`,
          dayNumber: dNum,
          isMerged: !!extractedF.isMerged,
          notes: extractedF.notes || '',
          mergedSession: {
            subject: extractedF.mergedSession?.subject || 'ندوة عامة',
            title: extractedF.mergedSession?.title || '',
            speakerType: mergedServant ? 'internal' : (extractedF.mergedSession?.speakerType || 'internal'),
            speakerId: mergedServant ? mergedServant.id : '',
            speakerName: mergedServant ? mergedServant.fullName : (extractedF.mergedSession?.speakerName || ''),
            speakerPhone: mergedServant ? mergedServant.phone : '',
            externalTitle: extractedF.mergedSession?.externalTitle || 'أستاذ',
            externalName: extractedF.mergedSession?.externalName || '',
            externalPhone: extractedF.mergedSession?.externalPhone || '',
            reminderSent: false,
            whatsappSent: false
          },
          session1: {
            subject: extractedF.session1?.subject || 'كتاب مقدس',
            title: extractedF.session1?.title || '',
            speakerType: s1Servant ? 'internal' : (extractedF.session1?.speakerType || 'internal'),
            speakerId: s1Servant ? s1Servant.id : '',
            speakerName: s1Servant ? s1Servant.fullName : (extractedF.session1?.speakerName || ''),
            speakerPhone: s1Servant ? s1Servant.phone : '',
            externalTitle: extractedF.session1?.externalTitle || 'طاسوني',
            externalName: extractedF.session1?.externalName || '',
            externalPhone: extractedF.session1?.externalPhone || '',
            reminderSent: false,
            whatsappSent: false
          },
          session2: {
            subject: extractedF.session2?.subject || 'طقس',
            title: extractedF.session2?.title || '',
            speakerType: s2Servant ? 'internal' : (extractedF.session2?.speakerType || 'internal'),
            speakerId: s2Servant ? s2Servant.id : '',
            speakerName: s2Servant ? s2Servant.fullName : (extractedF.session2?.speakerName || ''),
            speakerPhone: s2Servant ? s2Servant.phone : '',
            externalTitle: extractedF.session2?.externalTitle || 'طاسوني',
            externalName: extractedF.session2?.externalName || '',
            externalPhone: extractedF.session2?.externalPhone || '',
            reminderSent: false,
            whatsappSent: false
          }
        };
      });

      setAiExtractedData({
        ...result,
        fridays: mappedFridays
      });
      showToast('تم فك الخط واستخراج بيانات الجدول بنجاح! راجعها واضغط اعتماد 🪄');
    } catch (err) {
      console.error('AI Scan error:', err);
      setAiError(err.message || 'حدث خطأ أثناء قراءة الصورة بالذكاء الاصطناعي.');
    } finally {
      setAiScanning(false);
    }
  };

  const handleApplyExtractedCurriculum = async () => {
    if (!aiExtractedData || !aiExtractedData.fridays) return;
    setSaving(true);
    try {
      const targetMonthDoc = curricula.find(c => c.id === aiTargetMonthKey) || currentMonthData;
      if (!targetMonthDoc) throw new Error('الشهر المستهدف غير موجود.');

      const docKey = targetMonthDoc.docId || (targetMonthDoc.id.startsWith('weekly_') ? targetMonthDoc.id : `weekly_${targetMonthDoc.id}`);
      const docRef = doc(db, 'service_curriculum', docKey);

      await updateDoc(docRef, {
        fridays: aiExtractedData.fridays,
        updatedAt: serverTimestamp(),
        updatedBy: user?.fullName || 'الذكاء الاصطناعي'
      });

      // تحديث الحالة المحلية
      setCurricula(prev => prev.map(c => {
        if (c.id === targetMonthDoc.id || c.docId === docKey) {
          return { ...c, fridays: aiExtractedData.fridays };
        }
        return c;
      }));

      setShowAIScanModal(false);
      setAiExtractedData(null);
      setAiSelectedFile(null);
      setAiPreviewUrl(null);
      showToast('تم اعتماد وتطبيق جدول المنهج المستخرج بنجاح في المنظومة 💾');
    } catch (err) {
      console.error('Error applying AI curriculum:', err);
      alert('حدث خطأ أثناء تطبيق الجدول المستخرج: ' + (err?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  // إرسال تذكير واتساب للمتكلم الخارجي (يدوياً حصراً)
  const handleSendWhatsAppToExternal = async (friday, session, sessionKey = 'session1', reminderType = 'first') => {
    const title = session.externalTitle || 'أستاذ';
    const name = session.externalName || session.speakerName || 'المتكلم';
    const topic = session.title 
      ? `${session.subject || 'فقرة'} (${session.title})` 
      : (session.subject || 'فقرة الخدمة');
    const dateText = friday.displayDate;
    const phone = (session.externalPhone || session.speakerPhone || '').replace(/\D/g, '');

    if (!phone) {
      alert('يرجى التأكد من كتابة رقم الواتساب الخاص بالمتكلم أولاً.');
      return;
    }

    const isWednesday = reminderType === 'wednesday';

    const msg = isWednesday
      ? `صباح الخير وسلام ونعمة ${title} ${name}، نذكركم بكل محبة بلقائنا المبارك يوم الجمعة القادمة (${dateText}) في خدمة إعداد خدام، في موضوع: (${topic}). ننتظر بركة حضوركم وكلمتكم بكل شوق، وربنا يعوض تعب محبتكم.`
      : `سلام ونعمة ${title} ${name}، نذكرك إن عليك فقرة باسم (${topic}) في إعداد خدام يوم ${dateText}، في انتظارك، وربنا يعوض تعب محبتك.`;

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
              if (isWednesday) {
                targetSession.whatsappWednesdaySent = true;
              } else {
                targetSession.whatsappSent = true;
              }
            }
          }
          return f;
        });
        await updateDoc(docRef, { fridays: nextFridays }).catch(e => console.warn('Status update notice:', e));
      }

      // إرسال إشعار متابعة لأمين الخدمة والمشرف العام
      const leaderTitle = isWednesday
        ? '🕊️ متابعة المنهج: تذكير واتساب الأربعاء لمتكلم خارجي'
        : '💬 متابعة المنهج: تذكير واتساب لمتكلم خارجي';
      const leaderDesc = isWednesday
        ? `تم إرسال تذكير واتساب الأربعاء للمتكلم الخارجي (${title} ${name}) بخصوص فقرة: (${topic}) ليوم الجمعة (${dateText}).`
        : `تم إرسال تذكير الواتساب للمتكلم الخارجي (${title} ${name}) بخصوص فقرة: (${topic}) ليوم الجمعة (${dateText}).`;

      await addDoc(collection(db, 'notifications'), {
        targetUserId: 'LEADERSHIP',
        title: leaderTitle,
        desc: leaderDesc,
        time: 'الآن',
        type: 'weekly_curriculum',
        createdAt: serverTimestamp()
      }).catch(() => {});

      triggerServerPush({
        targetUserId: 'LEADERSHIP',
        title: leaderTitle,
        body: leaderDesc,
        url: '/'
      }).catch(() => {});

      showToast(`تم فتح الواتساب بنجاح وإرسال التذكير لـ ${title} ${name} 💬`);
    } catch (err) {
      console.warn('Notice updating whatsapp status:', err);
    }
  };

  // إرسال تذكير داخلي لخادم بالمنظومة (Web Push + In-App Notification + إشعار متابعة للإدارة)
  const handleSendInternalServantReminder = async (friday, session, sessionKey = 'session1', reminderType = 'first') => {
    const servantId = session.speakerId;
    const servantName = getSpeakerDisplayName(session);
    const topic = session.title 
      ? `${session.subject || 'فقرة'} (${session.title})` 
      : (session.subject || 'فقرة الخدمة');
    const dateText = friday.displayDate || '';

    if (!servantId) {
      alert('يرجى اختيار الخادم المسجل أولاً لإرسال التنبيه لحسابه.');
      return;
    }

    const isWednesday = reminderType === 'wednesday';

    const notifTitle = isWednesday
      ? '🕊️ تذكير محبة قبل لقاء الجمعة'
      : '📖 بركة تحضير كلمة الخدمة القادمة';

    const notifDesc = isWednesday
      ? `صباح الخير وسلام ونعمة، تذكير ودي وبسيط بأن لقاء الجمعة (${dateText}) على الأبواب، ويسعدنا مراجعة أو مشاركة تحضير موضوع: (${topic}) مع أمين الخدمة قبل اللقاء. نصلي أن يستخدمك الرب بقوة في هذه الكلمة.`
      : `سلام ونعمة يا خادمنا المبارك، نذكرك بكل محبة بأن عليك بركة تحضير موضوع: (${topic}) ليوم الجمعة القادمة (${dateText}). ربنا يبارك تعبك ووقتك ليكون سبباً في بركة ونمو جميع إخوتك.`;

    const leaderTitle = isWednesday
      ? '🕊️ متابعة المنهج: تذكير الأربعاء الودي'
      : '📋 متابعة المنهج: تذكير التحضير الأول';

    const leaderDesc = isWednesday
      ? `تم إرسال تذكير الأربعاء الودي للخادم (${servantName}) لمراجعة وتحضيرات كلمة الجمعة (${dateText}) في موضوع: (${topic}).`
      : `تم إرسال رسالة التذكير الأولى للخادم (${servantName}) لتحضير فقرة: (${topic}) ليوم الجمعة (${dateText}).`;

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

      // 2. إرسال Push Notification لهاتف الخادم
      triggerServerPush({
        targetUserId: servantId,
        title: notifTitle,
        body: notifDesc,
        url: '/'
      }).catch(() => {});

      // 3. إرسال إشعار متابعة فوري لأمين الخدمة والمشرف العام
      await addDoc(collection(db, 'notifications'), {
        targetUserId: 'LEADERSHIP',
        title: leaderTitle,
        desc: leaderDesc,
        time: 'الآن',
        type: 'weekly_curriculum',
        createdAt: serverTimestamp()
      });

      triggerServerPush({
        targetUserId: 'LEADERSHIP',
        title: leaderTitle,
        body: leaderDesc,
        url: '/'
      }).catch(() => {});

      // 4. تحديث حالة إرسال التذكير في الجدول
      if (currentMonthData) {
        const docKey = currentMonthData.docId || (currentMonthData.id.startsWith('weekly_') ? currentMonthData.id : `weekly_${currentMonthData.id}`);
        const docRef = doc(db, 'service_curriculum', docKey);
        const nextFridays = currentMonthData.fridays.map(f => {
          if (f.id === friday.id) {
            const targetSession = sessionKey === 'merged' ? f.mergedSession : f[sessionKey];
            if (targetSession) {
              if (isWednesday) {
                targetSession.wednesdayReminderSent = true;
              } else {
                targetSession.reminderSent = true;
              }
            }
          }
          return f;
        });
        await updateDoc(docRef, { fridays: nextFridays }).catch(e => console.warn('Status update notice:', e));
      }

      showToast(
        isWednesday
          ? `تم إرسال تذكير الأربعاء الودي إلى الخادم (${servantName}) وإخطار القيادة 🕊️`
          : `تم إرسال تذكير التحضير إلى الخادم (${servantName}) وإخطار القيادة 🔔`
      );
    } catch (err) {
      console.error('Error sending servant reminder:', err);
      alert('حدث خطأ أثناء إرسال التنبيه: ' + (err?.message || ''));
    }
  };

  // حساب الجمعة القادمة الفعلي ليكون دائماً الأقرب زمنياً لليوم الحالي تصاعدياً
  const upcomingFridayInfo = useMemo(() => {
    if (!curricula || curricula.length === 0) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allUpcoming = [];
    for (const c of curricula) {
      if (!c.fridays) continue;
      for (const f of c.fridays) {
        const parts = (f.date || '').split('-');
        if (parts.length === 3) {
          const fDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          if (fDate >= today) {
            allUpcoming.push({ monthData: c, friday: f, dateObj: fDate });
          }
        }
      }
    }

    if (allUpcoming.length === 0) return null;

    // ترتيب تصاعدي دقيق للحصول على الجمعة الأقرب لليوم
    allUpcoming.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    return allUpcoming[0];
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
            {/* زر قراءة وتفريغ الورقة بالذكاء الاصطناعي */}
            <button
              type="button"
              onClick={() => {
                setAiTargetMonthKey(activeMonthKey || '2026-11');
                setAiSelectedFile(null);
                setAiPreviewUrl(null);
                setAiExtractedData(null);
                setAiError('');
                setShowAIScanModal(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-gold-400/20 hover:bg-gold-400/30 text-gold-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-gold-400/30"
              title="قراءة وتفريغ ورقة المنهج بالذكاء الاصطناعي"
            >
              <Sparkles className="w-3.5 h-3.5 text-gold-300 animate-pulse" />
              <span>قراءة الجدول من صورة 📸</span>
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

        {/* Month Selector Pills (مرتبة من اليمين إلى اليسار تصاعدياً) */}
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
                    setEditingFridayId(null);
                    setSingleFridayEdit(null);
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
                <span>إرسال واتساب لـ ({getSpeakerDisplayName(item.session)})</span>
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
                    ندوة / فقرة موحدة: {upcomingFridayInfo.friday.mergedSession?.title || upcomingFridayInfo.friday.mergedSession?.subject || 'لم يُحدد موضوع'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100">
                  <span className="text-slate-600 font-bold">
                    المتكلم: {getSpeakerDisplayName(upcomingFridayInfo.friday.mergedSession)}
                  </span>
                  {upcomingFridayInfo.friday.mergedSession?.speakerType === 'external' ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppToExternal(upcomingFridayInfo.friday, upcomingFridayInfo.friday.mergedSession, 'merged', 'first')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>{upcomingFridayInfo.friday.mergedSession?.whatsappSent ? 'واتساب ✅' : 'واتساب 💬'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppToExternal(upcomingFridayInfo.friday, upcomingFridayInfo.friday.mergedSession, 'merged', 'wednesday')}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>{upcomingFridayInfo.friday.mergedSession?.whatsappWednesdaySent ? 'واتساب الأربعاء ✅' : 'واتساب الأربعاء 🕊️'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSendInternalServantReminder(upcomingFridayInfo.friday, upcomingFridayInfo.friday.mergedSession, 'merged', 'first')}
                        className="px-2.5 py-1 rounded-lg bg-maroon-800 hover:bg-maroon-900 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Bell className="w-3 h-3 text-gold-300" />
                        <span>{upcomingFridayInfo.friday.mergedSession?.reminderSent ? 'تم تذكير التحضير ✅' : 'تذكير التحضير 🔔'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendInternalServantReminder(upcomingFridayInfo.friday, upcomingFridayInfo.friday.mergedSession, 'merged', 'wednesday')}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>{upcomingFridayInfo.friday.mergedSession?.wednesdayReminderSent ? 'تم تذكير الأربعاء ✅' : 'تذكير الأربعاء 🕊️'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Session 1 */}
                <div className="p-2.5 rounded-xl bg-white border border-amber-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[11px] pb-1 border-b border-amber-50">
                      <span className="font-black text-maroon-900">فقرة أولى:</span>
                      <span className="bg-maroon-900/10 text-maroon-900 px-1.5 py-0.2 rounded font-bold text-[10px]">
                        {upcomingFridayInfo.friday.session1?.subject || 'كتاب مقدس'}
                      </span>
                    </div>
                    <p className="font-bold text-slate-800 mt-1">
                      {upcomingFridayInfo.friday.session1?.title || upcomingFridayInfo.friday.session1?.subject || 'لم يُحدد'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100">
                    <span className="text-slate-600 font-bold truncate">
                      المتكلم: {getSpeakerDisplayName(upcomingFridayInfo.friday.session1)}
                    </span>
                    {upcomingFridayInfo.friday.session1?.speakerType === 'external' ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSendWhatsAppToExternal(upcomingFridayInfo.friday, upcomingFridayInfo.friday.session1, 'session1', 'first')}
                          className="px-2 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>{upcomingFridayInfo.friday.session1?.whatsappSent ? 'واتساب ✅' : 'واتساب 💬'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendWhatsAppToExternal(upcomingFridayInfo.friday, upcomingFridayInfo.friday.session1, 'session1', 'wednesday')}
                          className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <span>{upcomingFridayInfo.friday.session1?.whatsappWednesdaySent ? 'الأربعاء ✅' : 'الأربعاء 🕊️'}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSendInternalServantReminder(upcomingFridayInfo.friday, upcomingFridayInfo.friday.session1, 'session1', 'first')}
                          className="px-2 py-1 rounded-lg bg-maroon-800 hover:bg-maroon-900 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Bell className="w-3 h-3 text-gold-300" />
                          <span>{upcomingFridayInfo.friday.session1?.reminderSent ? 'تم التذكير ✅' : 'تذكير التحضير'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendInternalServantReminder(upcomingFridayInfo.friday, upcomingFridayInfo.friday.session1, 'session1', 'wednesday')}
                          className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <span>{upcomingFridayInfo.friday.session1?.wednesdayReminderSent ? 'الأربعاء ✅' : 'الأربعاء 🕊️'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Session 2 */}
                <div className="p-2.5 rounded-xl bg-white border border-amber-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[11px] pb-1 border-b border-amber-50">
                      <span className="font-black text-maroon-900">فقرة ثانية:</span>
                      <span className="bg-amber-500/10 text-amber-900 px-1.5 py-0.2 rounded font-bold text-[10px]">
                        {upcomingFridayInfo.friday.session2?.subject || 'طقس'}
                      </span>
                    </div>
                    <p className="font-bold text-slate-800 mt-1">
                      {upcomingFridayInfo.friday.session2?.title || upcomingFridayInfo.friday.session2?.subject || 'لم يُحدد'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100">
                    <span className="text-slate-600 font-bold truncate">
                      المتكلم: {getSpeakerDisplayName(upcomingFridayInfo.friday.session2)}
                    </span>
                    {upcomingFridayInfo.friday.session2?.speakerType === 'external' ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSendWhatsAppToExternal(upcomingFridayInfo.friday, upcomingFridayInfo.friday.session2, 'session2', 'first')}
                          className="px-2 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>{upcomingFridayInfo.friday.session2?.whatsappSent ? 'واتساب ✅' : 'واتساب 💬'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendWhatsAppToExternal(upcomingFridayInfo.friday, upcomingFridayInfo.friday.session2, 'session2', 'wednesday')}
                          className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <span>{upcomingFridayInfo.friday.session2?.whatsappWednesdaySent ? 'الأربعاء ✅' : 'الأربعاء 🕊️'}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSendInternalServantReminder(upcomingFridayInfo.friday, upcomingFridayInfo.friday.session2, 'session2', 'first')}
                          className="px-2 py-1 rounded-lg bg-maroon-800 hover:bg-maroon-900 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Bell className="w-3 h-3 text-gold-300" />
                          <span>{upcomingFridayInfo.friday.session2?.reminderSent ? 'تم التذكير ✅' : 'تذكير التحضير'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendInternalServantReminder(upcomingFridayInfo.friday, upcomingFridayInfo.friday.session2, 'session2', 'wednesday')}
                          className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <span>{upcomingFridayInfo.friday.session2?.wednesdayReminderSent ? 'الأربعاء ✅' : 'الأربعاء 🕊️'}</span>
                        </button>
                      </div>
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
                    onClick={() => handleAddFridayToCurrentMonth()}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-xl bg-gold-400 hover:bg-gold-500 text-maroon-950 text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة جمعة ➕</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 rounded-xl bg-maroon-800 hover:bg-maroon-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-gold-300" />
                    <span>تعديل كل الجدول ✏️</span>
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
            {((isEditing ? editData?.fridays : currentMonthData?.fridays) || []).map((friday, fIdx) => {
              const isThisFridayEditing = isEditing || editingFridayId === friday.id;
              const activeFriday = editingFridayId === friday.id ? (singleFridayEdit || friday) : (isEditing ? friday : friday);

              return (
                <div 
                  key={friday.id || fIdx}
                  className={`rounded-2xl border p-3 sm:p-4 space-y-3 transition-all ${
                    isThisFridayEditing 
                      ? 'border-maroon-800 bg-amber-50/20 shadow-sm ring-1 ring-maroon-800/20' 
                      : 'border-slate-200 bg-slate-50/50 hover:border-gold-300'
                  }`}
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

                    {/* Actions on this Friday Header */}
                    <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
                      {editingFridayId === friday.id ? (
                        <>
                          <button
                            type="button"
                            onClick={handleToggleMergeSingleFriday}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              singleFridayEdit?.isMerged
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            }`}
                          >
                            <span>{singleFridayEdit?.isMerged ? '🔄 فك الدمج' : '🔀 دمج (ندوة)'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleSaveSingleFriday}
                            disabled={saving}
                            className="px-2.5 py-1 rounded-xl bg-maroon-800 hover:bg-maroon-900 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5 text-gold-300" />
                            <span>حفظ الجمعة 💾</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleCancelEditFriday}
                            className="px-2.5 py-1 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
                          >
                            إلغاء ✕
                          </button>
                        </>
                      ) : isEditing ? (
                        <button
                          type="button"
                          onClick={() => handleToggleMergeFriday(fIdx)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            friday.isMerged
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          <span>{friday.isMerged ? '🔄 فك الدمج' : '🔀 دمج الخانتين (ندوة)'}</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEditFriday(friday)}
                            className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 text-maroon-900 border border-maroon-900/30 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                            title="تعديل هذا الأسبوع فقط"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-maroon-800" />
                            <span>تعديل الجمعة ✏️</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteFriday(friday.id, friday.displayDate)}
                            className="px-2.5 py-1 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                            title="حذف هذا الأسبوع من جدول المنهج"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>حذف الجمعة 🗑️</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Friday Sessions Rendering */}
                  {activeFriday.isMerged ? (
                    /* 1. Merged Unified Session */
                    <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                        <span>فقرة موحدة / ندوة / لقاء مفتوح 🌟</span>
                        {activeFriday.mergedSession?.subject && (
                          <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md font-bold">
                            {activeFriday.mergedSession.subject}
                          </span>
                        )}
                      </div>

                      {isThisFridayEditing ? (
                        <div className="space-y-2 pt-1">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">المادة / نوع الفقرة</label>
                              <select
                                value={activeFriday.mergedSession?.subject || 'ندوة عامة'}
                                onChange={(e) => {
                                  if (editingFridayId === friday.id) {
                                    handleUpdateSingleSessionField('merged', 'subject', e.target.value);
                                  } else {
                                    handleUpdateSessionField(fIdx, 'merged', 'subject', e.target.value);
                                  }
                                }}
                                className="w-full px-2 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-bold"
                              >
                                {STANDARD_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">عنوان الندوة أو الموضوع</label>
                              <input
                                type="text"
                                value={activeFriday.mergedSession?.title || ''}
                                onChange={(e) => {
                                  if (editingFridayId === friday.id) {
                                    handleUpdateSingleSessionField('merged', 'title', e.target.value);
                                  } else {
                                    handleUpdateSessionField(fIdx, 'merged', 'title', e.target.value);
                                  }
                                }}
                                placeholder="عنوان الموضوع أو الندوة الموحدة..."
                                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-bold"
                              />
                            </div>
                          </div>

                          {/* Speaker Type Selector */}
                          <div className="flex items-center gap-3 text-xs font-bold text-slate-700 pt-1">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name={`speaker_type_merged_${friday.id}`}
                                checked={activeFriday.mergedSession?.speakerType !== 'external'}
                                onChange={() => {
                                  if (editingFridayId === friday.id) {
                                    handleUpdateSingleSessionField('merged', 'speakerType', 'internal');
                                  } else {
                                    handleUpdateSessionField(fIdx, 'merged', 'speakerType', 'internal');
                                  }
                                }}
                              />
                              <span>خادم من الخدمة</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name={`speaker_type_merged_${friday.id}`}
                                checked={activeFriday.mergedSession?.speakerType === 'external'}
                                onChange={() => {
                                  if (editingFridayId === friday.id) {
                                    handleUpdateSingleSessionField('merged', 'speakerType', 'external');
                                  } else {
                                    handleUpdateSessionField(fIdx, 'merged', 'speakerType', 'external');
                                  }
                                }}
                              />
                              <span>متكلم خارجي (ضيف / كاهن)</span>
                            </label>
                          </div>

                          {activeFriday.mergedSession?.speakerType === 'external' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">اللقب</label>
                                <select
                                  value={activeFriday.mergedSession?.externalTitle || 'أستاذ'}
                                  onChange={(e) => {
                                    if (editingFridayId === friday.id) {
                                      handleUpdateSingleSessionField('merged', 'externalTitle', e.target.value);
                                    } else {
                                      handleUpdateSessionField(fIdx, 'merged', 'externalTitle', e.target.value);
                                    }
                                  }}
                                  className="w-full px-2 py-1 text-xs rounded-xl border border-slate-300 bg-white font-bold"
                                >
                                  {EXTERNAL_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">اسم المتكلم</label>
                                <input
                                  type="text"
                                  value={activeFriday.mergedSession?.externalName || activeFriday.mergedSession?.speakerName || ''}
                                  onChange={(e) => {
                                    if (editingFridayId === friday.id) {
                                      handleUpdateSingleSessionField('merged', 'externalName', e.target.value);
                                    } else {
                                      handleUpdateSessionField(fIdx, 'merged', 'externalName', e.target.value);
                                    }
                                  }}
                                  placeholder="الاسم الكريم"
                                  className="w-full px-2 py-1 text-xs rounded-xl border border-slate-300 bg-white font-bold"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">رقم الواتساب</label>
                                <input
                                  type="tel"
                                  value={activeFriday.mergedSession?.externalPhone || activeFriday.mergedSession?.speakerPhone || ''}
                                  onChange={(e) => {
                                    if (editingFridayId === friday.id) {
                                      handleUpdateSingleSessionField('merged', 'externalPhone', e.target.value);
                                    } else {
                                      handleUpdateSessionField(fIdx, 'merged', 'externalPhone', e.target.value);
                                    }
                                  }}
                                  placeholder="01xxxxxxxxx"
                                  className="w-full px-2 py-1 text-xs rounded-xl border border-slate-300 bg-white font-mono"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1.5 pt-1">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">اختيار الخادم من القائمة</label>
                                <select
                                  value={activeFriday.mergedSession?.speakerId || ''}
                                  onChange={(e) => {
                                    if (editingFridayId === friday.id) {
                                      handleSelectSingleInternalSpeaker('merged', e.target.value);
                                    } else {
                                      handleSelectInternalSpeaker(fIdx, 'merged', e.target.value);
                                    }
                                  }}
                                  className="w-full px-2 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-bold"
                                >
                                  <option value="">-- اضغط لاختيار الخادم المسؤول --</option>
                                  {registeredServants.map(s => (
                                    <option key={s.id} value={s.id}>{s.fullName} ({s.phone || 'بدون هاتف'})</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">اسم المتكلم المعروض (يمكن تعديله يدوياً)</label>
                                <input
                                  type="text"
                                  value={activeFriday.mergedSession?.speakerName || ''}
                                  onChange={(e) => {
                                    if (editingFridayId === friday.id) {
                                      handleUpdateSingleSessionField('merged', 'speakerName', e.target.value);
                                    } else {
                                      handleUpdateSessionField(fIdx, 'merged', 'speakerName', e.target.value);
                                    }
                                  }}
                                  placeholder="اسم الخادم المتكلم..."
                                  className="w-full px-2 py-1 text-xs rounded-lg border border-slate-300 font-bold"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                          <div>
                            <p className="text-xs font-black text-slate-800">
                              {friday.mergedSession?.title || friday.mergedSession?.subject || 'لم يُحدد موضوع'}
                            </p>
                            <p className="text-[11px] text-slate-600 mt-0.5">
                              <span className="font-bold">المتكلم:</span>{' '}
                              {getSpeakerDisplayName(friday.mergedSession)}
                            </p>
                          </div>

                          {friday.mergedSession?.speakerType === 'external' ? (
                            <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                              <button
                                type="button"
                                onClick={() => handleSendWhatsAppToExternal(friday, friday.mergedSession, 'merged', 'first')}
                                className="px-2.5 py-1 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>{friday.mergedSession?.whatsappSent ? 'واتساب ✅' : 'تذكير واتساب 💬'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendWhatsAppToExternal(friday, friday.mergedSession, 'merged', 'wednesday')}
                                className="px-2.5 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              >
                                <span>{friday.mergedSession?.whatsappWednesdaySent ? 'واتساب الأربعاء ✅' : 'واتساب الأربعاء 🕊️'}</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                              <button
                                type="button"
                                onClick={() => handleSendInternalServantReminder(friday, friday.mergedSession, 'merged', 'first')}
                                className="px-2.5 py-1 rounded-xl bg-maroon-800 hover:bg-maroon-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              >
                                <Bell className="w-3.5 h-3.5 text-gold-300" />
                                <span>{friday.mergedSession?.reminderSent ? 'تم تذكير التحضير ✅' : 'تذكير التحضير 🔔'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendInternalServantReminder(friday, friday.mergedSession, 'merged', 'wednesday')}
                                className="px-2.5 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              >
                                <span>{friday.mergedSession?.wednesdayReminderSent ? 'تم تذكير الأربعاء ✅' : 'تذكير الأربعاء 🕊️'}</span>
                              </button>
                            </div>
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
                          {activeFriday.session1?.subject && (
                            <span className="text-[10px] bg-maroon-900/10 text-maroon-900 border border-maroon-900/20 px-2 py-0.5 rounded-md font-bold">
                              {activeFriday.session1.subject}
                            </span>
                          )}
                        </div>

                        {isThisFridayEditing ? (
                          <div className="space-y-2">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">المادة</label>
                              <select
                                value={activeFriday.session1?.subject || 'كتاب مقدس'}
                                onChange={(e) => {
                                  if (editingFridayId === friday.id) {
                                    handleUpdateSingleSessionField('session1', 'subject', e.target.value);
                                  } else {
                                    handleUpdateSessionField(fIdx, 'session1', 'subject', e.target.value);
                                  }
                                }}
                                className="w-full px-2 py-1 text-xs rounded-xl border border-slate-300 bg-white font-bold"
                              >
                                {STANDARD_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">عنوان الفقرة / الشاهد (اختياري)</label>
                              <input
                                type="text"
                                value={activeFriday.session1?.title || ''}
                                onChange={(e) => {
                                  if (editingFridayId === friday.id) {
                                    handleUpdateSingleSessionField('session1', 'title', e.target.value);
                                  } else {
                                    handleUpdateSessionField(fIdx, 'session1', 'title', e.target.value);
                                  }
                                }}
                                placeholder="مثال: تك 25 - 44 (أو اتركه فارغاً)"
                                className="w-full px-2.5 py-1 text-xs rounded-xl border border-slate-300 font-bold"
                              />
                            </div>

                            <div className="flex items-center gap-3 text-[11px] font-bold text-slate-700">
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`s1_type_${friday.id}`}
                                  checked={activeFriday.session1?.speakerType !== 'external'}
                                  onChange={() => {
                                    if (editingFridayId === friday.id) {
                                      handleUpdateSingleSessionField('session1', 'speakerType', 'internal');
                                    } else {
                                      handleUpdateSessionField(fIdx, 'session1', 'speakerType', 'internal');
                                    }
                                  }}
                                />
                                <span>خادم بالخدمة</span>
                              </label>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`s1_type_${friday.id}`}
                                  checked={activeFriday.session1?.speakerType === 'external'}
                                  onChange={() => {
                                    if (editingFridayId === friday.id) {
                                      handleUpdateSingleSessionField('session1', 'speakerType', 'external');
                                    } else {
                                      handleUpdateSessionField(fIdx, 'session1', 'speakerType', 'external');
                                    }
                                  }}
                                />
                                <span>متكلم خارجي</span>
                              </label>
                            </div>

                            {activeFriday.session1?.speakerType === 'external' ? (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-0.5">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">اللقب</label>
                                  <select
                                    value={activeFriday.session1?.externalTitle || 'طاسوني'}
                                    onChange={(e) => {
                                      if (editingFridayId === friday.id) {
                                        handleUpdateSingleSessionField('session1', 'externalTitle', e.target.value);
                                      } else {
                                        handleUpdateSessionField(fIdx, 'session1', 'externalTitle', e.target.value);
                                      }
                                    }}
                                    className="w-full px-2 py-1 text-xs rounded-lg border border-slate-300 bg-white font-bold"
                                  >
                                    {EXTERNAL_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">اسم المتكلم</label>
                                  <input
                                    type="text"
                                    value={activeFriday.session1?.externalName || activeFriday.session1?.speakerName || ''}
                                    onChange={(e) => {
                                      if (editingFridayId === friday.id) {
                                        handleUpdateSingleSessionField('session1', 'externalName', e.target.value);
                                      } else {
                                        handleUpdateSessionField(fIdx, 'session1', 'externalName', e.target.value);
                                      }
                                    }}
                                    placeholder="الاسم"
                                    className="w-full px-2 py-1 text-xs rounded-lg border border-slate-300 font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">رقم الواتساب</label>
                                  <input
                                    type="tel"
                                    value={activeFriday.session1?.externalPhone || activeFriday.session1?.speakerPhone || ''}
                                    onChange={(e) => {
                                      if (editingFridayId === friday.id) {
                                        handleUpdateSingleSessionField('session1', 'externalPhone', e.target.value);
                                      } else {
                                        handleUpdateSessionField(fIdx, 'session1', 'externalPhone', e.target.value);
                                      }
                                    }}
                                    placeholder="الواتساب"
                                    className="w-full px-2 py-1 text-xs rounded-lg border border-slate-300 font-mono"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1.5 pt-0.5">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">اختيار الخادم من القائمة</label>
                                  <select
                                    value={activeFriday.session1?.speakerId || ''}
                                    onChange={(e) => {
                                      if (editingFridayId === friday.id) {
                                        handleSelectSingleInternalSpeaker('session1', e.target.value);
                                      } else {
                                        handleSelectInternalSpeaker(fIdx, 'session1', e.target.value);
                                      }
                                    }}
                                    className="w-full px-2 py-1 text-xs rounded-xl border border-slate-300 bg-white font-bold"
                                  >
                                    <option value="">-- اختيار الخادم المتكلم --</option>
                                    {registeredServants.map(s => (
                                      <option key={s.id} value={s.id}>{s.fullName}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">اسم المتكلم المعروض (يمكن تعديله يدوياً)</label>
                                  <input
                                    type="text"
                                    value={activeFriday.session1?.speakerName || ''}
                                    onChange={(e) => {
                                      if (editingFridayId === friday.id) {
                                        handleUpdateSingleSessionField('session1', 'speakerName', e.target.value);
                                      } else {
                                        handleUpdateSessionField(fIdx, 'session1', 'speakerName', e.target.value);
                                      }
                                    }}
                                    placeholder="اسم الخادم المتكلم..."
                                    className="w-full px-2 py-1 text-xs rounded-lg border border-slate-300 font-bold"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <p className="text-xs font-black text-slate-800">
                              {friday.session1?.title || friday.session1?.subject || 'لم يُحدد موضوع'}
                            </p>
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                              <span className="text-[11px] text-slate-600 font-bold truncate">
                                المتكلم: {getSpeakerDisplayName(friday.session1)}
                              </span>
                              {friday.session1?.speakerType === 'external' ? (
                                <div className="flex flex-wrap items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleSendWhatsAppToExternal(friday, friday.session1, 'session1', 'first')}
                                    className="px-2 py-0.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                    <span>{friday.session1?.whatsappSent ? 'واتساب ✅' : 'واتساب 💬'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSendWhatsAppToExternal(friday, friday.session1, 'session1', 'wednesday')}
                                    className="px-2 py-0.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                                  >
                                    <span>{friday.session1?.whatsappWednesdaySent ? 'الأربعاء ✅' : 'الأربعاء 🕊️'}</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="flex flex-wrap items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleSendInternalServantReminder(friday, friday.session1, 'session1', 'first')}
                                    className="px-2 py-0.5 rounded-lg bg-maroon-800 hover:bg-maroon-900 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                                  >
                                    <Bell className="w-3 h-3 text-gold-300" />
                                    <span>{friday.session1?.reminderSent ? 'تم التذكير ✅' : 'تذكير'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSendInternalServantReminder(friday, friday.session1, 'session1', 'wednesday')}
                                    className="px-2 py-0.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                                  >
                                    <span>{friday.session1?.wednesdayReminderSent ? 'الأربعاء ✅' : 'الأربعاء 🕊️'}</span>
                                  </button>
                                </div>
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
                          {activeFriday.session2?.subject && (
                            <span className="text-[10px] bg-amber-500/10 text-amber-900 border border-amber-500/20 px-2 py-0.5 rounded-md font-bold">
                              {activeFriday.session2.subject}
                            </span>
                          )}
                        </div>

                        {isThisFridayEditing ? (
                          <div className="space-y-2">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">المادة</label>
                              <select
                                value={activeFriday.session2?.subject || 'طقس'}
                                onChange={(e) => {
                                  if (editingFridayId === friday.id) {
                                    handleUpdateSingleSessionField('session2', 'subject', e.target.value);
                                  } else {
                                    handleUpdateSessionField(fIdx, 'session2', 'subject', e.target.value);
                                  }
                                }}
                                className="w-full px-2 py-1 text-xs rounded-xl border border-slate-300 bg-white font-bold"
                              >
                                {STANDARD_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">عنوان الفقرة / الشاهد (اختياري)</label>
                              <input
                                type="text"
                                value={activeFriday.session2?.title || ''}
                                onChange={(e) => {
                                  if (editingFridayId === friday.id) {
                                    handleUpdateSingleSessionField('session2', 'title', e.target.value);
                                  } else {
                                    handleUpdateSessionField(fIdx, 'session2', 'title', e.target.value);
                                  }
                                }}
                                placeholder="مثال: طقس المعمودية / عقيدة الفداء (أو اتركه فارغاً)"
                                className="w-full px-2.5 py-1 text-xs rounded-xl border border-slate-300 font-bold"
                              />
                            </div>

                            <div className="flex items-center gap-3 text-[11px] font-bold text-slate-700">
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`s2_type_${friday.id}`}
                                  checked={activeFriday.session2?.speakerType !== 'external'}
                                  onChange={() => {
                                    if (editingFridayId === friday.id) {
                                      handleUpdateSingleSessionField('session2', 'speakerType', 'internal');
                                    } else {
                                      handleUpdateSessionField(fIdx, 'session2', 'speakerType', 'internal');
                                    }
                                  }}
                                />
                                <span>خادم بالخدمة</span>
                              </label>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`s2_type_${friday.id}`}
                                  checked={activeFriday.session2?.speakerType === 'external'}
                                  onChange={() => {
                                    if (editingFridayId === friday.id) {
                                      handleUpdateSingleSessionField('session2', 'speakerType', 'external');
                                    } else {
                                      handleUpdateSessionField(fIdx, 'session2', 'speakerType', 'external');
                                    }
                                  }}
                                />
                                <span>متكلم خارجي</span>
                              </label>
                            </div>

                            {activeFriday.session2?.speakerType === 'external' ? (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-0.5">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">اللقب</label>
                                  <select
                                    value={activeFriday.session2?.externalTitle || 'طاسوني'}
                                    onChange={(e) => {
                                      if (editingFridayId === friday.id) {
                                        handleUpdateSingleSessionField('session2', 'externalTitle', e.target.value);
                                      } else {
                                        handleUpdateSessionField(fIdx, 'session2', 'externalTitle', e.target.value);
                                      }
                                    }}
                                    className="w-full px-2 py-1 text-xs rounded-lg border border-slate-300 bg-white font-bold"
                                  >
                                    {EXTERNAL_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">اسم المتكلم</label>
                                  <input
                                    type="text"
                                    value={activeFriday.session2?.externalName || activeFriday.session2?.speakerName || ''}
                                    onChange={(e) => {
                                      if (editingFridayId === friday.id) {
                                        handleUpdateSingleSessionField('session2', 'externalName', e.target.value);
                                      } else {
                                        handleUpdateSessionField(fIdx, 'session2', 'externalName', e.target.value);
                                      }
                                    }}
                                    placeholder="الاسم"
                                    className="w-full px-2 py-1 text-xs rounded-lg border border-slate-300 font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">رقم الواتساب</label>
                                  <input
                                    type="tel"
                                    value={activeFriday.session2?.externalPhone || activeFriday.session2?.speakerPhone || ''}
                                    onChange={(e) => {
                                      if (editingFridayId === friday.id) {
                                        handleUpdateSingleSessionField('session2', 'externalPhone', e.target.value);
                                      } else {
                                        handleUpdateSessionField(fIdx, 'session2', 'externalPhone', e.target.value);
                                      }
                                    }}
                                    placeholder="الواتساب"
                                    className="w-full px-2 py-1 text-xs rounded-lg border border-slate-300 font-mono"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1.5 pt-0.5">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">اختيار الخادم من القائمة</label>
                                  <select
                                    value={activeFriday.session2?.speakerId || ''}
                                    onChange={(e) => {
                                      if (editingFridayId === friday.id) {
                                        handleSelectSingleInternalSpeaker('session2', e.target.value);
                                      } else {
                                        handleSelectInternalSpeaker(fIdx, 'session2', e.target.value);
                                      }
                                    }}
                                    className="w-full px-2 py-1 text-xs rounded-xl border border-slate-300 bg-white font-bold"
                                  >
                                    <option value="">-- اختيار الخادم المتكلم --</option>
                                    {registeredServants.map(s => (
                                      <option key={s.id} value={s.id}>{s.fullName}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">اسم المتكلم المعروض (يمكن تعديله يدوياً)</label>
                                  <input
                                    type="text"
                                    value={activeFriday.session2?.speakerName || ''}
                                    onChange={(e) => {
                                      if (editingFridayId === friday.id) {
                                        handleUpdateSingleSessionField('session2', 'speakerName', e.target.value);
                                      } else {
                                        handleUpdateSessionField(fIdx, 'session2', 'speakerName', e.target.value);
                                      }
                                    }}
                                    placeholder="اسم الخادم المتكلم..."
                                    className="w-full px-2 py-1 text-xs rounded-lg border border-slate-300 font-bold"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <p className="text-xs font-black text-slate-800">
                              {friday.session2?.title || friday.session2?.subject || 'لم يُحدد موضوع'}
                            </p>
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                              <span className="text-[11px] text-slate-600 font-bold truncate">
                                المتكلم: {getSpeakerDisplayName(friday.session2)}
                              </span>
                              {friday.session2?.speakerType === 'external' ? (
                                <div className="flex flex-wrap items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleSendWhatsAppToExternal(friday, friday.session2, 'session2', 'first')}
                                    className="px-2 py-0.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                    <span>{friday.session2?.whatsappSent ? 'واتساب ✅' : 'واتساب 💬'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSendWhatsAppToExternal(friday, friday.session2, 'session2', 'wednesday')}
                                    className="px-2 py-0.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                                  >
                                    <span>{friday.session2?.whatsappWednesdaySent ? 'الأربعاء ✅' : 'الأربعاء 🕊️'}</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="flex flex-wrap items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleSendInternalServantReminder(friday, friday.session2, 'session2', 'first')}
                                    className="px-2 py-0.5 rounded-lg bg-maroon-800 hover:bg-maroon-900 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                                  >
                                    <Bell className="w-3 h-3 text-gold-300" />
                                    <span>{friday.session2?.reminderSent ? 'تم التذكير ✅' : 'تذكير'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSendInternalServantReminder(friday, friday.session2, 'session2', 'wednesday')}
                                    className="px-2 py-0.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                                  >
                                    <span>{friday.session2?.wednesdayReminderSent ? 'الأربعاء ✅' : 'الأربعاء 🕊️'}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Curriculum Paper Scanner Modal */}
      {showAIScanModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-5 space-y-4 shadow-2xl border border-gold-300/40 my-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gold-400/10 text-maroon-900 border border-gold-400/20">
                  <Sparkles className="w-4 h-4 text-gold-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    قراءة جدول المنهج من صورة بالذكاء الاصطناعي 📸
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    التقط صورة لورقة المنهج المكتوبة بخط اليد وسيقوم النظام بتفريغها تلقائياً.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAIScanModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Error Message */}
            {aiError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{aiError}</span>
              </div>
            )}

            {/* Month Target Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تطبيق المنهج المستخرج على شهر:
              </label>
              <select
                value={aiTargetMonthKey}
                onChange={(e) => setAiTargetMonthKey(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-bold bg-white"
              >
                {curricula.map(c => (
                  <option key={c.id} value={c.id}>{c.title || `${c.monthName} ${c.year}`}</option>
                ))}
              </select>
            </div>

            {/* Image Upload Area */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                صورة ورقة المنهج (تصوير بالكاميرا أو رفع ملف):
              </label>
              <div className="border-2 border-dashed border-slate-300 hover:border-gold-400 rounded-2xl p-4 text-center cursor-pointer transition-all bg-slate-50/50 relative">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleAIFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                {aiPreviewUrl ? (
                  <div className="space-y-2">
                    <img 
                      src={aiPreviewUrl} 
                      alt="ورقة المنهج" 
                      className="max-h-48 mx-auto rounded-xl shadow-xs border border-slate-200 object-contain"
                    />
                    <p className="text-[11px] text-emerald-700 font-bold">
                      ✓ تم اختيار الصورة ({aiSelectedFile?.name}). اضغط لتغييرها إن أردت.
                    </p>
                  </div>
                ) : (
                  <div className="py-4 space-y-2">
                    <div className="w-10 h-10 rounded-full bg-gold-400/20 text-maroon-900 mx-auto flex items-center justify-center">
                      <Camera className="w-5 h-5 text-gold-600" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">
                      اضغط لالتقاط صورة للورقة بالكاميرا أو اختيارها من الجهاز
                    </p>
                    <p className="text-[10px] text-slate-500">
                      يدعم صور خط اليد والجداول المطبوعة بصيغ JPG, PNG, WEBP
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Extracted Preview */}
            {aiExtractedData && (
              <div className="space-y-2 border border-emerald-200 bg-emerald-50/40 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    تم استخراج {aiExtractedData.fridays?.length || 0} جمعات بنجاح ✨
                  </span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1.5 text-xs text-slate-700 divide-y divide-emerald-100">
                  {aiExtractedData.fridays?.map((f, idx) => (
                    <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between">
                      <span className="font-bold text-slate-900">{f.displayDate}:</span>
                      <span className="text-[11px] text-slate-600">
                        {f.session1?.subject} ({f.session1?.title || '-'}) - {f.session1?.speakerName || 'بدون متكلم'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAIScanModal(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                إلغاء
              </button>

              {!aiExtractedData ? (
                <button
                  type="button"
                  onClick={handleRunAIScan}
                  disabled={aiScanning || !aiSelectedFile}
                  className="px-4 py-2 rounded-xl bg-maroon-800 hover:bg-maroon-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {aiScanning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-gold-300" />
                      <span>جارٍ فك الخط وقراءة الورقة...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-gold-300" />
                      <span>بدء استخراج الجدول 🪄</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleApplyExtractedCurriculum}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>اعتماد وتطبيق على جدول الشهر 💾</span>
                </button>
              )}
            </div>
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
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
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
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
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
                  className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
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
                    <th className="p-2.5 font-black border-l border-white/10">فقرة أولى (المادة والشاهد)</th>
                    <th className="p-2.5 font-black border-l border-white/10">المتكلم</th>
                    <th className="p-2.5 font-black border-l border-white/10">فقرة ثانية (المادة والشاهد)</th>
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
                            🌟 {f.mergedSession?.title || f.mergedSession?.subject || 'فقرة موحدة / ندوة'} 
                            {' — '}
                            <span className="text-slate-700">
                              المتكلم: {getSpeakerDisplayName(f.mergedSession)}
                            </span>
                          </td>
                        </tr>
                      );
                    }

                    const s1Desc = [f.session1?.subject, f.session1?.title].filter(Boolean).join(' - ') || '-';
                    const s2Desc = [f.session2?.subject, f.session2?.title].filter(Boolean).join(' - ') || '-';

                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-900 border-l border-slate-200 whitespace-nowrap">
                          {f.displayDate}
                        </td>
                        <td className="p-2.5 font-medium text-slate-800 border-l border-slate-200">
                          {s1Desc}
                        </td>
                        <td className="p-2.5 font-black text-maroon-900 border-l border-slate-200 whitespace-nowrap">
                          {getSpeakerDisplayName(f.session1)}
                        </td>
                        <td className="p-2.5 font-medium text-slate-800 border-l border-slate-200">
                          {s2Desc}
                        </td>
                        <td className="p-2.5 font-black text-maroon-900 whitespace-nowrap">
                          {getSpeakerDisplayName(f.session2)}
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