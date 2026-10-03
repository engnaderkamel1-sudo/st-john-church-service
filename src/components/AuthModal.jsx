import React, { useState } from 'react';
import { 
  X, User, Phone, Lock, BookOpen, GraduationCap, ShieldAlert, Mail, KeyRound, 
  ArrowRight, CheckCircle2, Camera, Heart, MapPin, Briefcase, Calendar, Users
} from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { compressImage } from '../utils/imageCompressor';

export default function AuthModal({ isOpen, onClose, initialRole = 'student', initialMode = 'login', onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(initialMode !== 'register');
  const [isForgot, setIsForgot] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetSuccess, setResetSuccess] = useState(null);
  const [registrationPendingSuccess, setRegistrationPendingSuccess] = useState(null);
  const [role, setRole] = useState(initialRole);
  const [grade, setGrade] = useState('first');
  const [servantScope, setServantScope] = useState('all');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Extended Profile State
  const [photoUrl, setPhotoUrl] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('male'); // 'male' | 'female'
  const [education, setEducation] = useState(''); // e.g. كلية التجارة - جامعة عين شمس
  const [job, setJob] = useState(''); // طالب / مهندس / إلخ
  const [maritalStatus, setMaritalStatus] = useState('single'); // 'single' | 'engaged' | 'married'
  const [spouseName, setSpouseName] = useState('');
  const [hasChildren, setHasChildren] = useState(false);
  const [childrenDetails, setChildrenDetails] = useState('');
  const [address, setAddress] = useState('');
  const [confessionFather, setConfessionFather] = useState('');
  const [showExtendedFields, setShowExtendedFields] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setIsLogin(initialMode !== 'register');
      setIsForgot(false);
      setRole(initialRole);
      setError('');
      setResetSuccess(null);
      setRegistrationPendingSuccess(null);
      setResetIdentifier('');
      setShowExtendedFields(false);
    }
  }, [isOpen, initialMode, initialRole]);

  if (!isOpen) return null;

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setResetSuccess(null);
    setLoading(true);

    try {
      const inputVal = resetIdentifier.trim();
      if (!inputVal) {
        setError('يرجى كتابة رقم الهاتف أو البريد الإلكتروني المسجل');
        setLoading(false);
        return;
      }

      const usersRef = collection(db, 'users');
      let userData = null;

      if (inputVal.includes('@')) {
        // Query by email
        const q = query(usersRef, where('email', '==', inputVal.toLowerCase()));
        const snap = await getDocs(q);
        if (!snap.empty) {
          userData = { id: snap.docs[0].id, ...snap.docs[0].data() };
        }
      } else {
        // Query by phone
        const q = query(usersRef, where('phone', '==', inputVal));
        const snap = await getDocs(q);
        if (!snap.empty) {
          userData = { id: snap.docs[0].id, ...snap.docs[0].data() };
        }
      }

      if (!userData) {
        setError('لم يتم العثور على أي حساب مسجل بهذا الرقم أو البريد الإلكتروني');
        setLoading(false);
        return;
      }

      // If user has email registered
      if (userData.email) {
        try {
          await sendPasswordResetEmail(auth, userData.email);
          setResetSuccess({
            type: 'email',
            message: `تم إرسال رابط استعادة كلمة السر بنجاح إلى بريدك: (${userData.email}). يرجى تفقد صندوق الوارد.`
          });
        } catch (authErr) {
          setResetSuccess({
            type: 'contact',
            fullName: userData.fullName || 'الخادم / المخدوم',
            phone: userData.phone
          });
        }
      } else {
        // Registered with phone only (elderly servant or student without email)
        setResetSuccess({
          type: 'phone_only',
          fullName: userData.fullName || 'الخادم / المخدوم',
          phone: userData.phone
        });
      }
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء معالجة طلب استعادة كلمة المرور');
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

        // Check if user is pending admin approval
        if (userData.status === 'pending_approval') {
          setError('حسابك قيد المراجعة والاعتماد من أمين الخدمة. سيتم تفعيل حسابك قريباً لتتمكن من الدخول.');
          setLoading(false);
          return;
        }

        // Check if user is rejected or inactive
        if (userData.status === 'inactive' || userData.status === 'rejected') {
          setError('تم إيقاف تفعيل هذا الحساب. يرجى التواصل مع أمين الخدمة.');
          setLoading(false);
          return;
        }

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
          servantScope: role === 'servant' ? 'all' : null,
          status: 'pending_approval', // يتطلب موافقة أمين الخدمة أو الأدمن لمنع أي دخول غير مصرح به
          points: 0,
          // Extended Profile Data
          photoUrl: photoUrl || '',
          gender: gender || 'male',
          birthDate: birthDate || '',
          education: education.trim(),
          job: job.trim(),
          maritalStatus: maritalStatus || 'single',
          spouseName: maritalStatus === 'married' ? spouseName.trim() : '',
          hasChildren: maritalStatus === 'married' ? hasChildren : false,
          childrenDetails: (maritalStatus === 'married' && hasChildren) ? childrenDetails.trim() : '',
          address: address.trim(),
          confessionFather: confessionFather.trim(),
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
            action: 'register_pending_approval',
            timestamp: serverTimestamp(),
            timeStr: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
            dateStr: new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
          });
        } catch (logErr) {
          console.error('Failed to log registration:', logErr);
        }

        setRegistrationPendingSuccess({
          fullName: newUser.fullName,
          phone: newUser.phone,
          role: newUser.role
        });
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

        {/* REGISTRATION PENDING CONFIRMATION VIEW */}
        {registrationPendingSuccess ? (
          <div className="p-6 space-y-5 text-center">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-xs">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h3 className="font-extrabold text-base text-slate-900">
                تم تسجيل بياناتك بنجاح
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                أهلاً بك <span className="font-bold text-slate-800">{registrationPendingSuccess.fullName}</span>. 
                حسابك الآن <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">قيد المراجعة والاعتماد</span> من قِبل أمين الخدمة.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-right text-xs space-y-1 mt-3">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-medium">الرتبة المطلوبة:</span>
                  <span className="font-bold text-maroon-800">
                    {registrationPendingSuccess.role === 'servant' ? 'خادم ✝️' : 'مخدوم 🎓'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-medium">رقم الهاتف:</span>
                  <span className="font-bold font-mono text-slate-800" dir="ltr">{registrationPendingSuccess.phone}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                سيتم تفعيل حسابك مباشرة من لوحة الإدارة فور مراجعته لتتمكن من تسجيل الدخول.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setRegistrationPendingSuccess(null);
                setIsLogin(true);
              }}
              className="w-full min-h-[44px] bg-maroon-800 hover:bg-maroon-900 text-white rounded-2xl font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
            >
              <span>العودة لشاشة الدخول</span>
              <ArrowRight className="w-4 h-4 rotate-180" />
            </button>
          </div>
        ) : isForgot ? (
          <form onSubmit={handleResetPassword} className="p-6 space-y-4">
            <div className="text-center pb-1">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2 border border-amber-200">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-800">نسيت كلمة السر؟</h3>
              <p className="text-xs text-slate-500 mt-1">
                اكتب رقم هاتفك أو بريدك الإلكتروني المسجل لدينا وسنساعدك في استعادة كلمة المرور فوراً.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {resetSuccess && (
              resetSuccess.type === 'email' ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3.5 rounded-xl flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span className="leading-relaxed font-medium">{resetSuccess.message}</span>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-300 text-amber-950 text-xs p-4 rounded-2xl space-y-2.5">
                  <div className="flex items-center gap-2 font-bold text-sm text-maroon-900">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>أهلاً بك يا {resetSuccess.fullName} 👋</span>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed">
                    حسابك مسجل برقم الهاتف ({resetSuccess.phone}) بدون بريد إلكتروني.
                    لإعادة تعيين كلمة المرور فوراً، يمكنك التواصل مباشرة مع أمين الخدمة أو المشرف:
                  </p>
                  <a
                    href={`https://wa.me/201275571569?text=${encodeURIComponent(`سلام ونعمة، أنا الخادم/المخدوم (${resetSuccess.fullName}) ورقم هاتفي هو (${resetSuccess.phone})، نسيت كلمة المرور الخاصة بحسابي وأحتاج إعادة تعيينها.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-all shadow-xs"
                  >
                    <span>تواصل مع أمين الخدمة عبر واتساب لإعادة التعيين 💬</span>
                  </a>
                </div>
              )
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                رقم الهاتف أو البريد الإلكتروني المسجل
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={resetIdentifier}
                  onChange={(e) => setResetIdentifier(e.target.value)}
                  placeholder="01XXXXXXXXX أو name@example.com"
                  dir="ltr"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pl-10 text-xs text-right focus:outline-none focus:border-maroon-700 focus:bg-white transition-colors"
                />
                <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-maroon-800 hover:bg-maroon-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-4 text-xs"
            >
              {loading ? <span>جاري البحث والتحقق...</span> : <span>استعادة كلمة المرور</span>}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setIsForgot(false); setError(''); setResetSuccess(null); setResetIdentifier(''); }}
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
                  <label className="block text-xs font-bold text-slate-700">
                    البريد الإلكتروني <span className="text-[10px] text-slate-400 font-normal">(اختياري)</span>
                  </label>
                  <span className="text-[10px] text-amber-700 font-medium">مفيد لاستعادة الحساب</span>
                </div>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@domain.com (اختياري)"
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

            {/* Extended Profile Optional / Pastoral Fields (Toggleable Accordion) */}
            {!isLogin && (
              <div className="border border-amber-200/90 bg-amber-50/50 rounded-2xl p-3.5 space-y-3 transition-all">
                <button
                  type="button"
                  onClick={() => setShowExtendedFields(!showExtendedFields)}
                  className="w-full flex items-center justify-between text-xs font-bold text-maroon-900 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-amber-600" />
                    <span>البيانات الشخصية والاجتماعية (اختياري)</span>
                  </div>
                  <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                    {showExtendedFields ? 'إخفاء ▲' : 'إكمال البيانات (صورة، كلية، أسرة) ▼'}
                  </span>
                </button>

                {showExtendedFields && (
                  <div className="space-y-3 pt-2 border-t border-amber-200/60 animate-in fade-in duration-200">
                    {/* 1. Profile Picture Upload */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        الصورة الشخصية
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                          {photoUrl ? (
                            <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <Camera className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-maroon-700 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition-all">
                            <Camera className="w-3.5 h-3.5 text-maroon-700" />
                            <span>{photoUrl ? 'تغيير الصورة' : 'اختر صورة من جهازك'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    const compressed = await compressImage(file, 400, 0.72);
                                    if (compressed) setPhotoUrl(compressed);
                                  } catch (err) {
                                    console.error('Image compression error:', err);
                                  }
                                }
                              }}
                            />
                          </label>
                          {photoUrl && (
                            <button
                              type="button"
                              onClick={() => setPhotoUrl('')}
                              className="text-[10px] text-rose-600 hover:underline mr-2 font-bold"
                            >
                              إزالة الصورة
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 2. Gender & Birth Date */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">النوع</label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-maroon-700"
                        >
                          <option value="male">شاب (ذكر)</option>
                          <option value="female">شابة (أنثى)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ الميلاد</label>
                        <input
                          type="date"
                          value={birthDate}
                          onChange={(e) => setBirthDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-maroon-700"
                        />
                      </div>
                    </div>

                    {/* 3. College & University */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        الكلية / الجامعة / المؤهل الدراسي
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={education}
                          onChange={(e) => setEducation(e.target.value)}
                          placeholder="مثال: هندسة عين شمس، تجارة حلوان..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 pl-8 text-xs focus:outline-none focus:border-maroon-700"
                        />
                        <GraduationCap className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      </div>
                    </div>

                    {/* 4. Job / Profession */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">الوظيفة أو مجال العمل</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={job}
                          onChange={(e) => setJob(e.target.value)}
                          placeholder="مثال: طالب، مهندس برمجيات، محاسب..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 pl-8 text-xs focus:outline-none focus:border-maroon-700"
                        />
                        <Briefcase className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      </div>
                    </div>

                    {/* 5. Marital Status */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">الحالة الاجتماعية</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setMaritalStatus('single')}
                          className={`py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            maritalStatus === 'single'
                              ? 'bg-maroon-800 text-white border-maroon-800 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          أعزب / آنسة
                        </button>
                        <button
                          type="button"
                          onClick={() => setMaritalStatus('engaged')}
                          className={`py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            maritalStatus === 'engaged'
                              ? 'bg-maroon-800 text-white border-maroon-800 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          خاطب / مخطوبة
                        </button>
                        <button
                          type="button"
                          onClick={() => setMaritalStatus('married')}
                          className={`py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            maritalStatus === 'married'
                              ? 'bg-maroon-800 text-white border-maroon-800 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          متزوج / متزوجة
                        </button>
                      </div>
                    </div>

                    {/* 6. Married specifics: Spouse & Children */}
                    {maritalStatus === 'married' && (
                      <div className="bg-white border border-amber-200 rounded-xl p-2.5 space-y-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم شريك الحياة</label>
                          <input
                            type="text"
                            value={spouseName}
                            onChange={(e) => setSpouseName(e.target.value)}
                            placeholder="اسم الزوج / الزوجة"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-maroon-700"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="hasChildrenReg"
                            checked={hasChildren}
                            onChange={(e) => setHasChildren(e.target.checked)}
                            className="w-4 h-4 text-maroon-800 rounded-sm focus:ring-maroon-700 accent-maroon-800"
                          />
                          <label htmlFor="hasChildrenReg" className="text-xs font-bold text-slate-700 cursor-pointer">
                            هل يوجد أولاد؟
                          </label>
                        </div>

                        {hasChildren && (
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              بيانات وأعمار الأبناء
                            </label>
                            <input
                              type="text"
                              value={childrenDetails}
                              onChange={(e) => setChildrenDetails(e.target.value)}
                              placeholder="مثال: يوسف (٥ سنوات)، مارينا (سنتين)"
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-maroon-700"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* 7. Address */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">عنوان السكن (للافتقاد)</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="المنطقة، الشارع، رقم العمارة، الشقة..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 pl-8 text-xs focus:outline-none focus:border-maroon-700"
                        />
                        <MapPin className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      </div>
                    </div>

                    {/* 8. Priest of Confession */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">أب الاعتراف</label>
                      <input
                        type="text"
                        value={confessionFather}
                        onChange={(e) => setConfessionFather(e.target.value)}
                        placeholder="مثال: أبونا يوحنا / كنيسة مارمرقس..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-maroon-700"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Servant General Access Notice */}
            {!isLogin && role === 'servant' && (
              <div className="space-y-2">
                <div className="bg-maroon-50 border border-maroon-200 text-maroon-900 text-xs p-3 rounded-xl font-bold flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-maroon-700 shrink-0" />
                  <span>الصفة: خادم عام (صلاحية كاملة لجميع المراحل وإعداد الخدام)</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] p-2.5 rounded-xl font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>دخول فوري مباشر: حسابك كخادم عام سيفعل تلقائياً لتجربة المنظومة فوراً.</span>
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
