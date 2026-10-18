import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, doc, updateDoc, addDoc, getDocs, query, where, limit, serverTimestamp } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { hashPassword, isPasswordMatch } from '../utils/security';
import LoginForm from './auth/LoginForm';
import RegisterForm from './auth/RegisterForm';
import ForgotPassForm from './auth/ForgotPassForm';
import RegistrationPendingSuccess from './auth/RegistrationPendingSuccess';
import { triggerServerPush } from '../services/webPushService';

export default function AuthModal({ isOpen, onClose, initialRole = 'student', initialMode = 'login', onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(initialMode !== 'register');
  const [isForgot, setIsForgot] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetSuccess, setResetSuccess] = useState(null);
  const [registrationPendingSuccess, setRegistrationPendingSuccess] = useState(null);
  const [role, setRole] = useState(initialRole);
  const [grade, setGrade] = useState('first');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Extended Profile State
  const [photoUrl, setPhotoUrl] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('male'); // 'male' | 'female'
  const [education, setEducation] = useState('');
  const [job, setJob] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('single'); // 'single' | 'engaged' | 'married'
  const [childrenCount, setChildrenCount] = useState(0);
  const [address, setAddress] = useState('');
  const [confessionFather, setConfessionFather] = useState('');
  const [confessionChurch, setConfessionChurch] = useState('');
  const [currentStep, setCurrentStep] = useState(1); // 1: Account, 2: Personal & Church, 3: Social & Work

  const [loading, setLoading] = useState(false);
  const [checkingStep1, setCheckingStep1] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsLogin(initialMode !== 'register');
      setIsForgot(false);
      setRole(initialRole);
      setError('');
      setResetSuccess(null);
      setRegistrationPendingSuccess(null);
      setResetIdentifier('');
      setCurrentStep(1);
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
        const q = query(usersRef, where('email', '==', inputVal.toLowerCase()));
        const snap = await getDocs(q);
        if (!snap.empty) {
          userData = { id: snap.docs[0].id, ...snap.docs[0].data() };
        }
      } else {
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

      if (userData.email) {
        try {
          await sendPasswordResetEmail(auth, userData.email);
          setResetSuccess({
            type: 'email',
            message: `تم إرسال رابط استعادة كلمة السر بنجاح إلى بريدك: (${userData.email}). يرجى تفقد صندوق الوارد.`
          });
        } catch {
          setResetSuccess({
            type: 'contact',
            fullName: userData.fullName || 'الخادم / المخدوم',
            phone: userData.phone
          });
        }
      } else {
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

  const handleNextStep = async (e) => {
    e?.preventDefault?.();
    setError('');

    if (currentStep === 1) {
      if (!fullName.trim()) {
        setError('يرجى إدخال الاسم ثلاثي');
        return;
      }
      if (!email.trim() || !/\S+@\S+\.\S+/.test(email.trim())) {
        setError('يرجى إدخال بريد إلكتروني صحيح (إلزامي)');
        return;
      }
      if (!phone.trim()) {
        setError('يرجى إدخال رقم الهاتف');
        return;
      }
      if (!password.trim() || password.trim().length < 6) {
        setError('كلمة المرور يجب ألا تقل عن 6 أحرف أو أرقام');
        return;
      }

      setCheckingStep1(true);
      try {
        const usersRef = collection(db, 'users');
        const phoneClean = phone.trim();
        const emailClean = email.trim().toLowerCase();

        const [phoneSnap, emailSnap] = await Promise.all([
          getDocs(query(usersRef, where('phone', '==', phoneClean), limit(1))),
          getDocs(query(usersRef, where('email', '==', emailClean), limit(1)))
        ]);

        if (!phoneSnap.empty) {
          setError('رقم الهاتف مسجل بالفعل مسبقاً، يمكنك تسجيل الدخول به');
          setCheckingStep1(false);
          return;
        }

        if (!emailSnap.empty) {
          setError('البريد الإلكتروني مسجل بالفعل لمستخدم آخر');
          setCheckingStep1(false);
          return;
        }

        setCurrentStep(2);
      } catch (err) {
        console.error('Error checking duplicate user in step 1:', err);
        setError('حدث خطأ أثناء التحقق من البيانات، يرجى المحاولة لاحقاً');
      } finally {
        setCheckingStep1(false);
      }
    } else if (currentStep === 2) {
      if (!photoUrl) {
        setError('الصورة الشخصية إلزامية للتعرف عليك في الخدمة');
        return;
      }
      if (!birthDate) {
        setError('يرجى تحديد تاريخ الميلاد');
        return;
      }
      if (!confessionFather.trim()) {
        setError('يرجى إدخال اسم أب الاعتراف');
        return;
      }
      if (!confessionChurch.trim()) {
        setError('يرجى إدخال كنيسة أب الاعتراف');
        return;
      }
      if (!address.trim()) {
        setError('يرجى إدخال عنوان السكن أو المنطقة');
        return;
      }
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    setError('');
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isLogin) {
      if (currentStep < 3) {
        handleNextStep(e);
        return;
      }

      if (!education.trim()) {
        setError('يرجى إدخال المؤهل الدراسي أو الكلية / المدرسة');
        return;
      }
      if (!job.trim()) {
        setError('يرجى إدخال الوظيفة أو مجال العمل (أو اكتب طالب)');
        return;
      }
    }

    setLoading(true);

    try {
      const usersRef = collection(db, 'users');

      if (isLogin) {
        const q = query(
          usersRef,
          where('phone', '==', phone.trim()),
          limit(1)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError('رقم الهاتف أو كلمة المرور غير صحيحة');
          setLoading(false);
          return;
        }

        const userData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        const enteredPass = password.trim();
        const isMatch = await isPasswordMatch(enteredPass, userData.password);

        if (!isMatch) {
          setError('رقم الهاتف أو كلمة المرور غير صحيحة');
          setLoading(false);
          return;
        }

        // Silent auto-upgrade of legacy plain-text password to secure SHA-256 hash
        const expectedHash = await hashPassword(enteredPass);
        if (userData.password !== expectedHash) {
          try {
            await updateDoc(doc(db, 'users', userData.id), {
              password: expectedHash,
              updatedAt: serverTimestamp()
            });
            userData.password = expectedHash;
          } catch (upgradeErr) {
            console.warn('Silent password upgrade warning:', upgradeErr);
          }
        }

        if (userData.status === 'pending_approval') {
          setError('حسابك قيد المراجعة والاعتماد من أمين الخدمة. سيتم تفعيل حسابك قريباً لتتمكن من الدخول.');
          setLoading(false);
          return;
        }

        if (userData.status === 'suspended') {
          setError('تم تعليق هذا الحساب مؤقتاً. يرجى مراجعة إدارة الخدمة.');
          setLoading(false);
          return;
        }

        if (userData.status === 'inactive' || userData.status === 'rejected') {
          setError('تم إيقاف تفعيل هذا الحساب. يرجى التواصل مع أمين الخدمة.');
          setLoading(false);
          return;
        }

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
        const [checkSnap, emailSnap] = await Promise.all([
          getDocs(query(usersRef, where('phone', '==', phone.trim()), limit(1))),
          email.trim() 
            ? getDocs(query(usersRef, where('email', '==', email.trim().toLowerCase()), limit(1)))
            : Promise.resolve({ empty: true })
        ]);

        if (!checkSnap.empty) {
          setError('رقم الهاتف مسجل بالفعل مسبقاً');
          setLoading(false);
          return;
        }

        if (!emailSnap.empty) {
          setError('البريد الإلكتروني مسجل بالفعل لمستخدم آخر');
          setLoading(false);
          return;
        }

        const hashedPassword = await hashPassword(password.trim());

        const newUser = {
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password: hashedPassword,
          role: role,
          grade: role === 'student' ? grade : null,
          servantScope: role === 'servant' ? 'all' : null,
          status: 'pending_approval',
          points: 0,
          photoUrl: photoUrl || '',
          gender: gender || 'male',
          birthDate: birthDate || '',
          education: education.trim(),
          job: job.trim(),
          maritalStatus: maritalStatus || 'single',
          childrenCount: maritalStatus === 'married' ? (Number(childrenCount) || 0) : 0,
          hasChildren: maritalStatus === 'married' && Number(childrenCount) > 0,
          address: address.trim(),
          confessionFather: confessionFather.trim(),
          confessionChurch: confessionChurch.trim(),
          createdAt: serverTimestamp()
        };

        const docRef = await addDoc(usersRef, newUser);

        Promise.allSettled([
          addDoc(collection(db, 'login_logs'), {
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
          }),
          addDoc(collection(db, 'notifications'), {
            targetUserId: 'SUPER_ADMIN',
            targetRole: 'super_admin',
            title: `طلب انضمام جديد ⏳: ${newUser.fullName}`,
            desc: `قام ${newUser.role === 'servant' ? 'الخادم' : 'المخدوم'} ${newUser.fullName} (${newUser.phone}) بالتسجيل وينتظر الاعتماد.`,
            type: 'pending_registration',
            applicantId: docRef.id,
            applicantName: newUser.fullName,
            applicantRole: newUser.role,
            applicantPhone: newUser.phone,
            time: 'الآن',
            createdAt: serverTimestamp()
          }),
          triggerServerPush({
            targetRole: 'super_admin',
            title: `طلب انضمام جديد ⏳: ${newUser.fullName}`,
            body: `قام ${newUser.role === 'servant' ? 'الخادم' : 'المخدوم'} ${newUser.fullName} (${newUser.phone}) بالتسجيل وينتظر الاعتماد.`,
            url: '/'
          })
        ]).catch((bgErr) => console.error('Background log/notification error:', bgErr));

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
            className="text-slate-300 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content based on state */}
        {registrationPendingSuccess ? (
          <RegistrationPendingSuccess
            registrationPendingSuccess={registrationPendingSuccess}
            onBackToLogin={() => {
              setRegistrationPendingSuccess(null);
              setIsLogin(true);
            }}
          />
        ) : isForgot ? (
          <ForgotPassForm
            resetIdentifier={resetIdentifier}
            setResetIdentifier={setResetIdentifier}
            handleResetPassword={handleResetPassword}
            loading={loading}
            error={error}
            resetSuccess={resetSuccess}
            onBackToLogin={() => {
              setIsForgot(false);
              setError('');
              setResetSuccess(null);
              setResetIdentifier('');
            }}
          />
        ) : isLogin ? (
          <LoginForm
            phone={phone}
            setPhone={setPhone}
            password={password}
            setPassword={setPassword}
            loading={loading}
            error={error}
            handleSubmit={handleSubmit}
            onForgotPassword={() => {
              setIsForgot(true);
              setError('');
              setResetSuccess(null);
            }}
            onSwitchToRegister={() => {
              setIsLogin(false);
              setIsForgot(false);
              setError('');
              setCurrentStep(1);
            }}
          />
        ) : (
          <RegisterForm
            currentStep={currentStep}
            handleNextStep={handleNextStep}
            handlePrevStep={handlePrevStep}
            role={role}
            setRole={setRole}
            fullName={fullName}
            setFullName={setFullName}
            email={email}
            setEmail={setEmail}
            phone={phone}
            setPhone={setPhone}
            password={password}
            setPassword={setPassword}
            grade={grade}
            setGrade={setGrade}
            photoUrl={photoUrl}
            setPhotoUrl={setPhotoUrl}
            gender={gender}
            setGender={setGender}
            birthDate={birthDate}
            setBirthDate={setBirthDate}
            confessionFather={confessionFather}
            setConfessionFather={setConfessionFather}
            confessionChurch={confessionChurch}
            setConfessionChurch={setConfessionChurch}
            address={address}
            setAddress={setAddress}
            education={education}
            setEducation={setEducation}
            job={job}
            setJob={setJob}
            maritalStatus={maritalStatus}
            setMaritalStatus={setMaritalStatus}
            childrenCount={childrenCount}
            setChildrenCount={setChildrenCount}
            loading={loading}
            checkingStep1={checkingStep1}
            error={error}
            handleSubmit={handleSubmit}
            onSwitchToLogin={() => {
              setIsLogin(true);
              setIsForgot(false);
              setError('');
              setCurrentStep(1);
            }}
          />
        )}
      </div>
    </div>
  );
}
