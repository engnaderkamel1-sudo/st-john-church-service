import React, { useState, useEffect } from 'react';
import { Church, BookOpen, QrCode, ShieldCheck, HeartHandshake, LogOut, CheckCircle2, User, Sparkles } from 'lucide-react';
import { db } from './firebase';
import AuthModal from './components/AuthModal';
import StudentDashboard from './components/StudentDashboard';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [targetRole, setTargetRole] = useState('student');

  // Check saved session in localStorage
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
      {/* Header */}
      <header className="py-4 px-4 border-b border-slate-800 bg-maroon-950 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/church_logo.jpg" 
              alt="كنيسة القديس ماريوحنا المعمدان" 
              className="w-12 h-12 rounded-full border-2 border-gold-400 object-cover shadow"
            />
            <div>
              <h1 className="text-lg md:text-xl font-bold text-gold-300">كنيسة ماريوحنا المعمدان بالمعراج</h1>
              <p className="text-xs text-slate-300">مطرانية المعادي - منصة الخدمة</p>
            </div>
          </div>

          {/* User Status / Login Buttons */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3 bg-slate-900 border border-slate-700 py-1.5 px-3 rounded-xl">
                <div className="text-right">
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    <span>{currentUser.fullName}</span>
                    <span className="text-[10px] bg-gold-500/20 text-gold-300 px-1.5 py-0.5 rounded">
                      {currentUser.role === 'student' ? getGradeName(currentUser.grade) : 'خادم'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">{currentUser.phone}</div>
                </div>
                <button
                  onClick={handleLogout}
                  title="تسجيل الخروج"
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAuth('student')}
                  className="bg-gold-500 hover:bg-gold-400 text-maroon-950 font-bold text-xs md:text-sm px-3.5 py-2 rounded-xl transition-all shadow"
                >
                  دخول المخدومين
                </button>
                <button
                  onClick={() => openAuth('servant')}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-xs md:text-sm px-3.5 py-2 rounded-xl transition-all"
                >
                  دخول الخدام
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full flex flex-col items-center justify-center">
        {currentUser ? (
          currentUser.role === 'student' ? (
            <StudentDashboard user={currentUser} />
          ) : (
            // Active Servant Placeholder for Stage 4
            <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-right">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div>
                  <span className="text-xs text-gold-400 font-semibold">مرحباً بك</span>
                  <h2 className="text-2xl font-bold text-white">{currentUser.fullName}</h2>
                  <p className="text-sm text-slate-400 mt-1">خادم / أمين خدمة</p>
                </div>
                <span className="bg-maroon-900/80 border border-maroon-700/60 text-gold-300 text-xs px-3 py-1.5 rounded-full font-medium">
                  لوحة الخدام
                </span>
              </div>
              <div className="mt-8 bg-slate-950/50 border border-dashed border-slate-800 rounded-xl p-8 text-center">
                <ShieldCheck className="w-10 h-10 text-gold-400 mx-auto mb-2" />
                <h3 className="text-base font-bold text-white mb-1">لوحة الخدام جاهزة للتفعيل في المرحلة 4</h3>
                <p className="text-xs text-slate-400">إدارة الفصول، توليد كود الحضور، وتصحيح الامتحانات.</p>
              </div>
            </div>
          )
        ) : (
          // Landing View
          <div className="w-full max-w-3xl text-center">
            <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-4">
              منصة خدمة كنيسة ماريوحنا المعمدان بالمعراج
            </h2>
            <p className="text-slate-400 text-sm md:text-base mb-8 max-w-xl mx-auto">
              تسجيل الحضور الذكي بالـ QR، متابعة الإنجاز الروحي والصلوات، وإدارة المناهج والامتحانات.
            </p>

            {/* Entry Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-right">
              <div 
                onClick={() => openAuth('student')}
                className="bg-slate-900 border border-slate-800 hover:border-gold-500/50 p-6 rounded-2xl cursor-pointer transition-all hover:shadow-lg group"
              >
                <div className="w-10 h-10 bg-gold-500 text-maroon-950 rounded-xl flex items-center justify-center font-bold mb-4">
                  <QrCode className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-gold-300">بوابة المخدومين</h3>
                <p className="text-xs text-slate-400 mb-4">
                  (سنة أولى - سنة ثانية - سنة ثالثة - فصل أليشع)
                </p>
                <span className="text-xs font-semibold text-gold-400">تسجيل الدخول / فتح الحساب ←</span>
              </div>

              <div 
                onClick={() => openAuth('servant')}
                className="bg-slate-900 border border-slate-800 hover:border-maroon-600/70 p-6 rounded-2xl cursor-pointer transition-all hover:shadow-lg group"
              >
                <div className="w-10 h-10 bg-maroon-800 text-gold-300 rounded-xl flex items-center justify-center font-bold mb-4 border border-gold-400/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-gold-300">بوابة الخدام</h3>
                <p className="text-xs text-slate-400 mb-4">
                  إدارة بيانات المخدومين، كود الحضور، والامتحانات.
                </p>
                <span className="text-xs font-semibold text-gold-400">دخول الخدام وأمناء الخدمة ←</span>
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
