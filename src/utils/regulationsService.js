import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

// Standard template with 13 standard regulation evaluation items (zeroed by default)
export const STAGE_TEMPLATE_ITEMS = [
  {
    id: '1',
    name: 'الحضور والانصراف بالخدمة',
    freq: 'أسبوعي',
    formula: '0 مبكر / 0 متأخر × 47 أسبوع',
    max: 0,
    note: 'مسجل تلقائياً عبر الكاميرا/الكود',
    configType: 'attendance',
    config: { earlyPoints: 0, latePoints: 0, thresholdMins: 15, weeksCount: 47 }
  },
  {
    id: '2',
    name: 'قراءة الكتاب المقدس',
    freq: 'أسبوعي',
    formula: '0 درجات للأسبوع (حساب نسبي يومي)',
    max: 0,
    note: 'تلقائي من النوتة الروحية',
    configType: 'weekly',
    config: { weeklyPoints: 0, weeksCount: 47 }
  },
  {
    id: '3',
    name: 'القداس الإلهي',
    freq: 'أسبوعي',
    formula: '0 درجات أسبوعياً × 47 أسبوع',
    max: 0,
    note: 'تلقائي من النوتة الروحية',
    configType: 'weekly',
    config: { weeklyPoints: 0, weeksCount: 47 }
  },
  {
    id: '4',
    name: 'التناول من الأسرار المقدسة',
    freq: 'أسبوعي',
    formula: '0 درجات أسبوعياً × 47 أسبوع',
    max: 0,
    note: 'تلقائي من النوتة الروحية',
    configType: 'weekly',
    config: { weeklyPoints: 0, weeksCount: 47 }
  },
  {
    id: '5',
    name: 'الصوم والانقطاع',
    freq: 'أسبوعي',
    formula: '0 درجات أسبوعياً × 47 أسبوع',
    max: 0,
    note: 'تلقائي من النوتة الروحية',
    configType: 'weekly',
    config: { weeklyPoints: 0, weeksCount: 47 }
  },
  {
    id: '6',
    name: 'النوتة والصلوات الشخصية',
    freq: 'أسبوعي',
    formula: '0 درجات للأسبوع (صلوات وتدوين)',
    max: 0,
    note: 'تلقائي من النوتة الروحية',
    configType: 'weekly',
    config: { weeklyPoints: 0, weeksCount: 47 }
  },
  {
    id: '7',
    name: 'اجتماع المرحلة',
    freq: 'أسبوعي',
    formula: '0 درجات أسبوعياً × 47 أسبوع',
    max: 0,
    note: 'تقييم خدام المرحلة',
    configType: 'weekly',
    config: { weeklyPoints: 0, weeksCount: 47 }
  },
  {
    id: '8',
    name: 'سر الاعتراف والإرشاد',
    freq: 'دوري',
    formula: '0 درجات × 6 مرات في السنة',
    max: 0,
    note: 'تقييم أب الاعتراف والخدام',
    configType: 'multi_session',
    config: { sessionPoints: 0, targetCount: 6 }
  },
  {
    id: '9',
    name: 'الأبحاث التكليفية',
    freq: 'سنوي',
    formula: '0 درجات × بحثين',
    max: 0,
    note: 'تقييم أساتذة المواد',
    configType: 'multi_session',
    config: { sessionPoints: 0, targetCount: 2 }
  },
  {
    id: '10',
    name: 'أنشطة وكورس المطرانية',
    freq: 'سنوي',
    formula: 'يوم المطرانية 0 + كورس المطرانية 0',
    max: 0,
    note: 'اعتماد مطرانية المعادي',
    configType: 'bishopric',
    config: { dayPoints: 0, coursePoints: 0 }
  },
  {
    id: '11',
    name: 'المواد الدراسية والامتحانات',
    freq: 'سنوي',
    formula: '0 مواد دراسية × 0 درجة',
    max: 0,
    note: 'امتحانات المنصة والتحريري',
    configType: 'subjects_exam',
    config: { subjectExamPoints: 0, subjectsCount: 0 }
  },
  {
    id: '12',
    name: 'الأنشطة التطبيقية للمواد',
    freq: 'سنوي',
    formula: '0 درجات لكل مادة',
    max: 0,
    note: 'تكليفات وورش العمل',
    configType: 'subjects_activity',
    config: { subjectActivityPoints: 0, subjectsCount: 0 }
  },
  {
    id: '13',
    name: 'مشروع التخرج',
    freq: 'سنوي',
    formula: 'مشروع تخرج نهاية الدورة',
    max: 0,
    note: 'مناقشة لجنة الخدام',
    configType: 'single_value',
    config: { singlePoints: 0 }
  }
];

export const DEFAULT_STAGE_REGULATIONS = {
  first: {
    title: 'لائحة تقييم سنة أولى (إعداد خدام)',
    totalMax: 1285,
    isPublished: true,
    items: [
      {
        id: '1',
        name: 'الحضور والانصراف بالخدمة',
        freq: 'أسبوعي',
        formula: '3 مبكر (أول 15 د) / درجتان متأخر × 47 أسبوع',
        max: 141,
        note: 'مسجل تلقائياً عبر الكاميرا/الكود',
        configType: 'attendance',
        config: { earlyPoints: 3, latePoints: 2, thresholdMins: 15, weeksCount: 47 }
      },
      {
        id: '2',
        name: 'قراءة الكتاب المقدس',
        freq: 'أسبوعي',
        formula: '3 درجات للأسبوع (حساب نسبي يومي 3/7 د/يوم)',
        max: 141,
        note: 'تلقائي من النوتة الروحية',
        configType: 'weekly',
        config: { weeklyPoints: 3, weeksCount: 47 }
      },
      {
        id: '3',
        name: 'القداس الإلهي',
        freq: 'أسبوعي',
        formula: 'درجتان أسبوعياً × 47 أسبوع',
        max: 94,
        note: 'تلقائي من النوتة الروحية',
        configType: 'weekly',
        config: { weeklyPoints: 2, weeksCount: 47 }
      },
      {
        id: '4',
        name: 'التناول من الأسرار المقدسة',
        freq: 'أسبوعي',
        formula: 'درجتان أسبوعياً × 47 أسبوع',
        max: 94,
        note: 'تلقائي من النوتة الروحية',
        configType: 'weekly',
        config: { weeklyPoints: 2, weeksCount: 47 }
      },
      {
        id: '5',
        name: 'الصوم والانقطاع',
        freq: 'أسبوعي',
        formula: 'درجتان أسبوعياً × 47 أسبوع',
        max: 94,
        note: 'تلقائي من النوتة الروحية',
        configType: 'weekly',
        config: { weeklyPoints: 2, weeksCount: 47 }
      },
      {
        id: '6',
        name: 'النوتة والصلوات الشخصية',
        freq: 'أسبوعي',
        formula: 'درجتان للأسبوع (50% تدوين + 50% صلوات أجبية)',
        max: 94,
        note: 'تلقائي من النوتة الروحية',
        configType: 'weekly',
        config: { weeklyPoints: 2, weeksCount: 47 }
      },
      {
        id: '7',
        name: 'اجتماع المرحلة',
        freq: 'أسبوعي',
        formula: 'درجة أسبوعياً × 47 أسبوع',
        max: 47,
        note: 'تقييم خدام المرحلة',
        configType: 'weekly',
        config: { weeklyPoints: 1, weeksCount: 47 }
      },
      {
        id: '8',
        name: 'سر الاعتراف والإرشاد',
        freq: 'دوري',
        formula: '15 درجة × 6 مرات في السنة',
        max: 90,
        note: 'تقييم أب الاعتراف والخدام',
        configType: 'multi_session',
        config: { sessionPoints: 15, targetCount: 6 }
      },
      {
        id: '9',
        name: 'الأبحاث التكليفية',
        freq: 'سنوي',
        formula: '40 درجة × بحثين',
        max: 80,
        note: 'تقييم أساتذة المواد',
        configType: 'multi_session',
        config: { sessionPoints: 40, targetCount: 2 }
      },
      {
        id: '10',
        name: 'أنشطة وكورس المطرانية',
        freq: 'سنوي',
        formula: 'يوم المطرانية 30 + كورس المطرانية 80',
        max: 110,
        note: 'اعتماد مطرانية المعادي',
        configType: 'bishopric',
        config: { dayPoints: 30, coursePoints: 80 }
      },
      {
        id: '11',
        name: 'المواد الدراسية والامتحانات',
        freq: 'سنوي',
        formula: '6 مواد دراسية × 40 درجة',
        max: 240,
        note: 'امتحانات المنصة والتحريري',
        configType: 'subjects_exam',
        config: { subjectExamPoints: 40, subjectsCount: 6 }
      },
      {
        id: '12',
        name: 'الأنشطة التطبيقية للمواد',
        freq: 'سنوي',
        formula: '10 درجات لكل مادة × 6 مواد',
        max: 60,
        note: 'تكليفات وورش العمل',
        configType: 'subjects_activity',
        config: { subjectActivityPoints: 10, subjectsCount: 6 }
      },
      {
        id: '13',
        name: 'مشروع التخرج',
        freq: 'سنوي',
        formula: 'غير مطلوب لسنة أولى (مخصص لسنة ثانية فقط)',
        max: 0,
        note: 'سنة ثانية فقط',
        configType: 'single_value',
        config: { singlePoints: 0 }
      }
    ]
  },
  second: {
    title: 'لائحة تقييم سنة ثانية (إعداد خدام)',
    totalMax: 1485,
    isPublished: true,
    items: [
      {
        id: '1',
        name: 'الحضور والانصراف بالخدمة',
        freq: 'أسبوعي',
        formula: '3 مبكر (أول 15 د) / درجتان متأخر × 47 أسبوع',
        max: 141,
        note: 'مسجل تلقائياً عبر الكاميرا/الكود',
        configType: 'attendance',
        config: { earlyPoints: 3, latePoints: 2, thresholdMins: 15, weeksCount: 47 }
      },
      {
        id: '2',
        name: 'قراءة الكتاب المقدس',
        freq: 'أسبوعي',
        formula: '3 درجات للأسبوع (حساب نسبي يومي 3/7 د/يوم)',
        max: 141,
        note: 'تلقائي من النوتة الروحية',
        configType: 'weekly',
        config: { weeklyPoints: 3, weeksCount: 47 }
      },
      {
        id: '3',
        name: 'القداس الإلهي',
        freq: 'أسبوعي',
        formula: 'درجتان أسبوعياً × 47 أسبوع',
        max: 94,
        note: 'تلقائي من النوتة الروحية',
        configType: 'weekly',
        config: { weeklyPoints: 2, weeksCount: 47 }
      },
      {
        id: '4',
        name: 'التناول من الأسرار المقدسة',
        freq: 'أسبوعي',
        formula: 'درجتان أسبوعياً × 47 أسبوع',
        max: 94,
        note: 'تلقائي من النوتة الروحية',
        configType: 'weekly',
        config: { weeklyPoints: 2, weeksCount: 47 }
      },
      {
        id: '5',
        name: 'الصوم والانقطاع',
        freq: 'أسبوعي',
        formula: 'درجتان أسبوعياً × 47 أسبوع',
        max: 94,
        note: 'تلقائي من النوتة الروحية',
        configType: 'weekly',
        config: { weeklyPoints: 2, weeksCount: 47 }
      },
      {
        id: '6',
        name: 'النوتة والصلوات الشخصية',
        freq: 'أسبوعي',
        formula: 'درجتان للأسبوع (50% تدوين + 50% صلوات أجبية)',
        max: 94,
        note: 'تلقائي من النوتة الروحية',
        configType: 'weekly',
        config: { weeklyPoints: 2, weeksCount: 47 }
      },
      {
        id: '7',
        name: 'اجتماع المرحلة',
        freq: 'أسبوعي',
        formula: 'درجة أسبوعياً × 47 أسبوع',
        max: 47,
        note: 'تقييم خدام المرحلة',
        configType: 'weekly',
        config: { weeklyPoints: 1, weeksCount: 47 }
      },
      {
        id: '8',
        name: 'سر الاعتراف والإرشاد',
        freq: 'دوري',
        formula: '15 درجة × 6 مرات في السنة',
        max: 90,
        note: 'تقييم أب الاعتراف والخدام',
        configType: 'multi_session',
        config: { sessionPoints: 15, targetCount: 6 }
      },
      {
        id: '9',
        name: 'الأبحاث التكليفية',
        freq: 'سنوي',
        formula: '40 درجة × بحثين',
        max: 80,
        note: 'تقييم أساتذة المواد',
        configType: 'multi_session',
        config: { sessionPoints: 40, targetCount: 2 }
      },
      {
        id: '10',
        name: 'أنشطة وكورس المطرانية',
        freq: 'سنوي',
        formula: 'يوم المطرانية 30 + كورس المطرانية 80',
        max: 110,
        note: 'اعتماد مطرانية المعادي',
        configType: 'bishopric',
        config: { dayPoints: 30, coursePoints: 80 }
      },
      {
        id: '11',
        name: 'المواد الدراسية والامتحانات',
        freq: 'سنوي',
        formula: '9 مواد دراسية × 40 درجة',
        max: 360,
        note: 'امتحانات المنصة والتحريري',
        configType: 'subjects_exam',
        config: { subjectExamPoints: 40, subjectsCount: 9 }
      },
      {
        id: '12',
        name: 'الأنشطة التطبيقية للمواد',
        freq: 'سنوي',
        formula: '10 درجات لكل مادة × 9 مواد',
        max: 90,
        note: 'تكليفات وورش العمل',
        configType: 'subjects_activity',
        config: { subjectActivityPoints: 10, subjectsCount: 9 }
      },
      {
        id: '13',
        name: 'مشروع التخرج',
        freq: 'سنوي',
        formula: 'مشروع تخرج شامل بنهاية الدورة',
        max: 50,
        note: 'مناقشة لجنة الخدام',
        configType: 'single_value',
        config: { singlePoints: 50 }
      }
    ]
  },
  third: {
    title: 'لائحة تقييم سنة ثالثة',
    totalMax: 0,
    isPublished: false,
    items: JSON.parse(JSON.stringify(STAGE_TEMPLATE_ITEMS)),
    emptyMessage: 'لائحة سنة ثالثة قيد الإعداد والاعتماد من قِبل إدارة الخدمة ⏳'
  },
  elisha: {
    title: 'لائحة تقييم فصل أليشع (تمهيدي إعداد خدام)',
    totalMax: 0,
    isPublished: false,
    items: JSON.parse(JSON.stringify(STAGE_TEMPLATE_ITEMS)),
    emptyMessage: 'لائحة فصل أليشع قيد الإعداد والاعتماد من قِبل إدارة الخدمة ⏳'
  }
};

/**
 * Fetch stage regulations from Firestore with fallback to defaults
 */
export async function fetchStageRegulations() {
  try {
    const snap = await getDoc(doc(db, 'service_settings', 'stage_regulations'));
    if (snap.exists()) {
      const data = snap.data();
      return {
        first: data.first || DEFAULT_STAGE_REGULATIONS.first,
        second: data.second || DEFAULT_STAGE_REGULATIONS.second,
        third: data.third || DEFAULT_STAGE_REGULATIONS.third,
        elisha: data.elisha || DEFAULT_STAGE_REGULATIONS.elisha
      };
    }
  } catch (err) {
    console.warn('Could not fetch stage regulations from Firestore, using default:', err);
  }
  return DEFAULT_STAGE_REGULATIONS;
}

/**
 * Recalculate formula text and max score for a regulation item when its configuration changes
 */
export function recalculateItemProperties(item) {
  const cfg = item.config || {};
  let formula = item.formula;
  let max = Number(item.max) || 0;

  switch (item.configType) {
    case 'attendance': {
      const early = Number(cfg.earlyPoints) || 3;
      const late = Number(cfg.latePoints) || 2;
      const thresh = Number(cfg.thresholdMins) || 15;
      const weeks = Number(cfg.weeksCount) || 47;
      formula = `${early} مبكر (أول ${thresh} د) / ${late} متأخر × ${weeks} أسبوع`;
      max = early * weeks;
      break;
    }
    case 'weekly': {
      const pts = Number(cfg.weeklyPoints) || 2;
      const weeks = Number(cfg.weeksCount) || 47;
      formula = `${pts} درجات أسبوعياً × ${weeks} أسبوع`;
      max = pts * weeks;
      break;
    }
    case 'multi_session': {
      const sessionPts = Number(cfg.sessionPoints) || 15;
      const count = Number(cfg.targetCount) || 6;
      formula = `${sessionPts} درجة × ${count} مرات في السنة`;
      max = sessionPts * count;
      break;
    }
    case 'bishopric': {
      const dayPts = Number(cfg.dayPoints) || 30;
      const coursePts = Number(cfg.coursePoints) || 80;
      formula = `يوم المطرانية ${dayPts} + كورس المطرانية ${coursePts}`;
      max = dayPts + coursePts;
      break;
    }
    case 'subjects_exam': {
      const examPts = Number(cfg.subjectExamPoints) || 40;
      const subsCount = Number(cfg.subjectsCount) || 6;
      formula = `${subsCount} مواد دراسية × ${examPts} درجة`;
      max = examPts * subsCount;
      break;
    }
    case 'subjects_activity': {
      const actPts = Number(cfg.subjectActivityPoints) || 10;
      const subsCount = Number(cfg.subjectsCount) || 6;
      formula = `${actPts} درجات لكل مادة × ${subsCount} مواد`;
      max = actPts * subsCount;
      break;
    }
    case 'single_value': {
      const pts = Number(cfg.singlePoints) || 0;
      max = pts;
      break;
    }
    default:
      break;
  }

  return {
    ...item,
    formula,
    max
  };
}

/**
 * Dynamically calculate Attendance Points based on Stage Regulations config
 * @param {Object} options
 * @param {Object} options.stageRegulations - full regulations map or null
 * @param {string} options.grade - 'first', 'second', 'third', 'elisha'
 * @param {string} options.serviceStartTime - e.g. '10:30'
 * @param {Date} [options.currentTime] - Date object
 * @returns {{ points: number, punctualityStatus: string, isEarly: boolean }}
 */
export function calculateAttendancePoints({
  stageRegulations = null,
  grade = 'first',
  serviceStartTime = '10:30',
  currentTime = new Date()
}) {
  const stage = stageRegulations?.[grade] || stageRegulations?.first || DEFAULT_STAGE_REGULATIONS[grade] || DEFAULT_STAGE_REGULATIONS.first;
  const attendItem = stage?.items?.find(it => it.id === '1');
  const cfg = attendItem?.config || { earlyPoints: 3, latePoints: 2, thresholdMins: 15 };

  const earlyPoints = Number(cfg.earlyPoints) ?? 3;
  const latePoints = Number(cfg.latePoints) ?? 2;
  const thresholdMins = Number(cfg.thresholdMins) ?? 15;

  let isEarly = true;
  try {
    const [startH, startM] = (serviceStartTime || '10:30').split(':').map(Number);
    const serviceStartTotalMins = (startH || 10) * 60 + (startM || 30);
    const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();

    if (nowMins > (serviceStartTotalMins + thresholdMins)) {
      isEarly = false;
    }
  } catch (err) {
    console.warn('Error calculating attendance time difference, defaulting to early:', err);
    isEarly = true;
  }

  const points = isEarly ? earlyPoints : latePoints;
  const punctualityStatus = isEarly
    ? `حضور مبكر في الموعد (${earlyPoints} درجات)`
    : `حضور متأخر بعد ${thresholdMins} دقيقة (${latePoints} درجات)`;

  return {
    points,
    punctualityStatus,
    isEarly,
    thresholdMins,
    earlyPoints,
    latePoints
  };
}

/**
 * Get diary item points configured in stage regulations
 */
export function getDiaryPointsConfig(stageRegulations, grade = 'first') {
  const stage = stageRegulations?.[grade] || stageRegulations?.first || DEFAULT_STAGE_REGULATIONS[grade] || DEFAULT_STAGE_REGULATIONS.first;
  const items = stage?.items || [];

  const bibleItem = items.find(it => it.id === '2');
  const communionItem = items.find(it => it.id === '4');
  const prayersItem = items.find(it => it.id === '6');
  const confessionItem = items.find(it => it.id === '8');

  return {
    bible: Number(bibleItem?.config?.weeklyPoints) || 3,
    communion: Number(communionItem?.config?.weeklyPoints) || 2,
    prayer: Math.max(1, Math.round((Number(prayersItem?.config?.weeklyPoints) || 2) / 2)),
    confession: Number(confessionItem?.config?.sessionPoints) || 15
  };
}

/**
 * Helper to compute elapsed service weeks (Fridays) between cycle start date and now,
 * excluding any declared service holidays.
 * @param {Object} options
 * @param {string} [options.startDate] - YYYY-MM-DD
 * @param {Array<{date: string, label: string}>} [options.holidays] - list of holidays / cancelled fridays
 * @param {Date} [options.referenceDate] - default now
 * @returns {{ elapsedFridays: number, fridayDates: string[] }}
 */
export function calculateElapsedServiceWeeks({
  startDate = '2026-09-01',
  holidays = [],
  referenceDate = new Date()
} = {}) {
  const start = new Date(startDate);
  const end = new Date(referenceDate);
  const holidayDateSet = new Set((holidays || []).map(h => (typeof h === 'string' ? h : h.date)));

  let elapsedFridays = 0;
  const fridayDates = [];

  const curr = new Date(start);
  while (curr <= end) {
    if (curr.getDay() === 5) {
      const dateStr = curr.toISOString().split('T')[0];
      if (!holidayDateSet.has(dateStr)) {
        elapsedFridays++;
        fridayDates.push(dateStr);
      }
    }
    curr.setDate(curr.getDate() + 1);
  }

  return {
    elapsedFridays: Math.max(1, elapsedFridays),
    fridayDates
  };
}

/**
 * Calculates a student's cumulative standing to date based on the items accrued so far.
 * @param {Object} params
 * @param {string} params.studentGrade - 'first', 'second', 'third', 'elisha'
 * @param {Object} params.stageRegulations - full map
 * @param {Array} params.attendanceRecords - student's attendance documents
 * @param {Array} params.diaryRecords - student's diary entries
 * @param {Array} params.examSubmissions - student's exam submissions
 * @param {Array} params.holidays - list of cancelled fridays
 * @param {number} [params.currentPoints] - user's total points as fallback
 * @returns {Object} { accruedMax, earnedPoints, standingPercentage, itemsBreakdown }
 */
export function calculateStudentStandingToDate({
  studentGrade = 'first',
  stageRegulations = null,
  attendanceRecords = [],
  diaryRecords = [],
  examSubmissions = [],
  holidays = [],
  currentPoints = 0
}) {
  const stage = stageRegulations?.[studentGrade] || DEFAULT_STAGE_REGULATIONS[studentGrade] || DEFAULT_STAGE_REGULATIONS.first;
  const items = stage?.items || [];

  const { elapsedFridays } = calculateElapsedServiceWeeks({ holidays });

  let accruedMax = 0;
  let earnedPoints = 0;
  const itemsBreakdown = [];

  // 1. Attendance (Item 1)
  const attendItem = items.find(i => i.id === '1');
  if (attendItem && (attendItem.max || 0) > 0) {
    const earlyPts = Number(attendItem.config?.earlyPoints) || 3;
    const itemAccruedMax = elapsedFridays * earlyPts;
    
    let itemEarned = 0;
    (attendanceRecords || []).forEach(rec => {
      if (rec.status === 'حاضر') {
        itemEarned += (rec.pointsAwarded !== undefined ? Number(rec.pointsAwarded) : earlyPts);
      }
    });

    accruedMax += itemAccruedMax;
    earnedPoints += itemEarned;
    itemsBreakdown.push({
      id: '1',
      name: attendItem.name,
      earned: itemEarned,
      accruedMax: itemAccruedMax,
      totalAnnualMax: attendItem.max,
      pct: itemAccruedMax > 0 ? Math.min(100, Math.round((itemEarned / itemAccruedMax) * 100)) : 100
    });
  }

  // 2. Spiritual Diary Items
  const diaryItemsCfg = [
    { id: '2', key: 'bible', name: 'قراءة الكتاب المقدس', weeklyDefault: 3 },
    { id: '4', key: 'communion', name: 'سر التناول المقدس', weeklyDefault: 2 },
    { id: '6', key: 'prayer', name: 'صلوات الأجبية', weeklyDefault: 2 },
  ];

  diaryItemsCfg.forEach(dCfg => {
    const it = items.find(i => i.id === dCfg.id);
    if (it && (it.max || 0) > 0) {
      const weeklyPts = Number(it.config?.weeklyPoints) || dCfg.weeklyDefault;
      const itemAccruedMax = elapsedFridays * weeklyPts;

      let completedCount = 0;
      (diaryRecords || []).forEach(entry => {
        if (entry[dCfg.key]) completedCount++;
      });
      const itemEarned = Math.round((completedCount / (elapsedFridays * (dCfg.key === 'bible' ? 7 : 1))) * itemAccruedMax);

      accruedMax += itemAccruedMax;
      earnedPoints += itemEarned;
      itemsBreakdown.push({
        id: dCfg.id,
        name: it.name,
        earned: itemEarned,
        accruedMax: itemAccruedMax,
        totalAnnualMax: it.max,
        pct: itemAccruedMax > 0 ? Math.min(100, Math.round((itemEarned / itemAccruedMax) * 100)) : 100
      });
    }
  });

  // 3. Exams (Item 11)
  const examsItem = items.find(i => i.id === '11');
  if (examsItem && (examsItem.max || 0) > 0) {
    let examsAccruedMax = 0;
    let examsEarned = 0;

    (examSubmissions || []).forEach(sub => {
      const maxSc = Number(sub.totalScore) || Number(examsItem.config?.subjectExamPoints) || 30;
      const sc = Number(sub.score ?? sub.autoScore) || 0;
      examsAccruedMax += maxSc;
      examsEarned += sc;
    });

    if (examsAccruedMax > 0) {
      accruedMax += examsAccruedMax;
      earnedPoints += examsEarned;
      itemsBreakdown.push({
        id: '11',
        name: examsItem.name,
        earned: examsEarned,
        accruedMax: examsAccruedMax,
        totalAnnualMax: examsItem.max,
        pct: Math.min(100, Math.round((examsEarned / examsAccruedMax) * 100))
      });
    }
  }

  // Safety fallback
  if (accruedMax === 0) {
    accruedMax = Math.max(1, currentPoints || 10);
    earnedPoints = currentPoints || 0;
  }

  const standingPercentage = Math.min(100, Math.max(0, Math.round((earnedPoints / accruedMax) * 100)));

  return {
    accruedMax,
    earnedPoints,
    standingPercentage,
    elapsedFridays,
    itemsBreakdown
  };
}


