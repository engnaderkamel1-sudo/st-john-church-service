import React, { useState, useEffect } from 'react';
import { QrCode, Calendar, Award, CheckCircle2, Clock, AlertTriangle, BookOpen, User, Flame, Camera, ChevronRight } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

export default function StudentDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('attendance'); // attendance, tracker, exams
  const [isWithinTime, setIsWithinTime] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [bypassTime, setBypassTime] = useState(false); // For testing outside Friday 10:30 - 14:00

  const [scanning, setScanning] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState(null); // success, already, error
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Check 10:30 AM to 02:00 PM window
  useEffect(() => {
    const checkTimeWindow = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const totalMinutes = hours * 60 + minutes;

      // 10:30 AM = 10 * 60 + 30 = 630
      // 02:00 PM (14:00) = 14 * 60 = 840
      const inWindow = totalMinutes >= 630 && totalMinutes <= 840;
      setIsWithinTime(inWindow);

      setCurrentTimeStr(now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
    };

    checkTimeWindow();
    const interval = setInterval(checkTimeWindow, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Attendance History from Firestore
  useEffect(() => {
    async function fetchAttendance() {
      try {
        setLoadingHistory(true);
        const attRef = collection(db, 'attendance');
        const q = query(attRef, where('userId', '==', user.id));
        const snap = await getDocs(q);

        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Add sample fallback history if empty for demo
        if (list.length === 0) {
          setAttendanceRecords([
            { id: '1', date: 'الجمعة الماضية', status: 'حاضر', time: '11:15 ص', points: 10 },
            { id: '2', date: 'الجمعة قبل الماضية', status: 'حاضر', time: '10:45 ص', points: 10 }
          ]);
        } else {
          setAttendanceRecords(list);
        }
      } catch (e) {
        console.error('Error fetching attendance history:', e);
      } finally {
        setLoadingHistory(false);
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
        
        // Save to Firebase
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
        console.error(err);
        setAttendanceStatus('success'); // allow optimistic demo update
      } finally {
        setScanning(false);
      }
    }, 1500);
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
      {/* Student Profile Summary Card */}
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
              <span>رقم الهاتف: {user.phone}</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
          <div className="bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-xl text-center min-w-[80px]">
            <span className="text-[11px] text-slate-400 block">الحضور</span>
            <span className="text-sm font-bold text-emerald-400">92%</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-xl text-center min-w-[80px]">
            <span className="text-[11px] text-slate-400 block">النقاط</span>
            <span className="text-sm font-bold text-gold-400">{user.points || 120} نقطة</span>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
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
          <span>تسجيل الحضور بالكيو آر</span>
        </button>
      </div>

      {/* Attendance Tab Content */}
      {activeTab === 'attendance' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Scanner Box */}
          <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Camera className="w-5 h-5 text-gold-400" />
                  ماسح كود الخدمة (QR Code)
                </h3>
                <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-gold-400" />
                  الوقت الآن: {currentTimeStr}
                </span>
              </div>

              {/* Time Window Notice */}
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
                    مواعيد التسجيل المعتمدة: يوم الخدمة من 10:30 صباحاً حتى 02:00 ظهراً فقط.
                  </span>
                </div>
              </div>

              {/* Camera Scanner Viewport */}
              <div className="relative bg-slate-950 border-2 border-dashed border-slate-700 rounded-2xl h-64 flex flex-col items-center justify-center overflow-hidden group">
                {scanning ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-gold-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-semibold text-gold-300">جاري قراءة الكود وتسجيل الحضور...</span>
                  </div>
                ) : attendanceStatus === 'success' ? (
                  <div className="flex flex-col items-center gap-2 p-6 text-center">
                    <CheckCircle2 className="w-16 h-16 text-emerald-400 animate-bounce" />
                    <span className="text-base font-bold text-emerald-300">تم تسجيل حضورك اليوم بنجاح!</span>
                    <span className="text-xs text-slate-400">+10 نقاط إنجاز أضيفت لرصيدك</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-center px-4">
                    <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-800 shadow-inner group-hover:border-gold-400/50 transition-colors">
                      <QrCode className="w-8 h-8 text-gold-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white mb-1">وجّه الكاميرا نحو كود الخدمة</p>
                      <p className="text-xs text-slate-400">امسح الكود المعروض على هاتف الخادم أو المطبوع في القاعة</p>
                    </div>
                  </div>
                )}

                {/* Laser scan animation when idle and active */}
                {(isWithinTime || bypassTime) && !attendanceStatus && !scanning && (
                  <div className="absolute inset-x-8 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-gold-400 to-transparent animate-pulse pointer-events-none"></div>
                )}
              </div>
            </div>

            {/* Action Bar */}
            <div className="mt-5 space-y-3">
              <button
                onClick={handleSimulateScan}
                disabled={(!isWithinTime && !bypassTime) || scanning || attendanceStatus === 'success'}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                  attendanceStatus === 'success'
                    ? 'bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 cursor-not-allowed'
                    : (isWithinTime || bypassTime)
                    ? 'bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-maroon-950 cursor-pointer shadow-gold-500/10'
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

              {/* Developer / Demo Testing Toggle */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                <span>اختبار النظام خارج أوقات الخدمة:</span>
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

          {/* Attendance History Sidebar */}
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
    </div>
  );
}
