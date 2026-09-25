import React, { useState, useEffect, useRef } from 'react';
import { Church, BookOpen, QrCode, ShieldCheck, HeartHandshake, LogOut, CheckCircle2, User, Bell, ChevronLeft, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { db } from './firebase';
import AuthModal from './components/AuthModal';
import StudentDashboard from './components/StudentDashboard';
import ServantDashboard from './components/ServantDashboard';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [targetRole, setTargetRole] = useState('student');
  const [targetMode, setTargetMode] = useState('login');
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  const [notifications, setNotifications] = useState([]);

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

  // Auto-Update Detection State
  const [hasUpdate, setHasUpdate] = useState(false);
  const [appVersion, setAppVersion] = useState('1.0.4');

  useEffect(() => {
    // Check for new version from /version.json
    const checkForUpdates = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const currentLocalVer = localStorage.getItem('app_version');
          
          if (!currentLocalVer) {
            localStorage.setItem('app_version', data.version);
            setAppVersion(data.version);
          } else if (data.version && data.version !== currentLocalVer) {
            setHasUpdate(true);
            setAppVersion(data.version);
          }
        }
      } catch (err) {
        console.log('Update check skipped:', err);
      }
    };

    checkForUpdates();
    const interval = setInterval(checkForUpdates, 45000); // Check every 45 seconds
    return () => clearInterval(interval);
  }, []);

  const handleApplyUpdate = () => {
    localStorage.setItem('app_version', appVersion);
    window.location.reload(true);
  };

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
      first: 'سنة أولى ثانوي',
      second: 'سنة ثانية ثانوي',
      third: 'سنة ثالثة ثانوي',
      elisha: 'فصل أليشع (إعداد خدام)'
    };
    return map[grade] || grade || 'عام';
  };

  return (
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

            {/* User Logged in badge + Logout */}
            {currentUser && (
              <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 py-1 px-3 rounded-xl">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-800">{currentUser.fullName}</div>
                  <div className="text-[10px] text-maroon-800 font-semibold">
                    {currentUser.role === 'admin' ? 'مدير المنظومة (مسؤول عام)' : currentUser.role === 'student' ? getGradeName(currentUser.grade) : 'خادم'}
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
            )}
          </div>
        </div>
      </header>

      {/* Auto-Update Notification Banner */}
      {hasUpdate && (
        <div className="bg-gradient-to-r from-amber-500 via-gold-500 to-amber-600 text-maroon-950 font-bold px-4 py-2.5 shadow-md flex items-center justify-between text-xs sticky top-[61px] z-50 animate-in slide-in-from-top duration-300">
          <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-maroon-900 animate-spin" />
              <span>تم إطلاق تحديث جديد للمنظومة (الإصدار {appVersion})! يرجى التحديث لتطبيق التعديلات فوراً.</span>
            </div>
            <button
              onClick={handleApplyUpdate}
              className="bg-maroon-900 hover:bg-maroon-950 text-white font-bold px-3.5 py-1 rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تحديث التطبيق الآن ↻</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full flex flex-col justify-center">
        {currentUser ? (
          currentUser.role === 'student' ? (
            <StudentDashboard user={currentUser} />
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
  );
}
