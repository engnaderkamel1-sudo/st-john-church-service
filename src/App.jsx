import React, { useState, useEffect } from 'react';
import { Sparkles, Church, BookOpen, QrCode, ShieldCheck, HeartHandshake, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { db } from './firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, limit } from 'firebase/firestore';

export default function App() {
  const [role, setRole] = useState(null);
  const [firebaseStatus, setFirebaseStatus] = useState({ state: 'checking', message: 'جاري فحص الاتصال بقاعدة البيانات...' });

  // Test live connection to Firebase Cloud Firestore
  useEffect(() => {
    async function testFirebase() {
      try {
        const testRef = collection(db, 'system_health');
        // Write a heartbeat test
        await addDoc(testRef, {
          status: 'online',
          service: 'St. John Church Service Platform',
          timestamp: serverTimestamp(),
          clientTime: new Date().toISOString()
        });

        // Verify read
        const q = query(testRef, limit(1));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          setFirebaseStatus({
            state: 'connected',
            message: 'متصل بـ Firebase Firestore بنجاح 🟢'
          });
        }
      } catch (err) {
        console.error('Firebase connection error:', err);
        setFirebaseStatus({
          state: 'error',
          message: `خطأ في الاتصال: ${err.message || 'يرجى التحقق من أذونات Test Mode'}`
        });
      }
    }

    testFirebase();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-maroon-900 via-maroon-800 to-slate-950 text-white flex flex-col justify-between selection:bg-gold-500 selection:text-maroon-950 font-cairo">
      {/* Header */}
      <header className="py-6 px-4 border-b border-maroon-700/50 backdrop-blur-md sticky top-0 z-50 bg-maroon-900/80">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/church_logo.jpg" 
              alt="شعار كنيسة القديس ماريوحنا المعمدان" 
              className="w-14 h-14 rounded-full border-2 border-gold-400 shadow-lg object-cover"
            />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gold-300">كنيسة ماريوحنا المعمدان بالمعراج</h1>
              <p className="text-xs md:text-sm text-slate-300">مطرانية الأقباط الأرثوذكس بالمعادي - منصة الخدمة الذكية</p>
            </div>
          </div>
          
          {/* Live Firebase Status Badge */}
          <div className="flex items-center gap-2">
            {firebaseStatus.state === 'connected' && (
              <span className="inline-flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs px-3 py-1.5 rounded-full font-semibold shadow-sm animate-pulse">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Firebase متصل 🟢
              </span>
            )}
            {firebaseStatus.state === 'checking' && (
              <span className="inline-flex items-center gap-1.5 bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs px-3 py-1.5 rounded-full font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                جاري الفحص...
              </span>
            )}
            {firebaseStatus.state === 'error' && (
              <span className="inline-flex items-center gap-1.5 bg-red-950/80 border border-red-500/40 text-red-300 text-xs px-3 py-1.5 rounded-full font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                تعذر الاتصال
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Hero */}
      <main className="flex-1 max-w-5xl mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
        {/* Status notification banner */}
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold mb-6 shadow-md transition-all ${
          firebaseStatus.state === 'connected' 
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' 
            : firebaseStatus.state === 'error'
            ? 'bg-red-500/10 border border-red-500/30 text-red-300'
            : 'bg-gold-500/10 border border-gold-400/30 text-gold-300 animate-pulse'
        }`}>
          {firebaseStatus.state === 'connected' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Church className="w-4 h-4" />}
          <span>{firebaseStatus.message}</span>
        </div>

        <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
          خدمة روحية منظمة بروح العصر <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-gold-300 via-gold-200 to-amber-400 bg-clip-text text-transparent">
            لكنيسة القديس ماريوحنا المعمدان
          </span>
        </h2>

        <p className="text-slate-300 max-w-2xl text-base md:text-lg mb-10 leading-relaxed">
          منصة موحدة لمتابعة الحضور بـ QR Code، تدوين الإنجاز الروحي اليومي، ومتابعة المناهج والامتحانات لكل المراحل وفصل أليشع لإعداد الخدام.
        </p>

        {/* Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
          {/* Serviced Card */}
          <div className="bg-maroon-800/40 border border-maroon-600/40 rounded-2xl p-6 backdrop-blur-sm text-right hover:border-gold-400/60 transition-all duration-300 hover:shadow-xl hover:shadow-gold-500/5 group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-gradient-to-br from-gold-500 to-amber-600 rounded-xl flex items-center justify-center text-maroon-950 mb-4 shadow-md group-hover:scale-105 transition-transform">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-gold-300 transition-colors">بوابة المخدومين</h3>
              <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                سجل حضورك الذكي بالكاميرا، وتابع صلوات الأجبية وقراءة الإنجيل ودرجات امتحاناتك ونقاطك الروحية.
              </p>
            </div>
            <button 
              onClick={() => setRole('student')}
              className="w-full bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-maroon-950 font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>دخول المخدومين</span>
              <HeartHandshake className="w-4 h-4" />
            </button>
          </div>

          {/* Servant Card */}
          <div className="bg-maroon-800/40 border border-maroon-600/40 rounded-2xl p-6 backdrop-blur-sm text-right hover:border-gold-400/60 transition-all duration-300 hover:shadow-xl hover:shadow-gold-500/5 group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-gradient-to-br from-maroon-600 to-red-800 rounded-xl flex items-center justify-center text-gold-300 mb-4 shadow-md border border-gold-400/30 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-gold-300 transition-colors">بوابة الخدام وأمناء الخدمة</h3>
              <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                إدارة الفصول (أولى، ثانية، ثالثة، فصل أليشع)، توليد كود الحضور، وإعداد وتصحيح الامتحانات.
              </p>
            </div>
            <button 
              onClick={() => setRole('servant')}
              className="w-full bg-maroon-700/80 hover:bg-maroon-600 border border-gold-400/40 text-gold-300 font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>دخول الخدام</span>
              <BookOpen className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-14 w-full">
          <div className="p-4 rounded-xl bg-maroon-950/40 border border-maroon-800/60 text-right">
            <span className="text-gold-400 font-bold text-lg block mb-1">⏱️ 10:30 إلى 02:00</span>
            <span className="text-xs text-slate-400">نافذة الحضور الذكي بالـ QR</span>
          </div>
          <div className="p-4 rounded-xl bg-maroon-950/40 border border-maroon-800/60 text-right">
            <span className="text-gold-400 font-bold text-lg block mb-1">✝️ 4 مراحل</span>
            <span className="text-xs text-slate-400">أولى، ثانية، ثالثة، وأليشع</span>
          </div>
          <div className="p-4 rounded-xl bg-maroon-950/40 border border-maroon-800/60 text-right">
            <span className="text-gold-400 font-bold text-lg block mb-1">📖 دفتر روحي</span>
            <span className="text-xs text-slate-400">أجبية، إنجيل، أسرار ونقاط</span>
          </div>
          <div className="p-4 rounded-xl bg-maroon-950/40 border border-maroon-800/60 text-right">
            <span className="text-gold-400 font-bold text-lg block mb-1">📝 امتحانات ذكية</span>
            <span className="text-xs text-slate-400">إلكترونية فورية وورقية مقالية</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-maroon-800/60 text-center text-xs text-slate-400 bg-maroon-950/60">
        <p>جميع الحقوق محفوظة © {new Date().getFullYear()} كنيسة ماريوحنا المعمدان بالمعراج - إيبارشية المعادي</p>
      </footer>
    </div>
  );
}
