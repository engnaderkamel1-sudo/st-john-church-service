import React, { useState } from 'react';
import { X, User, Phone, Lock, BookOpen, GraduationCap, ShieldAlert } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

export default function AuthModal({ isOpen, onClose, initialRole = 'student', initialMode = 'login', onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(initialMode !== 'register');
  const [role, setRole] = useState(initialRole);
  const [grade, setGrade] = useState('first');
  const [servantScope, setServantScope] = useState('all');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setIsLogin(initialMode !== 'register');
      setRole(initialRole);
      setError('');
    }
  }, [isOpen, initialMode, initialRole]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const usersRef = collection(db, 'users');

      if (isLogin) {
        const q = query(
          usersRef,
          where('phone', '==', phone.trim()),
          where('password', '==', password.trim())
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError('رقم الهاتف أو كلمة المرور غير صحيحة');
          setLoading(false);
          return;
        }

        const userData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        onLoginSuccess(userData);
        onClose();
      } else {
        const checkQ = query(usersRef, where('phone', '==', phone.trim()));
        const checkSnap = await getDocs(checkQ);

        if (!checkSnap.empty) {
          setError('رقم الهاتف مسجل بالفعل مسبقاً');
          setLoading(false);
          return;
        }

        const newUser = {
          fullName: fullName.trim(),
          phone: phone.trim(),
          password: password.trim(),
          role: role,
          grade: role === 'student' ? grade : null,
          servantScope: role === 'servant' ? servantScope : null,
          status: role === 'student' ? 'active' : 'pending',
          points: 0,
          createdAt: serverTimestamp()
        };

        const docRef = await addDoc(usersRef, newUser);
        onLoginSuccess({ id: docRef.id, ...newUser });
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء معالجة الطلب. يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-slate-800 flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-maroon-800 to-maroon-900 px-6 py-4.5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/church_logo.jpg" alt="Logo" className="w-8 h-8 rounded-full border border-gold-300 object-cover shadow-sm" />
            <span className="font-bold text-sm text-gold-200">
              {isLogin ? 'تسجيل الدخول إلى الخدمة' : 'إنشاء حساب جديد'}
            </span>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {!isLogin && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
              <label className="block text-xs font-bold text-slate-700 mb-2">اختر صفتك في الخدمة:</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-200/70 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                    role === 'student'
                      ? 'bg-white text-maroon-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>مخدوم</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('servant')}
                  className={`py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                    role === 'servant'
                      ? 'bg-maroon-800 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>خادم</span>
                </button>
              </div>
            </div>
          )}

          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الاسم ثلاثي</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: جورج سمير حنا"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pl-10 text-xs focus:outline-none focus:border-maroon-700 focus:bg-white transition-colors"
                />
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف</label>
            <div className="relative">
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                dir="ltr"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pl-10 text-xs text-right focus:outline-none focus:border-maroon-700 focus:bg-white transition-colors"
              />
              <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pl-10 text-xs focus:outline-none focus:border-maroon-700 focus:bg-white transition-colors"
              />
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            </div>
          </div>

          {/* Grade selection */}
          {!isLogin && role === 'student' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">المرحلة الدراسية</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-maroon-700 focus:bg-white transition-colors"
              >
                <option value="first">سنة أولى ثانوي</option>
                <option value="second">سنة ثانية ثانوي</option>
                <option value="third">سنة ثالثة ثانوي</option>
                <option value="elisha">فصل أليشع (إعداد خدام)</option>
              </select>
            </div>
          )}

          {/* Scope for servant */}
          {!isLogin && role === 'servant' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الفصل المسؤول عنه</label>
              <select
                value={servantScope}
                onChange={(e) => setServantScope(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-maroon-700 focus:bg-white transition-colors"
              >
                <option value="all">أمين خدمة عام (جميع المراحل)</option>
                <option value="first">سنة أولى ثانوي</option>
                <option value="second">سنة ثانية ثانوي</option>
                <option value="third">سنة ثالثة ثانوي</option>
                <option value="elisha">فصل أليشع (إعداد خدام)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-maroon-800 hover:bg-maroon-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-4 text-xs"
          >
            {loading ? <span>جاري التحقق...</span> : <span>{isLogin ? 'تسجيل الدخول' : 'تأكيد إنشاء الحساب'}</span>}
          </button>

          {/* Toggle Login / Register */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-xs text-maroon-800 hover:text-maroon-900 font-semibold underline"
            >
              {isLogin ? 'ليس لديك حساب؟ إنشاء حساب جديد' : 'لديك حساب بالفعل؟ تسجيل الدخول'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
