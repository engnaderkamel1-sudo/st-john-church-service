import React, { useState, useEffect } from 'react';
import { Church, BookOpen, QrCode, ShieldCheck, HeartHandshake, LogOut, CheckCircle2, User, Bell, ChevronLeft } from 'lucide-react';
import { db } from './firebase';
import AuthModal from './components/AuthModal';
import StudentDashboard from './components/StudentDashboard';
import ServantDashboard from './components/ServantDashboard';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [targetRole, setTargetRole] = useState('student');
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: 1, title: 'تذكير بميعاد الخدمة', desc: 'نافذة تسجيل الحضور بالـ QR تفتح الجمعة 10:30 ص حتى 02:00 م', time: 'اليوم' },
    { id: 2, title: 'امتحان جديد متاح', desc: 'تم فتح امتحان منتصف الفصل لمرحلتك', time: 'أمس' }
  ];

  // Load saved session
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

  const openAuth = (role) => {
    setTargetRole(role);
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-gold-500 selection:text-maroon-950 font-cairo">
      {/* Clean Pro Max Header (No duplicate buttons) */}
      <header className="py-3 px-4 border-b border-slate-800/80 bg-maroon-950/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <img 
              src="/church_logo.jpg" 
              alt="شعار كنيسة القديس ماريوحنا المعمدان" 
              className="w-11 h-11 rounded-full border-2 border-gold-400 object-cover shadow"
            />
            <div>
              <h1 className="text-base md:text-lg font-bold text-gold-300 leading-tight">كنيسة ماريوحنا المعمدان بالمعراج</h1>
              <p className="text-[11px] text-slate-300">مطرانية الأقباط الأرثوذكس بالمعادي</p>
            </div>
          </div>

          {/* Right Action Icons (Notifications & Profile/Logout) */}
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-300 hover:text-gold-300 hover:bg-slate-800/60 rounded-xl transition-colors relative"
                title="التنبيهات"
              >
                <Bell className="w-5 h-5" />
                <span className="w-2 h-2 bg-amber-400 rounded-full absolute top-1.5 right-1.5 ring-2 ring-maroon-950"></span>
              </button>

              {showNotifications && (
                <div className="absolute left-0 mt-2 w-72 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-4 z-50 text-right space-y-3">
                  <div className="font-bold text-xs text-gold-300 border-b border-slate-800 pb-2">
                    التنبيهات والإشعارات
                  </div>
                  {notifications.map((n) => (
                    <div key={n.id} className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-xs">
                      <div className="font-semibold text-white">{n.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{n.desc}</div>
                      <div className="text-[10px] text-slate-500 mt-1">{n.time}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User Logged in badge + Logout */}
            {currentUser && (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 py-1 px-2.5 rounded-xl">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-white">{currentUser.fullName}</div>
                  <div className="text-[10px] text-gold-400">
                    {currentUser.role === 'student' ? getGradeName(currentUser.grade) : 'خادم'}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  title="تسجيل الخروج"
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full flex flex-col justify-center">
        {currentUser ? (
          currentUser.role === 'student' ? (
            <StudentDashboard user={currentUser} />
          ) : (
            <ServantDashboard user={currentUser} />
          )
        ) : (
          /* Landing Screen: Single, focused entry point without redundancy */
          <div className="w-full max-w-2xl mx-auto text-center space-y-8 py-6">
            <div>
              <span className="inline-block bg-maroon-900/60 border border-gold-400/30 text-gold-300 px-3.5 py-1 rounded-full text-xs font-semibold mb-3">
                منصة خدمة الشباب ومدارس الأحد
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-snug">
                كنيسة القديس ماريوحنا المعمدان
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-2 max-w-md mx-auto">
                تسجيل الحضور بالكيو آر، ومتابعة الإنجاز الروحي اليومي، والامتحانات والمناهج.
              </p>
            </div>

            {/* The ONLY Two Clear Entry Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-right">
              {/* Youth / Student */}
              <div 
                onClick={() => openAuth('student')}
                className="bg-slate-900/90 border border-slate-800 hover:border-gold-500/60 p-6 rounded-2xl cursor-pointer transition-all hover:shadow-xl group flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 bg-gold-500 text-maroon-950 rounded-xl flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-transform shadow-md">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-gold-300 transition-colors">بوابة المخدومين</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    حضور الخدمة، دفتر الأجبية والإنجيل، والامتحانات والدرجات.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">سنة أولى</span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">سنة ثانية</span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">سنة ثالثة</span>
                    <span className="text-[10px] bg-maroon-900 text-gold-300 px-2 py-0.5 rounded font-semibold">فصل أليشع</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-gold-400 pt-3 border-t border-slate-800">
                  <span>الدخول / إنشاء حساب</span>
                  <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Servants */}
              <div 
                onClick={() => openAuth('servant')}
                className="bg-slate-900/90 border border-slate-800 hover:border-maroon-600/70 p-6 rounded-2xl cursor-pointer transition-all hover:shadow-xl group flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 bg-maroon-800 text-gold-300 border border-gold-400/30 rounded-xl flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-transform shadow-md">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-gold-300 transition-colors">بوابة الخدام</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    إدارة الفصول، استخراج كود الحضور، وتصحيح ورصد الامتحانات.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">كود الحضور</span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">تصحيح المقالي</span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">رصد ورقي</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-gold-400 pt-3 border-t border-slate-800">
                  <span>دخول الخدام وأمناء الفصول</span>
                  <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 px-4 border-t border-slate-900 text-center text-xs text-slate-500 bg-slate-950">
        <p>كنيسة القديس ماريوحنا المعمدان بالمعراج - إيبارشية المعادي © {new Date().getFullYear()}</p>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialRole={targetRole}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
