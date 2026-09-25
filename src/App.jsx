import React, { useState, useEffect, useRef } from 'react';
import { Church, BookOpen, QrCode, ShieldCheck, HeartHandshake, LogOut, CheckCircle2, User, Bell, ChevronLeft, Sparkles, RefreshCw, AlertCircle, ArrowLeftRight, Eye } from 'lucide-react';
import { db } from './firebase';
import AuthModal from './components/AuthModal';
import StudentDashboard from './components/StudentDashboard';
import ServantDashboard from './components/ServantDashboard';

import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [targetRole, setTargetRole] = useState('student');
  const [targetMode, setTargetMode] = useState('login');
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [servantPreviewMode, setServantPreviewMode] = useState(false); // خادم يجرب كـ مخدوم بنفس حسابه في الفترة التجريبية

  // Real-time Firestore Notifications for Current User
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    const notifRef = collection(db, 'notifications');
    const q = query(
      notifRef,
      where('targetUserId', 'in', ['ALL', currentUser.id])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setNotifications(list);
    }, (err) => {
      console.log('Notifications listen error:', err);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  // Automatic Seamless Update Detection
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const currentLocalVer = localStorage.getItem('app_version');
          
          if (!currentLocalVer) {
            localStorage.setItem('app_version', data.version);
          } else if (data.version && data.version !== currentLocalVer) {
            // Update silently and automatically without requiring user click
            localStorage.setItem('app_version', data.version);
            window.location.reload();
          }
        }
      } catch (err) {
        // quiet fail
      }
    };

    checkForUpdates();
    const interval = setInterval(checkForUpdates, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('church_user');
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem('church_user');
      }
    }
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem('church_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('church_user');
  };

  const openAuth = (role = 'student', mode = 'login') => {
    setTargetRole(role);
    setTargetMode(mode);
    setAuthModalOpen(true);
  };

  const getGradeName = (grade) => {
    const map = {
      first: 'سنة أولى',
      second: 'سنة ثانية',
      third: 'سنة ثالثة',
      elisha: 'فصل أليشع (إعداد خدام)'
    };
    return map[grade] || grade || 'عام';
  };

  // 5-Second Splash Screen State
  const [showSplash, setShowSplash] = useState(true);
  const [splashProgress, setSplashProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 5000; // 5 seconds

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(Math.round((elapsed / duration) * 100), 100);
      setSplashProgress(progress);

      if (elapsed >= duration) {
        clearInterval(timer);
        setShowSplash(false);
      }
    }, 50);

    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {/* 5-Second Full Screen Splash Screen */}
      {showSplash && (
        <div className="fixed inset-0 z-[9999] bg-gradient-to-b from-slate-900 via-maroon-950 to-slate-950 text-white flex flex-col items-center justify-between p-8 font-cairo select-none animate-in fade-in duration-300">
          <div className="w-full flex justify-center pt-2"></div>

          {/* Center Logo & Titles */}
          <div className="flex flex-col items-center text-center space-y-6 max-w-sm px-4">
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-gold-500/30 to-amber-600/30 rounded-full blur-xl animate-pulse"></div>
              <img 
                src="/church_logo.jpg" 
                alt="شعار كنيسة القديس ماريوحنا المعمدان" 
                className="w-40 h-40 sm:w-48 sm:h-48 rounded-full border-4 border-gold-400 object-cover shadow-2xl relative z-10 ring-4 ring-gold-400/20"
              />
            </div>

            <div className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-100">
                كنيسة القديس ماريوحنا المعمدان بالمعراج - مطرانية المعادي
              </h2>
              <div className="h-0.5 w-16 bg-gold-400/60 mx-auto rounded-full"></div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gold-200 via-gold-400 to-amber-200">
                خدمة أليشع النبي وإعداد خدام
              </h1>
            </div>
          </div>

          {/* Bottom Progress Bar & Loading */}
          <div className="w-full max-w-sm space-y-3 pb-6">
            <div className="flex items-center justify-between text-xs text-gold-200/90 font-bold px-1">
              <span>جاري التحميل...</span>
              <span className="font-mono">{splashProgress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-gold-500/30 shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-gold-400 via-amber-400 to-gold-300 rounded-full transition-all duration-75 ease-out shadow-sm"
                style={{ width: `${splashProgress}%` }}
              ></div>
            </div>
            <p className="text-[11px] text-center text-gold-200/80 leading-relaxed font-medium">
              «لَيْسَ أَنْتُمُ اخْتَرْتُمُونِي بَلْ أَنَا اخْتَرْتُكُمْ وَأَقَمْتُكُمْ لِتَذْهَبُوا وَتَأْتُوا بِثَمَرٍ»
              <span className="block text-[10px] text-slate-400 mt-0.5">(يوحنا 15: 16)</span>
            </p>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-gold-500 selection:text-maroon-950 font-cairo">
      {/* Light Mode Royal Header */}
      <header className="py-3.5 px-4 border-b border-slate-200/80 bg-white shadow-sm sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <img 
              src="/church_logo.jpg" 
              alt="شعار كنيسة القديس ماريوحنا المعمدان" 
              className="w-11 h-11 rounded-full border-2 border-gold-400 object-cover shadow-sm"
            />
            <div>
              <h1 className="text-base md:text-lg font-bold text-maroon-900 leading-tight">خدمة أليشع النبي وإعداد خدام</h1>
              <p className="text-[11px] text-slate-500 font-medium">كنيسة ماريوحنا المعمدان بالمعراج - مطرانية المعادي</p>
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2.5">
            {/* Notification Bell */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(prev => !prev)}
                className="p-2 text-slate-600 hover:text-maroon-900 hover:bg-slate-100 rounded-xl transition-colors relative"
                title="التنبيهات"
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="min-w-4 h-4 px-1 bg-amber-500 text-maroon-950 font-black text-[10px] rounded-full absolute -top-1 -right-1 ring-2 ring-white flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute left-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 text-right space-y-2.5">
                  <div className="font-bold text-xs text-maroon-900 border-b border-slate-100 pb-2">
                    التنبيهات والإشعارات
                  </div>
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs font-bold">
                      لا توجد إشعارات جديدة حالياً
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                        <div className="font-bold text-slate-800">{n.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{n.desc}</div>
                        <div className="text-[10px] text-slate-400 mt-1">{n.time}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* User Logged in badge + Role Switcher (للخدام للتجربة) + Logout */}
            {currentUser && (
              <div className="flex items-center gap-2">
                {/* Switcher Button for Servants to test Student Mode */}
                {currentUser.role !== 'student' && (
                  <button
                    type="button"
                    onClick={() => setServantPreviewMode(prev => !prev)}
                    className={`text-xs font-bold py-1.5 px-3 rounded-xl transition-all shadow-xs flex items-center gap-1.5 border ${
                      servantPreviewMode
                        ? 'bg-amber-500 hover:bg-amber-600 text-maroon-950 border-amber-400 animate-pulse'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                    title="التبديل بين شاشة الخادم وتجربة شاشة المخدوم بنفس الحساب"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>{servantPreviewMode ? 'العودة لحساب الخادم ↩' : 'تجربة كـ مخدوم 🎓'}</span>
                  </button>
                )}

                <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 py-1 px-3 rounded-xl">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-bold text-slate-800">{currentUser.fullName}</div>
                    <div className="text-[10px] text-maroon-800 font-semibold">
                      {servantPreviewMode 
                        ? 'وضع التجربة (كمخدوم)' 
                        : (currentUser.role === 'admin' || currentUser.phone === '01275571569' || (currentUser.email && currentUser.email.includes('nader.kamel')))
                        ? 'مشرف التطبيق 👑' 
                        : currentUser.role === 'student' 
                        ? getGradeName(currentUser.grade) 
                        : 'خادم عام'}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="تسجيل الخروج"
                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Preview Mode Notification Banner */}
      {currentUser && currentUser.role !== 'student' && servantPreviewMode && (
        <div className="bg-amber-500 text-maroon-950 px-4 py-2 text-center text-xs font-bold border-b border-amber-600 shadow-sm flex items-center justify-center gap-2">
          <Eye className="w-4 h-4" />
          <span>أنت الآن في وضع تجربة شاشة المخدوم بنفس حسابك كخادم. يمكنك تجربة تسجيل الحضور والنوتة الروحية والامتحانات كأنك مخدوم تماماً.</span>
          <button
            type="button"
            onClick={() => setServantPreviewMode(false)}
            className="underline mr-2 hover:text-white"
          >
            إلغاء وضع التجربة
          </button>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full flex flex-col justify-center">
        {currentUser ? (
          currentUser.role === 'student' || servantPreviewMode ? (
            <StudentDashboard user={{ ...currentUser, role: 'student', grade: currentUser.grade || 'first' }} />
          ) : (
            <ServantDashboard user={currentUser} />
          )
        ) : (
          /* Landing Screen: Clean, Direct Entry */
          <div className="w-full max-w-xl mx-auto text-center space-y-8 py-8">
            <div>
              <span className="inline-block bg-maroon-50 border border-maroon-200 text-maroon-900 px-4 py-1 rounded-full text-xs font-bold mb-3 shadow-xs">
                كنيسة القديس ماريوحنا المعمدان بالمعراج
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-snug">
                خدمة أليشع النبي وإعداد خدام
              </h2>
            </div>

            {/* Direct 2 Action Cards: تسجيل الدخول & مستخدم جديد */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
              {/* Login Card */}
              <button
                type="button"
                onClick={() => openAuth('student', 'login')}
                className="bg-maroon-800 hover:bg-maroon-900 text-white p-6 rounded-3xl transition-all hover:shadow-xl group flex flex-col items-center justify-center gap-3 border border-maroon-700"
              >
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                  <User className="w-7 h-7 text-gold-300" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold">تسجيل الدخول</h3>
                  <p className="text-xs text-slate-200 mt-1">لديك حساب مسجل بالفعل؟ ادخل برقم هاتفك</p>
                </div>
              </button>

              {/* Register Card */}
              <button
                type="button"
                onClick={() => openAuth('student', 'register')}
                className="bg-white hover:bg-slate-50 text-slate-800 p-6 rounded-3xl border-2 border-slate-200 hover:border-maroon-800 transition-all hover:shadow-xl group flex flex-col items-center justify-center gap-3"
              >
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center font-bold group-hover:scale-110 transition-transform border border-amber-200">
                  <Sparkles className="w-7 h-7 text-maroon-800" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-maroon-800 transition-colors">مستخدم جديد</h3>
                  <p className="text-xs text-slate-500 mt-1">إنشاء حساب جديد كخادم أو مخدوم</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 px-4 border-t border-slate-200 text-center text-xs text-slate-400 bg-white">
        <p>كنيسة القديس ماريوحنا المعمدان بالمعراج - إيبارشية المعادي © {new Date().getFullYear()}</p>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialRole={targetRole}
        initialMode={targetMode}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
    </>
  );
}
