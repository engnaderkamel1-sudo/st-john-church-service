import React, { useState, useEffect } from 'react';
import { 
  QrCode, Calendar, Award, CheckCircle2, Clock, AlertTriangle, BookOpen, 
  User, Flame, Camera, Heart, Check, Sun, Sunset, Moon, Sparkles, ShieldCheck,
  FileText, Send, HelpCircle
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

export default function StudentDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('attendance'); // attendance, tracker, exams
  const [isWithinTime, setIsWithinTime] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [bypassTime, setBypassTime] = useState(false);

  const [scanning, setScanning] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  
  // Spiritual Tracker State
  const [points, setPoints] = useState(user.points || 120);
  const [prayers, setPrayers] = useState({
    baker: false,
    ghoroub: false,
    nowm: false,
    bible: false
  });
  const [lastConfessionDate, setLastConfessionDate] = useState('2026-09-01');
  const [lastCommunionDate, setLastCommunionDate] = useState('2026-09-18');
  const [streakDays, setStreakDays] = useState(5);

  // Exams State
  const [activeExam, setActiveExam] = useState(null);
  const [examAnswers, setExamAnswers] = useState({});
  const [examResult, setExamResult] = useState(null);
  const [completedExams, setCompletedExams] = useState({});

  // Mock Available Exams for the Student's Grade
  const availableExams = [
    {
      id: 'ex-1',
      title: user.grade === 'elisha' ? 'اختبار مهارات إعداد الخادم والخدمة الكنسية' : 'امتحان منتصف الفصل في العقيدة والطقس',
      grade: user.grade,
      durationMinutes: 20,
      totalScore: 30,
      questions: [
        {
          id: 'q1',
          type: 'mcq',
          questionText: 'ما هو سر الأسرار وينبوع كل النعم الكنسية؟',
          options: ['سر المعمودية', 'سر الإفخارستيا (التناول)', 'سر التوبة والاعتراف', 'سر الزيجة'],
          correctAnswer: 'سر الإفخارستيا (التناول)',
          points: 10
        },
        {
          id: 'q2',
          type: 'true_false',
          questionText: 'صلاة باكر في الأجبية تُصلى تذكاراً لقيامة السيد المسيح من بين الأموات.',
          options: ['صح', 'خطأ'],
          correctAnswer: 'صح',
          points: 10
        },
        {
          id: 'q3',
          type: 'essay',
          questionText: user.grade === 'elisha' 
            ? 'اذكر باختصار ثلاث صفات روحية وسلوكية يجب أن يتحلى بها خادم المسيح في التعامل مع المخدومين.'
            : 'اكتب باختصار عن أهمية قراءة الكتاب المقدس يومياً في حياة الشاب المسيحي.',
          points: 10
        }
      ]
    }
  ];

  // Check 10:30 AM to 02:00 PM window
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
    return () => clearInterval(interval);
  }, []);

  // Fetch Attendance History
  useEffect(() => {
    async function fetchAttendance() {
      try {
        const attRef = collection(db, 'attendance');
        const q = query(attRef, where('userId', '==', user.id));
        const snap = await getDocs(q);

        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (list.length === 0) {
          setAttendanceRecords([
            { id: '1', date: 'الجمعة الماضية', status: 'حاضر', time: '11:15 ص', points: 10 },
            { id: '2', date: 'الجمعة قبل الماضية', status: 'حاضر', time: '10:45 ص', points: 10 }
          ]);
        } else {
          setAttendanceRecords(list);
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchAttendance();
  }, [user.id]);

  const handleSimulateScan = async () => {
    setScanning(true);
    setAttendanceStatus(null);

    setTimeout(async () => {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        await addDoc(collection(db, 'attendance'), {
          userId: user.id,
          userName: user.fullName,
          grade: user.grade,
          date: todayStr,
          timestamp: serverTimestamp(),
          status: 'حاضر',
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          points: 10
        });

        setAttendanceStatus('success');
        setPoints(p => p + 10);
        setAttendanceRecords(prev => [
          {
            id: Date.now().toString(),
            date: 'اليوم',
            status: 'حاضر',
            time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
            points: 10
          },
          ...prev
        ]);
      } catch (err) {
        setAttendanceStatus('success');
        setPoints(p => p + 10);
      } finally {
        setScanning(false);
      }
    }, 1500);
  };

  const toggleDailyItem = (key, pts) => {
    setPrayers(prev => {
      const current = prev[key];
      const next = !current;
      setPoints(p => next ? p + pts : Math.max(0, p - pts));
      return { ...prev, [key]: next };
    });
  };

  const handleRecordCommunion = () => {
    const today = new Date().toLocaleDateString('ar-EG');
    setLastCommunionDate(today);
    setPoints(p => p + 15);
  };

  const handleRecordConfession = () => {
    const today = new Date().toLocaleDateString('ar-EG');
    setLastConfessionDate(today);
    setPoints(p => p + 20);
  };

  // Submit Exam
  const handleSubmitExam = async (exam) => {
    let autoScore = 0;
    const questions = exam.questions;

    questions.forEach(q => {
      if (q.type === 'mcq' || q.type === 'true_false') {
        if (examAnswers[q.id] === q.correctAnswer) {
          autoScore += q.points;
        }
      }
    });

    const result = {
      examId: exam.id,
      autoScore: autoScore,
      maxAutoScore: 20,
      essayPending: true,
      essayAnswer: examAnswers['q3'] || '',
      submittedAt: new Date().toLocaleTimeString('ar-EG')
    };

    setExamResult(result);
    setCompletedExams(prev => ({ ...prev, [exam.id]: result }));
    setPoints(p => p + autoScore);

    // Save to Firestore
    try {
      await addDoc(collection(db, 'exam_submissions'), {
        userId: user.id,
        userName: user.fullName,
        grade: user.grade,
        examId: exam.id,
        examTitle: exam.title,
        autoScore: autoScore,
        essayAnswer: examAnswers['q3'] || '',
        essayScore: null, // Pending servant manual grading
        status: 'pending_essay',
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
    }
  };

  const getGradeTitle = (g) => {
    const titles = {
      first: 'سنة أولى ثانوي',
      second: 'سنة ثانية ثانوي',
      third: 'سنة ثالثة ثانوي',
      elisha: 'فصل أليشع (إعداد خدام)'
    };
    return titles[g] || g;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Student Profile Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-right w-full sm:w-auto">
          <div className="w-12 h-12 rounded-xl bg-gold-500/20 border border-gold-400/40 text-gold-300 flex items-center justify-center font-bold text-lg shrink-0">
            {user.fullName ? user.fullName[0] : 'م'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{user.fullName}</h2>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="bg-maroon-900/80 border border-maroon-700/60 text-gold-300 px-2 py-0.5 rounded font-semibold">
                {getGradeTitle(user.grade)}
              </span>
              <span>الهاتف: {user.phone}</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
          <div className="bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-xl text-center min-w-[75px]">
            <span className="text-[11px] text-slate-400 block">الحضور</span>
            <span className="text-sm font-bold text-emerald-400">92%</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-xl text-center min-w-[75px]">
            <span className="text-[11px] text-slate-400 block">أيام التوالي</span>
            <span className="text-sm font-bold text-amber-400 flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              {streakDays} يوم
            </span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-xl text-center min-w-[85px]">
            <span className="text-[11px] text-slate-400 block">النقاط</span>
            <span className="text-sm font-bold text-gold-400">{points} نقطة</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 px-4 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'attendance'
              ? 'border-gold-400 text-gold-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>حضور الخدمة</span>
        </button>

        <button
          onClick={() => setActiveTab('tracker')}
          className={`pb-3 px-4 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'tracker'
              ? 'border-gold-400 text-gold-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>دفتر الإنجاز الروحي</span>
        </button>

        <button
          onClick={() => setActiveTab('exams')}
          className={`pb-3 px-4 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'exams'
              ? 'border-gold-400 text-gold-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>المناهج والامتحانات</span>
        </button>
      </div>

      {/* 1. Attendance Tab */}
      {activeTab === 'attendance' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Camera className="w-5 h-5 text-gold-400" />
                  تسجيل الحضور بكود الخدمة (QR)
                </h3>
                <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-gold-400" />
                  الوقت الآن: {currentTimeStr}
                </span>
              </div>

              <div className={`p-3.5 rounded-xl border text-xs mb-5 flex items-start gap-2.5 ${
                isWithinTime || bypassTime
                  ? 'bg-emerald-950/40 border-emerald-600/40 text-emerald-200'
                  : 'bg-amber-950/40 border-amber-600/40 text-amber-200'
              }`}>
                {isWithinTime || bypassTime ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold block">
                    {isWithinTime || bypassTime
                      ? 'نافذة الحضور مفتوحة الآن (10:30 ص إلى 02:00 م)'
                      : 'نافذة تسجيل الحضور مغلقة حالياً'}
                  </span>
                  <span className="text-slate-400 mt-0.5 block">
                    مواعيد التسجيل: يوم الخدمة من 10:30 صباحاً حتى 02:00 ظهراً فقط.
                  </span>
                </div>
              </div>

              <div className="relative bg-slate-950 border-2 border-dashed border-slate-700 rounded-2xl h-60 flex flex-col items-center justify-center overflow-hidden">
                {scanning ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-gold-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-semibold text-gold-300">جاري قراءة الكود...</span>
                  </div>
                ) : attendanceStatus === 'success' ? (
                  <div className="flex flex-col items-center gap-2 p-6 text-center">
                    <CheckCircle2 className="w-14 h-14 text-emerald-400 animate-bounce" />
                    <span className="text-base font-bold text-emerald-300">تم تسجيل حضورك اليوم بنجاح!</span>
                    <span className="text-xs text-slate-400">+10 نقاط إنجاز أضيفت لرصيدك</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center px-4">
                    <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-800">
                      <QrCode className="w-8 h-8 text-gold-400" />
                    </div>
                    <p className="text-sm font-bold text-white">وجّه الكاميرا نحو كود الخدمة</p>
                    <p className="text-xs text-slate-400">على شاشة هاتف الخادم أو المطبوع بالقاعة</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <button
                onClick={handleSimulateScan}
                disabled={(!isWithinTime && !bypassTime) || scanning || attendanceStatus === 'success'}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                  attendanceStatus === 'success'
                    ? 'bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 cursor-not-allowed'
                    : (isWithinTime || bypassTime)
                    ? 'bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 text-maroon-950 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>
                  {attendanceStatus === 'success'
                    ? 'تم تسجيل الحضور اليوم'
                    : scanning
                    ? 'جاري المسح...'
                    : (isWithinTime || bypassTime)
                    ? 'فتح الكاميرا ومسح الكود'
                    : 'التسجيل متاح فقط أثناء وقت الخدمة'}
                </span>
              </button>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                <span>تجربة خارج ميعاد الخدمة:</span>
                <button
                  type="button"
                  onClick={() => setBypassTime(!bypassTime)}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    bypassTime ? 'bg-gold-500/20 text-gold-300 border border-gold-400/40' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {bypassTime ? 'وضع التجربة مفعل ✓' : 'تفعيل للتجربة'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col">
            <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gold-400" />
              سجل الحضور الأخير
            </h3>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {attendanceRecords.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-slate-200 block">{item.date}</span>
                      <span className="text-[11px] text-slate-400">{item.time || '11:00 ص'}</span>
                    </div>
                  </div>
                  <span className="text-gold-400 font-bold">+{item.points || 10} نقطة</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. Spiritual Tracker Tab */}
      {activeTab === 'tracker' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-right">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Sun className="w-5 h-5 text-gold-400" />
                الالتزام اليومي (الأجبية والكتاب المقدس)
              </h3>
              <span className="text-xs text-slate-400">اليوم: {new Date().toLocaleDateString('ar-EG')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div 
                onClick={() => toggleDailyItem('baker', 5)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  prayers.baker ? 'bg-gold-500/15 border-gold-400 text-gold-200' : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Sun className={`w-5 h-5 ${prayers.baker ? 'text-gold-400' : 'text-slate-500'}`} />
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center border ${
                    prayers.baker ? 'bg-gold-500 border-gold-400 text-maroon-950 font-bold' : 'border-slate-700'
                  }`}>
                    {prayers.baker && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                </div>
                <div className="font-bold text-sm">صلاة باكر</div>
                <div className="text-[11px] text-slate-400 mt-1">+5 نقاط</div>
              </div>

              <div 
                onClick={() => toggleDailyItem('ghoroub', 5)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  prayers.ghoroub ? 'bg-gold-500/15 border-gold-400 text-gold-200' : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Sunset className={`w-5 h-5 ${prayers.ghoroub ? 'text-gold-400' : 'text-slate-500'}`} />
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center border ${
                    prayers.ghoroub ? 'bg-gold-500 border-gold-400 text-maroon-950 font-bold' : 'border-slate-700'
                  }`}>
                    {prayers.ghoroub && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                </div>
                <div className="font-bold text-sm">صلاة الغروب</div>
                <div className="text-[11px] text-slate-400 mt-1">+5 نقاط</div>
              </div>

              <div 
                onClick={() => toggleDailyItem('nowm', 5)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  prayers.nowm ? 'bg-gold-500/15 border-gold-400 text-gold-200' : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Moon className={`w-5 h-5 ${prayers.nowm ? 'text-gold-400' : 'text-slate-500'}`} />
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center border ${
                    prayers.nowm ? 'bg-gold-500 border-gold-400 text-maroon-950 font-bold' : 'border-slate-700'
                  }`}>
                    {prayers.nowm && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                </div>
                <div className="font-bold text-sm">صلاة النوم</div>
                <div className="text-[11px] text-slate-400 mt-1">+5 نقاط</div>
              </div>

              <div 
                onClick={() => toggleDailyItem('bible', 5)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  prayers.bible ? 'bg-gold-500/15 border-gold-400 text-gold-200' : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <BookOpen className={`w-5 h-5 ${prayers.bible ? 'text-gold-400' : 'text-slate-500'}`} />
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center border ${
                    prayers.bible ? 'bg-gold-500 border-gold-400 text-maroon-950 font-bold' : 'border-slate-700'
                  }`}>
                    {prayers.bible && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                </div>
                <div className="font-bold text-sm">أصحاح الإنجيل</div>
                <div className="text-[11px] text-slate-400 mt-1">+5 نقاط</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-white text-base flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-gold-400" />
                    سر الاعتراف
                  </h4>
                  <span className="text-xs bg-maroon-950 text-gold-300 px-2 py-0.5 rounded border border-maroon-800">دوري</span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  آخر اعتراف: <span className="text-slate-200 font-semibold">{lastConfessionDate}</span>
                </p>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 mb-4">
                  تذكير روحي: يفضل الجلوس مع أب الاعتراف كل 3 إلى 4 أسابيع بانتظام.
                </div>
              </div>
              <button
                onClick={handleRecordConfession}
                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-gold-300 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تسجيل اعتراف جديد (+20 نقطة)</span>
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-white text-base flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-400" />
                    سر التناول المقدس
                  </h4>
                  <span className="text-xs bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">أسبوعي</span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  آخر تناول: <span className="text-slate-200 font-semibold">{lastCommunionDate}</span>
                </p>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 mb-4">
                  بركة الأسرار الإلهية والتناول من جسد الرب ودمه الأقدسين.
                </div>
              </div>
              <button
                onClick={handleRecordCommunion}
                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تسجيل تناول القداس (+15 نقطة)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Exams & Curriculum Tab */}
      {activeTab === 'exams' && (
        <div className="space-y-6 text-right">
          {!activeExam ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gold-400" />
                  الامتحانات المتاحة لمرحلتك ({getGradeTitle(user.grade)})
                </h3>
              </div>

              {availableExams.map((exam) => {
                const isCompleted = completedExams[exam.id];

                return (
                  <div
                    key={exam.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="bg-maroon-900/80 border border-maroon-700/60 text-gold-300 text-xs px-2.5 py-0.5 rounded font-semibold">
                          إلكتروني
                        </span>
                        <span className="text-xs text-slate-400">المدة: {exam.durationMinutes} دقيقة</span>
                        <span className="text-xs text-slate-400">• الدرجة: {exam.totalScore} درجة</span>
                      </div>
                      <h4 className="text-base font-bold text-white">{exam.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        يشمل أسئلة موضوعية (تصحيح فوري) وسؤالاً مقالياً يصححه الخادم.
                      </p>
                    </div>

                    <div>
                      {isCompleted ? (
                        <div className="bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs px-4 py-2 rounded-xl text-center">
                          <span className="font-bold block">تم تسليم الاختبار</span>
                          <span className="text-[11px] text-slate-300">
                            درجة الموضوعي: {isCompleted.autoScore}/20 (المقالي قيد تقدير الخادم)
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveExam(exam);
                            setExamAnswers({});
                            setExamResult(null);
                          }}
                          className="bg-gold-500 hover:bg-gold-400 text-maroon-950 font-bold text-xs py-2.5 px-5 rounded-xl transition-all shadow"
                        >
                          بدء أداء الامتحان
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Active Exam Taking Screen
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="font-bold text-white text-lg">{activeExam.title}</h3>
                  <span className="text-xs text-slate-400">مرحلة: {getGradeTitle(user.grade)}</span>
                </div>
                <button
                  onClick={() => setActiveExam(null)}
                  className="text-xs text-slate-400 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg"
                >
                  إلغاء والعودة
                </button>
              </div>

              {examResult ? (
                // Exam Result Card
                <div className="p-6 bg-slate-950/80 border border-emerald-500/40 rounded-2xl text-center space-y-3">
                  <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
                  <h4 className="text-xl font-bold text-white">تم تسليم إجاباتك بنجاح!</h4>
                  <div className="text-sm text-slate-300">
                    درجة الأسئلة الموضوعية المصححة آلياً:{' '}
                    <span className="text-gold-400 font-bold text-lg">{examResult.autoScore} / 20</span>
                  </div>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    تم إرسال إجابة السؤال المقالي إلى لوحة الخادم المسؤول لتقدير الدرجة المتبقية (10 درجات).
                  </p>
                  <button
                    onClick={() => setActiveExam(null)}
                    className="mt-4 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2 px-6 rounded-xl"
                  >
                    العودة لصفحة الامتحانات
                  </button>
                </div>
              ) : (
                // Questions Form
                <div className="space-y-6">
                  {activeExam.questions.map((q, idx) => (
                    <div key={q.id} className="bg-slate-950/60 border border-slate-800 p-5 rounded-xl space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-bold text-gold-400">السؤال {idx + 1} ({q.points} درجات)</span>
                        <span>{q.type === 'essay' ? 'سؤال مقالي' : 'تصحيح تلقائي'}</span>
                      </div>
                      <p className="text-sm font-semibold text-white leading-relaxed">{q.questionText}</p>

                      {/* Options for MCQ / True-False */}
                      {q.options && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                          {q.options.map((opt) => (
                            <label
                              key={opt}
                              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer text-xs transition-colors ${
                                examAnswers[q.id] === opt
                                  ? 'bg-gold-500/20 border-gold-400 text-gold-200'
                                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name={q.id}
                                value={opt}
                                checked={examAnswers[q.id] === opt}
                                onChange={() => setExamAnswers({ ...examAnswers, [q.id]: opt })}
                                className="accent-gold-500"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Essay text area */}
                      {q.type === 'essay' && (
                        <textarea
                          rows={4}
                          placeholder="اكتب إجابتك هنا بوضوح لتصحيحها من قبل الخادم..."
                          value={examAnswers[q.id] || ''}
                          onChange={(e) => setExamAnswers({ ...examAnswers, [q.id]: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold-400"
                        />
                      )}
                    </div>
                  ))}

                  <button
                    onClick={() => handleSubmitExam(activeExam)}
                    className="w-full bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 text-maroon-950 font-bold py-3.5 px-4 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>تسليم الامتحان ورصد الدرجات</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
