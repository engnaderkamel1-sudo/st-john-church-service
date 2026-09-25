import React, { useState, useEffect } from 'react';
import { Church, BookOpen, QrCode, ShieldCheck, HeartHandshake, LogOut, CheckCircle2, User, Bell, ChevronLeft, Sparkles } from 'lucide-react';
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
              <h1 className="text-base md:text-lg font-bold text-maroon-900 leading-tight">كنيسة ماريوحنا المعمدان بالمعراج</h1>
              <p className="text-[11px] text-slate-500 font-medium">مطرانية الأقباط الأرثوذكس بالمعادي</p>
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2.5">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-600 hover:text-maroon-900 hover:bg-slate-100 rounded-xl transition-colors relative"
                title="التنبيهات"
              >
                <Bell className="w-5 h-5" />
                <span className="w-2 h-2 bg-amber-500 rounded-full absolute top-1.5 right-1.5 ring-2 ring-white"></span>
              </button>

              {showNotifications && (
                <div className="absolute left-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 text-right space-y-2.5">
                  <div className="font-bold text-xs text-maroon-900 border-b border-slate-100 pb-2">
                    التنبيهات والإشعارات
                  </div>
                  {notifications.map((n) => (
                    <div key={n.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                      <div className="font-bold text-slate-800">{n.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{n.desc}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{n.time}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User Logged in badge + Logout */}
            {currentUser && (
              <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 py-1 px-3 rounded-xl">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-800">{currentUser.fullName}</div>
                  <div className="text-[10px] text-maroon-800 font-semibold">
                    {currentUser.role === 'student' ? getGradeName(currentUser.grade) : 'خادم'}
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

      {/* Main Container */}
      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full flex flex-col justify-center">
        {currentUser ? (
          currentUser.role === 'student' ? (
            <StudentDashboard user={currentUser} />
          ) : (
            <ServantDashboard user={currentUser} />
          )
        ) : (
          /* Landing Screen: Clean Light Mode with single-entry focus */
          <div className="w-full max-w-2xl mx-auto text-center space-y-8 py-6">
            <div>
              <span className="inline-block bg-maroon-50 border border-maroon-200 text-maroon-900 px-3.5 py-1 rounded-full text-xs font-bold mb-3 shadow-xs">
                منصة خدمة الشباب ومدارس الأحد
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-snug">
                كنيسة القديس ماريوحنا المعمدان
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-2 max-w-md mx-auto">
                تسجيل الحضور بالكيو آر، ومتابعة النوتة الروحية، والمناهج والامتحانات والتاسكات.
              </p>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-right">
              {/* Youth / Student */}
              <div 
                onClick={() => openAuth('student')}
                className="bg-white border border-slate-200 hover:border-gold-500 p-6 rounded-3xl cursor-pointer transition-all hover:shadow-lg group flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 bg-amber-50 text-maroon-900 rounded-2xl flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-transform border border-amber-200 shadow-xs">
                    <QrCode className="w-6 h-6 text-maroon-800" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1 group-hover:text-maroon-800 transition-colors">بوابة المخدومين</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    حضور الخدمة، النوتة الروحية، المنهج والمذكرات، والامتحانات والتاسكات.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">سنة أولى</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">سنة ثانية</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">سنة ثالثة</span>
                    <span className="text-[10px] bg-maroon-50 text-maroon-900 px-2 py-0.5 rounded-md font-bold border border-maroon-200">فصل أليشع</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-maroon-800 pt-3 border-t border-slate-100">
                  <span>الدخول / إنشاء حساب</span>
                  <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Servants */}
              <div 
                onClick={() => openAuth('servant')}
                className="bg-white border border-slate-200 hover:border-maroon-700 p-6 rounded-3xl cursor-pointer transition-all hover:shadow-lg group flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 bg-maroon-800 text-white rounded-2xl flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-transform shadow-xs">
                    <ShieldCheck className="w-6 h-6 text-gold-300" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1 group-hover:text-maroon-800 transition-colors">بوابة الخدام</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    إدارة المواد، بنك الأسئلة، كود الحضور، والإحصائيات ورصد الدرجات.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">كود الحضور</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">بنك الأسئلة</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">الإحصائيات</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-maroon-800 pt-3 border-t border-slate-100">
                  <span>دخول الخدام وأمناء الفصول</span>
                  <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                </div>
              </div>
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
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
