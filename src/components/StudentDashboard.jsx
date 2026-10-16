import React, { useState, useEffect } from 'react';
import { 
  Award, QrCode, Sun, BookOpen, FileText, CheckSquare, Bell, Check, Menu, X, LogOut, Home, Trash2 
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, doc, getDoc, onSnapshot, serverTimestamp, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import StudentHomeOverview from './student/StudentHomeOverview';
import StudentAttendance from './student/StudentAttendance';
import StudentSpiritualDiary from './student/StudentSpiritualDiary';
import StudentCurriculum from './student/StudentCurriculum';
import StudentExams from './student/StudentExams';
import StudentTasks from './student/StudentTasks';
import StageRegulationsModal from './common/StageRegulationsModal';
import UserProfileModal from './common/UserProfileModal';
import AppSupportToolsDrawerSection from './common/AppSupportToolsDrawerSection';
import { calculateAttendancePoints, DEFAULT_STAGE_REGULATIONS, getDiaryPointsConfig } from '../utils/regulationsService';

export default function StudentDashboard({ user, onLogout, onUpdateUser, externalMenuTrigger }) {
  // Tabs: 'home', 'attendance', 'spiritual_diary', 'curriculum', 'exams', 'tasks', 'announcements'
  const [activeTab, setActiveTab] = useState('home');
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);

  // Sync external menu trigger from top header
  useEffect(() => {
    if (externalMenuTrigger && externalMenuTrigger > 0) {
      setIsNavDrawerOpen(true);
    }
  }, [externalMenuTrigger]);

  const [showRegulationsModal, setShowRegulationsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [previewPhotoModal, setPreviewPhotoModal] = useState(null);
  const [isWithinTime, setIsWithinTime] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [bypassTime, setBypassTime] = useState(false);
  const [servantOpenedAccess, setServantOpenedAccess] = useState(null);
  const [serviceStartTime, setServiceStartTime] = useState('10:30');
  const [stageRegulations, setStageRegulations] = useState(DEFAULT_STAGE_REGULATIONS);

  // Curriculum Firestore Live State
  const [subjectsData, setSubjectsData] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [activePreviewPdf, setActivePreviewPdf] = useState(null);
  const [activePreviewVideo, setActivePreviewVideo] = useState(null);
  const [activeCycle, setActiveCycle] = useState('cycle_1');

  // Sync active academic cycle setting
  useEffect(() => {
    const unsubCycle = onSnapshot(doc(db, 'service_settings', 'academic_cycle'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().activeCycle) {
        setActiveCycle(docSnap.data().activeCycle);
      }
    });
    return () => unsubCycle();
  }, []);

  // Sync real-time curriculum for current student grade or active academic cycle (Excluding servants' private curriculum)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'service_curriculum'), (snapshot) => {
      const studentGrade = user.grade || 'first';
      const list = [];
      snapshot.forEach(docSnap => {
        const data = { id: docSnap.id, ...docSnap.data() };
        if (data.targetAudience === 'servants') return;

        // Elisha students get elisha curriculum
        if (studentGrade === 'elisha') {
          if (data.grade === 'elisha') list.push(data);
        } else {
          // First and second year prep students get the active academic cycle curriculum
          const isTargetMatch = 
            data.grade === activeCycle || 
            (activeCycle === 'cycle_1' && data.grade === 'first') ||
            (activeCycle === 'cycle_2' && data.grade === 'second');
          if (isTargetMatch) {
            list.push(data);
          }
        }
      });
      setSubjectsData(list);

      if (selectedSubject) {
        const updated = list.find(s => s.id === selectedSubject.id);
        if (updated) setSelectedSubject(updated);
      }
    }, (err) => {
      console.error('Error fetching student curriculum:', err);
    });

    return () => unsub();
  }, [user.grade, selectedSubject?.id, activeCycle]);

  // Dynamic Numeric PIN & QR Code Attendance State
  const [inputPinCode, setInputPinCode] = useState('');
  const [activeServerPin, setActiveServerPin] = useState('');
  const [activeServerCode, setActiveServerCode] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState('');

  // Attendance & Points State
  const [points, setPoints] = useState(user?.points || 0);
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [offlineSyncMessage, setOfflineSyncMessage] = useState('');

  // Offline / Online Connection Event Listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setOfflineSyncMessage('تمت استعادة الاتصال بالإنترنت! جاري مزامنة بيانات الحضور تلقائياً... 📡✓');
      // Sync any pending localStorage attendance
      try {
        const pendingQueue = JSON.parse(localStorage.getItem('offline_attendance_queue') || '[]');
        if (pendingQueue.length > 0) {
          pendingQueue.forEach(async (item) => {
            await addDoc(collection(db, 'attendance'), item);
            const userRef = doc(db, 'users', item.userId);
            await updateDoc(userRef, { points: (user.points || 0) + (item.pointsAwarded || 10) });
          });
          localStorage.removeItem('offline_attendance_queue');
          setOfflineSyncMessage('تمت مزامنة حضورك ورفع النقاط بنجاح عبر الإنترنت! 🎉');
          setTimeout(() => setOfflineSyncMessage(''), 5000);
        } else {
          setTimeout(() => setOfflineSyncMessage(''), 4000);
        }
      } catch (err) {
        console.error('Offline queue sync error:', err);
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      setOfflineSyncMessage('');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  // Spiritual Diary State (Today & Yesterday allowed + History Analytics + Grace Period)
  const [diarySettings, setDiarySettings] = useState({
    serviceStartDate: '2026-10-02',
    gracePeriodDeadline: '2026-10-23T23:59:59'
  });

  // Sync spiritual diary settings from Firestore if customized by servants
  useEffect(() => {
    const unsubDiarySettings = onSnapshot(doc(db, 'service_settings', 'spiritual_diary'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDiarySettings(prev => ({
          serviceStartDate: data.serviceStartDate || prev.serviceStartDate,
          gracePeriodDeadline: data.gracePeriodDeadline || prev.gracePeriodDeadline
        }));
      }
    }, (err) => console.log('Spiritual diary settings sync notice:', err));
    return () => unsubDiarySettings();
  }, []);

  const SERVICE_START_DATE = diarySettings.serviceStartDate;
  const GRACE_PERIOD_DEADLINE = diarySettings.gracePeriodDeadline;
  const isGracePeriodActive = new Date() <= new Date(GRACE_PERIOD_DEADLINE);

  const todayDateStr = new Date().toISOString().split('T')[0];
  const yesterdayDateStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const currentMonthStr = todayDateStr.substring(0, 7);
  const [selectedDiaryDate, setSelectedDiaryDate] = useState(todayDateStr);
  const [studentDiarySubTab, setStudentDiarySubTab] = useState('entry'); // 'entry' | 'history'
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState(currentMonthStr);
  const [diaryRecords, setDiaryRecords] = useState({
    [todayDateStr]: { baker: false, ghoroub: false, nowm: false, bible: false, communion: false, confession: false },
    [yesterdayDateStr]: { baker: false, ghoroub: false, nowm: false, bible: false, communion: false, confession: false }
  });

  // Calculate available entry dates: during grace period, allow all dates back to SERVICE_START_DATE; afterwards strictly today & yesterday
  const availableEntryDates = (() => {
    const dates = [];
    const minDateStr = isGracePeriodActive ? SERVICE_START_DATE : yesterdayDateStr;
    const cur = new Date(todayDateStr);
    const min = new Date(minDateStr);
    while (cur >= min) {
      dates.push(cur.toISOString().split('T')[0]);
      cur.setDate(cur.getDate() - 1);
    }
    return dates;
  })();

  const isEditableDate = (
    selectedDiaryDate === todayDateStr ||
    selectedDiaryDate === yesterdayDateStr ||
    (isGracePeriodActive && selectedDiaryDate >= SERVICE_START_DATE && selectedDiaryDate <= todayDateStr)
  );

  // Sync student's personal spiritual diary from Firestore
  useEffect(() => {
    if (!user?.id) return;
    const q = query(collection(db, 'spiritual_diaries'), where('userId', '==', user.id));
    const unsub = onSnapshot(q, (snapshot) => {
      const records = {};
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.date) {
          records[data.date] = data;
        }
      });
      setDiaryRecords(prev => ({ ...prev, ...records }));
    }, (err) => console.error('Error fetching student spiritual diary:', err));

    return () => unsub();
  }, [user?.id]);

  const getRefTypeMeta = (type) => {
    switch (type) {
      case 'pdf':
        return { label: 'ملف PDF', icon: FileText, color: 'text-red-700 bg-red-50 border-red-200' };
      case 'doc':
        return { label: 'مستند Word', icon: FileText, color: 'text-blue-700 bg-blue-50 border-blue-200' };
      case 'excel':
        return { label: 'شيت Excel', icon: FileSpreadsheet, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
      case 'ppt':
        return { label: 'عرض PowerPoint', icon: FileText, color: 'text-amber-700 bg-amber-50 border-amber-200' };
      case 'image':
        return { label: 'صورة', icon: ImageIcon, color: 'text-cyan-700 bg-cyan-50 border-cyan-200' };
      case 'audio':
        return { label: 'تسجيل صوتي', icon: Music, color: 'text-purple-700 bg-purple-50 border-purple-200' };
      case 'video':
        return { label: 'فيديو يوتيوب', icon: Video, color: 'text-red-700 bg-red-50 border-red-200' };
      default:
        return { label: 'ملف مرفق', icon: File, color: 'text-slate-700 bg-slate-100 border-slate-300' };
    }
  };

  // Exams State (Populated exclusively from Firestore service_exams)
  const [availableExams, setAvailableExams] = useState([]);
  const [completedExams, setCompletedExams] = useState({});
  const [activeExam, setActiveExam] = useState(null);
  const [examAnswers, setExamAnswers] = useState({});
  const [examResult, setExamResult] = useState(null);

  // Tasks State (Only real servant-assigned tasks/competitions appear)
  const [tasks, setTasks] = useState([]);

  // Announcements / Notifications State (Real-time from Firestore notifications)
  const [announcements, setAnnouncements] = useState([]);

  // Sync attendance records & points from Firestore
  useEffect(() => {
    if (!user?.id) return;

    // Sync Points
    const unsubUser = onSnapshot(doc(db, 'users', user.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (typeof data.points === 'number') {
          setPoints(data.points);
        }
      }
    });

    // Sync Attendance history
    const qAttend = query(collection(db, 'attendance'), where('userId', '==', user.id));
    const unsubAttend = onSnapshot(qAttend, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setAttendanceRecords(list);
    }, (err) => console.log('Attendance listen err:', err));

    // Sync Exams for student grade (Active only + supports 'all' grades & cycle fallbacks)
    const qEx = collection(db, 'service_exams');
    const unsubEx = onSnapshot(qEx, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const studentGrade = user.grade || 'first';
      const relevantExams = list.filter(ex => {
        if (ex.status !== 'active') return false;
        if (!ex.grade || ex.grade === 'all' || ex.grade === 'all_grades') return true;
        // Common Hall / Cycle 1 / First Stage (Servants Prep year 1 + year 2 shared classroom)
        if (ex.grade === 'common_hall' || ex.grade === 'cycle_1' || ex.grade === 'first' || ex.grade === 'first_stage') {
          return studentGrade !== 'elisha';
        }
        if (ex.grade === 'first_only') return studentGrade === 'first';
        if (ex.grade === 'second_only') return studentGrade === 'second';
        if (ex.grade === 'elisha') return studentGrade === 'elisha';
        if (ex.grade === studentGrade) return true;
        return false;
      });
      // Sort newest first
      relevantExams.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setAvailableExams(relevantExams);
    }, (err) => console.log('Student exams fetch info:', err));

    // Sync Student's Completed Exams / Submissions
    const qSubmissions = query(collection(db, 'exam_submissions'), where('userId', '==', user.id));
    const unsubSubmissions = onSnapshot(qSubmissions, (snap) => {
      const map = {};
      snap.forEach(d => {
        const data = d.data();
        if (data.examId) {
          map[data.examId] = { id: d.id, ...data };
        }
      });
      setCompletedExams(map);
    }, (err) => console.log('Submissions fetch info:', err));

    // Sync Announcements & Notifications for student
    const notifTargets = ['ALL', user.id];
    if (user.grade) {
      notifTargets.push(user.grade);
      if (user.grade === 'first' || user.grade === 'second') {
        notifTargets.push('common_hall');
        notifTargets.push('cycle_1');
      }
    }
    const qNotif = query(
      collection(db, 'notifications'), 
      where('targetUserId', 'in', notifTargets)
    );
    const unsubNotif = onSnapshot(qNotif, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setAnnouncements(list);
    }, (err) => console.log('Student notif fetch info:', err));

    return () => {
      unsubUser();
      unsubAttend();
      unsubEx();
      unsubSubmissions();
      unsubNotif();
    };
  }, [user?.id, user?.grade]);

  // Check 10:30 AM to 02:00 PM OR remote permission opened by servant
  useEffect(() => {
    const checkTimeWindow = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const totalMinutes = hours * 60 + minutes;

      const inWindow = totalMinutes >= 630 && totalMinutes <= 840;
      setIsWithinTime(inWindow);
      setCurrentTimeStr(now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
    };

    checkTimeWindow();
    const interval = setInterval(checkTimeWindow, 30000);

    // Listen to Remote Access Settings in Firestore (للجميع أو لهذا المخدوم)
    const unsubAll = onSnapshot(doc(db, 'service_settings', 'attendance_window'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.activePin) {
          setActiveServerPin(data.activePin.toString());
        }
        if (data.activeCode) {
          setActiveServerCode(data.activeCode);
        }
        if (data.serviceStartTime) {
          setServiceStartTime(data.serviceStartTime);
        }
        if (data.isOpenForAll && new Date(data.validUntil) > new Date()) {
          setBypassTime(true);
          setServantOpenedAccess({ openedBy: data.openedBy, type: 'all' });
        }
      }
    });

    // Listen to Stage Regulations in real-time
    const unsubRegs = onSnapshot(doc(db, 'service_settings', 'stage_regulations'), (docSnap) => {
      if (docSnap.exists()) {
        setStageRegulations(docSnap.data());
      }
    });

    const unsubSpecific = onSnapshot(doc(db, 'remote_access', user.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.activePin) {
          setActiveServerPin(data.activePin.toString());
        }
        if (data.isOpen && new Date(data.validUntil) > new Date()) {
          setBypassTime(true);
          setServantOpenedAccess({ openedBy: data.openedBy, type: 'specific' });
        }
      }
    });

    return () => {
      clearInterval(interval);
      unsubAll();
      unsubRegs();
      unsubSpecific();
    };
  }, [user.id]);

  // Handle Attendance by Numeric PIN Code
  const handlePinAttendance = async (e) => {
    e?.preventDefault();
    if (!inputPinCode || inputPinCode.trim().length === 0) {
      setPinError('يرجى كتابة رقم الكود');
      return;
    }

    setPinLoading(true);
    setPinError('');

    try {
      const entered = inputPinCode.trim();
      // Validate code strictly against dynamic server PIN
      if (!activeServerPin || entered !== activeServerPin) {
        setPinError('الكود الرقمي غير صحيح أو تم تحديثه، اسأل الخادم عن الكود الحالي.');
        setPinLoading(false);
        return;
      }

      // Check if student has already registered attendance today
      const todayDateOnly = new Date().toISOString().split('T')[0];
      const checkAttendQ = query(
        collection(db, 'attendance'),
        where('userId', '==', user.id),
        where('date', '==', todayDateOnly)
      );
      const existingSnap = await getDocs(checkAttendQ);
      if (!existingSnap.empty) {
        setPinError('لقد قمت بتسجيل حضورك بالفعل لهذا اليوم! 🙏');
        setPinLoading(false);
        return;
      }

      // Calculate Official Regulation Attendance Points
      const calcResult = calculateAttendancePoints({
        stageRegulations,
        grade: user.grade || 'first',
        serviceStartTime: serviceStartTime || '10:30',
        currentTime: new Date()
      });
      const pointsAwarded = calcResult.points;
      const punctualityStatus = calcResult.punctualityStatus;

      // Record attendance in Firestore
      const todayStr = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      await addDoc(collection(db, 'attendance'), {
        userId: user.id,
        userName: user.fullName,
        phone: user.phone,
        grade: user.grade || 'first',
        date: todayDateOnly,
        dateFormatted: todayStr,
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        type: 'numeric_pin',
        pinUsed: entered,
        status: 'حاضر',
        pointsAwarded: pointsAwarded,
        punctualityStatus: punctualityStatus,
        createdAt: serverTimestamp()
      });

      setAttendanceStatus('success');
      setAttendanceRecords(prev => [
        { id: Date.now().toString(), date: `اليوم (${punctualityStatus})`, status: 'حاضر', time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }), points: pointsAwarded },
        ...prev
      ]);
      setInputPinCode('');
    } catch (err) {
      console.error('Error submitting pin attendance:', err);
      // Fallback local registration if offline: Save to offline queue
      const calcResult = calculateAttendancePoints({
        stageRegulations,
        grade: user.grade || 'first',
        serviceStartTime: serviceStartTime || '10:30',
        currentTime: new Date()
      });
      const pointsAwarded = calcResult.points;
      const punctualityStatus = calcResult.punctualityStatus;

      const offlineItem = {
        userId: user.id,
        userName: user.fullName,
        phone: user.phone,
        grade: user.grade || 'first',
        date: new Date().toISOString().split('T')[0],
        dateFormatted: new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        type: 'offline_numeric_pin',
        pinUsed: inputPinCode.trim(),
        status: 'حاضر',
        pointsAwarded: pointsAwarded,
        punctualityStatus: punctualityStatus,
        createdAt: new Date().toISOString()
      };
      try {
        const queue = JSON.parse(localStorage.getItem('offline_attendance_queue') || '[]');
        queue.push(offlineItem);
        localStorage.setItem('offline_attendance_queue', JSON.stringify(queue));
      } catch (storageErr) {
        console.error('Storage queue err:', storageErr);
      }

      setAttendanceStatus('success');
      setAttendanceRecords(prev => [
        { id: Date.now().toString(), date: `اليوم (${punctualityStatus} - أوفلاين 📡)`, status: 'حاضر', time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }), points: pointsAwarded },
        ...prev
      ]);
      setOfflineSyncMessage('تم حفظ حضورك في ذاكرة الهاتف! سيتم المزامنة تلقائياً عند الاتصال بالإنترنت 📡');
    } finally {
      setPinLoading(false);
    }
  };

  const handleScanQrCode = async (scannedText) => {
    if (!scannedText || typeof scannedText !== 'string') {
      return { success: false, message: 'تعذر قراءة الكود، يرجى المحاولة مرة أخرى.' };
    }

    const todayDateOnly = new Date().toISOString().split('T')[0];
    const cleanScanned = scannedText.trim();

    // 1. Validate Scanned QR Code against active service code
    const isValid = 
      (activeServerCode && cleanScanned === activeServerCode.trim()) ||
      cleanScanned === `STJOHN-ATTENDANCE-${todayDateOnly}` ||
      (cleanScanned.startsWith('STJOHN-ATTENDANCE-') && cleanScanned.includes(todayDateOnly));

    if (!isValid) {
      return { success: false, message: 'الكود الممسوح غير صحيح أو ليس كود خدمة اليوم!' };
    }

    // 2. Check if student already registered attendance today
    try {
      const checkAttendQ = query(
        collection(db, 'attendance'),
        where('userId', '==', user.id),
        where('date', '==', todayDateOnly)
      );
      const existingSnap = await getDocs(checkAttendQ);
      if (!existingSnap.empty) {
        return { success: false, message: 'لقد قمت بتسجيل حضورك بالفعل لهذا اليوم! 🙏' };
      }
    } catch (checkErr) {
      console.warn('Could not check double attendance:', checkErr);
    }

    // 3. Calculate Official Regulation Attendance Points
    const calcResult = calculateAttendancePoints({
      stageRegulations,
      grade: user.grade || 'first',
      serviceStartTime: serviceStartTime || '10:30',
      currentTime: new Date()
    });
    const pointsAwarded = calcResult.points;
    const punctualityStatus = calcResult.punctualityStatus;

    // 4. Record attendance in Firestore or offline queue
    const todayFormatted = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const recordPayload = {
      userId: user.id,
      userName: user.fullName,
      phone: user.phone,
      grade: user.grade || 'first',
      date: todayDateOnly,
      dateFormatted: todayFormatted,
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      type: 'qr_scan',
      qrScanned: cleanScanned,
      status: 'حاضر',
      pointsAwarded: pointsAwarded,
      punctualityStatus: punctualityStatus,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'attendance'), recordPayload);
    } catch (e) {
      console.warn('QR scan saved offline:', e);
      try {
        const queue = JSON.parse(localStorage.getItem('offline_attendance_queue') || '[]');
        queue.push({ ...recordPayload, createdAt: new Date().toISOString() });
        localStorage.setItem('offline_attendance_queue', JSON.stringify(queue));
        setOfflineSyncMessage('تم حفظ الحضور بالكاميرا محلياً! سيتم الرفع تلقائياً عند عودة النت 📡');
      } catch (err) {}
    }

    if (navigator.vibrate) {
      try { navigator.vibrate(200); } catch (vErr) {}
    }

    setAttendanceStatus('success');
    setAttendanceRecords(prev => [
      { id: Date.now().toString(), date: `اليوم (${punctualityStatus} - مسح QR)`, status: 'حاضر', time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }), points: pointsAwarded },
      ...prev
    ]);

    return { success: true };
  };

  const handleToggleDiaryItem = async (key, pts) => {
    if (!isEditableDate) return;

    const currentDayData = diaryRecords[selectedDiaryDate] || {
      baker: false,
      ghoroub: false,
      nowm: false,
      bible: false,
      communion: false,
      confession: false
    };
    const nextVal = !currentDayData[key];
    const updatedDay = {
      ...currentDayData,
      [key]: nextVal,
      userId: user.id,
      userName: user.fullName || 'مخدوم',
      userRole: 'student',
      grade: user.grade || 'first',
      date: selectedDiaryDate,
      month: selectedDiaryDate.substring(0, 7),
      year: new Date(selectedDiaryDate).getFullYear()
    };

    setDiaryRecords(prev => ({ ...prev, [selectedDiaryDate]: updatedDay }));

    try {
      const docId = `${user.id}_${selectedDiaryDate}`;
      await setDoc(doc(db, 'spiritual_diaries', docId), {
        ...updatedDay,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error('Error saving student diary to Firestore:', err);
    }
  };

  const handleSubmitExam = async (exam) => {
    if (exam.status && exam.status !== 'active') {
      alert('عفواً، هذه المسابقة موقوفة أو مغلقة حالياً من قبل الخدام.');
      setActiveExam(null);
      return;
    }

    let autoScore = 0;
    const questionsList = exam.questions || [];
    questionsList.forEach(q => {
      if ((q.type === 'mcq' || q.type === 'true_false') && examAnswers[q.id] === q.correctAnswer) {
        autoScore += (Number(q.points) || 1);
      }
    });

    const calculatedTotalScore = exam.totalScore || (questionsList.length > 0 
      ? questionsList.reduce((sum, q) => sum + (Number(q.points) || 1), 0)
      : 20);

    const result = { 
      examId: exam.id, 
      examTitle: exam.title || 'مسابقة بدون عنوان',
      subject: exam.subject || 'عام',
      grade: user.grade || 'first',
      userId: user.id,
      userName: user.fullName || 'مخدوم',
      userPhone: user.phone || '',
      answers: examAnswers,
      autoScore, 
      totalScore: calculatedTotalScore,
      essayPending: questionsList.some(q => q.type === 'essay'), 
      submittedAt: new Date().toLocaleTimeString('ar-EG'),
      date: new Date().toISOString().split('T')[0]
    };

    setExamResult(result);
    setCompletedExams(prev => ({ ...prev, [exam.id]: result }));

    try {
      await addDoc(collection(db, 'exam_submissions'), {
        ...result,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.log('Error saving exam submission to Firestore:', err);
    }
  };

  const handleSubmitTask = async (task, answers, autoScore, totalScore, isPracticeMode = false) => {
    if (isPracticeMode) {
      // Practice mode: self-study only
      return;
    }

    const result = {
      examId: task.id,
      examTitle: task.title || 'تاسك بدون عنوان',
      subject: task.subject || 'عام',
      grade: user.grade || 'first',
      userId: user.id,
      userName: user.fullName || 'مخدوم',
      userPhone: user.phone || '',
      answers: answers,
      autoScore,
      totalScore: totalScore || task.totalScore || 20,
      submittedAt: new Date().toLocaleTimeString('ar-EG'),
      date: new Date().toISOString().split('T')[0]
    };

    setCompletedExams(prev => ({ ...prev, [task.id]: result }));

    try {
      await addDoc(collection(db, 'exam_submissions'), {
        ...result,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.log('Error saving task submission:', err);
    }
  };

  const handleCompleteTask = (taskId) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, completed: true };
      }
      return t;
    }));
  };

  const handleDeleteAnnouncement = async (notifId, e) => {
    if (e) e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'notifications', notifId));
    } catch (err) {
      console.warn('Failed to delete notification:', err);
    }
    setAnnouncements(prev => prev.filter(item => item.id !== notifId));
  };

  const currentDayDiary = diaryRecords[selectedDiaryDate] || { baker: false, ghoroub: false, nowm: false, bible: false, communion: false, confession: false };

  const getGradeTitle = (g) => {
    const titles = { first: 'سنة أولى', second: 'سنة ثانية', third: 'سنة ثالثة', elisha: 'فصل أليشع (إعداد خدام)' };
    return titles[g] || g;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
      {/* Student Profile Card (Light Mode) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-3.5 sm:p-5 shadow-sm flex items-center justify-between gap-3">
        <div 
          onClick={() => setShowProfileModal(true)}
          className="flex items-center gap-2.5 sm:gap-3.5 text-right min-w-0 cursor-pointer group p-1.5 rounded-2xl hover:bg-slate-50 transition-all"
          title="اضغط لعرض وتعديل بيانات الحساب أو تسجيل الخروج"
        >
          <div 
            onClick={(e) => {
              if (user.photoUrl) {
                e.stopPropagation();
                setPreviewPhotoModal({ url: user.photoUrl, title: user.fullName });
              }
            }}
            className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-maroon-50 border border-maroon-200 text-maroon-900 flex items-center justify-center font-bold text-lg sm:text-xl shrink-0 shadow-xs group-hover:scale-105 transition-transform overflow-hidden relative"
            title={user.photoUrl ? "اضغط لتكبير الصورة الشخصية" : ""}
          >
            {user.photoUrl ? (
              <img src={user.photoUrl} alt={user.fullName} className="w-full h-full object-cover" />
            ) : (
              <span>{user.fullName ? user.fullName[0] : 'م'}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 truncate group-hover:text-maroon-800 transition-colors">
                أهلاً يا {user.fullName || 'مخدوم'}
              </h2>
              <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-bold">
                ⚙️
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
              <span className="bg-maroon-800 text-white px-2 py-0.5 rounded-full font-bold text-[9px] sm:text-[10px]">
                {getGradeTitle(user.grade)}
              </span>
              <span className="font-mono text-[11px] truncate" dir="ltr">{user.phone}</span>
            </div>
          </div>
        </div>

        {/* Stats & Regulations & Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm('هل تريد بالتأكيد تسجيل الخروج؟')) {
                onLogout();
              }
            }}
            className="p-2 sm:px-3 sm:py-1.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1.5 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            <span className="hidden md:inline">خروج</span>
          </button>
        </div>
      </div>

      {/* Quick Navigation Pills for Mobile & Tablet */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none font-cairo">
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className={`shrink-0 py-2 px-3.5 rounded-2xl text-xs font-black transition-all border flex items-center gap-1.5 cursor-pointer active:scale-95 ${
            activeTab === 'home'
              ? 'bg-maroon-800 text-white border-maroon-900 shadow-2xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Home className="w-3.5 h-3.5 text-gold-300" />
          <span>الرئيسية</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          className={`shrink-0 py-2 px-3 rounded-2xl text-xs font-black transition-all border flex items-center gap-1.5 cursor-pointer active:scale-95 ${
            activeTab === 'attendance'
              ? 'bg-maroon-800 text-white border-maroon-900 shadow-2xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>الحضور</span>
          {(isWithinTime || bypassTime) && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('spiritual_diary')}
          className={`shrink-0 py-2 px-3 rounded-2xl text-xs font-black transition-all border flex items-center gap-1.5 cursor-pointer active:scale-95 ${
            activeTab === 'spiritual_diary'
              ? 'bg-maroon-800 text-white border-maroon-900 shadow-2xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span>النوتة</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('curriculum')}
          className={`shrink-0 py-2 px-3 rounded-2xl text-xs font-black transition-all border flex items-center gap-1.5 cursor-pointer active:scale-95 ${
            activeTab === 'curriculum'
              ? 'bg-maroon-800 text-white border-maroon-900 shadow-2xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
          <span>المناهج</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('exams')}
          className={`shrink-0 py-2 px-3 rounded-2xl text-xs font-black transition-all border flex items-center gap-1.5 cursor-pointer active:scale-95 ${
            activeTab === 'exams'
              ? 'bg-maroon-800 text-white border-maroon-900 shadow-2xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-purple-600" />
          <span>الامتحانات</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tasks')}
          className={`shrink-0 py-2 px-3 rounded-2xl text-xs font-black transition-all border flex items-center gap-1.5 cursor-pointer active:scale-95 ${
            activeTab === 'tasks'
              ? 'bg-maroon-800 text-white border-maroon-900 shadow-2xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>التاسكات</span>
        </button>
      </div>

      {/* Slide-Over Navigation Drawer for Students */}
      {isNavDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden font-cairo">
          {/* Backdrop Blur Overlay */}
          <div 
            onClick={() => setIsNavDrawerOpen(false)}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-300"
          />

          {/* Drawer Slide-in from Right (RTL) */}
          <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-white shadow-2xl z-50 flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-250">
            {/* Drawer Header */}
            <div>
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/80">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-maroon-900 text-gold-300 flex items-center justify-center font-bold">
                    <BookOpen className="w-5 h-5" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNavDrawerOpen(false)}
                  className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors"
                  title="إغلاق القائمة"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-140px)]">
                {/* Official Stage Regulation Button (On hold until unified scoring launch) */}

                {/* Home Overview Tab */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('home');
                    setIsNavDrawerOpen(false);
                  }}
                  className={`w-full text-right py-3 px-3.5 rounded-2xl flex items-center gap-3 text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'home'
                      ? 'bg-maroon-800 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Home className={`w-4 h-4 ${activeTab === 'home' ? 'text-gold-300' : 'text-slate-500'}`} />
                  <span>الرئيسية ولوحة إنجازي</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('attendance');
                    setIsNavDrawerOpen(false);
                  }}
                  className={`w-full text-right py-3 px-3.5 rounded-2xl flex items-center gap-3 text-xs font-bold transition-all ${
                    activeTab === 'attendance'
                      ? 'bg-maroon-800 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <QrCode className={`w-4 h-4 ${activeTab === 'attendance' ? 'text-gold-300' : 'text-slate-500'}`} />
                  <span>تسجيل حضور</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('spiritual_diary');
                    setIsNavDrawerOpen(false);
                  }}
                  className={`w-full text-right py-3 px-3.5 rounded-2xl flex items-center gap-3 text-xs font-bold transition-all ${
                    activeTab === 'spiritual_diary'
                      ? 'bg-maroon-800 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Sun className={`w-4 h-4 ${activeTab === 'spiritual_diary' ? 'text-gold-300' : 'text-amber-500'}`} />
                  <span>النوتة الروحية</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('curriculum');
                    setIsNavDrawerOpen(false);
                  }}
                  className={`w-full text-right py-3 px-3.5 rounded-2xl flex items-center gap-3 text-xs font-bold transition-all ${
                    activeTab === 'curriculum'
                      ? 'bg-maroon-800 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className={`w-4 h-4 ${activeTab === 'curriculum' ? 'text-gold-300' : 'text-slate-500'}`} />
                  <span>المنهج والمواد</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('exams');
                    setIsNavDrawerOpen(false);
                  }}
                  className={`w-full text-right py-3 px-3.5 rounded-2xl flex items-center gap-3 text-xs font-bold transition-all ${
                    activeTab === 'exams'
                      ? 'bg-maroon-800 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <FileText className={`w-4 h-4 ${activeTab === 'exams' ? 'text-gold-300' : 'text-slate-500'}`} />
                  <span>الامتحانات</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('tasks');
                    setIsNavDrawerOpen(false);
                  }}
                  className={`w-full text-right py-3 px-3.5 rounded-2xl flex items-center gap-3 text-xs font-bold transition-all ${
                    activeTab === 'tasks'
                      ? 'bg-maroon-800 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <CheckSquare className={`w-4 h-4 ${activeTab === 'tasks' ? 'text-gold-300' : 'text-slate-500'}`} />
                  <span>التاسكات</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('announcements');
                    setIsNavDrawerOpen(false);
                  }}
                  className={`w-full text-right py-3 px-3.5 rounded-2xl flex items-center gap-3 text-xs font-bold transition-all ${
                    activeTab === 'announcements'
                      ? 'bg-maroon-800 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Bell className={`w-4 h-4 ${activeTab === 'announcements' ? 'text-gold-300' : 'text-slate-500'}`} />
                  <span>التنبيهات</span>
                </button>

                {/* System & Support Tools */}
                <AppSupportToolsDrawerSection 
                  user={user} 
                  onCloseDrawer={() => setIsNavDrawerOpen(false)} 
                />
              </nav>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-center text-[11px] text-slate-400">
              أسرة إعداد خدام بولس الرسول وأليشع النبي
            </div>
          </div>
        </div>
      )}

      {/* 0. Tab: Student Home Overview */}
      {activeTab === 'home' && (
        <StudentHomeOverview
          user={user}
          points={points}
          getGradeTitle={getGradeTitle}
          attendanceRecords={attendanceRecords}
          diaryRecords={diaryRecords}
          availableExams={availableExams}
          completedExams={completedExams}
          isWithinTime={isWithinTime}
          bypassTime={bypassTime}
          onNavigateTab={(tab) => setActiveTab(tab)}
          onOpenRegulations={() => setShowRegulationsModal(true)}
        />
      )}

      {/* 1. Tab: Student Attendance (Modular) */}
      {activeTab === 'attendance' && (
        <StudentAttendance
          currentTimeStr={currentTimeStr}
          isWithinTime={isWithinTime}
          bypassTime={bypassTime}
          servantOpenedAccess={servantOpenedAccess}
          scanning={scanning}
          attendanceStatus={attendanceStatus}
          onScanQrCode={handleScanQrCode}
          inputPinCode={inputPinCode}
          setInputPinCode={setInputPinCode}
          handlePinAttendance={handlePinAttendance}
          pinLoading={pinLoading}
          pinError={pinError}
          attendanceRecords={attendanceRecords}
          serviceStartTime={serviceStartTime}
          isOffline={isOffline}
          offlineSyncMessage={offlineSyncMessage}
        />
      )}

      {/* 2. Tab: Spiritual Diary (Modular) */}
      {activeTab === 'spiritual_diary' && (
        <StudentSpiritualDiary
          selectedDiaryDate={selectedDiaryDate}
          setSelectedDiaryDate={setSelectedDiaryDate}
          todayDateStr={todayDateStr}
          yesterdayDateStr={yesterdayDateStr}
          isEditableDate={isEditableDate}
          studentDiarySubTab={studentDiarySubTab}
          setStudentDiarySubTab={setStudentDiarySubTab}
          selectedHistoryMonth={selectedHistoryMonth}
          setSelectedHistoryMonth={setSelectedHistoryMonth}
          diaryRecords={diaryRecords}
          handleToggleDiaryItem={handleToggleDiaryItem}
          diaryPointsConfig={getDiaryPointsConfig(stageRegulations, user?.grade)}
          isGracePeriodActive={isGracePeriodActive}
          availableEntryDates={availableEntryDates}
        />
      )}

      {/* 3. Tab: Curriculum (Modular) */}
      {activeTab === 'curriculum' && (
        <StudentCurriculum
          user={user}
          getGradeTitle={getGradeTitle}
          subjectsData={subjectsData}
          selectedSubject={selectedSubject}
          setSelectedSubject={setSelectedSubject}
          activePreviewPdf={activePreviewPdf}
          setActivePreviewPdf={setActivePreviewPdf}
          activePreviewVideo={activePreviewVideo}
          setActivePreviewVideo={setActivePreviewVideo}
        />
      )}

      {/* 4. Tab: Formal Exams (Term & Midterm only) */}
      {activeTab === 'exams' && (
        <StudentExams
          user={user}
          getGradeTitle={getGradeTitle}
          availableExams={availableExams.filter(ex => ex.type === 'term_exam' || ex.type === 'formal_exam')}
          completedExams={completedExams}
          activeExam={activeExam}
          setActiveExam={setActiveExam}
          examAnswers={examAnswers}
          setExamAnswers={setExamAnswers}
          examResult={examResult}
          setExamResult={setExamResult}
          handleSubmitExam={handleSubmitExam}
        />
      )}

      {/* 5. Tab: Tasks & Competitions */}
      {activeTab === 'tasks' && (
        <StudentTasks
          user={user}
          getGradeTitle={getGradeTitle}
          allQuizzes={availableExams.filter(ex => ex.type === 'online_quiz' || !ex.type || (ex.questions && ex.questions.length > 0))}
          completedTasks={completedExams}
          onSubmitTask={handleSubmitTask}
        />
      )}

      {/* 6. Tab: Announcements */}
      {activeTab === 'announcements' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 text-right">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Bell className="w-5 h-5 text-maroon-800" />
              تنبيهات ورسائل الخدمة
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">التنبيهات المباشرة الصادرة من خدام وأمناء المرحلة.</p>
          </div>

          {announcements.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
              <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">لا توجد تنبيهات جديدة في الوقت الحالي.</p>
              <p className="text-[11px] text-slate-400 mt-1">تنبيهات الخدمة والتعليمات الهامة ستظهر لك هنا.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((item) => {
                const sanitizedDesc = (item.desc || item.text || '').replace(/،?\s*وتمت إضافة.*نقطة لرصيدك\.?/g, '').trim();
                return (
                  <div key={item.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">{item.title}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-mono">{item.time || item.date || 'الآن'}</span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteAnnouncement(item.id, e)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="حذف هذا التنبيه"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{sanitizedDesc}</p>
                    <div className="text-[10px] text-maroon-800 font-bold pt-1 border-t border-slate-200/60">
                      المرسل: {item.senderName || item.sender || 'أمين الخدمة'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Official Stage Regulation Modal for Student */}
      <StageRegulationsModal
        isOpen={showRegulationsModal}
        onClose={() => setShowRegulationsModal(false)}
        currentUser={user}
        studentGrade={user?.grade || 'first'}
        isStudent={true}
        isAdmin={false}
      />

      {/* User Account & Profile Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
        onLogout={onLogout}
        onUpdateUser={onUpdateUser}
      />

      {/* Full-Screen Photo Lightbox Modal */}
      {previewPhotoModal && (
        <div 
          onClick={() => setPreviewPhotoModal(null)}
          className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4 cursor-pointer animate-in fade-in duration-200 select-none"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-sm sm:max-w-md w-full bg-white rounded-3xl overflow-hidden shadow-2xl border-2 border-gold-400 p-3 sm:p-4 text-center space-y-3 cursor-default animate-in zoom-in-95 duration-200"
          >
            <div className="relative rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center max-h-[70vh]">
              <img 
                src={previewPhotoModal.url} 
                alt={previewPhotoModal.title || 'صورة شخصية'} 
                className="w-full h-auto max-h-[68vh] object-contain rounded-2xl"
              />
            </div>
            {previewPhotoModal.title && (
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-800">
                {previewPhotoModal.title}
              </h4>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
