import React, { useState, useEffect } from 'react';
import { 
  QrCode, Calendar, Award, CheckCircle2, Clock, AlertTriangle, BookOpen, 
  Flame, Camera, Heart, Check, Sun, Sunset, Moon, Sparkles, ShieldCheck,
  FileText, Send, CheckCircle
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

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

  // Time window calculation
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
    }, 1200);
  };

  const toggleDailyItem = (key, pts) => {
    setPrayers(prev => {
      const next = !prev[key];
      setPoints(p => next ? p + pts : Math.max(0, p - pts));
      return { ...prev, [key]: next };
    });
  };

  const handleRecordCommunion = () => {
    setLastCommunionDate(new Date().toLocaleDateString('ar-EG'));
    setPoints(p => p + 15);
  };

  const handleRecordConfession = () => {
    setLastConfessionDate(new Date().toLocaleDateString('ar-EG'));
    setPoints(p => p + 20);
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
      autoScore: autoScore,
      maxAutoScore: 20,
      essayPending: true,
      essayAnswer: examAnswers['q3'] || '',
      submittedAt: new Date().toLocaleTimeString('ar-EG')
    };

    setExamResult(result);
    setCompletedExams(prev => ({ ...prev, [exam.id]: result }));
    setPoints(p => p + autoScore);

    try {
      await addDoc(collection(db, 'exam_submissions'), {
        userId: user.id,
        userName: user.fullName,
        grade: user.grade,
        examId: exam.id,
        examTitle: exam.title,
        autoScore: autoScore,
        essayAnswer: examAnswers['q3'] || '',
        essayScore: null,
        status: 'pending_essay',
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
    }
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

  // Calculate today's completed prayers percentage
  const completedPrayersCount = Object.values(prayers).filter(Boolean).length;
  const spiritualProgressPct = Math.round((completedPrayersCount / 4) * 100);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-20 sm:pb-6">
      {/* Student Profile Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-right">
          <div className="w-12 h-12 rounded-xl bg-gold-500/20 border border-gold-400/30 text-gold-300 flex items-center justify-center font-bold text-lg shrink-0">
            {user.fullName ? user.fullName[0] : 'م'}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">{user.fullName}</h2>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="bg-maroon-900/80 border border-maroon-700/60 text-gold-300 px-2 py-0.5 rounded font-semibold text-[11px]">
                {getGradeTitle(user.grade)}
              </span>
              <span className="hidden sm:inline">الهاتف: {user.phone}</span>
            </div>
          </div>
        </div>

        {/* Quick Compact Stats */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 block">أيام التوالي</span>
            <span className="text-xs font-bold text-amber-400 flex items-center justify-center gap-0.5">
              <Flame className="w-3 h-3 text-amber-500" />
              {streakDays} يوم
            </span>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 block">النقاط</span>
            <span className="text-xs font-bold text-gold-400">{points}</span>
          </div>
        </div>
      </div>

      {/* Pro Max Navigation Tabs (Desktop Header / Mobile Floating Bar) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-1.5 flex items-center justify-around text-xs font-bold sticky top-16 z-30 backdrop-blur-md">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
            activeTab === 'attendance'
              ? 'bg-gold-500 text-maroon-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>حضور الخدمة</span>
        </button>

        <button
          onClick={() => setActiveTab('tracker')}
          className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
            activeTab === 'tracker'
              ? 'bg-gold-500 text-maroon-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>الدفتر الروحي</span>
        </button>

        <button
          onClick={() => setActiveTab('exams')}
          className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
            activeTab === 'exams'
              ? 'bg-gold-500 text-maroon-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>الامتحانات</span>
        </button>
      </div>

      {/* 1. Attendance Tab */}
      {activeTab === 'attendance' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                  <Camera className="w-5 h-5 text-gold-400" />
                  تسجيل الحضور بالكاميرا
                </h3>
                <span className="text-[11px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Clock className="w-3 h-3 text-gold-400" />
                  {currentTimeStr}
                </span>
              </div>

              {/* Status Banner */}
              <div className={`p-3 rounded-xl border text-xs mb-4 flex items-center gap-2.5 ${
                isWithinTime || bypassTime
                  ? 'bg-emerald-950/40 border-emerald-600/40 text-emerald-200'
                  : 'bg-amber-950/40 border-amber-600/40 text-amber-200'
              }`}>
                {isWithinTime || bypassTime ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span>
                  {isWithinTime || bypassTime
                    ? 'نافذة الحضور مفتوحة الآن (10:30 ص إلى 02:00 م)'
                    : 'تسجيل الحضور متاح الجمعة من 10:30 ص حتى 02:00 م فقط'}
                </span>
              </div>

              {/* Viewport */}
              <div className="relative bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl h-60 flex flex-col items-center justify-center overflow-hidden">
                {scanning ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-3 border-gold-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs font-semibold text-gold-300">جاري قراءة الكود...</span>
                  </div>
                ) : attendanceStatus === 'success' ? (
                  <div className="flex flex-col items-center gap-2 p-6 text-center">
                    <CheckCircle className="w-12 h-12 text-emerald-400 animate-bounce" />
                    <span className="text-sm font-bold text-emerald-300">تم تسجيل حضورك اليوم بنجاح!</span>
                    <span className="text-[11px] text-slate-400">+10 نقاط إنجاز أضيفت لرصيدك</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center px-4">
                    <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-slate-400 border border-slate-800">
                      <QrCode className="w-6 h-6 text-gold-400" />
                    </div>
                    <p className="text-xs font-bold text-white">وجه الكاميرا نحو كود الخدمة المعروض</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <button
                onClick={handleSimulateScan}
                disabled={(!isWithinTime && !bypassTime) || scanning || attendanceStatus === 'success'}
                className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm shadow transition-all flex items-center justify-center gap-2 ${
                  attendanceStatus === 'success'
                    ? 'bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 cursor-not-allowed'
                    : (isWithinTime || bypassTime)
                    ? 'bg-gold-500 hover:bg-gold-400 text-maroon-950 cursor-pointer shadow-gold-500/10'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>
                  {attendanceStatus === 'success'
                    ? 'تم تسجيل حضورك اليوم'
                    : scanning
                    ? 'جاري المسح...'
                    : (isWithinTime || bypassTime)
                    ? 'مسح الكود وتسجيل الحضور'
                    : 'التسجيل متاح فقط أثناء وقت الخدمة'}
                </span>
              </button>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>للتجربة خارج ميعاد الخدمة:</span>
                <button
                  type="button"
                  onClick={() => setBypassTime(!bypassTime)}
                  className="text-gold-400 hover:underline"
                >
                  {bypassTime ? 'إلغاء وضع التجربة' : 'تفعيل وضع التجربة'}
                </button>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col">
            <h3 className="font-bold text-white text-xs sm:text-sm mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gold-400" />
              سجل الحضور الأخير
            </h3>

            <div className="space-y-2 flex-1 overflow-y-auto">
              {attendanceRecords.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="font-semibold text-slate-200 block text-xs">{item.date}</span>
                      <span className="text-[10px] text-slate-400">{item.time || '11:00 ص'}</span>
                    </div>
                  </div>
                  <span className="text-gold-400 font-bold text-[11px]">+{item.points || 10}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. Spiritual Tracker Tab with Visual Progress */}
      {activeTab === 'tracker' && (
        <div className="space-y-6">
          {/* Progress Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-right">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-white text-sm sm:text-base">الالتزام اليومي</h3>
                <span className="text-xs text-slate-400">إنجاز اليوم: {completedPrayersCount} من 4</span>
              </div>
              <span className="text-sm font-bold text-gold-400">{spiritualProgressPct}%</span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mb-5">
              <div 
                className="bg-gradient-to-r from-gold-500 to-amber-400 h-full transition-all duration-500 rounded-full"
                style={{ width: `${spiritualProgressPct}%` }}
              ></div>
            </div>

            {/* Daily Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { key: 'baker', label: 'صلاة باكر', icon: Sun },
                { key: 'ghoroub', label: 'صلاة الغروب', icon: Sunset },
                { key: 'nowm', label: 'صلاة النوم', icon: Moon },
                { key: 'bible', label: 'أصحاح الإنجيل', icon: BookOpen }
              ].map(({ key, label, icon: Icon }) => (
                <div
                  key={key}
                  onClick={() => toggleDailyItem(key, 5)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between h-24 ${
                    prayers[key]
                      ? 'bg-gold-500/15 border-gold-400 text-gold-200'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`w-4 h-4 ${prayers[key] ? 'text-gold-400' : 'text-slate-500'}`} />
                    <div className={`w-5 h-5 rounded flex items-center justify-center border text-[10px] ${
                      prayers[key] ? 'bg-gold-500 border-gold-400 text-maroon-950 font-bold' : 'border-slate-700'
                    }`}>
                      {prayers[key] && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-xs">{label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">+5 نقاط</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sacraments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-right">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-gold-400" />
                    سر الاعتراف
                  </h4>
                  <span className="text-[10px] bg-maroon-950 text-gold-300 px-2 py-0.5 rounded border border-maroon-800">دوري</span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  آخر اعتراف: <span className="text-slate-200 font-semibold">{lastConfessionDate}</span>
                </p>
              </div>
              <button
                onClick={handleRecordConfession}
                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-gold-300 font-bold py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>تسجيل اعتراف جديد (+20)</span>
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-400" />
                    سر التناول المقدس
                  </h4>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">أسبوعي</span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  آخر تناول: <span className="text-slate-200 font-semibold">{lastCommunionDate}</span>
                </p>
              </div>
              <button
                onClick={handleRecordCommunion}
                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 font-bold py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>تسجيل تناول القداس (+15)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Exams Tab */}
      {activeTab === 'exams' && (
        <div className="space-y-4 text-right">
          {!activeExam ? (
            availableExams.map((exam) => {
              const isCompleted = completedExams[exam.id];
              return (
                <div
                  key={exam.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-maroon-900/80 border border-maroon-700/60 text-gold-300 text-[11px] px-2 py-0.5 rounded font-semibold">
                        إلكتروني
                      </span>
                      <span className="text-xs text-slate-400">{exam.durationMinutes} دقيقة • {exam.totalScore} درجة</span>
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-white">{exam.title}</h4>
                  </div>

                  {isCompleted ? (
                    <div className="bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs px-3 py-1.5 rounded-xl">
                      تم التسليم (درجة الموضوعي: {isCompleted.autoScore}/20)
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setActiveExam(exam);
                        setExamAnswers({});
                        setExamResult(null);
                      }}
                      className="bg-gold-500 hover:bg-gold-400 text-maroon-950 font-bold text-xs py-2 px-4 rounded-xl transition-all shadow"
                    >
                      بدء الامتحان
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm sm:text-base">{activeExam.title}</h3>
                <button
                  onClick={() => setActiveExam(null)}
                  className="text-xs text-slate-400 hover:text-white bg-slate-800 px-3 py-1 rounded-lg"
                >
                  إلغاء
                </button>
              </div>

              {examResult ? (
                <div className="p-6 bg-slate-950/80 border border-emerald-500/40 rounded-xl text-center space-y-2">
                  <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
                  <h4 className="text-base font-bold text-white">تم تسليم الاختبار!</h4>
                  <div className="text-xs text-slate-300">
                    الدرجة الفورية (الموضوعي): <span className="text-gold-400 font-bold text-sm">{examResult.autoScore} / 20</span>
                  </div>
                  <button
                    onClick={() => setActiveExam(null)}
                    className="mt-3 bg-slate-800 text-white text-xs font-bold py-1.5 px-4 rounded-lg"
                  >
                    العودة
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeExam.questions.map((q, idx) => (
                    <div key={q.id} className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="font-bold text-gold-400">س {idx + 1} ({q.points} درجات)</span>
                        <span>{q.type === 'essay' ? 'مقالي' : 'تصحيح تلقائي'}</span>
                      </div>
                      <p className="font-semibold text-white leading-relaxed">{q.questionText}</p>

                      {q.options && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt) => (
                            <label
                              key={opt}
                              className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                                examAnswers[q.id] === opt
                                  ? 'bg-gold-500/20 border-gold-400 text-gold-200'
                                  : 'bg-slate-900 border-slate-800 text-slate-300'
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

                      {q.type === 'essay' && (
                        <textarea
                          rows={3}
                          placeholder="اكتب إجابتك هنا..."
                          value={examAnswers[q.id] || ''}
                          onChange={(e) => setExamAnswers({ ...examAnswers, [q.id]: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-gold-400"
                        />
                      )}
                    </div>
                  ))}

                  <button
                    onClick={() => handleSubmitExam(activeExam)}
                    className="w-full bg-gold-500 hover:bg-gold-400 text-maroon-950 font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>تسليم الاختبار</span>
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
