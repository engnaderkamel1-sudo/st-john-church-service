import React, { useState, useEffect } from 'react';
import { 
  QrCode, Calendar, Award, CheckCircle2, Clock, AlertTriangle, BookOpen, 
  Flame, Camera, Heart, Check, Sun, Sunset, Moon, Sparkles, ShieldCheck,
  FileText, Send, CheckCircle, HelpCircle, Bell, ChevronLeft, Download,
  Lock, AlertCircle, CheckSquare, Layers
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, doc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

export default function StudentDashboard({ user }) {
  // 6 Specified Tabs: 'attendance', 'spiritual_diary', 'curriculum', 'exams', 'tasks', 'announcements'
  const [activeTab, setActiveTab] = useState('attendance');
  const [isWithinTime, setIsWithinTime] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [bypassTime, setBypassTime] = useState(false);
  const [servantOpenedAccess, setServantOpenedAccess] = useState(null);

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
        if (data.isOpenForAll && new Date(data.validUntil) > new Date()) {
          setBypassTime(true);
          setServantOpenedAccess({ openedBy: data.openedBy, type: 'all' });
        }
      }
    });

    const unsubSpecific = onSnapshot(doc(db, 'remote_access', user.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
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

  const handleToggleDiaryItem = (key, pts) => {
    if (!isEditableDate) return;

    setDiaryRecords(prev => {
      const currentDayData = prev[selectedDiaryDate] || { baker: false, ghoroub: false, nowm: false, bible: false, communion: false, confession: false };
      const nextVal = !currentDayData[key];
      const updatedDay = { ...currentDayData, [key]: nextVal };

      setPoints(p => nextVal ? p + pts : Math.max(0, p - pts));
      return { ...prev, [selectedDiaryDate]: updatedDay };
    });
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
    const titles = { first: 'سنة أولى ثانوي', second: 'سنة ثانية ثانوي', third: 'سنة ثالثة ثانوي', elisha: 'فصل أليشع (إعداد خدام)' };
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

      {/* 1. Tab: Attendance */}
      {activeTab === 'attendance' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-right">
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <Camera className="w-5 h-5 text-maroon-800" />
                  تسجيل الحضور بالكيو آر (QR Code)
                </h3>
                <span className="text-[11px] bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-maroon-800" />
                  الوقت الآن: {currentTimeStr}
                </span>
              </div>

              <div className={`p-3.5 rounded-2xl border text-xs mb-4 flex items-center gap-2.5 ${
                isWithinTime || bypassTime
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                {isWithinTime || bypassTime ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                <div className="font-medium">
                  {servantOpenedAccess ? (
                    <span>
                      🎯 تم فتح تسجيل الحضور استثنائياً لك بواسطة الخادم ({servantOpenedAccess.openedBy}). يمكنك تسجيل حضورك الآن!
                    </span>
                  ) : isWithinTime || bypassTime ? (
                    <span>نافذة الحضور مفتوحة الآن (10:30 ص إلى 02:00 م)</span>
                  ) : (
                    <span>التسجيل متاح أثناء فترة الخدمة (الجمعة 10:30 ص إلى 02:00 م فقط)</span>
                  )}
                </div>
              </div>

              <div className="relative bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl h-60 flex flex-col items-center justify-center overflow-hidden">
                {scanning ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-3 border-maroon-800 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs font-bold text-maroon-900">جاري قراءة الكود...</span>
                  </div>
                ) : attendanceStatus === 'success' ? (
                  <div className="flex flex-col items-center gap-2 p-6 text-center">
                    <CheckCircle className="w-14 h-14 text-emerald-600 animate-bounce" />
                    <span className="text-sm font-extrabold text-slate-900">تم تسجيل حضورك بنجاح!</span>
                    <span className="text-xs text-emerald-700 font-bold">+10 نقاط إنجاز أضيفت لرصيدك</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center px-4">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-maroon-800 border border-slate-200 shadow-xs">
                      <QrCode className="w-7 h-7" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">وجه الكاميرا نحو كود الخدمة المطبوع أو هاتف الخادم</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <button
                onClick={handleSimulateScan}
                disabled={(!isWithinTime && !bypassTime) || scanning || attendanceStatus === 'success'}
                className={`w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                  attendanceStatus === 'success'
                    ? 'bg-emerald-100 text-emerald-800 cursor-not-allowed'
                    : (isWithinTime || bypassTime)
                    ? 'bg-maroon-800 hover:bg-maroon-700 text-white shadow-md'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>
                  {attendanceStatus === 'success' ? 'تم تسجيل حضور اليوم' : scanning ? 'جاري المسح...' : 'فتح الكاميرا ومسح الكود'}
                </span>
              </button>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>وضع الاختبار للتجربة خارج الوقت:</span>
                <button type="button" onClick={() => setBypassTime(!bypassTime)} className="text-maroon-800 font-bold hover:underline">
                  {bypassTime ? 'إلغاء وضع التجربة' : 'تفعيل للتجربة'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col">
            <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-maroon-800" />
              سجل الحضور الأخير
            </h3>

            <div className="space-y-2 flex-1 overflow-y-auto">
              {attendanceRecords.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <p className="font-bold">لا يوجد حضور مسجل بعد.</p>
                  <p className="text-[10px] mt-1">امسح رمز الـ QR خلال موعد الخدمة لتسجيل حضورك.</p>
                </div>
              ) : (
                attendanceRecords.map((item) => (
                  <div key={item.id} className="bg-slate-50 border border-slate-100 p-3 rounded-2xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <div>
                        <span className="font-bold text-slate-800 block text-xs">{item.date}</span>
                        <span className="text-[10px] text-slate-400">{item.time}</span>
                      </div>
                    </div>
                    <span className="text-maroon-800 font-bold text-[11px]">+{item.points} نقاط</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Tab: Spiritual Diary (With 2-Day Edit Lock Rule) */}
      {activeTab === 'spiritual_diary' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 text-right">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Sun className="w-5 h-5 text-gold-500" />
                النوتة الروحية اليومية
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                يمكنك تسجيل أو تعديل النوتة الروحية <strong className="text-maroon-800">لليوم ولليوم السابق فقط</strong> لضمان أمانة المتابعة.
              </p>
            </div>

            {/* Date Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">اختر اليوم:</span>
              <select
                value={selectedDiaryDate}
                onChange={(e) => setSelectedDiaryDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-maroon-800"
              >
                <option value={todayDateStr}>اليوم ({todayDateStr})</option>
                <option value={yesterdayDateStr}>أمس ({yesterdayDateStr})</option>
              </select>
            </div>
          </div>

          {/* Editability Alert Badge */}
          {isEditableDate ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-2xl flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>متاح التسجيل والتعديل لهذا اليوم (اليوم أو الأمس). اضغط على أي بند لتفعيله.</span>
            </div>
          ) : (
            <div className="bg-slate-100 border border-slate-200 text-slate-600 text-xs p-3 rounded-2xl flex items-center gap-2 font-medium">
              <Lock className="w-4 h-4 text-slate-500 shrink-0" />
              <span>هذا اليوم مؤرشف للقراءة فقط ولا يمكن تعديله (تجاوز فترة اليومين المسموح بها).</span>
            </div>
          )}

          {/* Daily Prayers Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: 'baker', label: 'صلاة باكر', icon: Sun, pts: 5 },
              { key: 'ghoroub', label: 'صلاة الغروب', icon: Sunset, pts: 5 },
              { key: 'nowm', label: 'صلاة النوم', icon: Moon, pts: 5 },
              { key: 'bible', label: 'أصحاح الإنجيل', icon: BookOpen, pts: 5 }
            ].map(({ key, label, icon: Icon, pts }) => {
              const checked = currentDayDiary[key];
              return (
                <div
                  key={key}
                  onClick={() => isEditableDate && handleToggleDiaryItem(key, pts)}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between h-28 ${
                    !isEditableDate ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                  } ${
                    checked
                      ? 'bg-amber-50/60 border-amber-300 text-amber-950 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`w-5 h-5 ${checked ? 'text-amber-600' : 'text-slate-400'}`} />
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center border text-xs ${
                      checked ? 'bg-amber-500 border-amber-500 text-white font-bold' : 'border-slate-300 bg-white'
                    }`}>
                      {checked && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>
                  </div>
                  <div>
                    <div className="font-extrabold text-xs">{label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">+{pts} نقاط</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sacraments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="font-extrabold text-xs text-slate-800 block">سر التناول المقدس</span>
                <span className="text-[11px] text-slate-500">التناول الأسبوعي في القداس</span>
              </div>
              <button
                disabled={!isEditableDate}
                onClick={() => handleToggleDiaryItem('communion', 15)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                  currentDayDiary.communion
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {currentDayDiary.communion ? 'تم التناول ✓' : 'تسجيل التناول (+15)'}
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="font-extrabold text-xs text-slate-800 block">سر التوبة والاعتراف</span>
                <span className="text-[11px] text-slate-500">الجلوس مع أب الاعتراف دورياً</span>
              </div>
              <button
                disabled={!isEditableDate}
                onClick={() => handleToggleDiaryItem('confession', 20)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                  currentDayDiary.confession
                    ? 'bg-maroon-800 text-white border-maroon-800'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {currentDayDiary.confession ? 'تم الاعتراف ✓' : 'تسجيل الاعتراف (+20)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Tab: Curriculum Divided by Subject */}
      {activeTab === 'curriculum' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 text-right">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-maroon-800" />
              المنهج الدراسي مقسم حسب المواد ({getGradeTitle(user.grade)})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">اختر المادة لتصفح المراجع والملخصات والمادة العلمية المرفوعة من الخدام.</p>
          </div>

          {!selectedSubject ? (
            subjectsData.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">لم يتم رفع مواد أو مراجع دراسية لهذه المرحلة حتى الآن.</p>
                <p className="text-[11px] text-slate-400 mt-1">سيقوم الخدام بإضافة المواد والمراجع والمذكرات تباعاً.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {subjectsData.map((sub) => (
                  <div
                    key={sub.id}
                    onClick={() => setSelectedSubject(sub)}
                    className="bg-slate-50 border border-slate-200 hover:border-maroon-700 p-5 rounded-2xl cursor-pointer transition-all hover:shadow-md group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] bg-maroon-100 text-maroon-900 font-extrabold px-2.5 py-0.5 rounded-full">
                          {sub.code}
                        </span>
                        <span className="text-xs text-slate-400 font-bold">{sub.materialsCount} مراجع</span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-base group-hover:text-maroon-800 transition-colors mb-1">
                        {sub.name}
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed mb-4">{sub.description}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-maroon-800 pt-3 border-t border-slate-200/60">
                      <span>فتح مراجع المادة</span>
                      <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            // Inside Subject View
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">{selectedSubject.name}</h4>
                  <span className="text-xs text-slate-500">المراجع والمذكرات العلمية المتاحة</span>
                </div>
                <button
                  onClick={() => setSelectedSubject(null)}
                  className="text-xs font-bold text-maroon-800 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200"
                >
                  ← العودة لكل المواد
                </button>
              </div>

              <div className="space-y-3">
                {selectedSubject.materials.map((mat) => (
                  <div
                    key={mat.id}
                    className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <h5 className="font-bold text-slate-900 text-sm">{mat.title}</h5>
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        ملف {mat.type} • {mat.size} • تاريخ الرفع: {mat.date}
                      </span>
                    </div>
                    <button
                      onClick={() => alert(`جاري تنزيل: ${mat.title}`)}
                      className="bg-white hover:bg-maroon-50 text-maroon-800 border border-slate-200 hover:border-maroon-300 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تحميل</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Tab: Exams */}
      {activeTab === 'exams' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5 text-right">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-maroon-800" />
              الامتحانات المتاحة ({getGradeTitle(user.grade)})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">امتحانات معينة من الخدام لمرحلتك الدراسية.</p>
          </div>

          {!activeExam ? (
            availableExams.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">لا توجد أي امتحانات مجدولة لمرحلتك حالياً.</p>
                <p className="text-[11px] text-slate-400 mt-1">عند نشر الخدام لأي اختبار ستظهر تفاصيله هنا مباشرة.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableExams.map((exam) => {
                  const isCompleted = completedExams[exam.id];
                  return (
                    <div
                      key={exam.id}
                      className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-maroon-800 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                            {exam.subject}
                          </span>
                          <span className="text-xs text-slate-500">{exam.durationMinutes} دقيقة • {exam.totalScore} درجة</span>
                        </div>
                        <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">{exam.title}</h4>
                      </div>

                      {isCompleted ? (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2 rounded-xl font-bold">
                          تم التسليم (الموضوعي: {isCompleted.autoScore}/20)
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveExam(exam);
                            setExamAnswers({});
                            setExamResult(null);
                          }}
                          className="bg-maroon-800 hover:bg-maroon-700 text-white font-bold text-xs py-2.5 px-5 rounded-xl transition-all shadow"
                        >
                          بدء الامتحان
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            // Taking Exam Screen
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h4 className="font-extrabold text-slate-900 text-base">{activeExam.title}</h4>
                <button onClick={() => setActiveExam(null)} className="text-xs text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-xl">
                  إلغاء والعودة
                </button>
              </div>

              {examResult ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                  <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
                  <h4 className="text-base font-extrabold text-slate-900">تم تسليم إجاباتك بنجاح!</h4>
                  <div className="text-xs text-slate-600">
                    درجة الأسئلة الموضوعية: <strong className="text-maroon-800 text-sm">{examResult.autoScore} / 20</strong> (المقالي قيد مراجعة الخادم)
                  </div>
                  <button onClick={() => setActiveExam(null)} className="mt-3 bg-white border border-slate-300 text-slate-700 text-xs font-bold py-2 px-5 rounded-xl">
                    العودة لصفحة الامتحانات
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeExam.questions.map((q, idx) => (
                    <div key={q.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-500 font-bold">
                        <span>السؤال {idx + 1} ({q.points} درجات)</span>
                        <span>{q.type === 'essay' ? 'سؤال مقالي' : 'تصحيح تلقائي'}</span>
                      </div>
                      <p className="font-bold text-slate-800 leading-relaxed text-sm">{q.questionText}</p>

                      {q.options && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt) => (
                            <label
                              key={opt}
                              className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                                examAnswers[q.id] === opt ? 'bg-maroon-50 border-maroon-800 text-maroon-900 font-bold' : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              <input
                                type="radio"
                                name={q.id}
                                value={opt}
                                checked={examAnswers[q.id] === opt}
                                onChange={() => setExamAnswers({ ...examAnswers, [q.id]: opt })}
                                className="accent-maroon-800"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {q.type === 'essay' && (
                        <textarea
                          rows={3}
                          placeholder="اكتب إجابتك هنا بوضوح لتصحيحها من قبل الخادم..."
                          value={examAnswers[q.id] || ''}
                          onChange={(e) => setExamAnswers({ ...examAnswers, [q.id]: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-maroon-800"
                        />
                      )}
                    </div>
                  ))}

                  <button
                    onClick={() => handleSubmitExam(activeExam)}
                    className="w-full bg-maroon-800 hover:bg-maroon-700 text-white font-bold py-3 px-4 rounded-xl text-xs shadow flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>تسليم الاختبار النهائي</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
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
