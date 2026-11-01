import { db } from '../firebase';
import { collection, doc, addDoc, setDoc, serverTimestamp, increment } from 'firebase/firestore';

// الذاكرة المؤقتة لمنع أي تكرار متزامن في نفس اللحظة
const _recordingLocks = {};

/**
 * التعرف الذكي على نوع جهاز المستخدم ونظام التشغيل
 */
export function detectDevice() {
  if (typeof navigator === 'undefined') return 'كمبيوتر (ويندوز) 💻';
  const ua = navigator.userAgent || '';
  if (/iphone/i.test(ua)) return 'هاتف آيفون 🍏';
  if (/ipad/i.test(ua)) return 'جهاز لوحي (آيباد) 🍏';
  if (/android/i.test(ua)) {
    if (/tablet/i.test(ua)) return 'جهاز لوحي (أندرويد) 📱';
    return 'هاتف أندرويد 📱';
  }
  if (/mobile/i.test(ua)) return 'هاتف ذكي 📱';
  if (/macintosh|mac os x/i.test(ua)) return 'كمبيوتر (ماك) 💻';
  if (/windows/i.test(ua)) return 'كمبيوتر (ويندوز) 💻';
  return 'كمبيوتر 💻';
}

/**
 * تنسيق التوقيت والتاريخ بالأرقام الإنجليزية الصريحة
 * DD/MM/YYYY - hh:mm AM/PM
 */
export function formatLogTimestamp(log) {
  if (!log) return '';
  let dateObj = null;
  if (log.timestamp && typeof log.timestamp.toDate === 'function') {
    dateObj = log.timestamp.toDate();
  } else if (log.timestamp && log.timestamp.seconds) {
    dateObj = new Date(log.timestamp.seconds * 1000);
  } else if (log.timestamp) {
    dateObj = new Date(log.timestamp);
  }

  if (dateObj && !isNaN(dateObj.getTime())) {
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    let hours = dateObj.getHours();
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = String(hours).padStart(2, '0');
    return `${day}/${month}/${year} - ${hoursStr}:${minutes} ${ampm}`;
  }

  if (log.dateStr && log.timeStr) {
    return `${log.dateStr} - ${log.timeStr}`;
  }
  return log.timeStr || log.dateStr || '—';
}

/**
 * تسجيل جلسة دخول جديدة في سجل النشاط وتحديث بطاقة المستخدم
 * تتضمن مهلة 30 دقيقة لمنع تكرار التسجيل عند تحديث الصفحة
 */
export async function recordUserSession(currentUser, customAction = 'session_open') {
  if (!currentUser || !currentUser.id || !db) return;

  const userId = currentUser.id;
  try {
    // 1. قفل متزامن لمنع أي تكرار نداء في نفس اللحظة
    if (_recordingLocks[userId]) return;
    _recordingLocks[userId] = true;

    // 2. فحص مهلة الجلسة (30 دقيقة)
    const sessionKey = `last_session_record_${userId}`;
    let lastRecorded = 0;
    try {
      lastRecorded = parseInt(localStorage.getItem(sessionKey) || '0', 10);
    } catch (eStorage) {}

    const now = Date.now();
    const sessionCooldown = 30 * 60 * 1000; // 30 دقيقة
    if (customAction === 'session_open' && now - lastRecorded < sessionCooldown) {
      _recordingLocks[userId] = false;
      return;
    }

    // حفظ التوقيت لحجز الجلسة
    try {
      localStorage.setItem(sessionKey, String(now));
    } catch (eSet) {}

    const deviceName = detectDevice();

    const nowDate = new Date();
    const day = String(nowDate.getDate()).padStart(2, '0');
    const month = String(nowDate.getMonth() + 1).padStart(2, '0');
    const year = nowDate.getFullYear();
    let hours = nowDate.getHours();
    const minutes = String(nowDate.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = String(hours).padStart(2, '0');

    // 3. كتابة وثيقة في سجل الدخول والنشاط
    await addDoc(collection(db, 'login_logs'), {
      userId: userId,
      userName: currentUser.fullName || 'مستخدم',
      phone: currentUser.phone || '',
      role: currentUser.role || 'student',
      grade: currentUser.grade || null,
      servantScope: currentUser.servantScope || null,
      device: deviceName,
      action: customAction,
      timestamp: serverTimestamp(),
      timeStr: `${hoursStr}:${minutes} ${ampm}`,
      dateStr: `${day}/${month}/${year}`
    });

    // 4. تحديث وثيقة المستخدم برفع عداد الزيارات وتسجيل آخر ظهور
    await setDoc(doc(db, 'users', userId), {
      lastLoginAt: serverTimestamp(),
      lastActiveAt: serverTimestamp(),
      lastDevice: deviceName,
      loginCount: increment(1)
    }, { merge: true });

  } catch (err) {
    console.warn('Activity tracking notice:', err);
  } finally {
    _recordingLocks[userId] = false;
  }
}

/**
 * إرسال نبض خفيف لتسجيل التواجد الحي للمستخدم الحالي
 */
export async function sendPresenceHeartbeat(currentUser) {
  if (!currentUser || !currentUser.id || !db) return;
  const userId = currentUser.id;

  try {
    const key = `last_presence_beat_${userId}`;
    let lastBeat = 0;
    try {
      lastBeat = parseInt(sessionStorage.getItem(key) || '0', 10);
    } catch (eStorage) {}

    const now = Date.now();
    const minIntervalMs = 120 * 1000; // دقيقتان كحد أدنى لمنع كثرة الطلبات
    if (lastBeat > 0 && (now - lastBeat < minIntervalMs)) {
      return;
    }

    try {
      sessionStorage.setItem(key, String(now));
    } catch (eSet) {}

    await setDoc(doc(db, 'users', userId), {
      lastActiveAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    // تجاهل هادئ لأخطاء الشبكة أثناء النبض الدوري
  }
}

/**
 * حساب نص التواجد اللحظي والوقت النسبي بدقة وأناقة
 */
export function getRelativeActivityInfo(user) {
  if (!user) return { isOnline: false, text: 'لم يسجل دخول بعد' };

  let activeDate = null;
  if (user.lastActiveAt && typeof user.lastActiveAt.toDate === 'function') {
    activeDate = user.lastActiveAt.toDate();
  } else if (user.lastLoginAt && typeof user.lastLoginAt.toDate === 'function') {
    activeDate = user.lastLoginAt.toDate();
  } else if (user.lastActiveAt) {
    activeDate = new Date(user.lastActiveAt);
  } else if (user.lastLoginAt) {
    activeDate = new Date(user.lastLoginAt);
  }

  if (!activeDate || isNaN(activeDate.getTime())) {
    return { isOnline: false, text: 'لم يسجل دخول بعد' };
  }

  const diffMs = Date.now() - activeDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 5) {
    return { isOnline: true, text: 'متواجد الآن 🟢' };
  }
  if (diffMins < 60) {
    return { isOnline: false, text: `منذ ${diffMins} دقيقة` };
  }
  if (diffHours < 24) {
    return { isOnline: false, text: `منذ ${diffHours} ساعة` };
  }
  if (diffDays === 1) {
    return { isOnline: false, text: 'أمس' };
  }
  if (diffDays < 7) {
    return { isOnline: false, text: `منذ ${diffDays} أيام` };
  }
  return { isOnline: false, text: `منذ ${diffDays} يوم` };
}
