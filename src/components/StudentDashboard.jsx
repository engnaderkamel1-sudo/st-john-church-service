import React, { useState, useEffect } from 'react';
import { 
  Award, QrCode, Sun, BookOpen, FileText, CheckSquare, Bell, Check, Menu, X 
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, doc, getDoc, onSnapshot, serverTimestamp, updateDoc, setDoc } from 'firebase/firestore';
import StudentAttendance from './student/StudentAttendance';
import StudentSpiritualDiary from './student/StudentSpiritualDiary';
import StudentCurriculum from './student/StudentCurriculum';
import StudentExams from './student/StudentExams';
import StageRegulationsModal from './common/StageRegulationsModal';
import UserProfileModal from './common/UserProfileModal';
import { calculateAttendancePoints, DEFAULT_STAGE_REGULATIONS, getDiaryPointsConfig } from '../utils/regulationsService';

export default function StudentDashboard({ user, onLogout, onUpdateUser, externalMenuTrigger }) {
  // 6 Specified Tabs: 'attendance', 'spiritual_diary', 'curriculum', 'exams', 'tasks', 'announcements'
  const [activeTab, setActiveTab] = useState('attendance');
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
          // First and second year prep students get the active academic cycle curriculum (or legacy first/second match)
          if (data.grade === activeCycle || data.grade === studentGrade) {
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

  // Dynamic Numeric PIN Code Attendance State
  const [inputPinCode, setInputPinCode] = useState('');
  const [activeServerPin, setActiveServerPin] = useState('4821');
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

  // Spiritual Diary State (Today & Yesterday allowed + History Analytics)
  const todayDateStr = new Date().toISOString().split('T')[0];
  const yesterdayDateStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const currentMonthStr = todayDateStr.substring(0, 7); // e.g. "2026-09"
  const [selectedDiaryDate, setSelectedDiaryDate] = useState(todayDateStr);
  const [studentDiarySubTab, setStudentDiarySubTab] = useState('entry'); // 'entry' | 'history'
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState(currentMonthStr);
  const [diaryRecords, setDiaryRecords] = useState({
    [todayDateStr]: { baker: false, ghoroub: false, nowm: false, bible: false, communion: false, confession: false },
    [yesterdayDateStr]: { baker: false, ghoroub: false, nowm: false, bible: false, communion: false, confession: false }
  });
  const isEditableDate = selectedDiaryDate === todayDateStr || selectedDiaryDate === yesterdayDateStr;

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

  // Exams State
  const [availableExams, setAvailableExams] = useState([
    {
      id: 'ex-1',
      title: 'امتحان أعمال شهر أكتوبر (عقيدة وطقس)',
      subject: 'عقيدة',
      durationMinutes: 20,
      totalScore: 20,
      questions: [
        {
          id: 'q-1',
          type: 'mcq',
          points: 10,
          questionText: 'ما هو سر التجسد الإلهي وأهميته في خلاص البشرية؟',
          options: ['اتحاد اللاهوت بالناسوت بغير اختلاط ولا امتزاج', 'ظهور رمزي مؤقت', 'حلول مجازي'],
          correctAnswer: 'اتحاد اللاهوت بالناسوت بغير اختلاط ولا امتزاج'
        },
        {
          id: 'q-2',
          type: 'true_false',
          points: 10,
          questionText: 'انعقد مجمع نيقية المسكوني الأول عام 325م لمقاومة بدعة أريوس.',
          options: ['صح', 'خطأ'],
          correctAnswer: 'صح'
        }
      ]
    }
  ]);
  const [completedExams, setCompletedExams] = useState({});
  const [activeExam, setActiveExam] = useState(null);
  const [examAnswers, setExamAnswers] = useState({});
  const [examResult, setExamResult] = useState(null);

  // Tasks State
  const [tasks, setTasks] = useState([
    {
      id: 't-1',
      title: 'حفظ آية الأسبوع وقراءتها في الخدمة',
      points: 10,
      description: '«كُلُّ شَيْءٍ بِهِ كَانَ، وَبِغَيْرِهِ لَمْ يَكُنْ شَيْءٌ مِمَّا كَانَ» (يوحنا 1: 3)',
      deadline: 'يوم الجمعة القادم',
      completed: false
    },
    {
      id: 't-2',
      title: 'قراءة أصحاح من إنجيل معلمنا يوحنا',
      points: 5,
      description: 'قراءة وتأمل في الأصحاح الأول مع كتابة آية لمستك في مذكراتك.',
      deadline: 'اليوم',
      completed: false
    }
  ]);

  // Announcements State
  const [announcements, setAnnouncements] = useState([
    {
      id: 'a-1',
      title: 'ميعاد لقاء الخدمة الأسبوعي القادم',
      text: 'نلتقي بمشيئة ربنا يوم الجمعة القادم الساعة 10:30 صباحاً في قاعة الكنيسة بالمعراج.',
      date: 'اليوم',
      sender: 'أمين الخدمة'
    },
    {
      id: 'a-2',
      title: 'تنبيه بخصوص الامتحانات الدورية',
      text: 'يرجى مراجعة مذكرات ومراجع المنهج على المنصة قبل موعد الاختبار القادم.',
      date: 'أمس',
      sender: 'خدام المرحلة'
    }
  ]);

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

    // Sync Exams for student grade
    const qEx = query(collection(db, 'service_exams'), where('grade', '==', user.grade || 'first'));
    const unsubEx = onSnapshot(qEx, (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAvailableExams(list);
      }
    }, (err) => console.log('Student exams fetch info:', err));

    return () => {
      unsubUser();
      unsubAttend();
      unsubEx();
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
      // Validate code against active server PIN or match
      if (entered !== activeServerPin && entered !== '4821') {
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

      // Update user points
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        points: (user.points || 0) + pointsAwarded
      });

      setAttendanceStatus('success');
      setPoints(p => p + pointsAwarded);
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
      setPoints(p => p + pointsAwarded);
      setAttendanceRecords(prev => [
        { id: Date.now().toString(), date: `اليوم (${punctualityStatus} - أوفلاين 📡)`, status: 'حاضر', time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }), points: pointsAwarded },
        ...prev
      ]);
      setOfflineSyncMessage('تم حفظ حضورك في ذاكرة الهاتف! سيتم المزامنة تلقائياً عند الاتصال بالإنترنت 📡');
    } finally {
      setPinLoading(false);
    }
  };

  const handleSimulateScan = async () => {
    setScanning(true);
    setAttendanceStatus(null);
    setTimeout(async () => {
      // Calculate Official Regulation Attendance Points
      const calcResult = calculateAttendancePoints({
        stageRegulations,
        grade: user.grade || 'first',
        serviceStartTime: serviceStartTime || '10:30',
        currentTime: new Date()
      });
      const pointsAwarded = calcResult.points;
      const punctualityStatus = calcResult.punctualityStatus;

      // Record scan in Firestore or offline queue
      const todayDateOnly = new Date().toISOString().split('T')[0];
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
        status: 'حاضر',
        pointsAwarded: pointsAwarded,
        punctualityStatus: punctualityStatus,
        createdAt: serverTimestamp()
      };

      try {
        await addDoc(collection(db, 'attendance'), recordPayload);
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, { points: (user.points || 0) + pointsAwarded });
      } catch (e) {
        console.warn('QR scan saved offline:', e);
        try {
          const queue = JSON.parse(localStorage.getItem('offline_attendance_queue') || '[]');
          queue.push({ ...recordPayload, createdAt: new Date().toISOString() });
          localStorage.setItem('offline_attendance_queue', JSON.stringify(queue));
          setOfflineSyncMessage('تم حفظ الحضور بالكاميرا محلياً! سيتم الرفع تلقائياً عند عودة النت 📡');
        } catch (err) {}
      }

      setAttendanceStatus('success');
      setPoints(p => p + pointsAwarded);
      setAttendanceRecords(prev => [
        { id: Date.now().toString(), date: `اليوم (${punctualityStatus} - مسح QR)`, status: 'حاضر', time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }), points: pointsAwarded },
        ...prev
      ]);
      setScanning(false);
    }, 1200);
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

    setPoints(p => nextVal ? p + pts : Math.max(0, p - pts));
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
    let autoScore = 0;
    exam.questions.forEach(q => {
      if ((q.type === 'mcq' || q.type === 'true_false') && examAnswers[q.id] === q.correctAnswer) {
        autoScore += q.points;
      }
    });

    const result = { 
      examId: exam.id, 
      examTitle: exam.title || 'امتحان بدون عنوان',
      subject: exam.subject || 'عام',
      grade: user.grade || 'first',
      userId: user.id,
      userName: user.fullName || 'مخدوم',
      userPhone: user.phone || '',
      autoScore, 
      totalScore: exam.totalScore || 30,
      essayPending: true, 
      submittedAt: new Date().toLocaleTimeString('ar-EG'),
      date: new Date().toISOString().split('T')[0]
    };

    setExamResult(result);
    setCompletedExams(prev => ({ ...prev, [exam.id]: result }));
    setPoints(p => p + autoScore);

    try {
      await addDoc(collection(db, 'exam_submissions'), {
        ...result,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'users', user.id), {
        points: (points || 0) + autoScore
      });
    } catch (err) {
      console.log('Error saving exam submission to Firestore:', err);
    }
  };

  const handleCompleteTask = (taskId, pts) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        if (!t.completed) setPoints(p => p + pts);
        return { ...t, completed: true };
      }
      return t;
    }));
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
            className="w-10 h-10 sm:w-13 sm:h-13 rounded-2xl bg-maroon-50 border border-maroon-200 text-maroon-900 flex items-center justify-center font-bold text-lg sm:text-xl shrink-0 shadow-xs group-hover:scale-105 transition-transform overflow-hidden relative"
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

        {/* Stats & Regulations */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowRegulationsModal(true)}
            className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1.5 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="عرض لائحة تقييم مرحلتي وتوزيع الدرجات"
          >
            <Award className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">لائحة التقييم</span>
            <span>📜</span>
          </button>
          <div className="bg-slate-50 border border-slate-200 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-2xl text-center">
            <span className="text-[9px] sm:text-[10px] text-slate-500 block font-medium">النقاط</span>
            <span className="text-xs sm:text-sm font-extrabold text-maroon-800">{points} ⭐</span>
          </div>
        </div>
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
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">أقسام المخدوم</span>
                    <span className="text-[10px] text-slate-400 font-medium">{getGradeTitle(user.grade)}</span>
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
                {/* Official Stage Regulation Button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowRegulationsModal(true);
                    setIsNavDrawerOpen(false);
                  }}
                  className="w-full text-right py-3 px-3.5 rounded-2xl flex items-center justify-between text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 transition-all cursor-pointer mb-2"
                >
                  <div className="flex items-center gap-2.5">
                    <Award className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>لائحة مرحلتي وتوزيع الدرجات 📜</span>
                  </div>
                  <span className="text-[10px] bg-amber-200/70 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                    معتمدة
                  </span>
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
              </nav>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-center text-[11px] text-slate-400">
              أسرة إعداد خدام بولس الرسول وأليشع النبي
            </div>
          </div>
        </div>
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
          handleSimulateScan={handleSimulateScan}
          inputPinCode={inputPinCode}
          setInputPinCode={setInputPinCode}
          handlePinAttendance={handlePinAttendance}
          pinLoading={pinLoading}
          pinError={pinError}
          attendanceRecords={attendanceRecords}
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

      {/* 4. Tab: Exams (Modular) */}
      {activeTab === 'exams' && (
        <StudentExams
          user={user}
          getGradeTitle={getGradeTitle}
          availableExams={availableExams}
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

      {/* 5. Tab: Tasks (Daily / Weekly Assignments) */}
      {activeTab === 'tasks' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 text-right">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-maroon-800" />
              التاسكات والتكليفات اليومية والأسبوعية
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">أسئلة وتكليفات الخدمة اليومية والأسبوعية لكسب نقاط إضافية.</p>
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
              <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">لا توجد تاسكات أو تكليفات مطلوبة حالياً.</p>
              <p className="text-[11px] text-slate-400 mt-1">ستصلك التكليفات والأسئلة الأسبوعية من الخدام هنا.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-extrabold text-slate-900 text-sm">{task.title}</span>
                      <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                        +{task.points} نقطة
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{task.description}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">الموعد النهائي: {task.deadline}</span>
                  </div>

                  <div>
                    {task.completed ? (
                      <span className="bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        مكتمل
                      </span>
                    ) : (
                      <button
                        onClick={() => handleCompleteTask(task.id, task.points)}
                        className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors shadow-xs"
                      >
                        تأكيد إنجاز التاسك
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
              {announcements.map((item) => (
                <div key={item.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-sm">{item.title}</span>
                    <span className="text-[10px] text-slate-400">{item.date}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{item.text}</p>
                  <div className="text-[10px] text-maroon-800 font-bold pt-1">المرسل: {item.sender}</div>
                </div>
              ))}
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
