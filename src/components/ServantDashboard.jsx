import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Users, QrCode, BookOpen, CheckCircle, Clock, 
  Printer, UserCheck, Search, Award, FileCheck, Edit3, Save, Check, 
  FileText, Plus, Download, UploadCloud, ChevronLeft, Trash2, FolderPlus,
  HelpCircle, Filter, Send, Layers, AlertCircle, MessageSquare, TrendingUp, Trophy, UserCog, RefreshCw,
  BellRing, Unlock, Lock, UserPlus, UserX, KeyRound, Copy, Sun, Sunset, Moon, Sparkles, Heart,
  History, Activity, Menu, X, Video, Music, ExternalLink,
  Eye, EyeOff, Calendar, ChevronRight, FileSpreadsheet, File, BarChart3, TrendingDown, Image as ImageIcon
} from 'lucide-react';
import { db } from '../firebase';
import ServantSpiritualDiary from './servant/ServantSpiritualDiary';
import { collection, getDocs, doc, updateDoc, setDoc, addDoc, deleteDoc, query, where, orderBy, serverTimestamp, limit, onSnapshot } from 'firebase/firestore';

export default function ServantDashboard({ user }) {
  // Check if current user is App Administrator (Nader Reda or church prep account)
  const isAppAdmin = user && (user.role === 'admin' || user.phone === '01275571569' || (user.email && (user.email.includes('nader.kamel') || user.email.includes('st.johnmaadiservantsprep@gmail.com'))));

  const [mainTab, setMainTab] = useState(isAppAdmin ? 'users_hub' : 'subjects_hub');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState('first');

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
      }
    });

    return () => unsubPin();
  }, [isAppAdmin]);

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

  // 1. Manual Attendance (لو نسي التليفون أو لتسجيله حاضراً)
  const handleManualAttendance = async (targetUser) => {
    setManualAttendLoadingId(targetUser.id);
    try {
      const todayDateOnly = new Date().toISOString().split('T')[0];
      // Record attendance in Firestore
      await addDoc(collection(db, 'attendance'), {
        userId: targetUser.id,
        userName: targetUser.fullName,
        phone: targetUser.phone,
        grade: targetUser.grade || 'first',
        date: todayDateOnly,
        dateFormatted: todayStr,
        time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        type: 'manual_by_servant',
        status: 'حاضر',
        servantName: user.fullName || 'الخادم المسؤول',
        pointsAwarded: 10,
        createdAt: serverTimestamp()
      });

      // Update user points in users collection
      const userRef = doc(db, 'users', targetUser.id);
      await updateDoc(userRef, {
        points: (targetUser.points || 0) + 10
      });

      // Send in-app notification to the student
      await addDoc(collection(db, 'notifications'), {
        targetUserId: targetUser.id,
        title: 'تسجيل حضور يدوي في الخدمة ✓',
        desc: `قام الخادم (${user.fullName || 'المسؤول'}) بتسجيل حضورك يدوياً لليوم وتمت إضافة 10 نقاط لرصيدك.`,
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

  // 1.2 Manual Absence (تسجيل غياب المخدوم)
  const handleManualAbsence = async (targetUser) => {
    setManualAbsenceLoadingId(targetUser.id);
    try {
      const todayDateOnly = new Date().toISOString().split('T')[0];
      // Record absence in Firestore
      await addDoc(collection(db, 'attendance'), {
        userId: targetUser.id,
        userName: targetUser.fullName,
        phone: targetUser.phone,
        grade: targetUser.grade || 'first',
        date: todayDateOnly,
        dateFormatted: todayStr,
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
        title: 'تم تسجيل غياب لخدمة اليوم ⚠️',
        desc: `تم تسجيلك غائباً لخدمة اليوم بواسطة الخادم (${user.fullName || 'المسؤول'}). نتمنى رؤيتك الجمعة القادمة ببركة ربنا!`,
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
      elisha: 'فصل أليشع (إعداد خدام)'
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
      {/* Servant Profile Card (Light Mode) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 w-full sm:w-auto">
          <div className="w-13 h-13 rounded-2xl bg-maroon-800 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-xs">
            <ShieldCheck className="w-7 h-7 text-gold-300" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">{user.fullName || 'أمين الخدمة'}</h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <span className="bg-maroon-50 text-maroon-900 border border-maroon-200 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                {(user.role === 'admin' || user.phone === '01275571569' || (user.email && user.email.includes('nader.kamel')))
                  ? 'مشرف التطبيق 👑'
                  : 'لوحة الخدام'}
              </span>
              <span>
                الصفة: {(user.role === 'admin' || user.phone === '01275571569' || (user.email && user.email.includes('nader.kamel')))
                  ? 'مشرف التطبيق'
                  : 'خادم عام (كافة المراحل)'}
              </span>
            </div>
          </div>
        </div>

        {/* Grade Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto overflow-x-auto">
          {['first', 'second', 'third', 'elisha'].map((g) => (
            <button
              key={g}
              onClick={() => { setSelectedGrade(g); setActiveSubject(null); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedGrade === g ? 'bg-white text-maroon-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {getGradeTitle(g)}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Top Navigation & Menu Trigger */}
      <div className="md:hidden flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-3 shadow-xs">
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(prev => !prev)}
          className="p-2 bg-maroon-800 text-white rounded-xl flex items-center gap-2 text-xs font-bold shadow-xs hover:bg-maroon-900 transition-colors"
        >
          <Menu className="w-4 h-4" />
          <span>القائمة وأقسام المنظومة</span>
        </button>

        <span className="text-xs font-bold text-maroon-950 bg-maroon-50 px-3 py-1.5 rounded-xl border border-maroon-100">
          {mainTab === 'users_hub' && userHubSubTab === 'accounts' && 'المستخدمين والأدوار'}
          {mainTab === 'users_hub' && userHubSubTab === 'login_history' && 'سجل النشاط والدخول'}
          {mainTab === 'subjects_hub' && (curriculumTarget === 'students' ? 'مناهج ومراجع المخدومين' : 'مناهج ومراجع الخدام 🔒')}
          {mainTab === 'exams_bank_hub' && 'بنك الأسئلة والامتحانات'}
          {mainTab === 'analytics_hub' && 'الإحصائيات والأوائل'}
          {mainTab === 'spiritual_diary' && 'النوتة الروحية ومتابعة المخدومين'}
          {mainTab === 'attendance_qr' && 'كود الحضور (QR)'}
        </span>
      </div>

      {/* Main Grid: Sidebar (Right in RTL) + Main Content (Left in RTL) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Sidebar Navigation */}
        <aside className={`
          md:col-span-3 bg-white border border-slate-200 rounded-3xl p-3 shadow-sm space-y-2
          ${mobileSidebarOpen ? 'block' : 'hidden md:block'}
        `}>
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">أقسام الخدمة واللوحة</span>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="space-y-1 pt-1">
            {/* 1. App Admin only: Users & Roles */}
            {isAppAdmin && (
              <button
                type="button"
                onClick={() => {
                  setMainTab('users_hub');
                  setUserHubSubTab('accounts');
                  setActiveSubject(null);
                  setMobileSidebarOpen(false);
                }}
                className={`w-full text-right py-2.5 px-3 rounded-2xl flex items-center justify-between text-xs font-bold transition-all ${
                  mainTab === 'users_hub' && userHubSubTab === 'accounts'
                    ? 'bg-maroon-800 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <UserCog className={`w-4 h-4 ${mainTab === 'users_hub' && userHubSubTab === 'accounts' ? 'text-gold-300' : 'text-maroon-700'}`} />
                  <span>المستخدمين والأدوار</span>
                </div>
                {allUsers.length > 0 && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    mainTab === 'users_hub' && userHubSubTab === 'accounts' ? 'bg-gold-400 text-maroon-950' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {allUsers.length}
                  </span>
                )}
              </button>
            )}

            {/* 2. App Admin only: Activity & Login Log */}
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
                className={`w-full text-right py-2.5 px-3 rounded-2xl flex items-center justify-between text-xs font-bold transition-all ${
                  mainTab === 'users_hub' && userHubSubTab === 'login_history'
                    ? 'bg-maroon-800 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <History className={`w-4 h-4 ${mainTab === 'users_hub' && userHubSubTab === 'login_history' ? 'text-gold-300' : 'text-amber-600'}`} />
                  <span>سجل النشاط والدخول</span>
                </div>
                {loginLogs.length > 0 && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    mainTab === 'users_hub' && userHubSubTab === 'login_history' ? 'bg-gold-400 text-maroon-950' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {loginLogs.length}
                  </span>
                )}
              </button>
            )}

            {/* 3. Subjects & Curriculum for Students */}
            <button
              type="button"
              onClick={() => {
                setMainTab('subjects_hub');
                setCurriculumTarget('students');
                setActiveSubject(null);
                setMobileSidebarOpen(false);
              }}
              className={`w-full text-right py-2.5 px-3 rounded-2xl flex items-center gap-2.5 text-xs font-bold transition-all ${
                mainTab === 'subjects_hub' && curriculumTarget === 'students'
                  ? 'bg-maroon-800 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <BookOpen className={`w-4 h-4 ${mainTab === 'subjects_hub' && curriculumTarget === 'students' ? 'text-gold-300' : 'text-slate-500'}`} />
              <span>مناهج ومراجع المخدومين</span>
            </button>

            {/* 3.1 Subjects & Curriculum for Servants */}
            <button
              type="button"
              onClick={() => {
                setMainTab('subjects_hub');
                setCurriculumTarget('servants');
                setActiveSubject(null);
                setMobileSidebarOpen(false);
              }}
              className={`w-full text-right py-2.5 px-3 rounded-2xl flex items-center justify-between text-xs font-bold transition-all ${
                mainTab === 'subjects_hub' && curriculumTarget === 'servants'
                  ? 'bg-maroon-800 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className={`w-4 h-4 ${mainTab === 'subjects_hub' && curriculumTarget === 'servants' ? 'text-gold-300' : 'text-maroon-700'}`} />
                <span>مناهج ومراجع الخدام</span>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                mainTab === 'subjects_hub' && curriculumTarget === 'servants' ? 'bg-gold-400 text-maroon-950' : 'bg-amber-100 text-amber-900'
              }`}>
                خاص 🔒
              </span>
            </button>

            {/* 4. Exam & Question Bank */}
            <button
              type="button"
              onClick={() => {
                setMainTab('exams_bank_hub');
                setActiveSubject(null);
                setMobileSidebarOpen(false);
              }}
              className={`w-full text-right py-2.5 px-3 rounded-2xl flex items-center gap-2.5 text-xs font-bold transition-all ${
                mainTab === 'exams_bank_hub'
                  ? 'bg-maroon-800 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <FileText className={`w-4 h-4 ${mainTab === 'exams_bank_hub' ? 'text-gold-300' : 'text-slate-500'}`} />
              <span>بنك الأسئلة والامتحانات</span>
            </button>

            {/* 5. Analytics & Top Students */}
            <button
              type="button"
              onClick={() => {
                setMainTab('analytics_hub');
                setActiveSubject(null);
                setMobileSidebarOpen(false);
              }}
              className={`w-full text-right py-2.5 px-3 rounded-2xl flex items-center justify-between text-xs font-bold transition-all ${
                mainTab === 'analytics_hub'
                  ? 'bg-maroon-800 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
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

            {/* 6. Spiritual Diary & Pastoral Tracking */}
            <button
              type="button"
              onClick={() => {
                setMainTab('spiritual_diary');
                setActiveSubject(null);
                setMobileSidebarOpen(false);
              }}
              className={`w-full text-right py-2.5 px-3 rounded-2xl flex items-center justify-between text-xs font-bold transition-all ${
                mainTab === 'spiritual_diary'
                  ? 'bg-maroon-800 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sun className={`w-4 h-4 ${mainTab === 'spiritual_diary' ? 'text-gold-300' : 'text-amber-500'}`} />
                <span>النوتة الروحية والمتابعة</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                mainTab === 'spiritual_diary' ? 'bg-gold-400 text-maroon-950' : 'bg-slate-100 text-slate-600'
              }`}>
                رعائي
              </span>
            </button>

            {/* 7. Attendance QR Code */}
            <button
              type="button"
              onClick={() => {
                setMainTab('attendance_qr');
                setActiveSubject(null);
                setMobileSidebarOpen(false);
              }}
              className={`w-full text-right py-2.5 px-3 rounded-2xl flex items-center gap-2.5 text-xs font-bold transition-all ${
                mainTab === 'attendance_qr'
                  ? 'bg-maroon-800 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <QrCode className={`w-4 h-4 ${mainTab === 'attendance_qr' ? 'text-gold-300' : 'text-slate-500'}`} />
              <span>كود الحضور (QR)</span>
            </button>
          </nav>
        </aside>

        {/* Content Area (col-span-9 on desktop) */}
        <main className="md:col-span-9 space-y-6">

      {/* 0. Users & Roles Management Hub (Admin Only: Admin Approvals & Activity Logs) */}
      {isAppAdmin && mainTab === 'users_hub' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          {/* Subtabs Switcher: الحسابات والأدوار vs سجل دخول المستخدمين */}
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <button
              type="button"
              onClick={() => setUserHubSubTab('accounts')}
              className={`py-2 px-4 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                userHubSubTab === 'accounts'
                  ? 'bg-maroon-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>الحسابات والأدوار ({allUsers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => { setUserHubSubTab('login_history'); fetchLoginLogs(); }}
              className={`py-2 px-4 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                userHubSubTab === 'login_history'
                  ? 'bg-maroon-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4 text-gold-400" />
              <span>سجل النشاط والدخول ({loginLogs.length})</span>
            </button>
          </div>

          {userHubSubTab === 'accounts' ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-base">إدارة حسابات المستخدمين والموافقة على الأدوار</h3>
                    <span className="text-[11px] bg-maroon-100 text-maroon-900 font-bold px-2 py-0.5 rounded-full">
                      صلاحيات مدير المنظومة
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    التحكم الكامل في حسابات المنظومة: الموافقة على رتبة المستخدم أو تعديلها (تحويل من خادم إلى مخدوم أو العكس، وتغيير المرحلة الدراسية).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 text-slate-700"
                  >
                    <option value="all">عرض الكل ({allUsers.length})</option>
                    <option value="student">المخدومين فقط ({allUsers.filter(u => u.role === 'student').length})</option>
                    <option value="servant">الخدام فقط ({allUsers.filter(u => u.role === 'servant').length})</option>
                  </select>

                  <button
                    onClick={fetchAllUsers}
                    disabled={usersLoading}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                    title="تحديث القائمة"
                  >
                    <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin text-maroon-800' : ''}`} />
                  </button>
                </div>
              </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center">
              <span className="text-[11px] text-slate-500 font-bold block">إجمالي المسجلين</span>
              <span className="text-xl font-extrabold text-slate-900">{allUsers.length}</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-center">
              <span className="text-[11px] text-amber-800 font-bold block">المخدومين</span>
              <span className="text-xl font-extrabold text-amber-700">{allUsers.filter(u => u.role === 'student').length}</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center">
              <span className="text-[11px] text-emerald-800 font-bold block">الخدام المعتمدين</span>
              <span className="text-xl font-extrabold text-emerald-700">{allUsers.filter(u => u.role === 'servant').length}</span>
            </div>
            <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl text-center">
              <span className="text-[11px] text-purple-800 font-bold block">فصل أليشع (إعداد خدام)</span>
              <span className="text-xl font-extrabold text-purple-700">{allUsers.filter(u => u.grade === 'elisha').length}</span>
            </div>
          </div>

          {/* Users Table */}
          {usersLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-maroon-800" />
              <span>جاري تحميل قائمة المستخدمين من قاعدة البيانات...</span>
            </div>
          ) : allUsers.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">لم يسجل أي مستخدم جديد حتى الآن.</p>
              <p className="text-[11px] text-slate-400 mt-1">عند تسجيل أي مستخدم برقم هاتفه ستظهر بياناته هنا للاعتماد أو التعديل.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-3 px-3">الاسم والبيانات</th>
                    <th className="py-3 px-3">رقم الهاتف</th>
                    <th className="py-3 px-3">الصفة الحالية</th>
                    <th className="py-3 px-3">المرحلة / النطاق</th>
                    <th className="py-3 px-3">تسجيل الحضور / الغياب اليدوي</th>
                    <th className="py-3 px-3">تعديل الصفة (خادم / مخدوم)</th>
                    <th className="py-3 px-3">تعديل المرحلة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allUsers
                    .filter(u => userRoleFilter === 'all' || u.role === userRoleFilter)
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                              item.role === 'servant' ? 'bg-maroon-800 text-white' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {item.fullName ? item.fullName[0] : '؟'}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span>{item.fullName || 'بدون اسم'}</span>
                                {item.id === user.id && (
                                  <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded mr-1.5">حسابك</span>
                                )}
                              </div>
                              {item.email && (
                                <span className="text-[10px] text-slate-400 block font-normal font-mono" dir="ltr">{item.email}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600" dir="ltr">{item.phone}</td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                            item.role === 'servant'
                              ? 'bg-maroon-100 text-maroon-900 border border-maroon-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {item.role === 'servant' ? 'خادم' : 'مخدوم'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-700">
                          {(item.role === 'admin' || item.phone === '01275571569' || (item.email && item.email.includes('nader.kamel')))
                            ? <span className="text-amber-700 font-extrabold">مشرف التطبيق 👑</span>
                            : item.role === 'servant'
                            ? <span className="text-maroon-800 font-bold">خادم عام (جميع المراحل)</span>
                            : getGradeTitle(item.grade || 'first')}
                        </td>
                        <td className="py-3 px-3">
                          {item.role === 'student' ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleManualAttendance(item)}
                                disabled={manualAttendLoadingId === item.id || manualAbsenceLoadingId === item.id}
                                className={`font-bold text-[11px] px-2.5 py-1.5 rounded-xl transition-all shadow-2xs flex items-center gap-1 ${
                                  manualAttendSuccessId === item.id
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                                }`}
                                title="تسجيل حضور هذا المخدوم فوراً وإضافة 10 نقاط لحسابه"
                              >
                                {manualAttendSuccessId === item.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>تم الحضور ✓</span>
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="w-3.5 h-3.5 text-emerald-700" />
                                    <span>{manualAttendLoadingId === item.id ? '...' : 'حاضر'}</span>
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => handleManualAbsence(item)}
                                disabled={manualAbsenceLoadingId === item.id || manualAttendLoadingId === item.id}
                                className={`font-bold text-[11px] px-2.5 py-1.5 rounded-xl transition-all shadow-2xs flex items-center gap-1 ${
                                  manualAbsenceSuccessId === item.id
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300'
                                }`}
                                title="تسجيل هذا المخدوم غائباً لليوم وإرسال تنبيه"
                              >
                                {manualAbsenceSuccessId === item.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>تم الغياب ✓</span>
                                  </>
                                ) : (
                                  <>
                                    <UserX className="w-3.5 h-3.5 text-rose-700" />
                                    <span>{manualAbsenceLoadingId === item.id ? '...' : 'غائب'}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[10px]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            {item.role === 'student' ? (
                              <button
                                onClick={() => handleUpdateUserRole(item.id, 'servant')}
                                disabled={roleUpdatingId === item.id}
                                className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-[11px] px-3 py-1 rounded-xl transition-all shadow-2xs flex items-center gap-1"
                              >
                                {roleUpdatingId === item.id ? 'جاري...' : 'ترقية إلى خادم ⬆️'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateUserRole(item.id, 'student', item.grade || 'first')}
                                disabled={roleUpdatingId === item.id || item.phone === '01275571569'}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-[11px] px-3 py-1 rounded-xl transition-all flex items-center gap-1"
                              >
                                {roleUpdatingId === item.id ? 'جاري...' : 'تحويل إلى مخدوم ⬇️'}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {item.role === 'servant' ? (
                            <span className="text-xs text-slate-500 font-bold bg-slate-100 px-2 py-1 rounded-lg">
                              خادم عام (كافة المراحل)
                            </span>
                          ) : (
                            <select
                              value={item.grade || 'first'}
                              onChange={(e) => {
                                const newStage = e.target.value;
                                handleUpdateUserRole(item.id, 'student', newStage);
                              }}
                              disabled={roleUpdatingId === item.id}
                              className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs focus:outline-none focus:border-maroon-800"
                            >
                              <option value="first">سنة أولى</option>
                              <option value="second">سنة ثانية</option>
                              <option value="third">سنة ثالثة</option>
                              <option value="elisha">فصل أليشع (إعداد خدام)</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
          </>
        ) : (
          /* Login History View (سجل دخول المستخدمين) */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 text-base">سجل النشاط وعمليات دخول المستخدمين</h3>
                  <span className="text-[11px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                    متابعة حية
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  رصد كامل لكافة عمليات الدخول وإنشاء الحسابات الجديدة بالوقت والتاريخ والصفة للمنظومة.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchLoginLogs}
                disabled={logsLoading}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold"
                title="تحديث السجل"
              >
                <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin text-maroon-800' : ''}`} />
                <span>تحديث السجل</span>
              </button>
            </div>

            {logsLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-maroon-800" />
                <span>جاري تحميل سجل الدخول من قاعدة البيانات...</span>
              </div>
            ) : loginLogs.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
                <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">لا توجد عمليات دخول مسجلة بعد في السجل.</p>
                <p className="text-[11px] text-slate-400 mt-1">عند تسجيل دخول أي مستخدم أو إنشاء حساب جديد سيتم تدوينها هنا فوراً.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-3 px-3">المستخدم</th>
                      <th className="py-3 px-3">رقم الهاتف</th>
                      <th className="py-3 px-3">الصفة</th>
                      <th className="py-3 px-3">العملية</th>
                      <th className="py-3 px-3">الوقت</th>
                      <th className="py-3 px-3">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loginLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                              log.role === 'servant' ? 'bg-maroon-800 text-white' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {log.userName ? log.userName[0] : '؟'}
                            </div>
                            <span>{log.userName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600" dir="ltr">{log.phone}</td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            log.role === 'servant'
                              ? 'bg-maroon-100 text-maroon-900'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {log.role === 'servant' ? 'خادم' : 'مخدوم'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            log.action === 'register'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            <Activity className="w-3 h-3" />
                            <span>{log.action === 'register' ? 'إنشاء حساب جديد' : 'تسجيل دخول'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-700" dir="ltr">{log.timeStr || 'الآن'}</td>
                        <td className="py-3 px-3 text-slate-500">{log.dateStr || 'اليوم'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    )}

      {/* 1. Subjects & Curriculum Management Hub */}
      {mainTab === 'subjects_hub' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          {/* Audience Switcher Tabs: Students vs Servants */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setCurriculumTarget('students'); setActiveSubject(null); }}
                className={`text-xs px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
                  curriculumTarget === 'students'
                    ? 'bg-maroon-800 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>مناهج ومراجع المخدومين</span>
              </button>

              <button
                type="button"
                onClick={() => { setCurriculumTarget('servants'); setActiveSubject(null); }}
                className={`text-xs px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
                  curriculumTarget === 'servants'
                    ? 'bg-maroon-800 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-gold-300" />
                <span>مناهج ومراجع الخدام 🔒 (خاص)</span>
              </button>
            </div>

            <div className="text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              المرحلة المحددة: <strong className="text-maroon-900">{getGradeTitle(selectedGrade)}</strong>
            </div>
          </div>

          {/* Audience Context Notice */}
          <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 border font-medium ${
            curriculumTarget === 'servants'
              ? 'bg-amber-50/70 border-amber-200 text-amber-900'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            {curriculumTarget === 'servants' ? (
              <>
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>قسم مخصص للخدام فقط: لرفع مراجع التحضير والتأملات والتوجيهات الرعوية الخاصة بالخدمة (مخفية تماماً عن المخدومين).</span>
              </>
            ) : (
              <>
                <BookOpen className="w-4 h-4 text-maroon-800 shrink-0" />
                <span>مناهج ومحاضرات المخدومين: يتم بثها للطلبة، مع إمكانية إتاحة أو إخفاء أي محاضرة بزر واحد في أي وقت.</span>
              </>
            )}
          </div>

          {!activeSubject ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {curriculumTarget === 'students' ? 'مواد ومناهج المخدومين' : 'مواد ومراجع الخدام'}: {getGradeTitle(selectedGrade)}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    إدارة المواد ورفع الملفات (PDF، Word، Excel، صور، تسجيلات) إلى Google Drive مباشرة.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAddSubjectModal(true)}
                    className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة مادة جديدة</span>
                  </button>
                </div>
              </div>

              {showAddSubjectModal && (
                <form onSubmit={handleAddSubject} className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl space-y-3">
                  <h4 className="font-extrabold text-xs text-maroon-900">
                    إضافة مادة جديدة ({curriculumTarget === 'students' ? 'للمخدومين' : 'للخدام فقط'}) - {getGradeTitle(selectedGrade)}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم المادة</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: طقوس الكنيسة، تاريخ كنيسة، عقيدة، إعداد درس"
                        value={newSubjectName}
                        onChange={(e) => setNewSubjectName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-maroon-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">خادم المادة المسئول</label>
                      <input
                        type="text"
                        placeholder="اسم الخادم (اختياري)"
                        value={newSubjectTeacher}
                        onChange={(e) => setNewSubjectTeacher(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-maroon-800"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowAddSubjectModal(false)} className="bg-white border border-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-xl font-bold">
                      إلغاء
                    </button>
                    <button type="submit" className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-xs px-4 py-1.5 rounded-xl">
                      حفظ المادة
                    </button>
                  </div>
                </form>
              )}

              {currentGradeSubjects.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
                  <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">لا توجد مواد مضافة في هذا القسم لهذه المرحلة بعد.</p>
                  <p className="text-[11px] text-slate-400 mt-1">اضغط على زر "إضافة مادة جديدة" للبدء في إضافة المواد ورفع المذكرات والمحاضرات.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {currentGradeSubjects.map((sub) => (
                    <div
                      key={sub.id}
                      onClick={() => setActiveSubject(sub)}
                      className="bg-slate-50 border border-slate-200 hover:border-maroon-700 p-5 rounded-2xl cursor-pointer transition-all hover:shadow-md group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] bg-maroon-100 text-maroon-900 font-extrabold px-2.5 py-0.5 rounded-full">
                            {sub.teacher}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-400 font-bold">{(sub.references || []).length} مراجع</span>
                            <button
                              onClick={(e) => handleDeleteSubject(sub.id, e)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                              title="حذف المادة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <h4 className="font-extrabold text-slate-900 text-base group-hover:text-maroon-800 transition-colors mb-1">{sub.name}</h4>
                        <p className="text-xs text-slate-500 leading-relaxed mb-4">اضغط للدخول وإدارة المذكرات والملفات والتسجيلات وفتح المحاضرات للمخدومين.</p>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold text-maroon-800 pt-3 border-t border-slate-200/60">
                        <span>إدارة مراجع ومحاضرات المادة ({(sub.references || []).length})</span>
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <span className="text-xs text-slate-400 font-bold">
                    المادة الحالية ({curriculumTarget === 'students' ? 'مناهج المخدومين' : 'مناهج الخدام 🔒'})
                  </span>
                  <h4 className="font-extrabold text-slate-900 text-lg">{activeSubject.name}</h4>
                  <span className="text-xs text-maroon-800 font-semibold">المسئول: {activeSubject.teacher}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAddRefModal(true)}
                    className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-xs py-2 px-3.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>إضافة محتوى / ملف</span>
                  </button>
                  <button
                    onClick={() => setActiveSubject(null)}
                    className="text-xs font-bold text-slate-600 hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-200"
                  >
                    ← العودة لقائمة المواد
                  </button>
                </div>
              </div>

              {showAddRefModal && (
                <form onSubmit={handleAddReference} className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl space-y-3.5">
                  <h5 className="font-extrabold text-xs text-slate-800">
                    إضافة محتوى تعليمي لمادة ({activeSubject.name}) - {curriculumTarget === 'students' ? 'للمخدومين' : 'للخدام فقط'}
                  </h5>
                  
                  {/* Type Selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">نوع المحتوى</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewRefType('file')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          newRefType === 'file' || newRefType === 'pdf' ? 'bg-maroon-800 text-white border-maroon-800 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>ملف (PDF، Word، Excel، صور)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewRefType('audio')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          newRefType === 'audio' ? 'bg-amber-600 text-white border-amber-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Music className="w-3.5 h-3.5" />
                        <span>تسجيل صوتي</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewRefType('video')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          newRefType === 'video' ? 'bg-red-700 text-white border-red-700 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>فيديو يوتيوب</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">عنوان المحتوى / المرجع</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: مذكرة شرح المحاضرة الأولى + أسئلة تطبيقية"
                      value={newRefTitle}
                      onChange={(e) => setNewRefTitle(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-maroon-800"
                    />
                  </div>

                  {newRefType !== 'video' ? (
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-slate-700">
                        اختر أي ملف من جهازك (PDF، Word، Excel، PowerPoint، صور، صوتيات):
                      </label>
                      <div className="border-2 border-dashed border-maroon-200 hover:border-maroon-600 bg-white p-4 rounded-2xl text-center cursor-pointer transition-colors relative">
                        <input
                          type="file"
                          accept="*/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setSelectedUploadFile(e.target.files[0]);
                              if (!newRefTitle.trim()) {
                                setNewRefTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ''));
                              }
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <UploadCloud className="w-7 h-7 text-maroon-700 mx-auto mb-1" />
                        {selectedUploadFile ? (
                          <div className="text-xs font-bold text-emerald-700">
                            تم اختيار: {selectedUploadFile.name} ({(selectedUploadFile.size / 1024 / 1024).toFixed(2)} MB) ✓
                          </div>
                        ) : (
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">اضغط هنا لاختيار الملف من الموبايل أو الكمبيوتر</span>
                            <span className="text-[10px] text-slate-400 mt-0.5 block">سيقوم التطبيق برفعه مباشرة إلى Google Drive الخاص بالخدمة تلقائياً</span>
                          </div>
                        )}
                      </div>

                      <details className="text-[11px] text-slate-500 pt-1">
                        <summary className="cursor-pointer hover:text-maroon-800 font-bold">أو وضع رابط مباشر بدلاً من الرفع (اختياري)</summary>
                        <input
                          type="text"
                          placeholder="https://drive.google.com/file/d/.../view"
                          value={newRefUrl}
                          onChange={(e) => setNewRefUrl(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs mt-1.5 focus:outline-none focus:border-maroon-800"
                        />
                      </details>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        رابط فيديو يوتيوب (YouTube Link or ID)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="https://www.youtube.com/watch?v=... أو https://youtu.be/..."
                        value={newRefUrl}
                        onChange={(e) => setNewRefUrl(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-maroon-800"
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                    <button type="button" onClick={() => setShowAddRefModal(false)} className="bg-white border border-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-xl font-bold">
                      إلغاء
                    </button>
                    <button 
                      type="submit" 
                      disabled={refSaving || (newRefType !== 'video' && !selectedUploadFile && !newRefUrl.trim())}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2 rounded-xl flex items-center gap-1.5 disabled:opacity-50 shadow-xs transition-all"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{refSaving ? (uploadStatusText || 'جاري الرفع...') : 'تأكيد حفظ ورفع المحتوى'}</span>
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {(!activeSubject.references || activeSubject.references.length === 0) ? (
                  <div className="text-center py-10 text-slate-400 text-xs">لم يتم إضافة مراجع أو محتوى لهذه المادة بعد.</div>
                ) : (
                  activeSubject.references.map((rf) => {
                    const meta = getRefTypeMeta(rf.type);
                    const IconComp = meta.icon;
                    return (
                      <div key={rf.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl shrink-0 border ${meta.color}`}>
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-extrabold text-slate-900 text-sm">{rf.title}</h5>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.color}`}>
                                {meta.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 flex-wrap">
                              <span>رفع بواسطة: <strong className="text-slate-600">{rf.uploadedBy || 'الخادم المسؤول'}</strong></span>
                              <span>•</span>
                              <span>{rf.date || 'اليوم'} {rf.time ? `(${rf.time})` : ''}</span>
                              {rf.fileName && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono text-[10px] text-slate-500">{rf.fileName}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          {rf.url && (
                            <a
                              href={rf.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>فتح</span>
                            </a>
                          )}

                          {/* Toggle Visibility for Students */}
                          {curriculumTarget === 'students' ? (
                            <button
                              type="button"
                              onClick={() => handleToggleRefVisibility(rf.id)}
                              className={`font-bold px-3 py-1 rounded-lg text-[10px] flex items-center gap-1.5 transition-all shadow-2xs ${
                                rf.isPublishedForStudents !== false
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                                  : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                              }`}
                              title="اضغط لتفعيل أو إخفاء المحتوى عن المخدومين"
                            >
                              {rf.isPublishedForStudents !== false ? (
                                <>
                                  <Eye className="w-3 h-3 text-emerald-600" />
                                  <span>متاح للمخدومين 👁️ (انقر للإخفاء)</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3 h-3 text-amber-600" />
                                  <span>مخفي عن المخدومين 🔒 (انقر للإتاحة)</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="bg-slate-100 text-slate-600 border border-slate-200 font-bold px-2.5 py-1 rounded-lg text-[10px]">
                              خاص بالخدام 🔒
                            </span>
                          )}

                          <button
                            onClick={() => handleDeleteReference(rf.id)}
                            className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            title="حذف هذا المرجع"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Question Bank & Exams Hub */}
      {mainTab === 'exams_bank_hub' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <button
              onClick={() => setExamSubSection('bank')}
              className={`text-xs px-4 py-2 rounded-xl font-bold transition-all ${
                examSubSection === 'bank' ? 'bg-maroon-800 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              بنك الأسئلة ({currentGradeQuestions.length})
            </button>
            <button
              onClick={() => setExamSubSection('assign')}
              className={`text-xs px-4 py-2 rounded-xl font-bold transition-all ${
                examSubSection === 'assign' ? 'bg-maroon-800 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              تكليف ونشر امتحان (Assign Exam)
            </button>
          </div>

          {examSubSection === 'bank' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">بنك الأسئلة: {getGradeTitle(selectedGrade)}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">يضيف خدام المواد الأسئلة مصنفة حسب الصعوبة والنوع ليتم توليد الامتحانات منها.</p>
                </div>
                <button
                  onClick={() => setShowAddQuestionModal(true)}
                  className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة سؤال لبنك الأسئلة</span>
                </button>
              </div>

              {showAddQuestionModal && (
                <form onSubmit={handleAddQuestionSubmit} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-3">
                  <h5 className="font-extrabold text-xs text-maroon-900">إضافة سؤال جديد لبنك الأسئلة ({getGradeTitle(selectedGrade)})</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">المادة</label>
                      <select
                        value={newQuestion.subject}
                        onChange={(e) => setNewQuestion({ ...newQuestion, subject: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                      >
                        {currentGradeSubjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">نوع السؤال</label>
                      <select
                        value={newQuestion.type}
                        onChange={(e) => setNewQuestion({ ...newQuestion, type: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                      >
                        <option value="mcq">اختيار من متعدد (MCQ)</option>
                        <option value="true_false">صح أو خطأ</option>
                        <option value="essay">سؤال مقالي (يصححه الخادم)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">درجة الصعوبة</label>
                      <select
                        value={newQuestion.difficulty}
                        onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                      >
                        <option value="easy">سهل جداً 🟢</option>
                        <option value="medium">متوسط 🟡</option>
                        <option value="hard">صعب 🔴</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">نص السؤال</label>
                    <textarea
                      rows={2}
                      required
                      placeholder="اكتب صيغة السؤال هنا..."
                      value={newQuestion.questionText}
                      onChange={(e) => setNewQuestion({ ...newQuestion, questionText: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                    <button type="button" onClick={() => setShowAddQuestionModal(false)} className="bg-white border border-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-xl font-bold">
                      إلغاء
                    </button>
                    <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-1.5 rounded-xl">
                      إضافة السؤال للبنك
                    </button>
                  </div>
                </form>
              )}

              {currentGradeQuestions.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">بنك الأسئلة فارغ لهذه المرحلة حالياً.</p>
                  <p className="text-[11px] text-slate-400 mt-1">اضغط على "إضافة سؤال لبنك الأسئلة" للبدء في تجميع بنك أسئلة المرحلة.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentGradeQuestions.map((q, idx) => (
                    <div key={q.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900">س {idx + 1}</span>
                          <span className="bg-maroon-50 text-maroon-900 border border-maroon-200 px-2 py-0.5 rounded font-bold text-[10px]">{q.subject}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          q.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-800' : q.difficulty === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {q.difficulty === 'easy' ? 'سهل جداً 🟢' : q.difficulty === 'medium' ? 'متوسط 🟡' : 'صعب 🔴'}
                        </span>
                      </div>
                      <p className="font-bold text-slate-800">{q.questionText}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {examSubSection === 'assign' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">تكليف ونشر امتحان (Assign Exam)</h4>
                  <p className="text-xs text-slate-500 mt-0.5">نشر امتحان لمخدومي {getGradeTitle(selectedGrade)}.</p>
                </div>
                <button
                  onClick={() => setShowCreateExamModal(true)}
                  className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>تجهيز وتكليف امتحان</span>
                </button>
              </div>

              {showCreateExamModal && (
                <form onSubmit={handleCreateExamSubmit} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-3">
                  <h5 className="font-extrabold text-xs text-maroon-900">نشر امتحان جديد لـ ({getGradeTitle(selectedGrade)})</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">المادة</label>
                      <select
                        value={newExamSubject}
                        onChange={(e) => setNewExamSubject(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                      >
                        {currentGradeSubjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">عنوان الامتحان</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: امتحان أعمال شهر أكتوبر"
                        value={newExamTitle}
                        onChange={(e) => setNewExamTitle(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">المدة (بالدقائق)</label>
                      <input
                        type="number"
                        min="5"
                        max="120"
                        value={newExamDuration}
                        onChange={(e) => setNewExamDuration(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                    <button type="button" onClick={() => setShowCreateExamModal(false)} className="bg-white border border-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-xl font-bold">
                      إلغاء
                    </button>
                    <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-1.5 rounded-xl">
                      تأكيد النشر للمخدومين
                    </button>
                  </div>
                </form>
              )}

              {createdExams.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">لا توجد امتحانات منشورة لهذه المرحلة حتى الآن.</p>
                  <p className="text-[11px] text-slate-400 mt-1">اضغط على زر "تجهيز وتكليف امتحان" لاختيار مادة وتكليف امتحان للطلاب.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {createdExams.map((ex) => (
                    <div key={ex.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-extrabold text-slate-900 text-sm">{ex.title}</span>
                          <span className="bg-maroon-100 text-maroon-900 font-bold px-2 py-0.5 rounded text-[10px]">{ex.subject}</span>
                        </div>
                        <span className="text-[11px] text-slate-500">المدة: {ex.durationMinutes} دقيقة • الدرجة العظمى: {ex.totalScore} درجة</span>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-xl text-[11px]">متاح ونشط للطلاب ✓</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. Analytics, Honor Roll, Red Flags, & Servant Comments Hub */}
      {mainTab === 'analytics_hub' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          {/* Header */}
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-base">
              الإحصائيات ولوحة الشرف والتقييم الرعوي: {getGradeTitle(selectedGrade)}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              متابعة نسب الحضور، تكريم الأوائل، كشف العلامات الحمراء (المتغيبين والمقصرين)، وكتابة تقييم وملاحظات الخدام.
            </p>
          </div>

          {/* Quick Metrics KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center">
              <span className="text-[11px] text-slate-500 font-bold block">إجمالي المخدومين</span>
              <span className="text-xl font-extrabold text-slate-900">{totalStudents}</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center">
              <span className="text-[11px] text-slate-500 font-bold block">متوسط الحضور</span>
              <span className="text-xl font-extrabold text-emerald-600">{avgAttendance}%</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center">
              <span className="text-[11px] text-slate-500 font-bold block">متوسط الامتحانات</span>
              <span className="text-xl font-extrabold text-amber-600">{avgScore} / 30</span>
            </div>

            <div className="bg-red-50 border border-red-200 p-4 rounded-2xl text-center">
              <span className="text-[11px] text-red-700 font-bold block">علامات حمراء (افتقاد عاجل)</span>
              <span className="text-xl font-extrabold text-red-600 flex items-center justify-center gap-1">
                <span>🔴</span>
                <span>{redFlagsCount}</span>
              </span>
            </div>
          </div>

          {/* Honor Roll (Top 3 Students) */}
          <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 p-5 rounded-2xl space-y-3">
            <h4 className="font-extrabold text-amber-950 text-sm flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-600" />
              لوحة الشرف والأوائل ({getGradeTitle(selectedGrade)}) 🏆
            </h4>
            {topStudents.length === 0 ? (
              <p className="text-xs text-amber-800/80 font-bold">لا توجد سجلات مخدومين مسجلة حتى الآن لحساب لوحة الشرف.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {topStudents.map((st, rank) => (
                  <div key={st.id} className="bg-white border border-amber-200/80 p-3.5 rounded-xl flex items-center justify-between text-xs shadow-2xs">
                    <div>
                      <span className="font-extrabold text-slate-900 block text-xs">
                        {rank === 0 ? '🥇' : rank === 1 ? '🥈' : '🥉'} {st.fullName}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        حضور: {st.attendanceRate}% • امتحان: {st.examScore}/30
                      </span>
                    </div>
                    <span className="text-amber-700 font-extrabold text-xs">{st.points} نقطة</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Student Evaluation Table with Servant Comments & Red Flags */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-maroon-800" />
              سجل تقييمات وملاحظات الخدام لكل مخدوم
            </h4>

            {currentGradeStudents.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">لم يتم تسجيل مخدومين في هذه المرحلة حتى الآن.</p>
                <p className="text-[11px] text-slate-400 mt-1">عند تسجيل المخدومين لحساباتهم أو تسجيل الحضور ستظهر بياناتهم وتقييماتهم هنا تلقائياً.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-3 px-3">المخدوم</th>
                      <th className="py-3 px-2">الحضور</th>
                      <th className="py-3 px-2">الدرجة</th>
                      <th className="py-3 px-2">الحالة</th>
                      <th className="py-3 px-4">ملاحظات وتقييم الخادم (هل ملتزم / يصلح لإعداد خدام)</th>
                      <th className="py-3 px-3">حفظ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentGradeStudents.map((st) => (
                    <tr key={st.id} className={`hover:bg-slate-50/80 transition-colors ${st.isRedFlag ? 'bg-red-50/30' : ''}`}>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {st.fullName}
                        <span className="text-[10px] text-slate-400 block font-normal">{st.phone}</span>
                      </td>
                      <td className="py-3 px-2 font-bold text-slate-800">{st.attendanceRate}%</td>
                      <td className="py-3 px-2 font-bold text-slate-800">{st.examScore}/30</td>
                      <td className="py-3 px-2">
                        {st.isRedFlag ? (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-red-200">
                            🔴 افتقاد
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            🟢 منتظم
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder="اكتب ملاحظة رعوية، مستوى التزامه، أو ترشيحه لإعداد خدام..."
                          value={st.comment}
                          onChange={(e) => handleCommentChange(st.id, e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-maroon-800"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleSaveComment(st.id)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all flex items-center gap-1 ${
                            savedCommentId === st.id
                              ? 'bg-emerald-600 text-white'
                              : 'bg-maroon-800 hover:bg-maroon-700 text-white shadow-xs'
                          }`}
                        >
                          {savedCommentId === st.id ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                          <span>{savedCommentId === st.id ? 'تم الحفظ' : 'حفظ'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Tab: Attendance QR */}
      {mainTab === 'attendance_qr' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="mb-4">
              <span className="text-[11px] bg-maroon-50 text-maroon-900 border border-maroon-200 font-bold px-3 py-1 rounded-full">
                كود حضور خدمة اليوم
              </span>
              <h3 className="text-base font-extrabold text-slate-900 mt-2">{todayStr}</h3>
              <p className="text-xs text-slate-500">ساري من 10:30 صباحاً حتى 02:00 ظهراً</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center">
              <div className="w-52 h-52 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center p-2">
                <QrCode className="w-40 h-40 text-slate-900" />
              </div>
              <div className="mt-2 text-slate-600 text-[11px] font-mono font-bold" dir="ltr">
                {qrCodeData}
              </div>
            </div>

            {/* Dynamic Numeric PIN Code for Students (رقم كود متغير يقدر يديه للمخدوم) */}
            <div className="mt-5 w-full max-w-sm bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-4 shadow-xs text-center space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-amber-900 font-extrabold text-xs">
                <KeyRound className="w-4 h-4 text-amber-700" />
                <span>كود الحضور الرقمي السريع (بدون كاميرا)</span>
              </div>
              <p className="text-[11px] text-slate-600">
                يمكن للمخدوم كتابة هذا الرقم المكون من 4 أرقام مباشرة في حسابه لتسجيل حضوره:
              </p>
              <div className="bg-white border-2 border-dashed border-amber-400 py-2.5 px-6 rounded-2xl inline-block shadow-inner">
                <span className="font-mono text-3xl font-black text-amber-900 tracking-widest" dir="ltr">
                  {numericPin}
                </span>
              </div>
              <div className="pt-1 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateNewPin}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-1.5 px-3 rounded-xl transition-all shadow-2xs flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>توليد كود رقمي جديد 🔄</span>
                </button>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={() => setQrCodeData(`STJOHN-ATTENDANCE-${new Date().toISOString().split('T')[0]}-${Math.floor(1000 + Math.random() * 9000)}`)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-3.5 rounded-xl transition-all"
              >
                تحديث رمز QR
              </button>
              <button
                onClick={() => window.print()}
                className="bg-maroon-800 hover:bg-maroon-700 text-white text-xs font-bold py-2 px-4 rounded-xl transition-all flex items-center gap-1.5 shadow"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة للقاعة</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm text-right flex flex-col justify-between text-xs space-y-4">
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-maroon-800" />
                دليل الحضور السريع
              </h4>
              <p className="text-slate-600 leading-relaxed">
                اعرض هذا الكود عند مدخل قاعة الخدمة. يقوم المخدومون بمسحه عبر كاميرا هواتفهم المدمجة في حساباتهم وتسجيل الحضور وإضافة النقاط مباشرة.
              </p>
            </div>

            {/* Remote Code Access Control (فتح التسجيل لشخص معين أو للجميع مع إرسال إشعار) */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-200/80 p-4 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <Unlock className="w-4 h-4 text-amber-700" />
                <span className="font-extrabold text-slate-900 text-xs">فتح التسجيل بالكود الاستثنائي</span>
              </div>
              <p className="text-[11px] text-slate-600">
                يمكنك كخادم فتح التسجيل بالكود الآن لشخص معين أو للجميع وإرسال تنبيه فوري له/لهم:
              </p>

              {remoteAccessMessage && (
                <div className="bg-emerald-100/80 border border-emerald-300 text-emerald-800 text-[11px] p-2.5 rounded-xl font-bold flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{remoteAccessMessage}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-700">لمن تريد فتح التسجيل؟</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRemoteAccessTarget('all')}
                    className={`py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1 ${
                      remoteAccessTarget === 'all'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700'
                    }`}
                  >
                    <span>📢 للجميع</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemoteAccessTarget('specific')}
                    className={`py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1 ${
                      remoteAccessTarget === 'specific'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700'
                    }`}
                  >
                    <span>🎯 لشخص معين</span>
                  </button>
                </div>

                {remoteAccessTarget === 'specific' && (
                  <div className="pt-1">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">اختر المخدوم:</label>
                    <select
                      value={selectedStudentForAccess}
                      onChange={(e) => setSelectedStudentForAccess(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-600"
                    >
                      <option value="">-- اضغط لاختيار المخدوم --</option>
                      {allUsers
                        .filter(u => u.role === 'student')
                        .map(st => (
                          <option key={st.id} value={st.id}>
                            {st.fullName} ({st.phone})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleOpenCodeAccess}
                  disabled={remoteAccessLoading}
                  className="w-full bg-maroon-800 hover:bg-maroon-700 text-white font-bold py-2 px-3 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 text-xs mt-2"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  <span>
                    {remoteAccessLoading
                      ? 'جاري الفتح والإشعار...'
                      : remoteAccessTarget === 'all'
                        ? 'فتح التسجيل للجميع وإرسال إشعار عام 📢'
                        : 'فتح التسجيل وإرسال تنبيه للمخدوم 🎯'}
                  </span>
                </button>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-slate-500">
              النافذة المعتمدة العادية: 10:30 ص إلى 02:00 م.
            </div>
          </div>
        </div>
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
          selectedStudentDetail={selectedStudentDetail}
          setSelectedStudentDetail={setSelectedStudentDetail}
        />
      )}
        </main>
      </div>
    </div>
  );
}
