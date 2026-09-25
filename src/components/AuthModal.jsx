import React, { useState } from 'react';
import { X, User, Phone, Lock, BookOpen, GraduationCap, ShieldAlert, Mail, KeyRound, ArrowRight, CheckCircle2 } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';

export default function AuthModal({ isOpen, onClose, initialRole = 'student', initialMode = 'login', onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(initialMode !== 'register');
  const [isForgot, setIsForgot] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [role, setRole] = useState(initialRole);
  const [grade, setGrade] = useState('first');
  const [servantScope, setServantScope] = useState('all');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setIsLogin(initialMode !== 'register');
      setIsForgot(false);
      setRole(initialRole);
      setError('');
      setResetSuccess('');
    }
  }, [isOpen, initialMode, initialRole]);

  if (!isOpen) return null;

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setResetSuccess('');
    setLoading(true);

    try {
      const emailVal = email.trim();
      if (!emailVal) {
        setError('يرجى كتابة البريد الإلكتروني المسجل');
        setLoading(false);
        return;
      }

      // Check if email exists in users collection
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', emailVal.toLowerCase()));
      const snap = await getDocs(q);

      if (snap.empty) {
        setError('هذا البريد الإلكتروني غير مسجل في الخدمة');
        setLoading(false);
        return;
      }

      // Try sending via Firebase Auth reset
      try {
        await sendPasswordResetEmail(auth, emailVal);
        setResetSuccess(`تم إرسال رابط استعادة كلمة السر بنجاح إلى: ${emailVal}. تفقد بريدك الإلكتروني.`);
      } catch (authErr) {
        // Fallback info if Firebase Auth email user is handled via phone/direct Firestore
        setResetSuccess(`تم التحقق من بريدك (${emailVal}). يرجى التواصل مع أمين الخدمة أو تفقد صندوق الوارد لإتمام الاستعادة.`);
      }
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء إرسال طلب استعادة كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

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

        // Record Login Log in Firestore
        try {
          await addDoc(collection(db, 'login_logs'), {
            userId: userData.id,
            userName: userData.fullName || 'مستخدم',
            phone: userData.phone || phone.trim(),
            role: userData.role || 'student',
            grade: userData.grade || null,
            servantScope: userData.servantScope || null,
            action: 'login',
            timestamp: serverTimestamp(),
            timeStr: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
            dateStr: new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
          });
        } catch (logErr) {
          console.error('Failed to log login:', logErr);
        }

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

        if (email.trim()) {
          const emailQ = query(usersRef, where('email', '==', email.trim().toLowerCase()));
          const emailSnap = await getDocs(emailQ);
          if (!emailSnap.empty) {
            setError('البريد الإلكتروني مسجل بالفعل لمستخدم آخر');
            setLoading(false);
            return;
          }
        }

        const newUser = {
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password: password.trim(),
          role: role,
          grade: role === 'student' ? grade : null,
          servantScope: role === 'servant' ? servantScope : null,
          status: 'active', // تفعيل فوري ومباشر (للخدام والمخدومين) لتسهيل تجربة الخدام بدون انتظار موافقة
          points: 0,
          createdAt: serverTimestamp()
        };

        const docRef = await addDoc(usersRef, newUser);

        // Record New Registration in login_logs
        try {
          await addDoc(collection(db, 'login_logs'), {
            userId: docRef.id,
            userName: newUser.fullName,
            phone: newUser.phone,
            role: newUser.role,
            grade: newUser.grade,
            servantScope: newUser.servantScope,
            action: 'register',
            timestamp: serverTimestamp(),
            timeStr: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
            dateStr: new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
          });
        } catch (logErr) {
          console.error('Failed to log registration:', logErr);
        }

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
              {isForgot 
                ? 'استعادة كلمة السر'
                : isLogin 
                  ? 'تسجيل الدخول إلى الخدمة' 
                  : 'إنشاء حساب جديد'}
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

        {/* FORGOT PASSWORD VIEW */}
        {isForgot ? (
          <form onSubmit={handleResetPassword} className="p-6 space-y-4">
            <div className="text-center pb-1">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2 border border-amber-200">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-800">نسيت كلمة السر؟</h3>
              <p className="text-xs text-slate-500 mt-1">
                اكتب بريدك الإلكتروني المسجل لدينا وسنرسل لك رابط إعادة تعيين كلمة المرور فوراً.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {resetSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3.5 rounded-xl flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span className="leading-relaxed font-medium">{resetSuccess}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني المسجل</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  dir="ltr"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pl-10 text-xs text-right focus:outline-none focus:border-maroon-700 focus:bg-white transition-colors"
                />
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-maroon-800 hover:bg-maroon-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-4 text-xs"
            >
              {loading ? <span>جاري الإرسال...</span> : <span>إرسال رابط استعادة كلمة السر</span>}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setIsForgot(false); setError(''); setResetSuccess(''); }}
                className="text-xs text-slate-600 hover:text-maroon-800 font-bold flex items-center justify-center gap-1 mx-auto transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>العودة لتسجيل الدخول</span>
              </button>
            </div>
          </form>
        ) : (
          /* REGULAR LOGIN / REGISTER FORM */
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

            {!isLogin && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">البريد الإلكتروني</label>
                  <span className="text-[10px] text-amber-700 font-medium">لاستعادة كلمة السر في أي وقت</span>
                </div>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@domain.com"
                    dir="ltr"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pl-10 text-xs text-right focus:outline-none focus:border-maroon-700 focus:bg-white transition-colors"
                  />
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">كلمة المرور</label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => { setIsForgot(true); setError(''); setResetSuccess(''); }}
                    className="text-[11px] text-maroon-700 hover:text-maroon-900 font-bold hover:underline"
                  >
                    نسيت كلمة السر؟
                  </button>
                )}
              </div>
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

            {/* Grade selection for student */}
            {!isLogin && role === 'student' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المرحلة الدراسية</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-maroon-700 focus:bg-white transition-colors"
                >
                  <option value="first">سنة أولى</option>
                  <option value="second">سنة ثانية</option>
                  <option value="third">سنة ثالثة</option>
                  <option value="elisha">فصل أليشع (إعداد خدام)</option>
                </select>
              </div>
            )}

            {/* Servant Scope selection */}
            {!isLogin && role === 'servant' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نطاق الخدمة المسئول عنه</label>
                  <select
                    value={servantScope}
                    onChange={(e) => setServantScope(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-maroon-700 focus:bg-white transition-colors"
                  >
                    <option value="all">أمين خدمة عام (جميع المراحل)</option>
                    <option value="first">خادم سنة أولى</option>
                    <option value="second">خادم سنة ثانية</option>
                    <option value="third">خادم سنة ثالثة</option>
                    <option value="elisha">خادم فصل أليشع (إعداد خدام)</option>
                  </select>
                </div>
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] p-2.5 rounded-xl font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>دخول فوري مباشر: حسابك كخادم سيفعل تلقائياً لتجربة المنظومة فوراً.</span>
                </div>
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
                onClick={() => { setIsLogin(!isLogin); setIsForgot(false); setError(''); }}
                className="text-xs text-maroon-800 hover:text-maroon-900 font-semibold underline"
              >
                {isLogin ? 'ليس لديك حساب؟ إنشاء حساب جديد' : 'لديك حساب بالفعل؟ تسجيل الدخول'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
