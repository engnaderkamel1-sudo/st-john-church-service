import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Users, QrCode, BookOpen, CheckCircle, Clock, 
  Printer, UserCheck, Search, Award, FileCheck, Edit3, Save, Check, 
  FileText, Plus, Download, UploadCloud, ChevronLeft, Trash2, FolderPlus,
  HelpCircle, Filter, Send, Layers, AlertCircle, MessageSquare, TrendingUp, Trophy, UserCog, RefreshCw,
  BellRing, Unlock, Lock, UserPlus, UserX, KeyRound, Copy, Sun, Sunset, Moon, Sparkles, Heart,
  History, Activity, Menu, X, Video, Music, ExternalLink,
  Eye, EyeOff, Calendar, CalendarOff, ChevronRight, FileSpreadsheet, File, BarChart3, TrendingDown, Image as ImageIcon,
  AlertTriangle,
  Cake
} from 'lucide-react';
import { db } from '../firebase';
import ServantSpiritualDiary from './servant/ServantSpiritualDiary';
import ServantCurriculum from './servant/ServantCurriculum';
import ServantExamsBank from './servant/ServantExamsBank';
import ServantAnalytics from './servant/ServantAnalytics';
import ServantAttendanceQR from './servant/ServantAttendanceQR';
import ServantUsersHub from './servant/ServantUsersHub';
import ServantStudentsHub from './servant/ServantStudentsHub';
import ServantManualAttendance from './servant/ServantManualAttendance';
import ServantHolidaysManager from './servant/ServantHolidaysManager';
import ServantBirthdaysHub from './servant/ServantBirthdaysHub';
import StudentProfileModal from './servant/StudentProfileModal';
import ServantErrorsHub from './servant/ServantErrorsHub';
import StageRegulationsModal from './common/StageRegulationsModal';
import UserProfileModal from './common/UserProfileModal';
import { calculateAttendancePoints, DEFAULT_STAGE_REGULATIONS } from '../utils/regulationsService';
import { collection, getDocs, doc, updateDoc, setDoc, addDoc, deleteDoc, query, where, orderBy, serverTimestamp, limit, onSnapshot } from 'firebase/firestore';

export default function ServantDashboard({ user, onLogout, onUpdateUser, externalMenuTrigger }) {
  // Check if current user is App Administrator (Nader Reda or church prep account)
  const isAppAdmin = user && (user.role === 'admin' || user.phone === '01275571569' || (user.email && (user.email.includes('nader.kamel') || user.email.includes('st.johnmaadiservantsprep@gmail.com'))));
  // Check if current user is Servant Leader (أمين خدمة) or Admin
  const isServantLeader = isAppAdmin || (user && user.role === 'servant_leader');

  const [mainTab, setMainTab] = useState(isAppAdmin ? 'users_hub' : 'subjects_hub');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Sync external menu trigger from top header
  useEffect(() => {
    if (externalMenuTrigger && externalMenuTrigger > 0) {
      setMobileSidebarOpen(true);
    }
  }, [externalMenuTrigger]);
  const [selectedGrade, setSelectedGrade] = useState('first');
  const [showRegulationsModal, setShowRegulationsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [previewPhotoModal, setPreviewPhotoModal] = useState(null);

  // Registered Users Management & Approval State
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [roleUpdatingId, setRoleUpdatingId] = useState(null);
  const [userHubSubTab, setUserHubSubTab] = useState('accounts'); // 'accounts' | 'login_history'

  // User Login Logs History State (سجل دخول المستخدمين)
  const [loginLogs, setLoginLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Fetch registered users from Firestore
  const fetchAllUsers = async () => {
    setUsersLoading(true);
    try {
      const q = query(collection(db, 'users'));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllUsers(list);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  // Fetch Login Logs History
  const fetchLoginLogs = async () => {
    setLogsLoading(true);
    try {
      const q = query(collection(db, 'login_logs'), orderBy('timestamp', 'desc'), limit(50));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLoginLogs(list);
    } catch (err) {
      console.error('Error fetching login logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllUsers();
    if (isAppAdmin) {
      fetchLoginLogs();
    }

    // Realtime sync of active attendance PIN across all servants
    const unsubPin = onSnapshot(doc(db, 'service_settings', 'attendance_window'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.activePin) {
          setNumericPin(data.activePin.toString());
        }
        if (data.activeCode) {
          setQrCodeData(data.activeCode);
        }
        if (data.serviceStartTime) {
          setServiceStartTime(data.serviceStartTime);
        }
      }
    });

    // Realtime sync of active curriculum cycle (cycle_1: منهج المرحلة الأولى | cycle_2: منهج المرحلة الثانية)
    const unsubCycle = onSnapshot(doc(db, 'service_settings', 'academic_cycle'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.activeCycle) {
          setActiveAcademicCycle(data.activeCycle);
        }
        if (data.academicYear) {
          setAcademicYear(data.academicYear);
        }
      }
    });

    return () => {
      unsubPin();
      unsubCycle();
    };
  }, [isAppAdmin]);

  // Dynamic Service Start Time (Default: 10:30)
  const [serviceStartTime, setServiceStartTime] = useState('10:30');
  const [stageRegulations, setStageRegulations] = useState(DEFAULT_STAGE_REGULATIONS);
  const [serviceHolidays, setServiceHolidays] = useState([]);

  // Sync Stage Regulations in real-time
  useEffect(() => {
    const unsubRegs = onSnapshot(doc(db, 'service_settings', 'stage_regulations'), (snap) => {
      if (snap.exists()) {
        setStageRegulations(snap.data());
      }
    }, (err) => console.warn('Regs listener err:', err));
    return () => unsubRegs();
  }, []);

  // Sync Service Holidays (Cancelled/Excused Fridays) in real-time
  useEffect(() => {
    const unsubHolidays = onSnapshot(doc(db, 'service_settings', 'service_holidays'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setServiceHolidays(data.holidays || []);
      }
    }, (err) => console.warn('Holidays listener err:', err));
    return () => unsubHolidays();
  }, []);

  const handleAddHoliday = async (dateStr, labelStr) => {
    if (!dateStr) return;
    const newHolidays = [
      ...serviceHolidays.filter(h => (typeof h === 'string' ? h !== dateStr : h.date !== dateStr)),
      { date: dateStr, label: labelStr || 'جمعة معفاة / إجازة رسمية' }
    ];
    setServiceHolidays(newHolidays);
    try {
      await setDoc(doc(db, 'service_settings', 'service_holidays'), {
        holidays: newHolidays,
        updatedBy: user.fullName || 'الخادم المسؤول',
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error('Error saving holiday:', e);
    }
  };

  const handleRemoveHoliday = async (dateStr) => {
    const newHolidays = serviceHolidays.filter(h => (typeof h === 'string' ? h !== dateStr : h.date !== dateStr));
    setServiceHolidays(newHolidays);
    try {
      await setDoc(doc(db, 'service_settings', 'service_holidays'), {
        holidays: newHolidays,
        updatedBy: user.fullName || 'الخادم المسؤول',
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error('Error removing holiday:', e);
    }
  };

  const handleUpdateServiceStartTime = async (newTime) => {
    setServiceStartTime(newTime);
    try {
      await setDoc(doc(db, 'service_settings', 'attendance_window'), {
        serviceStartTime: newTime,
        updatedBy: user.fullName || 'الخادم المسؤول',
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error('Error updating service start time:', e);
    }
  };

  // Active academic cycle state (default: cycle_1 for 2026-2027)
  const [activeAcademicCycle, setActiveAcademicCycle] = useState('cycle_1'); // 'cycle_1' (المرحلة الأولى) | 'cycle_2' (المرحلة الثانية)
  const [academicYear, setAcademicYear] = useState('2026-2027');

  const handleUpdateAcademicCycle = async (newCycle, newYear = '2026-2027') => {
    setActiveAcademicCycle(newCycle);
    setAcademicYear(newYear);
    try {
      await setDoc(doc(db, 'service_settings', 'academic_cycle'), {
        activeCycle: newCycle,
        academicYear: newYear,
        updatedBy: user.fullName || 'الخادم المسؤول',
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error('Error saving academic cycle:', e);
    }
  };

  // Update User Role & Stage in Firestore
  const handleUpdateUserRole = async (userId, newRole, newGrade = null) => {
    if (!isAppAdmin) {
      alert('عفواً، تعديل الرتب والأدوار مقتصر على مشرف التطبيق فقط.');
      return;
    }

    setRoleUpdatingId(userId);
    try {
      const userRef = doc(db, 'users', userId);
      const updateData = { role: newRole };
      if (newRole === 'servant') {
        updateData.status = 'active';
        updateData.servantScope = newGrade || 'all';
      } else {
        if (newGrade) updateData.grade = newGrade;
      }

      await updateDoc(userRef, updateData);
      
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updateData } : u));
    } catch (err) {
      console.error('Error updating role:', err);
      alert('حدث خطأ أثناء تعديل رتبة المستخدم');
    } finally {
      setRoleUpdatingId(null);
    }
  };

  // Dynamic QR & Numeric PIN Code
  const todayStr = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const [qrCodeData, setQrCodeData] = useState(`STJOHN-ATTENDANCE-${new Date().toISOString().split('T')[0]}`);
  const [numericPin, setNumericPin] = useState('4821');

  // Manual Attendance & Absence State
  const [manualAttendLoadingId, setManualAttendLoadingId] = useState(null);
  const [manualAttendSuccessId, setManualAttendSuccessId] = useState(null);
  const [manualAbsenceLoadingId, setManualAbsenceLoadingId] = useState(null);
  const [manualAbsenceSuccessId, setManualAbsenceSuccessId] = useState(null);
  const [remoteAccessTarget, setRemoteAccessTarget] = useState('all');
  const [remoteAccessLoading, setRemoteAccessLoading] = useState(false);
  const [remoteAccessMessage, setRemoteAccessMessage] = useState('');
  const [selectedStudentForAccess, setSelectedStudentForAccess] = useState('');

  // Generate and sync a new 4-digit PIN code
  const handleGenerateNewPin = async () => {
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    setNumericPin(newPin);
    try {
      const todayDateOnly = new Date().toISOString().split('T')[0];
      const expiryTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
      await setDoc(doc(db, 'service_settings', 'attendance_window'), {
        isOpenForAll: true,
        openedBy: user.fullName || 'أمين الخدمة',
        date: todayDateOnly,
        validUntil: expiryTime.toISOString(),
        activeCode: qrCodeData,
        activePin: newPin,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error('Error updating pin:', err);
    }
  };

  // 1. Manual Attendance (لو نسي التليفون أو لتسجيله حاضراً مع تحديد وقت وتاريخ الخدمة)
  const handleManualAttendance = async (targetUser, customTime = null, customDate = null) => {
    setManualAttendLoadingId(targetUser.id);
    try {
      const todayDateOnly = new Date().toISOString().split('T')[0];
      const targetDate = customDate || todayDateOnly;
      const targetDateFormatted = targetDate === todayDateOnly ? todayStr : new Date(targetDate).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const recordedTime = customTime || new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

      // Calculate Official Regulation Attendance Points dynamically based on stage regulations
      const { points: pointsAwarded, punctualityStatus } = calculateAttendancePoints({
        stageRegulations,
        grade: targetUser.grade || 'first',
        serviceStartTime: serviceStartTime || '10:30',
        currentTime: new Date()
      });

      // Record attendance in Firestore
      await addDoc(collection(db, 'attendance'), {
        userId: targetUser.id,
        userName: targetUser.fullName,
        phone: targetUser.phone,
        grade: targetUser.grade || 'first',
        date: targetDate,
        dateFormatted: targetDateFormatted,
        time: recordedTime,
        type: 'manual_by_servant',
        status: 'حاضر',
        servantName: user.fullName || 'الخادم المسؤول',
        pointsAwarded: pointsAwarded,
        punctualityStatus: punctualityStatus,
        createdAt: serverTimestamp()
      });

      // Update user points in users collection
      const userRef = doc(db, 'users', targetUser.id);
      await updateDoc(userRef, {
        points: (targetUser.points || 0) + pointsAwarded
      });

      // Send in-app notification to the student
      await addDoc(collection(db, 'notifications'), {
        targetUserId: targetUser.id,
        title: 'تسجيل حضور يدوي في الخدمة ✓',
        desc: `قام الخادم (${user.fullName || 'المسؤول'}) بتسجيل حضورك يدوياً لتاريخ (${targetDate}) وتمت إضافة ${pointsAwarded} نقطة لرصيدك.`,
        time: 'الآن',
        createdAt: serverTimestamp()
      });

      setManualAttendSuccessId(targetUser.id);
      setTimeout(() => setManualAttendSuccessId(null), 3000);
      fetchAllUsers();
    } catch (err) {
      console.error('Error recording manual attendance:', err);
      alert('حدث خطأ أثناء تسجيل الحضور يدوياً.');
    } finally {
      setManualAttendLoadingId(null);
    }
  };

  // 1.2 Manual Absence (تسجيل غياب المخدوم مع دعم التاريخ المحدد)
  const handleManualAbsence = async (targetUser, customDate = null) => {
    setManualAbsenceLoadingId(targetUser.id);
    try {
      const todayDateOnly = new Date().toISOString().split('T')[0];
      const targetDate = customDate || todayDateOnly;
      const targetDateFormatted = targetDate === todayDateOnly ? todayStr : new Date(targetDate).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      // Record absence in Firestore
      await addDoc(collection(db, 'attendance'), {
        userId: targetUser.id,
        userName: targetUser.fullName,
        phone: targetUser.phone,
        grade: targetUser.grade || 'first',
        date: targetDate,
        dateFormatted: targetDateFormatted,
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        type: 'manual_absence_by_servant',
        status: 'غائب',
        servantName: user.fullName || 'الخادم المسؤول',
        pointsAwarded: 0,
        createdAt: serverTimestamp()
      });

      // Send in-app reminder / notification
      await addDoc(collection(db, 'notifications'), {
        targetUserId: targetUser.id,
        title: 'تم تسجيل غياب في الخدمة ⚠️',
        desc: `تم تسجيلك غائباً لتاريخ (${targetDate}) بواسطة الخادم (${user.fullName || 'المسؤول'}). نتمنى رؤيتك الجمعة القادمة ببركة ربنا!`,
        time: 'الآن',
        createdAt: serverTimestamp()
      });

      setManualAbsenceSuccessId(targetUser.id);
      setTimeout(() => setManualAbsenceSuccessId(null), 3000);
      fetchAllUsers();
    } catch (err) {
      console.error('Error recording manual absence:', err);
      alert('حدث خطأ أثناء تسجيل الغياب.');
    } finally {
      setManualAbsenceLoadingId(null);
    }
  };

  // 2. Open Registration / Remote Code Access (للجميع أو لشخص محدد مع إرسال إشعار فوري)
  const handleOpenCodeAccess = async () => {
    setRemoteAccessLoading(true);
    setRemoteAccessMessage('');
    try {
      const todayDateOnly = new Date().toISOString().split('T')[0];
      const expiryTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      if (remoteAccessTarget === 'all') {
        // Open for all students
        await setDoc(doc(db, 'service_settings', 'attendance_window'), {
          isOpenForAll: true,
          openedBy: user.fullName || 'أمين الخدمة',
          date: todayDateOnly,
          validUntil: expiryTime.toISOString(),
          activeCode: qrCodeData,
          activePin: numericPin,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Broadcast notification to ALL students
        await addDoc(collection(db, 'notifications'), {
          targetUserId: 'ALL',
          title: '📢 تم فتح تسجيل الحضور الآن لجميع المخدومين!',
          desc: `أتاح الخادم (${user.fullName || 'المسؤول'}) تسجيل الحضور بالكود (${numericPin}) لجميع المراحل. سارع بتسجيل حضورك الآن.`,
          time: 'الآن',
          createdAt: serverTimestamp()
        });

        setRemoteAccessMessage('تم فتح التسجيل لجميع المخدومين بنجاح وإرسال إشعار عام للكل! 📢');
      } else {
        // Open for specific student
        if (!selectedStudentForAccess) {
          alert('يرجى اختيار مخدوم أولاً من القائمة');
          setRemoteAccessLoading(false);
          return;
        }

        const targetSt = allUsers.find(u => u.id === selectedStudentForAccess);
        const stName = targetSt ? targetSt.fullName : 'المخدوم';

        await setDoc(doc(db, 'remote_access', selectedStudentForAccess), {
          studentId: selectedStudentForAccess,
          studentName: stName,
          isOpen: true,
          openedBy: user.fullName || 'الخادم المسؤول',
          date: todayDateOnly,
          validUntil: expiryTime.toISOString(),
          activeCode: qrCodeData,
          activePin: numericPin,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Send direct notification to this student
        await addDoc(collection(db, 'notifications'), {
          targetUserId: selectedStudentForAccess,
          title: '🎯 تم فتح تسجيل الحضور الاستثنائي لحسابك!',
          desc: `أتاح لك الخادم (${user.fullName || 'المسؤول'}) إمكانية تسجيل الحضور بالكود استثنائياً الآن. كود الحضور الرقمي هو: (${numericPin}). افتح صفحة الحضور للتسجيل فوراً.`,
          time: 'الآن',
          createdAt: serverTimestamp()
        });

        setRemoteAccessMessage(`تم فتح التسجيل الاستثنائي وإرسال إشعار مباشر لـ (${stName}) بنجاح! 🎯`);
      }

      setTimeout(() => setRemoteAccessMessage(''), 5000);
    } catch (err) {
      console.error('Error opening code access:', err);
      alert('حدث خطأ أثناء فتح التسجيل بالكود.');
    } finally {
      setRemoteAccessLoading(false);
    }
  };

  // Curriculum Target: 'students' (مناهج ومراجع المخدومين) | 'servants' (مناهج ومراجع الخدام)
  const [curriculumTarget, setCurriculumTarget] = useState('students');

  // Servant Spiritual Diary State & Analytics
  const todayDateStr = new Date().toISOString().split('T')[0];
  const yesterdayDateStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const currentMonthStr = todayDateStr.substring(0, 7); // e.g. "2026-09"
  const [selectedDiaryDate, setSelectedDiaryDate] = useState(todayDateStr);
  const [spiritualDiaryTab, setSpiritualDiaryTab] = useState('my_diary'); // 'my_diary' | 'students_tracking'
  const [myDiarySubTab, setMyDiarySubTab] = useState('entry'); // 'entry' | 'history'
  const [selectedDiaryMonth, setSelectedDiaryMonth] = useState(currentMonthStr);
  const [studentTrackingGrade, setStudentTrackingGrade] = useState('first');
  const [studentTrackingMonth, setStudentTrackingMonth] = useState(currentMonthStr);
  const [studentsDiariesList, setStudentsDiariesList] = useState([]);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);
  const [student360Profile, setStudent360Profile] = useState(null);

  const [servantDiary, setServantDiary] = useState({
    [todayDateStr]: {
      baker: false,
      ghoroub: false,
      nowm: false,
      bible: false,
      lessonPrep: false,
      visitation: false,
      communion: false,
      confession: false,
      spiritualBook: false,
      notes: ''
    }
  });

  // Sync servant's personal spiritual diary from Firestore
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
      setServantDiary(prev => ({ ...prev, ...records }));
    }, (err) => console.error('Error fetching servant spiritual diary:', err));

    return () => unsub();
  }, [user?.id]);

  // Sync students' spiritual diaries for pastoral care and tracking
  useEffect(() => {
    const q = query(
      collection(db, 'spiritual_diaries'),
      where('userRole', '==', 'student'),
      where('month', '==', studentTrackingMonth)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setStudentsDiariesList(list);
    }, (err) => console.error('Error fetching students spiritual diaries:', err));

    return () => unsub();
  }, [studentTrackingMonth]);

  // Sync all servants' spiritual diaries ONLY for Servant Leaders and Admin
  const [servantsDiariesList, setServantsDiariesList] = useState([]);
  useEffect(() => {
    if (!isServantLeader) {
      setServantsDiariesList([]);
      return;
    }
    const q = query(
      collection(db, 'spiritual_diaries'),
      where('userRole', 'in', ['servant', 'servant_leader']),
      where('month', '==', studentTrackingMonth)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setServantsDiariesList(list);
    }, (err) => console.error('Error fetching servants spiritual diaries:', err));

    return () => unsub();
  }, [isServantLeader, studentTrackingMonth]);

  const handleToggleServantDiaryItem = async (key) => {
    const dayData = servantDiary[selectedDiaryDate] || {
      baker: false,
      ghoroub: false,
      nowm: false,
      bible: false,
      lessonPrep: false,
      visitation: false,
      communion: false,
      confession: false,
      spiritualBook: false,
      notes: ''
    };
    const nextVal = !dayData[key];
    const updatedDay = {
      ...dayData,
      [key]: nextVal,
      userId: user.id,
      userName: user.fullName || 'الخادم',
      userRole: 'servant',
      grade: user.servantScope || 'all',
      date: selectedDiaryDate,
      month: selectedDiaryDate.substring(0, 7),
      year: new Date(selectedDiaryDate).getFullYear()
    };

    setServantDiary(prev => ({
      ...prev,
      [selectedDiaryDate]: updatedDay
    }));

    try {
      const docId = `${user.id}_${selectedDiaryDate}`;
      await setDoc(doc(db, 'spiritual_diaries', docId), {
        ...updatedDay,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error('Error saving servant diary to Firestore:', err);
    }
  };

  const handleServantDiaryNoteChange = async (text) => {
    const dayData = servantDiary[selectedDiaryDate] || {};
    const updatedDay = {
      ...dayData,
      notes: text,
      userId: user.id,
      userName: user.fullName || 'الخادم',
      userRole: 'servant',
      grade: user.servantScope || 'all',
      date: selectedDiaryDate,
      month: selectedDiaryDate.substring(0, 7),
      year: new Date(selectedDiaryDate).getFullYear()
    };

    setServantDiary(prev => ({
      ...prev,
      [selectedDiaryDate]: updatedDay
    }));

    try {
      const docId = `${user.id}_${selectedDiaryDate}`;
      await setDoc(doc(db, 'spiritual_diaries', docId), {
        ...updatedDay,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error('Error saving servant diary note to Firestore:', err);
    }
  };

  // Subjects Managed by Grade - Real-time sync with Firestore `service_curriculum`
  const [subjectsByGrade, setSubjectsByGrade] = useState({
    first: [],
    second: [],
    third: [],
    elisha: []
  });

  const [activeSubject, setActiveSubject] = useState(null);

  // Forms for Subjects & Materials
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectTeacher, setNewSubjectTeacher] = useState('');
  const [showAddRefModal, setShowAddRefModal] = useState(false);
  const [newRefTitle, setNewRefTitle] = useState('');
  const [newRefType, setNewRefType] = useState('pdf'); // 'pdf' | 'video' | 'audio'
  const [newRefUrl, setNewRefUrl] = useState('');
  const [refSaving, setRefSaving] = useState(false);
  const [selectedUploadFile, setSelectedUploadFile] = useState(null);
  const [uploadStatusText, setUploadStatusText] = useState('');

  // Question Bank & Exams State
  const [examSubSection, setExamSubSection] = useState('bank'); // 'bank' | 'assign'
  const [questionBank, setQuestionBank] = useState([
    {
      id: 'qb-1',
      subject: 'عقيدة',
      grade: 'first',
      type: 'mcq',
      difficulty: 'medium',
      questionText: 'ما هو سر التجسد الإلهي وأهميته في خلاص البشرية؟',
      options: ['اتحاد اللاهوت بالناسوت بغير اختلاط ولا امتزاج', 'ظهور رمزي مؤقت', 'حلول مجازي'],
      correctAnswer: 'اتحاد اللاهوت بالناسوت بغير اختلاط ولا امتزاج',
      points: 5
    },
    {
      id: 'qb-2',
      subject: 'تاريخ كنيسة',
      grade: 'first',
      type: 'true_false',
      difficulty: 'easy',
      questionText: 'انعقد مجمع نيقية المسكوني الأول عام 325 ميلادية لمقاومة بدعة أريوس.',
      options: ['صح', 'خطأ'],
      correctAnswer: 'صح',
      points: 5
    },
    {
      id: 'qb-3',
      subject: 'طقس',
      grade: 'elisha',
      type: 'mcq',
      difficulty: 'medium',
      questionText: 'ما هي رتبة الشماس الكامل المسئول عن خدمة المذبح والشعب؟',
      options: ['الدياكون', 'الأرشيدياكون', 'الإبصالتيس'],
      correctAnswer: 'الدياكون',
      points: 5
    }
  ]);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    subject: '',
    type: 'mcq',
    difficulty: 'medium',
    questionText: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    points: 5
  });

  const [createdExams, setCreatedExams] = useState([
    {
      id: 'ex-1',
      title: 'امتحان أعمال شهر أكتوبر (عقيدة وطقس)',
      subject: 'عقيدة',
      grade: 'first',
      durationMinutes: 20,
      totalScore: 30,
      questionsCount: 3,
      status: 'active'
    }
  ]);
  const [showCreateExamModal, setShowCreateExamModal] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamSubject, setNewExamSubject] = useState('');
  const [newExamDuration, setNewExamDuration] = useState('20');

  // Student Evaluation & Servant Comments State
  const [studentComments, setStudentComments] = useState({});
  const [savedCommentId, setSavedCommentId] = useState(null);

  const handleCommentChange = (studentId, val) => {
    setStudentComments(prev => ({ ...prev, [studentId]: val }));
  };

  const handleSaveComment = async (studentId) => {
    setSavedCommentId(studentId);
    try {
      const commentText = studentComments[studentId] || '';
      await updateDoc(doc(db, 'users', studentId), {
        comment: commentText,
        commentUpdatedAt: serverTimestamp()
      });
      setTimeout(() => setSavedCommentId(null), 2000);
    } catch (err) {
      console.error('Error saving comment:', err);
      setTimeout(() => setSavedCommentId(null), 2000);
    }
  };

  const studentsByGrade = React.useMemo(() => {
    const grouped = { first: [], second: [], third: [], elisha: [] };
    const students = (allUsers || []).filter(u => u.role === 'student');
    students.forEach(st => {
      const g = st.grade || 'first';
      if (!grouped[g]) grouped[g] = [];
      const attendanceRate = typeof st.attendanceRate === 'number' ? st.attendanceRate : 85;
      const examScore = typeof st.examScore === 'number' ? st.examScore : 25;
      grouped[g].push({
        ...st,
        points: st.points || 0,
        attendanceRate,
        examScore,
        isRedFlag: st.isRedFlag !== undefined ? st.isRedFlag : (attendanceRate < 60),
        comment: studentComments[st.id] !== undefined ? studentComments[st.id] : (st.comment || '')
      });
    });
    return grouped;
  }, [allUsers, studentComments]);

  // Sync questions and exams from Firestore if available
  useEffect(() => {
    const unsubQ = onSnapshot(collection(db, 'service_questions'), (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setQuestionBank(list);
      }
    }, (err) => console.log('Questions fetch info:', err));

    const unsubEx = onSnapshot(collection(db, 'service_exams'), (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCreatedExams(list);
      }
    }, (err) => console.log('Exams fetch info:', err));

    return () => {
      unsubQ();
      unsubEx();
    };
  }, []);

  // Sync service_curriculum collection from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'service_curriculum'), (snapshot) => {
      const grouped = { first: [], second: [], third: [], elisha: [] };
      snapshot.forEach(docSnap => {
        const data = { id: docSnap.id, ...docSnap.data() };
        const g = data.grade || 'first';
        if (grouped[g]) {
          grouped[g].push(data);
        }
      });
      setSubjectsByGrade(grouped);

      // If viewing an active subject, update its live data
      if (activeSubject) {
        const found = snapshot.docs.find(d => d.id === activeSubject.id);
        if (found) {
          setActiveSubject({ id: found.id, ...found.data() });
        }
      }
    }, (err) => {
      console.error('Error fetching service_curriculum:', err);
    });

    return () => unsub();
  }, [activeSubject?.id]);

  // Handlers for Add Question & Subject
  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    try {
      const docRef = await addDoc(collection(db, 'service_curriculum'), {
        grade: selectedGrade,
        name: newSubjectName.trim(),
        teacher: newSubjectTeacher.trim() || user.fullName || 'خادم المادة',
        targetAudience: curriculumTarget, // 'students' | 'servants'
        references: [],
        createdAt: serverTimestamp()
      });

      setNewSubjectName('');
      setNewSubjectTeacher('');
      setShowAddSubjectModal(false);
    } catch (err) {
      console.error('Error adding subject:', err);
      // Local fallback
      const newSub = {
        id: `sub-${Date.now()}`,
        grade: selectedGrade,
        name: newSubjectName.trim(),
        teacher: newSubjectTeacher.trim() || user.fullName || 'خادم المادة',
        targetAudience: curriculumTarget,
        references: []
      };
      setSubjectsByGrade(prev => ({
        ...prev,
        [selectedGrade]: [...(prev[selectedGrade] || []), newSub]
      }));
      setNewSubjectName('');
      setNewSubjectTeacher('');
      setShowAddSubjectModal(false);
    }
  };

  const handleDeleteSubject = async (subId, e) => {
    e?.stopPropagation();
    if (!window.confirm('هل أنت متأكد من حذف هذه المادة وجميع مراجعها؟')) return;
    try {
      await deleteDoc(doc(db, 'service_curriculum', subId));
      if (activeSubject?.id === subId) setActiveSubject(null);
    } catch (err) {
      console.error('Error deleting subject:', err);
      setSubjectsByGrade(prev => ({
        ...prev,
        [selectedGrade]: (prev[selectedGrade] || []).filter(s => s.id !== subId)
      }));
      if (activeSubject?.id === subId) setActiveSubject(null);
    }
  };

  // Detect file type from filename or MIME type
  const detectFileType = (file) => {
    if (!file) return 'file';
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx', 'rtf', 'txt', 'odt'].includes(ext)) return 'doc';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel';
    if (['ppt', 'pptx'].includes(ext)) return 'ppt';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
    if (['mp3', 'wav', 'm4a', 'aac', 'ogg', 'wma'].includes(ext) || file.type.startsWith('audio/')) return 'audio';
    if (['mp4', 'mov', 'avi', 'mkv'].includes(ext) || file.type.startsWith('video/')) return 'video';
    return 'file';
  };

  // Helper to extract Drive / YouTube IDs
  const parseResourceLink = (url, type) => {
    if (!url) return { url: '', fileId: null, videoId: null };
    const cleanUrl = url.trim();

    if (type !== 'video') {
      const driveMatch = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      const fileId = driveMatch ? driveMatch[1] : null;
      return { url: cleanUrl, fileId, videoId: null };
    }

    if (type === 'video') {
      const ytMatch = cleanUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
      const videoId = ytMatch ? ytMatch[1] : null;
      return { url: cleanUrl, fileId: null, videoId };
    }

    return { url: cleanUrl, fileId: null, videoId: null };
  };

  const handleAddReference = async (e) => {
    e.preventDefault();
    if (!newRefTitle.trim() || !activeSubject) return;

    setRefSaving(true);
    let finalUrl = newRefUrl.trim();
    let finalFileId = null;

    try {
      if (newRefType !== 'video' && selectedUploadFile) {
        setUploadStatusText('جاري تجهيز الملف للرفع...');
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result;
            const base64 = typeof result === 'string' && result.includes(',') ? result.split(',')[1] : result;
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(selectedUploadFile);
        });

        setUploadStatusText('جاري الرفع السحابي إلى Google Drive...');
        const driveEndpoint = 'https://script.google.com/macros/s/AKfycbxhdl_hk5vB7NLLL7zdPmVXlwvAOiZYVLsrk5T73UdJpJJM9JpU74p0DexpSch7gI4I/exec';
        const response = await fetch(driveEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            fileName: selectedUploadFile.name,
            mimeType: selectedUploadFile.type || 'application/octet-stream',
            base64Data: base64Data,
            base64: base64Data
          })
        });

        const resData = await response.json();
        if (resData.status === 'success') {
          finalUrl = resData.fileUrl || resData.url || resData.downloadUrl;
          finalFileId = resData.fileId;
        } else {
          throw new Error(resData.message || 'تعذر استكمال الرفع إلى Google Drive');
        }
      }
    } catch (uploadErr) {
      console.error('Drive upload error:', uploadErr);
      if (!finalUrl) {
        alert('تنبيه: حدث خطأ أثناء رفع الملف إلى Google Drive: ' + (uploadErr.message || 'يرجى مراجعة صلاحيات السكربت أو تجربة رابط مباشر.'));
        setRefSaving(false);
        setUploadStatusText('');
        return;
      }
    }

    setUploadStatusText('جاري حفظ بيانات المحتوى في المادة...');
    const detectedType = selectedUploadFile ? detectFileType(selectedUploadFile) : newRefType;
    const parsed = parseResourceLink(finalUrl, detectedType);

    const newRef = {
      id: `rf-${Date.now()}`,
      title: newRefTitle.trim(),
      type: detectedType, // 'pdf' | 'doc' | 'excel' | 'ppt' | 'image' | 'audio' | 'video' | 'file'
      fileType: detectedType,
      fileName: selectedUploadFile?.name || '',
      url: finalUrl,
      fileId: finalFileId || parsed.fileId,
      videoId: parsed.videoId,
      date: new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }),
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      uploadedBy: user.fullName || user.phone || 'الخادم المسؤول',
      uploadedByRole: user.role || 'servant',
      targetAudience: curriculumTarget,
      isPublishedForStudents: true // متاح افتراضياً مع إمكانية التفعيل والإلغاء
    };

    const updatedRefs = [newRef, ...(activeSubject.references || [])];

    try {
      await updateDoc(doc(db, 'service_curriculum', activeSubject.id), {
        references: updatedRefs
      });
      setActiveSubject({ ...activeSubject, references: updatedRefs });
    } catch (err) {
      console.error('Error adding reference:', err);
      // Local fallback
      setActiveSubject({ ...activeSubject, references: updatedRefs });
      setSubjectsByGrade(prev => {
        const currentList = prev[selectedGrade] || [];
        const updatedList = currentList.map(s => s.id === activeSubject.id ? { ...s, references: updatedRefs } : s);
        return { ...prev, [selectedGrade]: updatedList };
      });
    } finally {
      setRefSaving(false);
      setUploadStatusText('');
      setNewRefTitle('');
      setNewRefUrl('');
      setSelectedUploadFile(null);
      setShowAddRefModal(false);
    }
  };

  // Toggle reference visibility for students (تفعيل أو إلغاء إتاحة المحتوى للطلبة)
  const handleToggleRefVisibility = async (refId) => {
    if (!activeSubject) return;
    const currentRefs = activeSubject.references || [];
    const targetRef = currentRefs.find(r => r.id === refId);
    if (!targetRef) return;

    const newStatus = targetRef.isPublishedForStudents === false ? true : false;
    const updatedRefs = currentRefs.map(r => 
      r.id === refId ? { ...r, isPublishedForStudents: newStatus } : r
    );

    try {
      await updateDoc(doc(db, 'service_curriculum', activeSubject.id), {
        references: updatedRefs
      });
      setActiveSubject({ ...activeSubject, references: updatedRefs });
    } catch (err) {
      console.error('Error toggling reference visibility:', err);
      setActiveSubject({ ...activeSubject, references: updatedRefs });
    }
  };

  const handleDeleteReference = async (refId) => {
    if (!activeSubject) return;
    if (!window.confirm('هل أنت متأكد من حذف هذا المرجع؟')) return;

    const updatedRefs = (activeSubject.references || []).filter(r => r.id !== refId);
    try {
      await updateDoc(doc(db, 'service_curriculum', activeSubject.id), {
        references: updatedRefs
      });
      setActiveSubject({ ...activeSubject, references: updatedRefs });
    } catch (err) {
      console.error('Error deleting reference:', err);
      setActiveSubject({ ...activeSubject, references: updatedRefs });
    }
  };

  const handleAddQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!newQuestion.questionText.trim()) return;

    const qItem = {
      subject: newQuestion.subject || (currentGradeSubjects[0]?.name || 'عام'),
      grade: selectedGrade,
      type: newQuestion.type,
      difficulty: newQuestion.difficulty,
      questionText: newQuestion.questionText,
      options: newQuestion.type === 'mcq' ? newQuestion.options.filter(Boolean) : (newQuestion.type === 'true_false' ? ['صح', 'خطأ'] : null),
      correctAnswer: newQuestion.type === 'true_false' ? (newQuestion.correctAnswer || 'صح') : (newQuestion.correctAnswer || newQuestion.options[0]),
      points: Number(newQuestion.points) || 5
    };

    try {
      const docRef = await addDoc(collection(db, 'service_questions'), {
        ...qItem,
        createdAt: serverTimestamp()
      });
      setQuestionBank(prev => [{ id: docRef.id, ...qItem }, ...prev]);
    } catch (err) {
      console.error('Error saving question:', err);
      setQuestionBank(prev => [{ id: `qb-${Date.now()}`, ...qItem }, ...prev]);
    }

    setNewQuestion({
      subject: '',
      type: 'mcq',
      difficulty: 'medium',
      questionText: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      points: 5
    });
    setShowAddQuestionModal(false);
  };

  const handleCreateExamSubmit = async (e) => {
    e.preventDefault();
    if (!newExamTitle.trim()) return;

    const examItem = {
      title: newExamTitle.trim(),
      subject: newExamSubject || (currentGradeSubjects[0]?.name || 'عام'),
      grade: selectedGrade,
      durationMinutes: Number(newExamDuration) || 20,
      totalScore: 30,
      questionsCount: (questionBank || []).filter(q => q.grade === selectedGrade).length || 3,
      status: 'active'
    };

    try {
      const docRef = await addDoc(collection(db, 'service_exams'), {
        ...examItem,
        createdAt: serverTimestamp()
      });
      setCreatedExams(prev => [{ id: docRef.id, ...examItem }, ...prev]);
    } catch (err) {
      console.error('Error saving exam:', err);
      setCreatedExams(prev => [{ id: `ex-${Date.now()}`, ...examItem }, ...prev]);
    }

    setNewExamTitle('');
    setShowCreateExamModal(false);
  };

  const getGradeTitle = (g) => {
    const titles = {
      first: 'سنة أولى',
      second: 'سنة ثانية',
      third: 'سنة ثالثة',
      elisha: 'فصل أليشع (إعداد خدام)',
      cycle_1: 'منهج المرحلة الأولى',
      cycle_2: 'منهج المرحلة الثانية'
    };
    return titles[g] || g;
  };

  const allCurrentGradeSubjects = subjectsByGrade[selectedGrade] || [];
  const currentGradeSubjects = allCurrentGradeSubjects.filter(sub => (sub.targetAudience || 'students') === curriculumTarget);
  const currentGradeQuestions = (questionBank || []).filter(q => q.grade === selectedGrade);
  const currentGradeStudents = (studentsByGrade && studentsByGrade[selectedGrade]) || [];

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

  // Analytics Calculations
  const totalStudents = currentGradeStudents.length;
  const avgAttendance = totalStudents ? Math.round(currentGradeStudents.reduce((acc, s) => acc + s.attendanceRate, 0) / totalStudents) : 0;
  const avgScore = totalStudents ? Math.round(currentGradeStudents.reduce((acc, s) => acc + s.examScore, 0) / totalStudents) : 0;
  const redFlagsCount = currentGradeStudents.filter(s => s.isRedFlag).length;
  
  // Sorted Top Students (Honor Roll)
  const topStudents = [...currentGradeStudents].sort((a, b) => b.points - a.points).slice(0, 3);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12 text-right">
      {/* Servant Profile Card (Clickable to open user account & profile modal) */}
      <div 
        onClick={() => setShowProfileModal(true)}
        className="bg-white border border-slate-200 rounded-3xl p-3.5 sm:p-5 shadow-sm flex items-center justify-between gap-3 cursor-pointer group hover:bg-slate-50/80 transition-all"
        title="اضغط لعرض وتعديل بيانات الحساب أو تسجيل الخروج"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar with click to enlarge */}
          <div 
            onClick={(e) => {
              if (user.photoUrl) {
                e.stopPropagation();
                setPreviewPhotoModal({ url: user.photoUrl, title: user.fullName });
              }
            }}
            className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-maroon-800 text-white flex items-center justify-center font-bold text-lg sm:text-xl shrink-0 shadow-xs group-hover:scale-105 transition-transform overflow-hidden relative"
            title={user.photoUrl ? "اضغط لتكبير الصورة الشخصية" : ""}
          >
            {user.photoUrl ? (
              <img src={user.photoUrl} alt={user.fullName} className="w-full h-full object-cover" />
            ) : (
              <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-gold-300" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-maroon-800 transition-colors truncate">
                {user.gender === 'female' 
                  ? `أهلاً تاسوني ${user.fullName || ''}` 
                  : isServantLeader && !isAppAdmin 
                  ? `أهلاً أمين الخدمة ${user.fullName || ''}`
                  : `أهلاً أستاذ ${user.fullName || ''}`}
              </h2>
              <span className="text-[10px] bg-amber-50 group-hover:bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full font-bold transition-colors shrink-0">
                بياناتي ⚙️
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
              <span className="bg-maroon-50 text-maroon-900 border border-maroon-200 font-bold px-2 py-0.5 rounded-full text-[10px]">
                {isAppAdmin ? 'مشرف التطبيق 👑' : 'لوحة الخدام'}
              </span>
              <span className="text-[11px] truncate">
                الصفة: {isAppAdmin ? 'مشرف التطبيق' : 'خادم عام (كافة المراحل)'}
              </span>
            </div>
          </div>
        </div>

        <div className="text-slate-400 group-hover:text-maroon-800 transition-colors shrink-0">
          <ChevronLeft className="w-5 h-5" />
        </div>
      </div>

      {/* Slide-Over Navigation Drawer (Overlay & Drawer for both Desktop & Mobile) */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden font-cairo">
          {/* Backdrop Blur Overlay */}
          <div 
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-300"
          />

          {/* Drawer Slide-in from Right (RTL) */}
          <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-white shadow-2xl z-50 flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-250">
            {/* Drawer Header */}
              {/* Drawer Header (Compact & Clean) */}
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-maroon-900 text-gold-300 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-black text-slate-800">أقسام الخدمة</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
                  title="إغلاق القائمة"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Items (Unified Clean Styling) */}
              <nav className="p-2.5 space-y-1 overflow-y-auto max-h-[calc(100vh-70px)]">
                {/* 1. Attendance QR Code (Priority #1 on Fridays) */}
                <button
                  type="button"
                  onClick={() => {
                    setMainTab('attendance_qr');
                    setActiveSubject(null);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full text-right py-2 px-3 rounded-xl flex items-center gap-2.5 text-xs font-bold transition-all cursor-pointer ${
                    mainTab === 'attendance_qr'
                      ? 'bg-maroon-800 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <QrCode className={`w-4 h-4 ${mainTab === 'attendance_qr' ? 'text-gold-300' : 'text-maroon-800'}`} />
                  <span>كود الحضور (QR)</span>
                </button>

                {/* 2. Manual Attendance */}
                <button
                  type="button"
                  onClick={() => {
                    setMainTab('manual_attendance');
                    setActiveSubject(null);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full text-right py-2 px-3 rounded-xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                    mainTab === 'manual_attendance'
                      ? 'bg-maroon-800 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <UserCheck className={`w-4 h-4 ${mainTab === 'manual_attendance' ? 'text-gold-300' : 'text-emerald-700'}`} />
                    <span>تسجيل حضور يدوي</span>
                  </div>
                </button>

                {/* 3. Students Data Hub */}
                <button
                  type="button"
                  onClick={() => {
                    setMainTab('students_hub');
                    setActiveSubject(null);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full text-right py-2 px-3 rounded-xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                    mainTab === 'students_hub'
                      ? 'bg-maroon-800 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className={`w-4 h-4 ${mainTab === 'students_hub' ? 'text-gold-300' : 'text-slate-500'}`} />
                    <span>بيانات ومتابعة المخدومين</span>
                  </div>
                  <span className={`text-[10px] min-w-5 text-center px-1.5 py-0.2 rounded-md font-bold ${
                    mainTab === 'students_hub' ? 'bg-gold-400 text-maroon-950' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {(allUsers || []).filter(u => u.role === 'student').length}
                  </span>
                </button>

                {/* 4. Students Spiritual Tracking */}
                <button
                  type="button"
                  onClick={() => {
                    setMainTab('spiritual_diary');
                    setSpiritualDiaryTab('students_tracking');
                    setActiveSubject(null);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full text-right py-2 px-3 rounded-xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                    mainTab === 'spiritual_diary' && spiritualDiaryTab === 'students_tracking'
                      ? 'bg-maroon-800 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sun className={`w-4 h-4 ${mainTab === 'spiritual_diary' && spiritualDiaryTab === 'students_tracking' ? 'text-gold-300' : 'text-amber-500'}`} />
                    <span>متابعة النوتة الروحية للمخدومين</span>
                  </div>
                </button>

                {/* 4.1 Birthdays Hub (Servants & Students) */}
                <button
                  type="button"
                  onClick={() => {
                    setMainTab('birthdays_hub');
                    setActiveSubject(null);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full text-right py-2 px-3 rounded-xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                    mainTab === 'birthdays_hub'
                      ? 'bg-amber-700 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-amber-50 hover:text-amber-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Cake className={`w-4 h-4 ${mainTab === 'birthdays_hub' ? 'text-gold-200' : 'text-amber-600'}`} />
                    <span>أعياد الميلاد القادمة 🎂</span>
                  </div>
                </button>

                {/* Divider */}
                <div className="my-1 border-t border-slate-100" />

                {/* 5. Question Bank & Exams */}
                <button
                  type="button"
                  onClick={() => {
                    setMainTab('exams_bank_hub');
                    setActiveSubject(null);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full text-right py-2 px-3 rounded-xl flex items-center gap-2.5 text-xs font-bold transition-all cursor-pointer ${
                    mainTab === 'exams_bank_hub'
                      ? 'bg-maroon-800 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <FileText className={`w-4 h-4 ${mainTab === 'exams_bank_hub' ? 'text-gold-300' : 'text-slate-500'}`} />
                  <span>بنك الأسئلة والامتحانات</span>
                </button>

                {/* 6. Subjects & Curriculum for Students */}
                <button
                  type="button"
                  onClick={() => {
                    setMainTab('subjects_hub');
                    setCurriculumTarget('students');
                    setActiveSubject(null);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full text-right py-2 px-3 rounded-xl flex items-center gap-2.5 text-xs font-bold transition-all cursor-pointer ${
                    mainTab === 'subjects_hub' && curriculumTarget === 'students'
                      ? 'bg-maroon-800 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className={`w-4 h-4 ${mainTab === 'subjects_hub' && curriculumTarget === 'students' ? 'text-gold-300' : 'text-slate-500'}`} />
                  <span>مناهج ومراجع المخدومين</span>
                </button>

                {/* 7. Subjects & Curriculum for Servants */}
                <button
                  type="button"
                  onClick={() => {
                    setMainTab('subjects_hub');
                    setCurriculumTarget('servants');
                    setActiveSubject(null);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full text-right py-2 px-3 rounded-xl flex items-center gap-2.5 text-xs font-bold transition-all cursor-pointer ${
                    mainTab === 'subjects_hub' && curriculumTarget === 'servants'
                      ? 'bg-maroon-800 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className={`w-4 h-4 ${mainTab === 'subjects_hub' && curriculumTarget === 'servants' ? 'text-gold-300' : 'text-maroon-700'}`} />
                  <span>مناهج ومراجع الخدام</span>
                </button>

                {/* 8. Regulations */}
                <button
                  type="button"
                  onClick={() => {
                    setShowRegulationsModal(true);
                    setMobileSidebarOpen(false);
                  }}
                  className="w-full text-right py-2 px-3 rounded-xl flex items-center justify-between text-xs font-bold transition-all text-slate-700 hover:bg-slate-100 hover:text-maroon-900 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Award className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>لائحة درجات المرحلة 📋</span>
                  </div>
                </button>

                {/* 9. Analytics */}
                <button
                  type="button"
                  onClick={() => {
                    setMainTab('analytics_hub');
                    setActiveSubject(null);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full text-right py-2 px-3 rounded-xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                    mainTab === 'analytics_hub'
                      ? 'bg-maroon-800 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Award className={`w-4 h-4 ${mainTab === 'analytics_hub' ? 'text-gold-300' : 'text-slate-500'}`} />
                    <span>الإحصائيات والأوائل</span>
                  </div>
                  {redFlagsCount > 0 && (
                    <span className="w-2 h-2 bg-red-500 rounded-full inline-block animate-pulse"></span>
                  )}
                </button>

                {/* Divider */}
                <div className="my-1 border-t border-slate-100" />

                {/* 10. Servant Personal Spiritual Diary */}
                <button
                  type="button"
                  onClick={() => {
                    setMainTab('spiritual_diary');
                    setSpiritualDiaryTab('my_diary');
                    setActiveSubject(null);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full text-right py-2 px-3 rounded-xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                    mainTab === 'spiritual_diary' && spiritualDiaryTab === 'my_diary'
                      ? 'bg-maroon-800 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sun className={`w-4 h-4 ${mainTab === 'spiritual_diary' && spiritualDiaryTab === 'my_diary' ? 'text-gold-300' : 'text-amber-600'}`} />
                    <span>نوتتي الروحية كخادم</span>
                  </div>
                </button>

                {/* 11. Holidays & Cancelled Fridays (Admin & Servant Leader Only) */}
                {(isAppAdmin || isServantLeader) && (
                  <button
                    type="button"
                    onClick={() => {
                      setMainTab('holidays_manager');
                      setActiveSubject(null);
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full text-right py-2 px-3 rounded-xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                      mainTab === 'holidays_manager'
                        ? 'bg-rose-800 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-rose-50 hover:text-rose-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <CalendarOff className={`w-4 h-4 ${mainTab === 'holidays_manager' ? 'text-white' : 'text-rose-700'}`} />
                      <span>إجازات الخدمة والجمع المعفاة 🗓️</span>
                    </div>
                    {serviceHolidays.length > 0 && (
                      <span className={`text-[10px] min-w-5 text-center px-1.5 py-0.2 rounded-md font-bold ${
                        mainTab === 'holidays_manager' ? 'bg-white text-rose-950' : 'bg-rose-100 text-rose-900'
                      }`}>
                        {serviceHolidays.length}
                      </span>
                    )}
                  </button>
                )}

                {/* 12. App Admin only: Users & Roles */}
                {isAppAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setMainTab('users_hub');
                      setUserHubSubTab('accounts');
                      setActiveSubject(null);
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full text-right py-2 px-3 rounded-xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                      mainTab === 'users_hub' && userHubSubTab === 'accounts'
                        ? 'bg-maroon-800 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <UserCog className={`w-4 h-4 ${mainTab === 'users_hub' && userHubSubTab === 'accounts' ? 'text-gold-300' : 'text-slate-500'}`} />
                      <span>المستخدمين والأدوار</span>
                    </div>
                    {allUsers.length > 0 && (
                      <span className={`text-[10px] min-w-5 text-center px-1.5 py-0.2 rounded-md font-bold ${
                        mainTab === 'users_hub' && userHubSubTab === 'accounts' ? 'bg-gold-400 text-maroon-950' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {allUsers.length}
                      </span>
                    )}
                  </button>
                )}

                {/* 13. App Admin only: Activity & Login Log */}
                {isAppAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setMainTab('users_hub');
                      setUserHubSubTab('login_history');
                      fetchLoginLogs();
                      setActiveSubject(null);
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full text-right py-2 px-3 rounded-xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                      mainTab === 'users_hub' && userHubSubTab === 'login_history'
                        ? 'bg-maroon-800 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <History className={`w-4 h-4 ${mainTab === 'users_hub' && userHubSubTab === 'login_history' ? 'text-gold-300' : 'text-slate-500'}`} />
                      <span>سجل النشاط والدخول</span>
                    </div>
                    {loginLogs.length > 0 && (
                      <span className={`text-[10px] min-w-5 text-center px-1.5 py-0.2 rounded-md font-bold ${
                        mainTab === 'users_hub' && userHubSubTab === 'login_history' ? 'bg-gold-400 text-maroon-950' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {loginLogs.length}
                      </span>
                    )}
                  </button>
                )}

                {/* 14. App Admin only: Errors Hub */}
                {isAppAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setMainTab('errors_hub');
                      setActiveSubject(null);
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full text-right py-2 px-3 rounded-xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                      mainTab === 'errors_hub'
                        ? 'bg-rose-800 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-rose-50 hover:text-rose-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle className={`w-4 h-4 ${mainTab === 'errors_hub' ? 'text-white' : 'text-rose-600'}`} />
                      <span>بلاغات وأخطاء التطبيق</span>
                    </div>
                  </button>
                )}
              </nav>
            </div>
          </div>
        )}

      {/* Main Content Area (100% Full Width Real Estate) */}
      <main className="w-full space-y-6">

      {/* Direct Students Data Hub & 360° Profile */}
      {mainTab === 'students_hub' && (
        <ServantStudentsHub
          allUsers={allUsers}
          selectedGrade={selectedGrade}
          setSelectedGrade={setSelectedGrade}
          getGradeTitle={getGradeTitle}
          activeAcademicCycle={activeAcademicCycle}
          academicYear={academicYear}
          onSelectStudent={(st) => setStudent360Profile(st)}
        />
      )}

      {/* Birthdays Hub (Servants & Students) */}
      {mainTab === 'birthdays_hub' && (
        <ServantBirthdaysHub
          allUsers={allUsers}
          getGradeTitle={getGradeTitle}
          onSelectStudent={(st) => setStudent360Profile(st)}
        />
      )}

      {/* Direct Servant Manual Attendance with Custom Arrival Time (All Servants) */}
      {mainTab === 'manual_attendance' && (
        <ServantManualAttendance
          allUsers={allUsers}
          getGradeTitle={getGradeTitle}
          handleManualAttendanceWithTime={handleManualAttendance}
          handleManualAbsence={handleManualAbsence}
          manualAttendLoadingId={manualAttendLoadingId}
          manualAttendSuccessId={manualAttendSuccessId}
          manualAbsenceLoadingId={manualAbsenceLoadingId}
          manualAbsenceSuccessId={manualAbsenceSuccessId}
          todayStr={todayStr}
          onOpenHolidays={() => setMainTab('holidays_manager')}
        />
      )}

      {/* Holidays & Cancelled Fridays Manager (All Servants & Admins) */}
      {mainTab === 'holidays_manager' && (
        <ServantHolidaysManager
          serviceHolidays={serviceHolidays}
          handleAddHoliday={handleAddHoliday}
          handleRemoveHoliday={handleRemoveHoliday}
        />
      )}

      {/* 0. Users & Roles Management Hub (Admin Only: Admin Approvals & Activity Logs) */}
      {isAppAdmin && mainTab === 'users_hub' && (
        <ServantUsersHub
          user={user}
          userHubSubTab={userHubSubTab}
          setUserHubSubTab={setUserHubSubTab}
          allUsers={allUsers}
          loginLogs={loginLogs}
          userRoleFilter={userRoleFilter}
          setUserRoleFilter={setUserRoleFilter}
          fetchAllUsers={fetchAllUsers}
          fetchLoginLogs={fetchLoginLogs}
          usersLoading={usersLoading}
          logsLoading={logsLoading}
          getGradeTitle={getGradeTitle}
          handleManualAttendance={handleManualAttendance}
          manualAttendLoadingId={manualAttendLoadingId}
          manualAttendSuccessId={manualAttendSuccessId}
          handleManualAbsence={handleManualAbsence}
          manualAbsenceLoadingId={manualAbsenceLoadingId}
          manualAbsenceSuccessId={manualAbsenceSuccessId}
          handleUpdateUserRole={handleUpdateUserRole}
          roleUpdatingId={roleUpdatingId}
          onSelectStudent={(st) => setStudent360Profile(st)}
        />
      )}

      {/* 0.1 App Errors & Crash Reports Hub (Admin Only) */}
      {isAppAdmin && mainTab === 'errors_hub' && (
        <ServantErrorsHub />
      )}

      {/* 1. Subjects & Curriculum Management Hub */}
      {mainTab === 'subjects_hub' && (
        <ServantCurriculum
          user={user}
          selectedGrade={selectedGrade}
          setSelectedGrade={setSelectedGrade}
          getGradeTitle={getGradeTitle}
          curriculumTarget={curriculumTarget}
          setCurriculumTarget={setCurriculumTarget}
          activeSubject={activeSubject}
          setActiveSubject={setActiveSubject}
          subjectsByGrade={subjectsByGrade}
          setSubjectsByGrade={setSubjectsByGrade}
          activeAcademicCycle={activeAcademicCycle}
          academicYear={academicYear}
          handleUpdateAcademicCycle={handleUpdateAcademicCycle}
        />
      )}

      {/* 2. Question Bank & Exams Hub */}
      {mainTab === 'exams_bank_hub' && (
        <ServantExamsBank
          selectedGrade={selectedGrade}
          getGradeTitle={getGradeTitle}
          currentGradeSubjects={currentGradeSubjects}
          questionBank={questionBank}
          setQuestionBank={setQuestionBank}
          createdExams={createdExams}
          setCreatedExams={setCreatedExams}
          allUsers={allUsers}
          fetchAllUsers={fetchAllUsers}
        />
      )}

      {/* 3. Analytics, Honor Roll, Red Flags, & Servant Comments Hub */}
      {mainTab === 'analytics_hub' && (
        <ServantAnalytics
          selectedGrade={selectedGrade}
          getGradeTitle={getGradeTitle}
          currentGradeStudents={currentGradeStudents}
          totalStudents={totalStudents}
          avgAttendance={avgAttendance}
          avgScore={avgScore}
          redFlagsCount={redFlagsCount}
          topStudents={topStudents}
          studentComments={studentComments}
          handleCommentChange={handleCommentChange}
          handleSaveComment={handleSaveComment}
          savedCommentId={savedCommentId}
          onSelectStudent={(st) => setStudent360Profile(st)}
        />
      )}

      {/* 4. Tab: Attendance QR */}
      {mainTab === 'attendance_qr' && (
        <ServantAttendanceQR
          todayStr={todayStr}
          qrCodeData={qrCodeData}
          setQrCodeData={setQrCodeData}
          numericPin={numericPin}
          handleGenerateNewPin={handleGenerateNewPin}
          remoteAccessTarget={remoteAccessTarget}
          setRemoteAccessTarget={setRemoteAccessTarget}
          remoteAccessMessage={remoteAccessMessage}
          selectedStudentForAccess={selectedStudentForAccess}
          setSelectedStudentForAccess={setSelectedStudentForAccess}
          handleOpenCodeAccess={handleOpenCodeAccess}
          remoteAccessLoading={remoteAccessLoading}
          allUsers={allUsers}
          serviceStartTime={serviceStartTime}
          handleUpdateServiceStartTime={handleUpdateServiceStartTime}
          serviceHolidays={serviceHolidays}
          handleAddHoliday={handleAddHoliday}
          handleRemoveHoliday={handleRemoveHoliday}
        />
      )}

      {/* 5. Tab: Servant Spiritual Diary & Pastoral Tracking */}
      {mainTab === 'spiritual_diary' && (
        <ServantSpiritualDiary
          user={user}
          servantDiary={servantDiary}
          selectedDiaryDate={selectedDiaryDate}
          setSelectedDiaryDate={setSelectedDiaryDate}
          todayDateStr={todayDateStr}
          yesterdayDateStr={yesterdayDateStr}
          selectedDiaryMonth={selectedDiaryMonth}
          setSelectedDiaryMonth={setSelectedDiaryMonth}
          handleToggleServantDiaryItem={handleToggleServantDiaryItem}
          handleServantDiaryNoteChange={handleServantDiaryNoteChange}
          spiritualDiaryTab={spiritualDiaryTab}
          setSpiritualDiaryTab={setSpiritualDiaryTab}
          studentTrackingGrade={studentTrackingGrade}
          setStudentTrackingGrade={setStudentTrackingGrade}
          studentTrackingMonth={studentTrackingMonth}
          setStudentTrackingMonth={setStudentTrackingMonth}
          allUsers={allUsers}
          studentsDiariesList={studentsDiariesList}
          servantsDiariesList={servantsDiariesList}
          isServantLeader={isServantLeader}
          selectedStudentDetail={selectedStudentDetail}
          setSelectedStudentDetail={setSelectedStudentDetail}
          onSelectStudent={(st) => setStudent360Profile(st)}
        />
      )}

      {/* 6. Comprehensive Student 360° Profile Modal */}
      {student360Profile && (
        <StudentProfileModal
          student={student360Profile}
          getGradeTitle={getGradeTitle}
          onClose={() => setStudent360Profile(null)}
        />
      )}

      {/* 7. Official Multi-Stage Regulation Modal */}
      <StageRegulationsModal
        isOpen={showRegulationsModal}
        onClose={() => setShowRegulationsModal(false)}
        initialStage={selectedGrade || 'first'}
        isStudent={false}
        isAdmin={isAppAdmin}
      />

      {/* 8. User Account & Profile Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
        onLogout={onLogout}
        onUpdateUser={onUpdateUser}
      />

      {/* 9. Full-Screen Photo Lightbox Modal */}
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
      </main>
    </div>
  );
}
