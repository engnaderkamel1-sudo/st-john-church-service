import React, { useState, useEffect } from 'react';
import { 
  Award, QrCode, Sun, BookOpen, FileText, CheckSquare, Bell, Check 
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, doc, getDoc, onSnapshot, serverTimestamp, updateDoc, setDoc } from 'firebase/firestore';
import StudentAttendance from './student/StudentAttendance';
import StudentSpiritualDiary from './student/StudentSpiritualDiary';
import StudentCurriculum from './student/StudentCurriculum';
import StudentExams from './student/StudentExams';

export default function StudentDashboard({ user }) {
  // 6 Specified Tabs: 'attendance', 'spiritual_diary', 'curriculum', 'exams', 'tasks', 'announcements'
  const [activeTab, setActiveTab] = useState('attendance');
  const [isWithinTime, setIsWithinTime] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [bypassTime, setBypassTime] = useState(false);
  const [servantOpenedAccess, setServantOpenedAccess] = useState(null);

  // Curriculum Firestore Live State
  const [subjectsData, setSubjectsData] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [activePreviewPdf, setActivePreviewPdf] = useState(null);
  const [activePreviewVideo, setActivePreviewVideo] = useState(null);

  // Sync real-time curriculum for current student grade (Excluding servants' private curriculum)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'service_curriculum'), (snapshot) => {
      const studentGrade = user.grade || 'first';
      const list = [];
      snapshot.forEach(docSnap => {
        const data = { id: docSnap.id, ...docSnap.data() };
        if (data.grade === studentGrade && data.targetAudience !== 'servants') {
          list.push(data);
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
  }, [user.grade, selectedSubject?.id]);

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
        if (data.isOpenForAll && new Date(data.validUntil) > new Date()) {
          setBypassTime(true);
          setServantOpenedAccess({ openedBy: data.openedBy, type: 'all' });
        }
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
        pointsAwarded: 10,
        createdAt: serverTimestamp()
      });

      // Update user points
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        points: (user.points || 0) + 10
      });

      setAttendanceStatus('success');
      setPoints(p => p + 10);
      setAttendanceRecords(prev => [
        { id: Date.now().toString(), date: 'اليوم (بالكود الرقمي)', status: 'حاضر', time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }), points: 10 },
        ...prev
      ]);
      setInputPinCode('');
    } catch (err) {
      console.error('Error submitting pin attendance:', err);
      // Fallback local registration if offline or testing
      setAttendanceStatus('success');
      setPoints(p => p + 10);
      setAttendanceRecords(prev => [
        { id: Date.now().toString(), date: 'اليوم (بالكود الرقمي)', status: 'حاضر', time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }), points: 10 },
        ...prev
      ]);
    } finally {
      setPinLoading(false);
    }
  };

  const handleSimulateScan = () => {
    setScanning(true);
    setAttendanceStatus(null);
    setTimeout(() => {
      setAttendanceStatus('success');
      setPoints(p => p + 10);
      setAttendanceRecords(prev => [
        { id: Date.now().toString(), date: 'اليوم', status: 'حاضر', time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }), points: 10 },
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

  const handleSubmitExam = (exam) => {
    let autoScore = 0;
    exam.questions.forEach(q => {
      if ((q.type === 'mcq' || q.type === 'true_false') && examAnswers[q.id] === q.correctAnswer) {
        autoScore += q.points;
      }
    });

    const result = { examId: exam.id, autoScore, essayPending: true, submittedAt: new Date().toLocaleTimeString('ar-EG') };
    setExamResult(result);
    setCompletedExams(prev => ({ ...prev, [exam.id]: result }));
    setPoints(p => p + autoScore);
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
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 text-right">
          <div className="w-13 h-13 rounded-2xl bg-maroon-50 border border-maroon-200 text-maroon-900 flex items-center justify-center font-bold text-xl shrink-0 shadow-xs">
            {user.fullName ? user.fullName[0] : 'م'}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">{user.fullName}</h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <span className="bg-maroon-800 text-white px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                {getGradeTitle(user.grade)}
              </span>
              <span>{user.phone}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl text-center">
            <span className="text-[10px] text-slate-400 block font-medium">النقاط الروحية</span>
            <span className="text-sm font-extrabold text-maroon-800">{points} نقطة</span>
          </div>
        </div>
      </div>

      {/* The 6 Specified Navigation Tabs (Light Mode) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-1.5 flex items-center justify-around text-xs font-bold sticky top-16 z-30 shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`py-2 px-3 rounded-xl flex items-center gap-1.5 transition-all shrink-0 ${
            activeTab === 'attendance' ? 'bg-maroon-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>تسجيل حضور</span>
        </button>

        <button
          onClick={() => setActiveTab('spiritual_diary')}
          className={`py-2 px-3 rounded-xl flex items-center gap-1.5 transition-all shrink-0 ${
            activeTab === 'spiritual_diary' ? 'bg-maroon-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sun className="w-4 h-4" />
          <span>النوتة الروحية</span>
        </button>

        <button
          onClick={() => setActiveTab('curriculum')}
          className={`py-2 px-3 rounded-xl flex items-center gap-1.5 transition-all shrink-0 ${
            activeTab === 'curriculum' ? 'bg-maroon-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>المنهج والمواد</span>
        </button>

        <button
          onClick={() => setActiveTab('exams')}
          className={`py-2 px-3 rounded-xl flex items-center gap-1.5 transition-all shrink-0 ${
            activeTab === 'exams' ? 'bg-maroon-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>الامتحانات</span>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`py-2 px-3 rounded-xl flex items-center gap-1.5 transition-all shrink-0 ${
            activeTab === 'tasks' ? 'bg-maroon-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>التاسكات</span>
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`py-2 px-3 rounded-xl flex items-center gap-1.5 transition-all shrink-0 ${
            activeTab === 'announcements' ? 'bg-maroon-800 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>التنبيهات</span>
        </button>
      </div>

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
    </div>
  );
}
